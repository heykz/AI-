"use client";

import { useCallback, useState } from "react";
import { Sidebar } from "./Sidebar";
import { AggregationView } from "./AggregationView";
import { ChatView } from "./ChatView";
import { ArticleDetailModal } from "./ArticleDetailModal/index";
import type { AppView, Article } from "@/lib/types";

export function AppShell() {
  const [view, setView] = useState<AppView>("aggregation");
  const [selected, setSelected] = useState<Article | null>(null);
  const [feedArticles, setFeedArticles] = useState<Article[]>([]);
  const handleArticlesChange = useCallback((articles: Article[]) => {
    setFeedArticles(articles);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f6f7f9]">
      <Sidebar active={view} onChange={setView} />
      <main className="flex-1 overflow-hidden">
        {view === "aggregation" ? (
          <AggregationView
            onSelect={(a) => setSelected(a)}
            onArticlesChange={handleArticlesChange}
          />
        ) : (
          <ChatView initialFeed={feedArticles} />
        )}
      </main>

      <ArticleDetailModal
        article={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
