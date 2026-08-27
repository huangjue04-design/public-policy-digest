export const TRUSTED_DOMAINS = [
  "gov.cn", "news.cn", "xinhuanet.com", "people.com.cn", "cctv.com", "cnr.cn",
  "moe.gov.cn", "mca.gov.cn", "cac.gov.cn", "ndrc.gov.cn", "samr.gov.cn",
  "stats.gov.cn", "nhc.gov.cn", "npc.gov.cn", "court.gov.cn", "procuratorate.gov.cn",
  "un.org", "oecd.org", "who.int", "worldbank.org", "ec.europa.eu", "gov.uk",
  "reuters.com", "apnews.com",
];

export function hostnameOf(rawUrl: string) {
  try { return new URL(rawUrl).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export function isTrustedUrl(url: string) {
  const host = hostnameOf(url);
  return TRUSTED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function normalizedUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  url.hash = "";
  ["utm_source", "utm_medium", "utm_campaign", "spm", "from"].forEach((key) => url.searchParams.delete(key));
  return url.toString().replace(/\/$/, "");
}

export function fingerprint(title: string, url: string) {
  const normalizedTitle = title.toLowerCase().replace(/[\s，。、“”‘’：:；;（）()\-—]/g, "").slice(0, 48);
  return `${hostnameOf(url)}:${normalizedTitle}`;
}
