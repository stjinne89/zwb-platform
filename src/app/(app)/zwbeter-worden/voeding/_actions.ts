"use server";

// Acties voor de voedingsmodule: eigen recepten bewaren, verwijderen en met de
// club delen, een voorkeur per recept, en voedingsmiddelen zoeken voor het
// receptformulier. Clubrecepten komen uit de seed-migratie of uit een gedeeld
// recept dat is goedgekeurd; een formulier om ze te bewerken is er bewust niet.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { INGREDIENT_ROLES, type IngredientRole } from "@/lib/nutrition/scale";
import { DIET_TAGS, FUEL_PROFILES } from "@/lib/nutrition/labels";
import { MEAL_MOMENTS } from "@/lib/nutrition/targets";
import { RECIPE_PREFS } from "@/lib/nutrition/menu";
import { foodSearchTokens } from "@/lib/nutrition/food-search";
import { queryFoods, type FoodOption } from "@/lib/nutrition/food-query";
import { RECIPE_VISIBILITIES, type RecipeVisibility } from "@/lib/nutrition/recipes";
import { SWEAT_CONSENT_VERSION, SWEAT_SETTINGS, sweatRate } from "@/lib/nutrition/sweat";

export type { FoodOption } from "@/lib/nutrition/food-query";

type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_INGREDIENTS = 30;

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

/** Alleen een geldige https-link; de kolommen staan niets anders toe (0213, 0264). */
function httpsUrl(value: string): string | null {
  if (!value || value.length > 1000) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

async function currentUser() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) throw new Error("Niet ingelogd.");
  return { supabase, user: access.user, access };
}

function refresh() {
  revalidatePath("/zwbeter-worden/voeding", "layout");
  revalidatePath("/zwbeter-worden");
}

/** Zoeken in NEVO voor het receptformulier. */
export async function searchFoods(query: string): Promise<FoodOption[]> {
  if (foodSearchTokens(query).length === 0) return [];
  const { supabase } = await currentUser();
  return queryFoods(supabase, query);
}

type IngredientInput = { food_id: string; grams: number; role: IngredientRole };

function parseIngredients(raw: string): IngredientInput[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const items = parsed.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        food_id: String(row.food_id ?? ""),
        grams: Number(row.grams),
        role: String(row.role ?? "") as IngredientRole,
      };
    });
    const valid = items.every(
      (item) =>
        item.food_id &&
        Number.isFinite(item.grams) &&
        item.grams > 0 &&
        item.grams <= 5000 &&
        (INGREDIENT_ROLES as readonly string[]).includes(item.role),
    );
    return valid ? items : null;
  } catch {
    return null;
  }
}

/**
 * Een eigen recept aanmaken of bijwerken. Bij bijwerken gaan de ingrediënten
 * er in zijn geheel uit en opnieuw in: volgorde en rollen zijn zo altijd
 * precies wat het formulier toont.
 */
export async function saveOwnRecipe(formData: FormData): Promise<ActionResult> {
  const title = text(formData.get("title"));
  if (!title) return { ok: false, error: "Geef je recept een naam." };
  if (title.length > 120) return { ok: false, error: "De naam is te lang." };

  const mealMoment = text(formData.get("meal_moment"));
  if (!(MEAL_MOMENTS as readonly string[]).includes(mealMoment)) {
    return { ok: false, error: "Kies een moment." };
  }
  const fuelProfile = text(formData.get("fuel_profile"));
  if (!(FUEL_PROFILES as readonly string[]).includes(fuelProfile)) return { ok: false, error: "Kies een profiel." };

  const servings = Math.round(Number(text(formData.get("servings"))));
  if (!Number.isFinite(servings) || servings < 1 || servings > 20) {
    return { ok: false, error: "Het aantal porties moet tussen 1 en 20 liggen." };
  }
  const prepRaw = text(formData.get("prep_minutes"));
  const prepMinutes = prepRaw ? Math.round(Number(prepRaw)) : null;
  if (prepMinutes != null && (!Number.isFinite(prepMinutes) || prepMinutes < 0 || prepMinutes > 600)) {
    return { ok: false, error: "De bereidingstijd moet tussen 0 en 600 minuten liggen." };
  }

  const dietTags = DIET_TAGS.filter((tag) => formData.get(`diet_${tag}`) === "on");
  const ingredients = parseIngredients(text(formData.get("ingredients")));
  if (!ingredients || ingredients.length === 0) {
    return { ok: false, error: "Voeg minstens één ingrediënt met een hoeveelheid toe." };
  }
  if (ingredients.length > MAX_INGREDIENTS) {
    return { ok: false, error: `Hooguit ${MAX_INGREDIENTS} ingrediënten.` };
  }

  const { supabase, user } = await currentUser();

  const foodIds = [...new Set(ingredients.map((item) => item.food_id))];
  const { data: foods, error: foodError } = await supabase
    .from("nutrition_foods")
    .select("id")
    .in("id", foodIds);
  if (foodError) return { ok: false, error: foodError.message };
  if ((foods ?? []).length !== foodIds.length) {
    return { ok: false, error: "Een van de ingrediënten bestaat niet meer." };
  }

  const sourceUrl = httpsUrl(text(formData.get("source_url")));
  const sourceName = text(formData.get("source_name")).slice(0, 120) || (sourceUrl ? new URL(sourceUrl).hostname : "");
  const visibilityRaw = text(formData.get("visibility"));
  const visibility: RecipeVisibility = (RECIPE_VISIBILITIES as readonly string[]).includes(visibilityRaw)
    ? (visibilityRaw as RecipeVisibility)
    : "prive";

  const fields = {
    title,
    meal_moment: mealMoment,
    fuel_profile: fuelProfile,
    diet_tags: dietTags,
    servings,
    prep_minutes: prepMinutes,
    steps_md: text(formData.get("steps_md")).slice(0, 5000),
    source_name: sourceName || null,
    source_url: sourceUrl,
  };
  // Pas na 0264; zonder die migratie bewaart het formulier het recept privé.
  const sharing = {
    visibility,
    show_owner: visibility === "leden" && formData.get("show_owner") === "on",
    image_url: httpsUrl(text(formData.get("image_url"))),
  };
  const missingSharing = (error: { code?: string } | null) => error?.code === "PGRST204";

  const recipeId = text(formData.get("recipe_id"));
  let id: string;
  let slug: string;

  if (recipeId) {
    const update = (values: Record<string, unknown>) =>
      supabase
        .from("nutrition_recipes")
        .update(values)
        .eq("id", recipeId)
        .eq("owner_id", user.id)
        .eq("is_standard", false)
        .select("id, slug")
        .maybeSingle();
    let { data: updated, error } = await update({ ...fields, ...sharing });
    if (missingSharing(error)) ({ data: updated, error } = await update(fields));
    if (error) return { ok: false, error: error.message };
    if (!updated) return { ok: false, error: "Dit recept kun je niet wijzigen." };
    id = updated.id as string;
    slug = updated.slug as string;

    const { error: deleteError } = await supabase
      .from("nutrition_recipe_ingredients")
      .delete()
      .eq("recipe_id", id);
    if (deleteError) return { ok: false, error: deleteError.message };
  } else {
    const base = {
      ...fields,
      slug: `eigen-${user.id.slice(0, 8)}-${Date.now().toString(36)}`,
      is_standard: false,
      owner_id: user.id,
    };
    const insert = (values: Record<string, unknown>) =>
      supabase.from("nutrition_recipes").insert(values).select("id, slug").single();
    let { data: created, error } = await insert({ ...base, ...sharing });
    if (missingSharing(error)) ({ data: created, error } = await insert(base));
    if (error || !created) return { ok: false, error: error?.message ?? "Recept opslaan mislukt." };
    id = created.id as string;
    slug = created.slug as string;
  }

  const { error: itemsError } = await supabase.from("nutrition_recipe_ingredients").insert(
    ingredients.map((item, index) => ({
      recipe_id: id,
      food_id: item.food_id,
      sort_order: index,
      grams: item.grams,
      role: item.role,
    })),
  );
  if (itemsError) {
    // Een nieuw recept zonder ingrediënten is nutteloos; niet laten staan.
    if (!recipeId) await supabase.from("nutrition_recipes").delete().eq("id", id);
    return { ok: false, error: itemsError.message };
  }

  refresh();
  redirect(`/zwbeter-worden/voeding/recepten/${slug}`);
}

export async function deleteOwnRecipe(formData: FormData): Promise<ActionResult> {
  const recipeId = text(formData.get("recipe_id"));
  if (!recipeId) return { ok: false, error: "Geen recept opgegeven." };

  const { supabase, user } = await currentUser();
  const { error } = await supabase
    .from("nutrition_recipes")
    .delete()
    .eq("id", recipeId)
    .eq("owner_id", user.id)
    .eq("is_standard", false);
  if (error) return { ok: false, error: error.message };

  refresh();
  redirect("/zwbeter-worden/voeding/recepten");
}

/** Favoriet, "niet voor mij", of geen van beide (leeg). Alleen voor het lid zelf. */
/**
 * Onderweg tot 120 g per uur, na een afgeronde darmtraining (0272, stap 4 van
 * docs/ritvoeding-plan.md). Zonder afgeronde darmtraining rekent de app er niet
 * mee (gut-training.ts), dus aanzetten kan geen kwaad.
 */
export async function setRideCarbs120(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  const on = text(formData.get("on")) === "ja";
  const { error } = await supabase
    .from("nutrition_profiles")
    .upsert({ profile_id: user.id, ride_carbs_120: on }, { onConflict: "profile_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/zwbeter-worden", "layout");
  return { ok: true };
}

function decimal(value: FormDataEntryValue | null): number {
  const raw = text(value).replace(",", ".");
  return raw === "" ? Number.NaN : Number(raw);
}

/**
 * Een zweettest opslaan (0273). Het gewicht van voor en na rekent de app hier
 * om naar zweetverlies per uur en bewaart het niet (besluit 5). Zonder eerdere
 * test moet het lid eerst tekenen.
 */
export async function saveSweatTest(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  const { count } = await supabase
    .from("nutrition_sweat_tests")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id);
  if (!count && formData.get("consent") !== "ja") return { ok: false, error: "Vink de toestemming aan." };

  const testedOn = text(formData.get("tested_on"));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(testedOn) || testedOn > today) return { ok: false, error: "Kies een datum tot vandaag." };
  const setting = text(formData.get("setting"));
  if (!(SWEAT_SETTINGS as readonly string[]).includes(setting)) return { ok: false, error: "Kies binnen of buiten." };

  const durationMinutes = decimal(formData.get("duration_minutes"));
  const result = sweatRate({
    durationMinutes,
    weightBeforeKg: decimal(formData.get("weight_before")),
    weightAfterKg: decimal(formData.get("weight_after")),
    drankMl: decimal(formData.get("drank_ml")),
  });
  if (!result.ok) return { ok: false, error: result.reason };

  const { error } = await supabase.from("nutrition_sweat_tests").insert({
    profile_id: user.id,
    tested_on: testedOn,
    duration_minutes: Math.round(durationMinutes),
    sweat_ml_per_hour: result.mlPerHour,
    setting,
    warm: formData.get("warm") === "ja",
    consent_version: SWEAT_CONSENT_VERSION,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/zwbeter-worden", "layout");
  return { ok: true };
}

export async function deleteSweatTest(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  const { error } = await supabase
    .from("nutrition_sweat_tests")
    .delete()
    .eq("id", text(formData.get("id")))
    .eq("profile_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/zwbeter-worden", "layout");
  return { ok: true };
}

export async function setRecipePref(formData: FormData): Promise<ActionResult> {
  const recipeId = text(formData.get("recipe_id"));
  const pref = text(formData.get("pref"));
  if (!recipeId) return { ok: false, error: "Geen recept opgegeven." };

  const { supabase, user } = await currentUser();
  if (!pref) {
    const { error } = await supabase
      .from("nutrition_recipe_prefs")
      .delete()
      .eq("profile_id", user.id)
      .eq("recipe_id", recipeId);
    if (error) return { ok: false, error: error.message };
  } else {
    if (!(RECIPE_PREFS as readonly string[]).includes(pref)) return { ok: false, error: "Onbekende keuze." };
    const { error } = await supabase
      .from("nutrition_recipe_prefs")
      .upsert({ profile_id: user.id, recipe_id: recipeId, pref }, { onConflict: "profile_id,recipe_id" });
    if (error) return { ok: false, error: error.message };
  }

  refresh();
  return { ok: true };
}

/** Een eigen recept voorstellen aan de club, of het voorstel intrekken. */
export async function shareOwnRecipe(formData: FormData): Promise<ActionResult> {
  const recipeId = text(formData.get("recipe_id"));
  if (!recipeId) return { ok: false, error: "Geen recept opgegeven." };
  const share = text(formData.get("share")) === "1";

  const { supabase, user } = await currentUser();
  const { data, error } = await supabase
    .from("nutrition_recipes")
    .update({ share_status: share ? "voorgesteld" : null })
    .eq("id", recipeId)
    .eq("owner_id", user.id)
    .eq("is_standard", false)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Dit recept kun je niet delen." };

  refresh();
  return { ok: true };
}

function slugify(title: string) {
  return title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Een voorgesteld recept goedkeuren of afwijzen. Goedkeuren maakt er een
 * clubrecept van: het lid is dan geen eigenaar meer, zijn naam blijft staan.
 */
export async function reviewSharedRecipe(formData: FormData): Promise<ActionResult> {
  const recipeId = text(formData.get("recipe_id"));
  const approve = text(formData.get("decision")) === "goedkeuren";
  if (!recipeId) return { ok: false, error: "Geen recept opgegeven." };

  const { supabase, access } = await currentUser();
  if (!access.has("training.create_plans")) return { ok: false, error: "Geen rechten om recepten te beoordelen." };

  const { data: recipe, error: readError } = await supabase
    .from("nutrition_recipes")
    .select("id, title")
    .eq("id", recipeId)
    .eq("share_status", "voorgesteld")
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };
  if (!recipe) return { ok: false, error: "Dit recept staat niet meer open." };

  // Via de functie uit 0213: die controleert het recht zelf opnieuw.
  const { data: done, error } = await supabase.rpc("review_shared_nutrition_recipe", {
    p_recipe_id: recipeId,
    p_approve: approve,
    // De eigen slug begint met een stuk van het gebruikers-id; een clubrecept krijgt een gewone.
    p_slug: approve ? `${slugify(recipe.title as string) || "recept"}-${Date.now().toString(36)}` : null,
  });
  if (error) return { ok: false, error: error.message };
  if (!done) return { ok: false, error: "Dit recept staat niet meer open." };

  refresh();
  return { ok: true };
}
