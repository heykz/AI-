"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, RefreshCw, AlertTriangle, Send } from "lucide-react";
import type { Article, ChatMessage, ChatResponse, SummaryResult } from "@/lib/types";

interface Props {
  article: Article;
  /** Called when user clicks a follow-filling question chip (currently unused) */
  onSelectQuestion?: (q: string) => void;
}

type Status = "idle" | "loading" | "success" | "error";

interface FollowUp {
  id: string;
  message: ChatMessage;
}

export function ArticleAiPanel({ article, onSelectQuestion }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const followUpsScrollRef = useRef<HTMLDivElement>(null);

  const doSummarize = async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const resp = await fetch(
        `/api/articles/${encodeURIComponent(article.id)}/summarize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ article }),
        },
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as SummaryResult & { error?: string };
      if (data.error) throw new Error(data.error);
      setResult(data);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  // Auto-trigger on mount / when article changes
  useEffect(() => {
    setStatus("idle");
    setResult(null);
    setFollowUps([]);
    setFollowUpInput("");
    doSummarize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  // Scroll follow-ups container to the bottom when new messages arrive
  useEffect(() => {
    const el = followUpsScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [followUps, followUpBusy]);

  const sendFollowUp = async (text: string) => {
    const q = text.trim();
    if (!q || followUpBusy) return;

    const userMsg: ChatMessage = {
      id: `fu-u-${Date.now()}`,
      role: "user",
      content: q,
    };
    // Immediately append the user message
    setFollowUps((prev) => [...prev, { id: userMsg.id, message: userMsg }]);
    setFollowUpInput("");
    setFollowUpBusy(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "article", message: q, article }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as ChatResponse;
      const assistantMsg: ChatMessage = {
        id: `fu-a-${Date.now()}`,
        role: "assistant",
        content: data.content,
        citations: data.citations ?? [],
      };
      setFollowUps((prev) => [...prev, { id: assistantMsg.id, message: assistantMsg }]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: `fu-e-${Date.now()}`,
        role: "assistant",
        content: `追问失败：${
          err instanceof Error ? err.message : String(err)
        }。请重试。`,
      };
      setFollowUps((prev) => [...prev, { id: errMsg.id, message: errMsg }]);
    } finally {
      setFollowUpBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[#fbfbfc] md:h-full md:w-1/2">
      {/* header */}
      <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-5 py-4 sm:px-8 sm:py-5">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#0f1115]">
            <Sparkles size={14} />
            AI 文章问答
          </h2>
          <p className="mt-0.5 text-xs text-[#8a909a]">
            {result
              ? result.cached
                ? `已缓存 · ${result.model}`
                : `已生成 · ${result.model}`
              : "由 AI 驱动 · MiMo"}
          </p>
        </div>
        {status === "success" && (
          <button
            onClick={doSummarize}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#6b7079] transition-colors hover:bg-[#f0f1f3] hover:text-[#1a1d23]"
            title="Regenerate"
          >
            <RefreshCw size={12} />
            重新生成
          </button>
        )}
      </div>

      {/* content */}
      <div ref={followUpsScrollRef} className="flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
        {status === "loading" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Loader2 size={28} className="animate-spin text-[#8a909a]" />
            <p className="text-sm text-[#6b7079]">正在生成 AI 总结…</p>
            <p className="text-xs text-[#9aa0a8]">通常需要 5–15 秒</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle size={28} className="text-[#d32f2f]" />
            <p className="text-sm font-medium text-[#1a1d23]">
              生成总结失败
            </p>
            <p className="max-w-xs text-xs text-[#6b7079]">{errorMsg}</p>
            <button
              onClick={doSummarize}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#0f1115] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <RefreshCw size={14} />
              重试
            </button>
          </div>
        )}

        {status === "success" && result && (
          <div className="space-y-6">
            {/* one-sentence callout */}
            <div className="rounded-xl border border-black/5 bg-white p-4">
              <p className="text-sm font-medium leading-relaxed text-[#1a1d23]">
                {result.one_sentence}
              </p>
            </div>

            {/* key highlights */}
            <div>
              <h3 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-[#8a909a]">
                关键要点
              </h3>
              <div className="space-y-3">
                {result.key_points.map((k, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-black/[0.06] bg-white p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0f1115] text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-[#0f1115]">
                        要点 {i + 1}
                      </span>
                    </div>
                    <p className="mt-1.5 pl-7 text-sm leading-relaxed text-[#5a606a]">
                      {k}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* why it matters */}
            <div>
              <h3 className="mb-2 text-[13px] font-medium uppercase tracking-wide text-[#8a909a]">
                为什么重要
              </h3>
              <p className="text-sm leading-relaxed text-[#3a404a]">
                {result.why_it_matters}
              </p>
            </div>

            {/* follow-up questions */}
            {result.follow_up_questions.length > 0 && (
              <div>
                <h3 className="mb-2 text-[13px] font-medium uppercase tracking-wide text-[#8a909a]">
                  继续问
                </h3>
                <div className="space-y-2">
                  {result.follow_up_questions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        onSelectQuestion?.(q);
                        void sendFollowUp(q);
                      }}
                      className="w-full rounded-lg border border-dashed border-black/15 bg-white px-3 py-2 text-left text-sm text-[#5a606a] transition-colors hover:border-black/30 hover:text-[#1a1d23]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* follow-up conversation */}
            {followUps.length > 0 && (
              <div className="space-y-3 border-t border-black/5 pt-5">
                <h3 className="text-[13px] font-medium uppercase tracking-wide text-[#8a909a]">
                  追问记录
                </h3>
                {followUps.map((fu) => (
                  <div
                    key={fu.id}
                    className={
                      fu.message.role === "user"
                        ? "flex justify-end"
                        : "flex flex-col gap-1.5"
                    }
                  >
                    <div
                      className={
                        fu.message.role === "user"
                          ? "max-w-[90%] rounded-2xl bg-[#0f1115] px-3 py-2 text-sm leading-relaxed text-white"
                          : "max-w-[95%] rounded-2xl border border-black/[0.06] bg-white px-3 py-2 text-sm leading-relaxed text-[#1a1d23]"
                      }
                    >
                      {fu.message.content}
                    </div>
                    {fu.message.role === "assistant" &&
                      fu.message.citations &&
                      fu.message.citations.length > 0 && (
                        <div className="ml-1 flex flex-wrap gap-1.5">
                          {fu.message.citations.map((c) => (
                            <a
                              key={c.id}
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-[#f0f1f3] px-2 py-0.5 text-[11px] text-[#3a404a] hover:bg-[#e5e7ea]"
                            >
                              {c.title}
                              {c.sourceName ? ` · ${c.sourceName}` : ""}
                            </a>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
                {followUpBusy && (
                  <div className="flex items-center gap-2 text-xs text-[#9aa0a8]">
                    <Loader2 size={12} className="animate-spin" />
                    回复中…
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* bottom follow-up input */}
      <div className="shrink-0 border-t border-black/5 px-6 py-4">
        <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2">
          <input
            value={followUpInput}
            onChange={(e) => setFollowUpInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendFollowUp(followUpInput);
              }
            }}
              placeholder="追问这条文章…（如：为什么会这样？连到哪些事件？）"
            className="flex-1 bg-transparent text-sm text-[#1a1d23] outline-none placeholder:text-[#9aa0a8]"
          />
          <button
            onClick={() => void sendFollowUp(followUpInput)}
            disabled={followUpBusy || !followUpInput.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f1115] text-white transition-opacity disabled:opacity-30"
            title="Send follow-up"
          >
            {followUpBusy ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
