// Gedeelde slijtage-statusberekening voor pagina en dashboardblok.

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
