import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const Topic = z.enum([
  "人口老龄化与养老服务", "基层治理与数字技术", "教育公平", "平台治理/算法治理",
  "人工智能公共治理", "未成年人保护", "公共数据治理", "重大公共事件",
]);
const Analysis = z.object({
  problem: z.string().min(8), stakeholders: z.string().min(8), mechanism: z.string().min(8),
  tools: z.string().min(8), metrics: z.string().min(8), risks: z.string().min(8), oralTip: z.string().min(8),
});
const Item = z.object({
  id: z.string().min(4), title: z.string().min(8), source: z.string().min(2), sourceUrl: z.string().url(),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), summary: z.string().min(40),
  region: z.enum(["国内", "海外"]), topic: Topic, isFollowUp: z.boolean(), analysis: Analysis,
});
const Digest = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), generatedAt: z.string().datetime(),
  status: z.literal("published"), items: z.array(Item).length(10), isDemo: z.boolean().optional(),
});
const DATA_DIR = path.join(process.cwd(), "public", "data");

async function json(file: string) { return JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8")); }
function daysBetween(a: string, b: string) { return Math.floor((Date.parse(a) - Date.parse(b)) / 86_400_000); }
function weekKey(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

async function main() {
  const dates = z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(30).parse(await json("dates.json"));
  if (!dates.length) {
    console.log("尚无正式简报，网页将显示演示数据");
    return;
  }
  if (new Set(dates).size !== dates.length) throw new Error("dates.json 存在重复日期");
  const latest = Digest.parse(await json("latest.json"));
  if (latest.date !== dates[0]) throw new Error("latest.json 日期必须等于 dates.json 第一项");
  const weeklyIds = new Map<string, Set<string>>();
  for (const date of dates) {
    const digest = Digest.parse(await json(`${date}.json`));
    if (digest.date !== date) throw new Error(`${date}.json 内部日期不一致`);
    const domestic = digest.items.filter((item) => item.region === "国内").length;
    if (domestic < 7 || domestic > 8) throw new Error(`${date} 国内内容必须为7或8条`);
    const ids = weeklyIds.get(weekKey(date)) ?? new Set<string>();
    for (const item of digest.items) {
      const age = daysBetween(digest.date, item.publishedAt);
      if (age < 0 || age > 7) throw new Error(`${item.title} 不在生成日前7天内`);
      if (!item.sourceUrl.startsWith("https://") && !item.sourceUrl.startsWith("http://")) throw new Error(`${item.title} 缺少直达原文链接`);
      if (ids.has(item.id) && !item.isFollowUp) throw new Error(`本周重复事件：${item.title}`);
      ids.add(item.id);
    }
    weeklyIds.set(weekKey(date), ids);
  }
  console.log(`校验通过：${dates.length}期，最新一期${latest.items.length}条`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
