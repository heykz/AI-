"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot, Building2, ExternalLink, Loader2, MessageSquare, Newspaper,
  RefreshCw, Search, Send, Sparkles, User, X,
} from "lucide-react";
import type { Article, FetchResult, SummaryResult } from "@/lib/types";

const demoArticles: Article[] = [
  { id: "demo-1", title: "AI 外卖评价开始自动识别差评原因", sourceId: "36kr", sourceName: "36氪", summary: "餐饮商家开始用 AI 归纳差评、定位门店服务问题。", url: "#" },
  { id: "demo-2", title: "连锁门店用销量预测减少备货浪费", sourceId: "wechat", sourceName: "微信公众号", summary: "预测模型逐步进入中小连锁门店的日常经营。", url: "#" },
  { id: "demo-3", title: "AI 短视频脚本正在进入本地生活", sourceId: "xiaohongshu", sourceName: "小红书", summary: "低成本内容生产正在改变同城获客方式。", url: "#" },
  { id: "demo-4", title: "老板最关心的不是 AI 酷不酷，而是省不省人", sourceId: "huxiu", sourceName: "虎嗅", summary: "企业 AI 采购开始从尝鲜转向明确的投资回报。", url: "#" },
];

const sourceMeta: Record<string, { label: string; mark: string; color: string }> = {
  "36kr": { label: "36氪", mark: "氪", color: "#ff9b55" },
  wechat: { label: "微信公众号", mark: "微", color: "#37d69b" },
  xiaohongshu: { label: "小红书", mark: "红", color: "#ff7185" },
  huxiu: { label: "虎嗅", mark: "虎", color: "#c6a2ff" },
};

export function BossUpApp() {
  const [view, setView] = useState<"chat" | "news">("chat");
  const [articles, setArticles] = useState<Article[]>(demoArticles);
  const [selected, setSelected] = useState<Article | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/articles")
      .then((r) => r.ok ? r.json() as Promise<FetchResult> : null)
      .then((data) => data?.articles?.length && setArticles(data.articles))
      .catch(() => undefined);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar view={view} onView={setView} />
      <main className="main-stage">
        {view === "chat" ? (
          <ChatHome articles={articles} onArticle={setSelected} onProfile={() => setProfileOpen(true)} />
        ) : (
          <NewsView articles={articles} onArticles={setArticles} onArticle={setSelected} />
        )}
      </main>
      {selected && <ArticleModal article={selected} onClose={() => setSelected(null)} />}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

function DolphinMark({ large = false }: { large?: boolean }) {
  return (
    <span className={large ? "dolphin-mark dolphin-mark-large" : "dolphin-mark"} aria-hidden="true">
      <span className="dolphin-body" /><span className="dolphin-tail" /><span className="dolphin-eye" />
    </span>
  );
}

function Sidebar({ view, onView }: { view: "chat" | "news"; onView: (v: "chat" | "news") => void }) {
  return (
    <aside className="sidebar">
      <div className="brand"><DolphinMark /><div><strong>海豚企策</strong><small>DOLPHIN INTEL</small></div></div>
      <nav>
        <button className={view === "chat" ? "nav-active" : ""} onClick={() => onView("chat")}><MessageSquare size={15} />AI 助手</button>
        <button className={view === "news" ? "nav-active" : ""} onClick={() => onView("news")}><Newspaper size={15} />聚合</button>
      </nav>
      <section className="history"><p>历史记录</p>{["企业数字化转型方向", "如何评估 AI 工具 ROI", "竞争对手分析框架"].map((x) => <button key={x}>{x}</button>)}</section>
      <div className="account"><span>王</span><div><strong>王总</strong><small>已配置企业画像</small></div></div>
    </aside>
  );
}

function ChatHome({ articles, onArticle, onProfile }: { articles: Article[]; onArticle: (a: Article) => void; onProfile: () => void }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const text = input.trim(); if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", text }]); setInput(""); setBusy(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "feed", message: text, articles: articles.slice(0, 20) }) });
      const data = r.ok ? await r.json() : null;
      setMessages((m) => [...m, { role: "assistant", text: data?.content || "服务暂时没有响应，请稍后再试。" }]);
    } catch { setMessages((m) => [...m, { role: "assistant", text: "暂时无法连接 AI 服务。" }]); }
    finally { setBusy(false); }
  };
  return (
    <section className="chat-home ocean">
      <div className="light-rays" />
      <div className="sea-floor" aria-hidden="true">
        <span className="seaweed seaweed-a" />
        <span className="seaweed seaweed-b" />
        <span className="coral coral-a" />
        <span className="coral coral-b" />
        <span className="shell" />
      </div>
      <div className="fish-school" aria-hidden="true">
        <span className="fish fish-a" />
        <span className="fish fish-b" />
        <span className="fish fish-c" />
      </div>
      <div className="rising-bubbles" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
      </div>
      {articles.slice(0, 6).map((a, i) => <button key={a.id} className={`news-orb orb-${i + 1}`} onClick={() => onArticle(a)}><span>{a.title}</span></button>)}
      <div className="hero-content">
        <DolphinMark large />
        <h1>海豚企策</h1>
        <p>潜入行业资讯深处，把 AI 趋势翻译成老板下一步</p>
        {messages.length > 0 && <div className="mini-chat">{messages.slice(-3).map((m, i) => <div key={i} className={m.role}>{m.text}</div>)}{busy && <Loader2 size={15} className="spin" />}</div>}
        <div className="prompt-box">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="描述你的企业目前遇到的困惑，助手将为你解答..." />
          <div><button className="profile-button" onClick={onProfile}><Building2 size={13} />企业画像</button><button className="send-button" onClick={send}><Send size={13} />发送</button></div>
        </div>
        <small>点击背景气泡可查看最新资讯详情</small>
      </div>
    </section>
  );
}

function NewsView({ articles, onArticles, onArticle }: { articles: Article[]; onArticles: (a: Article[]) => void; onArticle: (a: Article) => void }) {
  const [query, setQuery] = useState(""); const [loading, setLoading] = useState(false);
  const refresh = async () => { setLoading(true); try { const r = await fetch("/api/articles/refresh", { method: "POST" }); if (r.ok) { const d = await r.json() as FetchResult; onArticles(d.articles); } } finally { setLoading(false); } };
  const grouped = useMemo(() => {
    const map = new Map<string, Article[]>(); articles.filter((a) => `${a.title}${a.summary}${a.sourceName}`.toLowerCase().includes(query.toLowerCase())).forEach((a) => map.set(a.sourceId, [...(map.get(a.sourceId) || []), a])); return [...map.entries()];
  }, [articles, query]);
  return (
    <section className="news-view ocean"><div className="news-top"><div className="news-title"><DolphinMark /><strong>海豚企策</strong></div><div className="search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索资讯、信源、关键词..." /></div><button className="refresh-all" onClick={refresh} aria-label="刷新资讯"><RefreshCw size={16} className={loading ? "spin" : ""} /></button></div>
      <div className="source-grid">{grouped.map(([id, list]) => { const meta = sourceMeta[id] || { label: list[0]?.sourceName || id, mark: (list[0]?.sourceName || id)[0], color: "#4dd9e8" }; return <article className="source-panel" key={id}><header><span style={{ color: meta.color, borderColor: `${meta.color}55` }}>{meta.mark}</span><strong>{meta.label}</strong></header>{list.slice(0, 6).map((a) => <button key={a.id} onClick={() => onArticle(a)}><span>{a.title}</span><small>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("zh-CN") : "刚刚"}</small></button>)}</article>; })}</div>
    </section>
  );
}

function ArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
  const [summary, setSummary] = useState<SummaryResult | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`/api/articles/${encodeURIComponent(article.id)}/summarize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ article }) }).then((r) => r.ok ? r.json() : null).then(setSummary).finally(() => setLoading(false)); }, [article]);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="article-modal"><section className="article-copy"><button className="article-close" onClick={onClose} aria-label="关闭文章"><X size={17} /></button><div className="article-meta"><span>{article.sourceName}</span><small>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("zh-CN") : "最新资讯"}</small></div><h2>{article.title}</h2><p>{article.summary || "该信源暂未提供摘要，请打开原文查看完整内容。"}</p>{article.url !== "#" && <a href={article.url} target="_blank" rel="noreferrer">查看原文 <ExternalLink size={13} /></a>}</section><aside className="ai-panel"><header><div><Bot size={14} /><strong>AI 分析</strong></div><button onClick={onClose} aria-label="关闭"><X size={16} /></button></header>{loading ? <div className="ai-loading"><Loader2 className="spin" />正在分析文章...</div> : <><div className="summary-block"><label><Sparkles size={12} />AI 总结</label><p>{summary?.one_sentence || "暂时无法生成总结。"}</p></div><div className="summary-block"><label>企业洞察</label><p>{summary?.why_it_matters}</p>{summary?.key_points?.map((p) => <div className="point" key={p}>{p}</div>)}</div></>}</aside></div></div>;
}

function ProfileModal({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop"><form className="profile-modal" onSubmit={(e) => { e.preventDefault(); onClose(); }}><header><div><Building2 size={16} /><strong>企业画像配置</strong></div><button type="button" onClick={onClose}><X size={16} /></button></header>{[["企业名称", "例：海豚科技有限公司"], ["所属行业", "例：人工智能 / SaaS / 新能源"], ["企业规模", "例：100-500 人"], ["核心产品/服务", "简要描述主营业务"], ["当前核心挑战", "描述企业目前最关注的问题"]].map(([l, p]) => <label key={l}>{l}<input placeholder={p} /></label>)}<button className="save-profile">保存企业画像</button></form></div>;
}
