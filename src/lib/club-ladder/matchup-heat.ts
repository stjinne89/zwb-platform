// Heatmap in de renners-tabel van de matchup (2026-11-11): per duur een kleur
// van licht (zwakste) naar donker (sterkste), over beide ploegen samen, zodat je
// ziet waar de sprinters en klimmers zitten en welke kant op een duur sterker is.
// Idee van de W/kg-tool op zwbcycling.nl. Licht gehouden: gaat mee naar de browser.

import type { MatchupRider } from "./matchup";
import { riderWatts, type MatchupUnit } from "./matchup-sort";
import { DURATIONS, type PowerWkg } from "./team-power";
import type { PowerDuration } from "./routes";

export type HeatRange = Record<PowerDuration, { min: number; max: number } | null>;

/** Vijf stappen; stap 0 is de zwakste en krijgt geen kleur. */
export const HEAT_STEPS = 5;

/** Achtergrond per stap. De primaire kleur: petrol in licht, goud in donker. */
export const HEAT_CLASS = ["", "bg-primary/10", "bg-primary/20", "bg-primary/30", "bg-primary/40"] as const;

const powerOf = (rider: MatchupRider, unit: MatchupUnit): PowerWkg | null =>
  unit === "w" ? riderWatts(rider.wkg, rider.weightKg) : rider.wkg;

/** Laagste en hoogste waarde per duur over alle renners; null onder twee verschillende waarden. */
export function heatRange(riders: MatchupRider[], unit: MatchupUnit): HeatRange {
  const out = {} as HeatRange;
  for (const d of DURATIONS) {
    const values = riders
      .map((rider) => powerOf(rider, unit)?.[d])
      .filter((value): value is number => value != null && Number.isFinite(value) && value > 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    out[d] = values.length >= 2 && max > min ? { min, max } : null;
  }
  return out;
}

/** De schaal in beide eenheden, zodat de schakelaar Watt/W-kg geen renners naar de browser hoeft. */
export type MatchupHeat = Record<MatchupUnit, HeatRange>;

export function matchupHeat(riders: MatchupRider[]): MatchupHeat {
  return { w: heatRange(riders, "w"), wkg: heatRange(riders, "wkg") };
}

/** Stap 0 … HEAT_STEPS − 1 voor een waarde, of null zonder waarde of schaal. */
export function heatStep(value: number | null | undefined, range: HeatRange[PowerDuration]): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0 || !range) return null;
  const t = Math.min(1, Math.max(0, (value - range.min) / (range.max - range.min)));
  return Math.round(t * (HEAT_STEPS - 1));
}
