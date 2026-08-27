export interface OfficialSource {
  name: string;
  region: "国内" | "海外";
  indexUrl: string;
  kind: "html" | "gov-json" | "rss";
  limit: number;
}

export const OFFICIAL_SOURCES: OfficialSource[] = [
  { name: "中国政府网", region: "国内", kind: "gov-json", indexUrl: "https://www.gov.cn/zhengce/zuixin/ZUIXINZHENGCE.json", limit: 20 },
  { name: "教育部", region: "国内", kind: "html", indexUrl: "http://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/", limit: 16 },
  { name: "民政部", region: "国内", kind: "html", indexUrl: "https://www.mca.gov.cn/n152/n165/index.html", limit: 16 },
  { name: "新华网", region: "国内", kind: "html", indexUrl: "https://www.news.cn/politics/", limit: 22 },
  { name: "世界卫生组织", region: "海外", kind: "rss", indexUrl: "https://www.who.int/rss-feeds/news-english.xml", limit: 16 },
  { name: "联合国新闻", region: "海外", kind: "rss", indexUrl: "https://news.un.org/feed/subscribe/zh/news/all/rss.xml", limit: 14 },
];

export const PRIORITY_TERMS = [
  "养老", "老龄", "基层", "社区", "数字", "数据", "教育", "公平", "平台", "算法",
  "人工智能", "未成年人", "儿童", "公共服务", "社会治理", "政策", "条例", "改革",
  "ageing", "aging", "artificial intelligence", "governance", "education", "children", "public policy",
];
