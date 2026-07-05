"use client";

import { useEffect, useState } from "react";
import { X, ArrowUpRight, Clock, Hash } from "lucide-react";
import { resolveSource } from "@/lib/sources";
import type { Article } from "@/lib/types";
import { ArticleAiPanel } from "./ArticleAiPanel";

function fmtTime(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  article: Article | null;
  open: boolean;
  onClose: () => void;
}

export function ArticleDetailModal({ article, open, onClose }: Props) {
  const [_followUp, setFollowUp] = useState("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !article) return null;

  const meta = resolveSource(article.sourceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative flex h-[92vh] w-[92vw] max-w-[1200px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:h-[88vh] md:flex-row">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-[#5a606a] transition-colors hover:bg-black/10 hover:text-[#1a1d23]"
          title="Close"
        >
          <X size={18} />
        </button>

        {/* left: article content */}
        <div className="flex min-h-0 w-full flex-1 flex-col border-b border-black/5 md:h-full md:w-1/2 md:border-b-0 md:border-r">
          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[#8a909a]">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: meta.color }}
                />
                {article.sourceName}
              </span>
              <span className="flex items-center gap-1 text-xs text-[#9aa0a8]">
                <Clock size={12} />
                {fmtTime(article.publishedAt ?? article.fetchedAt)}
              </span>
              {article.rank !== undefined && article.rank > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-[#9aa0a8]">
                  <Hash size={12} />
                  {article.rank}
                </span>
              )}
            </div>

            <h1 className="mt-3 text-[20px] font-bold leading-tight text-[#0f1115] sm:text-[22px]">
              {article.title}
            </h1>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0066ff] hover:underline"
            >
              Open original
              <ArrowUpRight size={13} />
            </a>

            <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-[#3a404a]">
              {article.summary ? (
                <p>{article.summary}</p>
              ) : (
                <p className="text-[#9aa0a8] italic">
                  No summary available from this source.
                </p>
              )}
              <p className="text-[#9aa0a8] italic">
                [Full article body will appear once the fetcher captures it.]
              </p>
            </div>

            {article.tags && article.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {article.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-[#f0f1f3] px-2.5 py-1 text-xs font-medium text-[#5a606a]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* right: AI summary panel (real LLM) */}
        <ArticleAiPanel
          article={article}
          onSelectQuestion={(q) => setFollowUp(q)}
        />
      </div>
    </div>
  );
}

export { ArticleAiPanel };
