import { readFileSync } from "node:fs";
import path from "node:path";
import { demoDigest } from "./demo-data";
import type { Digest } from "./types";

function datesFromDisk() {
  try { return JSON.parse(readFileSync(path.join(process.cwd(), "public/data/dates.json"), "utf8")) as string[]; }
  catch { return []; }
}

export function getStaticDigest() {
  const date = datesFromDisk()[0];
  if (!date) return demoDigest;
  try { return JSON.parse(readFileSync(path.join(process.cwd(), `public/data/${date}.json`), "utf8")) as Digest; }
  catch { return demoDigest; }
}

export function getStaticDates() {
  const dates = datesFromDisk();
  return dates.length ? dates : [demoDigest.date];
}
