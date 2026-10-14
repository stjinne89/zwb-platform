"use server";

// Acties voor het eetdagboek (Naleving): aanzetten met toestemming, pauzeren,
// wissen, en een maaltijd vastleggen uit een recept, uit NEVO of als herhaling.
// Een maaltijd is altijd een lijst NEVO-producten met grammen; de koolhydraten
// en het eiwit rekent src/lib/nutrition/log.ts daaruit.

import { revalidatePath } from "next/cache";
import { LOG_CONSENT_VERSION, parseLogDay, type LogSource } from "@/lib/nutrition/log";
import { normalizeBarcode, parseOffProduct, type NutritionProduct } from "@/lib/nutrition/products";
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

/** De eigen trainer laten meekijken, met een eigen toestemming; of dat weer intrekken. */
export async function setTrainerVisible(formData: FormData): Promise<ActionResult> {
  const on = text(formData.get("on")) === "1";
  if (on && formData.get("consent") !== "on") return { ok: false, error: "Vink de toestemming aan." };
  const viewer = await requireViewer();
  const { error } = await viewer.supabase
    .from("nutrition_log_settings")
    .update(on ? { trainer_visible: true, trainer_consent_at: new Date().toISOString() } : { trainer_visible: false })
    .eq("profile_id", viewer.user.id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function setReminders(formData: FormData): Promise<ActionResult> {
  const viewer = await requireViewer();
  const { error } = await viewer.supabase
    .from("nutrition_log_settings")
    .update({ reminders: text(formData.get("on")) === "1" })
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

/** Een NEVO-product (`food_id`) of een barcodeproduct (`barcode`). */
type ItemInput = { food_id?: string; barcode?: string; grams: number };

type MealInput = {
  day: string;
  moment: MealMoment;
  source: LogSource;
  recipeId: string | null;
  title: string;
  items: ItemInput[];
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
    // De kolom product_barcode gaat alleen mee als er een barcodeproduct in zit:
    // een maaltijd met alleen NEVO-producten werkt zo ook zonder 0232.
    meal.items.map((item, index) => ({
      meal_id: created.id,
      sort_order: index,
      grams: item.grams,
      ...(item.barcode ? { food_id: null, product_barcode: item.barcode } : { food_id: item.food_id }),
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

  // Het dagmenu stuurt de portie mee die het toont, ook als die is vergroot
  // (topUpMenu). Alleen ingrediënten van dit recept tellen.
  const shown = parseItems(text(formData.get("items")));
  if (shown) {
    const allowed = new Set(recipe.ingredients.map((item) => item.food.id));
    if (shown.length > 0 && shown.every((item) => item.food_id && allowed.has(item.food_id))) {
      return insertMeal(viewer, {
        day,
        moment: momentFrom(text(formData.get("moment"))) ?? recipe.meal_moment,
        source: "recept",
        recipeId: recipe.id,
        title: recipe.title,
        items: shown,
      });
    }
  }

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

function parseItems(raw: string): ItemInput[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const items = parsed.map((item): ItemInput => {
      const row = item as Record<string, unknown>;
      const barcode = row.barcode ? normalizeBarcode(String(row.barcode)) : null;
      return barcode
        ? { barcode, grams: Number(row.grams) }
        : { food_id: String(row.food_id ?? ""), grams: Number(row.grams) };
    });
    const valid = items.every(
      (item) =>
        (item.food_id || item.barcode) && Number.isFinite(item.grams) && item.grams > 0 && item.grams <= 5000,
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
  const foodIds = [...new Set(items.flatMap((item) => (item.food_id ? [item.food_id] : [])))];
  const barcodes = [...new Set(items.flatMap((item) => (item.barcode ? [item.barcode] : [])))];
  const names = new Map<string, string>();
  if (foodIds.length > 0) {
    const { data, error } = await viewer.supabase.from("nutrition_foods").select("id, name_nl").in("id", foodIds);
    if (error) return { ok: false, error: error.message };
    for (const food of data ?? []) names.set(food.id as string, food.name_nl as string);
  }
  if (barcodes.length > 0) {
    const { data, error } = await viewer.supabase
      .from("nutrition_products")
      .select("barcode, name")
      .in("barcode", barcodes);
    if (error) return { ok: false, error: error.message };
    for (const product of data ?? []) names.set(product.barcode as string, product.name as string);
  }
  if (names.size !== foodIds.length + barcodes.length) {
    return { ok: false, error: "Een van de producten bestaat niet meer." };
  }

  const fallback = items
    .slice(0, 2)
    .map((item) => names.get(item.barcode ?? item.food_id ?? ""))
    .join(", ");

  return insertMeal(viewer, {
    day: parseLogDay(text(formData.get("day")), todayKeyAmsterdam()),
    moment,
    // Herkend uit een foto of omschrijving, en daarna door het lid bevestigd.
    source: ["foto", "tekst"].includes(text(formData.get("source")))
      ? (text(formData.get("source")) as LogSource)
      : "handmatig",
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
    items: original.items.map((item) =>
      item.kind === "product"
        ? { barcode: item.food.id, grams: item.grams }
        : { food_id: item.food.id, grams: item.grams },
    ),
  });
}

export type BarcodeResult = { ok: true; product: NutritionProduct } | { ok: false; error: string };

const OFF_TIMEOUT_MS = 8000;

/**
 * Een verpakt product bij zijn barcode. Eerst de eigen tabel; anders Open Food
 * Facts, waarna het product bewaard wordt. Naar buiten gaat alleen de barcode.
 */
export async function lookupBarcode(raw: string): Promise<BarcodeResult> {
  const barcode = normalizeBarcode(raw);
  if (!barcode) return { ok: false, error: "Dit is geen barcode." };

  const viewer = await requireViewer();
  if (!(await loadLogSettings(viewer))) return { ok: false, error: "Zet eerst Naleving aan." };

  const { data: known } = await viewer.supabase
    .from("nutrition_products")
    .select("barcode, name, brand, quantity_unit, carbs_g, protein_g, serving_g")
    .eq("barcode", barcode)
    .maybeSingle();
  if (known && known.carbs_g != null && known.protein_g != null) {
    return {
      ok: true,
      product: {
        barcode,
        name: known.name as string,
        brand: (known.brand as string | null) ?? null,
        quantity_unit: known.quantity_unit as "g" | "ml",
        carbs_g: Number(known.carbs_g),
        protein_g: Number(known.protein_g),
        serving_g: known.serving_g == null ? null : Number(known.serving_g),
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);
  let body: unknown;
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,product_name_nl,brands,nutriments,serving_quantity,serving_quantity_unit`,
      // Open Food Facts vraagt om een herkenbare afzender.
      { headers: { "User-Agent": "ZWB-Platform/1.0 (eetdagboek)" }, signal: controller.signal },
    );
    if (res.status === 404) return { ok: false, error: "Dit product staat niet in Open Food Facts." };
    if (!res.ok) return { ok: false, error: "Open Food Facts is nu niet bereikbaar." };
    body = await res.json();
  } catch {
    return { ok: false, error: "Open Food Facts is nu niet bereikbaar." };
  } finally {
    clearTimeout(timeout);
  }

  const product = parseOffProduct(barcode, body);
  if (!product) return { ok: false, error: "Van dit product zijn geen koolhydraten en eiwit bekend." };

  const { error } = await viewer.admin
    .from("nutrition_products")
    .upsert({ ...product, fetched_at: new Date().toISOString() }, { onConflict: "barcode" });
  if (error) return { ok: false, error: error.message };
  return { ok: true, product };
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
