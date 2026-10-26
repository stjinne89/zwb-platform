// Zweettest en vochtdoel. Stap 5 van docs/ritvoeding-plan.md.
//
// De test: wegen voor en na een rit, en noteren wat je dronk. Elke kilo die je
// lichter bent, is ongeveer een liter vocht (Baker 2017). Wat je dronk, telt
// erbij op: dat heb je ook uitgezweet. Plassen tussendoor zou je verlies
// overschatten; het protocol vraagt om vooraf te plassen.
//
// Het doel: drink zo dat je onder ongeveer 2% verlies blijft, maar niet meer dan
// je zweet (§6 van docs/voeding-wielrennen.md). Natrium krijgt geen getal
// (besluit 6): zoutverlies is niet uit gewicht af te leiden.

/** De toestemmingstekst waarvoor het lid bij de eerste test tekent (0273). */
export const SWEAT_CONSENT_VERSION = "2026-10-25";

/** Korter dan dit zegt een test te weinig; buiten deze band is hij niet plausibel. */
export const SWEAT_TEST_MIN_MINUTES = 45;
export const SWEAT_RATE_MIN_ML = 200;
export const SWEAT_RATE_MAX_ML = 3000;
/** Meer dan dit deel van je gewicht verliezen kost prestatie, vooral in de warmte. */
const MAX_LOSS_FRACTION = 0.02;
const BIDON_ML = 750;

export const SWEAT_SETTINGS = ["binnen", "buiten"] as const;
export type SweatSetting = (typeof SWEAT_SETTINGS)[number];

export type SweatTestInput = {
  durationMinutes: number;
  weightBeforeKg: number;
  weightAfterKg: number;
  drankMl: number;
};

export type SweatTestResult = { ok: true; mlPerHour: number } | { ok: false; reason: string };

/** Zweetverlies per uur uit een test, of waarom hij niet meetelt. */
export function sweatRate(input: SweatTestInput): SweatTestResult {
  const { durationMinutes, weightBeforeKg, weightAfterKg, drankMl } = input;
  if (![durationMinutes, weightBeforeKg, weightAfterKg, drankMl].every(Number.isFinite)) {
    return { ok: false, reason: "Vul alle velden in." };
  }
  if (durationMinutes < SWEAT_TEST_MIN_MINUTES) {
    return { ok: false, reason: `Een test duurt minstens ${SWEAT_TEST_MIN_MINUTES} minuten.` };
  }
  if (weightBeforeKg < 30 || weightBeforeKg > 250 || weightAfterKg < 30 || weightAfterKg > 250 || drankMl < 0) {
    return { ok: false, reason: "Controleer het gewicht en wat je dronk." };
  }
  const lostMl = (weightBeforeKg - weightAfterKg) * 1000 + drankMl;
  const mlPerHour = Math.round(lostMl / (durationMinutes / 60));
  if (mlPerHour < SWEAT_RATE_MIN_ML || mlPerHour > SWEAT_RATE_MAX_ML) {
    return { ok: false, reason: "Deze uitkomst is niet waarschijnlijk. Controleer de getallen of doe de test opnieuw." };
  }
  return { ok: true, mlPerHour };
}

export type SweatTest = {
  id: string;
  testedOn: string;
  durationMinutes: number;
  mlPerHour: number;
  setting: SweatSetting;
  warm: boolean;
};

/** De test waar het ritplan mee rekent: de laatste. */
export function currentSweatRate(tests: Pick<SweatTest, "testedOn" | "mlPerHour">[]): number | null {
  const latest = [...tests].sort((a, b) => b.testedOn.localeCompare(a.testedOn))[0];
  return latest?.mlPerHour ?? null;
}

function round50(value: number): number {
  return Math.round(value / 50) * 50;
}

export type FluidTarget = {
  /** Zo weinig dat je onder ongeveer 2% verlies blijft; null zonder gewicht. */
  minMl: number | null;
  /** Niet meer dan je zweet. */
  maxMl: number;
};

/** Hoeveel je per uur drinkt bij een rit van `minutes`, uit je zweetverlies per uur. */
export function fluidPerHour(sweatMlPerHour: number, weightKg: number | null, minutes: number): FluidTarget {
  const maxMl = round50(sweatMlPerHour);
  if (!weightKg || weightKg <= 0 || minutes <= 0) return { minMl: null, maxMl };
  const allowedPerHour = (weightKg * MAX_LOSS_FRACTION * 1000) / (minutes / 60);
  return { minMl: Math.min(maxMl, Math.max(0, round50(sweatMlPerHour - allowedPerHour))), maxMl };
}

/** Hoeveel bidons van 750 ml je meeneemt: het midden van het vochtdoel over de hele rit. */
export function fluidBidons(fluid: FluidTarget, minutes: number): number {
  const perHour = fluid.minMl == null ? fluid.maxMl : (fluid.minMl + fluid.maxMl) / 2;
  return Math.max(1, Math.round((perHour * minutes) / 60 / BIDON_ML));
}
