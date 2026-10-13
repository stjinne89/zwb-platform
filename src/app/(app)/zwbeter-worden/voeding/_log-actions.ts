"use server";

// Acties voor het eetdagboek (Naleving): aanzetten met toestemming, pauzeren,
// wissen, en een maaltijd vastleggen uit een recept, uit NEVO of als herhaling.
// Een maaltijd is altijd een lijst NEVO-producten met grammen; de koolhydraten
// en het eiwit rekent src/lib/nutrition/log.ts daaruit.

import { revalidatePath } from "next/cache";
import { LOG_CONSENT_VERSION, parseLogDay, type LogSource } from "@/lib/nutrition/log";
import { portionForRider } from "@/lib/nutrition/recipes";
import { MEAL_MOMENTS, type MealMoment } from "@/lib/nutrition/targets";
import { nutritionDay } from "@/lib/nutrition/tips";
import {
  energyFactorFor,
  loadLogSettings,
  loadLoggedMeals,
  loadNutritionDayInput,
  loadNutritionProfile,
  loadRecipeBySlug,
  requireViewer,
  todayKeyAmsterdam,
  type Viewer,
} from "./_data";

type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_ITEMS = 30;

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function refresh() {
  revalidatePath("/zwbeter-worden/voeding", "layout");
}

function momentFrom(value: string): MealMoment | null {
  return (MEAL_MOMENTS as readonly string[]).includes(value) ? (value as MealMoment) : null;
}

/** Aanzetten kan alleen met het vinkje van de toestemming. */
export async function enableLog(formData: FormData): Promise<ActionResult> {
  if (formData.get("consent") !== "on") return { ok: false, error: "Vink de toestemming aan." };
  const viewer = await requireViewer();
  const { error } = await viewer.supabase.from("nutrition_log_settings").upsert(
    {
      profile_id: viewer.user.id,
      consent_version: LOG_CONSENT_VERSION,
      consented_at: new Date().toISOString(),
      paused: false,
    },
    { onConflict: "profile_id" },
  );
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function setLogPaused(formData: FormData): Promise<ActionResult> {
  const viewer = await requireViewer();
  const { error } = await viewer.supabase
    .from("nutrition_log_settings")
    .update({ paused: text(formData.get("paused")) === "1" })
    .eq("profile_id", viewer.user.id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Toestemming intrekken: de rij weg, en daarmee het hele eetdagboek (cascade in 0231). */
export async function deleteLog(): Promise<ActionResult> {
  const viewer = await requireViewer();
  const { error } = await viewer.supabase
    .from("nutrition_log_settings")
    .delete()
    .eq("profile_id", viewer.user.id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

type MealInput = {
  day: string;
  moment: MealMoment;
  source: LogSource;
  recipeId: string | null;
  title: string;
  items: { food_id: string; grams: number }[];
};

async function insertMeal(viewer: Viewer, meal: MealInput): Promise<ActionResult> {
  const settings = await loadLogSettings(viewer);
  if (!settings) return { ok: false, error: "Zet eerst Naleving aan." };
  if (settings.paused) return { ok: false, error: "Naleving staat op pauze." };
  if (meal.items.length === 0) return { ok: false, error: "Deze maaltijd heeft geen ingrediënten." };

  const { data: created, error } = await viewer.supabase
    .from("nutrition_log_meals")
    .insert({
      profile_id: viewer.user.id,
      eaten_on: meal.day,
      meal_moment: meal.moment,
      source: meal.source,
      recipe_id: meal.recipeId,
      title: meal.title.slice(0, 120),
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: error?.message ?? "Opslaan mislukt." };

  const { error: itemsError } = await viewer.supabase.from("nutrition_log_items").insert(
    meal.items.map((item, index) => ({
      meal_id: created.id,
      food_id: item.food_id,
      sort_order: index,
      grams: item.grams,
    })),
  );
  if (itemsError) {
    // Een maaltijd zonder inhoud telt als nul; niet laten staan.
    await viewer.supabase.from("nutrition_log_meals").delete().eq("id", created.id);
    return { ok: false, error: itemsError.message };
  }

  refresh();
  return { ok: true };
}

/**
 * Een recept als gegeten vastleggen, met de portie die het lid op dat moment
 * ziet: op maat van de dag, of de standaardportie.
 */
export async function logRecipe(formData: FormData): Promise<ActionResult> {
  const slug = text(formData.get("slug"));
  if (!slug) return { ok: false, error: "Geen recept opgegeven." };

  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();
  const day = parseLogDay(text(formData.get("day")), today);

  const [recipe, profile] = await Promise.all([
    loadRecipeBySlug(viewer, slug),
    loadNutritionProfile(viewer, day),
  ]);
  if (!recipe) return { ok: false, error: "Dit recept bestaat niet meer." };

  const personal = text(formData.get("portie")) !== "basis" && profile.weightKg != null;
  const fuelDay = personal ? nutritionDay(await loadNutritionDayInput(viewer, day, profile.weightKg)) : null;
  const portion = portionForRider(
    recipe,
    fuelDay
      ? {
          weightKg: profile.weightKg,
          energyFactor: energyFactorFor(profile),
          dayType: fuelDay.dayType,
          rideMinutes: fuelDay.rideMinutes,
        }
      : null,
  );

  return insertMeal(viewer, {
    day,
    moment: momentFrom(text(formData.get("moment"))) ?? recipe.meal_moment,
    source: "recept",
    recipeId: recipe.id,
    title: recipe.title,
    items: portion.ingredients
      .filter((item) => item.grams > 0)
      .map((item) => ({ food_id: item.food.id, grams: item.grams })),
  });
}

function parseItems(raw: string): { food_id: string; grams: number }[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const items = parsed.map((item) => {
      const row = item as Record<string, unknown>;
      return { food_id: String(row.food_id ?? ""), grams: Number(row.grams) };
    });
    const valid = items.every(
      (item) => item.food_id && Number.isFinite(item.grams) && item.grams > 0 && item.grams <= 5000,
    );
    return valid ? items : null;
  } catch {
    return null;
  }
}

/** Een maaltijd uit losse NEVO-producten. */
export async function logManualMeal(formData: FormData): Promise<ActionResult> {
  const moment = momentFrom(text(formData.get("moment")));
  if (!moment) return { ok: false, error: "Kies een moment." };
  const items = parseItems(text(formData.get("items")));
  if (!items || items.length === 0) return { ok: false, error: "Voeg minstens één product met een hoeveelheid toe." };
  if (items.length > MAX_ITEMS) return { ok: false, error: `Hooguit ${MAX_ITEMS} producten.` };

  const viewer = await requireViewer();
  const foodIds = [...new Set(items.map((item) => item.food_id))];
  const { data: foods, error } = await viewer.supabase
    .from("nutrition_foods")
    .select("id, name_nl")
    .in("id", foodIds);
  if (error) return { ok: false, error: error.message };
  if ((foods ?? []).length !== foodIds.length) return { ok: false, error: "Een van de producten bestaat niet meer." };

  const names = new Map((foods ?? []).map((food) => [food.id as string, food.name_nl as string]));
  const fallback = items
    .slice(0, 2)
    .map((item) => names.get(item.food_id))
    .join(", ");

  return insertMeal(viewer, {
    day: parseLogDay(text(formData.get("day")), todayKeyAmsterdam()),
    moment,
    source: "handmatig",
    recipeId: null,
    title: text(formData.get("title")) || fallback,
    items,
  });
}

/** Een eerdere maaltijd opnieuw vastleggen, met dezelfde hoeveelheden. */
export async function repeatMeal(formData: FormData): Promise<ActionResult> {
  const mealId = text(formData.get("meal_id"));
  if (!mealId) return { ok: false, error: "Geen maaltijd opgegeven." };

  const viewer = await requireViewer();
  const { data: row } = await viewer.supabase
    .from("nutrition_log_meals")
    .select("eaten_on")
    .eq("id", mealId)
    .eq("profile_id", viewer.user.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Deze maaltijd bestaat niet meer." };

  const eatenOn = row.eaten_on as string;
  const original = (await loadLoggedMeals(viewer, eatenOn, eatenOn)).find((meal) => meal.id === mealId);
  if (!original) return { ok: false, error: "Deze maaltijd bestaat niet meer." };

  return insertMeal(viewer, {
    day: parseLogDay(text(formData.get("day")), todayKeyAmsterdam()),
    moment: momentFrom(text(formData.get("moment"))) ?? original.moment,
    source: original.source,
    recipeId: original.recipeId,
    title: original.title,
    items: original.items.map((item) => ({ food_id: item.food.id, grams: item.grams })),
  });
}

export async function deleteLoggedMeal(formData: FormData): Promise<ActionResult> {
  const mealId = text(formData.get("meal_id"));
  if (!mealId) return { ok: false, error: "Geen maaltijd opgegeven." };

  const viewer = await requireViewer();
  const { error } = await viewer.supabase
    .from("nutrition_log_meals")
    .delete()
    .eq("id", mealId)
    .eq("profile_id", viewer.user.id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
