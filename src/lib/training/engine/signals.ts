// Herstelsignalen voor de regelmotor: wanneer de belasting omlaag mag en wanneer
// er ruimte is. De prompt noemt de signalen; hier krijgen ze een getal, zodat
// het besluit toetsbaar is en elke keer hetzelfde uitvalt.
//
// Drempels zijn keuzes van ZWB, geen grenzen uit onderzoek:
// - TSB op of onder -30: de zone die intervals.icu "hoog risico" noemt.
// - Ramp rate op of boven 8 CTL per week: ruim boven de gebruikelijke 3-6.
// - Readiness van het apparaat onder 50. Afgeleide readiness telt niet apart:
//   die komt uit dezelfde HRV, rust-hartslag en slaap als wellness.state.
// - Klachtenscore boven 0,65, zoals in de prompt.

import type { EngineReason, TrainingAiInput } from "@/lib/training/engine/types";

export const TSB_FATIGUED = -30;
export const TSB_FRESH = 5;
export const RAMP_RATE_HIGH = 8;
export const READINESS_LOW = 50;
export const READINESS_HIGH = 80;
export const SYMPTOMS_HIGH = 0.65;
export const RPE_HIGH = 8;

export type RecoverySignals = {
  /** Minstens één echt overbelastingssignaal: verlaag de belasting. */
  fatigued: boolean;
  /** Fris en geen enkel vermoeidheidssignaal: een zwaardere sleutelsessie mag. */
  fresh: boolean;
  /** Hoge ramp rate: groei afremmen, niet per se terugschakelen. */
  rampHigh: boolean;
  /** Hoge klachtenlast: sleutelsessie flexibel, zonder het te benoemen. */
  lowerCapacity: boolean;
  reasons: EngineReason[];
};

function hardFeedback(input: TrainingAiInput): boolean {
  const recent = (input.compliance?.workouts ?? []).slice(-3);
  return recent.some(
    (workout) =>
      workout.verdict === "te_zwaar" &&
      ((workout.athleteRpe ?? 0) >= RPE_HIGH ||
        workout.athleteFeel === "zwaar" ||
        workout.athleteFeel === "slecht"),
  );
}

export function recoverySignals(input: TrainingAiInput): RecoverySignals {
  const reasons: EngineReason[] = [];
  const add = (rule: string, text: string) => reasons.push({ rule, text, caution: true });

  const tsb = input.intervalsLoad?.tsb ?? null;
  const ramp = input.intervalsLoad?.rampRate ?? null;
  const wellness = input.wellness ?? null;
  const deviceReadiness =
    wellness?.readinessSource === "device" && wellness.readinessCurrent ? wellness.readiness : null;

  let fatigued = false;
  if (tsb != null && tsb <= TSB_FATIGUED) {
    fatigued = true;
    add("signaal.tsb", `Vorm (TSB) staat op ${Math.round(tsb)}: er is herstel ingebouwd.`);
  }
  if (wellness?.state === "fatigued") {
    fatigued = true;
    add("signaal.wellness", "Herstelwaarden wijzen op vermoeidheid: de belasting is verlaagd.");
  }
  if (deviceReadiness != null && deviceReadiness < READINESS_LOW) {
    fatigued = true;
    add("signaal.readiness", `Readiness is ${Math.round(deviceReadiness)}: rustiger gepland.`);
  }
  if (hardFeedback(input)) {
    fatigued = true;
    add("signaal.feedback", "Recente trainingen voelden te zwaar: extra herstel ingebouwd.");
  }

  const rampHigh = ramp != null && ramp >= RAMP_RATE_HIGH;
  if (rampHigh) add("signaal.ramp", `Ramp rate is ${Math.round(ramp)}: de opbouw is gematigd.`);

  const lowerCapacity = (input.symptoms?.score ?? 0) > SYMPTOMS_HIGH;
  if (lowerCapacity) add("signaal.belastbaarheid", "Lagere belastbaarheid deze week: sleutelsessie flexibel.");

  const freshSignal =
    wellness?.state === "fresh" ||
    (deviceReadiness != null && deviceReadiness >= READINESS_HIGH) ||
    (tsb != null && tsb >= TSB_FRESH);
  const fresh = freshSignal && !fatigued && !lowerCapacity;

  return { fatigued, fresh, rampHigh, lowerCapacity, reasons };
}
