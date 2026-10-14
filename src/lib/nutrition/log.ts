// Naleving: wat een lid at, opgeteld tegen het doel van de dag.
//
// Twee grenzen, uit docs/naleving-voeding-plan.md:
//
// * Alleen koolhydraten en eiwit. Geen kcal en geen vet: die tellen we niet op
//   en tonen we niet.
// * Het doel is een ondergrens. Er bestaat hier geen "te veel": boven de
//   onderkant van de band is het doel gehaald, hoe ver erboven ook.

import { shiftDayKey } from "@/lib/training/mobility";
import { FUEL_DAY_TYPES, type FuelDayType } from "./day-type";
import type { NutritionFood } from "./scale";
import { MEAL_MOMENTS, rideCarbsPerHour, type MealMoment, type Range } from "./targets";

/** De toestemmingstekst waarvoor een lid tekent; ook in migratie 0231. */
export const LOG_CONSENT_VERSION = "2026-10-14";

/** Zo ver terug kan een lid nog een maaltijd invoeren of bekijken. */
export const LOG_EDIT_DAYS = 7;

// "foto" staat er nog voor maaltijden van vóór 2026-10-15; nieuwe komen er niet bij.
export const LOG_SOURCES = ["recept", "handmatig", "foto", "tekst"] as const;
export type LogSource = (typeof LOG_SOURCES)[number];

export type LoggedItem = {
  /** Een NEVO-product, of een verpakt product via de barcode (products.ts). */
  kind: "nevo" | "product";
  /** `id` is het NEVO-id of de barcode. Waarden per 100 g of ml. */
  food: Pick<NutritionFood, "id" | "name_nl" | "carbs_g" | "protein_g"> & { quantity_unit: "g" | "ml" };
  grams: number;
};

export type LoggedMeal = {
  id: string;
  eatenOn: string;
  moment: MealMoment;
  source: LogSource;
  recipeId: string | null;
  title: string;
  items: LoggedItem[];
};

export type LogMacros = {
  carbsG: number;
  proteinG: number;
  /** Ontbreekt er een NEVO-waarde, dan is het totaal een ondergrens. */
  incomplete: boolean;
};

export function mealMacros(meal: Pick<LoggedMeal, "items">): LogMacros {
  // Niet via macrosFor: dat telt ook vet en vezels, en een ontbrekende vetwaarde
  // maakt koolhydraten en eiwit niet onvolledig.
  const sum = (key: "carbs_g" | "protein_g") =>
    Math.round(
      meal.items.reduce((total, item) => total + (Number(item.food[key] ?? 0) * item.grams) / 100, 0) * 10,
    ) / 10;
  return {
    carbsG: sum("carbs_g"),
    proteinG: sum("protein_g"),
    incomplete: meal.items.some((item) => item.food.carbs_g == null || item.food.protein_g == null),
  };
}

function add(a: LogMacros, b: LogMacros): LogMacros {
  return {
    carbsG: Math.round((a.carbsG + b.carbsG) * 10) / 10,
    proteinG: Math.round((a.proteinG + b.proteinG) * 10) / 10,
    incomplete: a.incomplete || b.incomplete,
  };
}

const EMPTY: LogMacros = { carbsG: 0, proteinG: 0, incomplete: false };

export function dayTotals(meals: LoggedMeal[]): LogMacros {
  return meals.map(mealMacros).reduce(add, EMPTY);
}

/** De maaltijden van één dag per moment, in de volgorde van de dag. */
export function mealsByMoment(meals: LoggedMeal[]): { moment: MealMoment; meals: LoggedMeal[]; total: LogMacros }[] {
  return MEAL_MOMENTS.map((moment) => {
    const own = meals.filter((meal) => meal.moment === moment);
    return { moment, meals: own, total: dayTotals(own) };
  }).filter((group) => group.meals.length > 0);
}

export type FloorStatus = {
  eatenG: number;
  /** De onderkant van de band; null zonder gewicht. */
  floorG: number | null;
  /** Hoeveel er nog bij moet om de onderkant te halen; 0 als die gehaald is. */
  remainingG: number;
  /** 0–1, voor de balk. Loopt niet door boven de onderkant. */
  progress: number;
  reached: boolean;
};

export function floorStatus(eatenG: number, target: Range | null): FloorStatus {
  const eaten = Math.round(eatenG);
  if (!target || target.min <= 0) {
    return { eatenG: eaten, floorG: null, remainingG: 0, progress: 0, reached: false };
  }
  const remaining = Math.max(0, target.min - eaten);
  return {
    eatenG: eaten,
    floorG: target.min,
    remainingG: remaining,
    progress: Math.min(1, eaten / target.min),
    reached: remaining === 0,
  };
}

export type RideFueling = {
  /** Koolhydraten die bij "tijdens de rit" zijn vastgelegd, per uur rijden. */
  perHourG: number;
  /** De onderkant van de band voor deze ritduur. */
  floorPerHourG: number;
  reached: boolean;
  /** Is er iets bij "na de rit" vastgelegd? */
  recoveryLogged: boolean;
};

/**
 * Eten rond de rit van die dag. Null bij een rit korter dan een uur: daarvoor
 * geven de bronnen geen doel per uur (zie rideCarbsPerHour).
 */
export function rideFueling(meals: LoggedMeal[], rideMinutes: number | null): RideFueling | null {
  const minutes = rideMinutes ?? 0;
  const band = rideCarbsPerHour(minutes);
  if (!band) return null;
  const carbs = dayTotals(meals.filter((meal) => meal.moment === "tijdens_rit")).carbsG;
  const perHour = Math.round(carbs / (minutes / 60));
  return {
    perHourG: perHour,
    floorPerHourG: band.min,
    reached: perHour >= band.min,
    recoveryLogged: meals.some((meal) => meal.moment === "na_rit"),
  };
}

export type WeekDay = {
  day: string;
  dayType: FuelDayType;
  /** Is er die dag iets ingevuld? Een lege dag telt niet als gemist. */
  logged: boolean;
  carbsReached: boolean | null;
  proteinReached: boolean | null;
};

export type WeekTally = { dayType: FuelDayType; logged: number; carbsReached: number };

/**
 * De week in één oogopslag: per dag of de onderkant gehaald is, en per dagtype
 * hoe vaak. Alleen ingevulde dagen tellen mee, en er is geen reeks: een dag
 * overslaan is geen fout.
 */
export function weekSummary(
  days: { day: string; dayType: FuelDayType; carbs: Range | null; protein: Range | null; meals: LoggedMeal[] }[],
): { days: WeekDay[]; tally: WeekTally[] } {
  const rows = days.map((entry): WeekDay => {
    const logged = entry.meals.length > 0;
    const totals = dayTotals(entry.meals);
    const reached = (eaten: number, target: Range | null) =>
      logged && target ? floorStatus(eaten, target).reached : null;
    return {
      day: entry.day,
      dayType: entry.dayType,
      logged,
      carbsReached: reached(totals.carbsG, entry.carbs),
      proteinReached: reached(totals.proteinG, entry.protein),
    };
  });
  const tally = new Map<FuelDayType, WeekTally>();
  for (const row of rows) {
    if (!row.logged) continue;
    const entry = tally.get(row.dayType) ?? { dayType: row.dayType, logged: 0, carbsReached: 0 };
    entry.logged += 1;
    if (row.carbsReached) entry.carbsReached += 1;
    tally.set(row.dayType, entry);
  }
  return { days: rows, tally: FUEL_DAY_TYPES.flatMap((type) => (tally.has(type) ? [tally.get(type)!] : [])) };
}

/** De oudste dag die nog te bekijken en in te vullen is. */
export function firstLogDay(today: string): string {
  return shiftDayKey(today, -LOG_EDIT_DAYS);
}

/** De gevraagde dag, of vandaag als die ontbreekt, ongeldig of buiten het venster is. */
export function parseLogDay(value: string | null | undefined, today: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return today;
  return value >= firstLogDay(today) && value <= today ? value : today;
}

function signature(meal: LoggedMeal): string {
  const items = meal.items
    .map((item) => `${item.food.id}:${item.grams}`)
    .sort()
    .join("|");
  return `${meal.title.toLowerCase()}#${items}`;
}

/**
 * Eerdere maaltijden om opnieuw te kiezen: elke samenstelling één keer, de
 * laatst gegeten eerst. `meals` staat van nieuw naar oud.
 */
export function repeatableMeals(meals: LoggedMeal[], limit = 8): LoggedMeal[] {
  const seen = new Set<string>();
  const out: LoggedMeal[] = [];
  for (const meal of meals) {
    if (meal.items.length === 0) continue;
    const key = signature(meal);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(meal);
    if (out.length === limit) break;
  }
  return out;
}
