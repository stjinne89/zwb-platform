import { describe, expect, it } from "vitest";
import { rankRecipes, type MenuContext } from "@/lib/nutrition/menu";
import { DRINK_GROUP, productAsFood, type ProductRow } from "@/lib/nutrition/products";
import { isBrandRecipe, type Recipe } from "@/lib/nutrition/recipes";
import { isBidonRecipe, ridePlan } from "@/lib/nutrition/ride-plan";

// De sportvoedingslijst als clubrecepten (0331): merkproducten alleen als favoriet.

const GEL: ProductRow = {
  barcode: "73160717",
  name: "Gel 100",
  brand: "Maurten",
  quantity_unit: "g",
  carbs_g: 62.5,
  protein_g: 0,
  serving_g: 40,
  carb_mix: "1:0.8",
};
const POWDER: ProductRow = {
  barcode: "7350008410084",
  name: "Drink Mix 160",
  brand: "Maurten",
  quantity_unit: "g",
  carbs_g: 93,
  protein_g: 0,
  serving_g: 42,
  carb_mix: "2:1",
  drink_mix: true,
};

function recipe(slug: string, product: ProductRow, standard = true): Recipe {
  return {
    id: slug,
    slug,
    title: slug,
    meal_moment: "tijdens_rit",
    fuel_profile: "hoog_kh",
    diet_tags: [],
    servings: 1,
    prep_minutes: null,
    steps_md: "",
    is_standard: standard,
    owner_id: standard ? null : "lid",
    source_name: null,
    source_url: null,
    share_status: null,
    contributor: null,
    carb_mix: product.carb_mix ?? null,
    ingredients: [{ id: `${slug}-0`, sort_order: 0, grams: product.serving_g ?? 0, role: "kh_bron", food: productAsFood(product) }],
  };
}

const BRAND_GEL = recipe("merk-maurten-gel-100", GEL);
const BRAND_DRINK = recipe("merk-maurten-drink-mix-160", POWDER);
const OWN_GEL = recipe("eigen-gel", GEL, false);

const context = (overrides: Partial<MenuContext> = {}): MenuContext => ({
  rider: null,
  dayType: "lang",
  tomorrowType: "rust",
  today: "2026-11-13",
  prefs: new Map(),
  diet: null,
  ...overrides,
});

const slugs = (recipes: Recipe[], ctx: MenuContext) => rankRecipes(recipes, "tijdens_rit", ctx).map((item) => item.recipe.slug);

describe("merkproducten in het receptenboek (0331)", () => {
  it("een clubrecept met alleen barcodeproducten is een merkproduct, een eigen recept niet", () => {
    expect(isBrandRecipe(BRAND_GEL)).toBe(true);
    expect(isBrandRecipe(OWN_GEL)).toBe(false);
  });

  it("een poeder voor de bidon telt als drank, in gram", () => {
    expect(productAsFood(POWDER)).toMatchObject({ quantity_unit: "g", food_group: DRINK_GROUP });
    expect(productAsFood(GEL).food_group).toBeNull();
    expect(isBidonRecipe(BRAND_DRINK)).toBe(true);
    expect(isBidonRecipe(BRAND_GEL)).toBe(false);
  });

  it("het menu en het ritplan nemen een merkproduct alleen als favoriet", () => {
    const all = [BRAND_GEL, BRAND_DRINK, OWN_GEL];
    expect(slugs(all, context())).toEqual(["eigen-gel"]);
    expect(slugs(all, context({ prefs: new Map([[BRAND_GEL.id, "favoriet"]]) })).sort()).toEqual(
      ["eigen-gel", "merk-maurten-gel-100"],
    );
    // Kiezen toont ze allemaal.
    expect(slugs(all, context({ includeBrands: true }))).toHaveLength(3);
  });

  it("een favoriet poeder wordt een bidon met de portie van de fabrikant", () => {
    const plan = ridePlan({ minutes: 120, ranked: [BRAND_DRINK, BRAND_GEL], energyFactor: 1 })!;
    expect(plan.bidons[0].recipe?.slug).toBe("merk-maurten-drink-mix-160");
    expect(plan.bidons[0].ingredients[0]).toMatchObject({ barcode: POWDER.barcode, amount: 42, unit: "g" });
  });
});
