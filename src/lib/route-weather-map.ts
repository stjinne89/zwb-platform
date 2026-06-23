// Mapt een doorkomsttijd op het dichtstbijzijnde forecast-uur. Puur (geen
// netwerk/DOM) zodat de client dit kan herberekenen bij elke slider-wijziging
// zonder her-fetch, en zodat het unit-testbaar is.

import type { HourForecast } from "@/lib/weather";

// Buiten dit venster van het dichtstbijzijnde uur tonen we niets (bv. aankomst
// voorbij de 16-daagse forecast-horizon).
const MAX_DISTANCE_MS = 90 * 60 * 1000;

/** Parse een Open-Meteo UTC-uur ("YYYY-MM-DDTHH:MM", timezone=UTC) naar ms. */
export function parseHourUtc(timeUtc: string): number {
  let s = timeUtc.trim();
  if (/T\d\d:\d\d$/.test(s)) s += ":00";
  if (!/[zZ]|[+-]\d\d:?\d\d$/.test(s)) s += "Z";
  return Date.parse(s);
}

/** Het uur dat het dichtst bij `when` ligt, of null buiten het venster/leeg. */
export function pickHourForTime(hours: HourForecast[], when: Date): HourForecast | null {
  const t = when.getTime();
  if (!Number.isFinite(t) || hours.length === 0) return null;
  let best: HourForecast | null = null;
  let bestDiff = Infinity;
  for (const h of hours) {
    const ht = parseHourUtc(h.timeUtc);
    if (!Number.isFinite(ht)) continue;
    const diff = Math.abs(ht - t);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = h;
    }
  }
  return best && bestDiff <= MAX_DISTANCE_MS ? best : null;
}
