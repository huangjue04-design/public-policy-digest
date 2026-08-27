"use client";

import { useMemo, useState } from "react";
import type { Digest, Region } from "@/lib/types";
import { TOPICS } from "@/lib/types";
import { NewsCard } from "./news-card";
import { BookOpen, CalendarDays, History, Search, ShieldCheck } from "./icons";

export function DigestView({ digest: initialDigest, dates }: { digest: Digest; dates: string[] }) {
  const [digest, setDigest] = useState(initialDigest);
  const [historyState, setHistoryState] = useState<"idle" | "loading" | "error">("idle");
  const [region, setRegion] = useState<"全部" | Region>("全部");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("全部");
  const [query, setQuery] = useState("");
  const items = useMemo(() => digest.items.filter((item) =>
    (region === "全部" || item.region === region) && (topic === "全部" || item.topic === topic) &&
    (!query || `${item.title}${item.summary}${item.topic}`.toLowerCase().includes(query.toLowerCase()))
  ), [digest.items, query, region, topic]);

  async function openDigest(date: string) {
    if (date === digest.date) return;
    setHistoryState("loading");
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/data/${date}.json`);
      if (!response.ok) throw new Error("not found");
      setDigest(await response.json());
      setRegion("全部"); setTopic("全部"); setQuery(""); setHistoryState("idle");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { setHistoryState("error"); }
  }

  return <>
    <header className="site-header"><div className="header-inner">
      <a className="brand" href="/" aria-label="公共管理热点首页"><span className="brand-mark"><BookOpen size={19} /></span><span>公共管理热点</span></a>
      <a className="history-link" href="#history"><History size={16} /> 历史</a>
    </div></header>
    <main>
      <section className="hero">
        <div className="eyebrow"><span /> 每日面试复习</div>
        <h1>今天值得关注的<br className="mobile-break" />公共政策议题</h1>
        <p>从权威来源中筛选最近七日热点，用公共管理框架帮助你快速形成一段完整回答。</p>
        <div className="digest-meta"><span><CalendarDays size={16} />{digest.date}</span><span><ShieldCheck size={16} />10 条精选</span><span>约 30 分钟</span></div>
      </section>

      {digest.isDemo && <div className="demo-banner"><strong>当前为演示模式</strong><span>页面内容用于验证体验；配置环境变量并运行每日任务后，将替换为真实、可溯源新闻。</span></div>}

      <section className="filters" aria-label="热点筛选">
        <div className="region-tabs">{(["全部", "国内", "海外"] as const).map((value) => <button key={value} className={region === value ? "active" : ""} onClick={() => setRegion(value)}>{value}{value !== "全部" && <span>{digest.items.filter((item) => item.region === value).length}</span>}</button>)}</div>
        <label className="search-box"><Search size={17} /><span className="sr-only">搜索热点</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索议题" /></label>
        <div className="topic-row">{TOPICS.map((value) => <button key={value} className={topic === value ? "active" : ""} onClick={() => setTopic(value)}>{value}</button>)}</div>
      </section>

      <section className="results-head"><div><span>今日简报</span><small>{items.length} 条结果</small></div><p>分析默认展开，复习后可收起</p></section>
      <section className="news-list" aria-live="polite">{items.map((item, index) => <NewsCard key={item.id} item={item} index={index} />)}{items.length === 0 && <div className="empty"><Search size={22} /><h2>没有匹配的议题</h2><p>试试减少筛选条件或更换关键词。</p></div>}</section>

      <section id="history" className="history-section"><div><h2>往期简报</h2><p>{historyState === "loading" ? "正在读取…" : historyState === "error" ? "读取失败，请稍后重试。" : "保留最近 30 期，便于按日期回顾。"}</p></div><div className="date-list">{dates.map((date) => <button key={date} disabled={historyState === "loading"} onClick={() => openDigest(date)}>{date}</button>)}</div></section>
    </main>
    <footer><span>公共管理热点 · 面试复习工具</span><span>分析仅作学习参考，请以原文为准</span></footer>
  </>;
}
