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
const SelectionItem = z.object({
  candidateId: z.string().min(1),
  topic: Topic,
  isFollowUp: z.boolean().default(false),
});
const Selection = z.object({ items: z.array(SelectionItem).length(10) });
const Analysis = z.object({
  summary: z.string().min(40).max(260),
  analysis: z.object({
    problem: z.string().min(10),
    stakeholders: z.string().min(10),
    mechanism: z.string().min(10),
    tools: z.string().min(10),
    metrics: z.string().min(10),
    risks: z.string().min(10),
    oralTip: z.string().min(10),
  }),
});

const MAX_MODEL_ATTEMPTS = 3;

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
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("响应中没有完整 JSON 对象");
  return JSON.parse(stripped.slice(start, end + 1));
}

function errorSummary(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.slice(0, 8).map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("；");
  }
  return error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
}

function retryableStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function callDeepSeekJson<T>(label: string, prompt: string, schema: z.ZodType<T>, validate?: (value: T) => void): Promise<T> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY 未配置");
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  let lastError: unknown;
  let correction = "";

  for (let attempt = 1; attempt <= MAX_MODEL_ATTEMPTS; attempt += 1) {
    try {
      console.log(`[${label}] 第 ${attempt}/${MAX_MODEL_ATTEMPTS} 次调用`);
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
          temperature: attempt === 1 ? 0.2 : 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "严格依据材料输出一个可被 JSON.parse 解析的 JSON 对象，不要输出 Markdown。" },
            { role: "user", content: `${prompt}${correction}` },
          ],
        }),
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        const error = new Error(`DeepSeek 返回 ${response.status}: ${detail}`);
        if (!retryableStatus(response.status)) throw error;
        throw Object.assign(error, { retryable: true });
      }
      const payload = await response.json();
      const value = schema.parse(parseModelJson(payload.choices?.[0]?.message?.content || ""));
      validate?.(value);
      return value;
    } catch (error) {
      lastError = error;
      const summary = errorSummary(error);
      console.warn(`[${label}] 第 ${attempt} 次失败：${summary}`);
      if (attempt === MAX_MODEL_ATTEMPTS || (error instanceof Error && "retryable" in error && error.retryable === false)) break;
      correction = `\n\n上一次输出未通过校验：${summary}。请重新完整输出，并严格保持指定字段名和JSON结构。`;
      await sleep(1_500 * 2 ** (attempt - 1));
    }
  }
  throw new Error(`[${label}] ${MAX_MODEL_ATTEMPTS} 次尝试均失败：${errorSummary(lastError)}`);
}

async function selectTopics(candidates: Candidate[]) {
  const compact = candidates.map(({ candidateId, title, source, region, publishedAt, priorityScore, content }) => ({ candidateId, title, source, region, publishedAt, priorityScore, evidence: content.slice(0, 500) }));
  const prompt = `第一阶段只做选题，不生成摘要或分析。请从候选中选择恰好10条：国内8条、海外2条。优先养老服务、基层治理与数字技术、教育公平、平台/算法治理、人工智能公共治理、未成年人保护、公共数据治理，同时不得遗漏候选中的重大公共事件。\n\n规则：只能使用现有candidateId；同一事件最多一条；topic只能取指定八类；isFollowUp为布尔值。只输出：{"items":[{"candidateId":"c1","topic":"教育公平","isFollowUp":false}]}，items必须恰好10项。\n\n候选：${JSON.stringify(compact)}`;
  const byId = new Map(candidates.map((item) => [item.candidateId, item]));
  return callDeepSeekJson("选题", prompt, Selection, (value) => {
    const ids = value.items.map((item) => item.candidateId);
    if (new Set(ids).size !== 10) throw new Error("candidateId 有重复");
    const selected = ids.map((id) => byId.get(id));
    if (selected.some((item) => !item)) throw new Error("包含未知 candidateId");
    if (selected.filter((item) => item?.region === "国内").length !== 8 || selected.filter((item) => item?.region === "海外").length !== 2) throw new Error("地区配比不是国内8条、海外2条");
  });
}

async function analyzeCandidate(candidate: Candidate, topic: z.infer<typeof Topic>) {
  const prompt = `第二阶段只分析下面这一条已经确定的新闻，不再选题。不得补写证据中没有的数字、机构表态或事实。\n\n标题：${candidate.title}\n来源：${candidate.source}\n发布日期：${candidate.publishedAt}\n主题：${topic}\n原文证据：${candidate.content.slice(0, 5000)}\n\n输出结构必须是：{"summary":"80-140字事实摘要","analysis":{"problem":"问题界定","stakeholders":"利益相关者","mechanism":"作用机制","tools":"政策工具组合","metrics":"评估指标","risks":"风险","oralTip":"口述提示"}}。六维分析和口述提示总计350-550字，每项1-2句，适合社会学本科生3-5分钟口述。`;
  return callDeepSeekJson(`分析 ${candidate.candidateId}`, prompt, Analysis);
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
  const selection = await selectTopics(candidates);
  console.log("选题完成，开始逐条生成分析");
  const items: NewsItem[] = [];
  for (const selected of selection.items) {
    const source = byId.get(selected.candidateId);
    if (!source) throw new Error(`模型返回未知候选 ${selected.candidateId}`);
    const generated = await analyzeCandidate(source, selected.topic);
    items.push({ id: fingerprint(source.title, source.url), title: source.title, source: source.source, sourceUrl: source.url, publishedAt: source.publishedAt, region: source.region, topic: selected.topic, isFollowUp: selected.isFollowUp ?? false, summary: generated.summary, analysis: generated.analysis });
  }
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
