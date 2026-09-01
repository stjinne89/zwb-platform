// Pacingplannen delen binnen de club.
//
// Twee dingen die pure logica moeten zijn, want ze bepalen wat een ander lid te
// zien krijgt en wat er met zijn eigen plan gebeurt.
//
// 1. Wat er van een gedeeld plan naar buiten gaat. De persoonlijke notities gaan
//    nooit mee — die schrijft een lid voor zichzelf. De rest (planstukken,
//    verwachte tijd, w/kg) is precies waar delen voor bedoeld is.
//
// 2. Hoe je andermans plan overneemt. Andermans 4,2 w/kg op de Muur zegt niets
//    over wat jij daar moet rijden; wat het wél zegt is dat hij daar op 108 % van
//    zijn CP zat. Die verhouding vertalen we naar jouw CP. Klakkeloos de
//    absolute w/kg overnemen zou een sterker lid onderschatten en een zwakker lid
//    de vernieling in helpen.

import type { PlanSegment } from "@/lib/pacing/plan";
import type { PlanSummary, StoredPlan } from "@/lib/pacing/store";

export type SharedPlanView = {
  planId: string;
  profileId: string;
  ownerName: string;
  source: StoredPlan["source"];
  segments: PlanSegment[];
  summary: PlanSummary | null;
  updatedAt: string;
  /** Het plan van de maker is verouderd; label dat mee zodat niemand erop bouwt. */
  stale: boolean;
};

/**
 * Zet een opgeslagen plan om in wat een clubgenoot mag zien. Alles wat hier niet
 * expliciet in staat, gaat niet mee.
 */
export function sharedPlanView(
  plan: StoredPlan,
  ownerName: string,
  stale = false,
): SharedPlanView {
  return {
    planId: plan.id,
    profileId: plan.profile_id,
    ownerName,
    source: plan.source,
    segments: plan.segments,
    summary: plan.summary,
    updatedAt: plan.updated_at,
    stale,
  };
}

/**
 * Neemt andermans plan over als vertrekpunt, geschaald naar jouw CP. Labels en
 * accenten blijven; de reden wordt overschreven zodat later duidelijk is waar
 * het vandaan komt.
 */
export function adoptSharedPlan(
  shared: SharedPlanView,
  myCpWkg: number,
): PlanSegment[] {
  const theirCpWkg = shared.summary?.cpWkg;

  // Zonder het CP van de maker valt er niets te schalen. Dan de doelen
  // ongewijzigd overnemen en dat zeggen — rebalancePlan vangt daarna op wat er
  // niet kan.
  const factor =
    theirCpWkg && theirCpWkg > 0 && myCpWkg > 0 ? myCpWkg / theirCpWkg : 1;

  return shared.segments.map((segment) => ({
    ...segment,
    targetWkg: Math.round(segment.targetWkg * factor * 100) / 100,
    rationale:
      factor === 1
        ? `Overgenomen van ${shared.ownerName}.`
        : `Overgenomen van ${shared.ownerName}, omgerekend naar jouw CP.`,
  }));
}
