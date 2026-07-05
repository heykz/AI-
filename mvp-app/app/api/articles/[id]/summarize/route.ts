/**
 * POST /api/articles/:id/summarize
 *
 * Body: { article: { id, title, sourceName, summary, url, ... } }
 *
 * Response: SummaryResult
 *
 * Caches per-article under public/summaries/{safeId}.json.
 */

import { NextResponse } from "next/server";
import { getOpenAI, getModel } from "@/lib/ai/openai";
import { SUMMARIZE_SYSTEM, buildSummarizeUserPrompt } from "@/lib/ai/prompts";
import { getCachedSummary, setCachedSummary } from "@/lib/cache";
import type { Article, SummaryResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Try to extract the first JSON object from an arbitrary LLM string */
function extractJson(text: string): unknown | null {
  // First try: parse directly
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }
  // Second try: pull out anything between the first { and the last }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      /* fall through */
    }
  }
  return null;
}

function isSummary(candidate: unknown): candidate is Omit<SummaryResult, "cached" | "model" | "created_at"> {
  if (typeof candidate !== "object" || candidate === null) return false;
  const c = candidate as Record<string, unknown>;
  return (
    typeof c.one_sentence === "string" &&
    Array.isArray(c.key_points) &&
    typeof c.why_it_matters === "string" &&
    Array.isArray(c.follow_up_questions)
  );
}

function buildAiUnavailableSummary(
  article: Article,
  model: string,
  createdAt: string,
  reason: string,
): SummaryResult {
  const hasSummary = article.summary.trim().length > 0;
  return {
    one_sentence: `AI 服务暂时不可用，先基于标题判断：${article.title}`,
    key_points: [
      `来源：${article.sourceName}`,
      `标题：${article.title}`,
      hasSummary ? `原始摘要：${article.summary}` : "当前来源没有提供正文摘要，只能先展示标题级信息。",
    ],
    why_it_matters: `这不是正式 AI 分析结果。模型服务当前连接失败（${reason}），页面先保留文章线索，避免用户看到 502 或空白状态。恢复模型连接后可点击重试重新生成。`,
    follow_up_questions: [
      "这条信息背后的关键事实是什么？",
      "有哪些相关来源可以交叉验证？",
    ],
    cached: false,
    model: model ? `${model} unavailable` : "ai unavailable",
    created_at: createdAt,
  };
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const id = params.id;
  const fetchedAt = new Date().toISOString();

  try {
    const body = (await req.json()) as { article?: Article };
    const article = body.article;
    if (!article || !article.title) {
      return NextResponse.json(
        { error: "Missing article metadata in request body" },
        { status: 400 },
      );
    }

    // 1. Check cache
    const cached = getCachedSummary(id);
    if (cached) {
      return NextResponse.json(cached);
    }

    // 2. Call LLM. If the upstream model is temporarily unreachable,
    // return a readable fallback instead of surfacing a raw 502 in the UI.
    const userPrompt = buildSummarizeUserPrompt(article);

    let completion;
    let model = "";
    try {
      model = getModel();
      const openai = getOpenAI();
      completion = await openai.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 4096,
        messages: [
          { role: "system", content: SUMMARIZE_SYSTEM },
          { role: "user", content: userPrompt },
        ],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        buildAiUnavailableSummary(article, model, fetchedAt, message),
      );
    }

    // MiMo reasoning models may return thinking in reasoning_content
    // with content empty; fall back to reasoning_content in that case.
    const msg = completion.choices[0]?.message as
      | (typeof completion.choices[number]["message"] & {
          reasoning_content?: string;
        })
      | undefined;
    const raw = msg?.content || msg?.reasoning_content || "";
    const parsed = extractJson(raw);

    if (!parsed || !isSummary(parsed)) {
      // Graceful fallback — return the raw text so the user can still read it
      const fallback: SummaryResult = {
        one_sentence: "AI 返回非结构化内容",
        key_points: [raw.slice(0, 500) || "(empty response)"],
        why_it_matters: "模型未返回可解析的 JSON，建议重试。",
        follow_up_questions: [],
        cached: false,
        model,
        created_at: fetchedAt,
      };
      setCachedSummary(id, fallback);
      return NextResponse.json(fallback);
    }

    const result: SummaryResult = {
      one_sentence: parsed.one_sentence,
      key_points: parsed.key_points.map((s) => String(s)).slice(0, 5),
      why_it_matters: parsed.why_it_matters,
      follow_up_questions: parsed.follow_up_questions.map((s) => String(s)).slice(0, 4),
      cached: false,
      model,
      created_at: fetchedAt,
    };

    // 3. Write cache (async, non-blocking)
    setCachedSummary(id, result);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        one_sentence: "",
        key_points: [],
        why_it_matters: "",
        follow_up_questions: [],
        cached: false,
        model: "",
        created_at: fetchedAt,
        error: message,
      },
      { status: 502 },
    );
  }
}
