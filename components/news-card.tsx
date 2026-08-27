"use client";

import { useState } from "react";
import type { NewsItem } from "@/lib/types";
import { ChevronDown, ExternalLink } from "./icons";

const sections: Array<[keyof NewsItem["analysis"], string]> = [
  ["problem", "问题界定"], ["stakeholders", "利益相关者"], ["mechanism", "作用机制"],
  ["tools", "政策工具组合"], ["metrics", "评估指标"], ["risks", "风险"],
];

export function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const [open, setOpen] = useState(true);
  return (
    <article className="news-card">
      <div className="card-topline">
        <span className="item-index">{String(index + 1).padStart(2, "0")}</span>
        <div className="tags"><span>{item.region}</span><span>{item.topic}</span>{item.isFollowUp && <span>后续进展</span>}</div>
      </div>
      <h2>{item.title}</h2>
      <div className="meta"><span>{item.source}</span><span aria-hidden="true">·</span><time dateTime={item.publishedAt}>{item.publishedAt}</time></div>
      <p className="summary">{item.summary}</p>
      <a className="source-link" href={item.sourceUrl} target="_blank" rel="noreferrer">
        查看权威原文 <ExternalLink size={15} aria-hidden="true" />
      </a>
      <div className="analysis-wrap">
        <button className="analysis-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          <span>公共管理分析</span><span className="toggle-hint">{open ? "收起" : "展开"}<ChevronDown size={17} className={open ? "rotated" : ""} /></span>
        </button>
        {open && <div className="analysis-content">
          <div className="analysis-grid">{sections.map(([key, label]) => <section key={key}><h3>{label}</h3><p>{item.analysis[key]}</p></section>)}</div>
          <div className="oral-tip"><span>口述提示</span><p>{item.analysis.oralTip}</p></div>
        </div>}
      </div>
    </article>
  );
}
