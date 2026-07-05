"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import type { Article, ChatMessage, ChatResponse, FetchResult } from "@/lib/types";

interface Props {
  /** Articles already loaded in the aggregation view — avoids a redundant
   *  fetch if we can reuse them. */
  initialFeed?: Article[];
}

export function ChatView({ initialFeed = [] }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<Article[]>(initialFeed);

  // Auto-load feed once on mount only if we don't already have context
  useEffect(() => {
    if (feed.length > 0) return;
    fetch("/api/articles")
      .then((r) => (r.ok ? (r.json() as Promise<FetchResult>) : null))
      .then((d) => {
        if (d && Array.isArray(d.articles)) setFeed(d.articles.slice(0, 20));
      })
      .catch(() => {
        /* non-fatal — UI will show an empty-feed notice */
      });
  }, [feed.length]);

  const feedContext = feed;

  const send = useCallback(
    (text: string) => {
      const q = text.trim();
      if (!q) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: "user",
        content: q,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setBusy(true);
      setError(null);

      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "feed",
          message: q,
          articles: feedContext,
        }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return (await r.json()) as ChatResponse;
        })
        .then((data: ChatResponse) => {
          const assistantMsg: ChatMessage = {
            id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            role: "assistant",
            content: data.content,
            citations: data.citations ?? [],
          };
          setMessages((prev) => [...prev, assistantMsg]);
        })
        .catch((err: unknown) => {
          const msg =
            err instanceof Error ? err.message : String(err);
          setError(msg);
        })
        .finally(() => {
          setBusy(false);
        });
    },
    [feedContext],
  );

  return (
    <div className="flex h-full flex-col">
      {/* scrollable messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f1115]">
              <span className="text-lg font-bold text-white">P</span>
            </div>
            <h2 className="max-w-md text-2xl font-semibold leading-snug text-[#0f1115]">
              想问聚合里的信息什么？
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-[#6b7079]">
              试试「今天哪些新闻最热门？」「结合列表，帮我梳理 AI 领域动态」或「按主题归类」。
            </p>
            <div className="mt-2 grid max-w-xl grid-cols-1 gap-2 text-left sm:grid-cols-2">
              {[
                "今天哪些新闻最值得关注？",
                "把最近的 AI 相关新闻整理一下",
                "哪些新闻彼此相关？",
                "今天有什么争议性事件？",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#3a404a] transition-colors hover:border-black/20 hover:bg-[#f6f7f9]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-8">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl bg-[#0f1115] px-4 py-2.5 text-sm leading-relaxed text-white">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex flex-col gap-2">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm leading-relaxed text-[#1a1d23]">
                      {formatAssistantContent(m.content)}
                    </div>
                  </div>
                  {m.citations && m.citations.length > 0 && (
                    <div className="ml-1 flex flex-wrap gap-2">
                      {m.citations.map((c) => (
                        <a
                          key={c.id}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-[#f0f1f3] px-2.5 py-1 text-xs text-[#3a404a] transition-colors hover:bg-[#e5e7ea]"
                        >
                          <ExternalLink size={11} />
                          {c.title}
                          {c.sourceName ? ` · ${c.sourceName}` : ""}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 max-w-[80%] rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm text-[#6b7079]">
                  <Loader2 size={14} className="animate-spin" />
                  思考中…
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* error banner */}
      {error && (
        <div className="mx-4 mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#d32f2f]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            请求失败：{error}。
            <button
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-black/5 bg-white">
        {/* input */}
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2 px-5 py-4">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="问聚合里的信息（如：今天的重点新闻是什么？）…"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-black/10 bg-[#f6f7f9] px-4 py-2.5 text-sm text-[#1a1d23] outline-none placeholder:text-[#9aa0a8] focus:border-black/20 focus:bg-white"
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f1115] text-white transition-opacity disabled:opacity-40"
            title="Send"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="px-5 pb-3 text-center text-xs text-[#9aa0a8]">
          {feedContext.length > 0
            ? `基于当前 ${feedContext.length} 条聚合文章回答 · 仅上下文问答，无长期知识库`
            : "先去聚合页加载数据再回来问 · "}
          <span className="ml-1 text-[#c5c8cd]">MiMo · 不要轻信答案，请对照来源</span>
        </div>
      </div>
    </div>
  );
}

/** Allow model to include markdown-style links in content — render as clickable anchors */
function formatAssistantContent(raw: string): React.ReactNode {
  // Very light-weight markdown link parser: [text](url)
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = linkRe.exec(raw)) !== null) {
    if (match.index > last) out.push(raw.slice(last, match.index));
    out.push(
      <a
        key={idx++}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#0066ff] underline"
      >
        {match[1]}
      </a>,
    );
    last = lastIndex(linkRe, match);
  }
  if (last === 0) return raw;
  if (last < raw.length) out.push(raw.slice(last));
  return <>{out}</>;
}

function lastIndex(re: RegExp, m: RegExpExecArray): number {
  // lastIndex is where the next match will start — for our link regex that's fine
  return m.index + m[0].length;
}
