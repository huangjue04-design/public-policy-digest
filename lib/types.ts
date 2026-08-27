export const TOPICS = [
  "全部",
  "人口老龄化与养老服务",
  "基层治理与数字技术",
  "教育公平",
  "平台治理/算法治理",
  "人工智能公共治理",
  "未成年人保护",
  "公共数据治理",
  "重大公共事件",
] as const;

export type Topic = Exclude<(typeof TOPICS)[number], "全部">;
export type Region = "国内" | "海外";

export interface PolicyAnalysis {
  problem: string;
  stakeholders: string;
  mechanism: string;
  tools: string;
  metrics: string;
  risks: string;
  oralTip: string;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  summary: string;
  region: Region;
  topic: Topic;
  isFollowUp: boolean;
  analysis: PolicyAnalysis;
}

export interface Digest {
  date: string;
  generatedAt: string;
  status: "published" | "updating" | "failed";
  items: NewsItem[];
  isDemo?: boolean;
}
