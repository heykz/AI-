"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot, Building2, ExternalLink, History, Loader2, MessageSquare, Newspaper,
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

type ChatMessage = { role: "user" | "assistant"; text: string };
type ChatSession = { id: string; title: string; messages: ChatMessage[] };

const initialChatSessions: ChatSession[] = [
  { id: "digital-transformation", title: "企业数字化转型方向", messages: [{ role: "user", text: "传统企业数字化转型应该先从哪里开始？" }, { role: "assistant", text: "建议先梳理高频、重复且可量化的业务流程，再从一个能在三个月内验证收益的小场景切入。" }] },
  { id: "ai-roi", title: "如何评估AI工具ROI", messages: [{ role: "user", text: "如何评估 AI 工具 ROI？" }, { role: "assistant", text: "可以同时记录节省工时、错误率变化、业务增量和持续使用成本，并设置上线前后的对照基线。" }] },
  { id: "competitor-analysis", title: "竞争对手分析框架", messages: [{ role: "user", text: "帮我整理一个竞争对手分析框架。" }, { role: "assistant", text: "可以从目标客户、核心产品、定价、获客渠道、交付能力和近期战略动作六个维度建立对比表。" }] },
  { id: "financing-strategy", title: "融资策略与时机选择", messages: [{ role: "user", text: "什么时候适合启动新一轮融资？" }, { role: "assistant", text: "通常在关键指标持续改善、资金仍有充足安全垫且下一阶段增长路径清晰时启动更主动。" }] },
];
const historyStorageKey = "ai-bossup-history-v1";

export function BossUpApp() {
  const [view, setView] = useState<"chat" | "news">("chat");
  const [articles, setArticles] = useState<Article[]>(demoArticles);
  const [selected, setSelected] = useState<Article | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(initialChatSessions);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [articleHistory, setArticleHistory] = useState<Article[]>(demoArticles);
  const [historyReady, setHistoryReady] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"history" | "user" | null>(null);

  useEffect(() => {
    fetch("/api/articles")
      .then((r) => r.ok ? r.json() as Promise<FetchResult> : null)
      .then((data) => data?.articles?.length && setArticles(data.articles))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(historyStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { chatSessions?: ChatSession[]; activeChatId?: string | null; articleHistory?: Article[] };
        if (parsed.chatSessions?.length) setChatSessions(parsed.chatSessions);
        if (parsed.articleHistory?.length) setArticleHistory(parsed.articleHistory);
        setActiveChatId(parsed.activeChatId || null);
      }
    } catch { /* Ignore invalid local history and keep the built-in examples. */ }
    finally { setHistoryReady(true); }
  }, []);
  useEffect(() => {
    if (!historyReady) return;
    window.localStorage.setItem(historyStorageKey, JSON.stringify({ chatSessions, activeChatId, articleHistory }));
  }, [activeChatId, articleHistory, chatSessions, historyReady]);

  const openArticle = (article: Article) => {
    setSelected(article);
    setArticleHistory((items) => [article, ...items.filter((item) => item.id !== article.id)].slice(0, 8));
  };
  const appendChatMessage = (sessionId: string | null, message: ChatMessage, titleHint?: string) => {
    const id = sessionId || `chat-${Date.now()}`;
    setChatSessions((items) => {
      const existing = items.find((item) => item.id === id);
      const updated: ChatSession = existing
        ? { ...existing, messages: [...existing.messages, message] }
        : { id, title: titleHint?.slice(0, 18) || "新对话", messages: [message] };
      return [updated, ...items.filter((item) => item.id !== id)].slice(0, 12);
    });
    setActiveChatId(id);
    return id;
  };
  const activeChat = chatSessions.find((item) => item.id === activeChatId) || null;

  return (
    <div className="app-shell">
      <Sidebar view={view} onView={(next) => { setView(next); if (next === "chat") setActiveChatId(null); }} onMobilePanel={setMobilePanel} chatSessions={chatSessions} activeChatId={activeChatId} articleHistory={articleHistory} onChatHistory={(id) => { setActiveChatId(id); setView("chat"); }} onArticleHistory={(article) => { setView("news"); openArticle(article); }} />
      <main className="main-stage">
        {view === "chat" ? (
          <ChatHome articles={articles} session={activeChat} onAppendMessage={appendChatMessage} onArticle={openArticle} onProfile={() => setProfileOpen(true)} />
        ) : (
          <NewsView articles={articles} onArticles={setArticles} onArticle={openArticle} />
        )}
      </main>
      {mobilePanel === "history" && <MobileHistoryPanel view={view} chatSessions={chatSessions} articleHistory={articleHistory} onClose={() => setMobilePanel(null)} onChatHistory={(id) => { setActiveChatId(id); setView("chat"); setMobilePanel(null); }} onArticleHistory={(article) => { setView("news"); openArticle(article); setMobilePanel(null); }} />}
      {mobilePanel === "user" && <MobileUserPanel onClose={() => setMobilePanel(null)} onProfile={() => { setMobilePanel(null); setProfileOpen(true); }} />}
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

function Sidebar({ view, onView, onMobilePanel, chatSessions, activeChatId, articleHistory, onChatHistory, onArticleHistory }: { view: "chat" | "news"; onView: (v: "chat" | "news") => void; onMobilePanel: (panel: "history" | "user") => void; chatSessions: ChatSession[]; activeChatId: string | null; articleHistory: Article[]; onChatHistory: (id: string) => void; onArticleHistory: (article: Article) => void }) {
  return (
    <aside className="sidebar">
      <div className="brand"><DolphinMark /><div><strong>海豚企策</strong><small>DOLPHIN INTEL</small></div></div>
      <nav>
        <button className={view === "news" ? "nav-active" : ""} onClick={() => onView("news")}><Newspaper size={15} />聚合</button>
        <button className={view === "chat" ? "nav-active" : ""} onClick={() => onView("chat")}><MessageSquare size={15} />AI 助手</button>
      </nav>
      <div className="mobile-tools"><button onClick={() => onMobilePanel("history")} aria-label="历史记录"><History size={16} /><span>历史</span></button><button onClick={() => onMobilePanel("user")} aria-label="用户中心"><User size={16} /><span>我的</span></button></div>
      <section className="history"><p>历史记录</p>{view === "chat" ? chatSessions.slice(0, 8).map((session) => <button className={activeChatId === session.id ? "history-active" : ""} key={session.id} onClick={() => onChatHistory(session.id)}><MessageSquare size={11} /><span>{session.title}</span></button>) : articleHistory.slice(0, 8).map((article) => <button key={article.id} onClick={() => onArticleHistory(article)}><History size={12} /><span>{article.title}</span></button>)}</section>
      <div className="account"><span><User size={13} /></span><div><strong>企业用户</strong><small>已配置企业画像</small></div></div>
    </aside>
  );
}

function ChatHome({ articles, session, onAppendMessage, onArticle, onProfile }: { articles: Article[]; session: ChatSession | null; onAppendMessage: (sessionId: string | null, message: ChatMessage, titleHint?: string) => string; onArticle: (a: Article) => void; onProfile: () => void }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const messages = session?.messages || [];
  const send = async () => {
    const text = input.trim(); if (!text || busy) return;
    const context = [...messages, { role: "user" as const, text }];
    const sessionId = onAppendMessage(session?.id || null, { role: "user", text }, text); setInput(""); setBusy(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "feed", message: text, history: context, articles: articles.slice(0, 20) }) });
      const data = r.ok ? await r.json() : null;
      onAppendMessage(sessionId, { role: "assistant", text: data?.content || "服务暂时没有响应，请稍后再试。" });
    } catch { onAppendMessage(sessionId, { role: "assistant", text: "暂时无法连接 AI 服务。" }); }
    finally { setBusy(false); }
  };
  return (
    <section className={`chat-home ocean${messages.length ? " has-conversation" : ""}`}>
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
        {messages.length > 0 && <div className="mini-chat">{messages.map((m, i) => <div key={`${m.role}-${i}`} className={m.role}>{m.text}</div>)}{busy && <Loader2 size={15} className="spin" />}</div>}
        <div className="prompt-box">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="描述你的企业目前遇到的困惑，助手将为你解答..." />
          <div><button className="profile-button" onClick={onProfile}><Building2 size={13} />企业画像</button><button className="send-button" onClick={send}><Send size={13} />发送</button></div>
        </div>
        <small>点击背景气泡可查看最新资讯详情</small>
      </div>
    </section>
  );
}

function MobileHistoryPanel({ view, chatSessions, articleHistory, onClose, onChatHistory, onArticleHistory }: { view: "chat" | "news"; chatSessions: ChatSession[]; articleHistory: Article[]; onClose: () => void; onChatHistory: (id: string) => void; onArticleHistory: (article: Article) => void }) {
  return <div className="mobile-sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="mobile-sheet"><header><div><History size={16} /><strong>{view === "chat" ? "历史对话" : "浏览历史"}</strong></div><button onClick={onClose} aria-label="关闭历史记录"><X size={16} /></button></header><div className="mobile-history-list">{view === "chat" ? chatSessions.map((session) => <button key={session.id} onClick={() => onChatHistory(session.id)}><MessageSquare size={14} /><span><strong>{session.title}</strong><small>{session.messages.at(-1)?.text}</small></span></button>) : articleHistory.map((article) => <button key={article.id} onClick={() => onArticleHistory(article)}><History size={14} /><span><strong>{article.title}</strong><small>{article.sourceName}</small></span></button>)}</div></section></div>;
}

function MobileUserPanel({ onClose, onProfile }: { onClose: () => void; onProfile: () => void }) {
  return <div className="mobile-sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="mobile-sheet mobile-user-sheet"><header><div><User size={16} /><strong>用户中心</strong></div><button onClick={onClose} aria-label="关闭用户中心"><X size={16} /></button></header><div className="mobile-user-summary"><span><User size={18} /></span><div><strong>企业用户</strong><small>已配置企业画像</small></div></div><button className="mobile-profile-action" onClick={onProfile}><Building2 size={15} />编辑企业画像</button></section></div>;
}

function NewsView({ articles, onArticles, onArticle }: { articles: Article[]; onArticles: (a: Article[]) => void; onArticle: (a: Article) => void }) {
  const [query, setQuery] = useState(""); const [refreshing, setRefreshing] = useState<string | null>(null);
  const refresh = async (sourceId: string) => { setRefreshing(sourceId); try { const r = await fetch("/api/articles/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceId }) }); if (r.ok) { const d = await r.json() as FetchResult; onArticles(d.articles); } } finally { window.setTimeout(() => setRefreshing(null), 500); } };
  const grouped = useMemo(() => {
    const map = new Map<string, Article[]>(); articles.forEach((a) => map.set(a.sourceId, [...(map.get(a.sourceId) || []), a])); return [...map.entries()];
  }, [articles]);
  return (
    <section className="news-view ocean"><div className="news-top"><div className="news-title"><DolphinMark /><strong>海豚企策</strong></div><div className="search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索资讯、信源、关键词..." /></div></div>
      <div className="source-grid">{grouped.map(([id, list]) => { const meta = sourceMeta[id] || { label: list[0]?.sourceName || id, mark: (list[0]?.sourceName || id)[0], color: "#4dd9e8" }; const filtered = list.filter((a) => `${a.title}${a.summary}${a.sourceName}`.toLowerCase().includes(query.toLowerCase())); return <article className="source-panel" key={id}><header><div><span style={{ color: meta.color, borderColor: `${meta.color}55` }}>{meta.mark}</span><strong>{meta.label}</strong></div><button onClick={() => refresh(id)} aria-label={`刷新${meta.label}`}><RefreshCw size={13} className={refreshing === id ? "spin" : ""} /></button></header>{filtered.length ? filtered.slice(0, 6).map((a) => <button key={a.id} onClick={() => onArticle(a)}><span>{a.title}</span><small>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("zh-CN") : "刚刚"}</small></button>) : <p className="no-news">暂无匹配资讯</p>}</article>; })}</div>
    </section>
  );
}

function ArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
  const [summary, setSummary] = useState<SummaryResult | null>(null); const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState(""); const [asking, setAsking] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([{ role: "assistant", text: "已读取文章内容，结合您的企业画像，我可以帮您分析此事件对贵司的影响。请问您最关心哪个维度？" }]);
  useEffect(() => { fetch(`/api/articles/${encodeURIComponent(article.id)}/summarize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ article }) }).then((r) => r.ok ? r.json() : null).then(setSummary).finally(() => setLoading(false)); }, [article]);
  const ask = async () => {
    const text = question.trim(); if (!text || asking) return;
    setMessages((items) => [...items, { role: "user", text }]); setQuestion(""); setAsking(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "article", message: text, article }) });
      const data = response.ok ? await response.json() : null;
      setMessages((items) => [...items, { role: "assistant", text: data?.content || "文章问答服务暂时没有响应，请稍后再试。" }]);
    } catch { setMessages((items) => [...items, { role: "assistant", text: "暂时无法连接文章问答服务。" }]); }
    finally { setAsking(false); }
  };
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="article-modal"><section className="article-copy"><button className="article-close" onClick={onClose} aria-label="关闭文章"><X size={17} /></button><div className="article-meta"><span>{article.sourceName}</span><small>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("zh-CN") : "最新资讯"}</small></div><h2>{article.title}</h2><p>{article.summary || "该信源暂未提供摘要，请打开原文查看完整内容。"}</p>{article.url !== "#" && <a href={article.url} target="_blank" rel="noreferrer">查看原文 <ExternalLink size={13} /></a>}</section><aside className="ai-panel"><header><div><Bot size={14} /><strong>AI 分析</strong></div><button onClick={onClose} aria-label="关闭"><X size={16} /></button></header>{loading ? <div className="ai-loading"><Loader2 className="spin" />正在分析文章...</div> : <><div className="summary-block"><label><Sparkles size={12} />AI 总结</label><p>{summary?.one_sentence || "暂时无法生成总结。"}</p></div><div className="summary-block"><label>企业洞察</label><p>{summary?.why_it_matters}</p>{summary?.key_points?.map((p) => <div className="point" key={p}>{p}</div>)}</div></>}<div className="article-chat"><div className="article-chat-messages">{messages.map((message, index) => <div className={message.role} key={`${message.role}-${index}`}><span>{message.text}</span></div>)}{asking && <Loader2 size={13} className="spin" />}</div><div className="article-chat-input"><input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(); }} placeholder="针对文章提问..." /><button onClick={ask} aria-label="发送文章问题"><Send size={13} /></button></div></div></aside></div></div>;
}

function ProfileModal({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className="profile-modal" onSubmit={(e) => { e.preventDefault(); onClose(); }}><header><div><Building2 size={16} /><strong>企业画像配置</strong></div><button type="button" onClick={onClose}><X size={16} /></button></header>{[["企业名称", "例：海豚科技有限公司"], ["所属行业", "例：人工智能 / SaaS / 新能源"], ["企业规模", "例：100-500 人"], ["核心产品/服务", "简要描述主营业务"], ["当前核心挑战", "描述企业目前最关注的问题"]].map(([l, p]) => <label key={l}>{l}<input placeholder={p} /></label>)}<button className="save-profile">保存企业画像</button></form></div>;
}
