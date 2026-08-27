import type { Digest, NewsItem, Topic } from "./types";

const topics: Topic[] = [
  "公共数据治理", "人口老龄化与养老服务", "基层治理与数字技术", "教育公平",
  "平台治理/算法治理", "人工智能公共治理", "未成年人保护", "重大公共事件",
  "人工智能公共治理", "人口老龄化与养老服务",
];

const demoTitles = [
  "公共数据授权运营如何兼顾利用效率与安全边界",
  "养老服务网络建设中的中央统筹与地方执行",
  "数字技术进入基层治理后如何避免重复填报",
  "教育资源配置如何回应城乡与区域差异",
  "平台算法透明度与多部门协同监管",
  "生成式人工智能进入公共服务的责任边界",
  "未成年人网络保护中的平台责任与家庭支持",
  "重大公共事件中的信息公开与跨部门协同",
  "海外公共部门采用人工智能的风险治理框架",
  "国际组织关注老龄化社会的长期照护能力",
];

function analysis(topic: Topic) {
  return {
    problem: `核心不是单纯增加投入，而是如何围绕“${topic}”形成职责清楚、供需匹配且可持续的公共服务安排。`,
    stakeholders: "中央与地方政府、具体执行部门、服务机构、平台企业、基层工作人员以及直接受到政策影响的公众。",
    mechanism: "上级制定目标和规则，地方结合资源条件执行；信息、财政激励和考核方式共同影响基层行为与政策可及性。",
    tools: "以法规和标准明确底线，配合财政支持、公共服务供给、信息公开、试点示范和社会协同，避免只依赖单一行政命令。",
    metrics: "可关注覆盖率、实际使用率、办理时间、地区与群体差距、公众满意度，以及投诉和安全事件数量。",
    risks: "需警惕部门目标不一致、基层负担增加、数字鸿沟、数据滥用，以及短期指标替代长期公共价值。",
    oralTip: "作答时先说明问题为何是公共问题，再讲政府如何协调多方，最后用一项成效指标和一项风险收束。",
  };
}

const today = new Date();
const isoDate = (daysAgo: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

const items: NewsItem[] = demoTitles.map((title, index) => ({
  id: `demo-${index + 1}`,
  title,
  source: index < 8 ? "演示来源 · 上线后替换为权威原文" : "演示来源 · 国际组织",
  sourceUrl: index < 8 ? "https://www.gov.cn/" : "https://www.oecd.org/",
  publishedAt: isoDate(index % 6),
  summary: "这是用于验证页面布局、筛选和口述结构的演示摘要，不代表真实新闻。配置搜索、模型与数据库密钥后，将自动替换为可核验的最近七日内容。",
  region: index < 8 ? "国内" : "海外",
  topic: topics[index],
  isFollowUp: false,
  analysis: analysis(topics[index]),
}));

export const demoDigest: Digest = {
  date: isoDate(0),
  generatedAt: new Date().toISOString(),
  status: "published",
  items,
  isDemo: true,
};
