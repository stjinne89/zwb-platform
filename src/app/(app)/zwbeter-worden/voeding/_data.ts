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
import type { LoggedMeal } from "@/lib/nutrition/log";
import { productLabel, type NutritionProduct } from "@/lib/nutrition/products";
import { RECIPE_PREFS, type RecipePref, type RecipePrefs } from "@/lib/nutrition/menu";
import { ageFromBirthDate, portionEnergyFactor } from "@/lib/nutrition/targets";
import { householdFromRow, type Household } from "@/lib/nutrition/shopping";
import type { MenuChoice } from "@/lib/nutrition/plan";
import { MEAL_MOMENTS, type MealMoment } from "@/lib/nutrition/targets";

export { requireViewer, todayKeyAmsterdam } from "../_data";
export type { Viewer } from "../_data";

// De kolommen van vóór 0213. Zolang die migratie niet is toegepast vraagt de app
// alleen deze op; de labels en de bronvermelding blijven dan leeg.
const BASE_FOOD_COLUMNS =
  "id, nevo_code, name_nl, quantity_unit, kcal, carbs_g, sugars_g, protein_g, fat_g, fiber_g, sodium_mg";
const BASE_RECIPE_COLUMNS =
  "id, slug, title, meal_moment, fuel_profile, diet_tags, servings, prep_minutes, steps_md, is_standard, owner_id";

const FOOD_COLUMNS = `${BASE_FOOD_COLUMNS}, food_group, calcium_mg, iron_mg, magnesium_mg, zinc_mg, vitamin_d_ug, vitamin_c_mg, epa_g, dha_g`;

/**
 * 2: met delen onder leden (0264), 1: met bron en voorstellen (0213), 0: de
 * kolommen van 0168. Zo werkt de pagina ook zolang een migratie ontbreekt.
 */
type ColumnLevel = 0 | 1 | 2;

function recipeColumns(level: ColumnLevel) {
  const sharing =
    level >= 2 ? ", visibility, show_owner, image_url, sharer:profiles!owner_id(display_name, avatar_url)" : "";
  const recipe =
    level >= 1
      ? `${BASE_RECIPE_COLUMNS}, source_name, source_url, share_status, contributor:profiles!contributed_by(display_name)${sharing}`
      : BASE_RECIPE_COLUMNS;
  return `${recipe}, ingredients:nutrition_recipe_ingredients(id, sort_order, grams, role, food:nutrition_foods(${level >= 1 ? FOOD_COLUMNS : BASE_FOOD_COLUMNS}))`;
}

/** Dezelfde query met minder kolommen zolang de select faalt. */
async function withColumnFallback<T>(
  run: (columns: string) => PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T | null> {
  for (const level of [2, 1, 0] as const) {
    const { data, error } = await run(recipeColumns(level));
    if (!error) return data;
  }
  return null;
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

/** Wie er meeëet, voor het boodschappenlijstje. Alle kolommen: zo werkt dit ook zolang 0259 er niet is. */
export async function loadHousehold(viewer: Viewer): Promise<Household> {
  const { data } = await viewer.supabase
    .from("nutrition_profiles")
    .select("*")
    .eq("profile_id", viewer.user.id)
    .maybeSingle();
  return householdFromRow(data);
}

/** Zelf gekozen recepten in het menu, van `from` tot en met `to`. Leeg zolang 0261 er niet is. */
export async function loadMenuChoices(viewer: Viewer, from: string, to: string): Promise<MenuChoice[]> {
  const { data } = await viewer.supabase
    .from("nutrition_menu_choices")
    .select("day, meal_moment, recipe_id")
    .eq("profile_id", viewer.user.id)
    .gte("day", from)
    .lte("day", to);
  return ((data ?? []) as { day: string; meal_moment: string; recipe_id: string }[])
    .filter((row) => (MEAL_MOMENTS as readonly string[]).includes(row.meal_moment))
    .map((row) => ({ day: row.day, moment: row.meal_moment as MealMoment, recipeId: row.recipe_id }));
}

function normalizeRecipe(row: Recipe, viewerId: string): Recipe {
  const visibility = row.visibility ?? "prive";
  const showOwner = Boolean(row.show_owner) && visibility === "leden";
  const own = !row.is_standard && row.owner_id === viewerId;
  return {
    ...row,
    source_name: row.source_name ?? null,
    source_url: row.source_url ?? null,
    share_status: row.share_status ?? null,
    contributor: row.contributor ?? null,
    visibility,
    show_owner: showOwner,
    image_url: row.image_url ?? null,
    // De join levert de maker altijd; zonder toestemming gaat hij hier al weg.
    sharer: showOwner || own ? (row.sharer ?? null) : null,
    from_member: !row.is_standard && row.owner_id !== viewerId,
    diet_tags: row.diet_tags ?? [],
    ingredients: [...(row.ingredients ?? [])]
      .map((item) => ({ ...item, grams: Number(item.grams) }))
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}

/**
 * Clubrecepten, de eigen recepten en wat andere leden delen; RLS filtert al op
 * wat dit lid mag zien. Een voorstel dat een beoordelaar ziet, telt niet mee.
 */
export async function loadRecipes(viewer: Viewer): Promise<Recipe[]> {
  const data = await withColumnFallback((columns) => viewer.supabase.from("nutrition_recipes").select(columns));
  return ((data ?? []) as unknown as Recipe[])
    .map((row) => normalizeRecipe(row, viewer.user.id))
    .filter((recipe) => !recipe.from_member || recipe.visibility === "leden")
    .sort(
      (a, b) =>
        Number(b.is_standard) - Number(a.is_standard) || a.title.localeCompare(b.title, "nl"),
    );
}

export async function loadRecipeBySlug(viewer: Viewer, slug: string): Promise<Recipe | null> {
  const data = await withColumnFallback((columns) =>
    viewer.supabase.from("nutrition_recipes").select(columns).eq("slug", slug).maybeSingle(),
  );
  return data ? normalizeRecipe(data as unknown as Recipe, viewer.user.id) : null;
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
    .select(`${recipeColumns(1)}, owner:profiles!owner_id(display_name)`)
    .eq("share_status", "voorgesteld")
    .order("updated_at", { ascending: true });
  return ((data ?? []) as unknown as (Recipe & { owner: { display_name: string | null } | null })[]).map((row) => ({
    ...normalizeRecipe(row, viewer.user.id),
    owner_name: row.owner?.display_name ?? null,
  }));
}

export type LogSettings = {
  paused: boolean;
  /** Tekst herkennen staat aan (0234). */
  recognition: boolean;
  /** De eigen trainer mag meekijken (0235). */
  trainerVisible: boolean;
  /** Herinneringen staan aan (0235). */
  reminders: boolean;
};

/** Null als het lid het eetdagboek niet heeft aangezet, of zolang 0231 er niet is. */
export async function loadLogSettings(viewer: Viewer, profileId = viewer.user.id): Promise<LogSettings | null> {
  // Alle kolommen: zo werkt dit voor en na de migraties die er kolommen bij zetten.
  const { data } = await viewer.supabase
    .from("nutrition_log_settings")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!data) return null;
  return {
    paused: Boolean(data.paused),
    recognition: data.ai_consent_at != null,
    trainerVisible: Boolean(data.trainer_visible),
    reminders: Boolean(data.reminders),
  };
}

/** Heeft dit lid een actieve trainer? Alleen dan heeft meekijken zin. */
export async function hasActiveTrainer(viewer: Viewer): Promise<boolean> {
  const { count } = await viewer.supabase
    .from("training_coach_assignments")
    .select("trainer_id", { count: "exact", head: true })
    .eq("athlete_id", viewer.user.id)
    .eq("status", "active");
  return (count ?? 0) > 0;
}

type LoggedMealRow = {
  id: string;
  eaten_on: string;
  meal_moment: LoggedMeal["moment"];
  source: LoggedMeal["source"];
  recipe_id: string | null;
  title: string;
  items:
    | {
        sort_order: number;
        grams: number;
        food: LoggedMeal["items"][number]["food"] | null;
        product: (NutritionProduct & { carbs_g: number | null; protein_g: number | null }) | null;
      }[]
    | null;
};

const LOG_ITEM_COLUMNS =
  "sort_order, grams, food:nutrition_foods(id, name_nl, quantity_unit, carbs_g, protein_g)";
const LOG_MEAL_COLUMNS = "id, eaten_on, meal_moment, source, recipe_id, title";

function logMealColumns(withProducts: boolean) {
  const product = withProducts
    ? ", product:nutrition_products(barcode, name, brand, quantity_unit, carbs_g, protein_g, serving_g)"
    : "";
  return `${LOG_MEAL_COLUMNS}, items:nutrition_log_items(${LOG_ITEM_COLUMNS}${product})`;
}

/** De maaltijden van dit lid in een reeks dagen, van nieuw naar oud. */
export async function loadLoggedMeals(
  viewer: Viewer,
  from: string,
  to: string,
  profileId = viewer.user.id,
): Promise<LoggedMeal[]> {
  const query = (withProducts: boolean) =>
    viewer.supabase
      .from("nutrition_log_meals")
      .select(logMealColumns(withProducts))
      .eq("profile_id", profileId)
      .gte("eaten_on", from)
      .lte("eaten_on", to)
      .order("eaten_on", { ascending: false })
      .order("created_at", { ascending: false });
  // Zolang 0233 er niet is, bestaan de barcodeproducten nog niet.
  let { data, error } = await query(true);
  if (error) ({ data, error } = await query(false));
  return ((data ?? []) as unknown as LoggedMealRow[]).map(toLoggedMeal);
}

function toLoggedMeal(row: LoggedMealRow): LoggedMeal {
  return {
    id: row.id,
    eatenOn: row.eaten_on,
    moment: row.meal_moment,
    source: row.source,
    recipeId: row.recipe_id,
    title: row.title,
    items: [...(row.items ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((item): LoggedMeal["items"] => {
        if (item.food) return [{ kind: "nevo", food: item.food, grams: Number(item.grams) }];
        if (!item.product) return [];
        return [
          {
            kind: "product",
            food: {
              id: item.product.barcode,
              name_nl: productLabel(item.product),
              quantity_unit: item.product.quantity_unit,
              carbs_g: item.product.carbs_g,
              protein_g: item.product.protein_g,
            },
            grams: Number(item.grams),
          },
        ];
      }),
  };
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
  const inputs = await loadNutritionDayInputs(viewer, [today], weightKg);
  return inputs.get(today)!;
}

/**
 * Dezelfde invoer voor meerdere dagen in één keer, voor het weekoverzicht van
 * Naleving. Het herstel (wellness) is dat van nu; het dagtype hangt er niet van af.
 */
export async function loadNutritionDayInputs(
  viewer: Viewer,
  days: string[],
  weightKg: number | null,
  profileId = viewer.user.id,
): Promise<Map<string, NutritionDayInput>> {
  const sorted = [...days].sort();
  const from = `${shiftDayKey(sorted[0], -1)}T00:00:00Z`;
  const to = `${shiftDayKey(sorted[sorted.length - 1], 3)}T00:00:00Z`;

  const [workouts, proposals, rides, wellness] = await Promise.all([
    viewer.supabase
      .from("training_workouts")
      .select("scheduled_at, duration_minutes, intensity, status, plan_id")
      .eq("profile_id", profileId)
      .is("superseded_at", null)
      .gte("scheduled_at", from)
      .lt("scheduled_at", to),
    // Niet-toegepaste dagvoorstellen tellen niet, net als in loadMemberWorkouts.
    viewer.supabase
      .from("training_plans")
      .select("id")
      .eq("profile_id", profileId)
      .eq("status", "draft")
      .eq("adaptation_kind", "daily"),
    viewer.supabase
      .from("strava_activities")
      .select("start_date, moving_time_seconds")
      .eq("profile_id", profileId)
      .gte("start_date", from)
      .lt("start_date", to),
    getWellnessSummary(viewer.supabase, profileId, 45).catch(() => null),
  ]);

  const proposalIds = new Set((proposals.data ?? []).map((plan) => plan.id as string));
  const rows = (workouts.data ?? []).filter((row) => !proposalIds.has(row.plan_id as string)) as {
    scheduled_at: string;
    duration_minutes: number | null;
    intensity: string | null;
    status: string | null;
  }[];

  const rideRows = (rides.data ?? []) as { start_date: string; moving_time_seconds: number | null }[];
  return new Map(
    days.map((day) => [
      day,
      {
        today: day,
        weightKg,
        ...plannedSessions(rows, day),
        ridesToday: ridesOnDay(rideRows, day),
        wellnessState: wellness?.state ?? null,
      },
    ]),
  );
}
