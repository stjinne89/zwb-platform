import type { IntervalsWellness } from "@/lib/intervals/client";

export type TrainingLoadPoint = {
  date: string;
  load: number | null;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
};

function finiteNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Wellness-rijen uit intervals.icu omzetten naar punten voor de belastinggrafiek.
 * Oudste eerst; TSB wordt afgeleid als intervals hem niet meelevert.
 */
export function toTrainingLoadPoints(rows: IntervalsWellness[]): TrainingLoadPoint[] {
  return [...rows]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((row) => {
      const ctl = finiteNumber(row.ctl);
      const atl = finiteNumber(row.atl);
      return {
        date: row.id,
        load: finiteNumber(row.ctl_load ?? row.atl_load),
        ctl,
        atl,
        tsb: ctl != null && atl != null ? ctl - atl : null,
      };
    });
}
