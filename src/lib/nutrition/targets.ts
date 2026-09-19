// Doelen per dag, per maaltijd en per uur op de fiets.
//
// Alles is per kg lichaamsgewicht, zoals de consensusstukken het formuleren.
// Er is bewust geen kcal-doel: dat nodigt uit tot tellen en afvallen, en dat is
// precies het risico waar het REDs-consensusstuk voor waarschuwt. De enige
// energieschatting hieronder schaalt de vaste ingrediënten van een recept en
// komt nooit in beeld. Onderbouwing: docs/voeding-wielrennen.md.

import type { FuelDayType } from "./day-type";

export type Range = { min: number; max: number };

/**
 * Koolhydraten in g/kg per dag. Thomas, Erdman & Burke 2016 (ACSM) en Burke et
 * al. 2011; overgenomen in het UCI-consensusstuk 2026. Een wedstrijddag korter
 * dan drie uur valt onder "zwaar", zie classifyFuelDay.
 */
export const DAILY_CARBS_G_PER_KG: Record<FuelDayType, Range> = {
  rust: { min: 3, max: 5 },
  licht: { min: 3, max: 5 },
  matig: { min: 5, max: 7 },
  zwaar: { min: 6, max: 10 },
  lang: { min: 8, max: 12 },
  wedstrijd: { min: 8, max: 12 },
};

/** Eiwit per dag: Kato et al. 2016 (IAAO bij duursporters), begrensd door de
 * meta-analyse van Morton et al. 2018 waarboven weinig winst zit. */
export const DAILY_PROTEIN_G_PER_KG: Range = { min: 1.6, max: 1.8 };

/** Eiwit per maaltijd: ISSN nutrient timing (Kerksick et al. 2017). */
export const MEAL_PROTEIN_G_PER_KG: Range = { min: 0.3, max: 0.4 };

/** Eiwit voor het slapen: ~40 g (Snijders et al. 2019; Trommelen et al. 2023 gaf 45 g). */
export const PRE_SLEEP_PROTEIN_G = 40;

/** Snel herstel als de volgende zware sessie binnen ~8 uur valt (ACSM 2016). */
export const RECOVERY_CARBS_G_PER_KG_PER_HOUR: Range = { min: 1.0, max: 1.2 };
export const RAPID_RECOVERY_WINDOW_HOURS = 8;

/** Koolhydraten 1–4 uur voor de start is 1–4 g/kg (ACSM 2016); een snack in het
 * laatste uur zit aan de onderkant. */
export const PRE_RIDE_CARBS_G_PER_KG = 1;

/**
 * Koolhydraten per uur op de fiets, naar ritduur. Morton et al. 2026 (J Nutr)
 * en Podlogar & Wallis 2022. De 120 g/h staat alleen in de tekst: dat vraagt
 * darmtraining en hoort niet als standaard in een rekenregel.
 */
export function rideCarbsPerHour(durationMinutes: number): Range | null {
  if (!Number.isFinite(durationMinutes) || durationMinutes < 60) return null;
  if (durationMinutes < 150) return { min: 30, max: 60 };
  return { min: 60, max: 90 };
}

function scale(range: Range, factor: number): Range {
  return { min: Math.round(range.min * factor), max: Math.round(range.max * factor) };
}

export function dailyCarbs(dayType: FuelDayType, weightKg: number): Range {
  return scale(DAILY_CARBS_G_PER_KG[dayType], weightKg);
}

export function dailyProtein(weightKg: number): Range {
  return scale(DAILY_PROTEIN_G_PER_KG, weightKg);
}

export function recoveryCarbsPerHour(weightKg: number): Range {
  return scale(RECOVERY_CARBS_G_PER_KG_PER_HOUR, weightKg);
}

export const MEAL_MOMENTS = [
  "ontbijt",
  "lunch",
  "diner",
  "tussendoor",
  "voor_rit",
  "tijdens_rit",
  "na_rit",
  "voor_slapen",
] as const;
export type MealMoment = (typeof MEAL_MOMENTS)[number];

export const MEAL_MOMENT_LABELS: Record<MealMoment, string> = {
  ontbijt: "Ontbijt",
  lunch: "Lunch",
  diner: "Diner",
  tussendoor: "Tussendoor",
  voor_rit: "Voor de rit",
  tijdens_rit: "Tijdens de rit",
  na_rit: "Na de rit",
  voor_slapen: "Voor het slapen",
};

/**
 * Welk deel van de dagelijkse koolhydraten in een hoofdmaaltijd hoort. De rest
 * (ongeveer een kwart) valt op tussendoortjes en rond de rit. Een verdeling,
 * geen richtlijn: de bronnen geven dagtotalen en momenten rond de rit, geen
 * verdeling over maaltijden.
 */
const MAIN_MEAL_CARB_SHARE: Partial<Record<MealMoment, number>> = {
  ontbijt: 0.25,
  lunch: 0.2,
  diner: 0.3,
  tussendoor: 0.1,
};

export type MealTarget = {
  /** Gram koolhydraten per portie, of null als het recept op zijn basis blijft. */
  carbsG: number | null;
  /** Gram eiwit per portie, of null als eiwit niet het doel is. */
  proteinG: number | null;
};

export type MealTargetInput = {
  weightKg: number;
  dayType: FuelDayType;
  /** Geplande of gereden ritduur vandaag, voor tijdens_rit. */
  rideMinutes: number | null;
};

/** Het doel voor één portie op een bepaald moment. */
export function mealTarget(moment: MealMoment, input: MealTargetInput): MealTarget {
  const { weightKg, dayType } = input;
  const midpoint = (range: Range) => (range.min + range.max) / 2;
  const mealProtein = Math.round(midpoint(MEAL_PROTEIN_G_PER_KG) * weightKg);

  switch (moment) {
    case "ontbijt":
    case "lunch":
    case "diner":
    case "tussendoor": {
      const share = MAIN_MEAL_CARB_SHARE[moment] ?? 0;
      return {
        carbsG: Math.round(midpoint(DAILY_CARBS_G_PER_KG[dayType]) * weightKg * share),
        proteinG: moment === "tussendoor" ? null : mealProtein,
      };
    }
    case "voor_rit":
      return { carbsG: Math.round(PRE_RIDE_CARBS_G_PER_KG * weightKg), proteinG: null };
    case "tijdens_rit": {
      // Eén portie is één uur op de fiets; zonder rit het onderste niveau.
      const perHour = rideCarbsPerHour(input.rideMinutes ?? 0) ?? { min: 30, max: 60 };
      return { carbsG: Math.round(midpoint(perHour)), proteinG: null };
    }
    case "na_rit":
      return {
        carbsG: Math.round(RECOVERY_CARBS_G_PER_KG_PER_HOUR.min * weightKg),
        proteinG: Math.round(MEAL_PROTEIN_G_PER_KG.min * weightKg),
      };
    case "voor_slapen":
      return { carbsG: null, proteinG: PRE_SLEEP_PROTEIN_G };
  }
}

/**
 * Ruststofwisseling volgens Mifflin-St Jeor. Alleen gebruikt om de vaste
 * ingrediënten van een recept mee te schalen: een grotere renner eet ook een
 * grotere portie groente. Zonder geslacht nemen we het gemiddelde van de man-
 * en vrouwformule.
 */
export function restingEnergyKcal(input: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: string | null;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears;
  const offset = input.sex === "man" ? 5 : input.sex === "vrouw" ? -161 : -78;
  return base + offset;
}

/** De renner waarvoor de basisrecepten geschreven zijn. */
export const REFERENCE_RIDER = { weightKg: 70, heightCm: 180, ageYears: 35, sex: null } as const;
export const DEFAULT_AGE_YEARS = 35;

/**
 * Factor waarmee vaste ingrediënten meeschalen, begrensd zodat een gerecht
 * herkenbaar blijft. Zonder lengte valt hij terug op de gewichtsverhouding.
 */
export function portionEnergyFactor(input: {
  weightKg: number;
  heightCm: number | null;
  ageYears: number | null;
  sex: string | null;
}): number {
  const raw =
    input.heightCm == null
      ? input.weightKg / REFERENCE_RIDER.weightKg
      : restingEnergyKcal({
          weightKg: input.weightKg,
          heightCm: input.heightCm,
          ageYears: input.ageYears ?? DEFAULT_AGE_YEARS,
          sex: input.sex,
        }) / restingEnergyKcal(REFERENCE_RIDER);
  return Math.min(1.5, Math.max(0.75, Math.round(raw * 100) / 100));
}

export function ageFromBirthDate(birthDate: string | null, today: string): number | null {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  if (!by || !ty) return null;
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}
