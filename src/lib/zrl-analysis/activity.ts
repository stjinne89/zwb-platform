// Welke intervals.icu-activiteit hoort bij een race? Puur, los van load.ts
// (dat is server-only), zodat het te testen is.

import type { IntervalsActivity } from "@/lib/intervals/client";

/** Een rit telt als de race als hij zo dicht bij de eigen start begon. */
export const RIDE_MATCH_MS = 45 * 60 * 1000;

export type ActivityWithStart = IntervalsActivity & { start_date?: string };

/**
 * Starttijd van een intervals.icu-activiteit. `start_date` is UTC; anders
 * `start_date_local` als Nederlandse tijd.
 */
export function activityStartMs(activity: ActivityWithStart): number | null {
  if (activity.start_date) {
    const utc = Date.parse(activity.start_date.endsWith("Z") ? activity.start_date : `${activity.start_date}Z`);
    if (Number.isFinite(utc)) return utc;
  }
  if (!activity.start_date_local) return null;
  const asUtc = Date.parse(`${activity.start_date_local.slice(0, 19)}Z`);
  if (!Number.isFinite(asUtc)) return null;
  // Verschil tussen UTC en Amsterdam op dat moment (winter- of zomertijd).
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(asUtc);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const shown = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - (shown - asUtc);
}

/** De rit uit de lijst die bij deze start hoort: dichtstbij, en een fietsrit. */
export function pickRaceActivity<T extends ActivityWithStart>(activities: T[], ownStart: number): T | null {
  const rides = activities
    .filter((a) => /ride/i.test(a.type ?? "Ride"))
    .map((a) => ({ a, start: activityStartMs(a) }))
    .filter((x): x is { a: T; start: number } => x.start !== null && Math.abs(x.start - ownStart) <= RIDE_MATCH_MS)
    .sort((x, y) => Math.abs(x.start - ownStart) - Math.abs(y.start - ownStart));
  return rides[0]?.a ?? null;
}
