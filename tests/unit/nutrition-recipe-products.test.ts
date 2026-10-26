import { describe, expect, it } from "vitest";
import { logItemFor, productAsFood, type ProductRow } from "@/lib/nutrition/products";
import { isPackagedRecipe, portionForRider, recipeIngredients, type Recipe } from "@/lib/nutrition/recipes";
import { isBidonRecipe, ridePlan, ridePlanMeals } from "@/lib/nutrition/ride-plan";
import type { NutritionFood } from "@/lib/nutrition/scale";
import { NO_HOUSEHOLD, shoppingList } from "@/lib/nutrition/shopping";

// Sportvoeding met een barcode als ingrediënt van een eigen recept (0275).

const GEL: ProductRow = {
  barcode: "8710400000017",
  name: "Energy gel",
  brand: "Merk",
  quantity_unit: "g",
  carbs_g: 62.5,
  protein_g: 0,
  serving_g: 40,
};
const DRINK: ProductRow = {
  barcode: "5000000000017",
  name: "Isotone sportdrank",
  brand: null,
  quantity_unit: "ml",
  carbs_g: 6,
  protein_g: 0,
  serving_g: 500,
};

const WATER: NutritionFood & { quantity_unit: "ml" } = {
  id: "water",
  nevo_code: 1,
  name_nl: "Water",
  kcal: 0,
  carbs_g: 0,
  sugars_g: 0,
  protein_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sodium_mg: 0,
  food_group: "Niet-alcoholische dranken",
  quantity_unit: "ml",
};

function recipe(slug: string, ingredients: Recipe["ingredients"]): Recipe {
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
    is_standard: false,
    owner_id: "lid",
    source_name: null,
    source_url: null,
    share_status: null,
    contributor: null,
    ingredients,
  };
}

const row = (product: ProductRow, grams: number, index = 0) => ({
  id: `${product.barcode}-${index}`,
  sort_order: index,
  grams,
  role: "kh_bron" as const,
  food: productAsFood(product),
});

const GEL_RECIPE = recipe("gel", [row(GEL, 40)]);
const DRINK_RECIPE = recipe("sportdrank", [row(DRINK, 500)]);

describe("sportvoeding met barcode in het receptenboek", () => {
  it("maakt van een product een ingrediënt met de barcode als id", () => {
    const food = productAsFood(GEL);
    expect(food).toMatchObject({ id: GEL.barcode, barcode: GEL.barcode, name_nl: "Energy gel (Merk)", serving_g: 40 });
    // Vet en vezels geeft Open Food Facts hier niet: onbekend, geen nul.
    expect(food.fat_g).toBeNull();
    expect(productAsFood(DRINK).food_group).toBe("Niet-alcoholische dranken");
  });

  it("leest NEVO- en barcode-ingrediënten uit de database, op volgorde", () => {
    const rows = recipeIngredients([
      { id: "b", sort_order: 1, grams: "40", role: "kh_bron", food: null, product: GEL },
      { id: "a", sort_order: 0, grams: 500, role: "vast", food: WATER, product: null },
      { id: "c", sort_order: 2, grams: 10, role: "vast", food: null, product: null },
    ]);
    expect(rows.map((item) => item.food.id)).toEqual(["water", GEL.barcode]);
    expect(rows[1].grams).toBe(40);
  });

  it("schaalt een gel niet mee met het doel", () => {
    expect(isPackagedRecipe(GEL_RECIPE)).toBe(true);
    expect(isPackagedRecipe(recipe("bidon", [row(DRINK, 40), { ...row(DRINK, 0, 1), food: WATER }]))).toBe(false);
    const portion = portionForRider(GEL_RECIPE, {
      weightKg: 90,
      energyFactor: 1.3,
      dayType: "lang",
      rideMinutes: 240,
    });
    expect(portion.ingredients[0].grams).toBe(40);
    expect(portion.perPortion.carbsG).toBe(25);
  });

  it("neemt gels in hele stuks mee en een drank in ml als bidon", () => {
    expect(isBidonRecipe(DRINK_RECIPE)).toBe(true);
    expect(isBidonRecipe(GEL_RECIPE)).toBe(false);
    const plan = ridePlan({ minutes: 180, ranked: [DRINK_RECIPE, GEL_RECIPE], energyFactor: 1 })!;
    expect(plan.bidons.recipe?.slug).toBe("sportdrank");
    expect(plan.bidons.carbsG).toBe(30);
    expect(plan.solid?.recipe?.slug).toBe("gel");
    expect(plan.solid?.carbsG).toBe(25);
    expect(plan.solid?.ingredients[0]).toMatchObject({ amount: 40, barcode: GEL.barcode });
    expect(Math.abs(plan.totalG - plan.perHourG * 3)).toBeLessThanOrEqual(25);
  });

  it("legt bij Gegeten een gel vast met zijn barcode", () => {
    const plan = ridePlan({ minutes: 180, ranked: [DRINK_RECIPE, GEL_RECIPE], energyFactor: 1 })!;
    const gel = ridePlanMeals(plan).find((meal) => meal.slug === "gel")!;
    expect(gel.items).toEqual([{ barcode: GEL.barcode, grams: 40 * plan.solid!.count }]);
    expect(logItemFor(WATER, 500)).toEqual({ food_id: "water", grams: 500 });
  });

  it("zet gels in stuks op de boodschappenlijst, onder hun eigen naam", () => {
    const portion = portionForRider(GEL_RECIPE, null);
    const items = shoppingList(
      [{ moment: "tijdens_rit", recipe: GEL_RECIPE, portion: { ...portion, ingredients: [{ ...portion.ingredients[0], grams: 120 }] } }],
      NO_HOUSEHOLD,
    );
    expect(items).toMatchObject([{ name: "Energy gel (Merk)", amount: "3 stuks" }]);
  });
});
