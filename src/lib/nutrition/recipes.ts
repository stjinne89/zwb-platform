// Recepten op maat en de dag vertaald naar sessies. Puur, zonder database: de
// Vandaag-pagina en de voedingspagina leveren elk hun eigen rijen aan. Welk
// recept bij welk moment komt, staat in menu.ts.

import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { shiftDayKey } from "@/lib/training/mobility";
import type { FuelDayType, FuelSession } from "./day-type";
import {
  basePortion,
  scaleRecipe,
  type IngredientRole,
  type NutritionFood,
  type ScaledRecipe,
} from "./scale";
import { mealTarget, type MealMoment } from "./targets";
import type { DietTag, FuelProfile } from "./labels";

export {
  DIET_TAGS,
  DIET_TAG_LABELS,
  FUEL_PROFILE_LABELS,
  type DietTag,
} from "./labels";

export type RecipeIngredientRow = {
  id: string;
  sort_order: number;
  grams: number;
  role: IngredientRole;
  food: NutritionFood & { quantity_unit: "g" | "ml" };
};

export type Recipe = {
  id: string;
  slug: string;
  title: string;
  meal_moment: MealMoment;
  fuel_profile: FuelProfile;
  diet_tags: DietTag[];
  servings: number;
  prep_minutes: number | null;
  steps_md: string;
  is_standard: boolean;
  owner_id: string | null;
  /** Het gerecht komt van een externe bron; tekst en waarden zijn van ZWB. */
  source_name: string | null;
  source_url: string | null;
  /** Alleen bij een eigen recept dat met de club gedeeld is. */
  share_status: ShareStatus | null;
  /** Wie een clubrecept aandroeg, als dat een lid was. */
  contributor: { display_name: string | null } | null;
  ingredients: RecipeIngredientRow[];
};

export const SHARE_STATUSES = ["voorgesteld", "afgewezen"] as const;
export type ShareStatus = (typeof SHARE_STATUSES)[number];

export type Rider = {
  weightKg: number | null;
  energyFactor: number;
  dayType: FuelDayType;
  rideMinutes: number | null;
};

/** Eén portie op maat, of de basisportie zolang het gewicht onbekend is. */
export function portionForRider(recipe: Recipe, rider: Rider | null): ScaledRecipe {
  const ingredients = recipe.ingredients.map((item) => ({
    food: item.food,
    grams: item.grams,
    role: item.role,
  }));
  if (!rider?.weightKg) return basePortion(ingredients, recipe.servings);
  return scaleRecipe(
    ingredients,
    recipe.servings,
    mealTarget(recipe.meal_moment, {
      weightKg: rider.weightKg,
      dayType: rider.dayType,
      rideMinutes: rider.rideMinutes,
    }),
    rider.energyFactor,
  );
}

export function matchesDiet(recipe: Recipe, tag: DietTag | null): boolean {
  return tag == null || recipe.diet_tags.includes(tag);
}

type WorkoutLike = {
  scheduled_at: string;
  duration_minutes: number | null;
  intensity: string | null;
  status?: string | null;
};

/** Geplande trainingen van vandaag en morgen, op datum zoals de Vandaag-pagina ze toont. */
export function plannedSessions(
  workouts: WorkoutLike[],
  today: string,
): { plannedToday: FuelSession[]; plannedTomorrow: FuelSession[] } {
  const tomorrow = shiftDayKey(today, 1);
  const toSession = (workout: WorkoutLike): FuelSession => ({
    minutes: Number(workout.duration_minutes ?? 0),
    intensity: workout.intensity,
  });
  const live = workouts.filter((workout) => workout.status !== "skipped");
  return {
    plannedToday: live.filter((workout) => String(workout.scheduled_at).slice(0, 10) === today).map(toSession),
    plannedTomorrow: live
      .filter((workout) => String(workout.scheduled_at).slice(0, 10) === tomorrow)
      .map(toSession),
  };
}

type RideLike = { start_date: string; moving_time_seconds: number | null };

function amsterdamHour(date: Date): number {
  return Number(
    date.toLocaleString("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", hourCycle: "h23" }),
  );
}

/** Ritten die vandaag (Amsterdamse tijd) begonnen. */
export function ridesOnDay(rides: RideLike[], today: string): FuelSession[] {
  return rides
    .filter((ride) => amsterdamDayKey(new Date(ride.start_date)) === today)
    .map((ride) => ({
      minutes: Math.round(Number(ride.moving_time_seconds ?? 0) / 60),
      intensity: null,
      startHour: amsterdamHour(new Date(ride.start_date)),
    }));
}
