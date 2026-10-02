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
import { RECIPE_PREFS, type RecipePref, type RecipePrefs } from "@/lib/nutrition/menu";
import { ageFromBirthDate, portionEnergyFactor } from "@/lib/nutrition/targets";

export { requireViewer, todayKeyAmsterdam } from "../_data";
export type { Viewer } from "../_data";

// De kolommen van vóór 0213. Zolang die migratie niet is toegepast vraagt de app
// alleen deze op; de labels en de bronvermelding blijven dan leeg.
const BASE_FOOD_COLUMNS =
  "id, nevo_code, name_nl, quantity_unit, kcal, carbs_g, sugars_g, protein_g, fat_g, fiber_g, sodium_mg";
const BASE_RECIPE_COLUMNS =
  "id, slug, title, meal_moment, fuel_profile, diet_tags, servings, prep_minutes, steps_md, is_standard, owner_id";

const FOOD_COLUMNS = `${BASE_FOOD_COLUMNS}, food_group, calcium_mg, iron_mg, magnesium_mg, zinc_mg, vitamin_d_ug, vitamin_c_mg, epa_g, dha_g`;

function recipeColumns(expanded: boolean) {
  const recipe = expanded
    ? `${BASE_RECIPE_COLUMNS}, source_name, source_url, share_status, contributor:profiles!contributed_by(display_name)`
    : BASE_RECIPE_COLUMNS;
  return `${recipe}, ingredients:nutrition_recipe_ingredients(id, sort_order, grams, role, food:nutrition_foods(${expanded ? FOOD_COLUMNS : BASE_FOOD_COLUMNS}))`;
}

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
    source_name: row.source_name ?? null,
    source_url: row.source_url ?? null,
    share_status: row.share_status ?? null,
    contributor: row.contributor ?? null,
    diet_tags: row.diet_tags ?? [],
    ingredients: [...(row.ingredients ?? [])]
      .map((item) => ({ ...item, grams: Number(item.grams) }))
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}

/** Clubrecepten plus de eigen recepten; RLS filtert al op wat dit lid mag zien. */
export async function loadRecipes(viewer: Viewer): Promise<Recipe[]> {
  let { data, error } = await viewer.supabase.from("nutrition_recipes").select(recipeColumns(true));
  if (error) ({ data, error } = await viewer.supabase.from("nutrition_recipes").select(recipeColumns(false)));
  return ((data ?? []) as unknown as Recipe[])
    .map(normalizeRecipe)
    .sort(
      (a, b) =>
        Number(b.is_standard) - Number(a.is_standard) || a.title.localeCompare(b.title, "nl"),
    );
}

export async function loadRecipeBySlug(viewer: Viewer, slug: string): Promise<Recipe | null> {
  const query = (expanded: boolean) =>
    viewer.supabase.from("nutrition_recipes").select(recipeColumns(expanded)).eq("slug", slug).maybeSingle();
  let { data, error } = await query(true);
  if (error) ({ data, error } = await query(false));
  return data ? normalizeRecipe(data as unknown as Recipe) : null;
}

/** Favorieten en verborgen recepten van dit lid. Leeg zolang 0213 er niet is. */
export async function loadRecipePrefs(viewer: Viewer): Promise<RecipePrefs> {
  const { data } = await viewer.supabase
    .from("nutrition_recipe_prefs")
    .select("recipe_id, pref")
    .eq("profile_id", viewer.user.id);
  const prefs: RecipePrefs = new Map();
  for (const row of data ?? []) {
    const pref = row.pref as RecipePref;
    if ((RECIPE_PREFS as readonly string[]).includes(pref)) prefs.set(row.recipe_id as string, pref);
  }
  return prefs;
}

/** Recepten die leden met de club willen delen, voor wie schema's mag maken. */
export async function loadProposedRecipes(viewer: Viewer): Promise<(Recipe & { owner_name: string | null })[]> {
  const { data } = await viewer.supabase
    .from("nutrition_recipes")
    .select(`${recipeColumns(true)}, owner:profiles!owner_id(display_name)`)
    .eq("share_status", "voorgesteld")
    .order("updated_at", { ascending: true });
  return ((data ?? []) as unknown as (Recipe & { owner: { display_name: string | null } | null })[]).map((row) => ({
    ...normalizeRecipe(row),
    owner_name: row.owner?.display_name ?? null,
  }));
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
