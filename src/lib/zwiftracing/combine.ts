// Onze sterkte op vermogen combineren met een rating van ZwiftRacing. Puur.
//
// Terugtoets op vijf ladderraces (9–11 november 2026, verwachting van vóór de
// start uit 0308; docs/zwiftracing-events-onderzoek-2026-11-12.md): Spearman met
// de uitslag gemiddeld 0,54 voor onze verwachting (wat iemand kan trappen),
// 0,58 voor vELO1 (wat iemand er in races mee haalt), 0,70 voor beide samen.
// vELO2 op het parcours samen met de onze gaf 0,61; daarom vELO1.

/** Zo'n deel van wie een sterkte heeft, moet ook de rating hebben (zoals het racebriefje). */
export const MIN_RATING_COVERAGE = 0.7;
/** Minder renners dan dit met een waarde: geen spreiding om op te schalen. */
const MIN_FOR_SCALE = 3;

export type RatingBasis = "power" | "velo" | "combined";

function zScores(values: Map<number, number>): Map<number, number> {
  const list = [...values.values()];
  const mean = list.reduce((a, b) => a + b, 0) / list.length;
  const sd = Math.sqrt(list.reduce((a, b) => a + (b - mean) ** 2, 0) / list.length);
  return new Map([...values].map(([id, value]) => [id, sd > 0 ? (value - mean) / sd : 0]));
}

/**
 * Onze sterkte (positief, hoger is sterker, zoals `routeRatings`) samen met een
 * rating van ZwiftRacing. Beide als z-score over de renners van deze race,
 * gemiddeld over wat er per renner is, en terug als exp(): positief, en log()
 * geeft weer de z-score. Heeft minder dan 70 % een rating, dan blijft het onze
 * sterkte, ongewijzigd.
 */
export function combineRatings(
  rows: Array<{ zwiftId: number; power: number | null; velo: number | null }>,
): { ratings: Map<number, number | null>; basis: RatingBasis } {
  const power = new Map(rows.filter((r) => r.power != null && r.power > 0).map((r) => [r.zwiftId, Math.log(r.power!)]));
  const velo = new Map(rows.filter((r) => r.velo != null && r.velo > 0).map((r) => [r.zwiftId, r.velo!]));
  const known = rows.filter((r) => power.has(r.zwiftId) || velo.has(r.zwiftId)).length;
  if (velo.size < MIN_FOR_SCALE || velo.size / Math.max(known, 1) < MIN_RATING_COVERAGE) {
    return { ratings: new Map(rows.map((r) => [r.zwiftId, power.has(r.zwiftId) ? r.power : null] as const)), basis: "power" };
  }
  const zVelo = zScores(velo);
  const zPower = power.size >= MIN_FOR_SCALE ? zScores(power) : new Map<number, number>();
  const ratings = new Map<number, number | null>();
  for (const row of rows) {
    const parts = [zPower.get(row.zwiftId), zVelo.get(row.zwiftId)].filter((v): v is number => v !== undefined);
    ratings.set(row.zwiftId, parts.length ? Math.exp(parts.reduce((a, b) => a + b, 0) / parts.length) : null);
  }
  return { ratings, basis: zPower.size ? "combined" : "velo" };
}
