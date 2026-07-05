"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, AlertTriangle, ChevronRight } from "lucide-react";
import { resolveSource } from "@/lib/sources";
import type { Article, FetchResult } from "@/lib/types";
import { ArticleCard } from "./ArticleCard";

type Status = "idle" | "loading" | "success" | "error";

interface Props {
  onSelect: (a: Article) => void;
  /** Reports the currently-loaded article list to the parent so other
   *  views (e.g. Chat) can use it as feed-scope context. */
  onArticlesChange?: (articles: Article[]) => void;
}

export function AggregationView({ onSelect, onArticlesChange }: Props) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (mode: "cache" | "refresh") => {
    if (mode === "refresh") setRefreshing(true);
    else setStatus("loading");
    try {
      const url = mode === "refresh" ? "/api/articles/refresh" : "/api/articles";
      const init: RequestInit =
        mode === "refresh" ? { method: "POST" } : { method: "GET" };
      const r = await fetch(url, init);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as FetchResult;
      setArticles(data.articles);
      setErrors(data.errors.map((e) => `${e.adapter}: ${e.message}`));
      setLastFetched(data.meta.fetchedAt);
      setStatus("success");
    } catch (err) {
      setErrors((prev) => [
        ...prev,
        err instanceof Error ? err.message : String(err),
      ]);
      setStatus((prev) => (prev === "loading" ? "error" : prev));
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Cold-start load — keep disk cache result while adapter reload runs in background
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // First: try disk cache for instant first paint
      try {
        const disk = await fetch("/api/articles", { method: "GET" });
        if (disk.ok && !cancelled) {
          const data = (await disk.json()) as FetchResult;
          if (data.articles.length > 0) {
            setArticles(data.articles);
            setLastFetched(data.meta.fetchedAt);
            setStatus("success");
          }
        }
      } catch {
        // ignore
      }
      // Then: force a refresh to get fresh data from adapters
      if (!cancelled) {
        load("refresh");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Build filter buttons dynamically from actual sources in data
  const sourceFilters = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of articles) {
      map.set(a.sourceId, (map.get(a.sourceId) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => ({ id, label: resolveSource(id).name, count }));
  }, [articles]);

  const filtered = useMemo(() => {
    let list = articles;
    if (activeFilter !== "all") {
      list = list.filter((a) => a.sourceId === activeFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.sourceName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [articles, query, activeFilter]);

  const visibleChatContext = useMemo(() => filtered.slice(0, 20), [filtered]);

  // Mirror the visible article list to the parent so CHAT uses the same
  // search/filter context the user is currently seeing.
  useEffect(() => {
    onArticlesChange?.(visibleChatContext);
  }, [visibleChatContext, onArticlesChange]);

  return (
    <div className="flex h-full flex-col">
      {/* top bar */}
      <header className="flex items-center gap-3 border-b border-black/5 bg-white px-4 py-4 sm:px-8">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a8]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles, sources, topics…"
            className="h-10 w-full rounded-lg border border-black/10 bg-[#f6f7f9] pl-9 pr-3 text-sm text-[#1a1d23] outline-none placeholder:text-[#9aa0a8] focus:border-black/20 focus:bg-white"
          />
        </div>
        <button
          type="button"
          onClick={() => load("refresh")}
          disabled={refreshing}
          className="flex h-10 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 text-sm text-[#3a404a] transition-colors hover:bg-[#f6f7f9] disabled:opacity-60"
          title="Refresh"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          <span className="hidden sm:inline">{refreshing ? "Loading…" : "Refresh"}</span>
        </button>
      </header>

      {/* meta row */}
      <div className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-2 text-xs text-[#6b7079] sm:px-8">
        <span>
          {lastFetched
            ? `Updated ${new Date(lastFetched).toLocaleTimeString()} · ${articles.length} articles`
            : "Loading…"}
        </span>
        {errors.length > 0 && (
          <span className="flex items-center gap-1 text-[#d32f2f]">
            <AlertTriangle size={12} />
            {errors.length} source{errors.length > 1 ? "s" : ""} failed
          </span>
        )}
      </div>

      {/* filters */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-black/5 bg-white px-4 py-3 sm:px-8">
        <button
          onClick={() => setActiveFilter("all")}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFilter === "all"
              ? "bg-[#0f1115] text-white"
              : "bg-[#f0f1f3] text-[#5a606a] hover:bg-[#e5e7ea]"
          }`}
        >
          All
        </button>
        {sourceFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === f.id
                ? "bg-[#0f1115] text-white"
                : "bg-[#f0f1f3] text-[#5a606a] hover:bg-[#e5e7ea]"
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`rounded-full px-1.5 text-[10px] ${
                activeFilter === f.id
                  ? "bg-white/20 text-white"
                  : "bg-black/5 text-[#8a909a]"
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
        {status === "loading" && articles.length === 0 ? (
          <LoadingGrid />
        ) : status === "error" && articles.length === 0 ? (
          <ErrorState onRetry={() => load("refresh")} />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <ArticleCard key={a.id} article={a} onClick={() => onSelect(a)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="flex h-[180px] animate-pulse flex-col justify-between rounded-xl border border-black/[0.06] bg-white p-4"
        >
          <div className="space-y-2">
            <div className="h-3 w-16 rounded bg-[#f0f1f3]" />
            <div className="h-4 w-full rounded bg-[#f0f1f3]" />
            <div className="h-4 w-3/4 rounded bg-[#f0f1f3]" />
            <div className="h-3 w-full rounded bg-[#f0f1f3]" />
          </div>
          <div className="h-3 w-12 rounded bg-[#f0f1f3]" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle size={32} className="text-[#d32f2f]" />
      <h3 className="text-base font-semibold text-[#1a1d23]">
        Failed to load articles
      </h3>
      <p className="max-w-sm text-sm text-[#6b7079]">
        The aggregation service couldn&apos;t reach any data source. Check that
        TrendRadar has built today&apos;s database.
      </p>
      <button
        onClick={onRetry}
        className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#0f1115] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <ChevronRight size={32} className="text-[#c5c8cd]" />
      <h3 className="text-base font-semibold text-[#1a1d23]">
        No articles match
      </h3>
      <p className="max-w-sm text-sm text-[#6b7079]">
        Try removing the filter or broadening your search query.
      </p>
    </div>
  );
}
