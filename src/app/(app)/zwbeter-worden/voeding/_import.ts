// Een recept van een link als voorstel voor het formulier "Eigen recept". Het
// lezen van de pagina staat in lib/nutrition/recipe-import.ts; hier wordt elke
// ingrediëntregel aan een NEVO-product gekoppeld. Wat niet te koppelen is, komt
// als losse regel in het formulier, zodat het lid zelf zoekt.

import type { Viewer } from "./_data";
import { queryFoods, type FoodOption } from "@/lib/nutrition/food-query";
import {
  fetchRecipe,
  guessRole,
  parseIngredientLine,
  pickFood,
  searchCandidates,
  type IngredientLine,
} from "@/lib/nutrition/recipe-import";
import type { RecipeFormInitial } from "./_components/recipe-form";

const MAX_INGREDIENTS = 30;
/** Zoveel regels tegelijk zoeken; elke regel kost een tot vier query's. */
const PARALLEL = 4;

export type LinkPrefill =
  | { ok: true; initial: RecipeFormInitial; pending: IngredientLine[] }
  | { ok: false; error: string };

async function matchLine(viewer: Viewer, line: IngredientLine): Promise<FoodOption | null> {
  for (const term of searchCandidates(line.name)) {
    const best = pickFood(await queryFoods(viewer.supabase, term));
    if (best) return best;
  }
  return null;
}

export async function prefillFromLink(viewer: Viewer, link: string): Promise<LinkPrefill> {
  const result = await fetchRecipe(link);
  if (!result.ok) return result;
  const { recipe } = result;

  const lines = recipe.ingredients.map(parseIngredientLine).filter((line) => line.name.length >= 2);
  const matches: (FoodOption | null)[] = [];
  for (let index = 0; index < lines.length; index += PARALLEL) {
    matches.push(...(await Promise.all(lines.slice(index, index + PARALLEL).map((line) => matchLine(viewer, line)))));
  }

  const rows: RecipeFormInitial["rows"] = [];
  const pending: IngredientLine[] = [];
  lines.forEach((line, index) => {
    const food = matches[index];
    if (!food || rows.length >= MAX_INGREDIENTS) {
      pending.push(line);
      return;
    }
    rows.push({
      food: { id: food.id, name_nl: food.name_nl, quantity_unit: food.quantity_unit },
      grams: line.grams == null ? "" : String(line.grams),
      role: guessRole(food),
      source: line.line,
    });
  });

  return {
    ok: true,
    pending,
    initial: {
      title: recipe.title,
      meal_moment: "diner",
      fuel_profile: "gemengd",
      diet_tags: [],
      servings: recipe.servings ?? 1,
      prep_minutes: recipe.minutes,
      steps_md: recipe.steps_md,
      source_name: recipe.source_name,
      source_url: recipe.source_url,
      image_url: recipe.image_url,
      visibility: "prive",
      show_owner: false,
      rows,
    },
  };
}
