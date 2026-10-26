// Hoe ver het lid van de doeltijd in zijn pacingplan af zit. "Plan voor deze
// tijd" zegt al of de tijd haalbaar is en wat het snelste haalbare is; dit voegt
// toe hoeveel CP de doeltijd vraagt, wat redelijk is tot het event, en wat 1 % CP
// of 1 kg scheelt. Zelfde rekenwerk als het trainingsdoel (goal-target-time.ts),
// maar op het eigen plan van het lid en met de fysica van het event.

import { assessTargetTime, type TargetAssessment } from "@/lib/training/goal-target-time";
import type { PacingPageData } from "@/lib/pacing/session";

/** Weken tot de start; null als het event al begonnen is. */
export function weeksUntilStart(startAt: string, now = new Date()): number | null {
  const start = new Date(startAt).getTime();
  if (!Number.isFinite(start) || start <= now.getTime()) return null;
  return (start - now.getTime()) / (7 * 86400_000);
}

export function assessPacingTarget(
  data: Pick<PacingPageData, "event" | "loaded" | "rider" | "plan" | "ride">,
  now = new Date(),
): TargetAssessment | null {
  const target = data.plan.summary?.targetTime;
  if (!target?.seconds || data.plan.segments.length === 0) return null;
  // Na de start valt er niets meer te groeien.
  const weeks = weeksUntilStart(data.event.start_at, now);
  if (weeks === null) return null;
  try {
    const result = assessTargetTime({
      route: data.loaded.route,
      rider: data.rider,
      targetSeconds: target.seconds,
      weeksToGoal: weeks,
      physics: { ride: data.ride?.physics ?? null },
      startPlan: data.plan.segments,
    });
    return {
      targetSeconds: result.targetSeconds,
      predictedSeconds: result.predictedSeconds,
      verdict: result.verdict,
      cpWatts: result.cpWatts,
      requiredCpWatts: result.requiredCpWatts,
      requiredGainPct: result.requiredGainPct,
      realisticGainPct: result.realisticGainPct,
      weeksToGoal: result.weeksToGoal,
      secondsPerCpPct: result.secondsPerCpPct,
      secondsPerKg: result.secondsPerKg,
    };
  } catch {
    // Een rekenfout mag de pacingpagina niet breken; de doeltijdregel blijft staan.
    return null;
  }
}
