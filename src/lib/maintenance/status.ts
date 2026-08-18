// Gedeelde slijtage-statusberekening voor pagina en dashboardblok.
//
// Twee maten sinds Mijn garage: kilometers (aandrijving, banden, blokken) en
// maanden (remvloeistof, kabels, vering, stuurlint). Beide leveren hetzelfde
// percentage op, zodat de balk en de meldingen er niets van hoeven te weten.

import type { WearMetric } from "./component-types";

export type WearStatus = "ok" | "soon" | "due";

export function wearStatus(pct: number): WearStatus {
  if (pct >= 1) return "due";
  if (pct >= 0.8) return "soon";
  return "ok";
}

/** worn km t.o.v. drempel. pct kan > 1 zijn (over de drempel heen). */
export function wearPct(
  bikeDistanceM: number,
  baselineDistanceM: number,
  thresholdKm: number,
): { wornKm: number; pct: number } {
  const wornKm = Math.max(0, (bikeDistanceM - baselineDistanceM) / 1000);
  const pct = thresholdKm > 0 ? wornKm / thresholdKm : 0;
  return { wornKm, pct };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 365.25 / 12;

/** Verstreken maanden sinds de peildatum, met een decimaal. */
export function monthsSince(since: string | Date | null, now: Date = new Date()): number {
  if (!since) return 0;
  const start = typeof since === "string" ? new Date(since) : since;
  if (Number.isNaN(start.getTime())) return 0;
  const days = (now.getTime() - start.getTime()) / MS_PER_DAY;
  return Math.max(0, days / DAYS_PER_MONTH);
}

export type WearProgress = {
  metric: WearMetric;
  /** Verbruikt: kilometers of maanden, afhankelijk van de maat. */
  worn: number;
  pct: number;
};

/**
 * Eén ingang voor beide maten. `since` is installed_at, of replaced_at nadat
 * een onderdeel vervangen is; ontbreekt die datum bij een maandelijks onderdeel,
 * dan staat de teller op nul in plaats van dat we een datum verzinnen.
 */
export function wearProgress(input: {
  metric: WearMetric;
  threshold: number;
  bikeDistanceM?: number;
  baselineDistanceM?: number;
  since?: string | Date | null;
  now?: Date;
}): WearProgress {
  if (input.metric === "months") {
    const worn = monthsSince(input.since ?? null, input.now);
    return {
      metric: "months",
      worn,
      pct: input.threshold > 0 ? worn / input.threshold : 0,
    };
  }
  const { wornKm, pct } = wearPct(
    input.bikeDistanceM ?? 0,
    input.baselineDistanceM ?? 0,
    input.threshold,
  );
  return { metric: "km", worn: wornKm, pct };
}

/** "1.234 km" of "7 maanden", voor de tekst onder de balk. */
export function formatWear(metric: WearMetric, value: number): string {
  if (metric === "months") {
    const rounded = Math.round(value);
    return `${rounded} ${rounded === 1 ? "maand" : "maanden"}`;
  }
  return `${Math.round(value).toLocaleString("nl-NL")} km`;
}
