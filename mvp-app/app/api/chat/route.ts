/**
 * POST /api/chat
 *
 * Body: { scope: "article" | "feed", message, articles?, article? }
 *
 * Response: ChatResponse  (JSON {answer, citations, model, …})
 *
 * Two scopes:
 *   - "article": context is the single article being discussed
 *   - "feed":    context is up to 20 top-of-feed articles
 *
 * The response includes a `citations` array so the UI can link back to
 * the sources the model drew from.
 *
 * No chat history / session persistence yet — each call is self-contained.
 */

import { NextResponse } from "next/server";
import { getOpenAI, getModel } from "@/lib/ai/openai";
import {
  CHAT_ARTICLE_SYSTEM,
  CHAT_FEED_SYSTEM,
  buildArticleChatContext,
  buildFeedChatContext,
} from "@/lib/ai/prompts";
import type { Article, ChatRequest, ChatResponse, Citation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RawChatAnswer {
  answer?: string;
  citations?: Array<Partial<Citation>>;
}

function stripReasoning<T extends { content?: string | null; reasoning_content?: string | null }>(
  msg: T,
): string {
  return (msg?.content || msg?.reasoning_content || "").trim();
}

function parseAnswer(raw: string): RawChatAnswer | null {
  try {
    return JSON.parse(raw) as RawChatAnswer;
  } catch {
    // Try pulling the first JSON object out
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as RawChatAnswer;
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

function toCitation(article: Article): Citation {
  return {
    id: article.id,
    title: article.title,
    url: article.url,
    sourceName: article.sourceName,
  };
}

function normalizeCitations(
  raw: RawChatAnswer["citations"] | undefined,
  // allowedCitations is used to keep the model from hallucinating citations
  allowedCitations: Map<string, Citation>,
): Citation[] {
  if (!Array.isArray(raw)) return [];
  const out: Citation[] = [];
  const seenIds = new Set<string>();
  for (const c of raw.slice(0, 5)) {
    if (!c || typeof c.id !== "string") continue;
    // Skip ids the model hallucinated — only accept ids from the feed
    const citation = allowedCitations.get(c.id);
    if (!citation) continue;
    // De-duplicate
    if (seenIds.has(c.id)) continue;
    seenIds.add(c.id);
    out.push(citation);
    if (out.length >= 3) break;
  }
  return out;
}

export async function POST(req: Request) {
  const fetchedAt = new Date().toISOString();

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { scope } = body;
  const message = body.message?.trim();

  if (!message) {
    return NextResponse.json(
      { error: "Missing 'message' field" },
      { status: 400 },
    );
  }
  if (scope !== "article" && scope !== "feed") {
    return NextResponse.json(
      { error: "Missing or invalid 'scope' field — must be 'article' or 'feed'" },
      { status: 400 },
    );
  }

  // Build context based on scope
  let contextBlock: string;
  let allowedCitations: Map<string, Citation>;
  let scopeUsed: "article" | "feed";
  let currentArticle: Article | undefined;

  if (scope === "article") {
    const article = body.article;
    if (!article) {
      return NextResponse.json(
        { error: "Missing 'article' field for article scope" },
        { status: 400 },
      );
    }
    currentArticle = article;
    contextBlock = buildArticleChatContext(article);
    allowedCitations = new Map([[article.id, toCitation(article)]]);
    scopeUsed = "article";
  } else {
    const articles = Array.isArray(body.articles) ? body.articles : [];
    if (articles.length === 0) {
      // Graceful degradation — behave like a "feed is empty" note
      const empty: ChatResponse = {
        role: "assistant",
        content:
          "当前聚合列表里还没有文章。先去聚合页刷新一下数据，再回来问我。",
        citations: [],
        model: getModel(),
        created_at: fetchedAt,
        scope: "feed",
        fallback: true,
      };
      return NextResponse.json(empty);
    }
    const feedArticles = (articles as Article[]).slice(0, 20);
    contextBlock = buildFeedChatContext(feedArticles);
    allowedCitations = new Map(feedArticles.map((a) => [a.id, toCitation(a)]));
    scopeUsed = "feed";
  }

  const userPrompt = [
    contextBlock,
    "",
    `【用户问题】`,
    message,
  ].join("\n");

  let model = "";
  try {
    model = getModel();
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: scopeUsed === "article" ? CHAT_ARTICLE_SYSTEM : CHAT_FEED_SYSTEM,
        },
        { role: "user", content: userPrompt },
      ],
    });

    const msg = completion.choices[0]?.message as
      | (typeof completion.choices[number]["message"] & {
          reasoning_content?: string | null;
        })
      | undefined;
    const raw = stripReasoning(msg ?? {});
    const parsed = parseAnswer(raw);

    if (!parsed || typeof parsed.answer !== "string" || !parsed.answer.trim()) {
      // Fallback — return raw text as-is
      const fallback: ChatResponse = {
        role: "assistant",
        content:
          raw.slice(0, 1500) ||
          "模型返回了空内容，建议重试或换一个问法。",
        citations: scopeUsed === "article" && currentArticle ? [toCitation(currentArticle)] : [],
        model,
        created_at: fetchedAt,
        scope: scopeUsed,
        fallback: true,
      };
      return NextResponse.json(fallback);
    }

    let citations = normalizeCitations(parsed.citations, allowedCitations);
    if (scopeUsed === "article" && citations.length === 0 && currentArticle) {
      citations = [toCitation(currentArticle)];
    }

    const result: ChatResponse = {
      role: "assistant",
      content: parsed.answer.trim(),
      citations,
      model,
      created_at: fetchedAt,
      scope: scopeUsed,
    };
    return NextResponse.json(result);
  } catch (err) {
    const messageText = err instanceof Error ? err.message : String(err);
    const fallback: ChatResponse = {
      role: "assistant",
      content: `AI 服务暂时不可用（${messageText}）。这是降级回复，不影响你继续浏览文章。可以先重试。`,
      citations: scopeUsed === "article" && currentArticle ? [toCitation(currentArticle)] : [],
      model: model ? `${model} unavailable` : "ai unavailable",
      created_at: fetchedAt,
      scope: scopeUsed,
      fallback: true,
    };
    return NextResponse.json(fallback);
  }
}
