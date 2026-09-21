// Een plan voor een gewenste eindtijd.
//
// Een lid vroeg: kan het plan uitgaan van de tijd die ik wil rijden? Het plan
// rekende tot september 2026 alleen de andere kant op: vermogen erin, tijd eruit.
//
// De omkering zoekt één vermenigvuldiger op de gewone stukken van een bestaand
// plan, zodat de verhoudingen blijven (de klim harder dan het vlak) en alleen het
// niveau verschuift. Na elke stap gaat het plan door rebalancePlan: wat de renner
// niet kan, gaat eraf. Daardoor loopt de tijd niet eindeloos omlaag met de
// vermenigvuldiger — er is een snelste haalbare tijd, en die zeggen we eerlijk
// als het doel sneller is.
//
// Neutralisaties en afdalingen blijven zoals ze zijn: daar beslist de wagen of
// de zwaartekracht.

import type { CpModel, CurvePoint } from "@/lib/pacing/cp";
import type { DurabilityModel } from "@/lib/pacing/durability";
import {
  isFixedPiece,
  rebalancePlan,
  type PlanEvaluation,
  type PlanSegment,
} from "@/lib/pacing/plan";
import type { PacingRoute } from "@/lib/pacing/route-profile";
import type { RidePhysics } from "@/lib/pacing/zwift-setup";

export type TargetTime = {
  seconds: number;
  /** Haalbaar binnen de marge; zo niet, dan is het plan het snelste haalbare. */
  reachable: boolean;
  /** De snelste tijd die met dit plan en deze renner haalbaar is. */
  fastestSeconds: number;
};

export type TargetTimeResult = TargetTime & {
  plan: PlanSegment[];
  evaluation: PlanEvaluation;
};

/** Binnen deze marge is het doel gehaald. */
export const TARGET_TOLERANCE_S = 30;
const MIN_FACTOR = 0.4;
const MAX_FACTOR = 2.5;
const MAX_STEPS = 30;

// Start en sprint van een Zwift-wedstrijd ook niet: die rijdt iedereen vol.
const isFixed = isFixedPiece;

function scaled(plan: PlanSegment[], factor: number): PlanSegment[] {
  return plan.map((segment) =>
    isFixed(segment)
      ? segment
      : { ...segment, targetWkg: Math.round(segment.targetWkg * factor * 100) / 100 },
  );
}

export function fitPlanToTime(
  plan: PlanSegment[],
  route: PacingRoute,
  model: CpModel,
  targetSeconds: number,
  options: {
    curve?: CurvePoint[] | null;
    durability?: DurabilityModel | null;
    ride?: RidePhysics | null;
  } = {},
): TargetTimeResult {
  const run = (factor: number) => {
    const result = rebalancePlan(scaled(plan, factor), route, model, options.curve, {
      durability: options.durability ?? null,
      ride: options.ride ?? null,
    });
    return { factor, plan: result.plan, evaluation: result.evaluation };
  };

  // Het snelste wat kan: de hoogste vermenigvuldiger waarbij het plan na
  // terugschalen nog haalbaar is. Een te hoog plan krijgt rebalancePlan niet
  // altijd terug binnen de reserve, dus zoeken op haalbaarheid, niet op tijd.
  let fastest = run(MAX_FACTOR);
  if (!fastest.evaluation.feasible) {
    let good = run(MIN_FACTOR);
    let bad = MAX_FACTOR;
    for (let step = 0; step < 20 && bad - good.factor > 0.005; step++) {
      const candidate = run((good.factor + bad) / 2);
      if (candidate.evaluation.feasible) good = candidate;
      else bad = candidate.factor;
    }
    fastest = good;
  }
  const fastestSeconds = Math.round(fastest.evaluation.totalSeconds);

  if (fastest.evaluation.totalSeconds > targetSeconds + TARGET_TOLERANCE_S) {
    return {
      plan: fastest.plan,
      evaluation: fastest.evaluation,
      seconds: Math.round(targetSeconds),
      reachable: false,
      fastestSeconds,
    };
  }

  // Bisectie op de vermenigvuldiger. Hoger = sneller, maar begrenzen en
  // terugschalen kunnen dat plaatselijk vlak maken; daarom houden we het beste
  // resultaat vast in plaats van alleen het laatste.
  let lo = MIN_FACTOR;
  let hi = fastest.factor;
  let best = fastest;
  const distance = (candidate: typeof best) =>
    Math.abs(candidate.evaluation.totalSeconds - targetSeconds);

  const slowest = run(lo);
  if (slowest.evaluation.totalSeconds <= targetSeconds) best = slowest;

  for (let step = 0; step < MAX_STEPS && distance(best) > TARGET_TOLERANCE_S; step++) {
    const mid = (lo + hi) / 2;
    const candidate = run(mid);
    if (candidate.evaluation.feasible && distance(candidate) < distance(best)) best = candidate;
    if (candidate.evaluation.totalSeconds > targetSeconds) lo = mid;
    else hi = mid;
    if (hi - lo < 0.002) break;
  }

  return {
    plan: best.plan,
    evaluation: best.evaluation,
    seconds: Math.round(targetSeconds),
    // Langzamer rijden dan het rustigste plan kan altijd; dat telt als haalbaar.
    reachable:
      best.evaluation.feasible && best.evaluation.totalSeconds <= targetSeconds + TARGET_TOLERANCE_S,
    fastestSeconds,
  };
}

/** "5:30", "5u30", "5.30" of "330" (minuten) naar seconden; null als het niets is. */
export function parseTargetTime(value: string): number | null {
  const text = value.trim().toLowerCase();
  const clock = text.match(/^(\d{1,2})\s*[:u.h]\s*(\d{1,2})$/);
  if (clock) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    if (minutes >= 60) return null;
    const seconds = (hours * 60 + minutes) * 60;
    return seconds > 0 ? seconds : null;
  }
  const minutesOnly = text.match(/^(\d{1,4})$/);
  if (minutesOnly) {
    const seconds = Number(minutesOnly[1]) * 60;
    return seconds > 0 ? seconds : null;
  }
  return null;
}
