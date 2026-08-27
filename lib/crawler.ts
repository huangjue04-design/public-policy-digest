import * as cheerio from "cheerio";
import { OFFICIAL_SOURCES, PRIORITY_TERMS, type OfficialSource } from "./official-sources";
import { isTrustedUrl, normalizedUrl } from "./sources";

export interface Candidate {
  candidateId: string;
  title: string;
  url: string;
  source: string;
  region: "国内" | "海外";
  publishedAt: string;
  content: string;
  priorityScore: number;
}

const USER_AGENT = "PublicPolicyDigest/1.0 (personal study; contact via repository)";

async function fetchText(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/json" }, signal: AbortSignal.timeout(20_000), redirect: "follow" });
  if (!response.ok) throw new Error(`${url} 返回 ${response.status}`);
  return response.text();
}

function clean(value: string) { return value.replace(/\s+/g, " ").trim(); }
function recentCutoff() { const date = new Date(); date.setDate(date.getDate() - 7); return date.toISOString().slice(0, 10); }

function dateFrom(value: string) {
  const patterns = [/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/, /t(20\d{2})(\d{2})(\d{2})/, /\/(20\d{2})(\d{2})(\d{2})\//];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }
  return "";
}

function score(title: string) {
  const lower = title.toLowerCase();
  return PRIORITY_TERMS.reduce((total, term) => total + (lower.includes(term.toLowerCase()) ? 3 : 0), 0);
}

async function discoverJson(source: OfficialSource) {
  const rows = JSON.parse(await fetchText(source.indexUrl)) as Array<{ TITLE: string; URL: string; DOCRELPUBTIME: string }>;
  return rows.slice(0, source.limit).map((row) => ({ title: clean(row.TITLE), url: row.URL, publishedAt: row.DOCRELPUBTIME }));
}

async function discoverRss(source: OfficialSource) {
  const $ = cheerio.load(await fetchText(source.indexUrl), { xmlMode: true });
  return $("item").toArray().map((element) => {
    const item = $(element);
    const rawDate = clean(item.find("pubDate, published, dc\\:date").first().text());
    const parsed = new Date(rawDate);
    return {
      title: clean(item.find("title").first().text()),
      url: clean(item.find("link").first().text() || item.find("guid").first().text()),
      publishedAt: Number.isNaN(parsed.getTime()) ? dateFrom(rawDate) : parsed.toISOString().slice(0, 10),
      content: clean(item.find("description, content\\:encoded").first().text()),
    };
  }).filter((item) => item.title.length >= 8 && item.url && item.publishedAt >= recentCutoff()).slice(0, source.limit);
}

async function discoverHtml(source: OfficialSource) {
  const $ = cheerio.load(await fetchText(source.indexUrl));
  const found = new Map<string, { title: string; url: string; publishedAt: string }>();
  $("a[href]").each((_, element) => {
    const anchor = $(element);
    const title = clean(anchor.attr("title") || anchor.text());
    if (title.length < 8 || title.length > 160) return;
    let url: string;
    try { url = new URL(anchor.attr("href")!, source.indexUrl).toString(); } catch { return; }
    if (!isTrustedUrl(url)) return;
    const nearby = clean(anchor.closest("li, article, tr, div").text()).slice(-240);
    const publishedAt = dateFrom(`${url} ${nearby}`);
    if (!publishedAt || publishedAt < recentCutoff()) return;
    found.set(normalizedUrl(url), { title, url: normalizedUrl(url), publishedAt });
  });
  return [...found.values()].slice(0, source.limit);
}

async function articleContent(url: string) {
  try {
    const $ = cheerio.load(await fetchText(url));
    $("script,style,nav,header,footer,aside,noscript").remove();
    const root = $("article, .article, .content, .TRS_Editor, #UCAP-CONTENT, main").first();
    return clean((root.length ? root : $("body")).text()).slice(0, 5000);
  } catch { return ""; }
}

export async function crawlOfficialSources() {
  const discovered = (await Promise.all(OFFICIAL_SOURCES.map(async (source) => {
    try {
      const rows = source.kind === "gov-json" ? await discoverJson(source) : source.kind === "rss" ? await discoverRss(source) : await discoverHtml(source);
      return rows.map((row) => ({ ...row, source: source.name, region: source.region }));
    } catch (error) {
      console.warn(`[跳过来源] ${source.name}:`, error instanceof Error ? error.message : error);
      return [];
    }
  }))).flat();

  const unique = [...new Map(discovered.map((item) => [item.url, item])).values()]
    .filter((item) => item.publishedAt >= recentCutoff())
    .sort((a, b) => score(b.title) - score(a.title) || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 45);

  const output: Candidate[] = [];
  for (let index = 0; index < unique.length; index += 6) {
    const batch = unique.slice(index, index + 6);
    const contents = await Promise.all(batch.map((item) => articleContent(item.url)));
    batch.forEach((item, offset) => {
      const rssContent = "content" in item && typeof item.content === "string" ? item.content : "";
      const content = contents[offset].length >= 120 ? contents[offset] : rssContent;
      if (content.length >= 120) output.push({ ...item, candidateId: `c${index + offset + 1}`, content, priorityScore: score(`${item.title} ${content.slice(0, 500)}`) });
    });
  }
  return output;
}
