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
import { compoundSplits, foodSearchTokens, rankFoods } from "@/lib/nutrition/food-search";

type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_INGREDIENTS = 30;
// Zoveel treffers ophalen voordat rankFoods er twintig uit kiest.
const SEARCH_POOL = 200;

export type FoodOption = {
  id: string;
  name_nl: string;
  quantity_unit: "g" | "ml";
  carbs_g: number | null;
  protein_g: number | null;
};

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
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
  const tokens = foodSearchTokens(query);
  if (tokens.length === 0) return [];
  const { supabase } = await currentUser();
  // % en _ zijn jokers in ilike; letterlijk zoeken.
  const pattern = (part: string) => `%${part.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
  const columns = "id, name_nl, quantity_unit, carbs_g, protein_g";

  // Elk woord moet in de naam staan, in welke volgorde ook.
  let search = supabase.from("nutrition_foods").select(columns);
  for (const token of tokens) search = search.ilike("name_nl", pattern(token));
  const { data } = await search.order("name_nl", { ascending: true }).limit(SEARCH_POOL);
  let rows = (data ?? []) as FoodOption[];

  // Niets bij één woord: een samenstelling als "chocolademelk" staat in NEVO als
  // "Melk chocolade-". Probeer elke knip in twee stukken, in één query.
  if (rows.length === 0 && tokens.length === 1) {
    const splits = compoundSplits(tokens[0]);
    if (splits.length > 0) {
      const { data: split } = await supabase
        .from("nutrition_foods")
        .select(columns)
        .or(
          splits
            .map(([head, tail]) => `and(name_nl.ilike.%${head}%,name_nl.ilike.%${tail}%)`)
            .join(","),
        )
        .order("name_nl", { ascending: true })
        .limit(SEARCH_POOL);
      rows = (split ?? []) as FoodOption[];
    }
  }
  return rankFoods(rows, tokens);
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

  const fields = {
    title,
    meal_moment: mealMoment,
    fuel_profile: fuelProfile,
    diet_tags: dietTags,
    servings,
    prep_minutes: prepMinutes,
    steps_md: text(formData.get("steps_md")).slice(0, 5000),
  };

  const recipeId = text(formData.get("recipe_id"));
  let id: string;
  let slug: string;

  if (recipeId) {
    const { data: updated, error } = await supabase
      .from("nutrition_recipes")
      .update(fields)
      .eq("id", recipeId)
      .eq("owner_id", user.id)
      .eq("is_standard", false)
      .select("id, slug")
      .maybeSingle();
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
    const { data: created, error } = await supabase
      .from("nutrition_recipes")
      .insert({
        ...fields,
        slug: `eigen-${user.id.slice(0, 8)}-${Date.now().toString(36)}`,
        is_standard: false,
        owner_id: user.id,
      })
      .select("id, slug")
      .single();
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
