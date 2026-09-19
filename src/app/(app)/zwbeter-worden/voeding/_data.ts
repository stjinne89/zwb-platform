// Dataophaal voor de voedingsmodule.
//
// Alleen lezen uit het schema en uit Strava: voeding schrijft nooit in
// training_workouts of strava_activities. De rekenregels staan in
// src/lib/nutrition; hier komen alleen de rijen vandaan.

import type { Viewer } from "../_data";
import { shiftDayKey } from "@/lib/training/mobility";
import { getWellnessSummary } from "@/lib/training/wellness";
import { plannedSessions, ridesOnDay, type Recipe } from "@/lib/nutrition/recipes";
import type { NutritionDayInput } from "@/lib/nutrition/tips";
import { ageFromBirthDate, portionEnergyFactor } from "@/lib/nutrition/targets";

export { requireViewer, todayKeyAmsterdam } from "../_data";
export type { Viewer } from "../_data";

const FOOD_COLUMNS =
  "id, nevo_code, name_nl, quantity_unit, kcal, carbs_g, sugars_g, protein_g, fat_g, fiber_g, sodium_mg";

const RECIPE_COLUMNS = `id, slug, title, meal_moment, fuel_profile, diet_tags, servings, prep_minutes, steps_md, is_standard, owner_id, ingredients:nutrition_recipe_ingredients(id, sort_order, grams, role, food:nutrition_foods(${FOOD_COLUMNS}))`;

export type NutritionProfile = {
  weightKg: number | null;
  heightCm: number | null;
  sex: string | null;
  ageYears: number | null;
};

export async function loadNutritionProfile(viewer: Viewer, today: string): Promise<NutritionProfile> {
  const [{ data: profile }, { data: own }] = await Promise.all([
    viewer.supabase
      .from("profiles")
      .select("weight_kg, sex, birth_date")
      .eq("id", viewer.user.id)
      .maybeSingle(),
    viewer.supabase
      .from("nutrition_profiles")
      .select("height_cm")
      .eq("profile_id", viewer.user.id)
      .maybeSingle(),
  ]);
  const weight = profile?.weight_kg == null ? null : Number(profile.weight_kg);
  return {
    weightKg: weight && weight > 0 ? weight : null,
    heightCm: own?.height_cm == null ? null : Number(own.height_cm),
    sex: (profile?.sex as string | null) ?? null,
    ageYears: ageFromBirthDate((profile?.birth_date as string | null) ?? null, today),
  };
}

export function energyFactorFor(profile: NutritionProfile): number {
  if (!profile.weightKg) return 1;
  return portionEnergyFactor({
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    ageYears: profile.ageYears,
    sex: profile.sex,
  });
}

function normalizeRecipe(row: Recipe): Recipe {
  return {
    ...row,
    diet_tags: row.diet_tags ?? [],
    ingredients: [...(row.ingredients ?? [])]
      .map((item) => ({ ...item, grams: Number(item.grams) }))
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}

/** Clubrecepten plus de eigen recepten; RLS filtert al op wat dit lid mag zien. */
export async function loadRecipes(viewer: Viewer): Promise<Recipe[]> {
  const { data } = await viewer.supabase.from("nutrition_recipes").select(RECIPE_COLUMNS);
  return ((data ?? []) as unknown as Recipe[])
    .map(normalizeRecipe)
    .sort(
      (a, b) =>
        Number(b.is_standard) - Number(a.is_standard) || a.title.localeCompare(b.title, "nl"),
    );
}

export async function loadRecipeBySlug(viewer: Viewer, slug: string): Promise<Recipe | null> {
  const { data } = await viewer.supabase
    .from("nutrition_recipes")
    .select(RECIPE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  return data ? normalizeRecipe(data as unknown as Recipe) : null;
}

/**
 * De dag zoals voeding hem ziet, voor de voedingspagina zelf. De Vandaag-pagina
 * bouwt dezelfde invoer uit de rijen die ze al heeft (zie NutritionTodayCard).
 */
export async function loadNutritionDayInput(
  viewer: Viewer,
  today: string,
  weightKg: number | null,
): Promise<NutritionDayInput> {
  const from = `${shiftDayKey(today, -1)}T00:00:00Z`;
  const to = `${shiftDayKey(today, 3)}T00:00:00Z`;

  const [workouts, proposals, rides, wellness] = await Promise.all([
    viewer.supabase
      .from("training_workouts")
      .select("scheduled_at, duration_minutes, intensity, status, plan_id")
      .eq("profile_id", viewer.user.id)
      .is("superseded_at", null)
      .gte("scheduled_at", from)
      .lt("scheduled_at", to),
    // Niet-toegepaste dagvoorstellen tellen niet, net als in loadMemberWorkouts.
    viewer.supabase
      .from("training_plans")
      .select("id")
      .eq("profile_id", viewer.user.id)
      .eq("status", "draft")
      .eq("adaptation_kind", "daily"),
    viewer.supabase
      .from("strava_activities")
      .select("start_date, moving_time_seconds")
      .eq("profile_id", viewer.user.id)
      .gte("start_date", from)
      .lt("start_date", to),
    getWellnessSummary(viewer.supabase, viewer.user.id, 45).catch(() => null),
  ]);

  const proposalIds = new Set((proposals.data ?? []).map((plan) => plan.id as string));
  const rows = (workouts.data ?? []).filter((row) => !proposalIds.has(row.plan_id as string)) as {
    scheduled_at: string;
    duration_minutes: number | null;
    intensity: string | null;
    status: string | null;
  }[];

  return {
    today,
    weightKg,
    ...plannedSessions(rows, today),
    ridesToday: ridesOnDay(
      (rides.data ?? []) as { start_date: string; moving_time_seconds: number | null }[],
      today,
    ),
    wellnessState: wellness?.state ?? null,
  };
}
