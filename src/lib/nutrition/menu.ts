// Het dagmenu: per moment van de dag één recept dat bij deze renner en deze dag
// past, met de overige recepten als alternatief.
//
// Regelgebaseerd en zonder opslag, net als de tip (tips.ts). De keuze kijkt naar:
//   1. of de portie na schalen het doel van dat moment haalt (scale.ts);
//   2. het brandstofprofiel dat bij het dagtype hoort;
//   3. het soort eten: licht verteerbaar rond de rit en op zware dagen,
//      vezelrijk op rustige dagen (UCI-positiestandpunt, thema 7);
//   4. wat het lid zelf als favoriet of "niet voor mij" heeft gemarkeerd.
// Wat daarna gelijkwaardig is, wisselt per dag door, zodat een recept pas
// terugkomt als de andere geweest zijn.

import { dayIndex } from "@/lib/training/zwbeterworden";
import { isKeyDay, totalMinutes, type FuelDayType } from "./day-type";
import type { DietTag, FuelProfile } from "./labels";
import { matchesDiet, portionForRider, type Recipe, type Rider } from "./recipes";
import type { ScaledRecipe } from "./scale";
import { MEAL_MOMENTS, mealTarget, type MealMoment } from "./targets";
import { EVENING_START_HOUR, type NutritionDay, type NutritionDayInput } from "./tips";
import { portionTraits, type PortionTraits } from "./traits";

export const RECIPE_PREFS = ["favoriet", "verborgen"] as const;
export type RecipePref = (typeof RECIPE_PREFS)[number];
export type RecipePrefs = Map<string, RecipePref>;

/** De gewone maaltijden, en wat er rond een rit bij komt. */
export const DAY_MOMENTS: MealMoment[] = ["ontbijt", "lunch", "tussendoor", "diner", "voor_slapen"];
export const RIDE_MOMENTS: MealMoment[] = ["voor_rit", "tijdens_rit", "na_rit"];

const MAIN_MEALS = new Set<MealMoment>(["ontbijt", "lunch", "diner"]);
/** Vanaf deze ritduur hoort er een herstelmoment bij (zelfde grens als de tip). */
const RECOVERY_RIDE_MINUTES = 60;

/** Welke momenten vandaag in het menu staan. */
export function menuMoments(input: NutritionDayInput, day: NutritionDay): MealMoment[] {
  const moments = new Set<MealMoment>(["ontbijt", "lunch", "diner"]);
  if (day.dayType !== "rust" && day.dayType !== "licht") moments.add("tussendoor");

  const planned = totalMinutes(input.plannedToday);
  const ridden = totalMinutes(input.ridesToday);
  const stillToRide = input.ridesToday.length === 0 && planned > 0;
  if (stillToRide) moments.add("voor_rit");
  if (day.rideCarbsPerHour) moments.add("tijdens_rit");
  if (Math.max(planned, ridden) >= RECOVERY_RIDE_MINUTES) moments.add("na_rit");

  const eveningRide = input.ridesToday.some((ride) => (ride.startHour ?? -1) >= EVENING_START_HOUR);
  if (eveningRide || isKeyDay(day.dayType)) moments.add("voor_slapen");

  return MEAL_MOMENTS.filter((moment) => moments.has(moment));
}

/** Het profiel dat bij dit moment past, in volgorde van voorkeur. */
export function wantedProfiles(moment: MealMoment, dayType: FuelDayType, tomorrowType: FuelDayType): FuelProfile[] {
  if (!MAIN_MEALS.has(moment)) return [];
  // De avond voor een zware dag telt als brandstof voor morgen.
  if (isKeyDay(dayType) || (moment === "diner" && isKeyDay(tomorrowType))) return ["hoog_kh", "gemengd"];
  if (dayType === "rust") return ["eiwitrijk", "gemengd"];
  return ["gemengd", "hoog_kh"];
}

export type MenuContext = {
  /** Null zonder gewicht: dan telt alleen profiel, soort eten en voorkeur. */
  rider: Rider | null;
  dayType: FuelDayType;
  tomorrowType: FuelDayType;
  today: string;
  prefs: RecipePrefs;
  diet: DietTag | null;
};

export type RankedRecipe = {
  recipe: Recipe;
  portion: ScaledRecipe;
  traits: PortionTraits;
  score: number;
};

/**
 * Hoe dicht de portie bij het doel komt, tussen 0 en 1. Koolhydraten tellen in
 * beide richtingen. Eiwit alleen als het doel niet gehaald wordt: een maaltijd
 * met meer eiwit dan het doel is geen slechtere keuze.
 */
export function portionFit(recipe: Recipe, portion: ScaledRecipe, rider: Rider | null): number {
  if (!rider?.weightKg) return 1;
  const target = mealTarget(recipe.meal_moment, {
    weightKg: rider.weightKg,
    dayType: rider.dayType,
    rideMinutes: rider.rideMinutes,
  });
  const parts: number[] = [];
  if (target.carbsG) {
    const actual = portion.perPortion.carbsG;
    parts.push(actual <= 0 ? 0 : Math.min(actual / target.carbsG, target.carbsG / actual));
  }
  if (target.proteinG) parts.push(Math.min(1, portion.perPortion.proteinG / target.proteinG));
  if (parts.length === 0) return 1;
  // Koolhydraten wegen dubbel: daar zit het verschil tussen de dagen.
  const [first, second] = parts;
  return second == null ? first : target.carbsG ? (first * 2 + second) / 3 : (first + second) / 2;
}

const PROFILE_BONUS = [0.3, 0.15];
const TRAIT_BONUS = 0.15;
const FAVORITE_BONUS = 0.25;
/** Recepten binnen deze afstand van de beste gelden als gelijkwaardig en wisselen per dag. */
const ROTATION_BAND = 0.2;

function daysSinceEpoch(dayKey: string): number {
  return Math.floor(Date.parse(`${dayKey}T12:00:00Z`) / 86_400_000);
}

/**
 * Alle recepten voor één moment, beste eerst. Verborgen recepten en recepten
 * buiten het dieetfilter vallen af. De gelijkwaardige kopgroep schuift per dag
 * één plek op.
 */
export function rankRecipes(recipes: Recipe[], moment: MealMoment, context: MenuContext): RankedRecipe[] {
  const profiles = wantedProfiles(moment, context.dayType, context.tomorrowType);
  const wantsLight = moment === "voor_rit" || (MAIN_MEALS.has(moment) && isKeyDay(context.dayType));
  const wantsFiber = MAIN_MEALS.has(moment) && (context.dayType === "rust" || context.dayType === "licht");

  const ranked = recipes
    .filter(
      (recipe) =>
        recipe.meal_moment === moment &&
        context.prefs.get(recipe.id) !== "verborgen" &&
        matchesDiet(recipe, context.diet),
    )
    .map((recipe) => {
      const portion = portionForRider(recipe, context.rider);
      const traits = portionTraits(portion.ingredients);
      const profileRank = profiles.indexOf(recipe.fuel_profile);
      const score =
        portionFit(recipe, portion, context.rider) +
        (profileRank >= 0 ? PROFILE_BONUS[profileRank] ?? 0 : 0) +
        (wantsLight && traits.lightDigest ? TRAIT_BONUS : 0) +
        (wantsFiber && traits.fiberRich ? TRAIT_BONUS : 0) +
        (context.prefs.get(recipe.id) === "favoriet" ? FAVORITE_BONUS : 0);
      return { recipe, portion, traits, score };
    })
    .sort((a, b) => b.score - a.score || a.recipe.slug.localeCompare(b.recipe.slug));
  if (ranked.length === 0) return [];

  const best = ranked[0].score;
  // Een vaste, van de score onafhankelijke volgorde binnen de kopgroep; anders
  // staat het recept met de hoogste score elke dag vooraan.
  const head = ranked
    .filter((item) => item.score >= best - ROTATION_BAND)
    .sort(
      (a, b) =>
        dayIndex(`${moment}:${a.recipe.slug}`, 1_000_003) - dayIndex(`${moment}:${b.recipe.slug}`, 1_000_003) ||
        a.recipe.slug.localeCompare(b.recipe.slug),
    );
  const offset = (daysSinceEpoch(context.today) + dayIndex(moment, 97)) % head.length;
  return [...head.slice(offset), ...head.slice(0, offset), ...ranked.slice(head.length)];
}

/** De koolhydraatbasis van een recept: het ingrediënt dat de meeste koolhydraten levert. */
export function stapleOf(recipe: Recipe): string | null {
  let best: { id: string; carbs: number } | null = null;
  for (const item of recipe.ingredients) {
    if (item.role !== "kh_bron") continue;
    const carbs = (Number(item.food.carbs_g ?? 0) * item.grams) / 100;
    if (!best || carbs > best.carbs) best = { id: item.food.id, carbs };
  }
  return best?.id ?? null;
}

export type MenuSlot = RankedRecipe & {
  moment: MealMoment;
  /** Hoeveel recepten er voor dit moment zijn, voor "ander recept". */
  choices: number;
  /** De plek in de rij die nu getoond wordt. */
  index: number;
};

export type MenuSwaps = Partial<Record<MealMoment, number>>;

/**
 * Het menu van vandaag. Zonder eigen keuze krijgen de hoofdmaaltijden niet
 * twee keer dezelfde koolhydraatbasis; wie zelf doorklikt, krijgt wat hij kiest.
 */
export function dayMenu(
  recipes: Recipe[],
  moments: MealMoment[],
  context: MenuContext,
  swaps: MenuSwaps = {},
): MenuSlot[] {
  const usedStaples = new Set<string>();
  const slots: MenuSlot[] = [];

  for (const moment of moments) {
    const ranked = rankRecipes(recipes, moment, context);
    if (ranked.length === 0) continue;

    const swap = swaps[moment];
    let index = 0;
    if (swap != null) {
      index = ((swap % ranked.length) + ranked.length) % ranked.length;
    } else if (MAIN_MEALS.has(moment)) {
      const fresh = ranked.findIndex((item) => {
        const staple = stapleOf(item.recipe);
        return staple == null || !usedStaples.has(staple);
      });
      index = fresh >= 0 ? fresh : 0;
    }

    const chosen = ranked[index];
    if (MAIN_MEALS.has(moment)) {
      const staple = stapleOf(chosen.recipe);
      if (staple) usedStaples.add(staple);
    }
    slots.push({ ...chosen, moment, choices: ranked.length, index });
  }
  return slots;
}

/** "lunch:2,diner:1" uit de URL. Onbekende momenten en rare getallen vallen weg. */
export function parseSwaps(value: string | null | undefined): MenuSwaps {
  const swaps: MenuSwaps = {};
  for (const part of (value ?? "").split(",")) {
    const [moment, raw] = part.split(":");
    const count = Number(raw);
    if ((MEAL_MOMENTS as readonly string[]).includes(moment) && Number.isInteger(count) && count > 0 && count < 1000) {
      swaps[moment as MealMoment] = count;
    }
  }
  return swaps;
}

export function serializeSwaps(swaps: MenuSwaps): string {
  return MEAL_MOMENTS.filter((moment) => (swaps[moment] ?? 0) > 0)
    .map((moment) => `${moment}:${swaps[moment]}`)
    .join(",");
}
