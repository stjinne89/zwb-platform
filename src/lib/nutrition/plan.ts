// Het menu van een dag zoals Dagmenu en Boodschappen het tonen: de regels uit
// menu.ts, plus wat het lid zelf gekozen heeft (nutrition_menu_choices, 0261).
//
// Een zelf gekozen recept staat vast. De dagen eromheen passen zich aan: een
// recept dat het lid binnen twee dagen zelf koos, kiest het menu niet nog eens
// automatisch, en de koolhydraatbasis van een gekozen hoofdmaaltijd komt de dag
// ervoor en erna niet terug als het anders kan. Daarna vult het menu de dag aan
// tot het minimum aan koolhydraten en eiwit (topUpMenu). Alles hangt alleen af
// van de bewaarde keuzes, dus beide schermen tonen voor een dag hetzelfde menu.

import { shiftDayKey } from "@/lib/training/mobility";
import type { DietTag } from "./labels";
import {
  dayMenu,
  menuMoments,
  rankRecipes,
  stapleOf,
  topUpMenu,
  type MenuContext,
  type MenuSlot,
  type RecipePrefs,
} from "./menu";
import type { Recipe } from "./recipes";
import { ridePlan, type RidePlan } from "./ride-plan";
import { MEAL_MOMENTS, type MealMoment } from "./targets";
import { nutritionDay, type NutritionDay, type NutritionDayInput } from "./tips";

export type MenuChoice = { day: string; moment: MealMoment; recipeId: string };

/** Zo ver vooruit mag een lid een recept kiezen; gelijk aan Boodschappen vanaf morgen. */
export const CHOICE_DAYS_AHEAD = 7;
/** Een zelf gekozen recept komt binnen zoveel dagen niet automatisch terug. */
export const AVOID_REPEAT_DAYS = 2;

const MAIN_MEALS: MealMoment[] = ["ontbijt", "lunch", "diner"];

/** Het venster aan keuzes dat nodig is om de dagen van `from` tot en met `to` te plannen. */
export function choiceWindow(from: string, to: string) {
  return { from: shiftDayKey(from, -AVOID_REPEAT_DAYS), to: shiftDayKey(to, AVOID_REPEAT_DAYS) };
}

function dayDistance(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86_400_000);
}

export type PlanDayInput = {
  recipes: Recipe[];
  input: NutritionDayInput;
  energyFactor: number;
  prefs: RecipePrefs;
  diet: DietTag | null;
  /** Keuzes in het venster rond deze dag (choiceWindow). */
  choices: MenuChoice[];
  /** Al gegeten volgens Naleving; zonder Naleving niets. */
  eaten?: { carbsG: number; proteinG: number };
  eatenMoments?: Set<MealMoment>;
};

export function planDayMenu({
  recipes,
  input,
  energyFactor,
  prefs,
  diet,
  choices,
  eaten = { carbsG: 0, proteinG: 0 },
  eatenMoments = new Set(),
}: PlanDayInput): { nutrition: NutritionDay; slots: MenuSlot[]; ride: RidePlan | null } {
  const day = input.today;
  const nutrition = nutritionDay(input);
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  const chosen: Partial<Record<MealMoment, string>> = {};
  const avoid = new Set<string>();
  const avoidStaples = new Set<string>();
  for (const choice of choices) {
    const distance = Math.abs(dayDistance(choice.day, day));
    if (distance === 0) {
      if (MEAL_MOMENTS.includes(choice.moment)) chosen[choice.moment] = choice.recipeId;
      continue;
    }
    if (distance <= AVOID_REPEAT_DAYS) avoid.add(choice.recipeId);
    const recipe = byId.get(choice.recipeId);
    const staple = distance === 1 && recipe && MAIN_MEALS.includes(choice.moment) ? stapleOf(recipe) : null;
    if (staple) avoidStaples.add(staple);
  }

  const context: MenuContext = {
    rider: {
      weightKg: input.weightKg,
      energyFactor,
      dayType: nutrition.dayType,
      rideMinutes: nutrition.rideMinutes,
      rideIntensity: nutrition.rideIntensity,
    },
    dayType: nutrition.dayType,
    tomorrowType: nutrition.tomorrowType,
    today: day,
    prefs,
    diet,
  };
  const slots = dayMenu(recipes, menuMoments(input, nutrition), context, { chosen, avoid, avoidStaples });

  // Het ritplan bouwt op het recept dat het menu bij "Tijdens de rit" zet.
  const rideSlot = slots.find((slot) => slot.moment === "tijdens_rit");
  const ride =
    rideSlot && nutrition.rideMinutes
      ? ridePlan({
          minutes: nutrition.rideMinutes,
          intensity: nutrition.rideIntensity,
          ranked: rankRecipes(recipes, "tijdens_rit", context).map((item) => item.recipe),
          lead: rideSlot.recipe,
          leadChosen: rideSlot.chosen,
          energyFactor,
        })
      : null;

  return {
    nutrition,
    ride,
    slots: topUpMenu(slots, {
      eaten,
      eatenMoments,
      floor: { carbsG: nutrition.carbs?.min ?? null, proteinG: nutrition.protein?.min ?? null },
      energyFactor,
      rideHours: (nutrition.rideMinutes ?? 0) / 60,
    }),
  };
}
