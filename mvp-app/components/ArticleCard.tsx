"use client";

import { ArrowUpRight } from "lucide-react";
import { resolveSource } from "@/lib/sources";
import type { Article } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / (60 * 60 * 1000));
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface Props {
  article: Article;
  onClick: () => void;
}

export function ArticleCard({ article, onClick }: Props) {
  const meta = resolveSource(article.sourceId);
  const sourceColor = meta.color;
  const time = timeAgo(article.publishedAt ?? article.fetchedAt);

  return (
    <button
      onClick={onClick}
      className="group flex h-[180px] flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
    >
      <div className="flex flex-1 flex-col gap-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#8a909a]">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: sourceColor }}
            />
            {article.sourceName}
            {article.rank !== undefined && article.rank > 0 && (
              <span className="ml-1 rounded bg-black/5 px-1 text-[10px] font-bold text-[#5a606a]">
                #{article.rank}
              </span>
            )}
          </span>
          <ArrowUpRight
            size={14}
            className="text-[#c5c8cd] transition-colors group-hover:text-[#3a404a]"
          />
        </div>

        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#1a1d23]">
          {article.title}
        </h3>

        <p className="line-clamp-2 text-[13px] leading-relaxed text-[#6b7079]">
          {article.summary}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-black/[0.05] px-4 py-2.5">
        <span className="text-[11px] text-[#9aa0a8]">{time}</span>
        {article.tags?.[0] && article.tags[0] !== article.sourceName && (
          <span className="rounded-full bg-[#f0f1f3] px-2 py-0.5 text-[10px] font-medium text-[#5a606a]">
            {article.tags[0]}
          </span>
        )}
      </div>
    </button>
  );
}
