import type { FatigueCurve } from "@/components/charts/power-curve-chart";

/** Ruimte rond de gekozen arbeid waarbinnen curves vergelijkbaar heten. */
const TOLERANCE = 0.25;

/**
 * Elk lid stelt zijn eigen kJ-drempels in intervals.icu in (after_kj0/kj1),
 * dus vergelijken we met de dichtstbijzijnde drempel binnen de tolerantie.
 * Geen curve rond die arbeid → geen vergelijking in die stand.
 */
export function matchFatigueCurve(
  curves: FatigueCurve[] | undefined,
  afterKj: number,
): FatigueCurve | null {
  if (afterKj <= 0) return null;
  return (curves ?? []).reduce<FatigueCurve | null>((best, curve) => {
    if (Math.abs(curve.afterKj - afterKj) > afterKj * TOLERANCE) return best;
    if (!best) return curve;
    return Math.abs(curve.afterKj - afterKj) < Math.abs(best.afterKj - afterKj) ? curve : best;
  }, null);
}
