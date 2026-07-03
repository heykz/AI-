# AI 信息聚合助手项目规划文档

> 本文档用于指导一个基于 `Next.js + FastAPI + PostgreSQL/pgvector + AIService` 的 AI 信息聚合助手产品开发。  
> 目标是从 NewsNow 与 TrendRadar 两个开源项目中提取可复用思想与模块，重新实现为适合单人 vibe coding 的产品架构。  
> 注意：本文档不建议直接 fork 并混合改造两个项目，而是建议“参考结构，重新实现核心模块”。

---

## 1. 产品定位

本项目目标是构建一个：

```text
信息聚合 + AI 总结 + AI 问答 + RAG 检索 + 趋势分析
```

的一体化 Web 应用。

核心用户场景：

```text
用户添加 RSS / 平台信息源
→ 系统自动或手动抓取文章 / 热点
→ 文章标准化入库
→ 用户浏览信息流
→ AI 总结单篇文章
→ AI 基于用户聚合内容进行问答
→ 后期生成趋势简报与推送提醒
```

第一阶段不要做完整 SaaS 平台。  
第一阶段目标是做出一个能稳定运行的个人版 / 内测版 MVP。

---

## 2. 推荐主技术栈

### 前端

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
Zustand
React Hook Form
Zod
```

### 后端

```text
Python FastAPI
SQLAlchemy / SQLModel
Alembic
Pydantic
AIService abstraction
LangChain optional
```

### 数据库

```text
PostgreSQL
pgvector
```

### AI

```text
OpenAI first
Claude later
Provider 可切换，但 MVP 阶段先只接一个
```

### 信息源

```text
RSS
RSSHub
NewsNow-style platform sources
自定义平台 fetcher
```

### 任务系统

```text
Redis
Celery / RQ / Dramatiq
```

MVP 早期可以先不用任务队列，先做手动刷新。  
等抓取、总结、embedding 跑通后，再加 Worker。

### 部署

```text
阿里云 ECS
Docker Compose
Nginx
HTTPS
PostgreSQL volume backup
```

---

## 3. NewsNow 与 TrendRadar 的定位

### NewsNow 的角色

NewsNow 更适合作为：

```text
信息源注册结构参考
平台热点 fetcher 参考
标准化 NewsItem 数据结构参考
热榜 UI / 信息流展示参考
缓存与刷新策略参考
```

不要直接把 NewsNow 当你的完整项目基座。

原因：

```text
NewsNow 技术栈与目标主架构不同
NewsNow 更偏热榜阅读器
你的项目需要用户系统、RAG、pgvector、AI 助手、长期数据沉淀
```

### TrendRadar 的角色

TrendRadar 更适合作为：

```text
RSS 监控参考
关键词筛选参考
AI 兴趣筛选参考
趋势分析参考
AI 简报参考
通知推送参考
MCP 工具化思路参考
```

不要直接复制 TrendRadar 代码进闭源商业项目。  
TrendRadar 使用 GPL-3.0 License，商业闭源场景应避免直接复制核心代码。

### 总体吸收策略

```text
NewsNow = 信息源层参考
TrendRadar = 分析 / 筛选 / 推送层参考
你的自研架构 = 产品主基座
```

不要这样做：

```text
Fork NewsNow
→ 塞 TrendRadar
→ 改 FastAPI
→ 改 PostgreSQL
→ 改 Next.js
→ 加 AI
```

这会让项目变成技术栈混战现场。  
比较稳的方式是：

```text
参考它们的模块设计
→ 用自己的主架构重新实现
→ 保证数据结构统一
→ 保证用户系统和 RAG 从一开始可扩展
```

---

## 4. 可从 NewsNow 提取的模块

### 4.1 Source Registry 信息源注册中心

用途：

```text
统一管理所有信息源
包括 RSS 源、平台源、自定义源、未来 API 源
```

建议数据表：

```text
sources
├── id
├── user_id
├── name
├── type: rss | platform | custom
├── url
├── platform_id
├── category
├── enabled
├── fetch_interval
├── last_fetched_at
├── status
├── error_message
├── created_at
└── updated_at
```

MVP 优先支持：

```text
RSS
HackerNews
GitHub Trending
ProductHunt
IT之家 / 少数派 / 36氪 任选 1-2 个中文源
```

不要一开始接几十个来源。  
先把 3-5 个来源跑稳定，再扩展。

---

### 4.2 Fetcher Adapter 抓取适配器

NewsNow 的 source fetcher 思路很值得参考。  
你需要在 Python 后端里重新实现统一接口。

建议接口：

```python
from abc import ABC, abstractmethod
from typing import list
from pydantic import BaseModel
from datetime import datetime


class RawNewsItem(BaseModel):
    source_id: str
    external_id: str | None = None
    title: str
    url: str
    mobile_url: str | None = None
    published_at: datetime | None = None
    summary: str | None = None
    raw: dict | None = None


class BaseFetcher(ABC):
    source_id: str
    source_name: str

    @abstractmethod
    async def fetch(self) -> list[RawNewsItem]:
        pass
```

未来可以扩展：

```text
RSSFetcher
HackerNewsFetcher
GitHubTrendingFetcher
ProductHuntFetcher
RSSHubFetcher
CustomAPIFetcher
```

核心规则：

```text
所有来源必须统一返回 RawNewsItem
所有来源入库前必须经过去重、清洗、标准化
所有文章必须绑定 user_id 和 source_id
```

---

### 4.3 热榜 UI / 信息流布局

NewsNow 的热榜信息展示可以作为 UI 参考。  
但前端不要直接搬，因为你的主前端是 Next.js + Tailwind + shadcn/ui。

建议 UI 结构：

```text
Dashboard Layout
├── Sidebar
│   ├── 信息源
│   ├── 文章
│   ├── 收藏
│   ├── AI 对话
│   └── 设置
│
├── Main Content
│   ├── 文章列表
│   ├── 来源筛选
│   ├── 关键词筛选
│   └── 热点排序
│
└── AI Assistant Panel
    ├── 当前文章摘要
    ├── 对话输入框
    ├── AI 回答
    └── 引用来源
```

---

### 4.4 缓存与刷新策略

NewsNow 的缓存 / 刷新策略可以参考，但建议你自己实现：

```text
默认抓取间隔：30 分钟
手动刷新：登录用户可触发
失败重试：指数退避
异常源：标记 status = error
连续失败：自动禁用或延长抓取间隔
```

MVP 先做：

```text
手动刷新
URL + title hash 去重
last_fetched_at
status
error_message
```

后期再做：

```text
自动定时刷新
动态调整抓取频率
失败源健康检查
```

---

## 5. 可从 TrendRadar 提取的模块

### 5.1 RSS 支持逻辑

TrendRadar 的 RSS / Atom 支持思路可以复用。  
你的 MVP 第一阶段也应该从 RSS 开始，因为 RSS 比平台爬虫稳定。

建议功能：

```text
用户添加 RSS URL
后端解析 feed
提取标题、链接、发布时间、摘要
标准化为 RawNewsItem
入库 articles
```

MVP 不要做复杂全文抓取。  
先使用 RSS feed 里已有的内容。

---

### 5.2 关键词筛选

TrendRadar 的关键词筛选适合你的第一版个性化过滤。

建议数据表：

```text
user_keywords
├── id
├── user_id
├── keyword
├── type: include | exclude
├── created_at
```

文章入库时可以计算：

```text
matched_keywords
excluded_keywords
relevance_score
```

第一版规则：

```text
命中 include keyword：提高优先级
命中 exclude keyword：隐藏或降低优先级
无关键词设置：展示全部
```

关键词虽然朴素，但可靠。  
AI 筛选放第二阶段，不要一开始就把所有东西交给模型玄学。

---

### 5.3 AI Interest Filter 自然语言兴趣筛选

TrendRadar 的 AI 智能筛选思路非常适合后期升级。

用户可以输入：

```text
我关注 Bitcoin L2、Web3 融资、AI Agent、加密交易所、早期空投机会。
```

系统流程：

```text
自然语言兴趣描述
→ AI 提取结构化标签
→ 对文章进行相关性打分
→ 低分内容降权或隐藏
```

建议数据表：

```text
user_interests
├── id
├── user_id
├── description
├── extracted_tags_json
├── created_at
├── updated_at
```

建议第一版不要做。  
先做关键词筛选，等文章抓取和 AI 总结稳定后再加。

---

### 5.4 Trend Engine 趋势分析

TrendRadar 的趋势分析适合你的第二阶段。

第一版趋势分析不要做复杂 NLP。  
先做简单统计：

```text
关键词出现次数
同 URL 出现次数
相似标题出现次数
同主题跨平台出现次数
首次出现时间
最近出现时间
```

建议数据表：

```text
topics
├── id
├── user_id
├── name
├── first_seen_at
├── last_seen_at
├── mention_count
├── platform_count
├── score
├── created_at
└── updated_at
```

```text
topic_mentions
├── id
├── topic_id
├── article_id
├── source_id
├── created_at
```

后期再加：

```text
AI 话题聚类
情绪分析
热度曲线
传播路径
跨平台对比
```

---

### 5.5 AI Report / Brief 简报生成

TrendRadar 的 AI 简报能力可以改造成你的核心卖点。

简报输出结构：

```json
{
  "title": "今日信息简报",
  "top_stories": [],
  "emerging_trends": [],
  "risk_signals": [],
  "opportunities": [],
  "recommended_actions": [],
  "sources": []
}
```

适合场景：

```text
每日 Web3 简报
AI 行业雷达
融资动态摘要
项目监控报告
KOL 舆情摘要
关键词预警报告
```

MVP 后期接口：

```text
POST /reports/daily
GET /reports
GET /reports/{id}
```

---

### 5.6 Notification / Push 通知系统

TrendRadar 的多渠道推送很完整，但你的 MVP 不要全做。

第一阶段：

```text
站内通知
邮件通知
Webhook
```

第二阶段：

```text
Telegram
飞书
钉钉
企业微信
Slack
```

建议数据表：

```text
notifications
├── id
├── user_id
├── type
├── title
├── content
├── read_at
├── created_at
```

```text
notification_channels
├── id
├── user_id
├── type: email | webhook | telegram | feishu | slack
├── config_json
├── enabled
├── created_at
└── updated_at
```

---

### 5.7 MCP / Agent Tool 思路

TrendRadar 的 MCP 思路可以作为远期规划。

但 MVP 不要先做 MCP。  
先做普通 API：

```text
GET /articles
GET /articles/search
POST /articles/{id}/summarize
POST /chat/stream
POST /reports/daily
```

等核心产品跑通，再考虑 MCP 工具化：

```text
search_articles
summarize_article
get_trends
generate_report
compare_sources
```

---

## 6. 推荐产品模块架构

```text
project/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── public/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── fetchers/
│   │   ├── workers/
│   │   └── ai/
│   ├── alembic/
│   ├── requirements.txt
│   └── Dockerfile
│
├── nginx/
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 7. 后端推荐目录

```text
backend/app/
├── main.py
├── config.py
├── database.py
│
├── api/
│   ├── auth.py
│   ├── sources.py
│   ├── articles.py
│   ├── chat.py
│   ├── summaries.py
│   ├── search.py
│   └── reports.py
│
├── models/
│   ├── user.py
│   ├── source.py
│   ├── article.py
│   ├── chat.py
│   ├── summary.py
│   ├── topic.py
│   └── notification.py
│
├── schemas/
│   ├── auth.py
│   ├── source.py
│   ├── article.py
│   ├── chat.py
│   └── report.py
│
├── services/
│   ├── auth_service.py
│   ├── source_service.py
│   ├── article_service.py
│   ├── filter_service.py
│   ├── ai_service.py
│   ├── summary_service.py
│   ├── embedding_service.py
│   ├── rag_service.py
│   ├── trend_service.py
│   └── notification_service.py
│
├── fetchers/
│   ├── base.py
│   ├── rss_fetcher.py
│   ├── hackernews_fetcher.py
│   ├── github_trending_fetcher.py
│   └── producthunt_fetcher.py
│
├── ai/
│   ├── providers/
│   │   ├── base.py
│   │   ├── openai_provider.py
│   │   └── anthropic_provider.py
│   ├── prompts/
│   │   ├── summarize_article.md
│   │   ├── rag_answer.md
│   │   └── daily_report.md
│   └── types.py
│
└── workers/
    ├── fetch_worker.py
    ├── embedding_worker.py
    └── report_worker.py
```

---

## 8. 数据流设计

### 8.1 信息入库流程

```text
RSS / Platform Source
→ Fetcher Adapter
→ RawNewsItem
→ normalize_url()
→ generate_dedup_hash()
→ freshness_filter()
→ save articles
→ optional keyword filter
→ enqueue embedding job
```

### 8.2 AI 总结流程

```text
User opens article
→ Click summarize
→ Backend loads article
→ AIService.summarize_article()
→ Save summary JSON
→ Return to frontend
```

### 8.3 RAG 问答流程

```text
User asks question
→ Generate query embedding
→ Search article_chunks by pgvector
→ Filter by user_id
→ Compose context
→ AIService.chat_with_context()
→ Stream answer by SSE
→ Return citations
```

### 8.4 趋势分析流程

```text
New articles inserted
→ Extract keywords / topics
→ Update topic mention count
→ Calculate trend score
→ Generate daily report
```

---

## 9. MVP 功能范围

### 必做

```text
1. 用户注册 / 登录
2. 添加 RSS 源
3. 手动刷新 RSS
4. 文章列表
5. 文章详情
6. AI 单篇总结
7. AI 右侧对话面板
8. SSE 流式输出
```

### 第二阶段

```text
1. pgvector RAG
2. 文章分块
3. 多文章问答
4. 引用来源
5. 关键词筛选
6. 平台热榜 fetcher
```

### 第三阶段

```text
1. 趋势分析
2. 每日简报
3. AI 兴趣筛选
4. 通知系统
5. 多模型切换
6. RSSHub 集成
```

### 暂时不要做

```text
团队空间
支付系统
浏览器插件
移动 App
复杂权限系统
知识图谱
多 Agent
完整 MCP
多语言
复杂管理后台
```

---

## 10. Vibe Coding 开发路径

### Phase 0：初始化项目骨架

目标：

```text
前端、后端、数据库都能启动
```

任务：

```text
创建 frontend/
创建 backend/
创建 docker-compose.yml
创建 README.md
配置 PostgreSQL + pgvector
配置 FastAPI /health
配置 Next.js 首页
```

验收标准：

```text
docker compose up 能启动数据库
FastAPI /health 返回 ok
Next.js 首页能打开
```

---

### Phase 1：认证系统

目标：

```text
用户可以注册、登录、获取当前用户
```

任务：

```text
users 表
refresh_tokens 表
密码 hash
JWT access token
refresh token
/auth/register
/auth/login
/auth/refresh
/auth/me
/auth/logout
```

验收标准：

```text
注册成功
登录成功
/me 返回当前用户
未登录访问 protected API 返回 401
用户数据能通过 user_id 隔离
```

---

### Phase 2：Source Registry

目标：

```text
用户可以添加和管理自己的信息源
```

任务：

```text
sources 表
GET /sources
POST /sources
PATCH /sources/{id}
DELETE /sources/{id}
```

验收标准：

```text
用户只能看到自己的 sources
可以添加 RSS URL
可以禁用 source
可以删除 source
```

---

### Phase 3：RSS Fetcher

目标：

```text
用户添加 RSS 后可以抓文章
```

任务：

```text
RawNewsItem schema
BaseFetcher
RSSFetcher
articles 表
dedup hash
POST /sources/{id}/refresh
GET /articles
GET /articles/{id}
```

验收标准：

```text
刷新 RSS 后 articles 表有数据
重复刷新不会重复插入
前端能看到文章列表
```

---

### Phase 4：前端 Dashboard

目标：

```text
用户能在前端完成登录、添加源、浏览文章
```

页面：

```text
/login
/register
/dashboard
/sources
/articles
/articles/[id]
```

组件：

```text
AppShell
Sidebar
Topbar
SourceForm
ArticleList
ArticleCard
ArticleDetail
AI Assistant placeholder
```

视觉要求：

```text
现代极简
浅灰背景
白色卡片
轻阴影
清晰对比
shadcn/ui 组件
右侧 AI 面板预留
```

---

### Phase 5：AI 单篇总结

目标：

```text
用户可以让 AI 总结单篇文章
```

任务：

```text
AIService
OpenAIProvider
summary prompt
summaries 表或 articles.summary_json
POST /articles/{id}/summarize
```

输出结构：

```json
{
  "one_sentence": "一句话总结",
  "key_points": ["要点 1", "要点 2"],
  "why_it_matters": "为什么重要",
  "action_suggestion": "行动建议"
}
```

验收标准：

```text
点击总结后返回结构化摘要
摘要缓存入库
第二次打开不重复调用 AI
```

---

### Phase 6：AI Chat SSE

目标：

```text
右侧 AI 助手可以流式回答
```

任务：

```text
chat_sessions 表
chat_messages 表
POST /chat/sessions
GET /chat/sessions
GET /chat/sessions/{id}/messages
POST /chat/sessions/{id}/stream
SSE streaming
```

验收标准：

```text
前端能逐字显示 AI 回答
用户消息和 AI 消息能保存
支持围绕当前文章提问
```

---

### Phase 7：pgvector RAG

目标：

```text
AI 可以基于用户文章库回答问题
```

任务：

```text
article_chunks 表
chunk_article()
embed_chunks()
retrieve_relevant_chunks()
answer_with_sources()
```

流程：

```text
文章分块
→ 生成 embedding
→ 存入 pgvector
→ 用户提问
→ 检索相关 chunks
→ 组装上下文
→ AI 回答
→ 返回引用来源
```

验收标准：

```text
用户问一个主题
系统能检索多篇文章 chunks
AI 回答带引用来源
检索必须按 user_id 隔离
```

---

### Phase 8：趋势简报

目标：

```text
系统能生成每日信息简报
```

任务：

```text
topics 表
topic_mentions 表
trend scoring
daily report prompt
POST /reports/daily
GET /reports
GET /reports/{id}
```

验收标准：

```text
能生成今日重点
能展示趋势变化
每条结论有来源
```

---

### Phase 9：通知系统

目标：

```text
系统可以主动提醒用户
```

第一版：

```text
站内通知
邮件
Webhook
```

第二版：

```text
Telegram
飞书
钉钉
Slack
```

验收标准：

```text
用户设置关键词后，新文章命中关键词能生成通知
通知可以标记已读
```

---

## 11. 给 Coding Agent 的总任务说明

可以直接复制给其他 agent：

```text
Project Goal:
Build an AI-powered information aggregation and assistant web app.

Main Stack:
- Frontend: Next.js + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Python FastAPI
- Database: PostgreSQL + pgvector
- AI: AIService abstraction, first provider OpenAI, later Claude
- Workers: background jobs for RSS/platform fetching, embeddings, reports
- Deployment: Docker Compose + Nginx

Reference Projects:
1. NewsNow:
   Use as reference for:
   - source registry design
   - platform news fetcher pattern
   - normalized news item structure
   - clean hot-news reading UI
   - cache and refresh strategy

   Do not directly copy its whole architecture.
   It uses a different frontend/backend stack.
   Our project uses Next.js + FastAPI + PostgreSQL/pgvector.

2. TrendRadar:
   Use as reference for:
   - RSS support
   - keyword filtering
   - AI interest filtering
   - trend analysis
   - AI report generation
   - notification channels
   - MCP concept for future agent tools

   Do not directly copy GPL code into a closed-source product.
   Reimplement ideas in our own architecture.

MVP Scope:
1. User auth with email/password/JWT
2. Add RSS sources
3. Fetch RSS articles manually
4. Store articles in PostgreSQL
5. Show article list and article detail
6. AI summarize single article
7. AI chat panel with streaming response
8. Later add pgvector RAG over article chunks

Core Data Flow:
Source/RSS/platform API
→ fetcher adapter
→ normalized RawNewsItem
→ dedup/freshness filter
→ articles table
→ optional keyword filter
→ embedding worker
→ pgvector
→ AI chat / summary / RAG answer with citations

Implementation Rules:
- Keep API layer thin.
- Put business logic in services.
- Put long-running jobs in workers.
- All source fetchers must return the same RawNewsItem schema.
- All user-owned data must be scoped by user_id.
- Do not add multi-provider AI until OpenAI flow works.
- Do not add notifications until article fetch + AI summary works.
- Do not add MCP until basic API-based AI assistant works.
```

---

## 12. 给 Coding Agent 的任务拆分

### Task 1：初始化项目骨架

```text
Create a monorepo with:
- frontend/
- backend/
- docker-compose.yml
- README.md

Frontend:
- Next.js
- TypeScript
- Tailwind
- shadcn/ui

Backend:
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- PostgreSQL connection

Docker:
- PostgreSQL with pgvector
- backend service
- frontend service later
```

验收标准：

```text
docker compose up 能启动 PostgreSQL
FastAPI /health 返回 ok
Next.js 首页能打开
```

---

### Task 2：认证模块

```text
Implement email/password authentication.

Tables:
- users
- refresh_tokens

Endpoints:
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- GET /auth/me
- POST /auth/logout

Requirements:
- hash passwords with Argon2id or bcrypt
- JWT access token
- refresh token stored in DB
- user_id available in protected routes
```

验收标准：

```text
用户注册后能登录
/me 能返回当前用户
未登录访问 protected API 会 401
```

---

### Task 3：Source Registry

```text
Implement source management.

Tables:
- sources

Fields:
- id
- user_id
- name
- type: rss | platform
- url
- platform_id
- enabled
- fetch_interval
- last_fetched_at
- status
- error_message
- created_at
- updated_at

Endpoints:
- GET /sources
- POST /sources
- PATCH /sources/{id}
- DELETE /sources/{id}
```

验收标准：

```text
用户只能管理自己的 sources
可以添加 RSS URL
可以禁用 source
```

---

### Task 4：RSS Fetcher

```text
Implement RSS fetching.

Create:
- RawNewsItem schema
- BaseFetcher interface
- RSSFetcher
- Article model
- dedup hash

Endpoint:
- POST /sources/{id}/refresh
- GET /articles
- GET /articles/{id}

Rules:
- Use feedparser or equivalent
- Normalize title/url/published_at/summary
- Deduplicate by normalized url + title hash
- Store articles with user_id and source_id
```

验收标准：

```text
刷新 RSS 后 articles 表有数据
重复刷新不会重复插入
前端能看到文章列表
```

---

### Task 5：前端 Dashboard

```text
Build dashboard UI.

Pages:
- /login
- /register
- /dashboard
- /sources
- /articles
- /articles/[id]

Components:
- AppShell
- Sidebar
- Topbar
- SourceForm
- ArticleList
- ArticleCard
- ArticleDetail
```

视觉要求：

```text
Modern minimal UI
Light background
White cards
Soft shadow
Clear contrast
Right-side AI panel placeholder
Use shadcn/ui components where possible
```

---

### Task 6：AI 单篇总结

```text
Implement article summarization.

Create:
- AIService
- OpenAIProvider
- ArticleSummaryService
- summaries table or articles.summary_json

Endpoint:
- POST /articles/{id}/summarize

Output JSON:
{
  "one_sentence": string,
  "key_points": string[],
  "why_it_matters": string,
  "action_suggestion": string
}
```

验收标准：

```text
点击总结后返回结构化摘要
摘要缓存入库
二次访问不重复调用 AI
```

---

### Task 7：AI Chat SSE

```text
Implement streaming AI chat.

Tables:
- chat_sessions
- chat_messages

Endpoint:
- POST /chat/sessions
- GET /chat/sessions
- GET /chat/sessions/{id}/messages
- POST /chat/sessions/{id}/stream

Requirements:
- SSE streaming
- save user message and assistant response
- support context_article_id
```

验收标准：

```text
右侧 AI 面板能流式显示回答
用户可以围绕当前文章提问
对话记录能保存
```

---

### Task 8：pgvector RAG

```text
Implement article RAG.

Tables:
- article_chunks

Fields:
- id
- article_id
- user_id
- content
- embedding vector
- chunk_index

Services:
- chunk_article(article)
- embed_chunks(chunks)
- retrieve_relevant_chunks(user_id, query)
- answer_with_sources(query, chunks)

Requirements:
- answers must include source article ids and titles
- retrieval must be scoped by user_id
```

验收标准：

```text
用户问一个主题
系统能检索多篇文章 chunks
AI 回答带引用来源
```

---

## 13. 最小数据库表清单

MVP 必需：

```text
users
refresh_tokens
sources
articles
summaries
chat_sessions
chat_messages
```

RAG 阶段：

```text
article_chunks
```

趋势阶段：

```text
topics
topic_mentions
reports
```

通知阶段：

```text
notifications
notification_channels
```

---

## 14. 最小 API 清单

### Auth

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
GET /auth/me
POST /auth/logout
```

### Sources

```text
GET /sources
POST /sources
PATCH /sources/{id}
DELETE /sources/{id}
POST /sources/{id}/refresh
```

### Articles

```text
GET /articles
GET /articles/{id}
POST /articles/{id}/summarize
```

### Chat

```text
POST /chat/sessions
GET /chat/sessions
GET /chat/sessions/{id}/messages
POST /chat/sessions/{id}/stream
```

### Search / RAG

```text
GET /search
POST /rag/query
```

### Reports

```text
POST /reports/daily
GET /reports
GET /reports/{id}
```

### Notifications

```text
GET /notifications
POST /notifications/{id}/read
```

---

## 15. 前端页面清单

MVP：

```text
/login
/register
/dashboard
/sources
/articles
/articles/[id]
/chat
/settings
```

第二阶段：

```text
/search
/reports
/trends
/notifications
```

---

## 16. UI 风格规范

整体方向：

```text
Modern Minimal + Soft Depth
```

关键词：

```text
极简
高对比
浮层
轻阴影
清晰信息层级
少量玻璃效果
响应式
```

建议设计：

```text
背景：#F7F8FA
卡片：#FFFFFF
主文字：#111827
副文字：#6B7280
边框：#E5E7EB
强调色：蓝 / 紫 / BTC 橙任选一种
```

组件风格：

```text
圆角：16px - 24px
阴影：轻，不要重
按钮：高对比，主 CTA 明确
文章卡片：标题清楚，来源和时间弱化
AI 面板：右侧浮层，突出对话与引用来源
```

避免：

```text
全站液态玻璃
过度渐变
复杂动效
低对比文字
大面积发光按钮
```

---

## 17. 单人开发注意事项

### 不要一开始做完整平台

第一版只做：

```text
添加 RSS
抓文章
看文章
AI 总结
AI 对话
```

### 不要先做多模型

先接 OpenAI。  
`AIService` 设计成可扩展即可，不要一开始就同时接 OpenAI、Claude、Gemini。

### 不要先做复杂 Agent

先做：

```text
检索
组装上下文
调用模型
返回答案
```

不要先做：

```text
多 Agent
自动规划
工具链
长期记忆
完整 MCP
```

### 不要跳过用户数据隔离

所有用户数据必须带 `user_id`：

```text
sources.user_id
articles.user_id
chat_sessions.user_id
chat_messages.user_id
article_chunks.user_id
```

所有查询必须按 `user_id` 过滤。

### 不要忽视 AI 成本

至少记录：

```text
model
input_tokens
output_tokens
estimated_cost
created_at
user_id
request_type
```

---

## 18. 最短可用版本定义

一个可用的 MVP 应该满足：

```text
用户可以注册登录
用户可以添加一个 RSS
用户可以手动刷新 RSS
系统能保存文章
用户可以浏览文章
用户可以点击 AI 总结
用户可以在右侧 AI 面板围绕文章提问
AI 回答可以流式展示
```

只要做到这些，产品就已经不是空壳。

---

## 19. 最终开发顺序

推荐顺序：

```text
1. 项目骨架
2. 数据库连接
3. 用户认证
4. Source Registry
5. RSS Fetcher
6. 文章列表与详情
7. AI 单篇总结
8. AI Chat SSE
9. pgvector RAG
10. 关键词筛选
11. 平台源 fetcher
12. 趋势简报
13. 通知系统
```

不要反过来。  
不要在文章还不能抓的时候先做趋势分析。  
不要在 AI 总结还不能用的时候先做通知推送。  
不要在用户系统还没隔离时先做 RAG。

---

## 20. 一句话原则

```text
先做最小信息闭环，再做 AI 增强，再做趋势分析，最后做推送和平台化。
```

项目第一阶段最重要的不是“功能多”，而是这条链路稳定：

```text
Source
→ Fetch
→ Normalize
→ Store
→ Display
→ Summarize
→ Ask
→ Answer with source
```

只要这条链路跑通，后续所有模块才有意义。
