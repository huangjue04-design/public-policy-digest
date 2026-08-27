import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { crawlOfficialSources, type Candidate } from "../lib/crawler";
import { fingerprint } from "../lib/sources";
import type { Digest, NewsItem } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const Topic = z.enum([
  "人口老龄化与养老服务", "基层治理与数字技术", "教育公平", "平台治理/算法治理",
  "人工智能公共治理", "未成年人保护", "公共数据治理", "重大公共事件",
]);
const Selection = z.object({ items: z.array(z.object({
  candidateId: z.string(), topic: Topic, isFollowUp: z.boolean().default(false), summary: z.string().min(40),
  analysis: z.object({ problem: z.string(), stakeholders: z.string(), mechanism: z.string(), tools: z.string(), metrics: z.string(), risks: z.string(), oralTip: z.string() }),
})) });

function today() { return new Date().toISOString().slice(0, 10); }
function weekStart() { const date = new Date(); const day = date.getUTCDay() || 7; date.setUTCDate(date.getUTCDate() - day + 1); return date.toISOString().slice(0, 10); }

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await readFile(file, "utf8")) as T; } catch { return fallback; }
}

async function weeklyFingerprints() {
  const dates = await readJson<string[]>(path.join(DATA_DIR, "dates.json"), []);
  const ids = new Set<string>();
  for (const date of dates.filter((value) => value >= weekStart())) {
    const digest = await readJson<Digest | null>(path.join(DATA_DIR, `${date}.json`), null);
    digest?.items.forEach((item) => ids.add(item.id));
  }
  return ids;
}

function parseModelJson(text: string) {
  return JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
}

async function askDeepSeek(candidates: Candidate[]) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY 未配置");
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const compact = candidates.map(({ candidateId, title, source, region, publishedAt, content, priorityScore }) => ({ candidateId, title, source, region, publishedAt, priorityScore, evidence: content.slice(0, 1800) }));
  const prompt = `你是公共管理研究生面试辅导员。请从候选中选择恰好10条：国内8条、海外2条。优先养老服务、基层治理与数字技术、教育公平、平台/算法治理、人工智能公共治理、未成年人保护、公共数据治理，同时不得遗漏候选中的重大公共事件。\n\n硬性规则：\n1. 只能返回现有candidateId，不得创造新闻、链接、日期、数字或机构表态。\n2. 同一事件最多一条。\n3. summary为80-140字，只概括evidence中可确认的事实。\n4. 每条按公共管理视角生成problem、stakeholders、mechanism、tools、metrics、risks、oralTip；总计350-550字，适合社会学本科生3-5分钟口述。\n5. topic只能取：人口老龄化与养老服务、基层治理与数字技术、教育公平、平台治理/算法治理、人工智能公共治理、未成年人保护、公共数据治理、重大公共事件。\n6. 只输出JSON对象 {"items":[...]}。\n\n候选：${JSON.stringify(compact)}`;
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.DEEPSEEK_MODEL || "deepseek-chat", temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: "严格依据提供材料输出可校验JSON。" }, { role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`DeepSeek 返回 ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const payload = await response.json();
  return Selection.parse(parseModelJson(payload.choices?.[0]?.message?.content || ""));
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const prior = await weeklyFingerprints();
  const crawled = (await crawlOfficialSources()).filter((item) => !prior.has(fingerprint(item.title, item.url)));
  const domestic = crawled.filter((item) => item.region === "国内").slice(0, 24);
  const overseas = crawled.filter((item) => item.region === "海外").slice(0, 10);
  if (domestic.length < 8 || overseas.length < 2) throw new Error(`候选不足：国内${domestic.length}条、海外${overseas.length}条；保留上一期`);

  const candidates = [...domestic, ...overseas];
  const byId = new Map(candidates.map((item) => [item.candidateId, item]));
  const selection = await askDeepSeek(candidates);
  if (selection.items.length !== 10 || new Set(selection.items.map((item) => item.candidateId)).size !== 10) throw new Error("模型未返回10个不重复候选");

  const items: NewsItem[] = selection.items.map((selected) => {
    const source = byId.get(selected.candidateId);
    if (!source) throw new Error(`模型返回未知候选 ${selected.candidateId}`);
    return { id: fingerprint(source.title, source.url), title: source.title, source: source.source, sourceUrl: source.url, publishedAt: source.publishedAt, region: source.region, topic: selected.topic, isFollowUp: selected.isFollowUp, summary: selected.summary, analysis: selected.analysis };
  });
  if (items.filter((item) => item.region === "国内").length !== 8 || items.filter((item) => item.region === "海外").length !== 2) throw new Error("模型返回的地区配比不符合8:2");

  const digest: Digest = { date: today(), generatedAt: new Date().toISOString(), status: "published", items };
  const dates = await readJson<string[]>(path.join(DATA_DIR, "dates.json"), []);
  const nextDates = [digest.date, ...dates.filter((date) => date !== digest.date)].slice(0, 30);
  await writeFile(path.join(DATA_DIR, `${digest.date}.json`), `${JSON.stringify(digest, null, 2)}\n`);
  await writeFile(path.join(DATA_DIR, "latest.json"), `${JSON.stringify(digest, null, 2)}\n`);
  await writeFile(path.join(DATA_DIR, "dates.json"), `${JSON.stringify(nextDates, null, 2)}\n`);
  console.log(`已发布 ${digest.date}：国内8条，海外2条`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
