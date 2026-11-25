// Doeldag: wie een pacingplan maakt, maakt dat voor een dag die ertoe doet.
//
// CP, W′ en de vermogenscurve komen uit wat een lid de afgelopen maanden reed,
// meestal niet uitgerust en zonder alles erop te zetten. Een plan dat nooit boven
// die lijn uitkomt, maakt een record per definitie onhaalbaar. Op een doeldag
// (taper, focus, de race zelf) ligt er daarom een kleine opslag op.
//
// Waarom 3 %: in de clubraces van het jaar tot 2026-11-25 ging de eFTP van
// intervals.icu in 9,9 % van de races omhoog, in de mediaan met 1,9 % en op het
// 90e percentiel met 6,4 %. De vorm (CTL tegen ATL) voorspelde dat niet, dus de
// opslag hangt er niet aan. Een taper geeft een matige verbetering op de tijdrit
// (Wang 2023). Zie docs/pacingplan-race-analyse-2026-11-25.md, voorstel 4.
//
// De keuze hoort bij het plan (PlanAssumptions.targetDayPct). Standaard aan.

import type { CurvePoint } from "@/lib/pacing/cp";
import type { RiderContext } from "@/lib/pacing/draft";
import type { PlanAssumptions } from "@/lib/pacing/staleness";

export const TARGET_DAY_PCT = 3;

export type TargetDay = {
  pct: number;
  /** CP, W′ en curve zonder opslag, zoals gemeten. */
  baseCpWatts: number;
  baseWPrimeJoules: number;
  baseCurve: CurvePoint[] | null;
};

/** Staat de doeldag aan voor dit plan? Een plan zonder keuze krijgt hem. */
export function targetDayChosen(assumptions: PlanAssumptions | null | undefined): boolean {
  const pct = assumptions?.targetDayPct;
  return pct == null ? true : pct > 0;
}

/** De opslag waarmee dit plan is doorgerekend; 0 voor een plan van vóór de doeldag. */
export function targetDayComputedPct(assumptions: PlanAssumptions | null | undefined): number {
  return assumptions?.targetDayPct ?? 0;
}

/** De renner zonder opslag. */
function withoutTargetDay(rider: RiderContext): RiderContext {
  const day = rider.targetDay;
  if (!day) return rider;
  return {
    ...rider,
    model: { ...rider.model, cpWatts: day.baseCpWatts, wPrimeJoules: day.baseWPrimeJoules },
    curve: day.baseCurve,
    targetDay: null,
  };
}

/**
 * Legt de opslag op CP, W′ en de gemeten curve. De curve hoort erbij: het plafond
 * per duur is het minimum van model en curve, en zonder ophogen zou de curve de
 * opslag meteen weer wegnemen. De vermoeidheid blijft een factor op CP.
 */
export function applyTargetDay(rider: RiderContext, on: boolean): RiderContext {
  const base = withoutTargetDay(rider);
  if (!on) return base;

  const factor = 1 + TARGET_DAY_PCT / 100;
  return {
    ...base,
    model: {
      ...base.model,
      cpWatts: Math.round(base.model.cpWatts * factor),
      wPrimeJoules: Math.round(base.model.wPrimeJoules * factor),
    },
    curve: base.curve?.map((point) => ({ ...point, watts: point.watts * factor })) ?? null,
    targetDay: {
      pct: TARGET_DAY_PCT,
      baseCpWatts: base.model.cpWatts,
      baseWPrimeJoules: base.model.wPrimeJoules,
      baseCurve: base.curve,
    },
  };
}
