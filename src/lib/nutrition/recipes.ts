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
import { mealTarget, type GutTraining, type MealMoment } from "./targets";
import type { DietTag, FuelProfile } from "./labels";
import { productAsFood, type ProductRow } from "./products";

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

/** Een ingrediënt zoals de database het geeft: NEVO (`food`) of een barcodeproduct (`product`, 0276). */
export type RecipeIngredientDbRow = Omit<RecipeIngredientRow, "food" | "grams"> & {
  grams: number | string;
  food: RecipeIngredientRow["food"] | null;
  product?: ProductRow | null;
};

/** De ingrediënten op volgorde; een barcodeproduct krijgt de vorm van een NEVO-product. */
export function recipeIngredients(rows: RecipeIngredientDbRow[] | null | undefined): RecipeIngredientRow[] {
  return [...(rows ?? [])]
    .flatMap((row): RecipeIngredientRow[] => {
      const { product, ...rest } = row;
      const food = row.food ?? (product ? productAsFood(product) : null);
      return food ? [{ ...rest, food, grams: Number(row.grams) }] : [];
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Alleen verpakte producten, zoals een gel of een reep: die schalen niet mee
 * met het doel, want een halve gel neem je niet mee. Het ritplan telt hele
 * stuks (ride-plan.ts).
 */
export function isPackagedRecipe(recipe: Pick<Recipe, "ingredients">): boolean {
  return recipe.ingredients.length > 0 && recipe.ingredients.every((item) => item.food.barcode);
}

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
  /** Een eigen recept dat met alle leden gedeeld is (0264). Zonder 0264: privé. */
  visibility?: RecipeVisibility;
  /** De maker wil naam en profielfoto bij het gedeelde recept. */
  show_owner?: boolean;
  /** Foto van de bron, bij een recept van een link. */
  image_url?: string | null;
  /** Naam en foto van de maker; alleen gevuld als die getoond mogen worden. */
  sharer?: { display_name: string | null; avatar_url: string | null } | null;
  /** Gedeeld door een ander lid: niet nagekeken, dus niet vanzelf in het menu (menu.ts). */
  from_member?: boolean;
  ingredients: RecipeIngredientRow[];
};

export const SHARE_STATUSES = ["voorgesteld", "afgewezen"] as const;
export type ShareStatus = (typeof SHARE_STATUSES)[number];

export const RECIPE_VISIBILITIES = ["prive", "leden"] as const;
export type RecipeVisibility = (typeof RECIPE_VISIBILITIES)[number];

export type Rider = {
  weightKg: number | null;
  energyFactor: number;
  dayType: FuelDayType;
  rideMinutes: number | null;
  /** Zwaarte van de rit; null = het midden van de band. */
  rideIntensity?: string | null;
  /** Darmtraining (gut-training.ts). */
  rideGut?: GutTraining | null;
};

/** Eén portie op maat, of de basisportie zolang het gewicht onbekend is. */
export function portionForRider(recipe: Recipe, rider: Rider | null): ScaledRecipe {
  const ingredients = recipe.ingredients.map((item) => ({
    food: item.food,
    grams: item.grams,
    role: item.role,
  }));
  if (!rider?.weightKg || isPackagedRecipe(recipe)) return basePortion(ingredients, recipe.servings);
  return scaleRecipe(
    ingredients,
    recipe.servings,
    mealTarget(recipe.meal_moment, {
      weightKg: rider.weightKg,
      dayType: rider.dayType,
      rideMinutes: rider.rideMinutes,
      rideIntensity: rider.rideIntensity,
      rideGut: rider.rideGut,
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
