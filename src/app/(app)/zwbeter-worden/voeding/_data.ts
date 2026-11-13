// Dataophaal voor de voedingsmodule.
//
// Alleen lezen uit het schema en uit Strava: voeding schrijft nooit in
// training_workouts of strava_activities. De rekenregels staan in
// src/lib/nutrition; hier komen alleen de rijen vandaan.

import type { Viewer } from "../_data";
import { shiftDayKey } from "@/lib/training/mobility";
import { getWellnessSummary } from "@/lib/training/wellness";
import {
  plannedSessions,
  recipeIngredients,
  ridesOnDay,
  type Recipe,
  type RecipeIngredientDbRow,
} from "@/lib/nutrition/recipes";
import type { NutritionDayInput } from "@/lib/nutrition/tips";
import type { LoggedMeal } from "@/lib/nutrition/log";
import { PRODUCT_COLUMNS, productLabel, type NutritionProduct } from "@/lib/nutrition/products";
import { RECIPE_PREFS, rankRecipes, type RecipePref, type RecipePrefs } from "@/lib/nutrition/menu";
import { classifyFuelDay } from "@/lib/nutrition/day-type";
import { eventRide, isBidonRecipe, ridePlan, type RidePlan, type RidePlanInput } from "@/lib/nutrition/ride-plan";
import {
  eventWorkoutDefaults,
  outdoorRaceIntensityFactor,
  racePaceFor,
  zwiftRaceIntensityFactor,
  type ClubEventRow,
} from "@/lib/training/events";
import { durationMargin, durationRatios, withMargin } from "@/lib/nutrition/event-duration";
import { FORECAST_DAYS, eventSetting, seasonTemperature } from "@/lib/nutrition/event-fuel";
import { fetchWindForecast } from "@/lib/weather";
import {
  choiceFromRow,
  eventFuelPlanner,
  plannerPlanInput,
  type EventFuelPlanner,
  type PlannerChoice,
} from "@/lib/nutrition/event-planner";
import { eventFuelKey, loadEventFuelRows, loadSavedRideFuel } from "@/lib/nutrition/event-fuel-store";
import { GUT_PROTOCOLS, gutTrainingOn, type GutRun, type GutSource } from "@/lib/nutrition/gut-training";
import { currentSweatRate, type SweatSetting, type SweatTest } from "@/lib/nutrition/sweat";
import { ageFromBirthDate, portionEnergyFactor } from "@/lib/nutrition/targets";
import { householdFromRow, type Household } from "@/lib/nutrition/shopping";
import type { MenuChoice } from "@/lib/nutrition/plan";
import { MEAL_MOMENTS, type MealMoment } from "@/lib/nutrition/targets";
import { memberHiddenPlanIds } from "@/lib/training/member-hidden-plans";

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
 * 5: met de soort koolhydraten (0328), 4: met gram per schep (0305), 3: met barcodeproducten als ingrediënt (0276), 2: met delen onder leden
 * (0264), 1: met bron en voorstellen (0213), 0: de kolommen van 0168. Zo werkt
 * de pagina ook zolang een migratie ontbreekt.
 */
type ColumnLevel = 0 | 1 | 2 | 3 | 4 | 5;

function recipeColumns(level: ColumnLevel) {
  const sharing =
    level >= 2 ? ", visibility, show_owner, image_url, sharer:profiles!owner_id(display_name, avatar_url)" : "";
  const recipe =
    level >= 1
      ? `${BASE_RECIPE_COLUMNS}, source_name, source_url, share_status, contributor:profiles!contributed_by(display_name)${sharing}`
      : BASE_RECIPE_COLUMNS;
  const product = level >= 3 ? `, product:nutrition_products(${PRODUCT_COLUMNS})` : "";
  const scoop = level >= 4 ? ", scoop_g" : "";
  const mix = level >= 5 ? ", carb_mix" : "";
  return `${recipe}${mix}, ingredients:nutrition_recipe_ingredients(id, sort_order, grams, role${scoop}, food:nutrition_foods(${level >= 1 ? FOOD_COLUMNS : BASE_FOOD_COLUMNS})${product})`;
}

/** Dezelfde query met minder kolommen zolang de select faalt. */
async function withColumnFallback<T>(
  run: (columns: string) => PromiseLike<{ data: T | null; error: unknown }>,
  levels: readonly ColumnLevel[] = [5, 4, 3, 2, 1, 0],
): Promise<T | null> {
  for (const level of levels) {
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

type RecipeRow = Omit<Recipe, "ingredients"> & { ingredients: RecipeIngredientDbRow[] | null };

function normalizeRecipe(row: RecipeRow, viewerId: string): Recipe {
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
    ingredients: recipeIngredients(row.ingredients),
  };
}

/**
 * Clubrecepten, de eigen recepten en wat andere leden delen; RLS filtert al op
 * wat dit lid mag zien. Een voorstel dat een beoordelaar ziet, telt niet mee.
 */
export async function loadRecipes(viewer: Viewer, moment?: MealMoment): Promise<Recipe[]> {
  const data = await withColumnFallback((columns) => {
    const query = viewer.supabase.from("nutrition_recipes").select(columns);
    return moment ? query.eq("meal_moment", moment) : query;
  });
  return ((data ?? []) as unknown as RecipeRow[])
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
  return data ? normalizeRecipe(data as unknown as RecipeRow, viewer.user.id) : null;
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
  // Met de barcodeproducten (0276) als die er zijn; anders de kolommen van 0213.
  const data = await withColumnFallback(
    (columns) =>
      viewer.supabase
        .from("nutrition_recipes")
        .select(`${columns}, owner:profiles!owner_id(display_name)`)
        .eq("share_status", "voorgesteld")
        .order("updated_at", { ascending: true }),
    [3, 1],
  );
  return ((data ?? []) as unknown as (RecipeRow & { owner: { display_name: string | null } | null })[]).map((row) => ({
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

  const [workouts, proposals, rides, wellness, gut, sweatTests] = await Promise.all([
    viewer.supabase
      .from("training_workouts")
      .select("scheduled_at, duration_minutes, intensity, status, plan_id, event_id")
      .eq("profile_id", profileId)
      .is("superseded_at", null)
      .gte("scheduled_at", from)
      .lt("scheduled_at", to),
    // Niet-toegepaste dagvoorstellen en concepten van de trainer tellen niet,
    // net als in loadMemberWorkouts.
    memberHiddenPlanIds(viewer.supabase, [profileId]),
    viewer.supabase
      .from("strava_activities")
      .select("start_date, moving_time_seconds")
      .eq("profile_id", profileId)
      .gte("start_date", from)
      .lt("start_date", to),
    getWellnessSummary(viewer.supabase, profileId, 45).catch(() => null),
    loadGutSource(viewer, profileId),
    loadSweatTests(viewer, profileId),
  ]);
  const sweatMlPerHour = currentSweatRate(sweatTests);

  const rows = (workouts.data ?? []).filter((row) => !proposals.has(row.plan_id as string)) as {
    scheduled_at: string;
    duration_minutes: number | null;
    intensity: string | null;
    status: string | null;
    event_id?: string | null;
  }[];
  // Een event in het schema met eigen keuzes (0329): het ritplan van die dag volgt die.
  const eventRows = rows.filter((row) => row.event_id && row.status !== "skipped");
  const savedFuel = await loadSavedRideFuel(
    viewer.supabase,
    [profileId],
    eventRows.map((row) => row.event_id as string),
  );
  const rideFuelOn = (day: string) => {
    const row = eventRows.find(
      (item) =>
        String(item.scheduled_at).slice(0, 10) === day && savedFuel.has(eventFuelKey(profileId, item.event_id as string)),
    );
    return row ? (savedFuel.get(eventFuelKey(profileId, row.event_id as string)) ?? null) : null;
  };

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
        gut: gutTrainingOn(gut, day),
        sweatMlPerHour,
        rideFuel: rideFuelOn(day),
      },
    ]),
  );
}

export type PlannedRide = {
  id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  intensity: string | null;
  status: string;
};

/** Krijgt deze training een ritplan: gepland, vandaag of later, en minstens een uur. */
export function ridePlanApplies(workout: PlannedRide, today: string): boolean {
  return (
    workout.status === "planned" &&
    String(workout.scheduled_at).slice(0, 10) >= today &&
    Number(workout.duration_minutes ?? 0) >= 60
  );
}

/**
 * Het ritplan per geplande training van vandaag of later, op training-id. Het
 * recept bij "Tijdens de rit" is wat het lid die dag zelf koos, anders het
 * beste; het andere soort (bidon of vast eten) volgt uit dezelfde rangorde als
 * het dagmenu.
 */
export async function loadRidePlans(
  viewer: Viewer,
  workouts: PlannedRide[],
  today: string,
): Promise<Map<string, RidePlan>> {
  const upcoming = workouts.filter((workout) => ridePlanApplies(workout, today));
  const inputs = await loadRideInputs(
    viewer,
    upcoming.map((workout) => ({
      id: workout.id,
      day: String(workout.scheduled_at).slice(0, 10),
      minutes: Number(workout.duration_minutes),
      intensity: workout.intensity,
    })),
    today,
  );
  const plans = new Map<string, RidePlan>();
  for (const [id, input] of inputs) {
    const plan = ridePlan(input);
    if (plan) plans.set(id, plan);
  }
  return plans;
}

type RideSlot = { id: string; day: string; minutes: number; intensity: string | null };

/**
 * Alles waar het ritplan mee rekent, per rit: de recepten (alleen de bidon en
 * het vaste eten die het plan kan kiezen, zodat dit ook naar de browser kan),
 * de darmtraining van die dag, de zweettest en het gewicht.
 */
async function loadRideInputs(viewer: Viewer, rides: RideSlot[], today: string): Promise<Map<string, RidePlanInput>> {
  const inputs = new Map<string, RidePlanInput>();
  if (rides.length === 0) return inputs;
  const days = rides.map((ride) => ride.day).sort();
  const [recipes, prefs, profile, choices, gutSource, sweatTests] = await Promise.all([
    loadRecipes(viewer, "tijdens_rit"),
    loadRecipePrefs(viewer),
    loadNutritionProfile(viewer, today),
    loadMenuChoices(viewer, days[0], days[days.length - 1]),
    loadGutSource(viewer),
    loadSweatTests(viewer),
  ]);
  const sweatMlPerHour = currentSweatRate(sweatTests);
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const energyFactor = energyFactorFor(profile);
  for (const ride of rides) {
    const { day, minutes, intensity } = ride;
    const dayType = classifyFuelDay([{ minutes, intensity }]);
    const gut = gutTrainingOn(gutSource, day);
    const ranked = rankRecipes(recipes, "tijdens_rit", {
      rider: { weightKg: profile.weightKg, energyFactor, dayType, rideMinutes: minutes, rideIntensity: intensity, rideGut: gut },
      dayType,
      tomorrowType: "rust",
      today: day,
      prefs,
      diet: null,
    }).map((item) => item.recipe);
    const choice = choices.find((row) => row.day === day && row.moment === "tijdens_rit");
    const chosen = choice ? byId.get(choice.recipeId) : undefined;
    // ridePlan kiest alleen de eerste bidon en het eerste vaste eten uit de rangorde.
    const firstDrink = ranked.find(isBidonRecipe);
    const firstFood = ranked.find((recipe) => !isBidonRecipe(recipe));
    inputs.set(ride.id, {
      minutes,
      intensity,
      gut,
      sweatMlPerHour,
      weightKg: profile.weightKg,
      ranked: [firstDrink, firstFood].filter((recipe): recipe is Recipe => recipe != null),
      lead: chosen ?? ranked[0] ?? null,
      leadChosen: Boolean(chosen),
      energyFactor,
    });
  }
  return inputs;
}

/**
 * De darmtraining van een lid: lopende en afgeronde runs, en of het zelf voor
 * 120 g per uur koos. Zonder kolom ride_carbs_120 (0272 niet toegepast) of zonder
 * leesrecht (een trainer op nutrition_profiles) telt de keuze als uit.
 */
export async function loadGutSource(viewer: Viewer, profileId = viewer.user.id): Promise<GutSource> {
  const [runs, own] = await Promise.all([
    viewer.supabase
      .from("member_protocols")
      .select("protocol_slug, start_date, status")
      .eq("profile_id", profileId)
      .in("protocol_slug", [...GUT_PROTOCOLS])
      .in("status", ["actief", "afgerond"]),
    viewer.supabase.from("nutrition_profiles").select("ride_carbs_120").eq("profile_id", profileId).maybeSingle(),
  ]);
  return {
    runs: ((runs.data ?? []) as { protocol_slug: string; start_date: string; status: GutRun["status"] }[]).map((row) => ({
      protocolSlug: row.protocol_slug,
      startDate: String(row.start_date).slice(0, 10),
      status: row.status,
    })),
    high: Boolean((own.data as { ride_carbs_120?: boolean } | null)?.ride_carbs_120),
  };
}

/**
 * De eigen zweettests, nieuwste eerst (0273). Leeg zolang de migratie er niet is
 * of voor een trainer: alleen het lid zelf leest ze.
 */
export async function loadSweatTests(viewer: Viewer, profileId = viewer.user.id): Promise<SweatTest[]> {
  const { data } = await viewer.supabase
    .from("nutrition_sweat_tests")
    .select("id, tested_on, duration_minutes, sweat_ml_per_hour, setting, warm")
    .eq("profile_id", profileId)
    .order("tested_on", { ascending: false })
    .limit(20);
  return ((data ?? []) as {
    id: string;
    tested_on: string;
    duration_minutes: number;
    sweat_ml_per_hour: number;
    setting: SweatSetting;
    warm: boolean;
  }[]).map((row) => ({
    id: row.id,
    testedOn: String(row.tested_on).slice(0, 10),
    durationMinutes: Number(row.duration_minutes),
    mlPerHour: Number(row.sweat_ml_per_hour),
    setting: row.setting,
    warm: Boolean(row.warm),
  }));
}

export type EventRidePlan = {
  plan: RidePlan;
  /** Dag waarop koolhydraten laden begint; null als dat niet past (korter dan 90 minuten, geen wedstrijd). */
  loadFrom: string | null;
  /** Twee dagen voor het event: daar begint laden als de balans erom vraagt. */
  loadDay: string;
  /** Wat de knop en de schuifjes nodig hebben om in de browser opnieuw te rekenen; null zonder plan om aan te passen. */
  planner: EventFuelPlanner | null;
  /** De eigen keuzes die het lid voor dit event bewaarde (0329); null: het advies. */
  saved: PlannerChoice | null;
};

/** De laadfase van het protocol begint twee dagen voor de wedstrijd. */
const LOADING_DAYS_BEFORE = 2;

/**
 * De temperatuur halverwege een event buiten (stap 6 van
 * docs/eventvoeding-plan.md): binnen een week de verwachting van Open-Meteo op
 * het startpunt, anders de seizoenswaarde. Null binnen.
 */
async function eventTemperature(
  viewer: Viewer,
  event: ClubEventRow,
  day: string,
  today: string,
  minutes: number,
): Promise<number | null> {
  if (eventSetting(event.type) === "binnen") return null;
  const season = seasonTemperature(day);
  if (day > shiftDayKey(today, FORECAST_DAYS)) return season;
  const { data } = await viewer.supabase.from("events").select("start_lat, start_lon").eq("id", event.id).maybeSingle();
  const lat = Number((data as { start_lat?: number | null } | null)?.start_lat);
  const lon = Number((data as { start_lon?: number | null } | null)?.start_lon);
  if (!data || !Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return season;
  const midRide = new Date(new Date(event.start_at).getTime() + (minutes / 2) * 60_000);
  const forecast = await fetchWindForecast(lat, lon, midRide).catch(() => null);
  return forecast?.temperatureC != null && Number.isFinite(forecast.temperatureC) ? forecast.temperatureC : season;
}

/** Zo ver terug tellen je eigen events mee voor de marge op de duur. */
const OWN_RATIO_DAYS = 365;

/**
 * Gereden / gepland voor je eigen events van dit type in het afgelopen jaar
 * (stap 5 van docs/eventvoeding-plan.md): de geplande eventtraining naast de rit
 * van die dag. Leeg bij een fout: dan geldt de clubwaarde.
 */
async function loadOwnDurationRatios(viewer: Viewer, eventType: string, today: string): Promise<number[]> {
  const from = `${shiftDayKey(today, -OWN_RATIO_DAYS)}T00:00:00Z`;
  const to = `${today}T00:00:00Z`;
  const [planned, rides] = await Promise.all([
    viewer.supabase
      .from("training_workouts")
      .select("scheduled_at, duration_minutes, events!inner(type)")
      .eq("profile_id", viewer.user.id)
      .eq("events.type", eventType)
      .is("superseded_at", null)
      .neq("status", "skipped")
      .gte("scheduled_at", from)
      .lt("scheduled_at", to),
    viewer.supabase
      .from("strava_activities")
      .select("start_date, moving_time_seconds")
      .eq("profile_id", viewer.user.id)
      .is("training_excluded_at", null)
      .gte("start_date", from)
      .lt("start_date", to),
  ]);
  if (planned.error || rides.error) return [];
  return durationRatios(
    ((planned.data ?? []) as { scheduled_at: string; duration_minutes: number | null }[]).map((row) => ({
      day: String(row.scheduled_at).slice(0, 10),
      minutes: Number(row.duration_minutes ?? 0),
    })),
    ((rides.data ?? []) as { start_date: string; moving_time_seconds: number | null }[]).map((row) => ({
      day: String(row.start_date).slice(0, 10),
      minutes: Number(row.moving_time_seconds ?? 0) / 60,
    })),
  );
}

/**
 * Het ritplan voor een event, voor wie het bekijkt (stap 2b van
 * docs/ritvoeding-plan.md). De duur komt uit het eigen pacingplan, dan uit de
 * eigen training voor dit event in het schema, en anders uit dezelfde schatting
 * als het schema (eventWorkoutDefaults, met je eigen racefactor). Zonder
 * pacingplan rekent het plan met een marge op die duur (event-duration.ts). Het doel per uur en het vocht volgen
 * het advies van docs/eventvoeding-plan.md; de knop en de schuifjes rekenen
 * daarna in de browser verder. Null voor een event dat voorbij is.
 */
export async function loadEventRidePlan(
  viewer: Viewer,
  event: ClubEventRow,
  today: string,
): Promise<EventRidePlan | null> {
  const day = new Date(event.start_at).toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
  if (day < today) return null;
  const racePace = await racePaceFor(
    viewer.supabase as unknown as Parameters<typeof racePaceFor>[0],
    viewer.user.id,
    [event],
  ).catch(() => 1);
  const defaults = eventWorkoutDefaults(event, { racePace });
  const [pacing, { data: workout }, { data: power }, fuelRows, ownRatios] = await Promise.all([
    import("@/lib/pacing/session")
      .then(({ readOwnPlan }) => readOwnPlan(event.id, viewer.user.id))
      .catch(() => null),
    viewer.supabase
      .from("training_workouts")
      .select("duration_minutes, intensity")
      .eq("profile_id", viewer.user.id)
      .eq("event_id", event.id)
      .is("superseded_at", null)
      .neq("status", "skipped")
      .limit(1)
      .maybeSingle(),
    viewer.supabase.from("profiles").select("ftp_watts").eq("id", viewer.user.id).maybeSingle(),
    loadEventFuelRows(viewer.supabase, [viewer.user.id], [event.id]),
    loadOwnDurationRatios(viewer, event.type, today).catch(() => []),
  ]);
  const { minutes, intensity, longRace } = eventRide({
    pacedSeconds: pacing?.summary?.totalSeconds ?? null,
    workout: workout
      ? { minutes: workout.duration_minutes == null ? null : Number(workout.duration_minutes), intensity: workout.intensity }
      : null,
    estimate: { minutes: defaults.durationMinutes, intensity: defaults.intensity },
    eventType: event.type,
  });

  const pacedSeconds = pacing?.summary?.totalSeconds ?? 0;
  const margin = durationMargin({
    paced: pacedSeconds > 0,
    source: defaults.durationSource,
    eventType: event.type,
    ownRatios,
  });
  const planMinutes = withMargin(minutes, margin);

  const inputs = await loadRideInputs(viewer, [{ id: event.id, day, minutes: planMinutes, intensity }], today);
  const input = inputs.get(event.id);
  if (!input) return null;
  const summary = pacing?.summary;
  const ftp = Number((power as { ftp_watts?: number | null } | null)?.ftp_watts ?? 0);
  const setting = eventSetting(event.type);
  const temperatureC = await eventTemperature(viewer, event, day, today, planMinutes).catch(() => seasonTemperature(day));
  const planner = eventFuelPlanner({
    input,
    minutes,
    planMinutes,
    intensity,
    setting,
    raceIf: setting === "binnen" ? zwiftRaceIntensityFactor(minutes) : outdoorRaceIntensityFactor(minutes),
    pacing:
      summary && summary.avgWatts > 0 && summary.intensityFactor > 0
        ? { watts: summary.avgWatts, intensityFactor: summary.intensityFactor }
        : null,
    ftpWatts: ftp > 0 ? ftp : null,
    temperatureC,
  });
  const row = fuelRows.get(eventFuelKey(viewer.user.id, event.id));
  const saved = row ? choiceFromRow(planner, row) : null;
  const plan = ridePlan(plannerPlanInput(planner, saved ?? planner.defaults));
  if (!plan) return null;
  const loadDay = shiftDayKey(day, -LOADING_DAYS_BEFORE);
  return { plan, loadFrom: longRace ? loadDay : null, loadDay, planner, saved };
}
