import latest from "@/public/data/latest.json";
import dates from "@/public/data/dates.json";
import { demoDigest } from "./demo-data";
import type { Digest } from "./types";

export function getStaticDigest() {
  const candidate = latest as Partial<Digest>;
  return candidate.items?.length ? candidate as Digest : demoDigest;
}

export function getStaticDates() {
  return dates.length ? dates as string[] : [demoDigest.date];
}
