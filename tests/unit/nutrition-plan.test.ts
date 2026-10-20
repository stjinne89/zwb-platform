import { describe, expect, it } from "vitest";
import { dayMenu, menuMoments } from "@/lib/nutrition/menu";
import type { Recipe } from "@/lib/nutrition/recipes";
import type { NutritionFood } from "@/lib/nutrition/scale";
import { choiceWindow, planDayMenu, type MenuChoice } from "@/lib/nutrition/plan";
import type { MealMoment } from "@/lib/nutrition/targets";
import { nutritionDay, type NutritionDayInput } from "@/lib/nutrition/tips";
import { shiftDayKey } from "@/lib/training/mobility";

function food(id: string, carbs: number, protein: number): NutritionFood & { quantity_unit: "g" } {
  return {
    id,
    nevo_code: 1,
    name_nl: id,
    kcal: carbs * 4 + protein * 4,
    carbs_g: carbs,
    sugars_g: null,
    protein_g: protein,
    fat_g: 1,
    fiber_g: 1,
    sodium_mg: 0,
    quantity_unit: "g",
  };
}

const PASTA = food("pasta", 72, 12);
const RICE = food("rijst", 78, 7);
const POTATO = food("aardappel", 19, 2);
const CHICKEN = food("kip", 0, 23);
const SALAD = food("sla", 2, 1);

function recipe(slug: string, moment: MealMoment, items: [ReturnType<typeof food>, number, "kh_bron" | "eiwit_bron" | "vast"][]): Recipe {
  return {
    id: slug,
    slug,
    title: slug,
    meal_moment: moment,
    fuel_profile: "gemengd",
    diet_tags: [],
    servings: 1,
    prep_minutes: 10,
    steps_md: "",
    is_standard: true,
    owner_id: null,
    source_name: null,
    source_url: null,
    share_status: null,
    contributor: null,
    ingredients: items.map(([itemFood, grams, role], index) => ({ id: `${slug}-${index}`, sort_order: index, grams, role, food: itemFood })),
  };
}

const RECIPES = [
  recipe("ontbijt-pasta", "ontbijt", [[PASTA, 80, "kh_bron"], [CHICKEN, 80, "eiwit_bron"]]),
  recipe("lunch-rijst", "lunch", [[RICE, 90, "kh_bron"], [CHICKEN, 100, "eiwit_bron"]]),
  recipe("diner-pasta", "diner", [[PASTA, 110, "kh_bron"], [CHICKEN, 120, "eiwit_bron"]]),
  recipe("diner-rijst", "diner", [[RICE, 100, "kh_bron"], [CHICKEN, 120, "eiwit_bron"]]),
  recipe("diner-aardappel", "diner", [[POTATO, 400, "kh_bron"], [CHICKEN, 120, "eiwit_bron"]]),
  recipe("diner-salade", "diner", [[SALAD, 200, "vast"], [CHICKEN, 60, "eiwit_bron"]]),
];

const DAY = "2026-10-21";

function input(day: string, weightKg: number | null = 70): NutritionDayInput {
  return { today: day, weightKg, plannedToday: [{ minutes: 75, intensity: "endurance" }], ridesToday: [], plannedTomorrow: [] };
}

function plan(day: string, choices: MenuChoice[], weightKg: number | null = 70) {
  return planDayMenu({ recipes: RECIPES, input: input(day, weightKg), energyFactor: 1, prefs: new Map(), diet: null, choices });
}

const dinner = (day: string, choices: MenuChoice[]) =>
  plan(day, choices).slots.find((slot) => slot.moment === "diner")!;

describe("planDayMenu", () => {
  it("zet een gekozen recept vast op die dag", () => {
    const slot = dinner(DAY, [{ day: DAY, moment: "diner", recipeId: "diner-salade" }]);
    expect(slot).toMatchObject({ chosen: true });
    expect(slot.recipe.slug).toBe("diner-salade");
  });

  it("kiest een gekozen recept de twee dagen ervoor en erna niet automatisch", () => {
    for (let offset = -6; offset <= 6; offset += 1) {
      const day = shiftDayKey(DAY, offset);
      const choice: MenuChoice = { day, moment: "diner", recipeId: dinner(day, []).recipe.id };
      for (const near of [-2, -1, 1, 2]) {
        expect(dinner(shiftDayKey(day, near), [choice]).recipe.id, `dag ${offset}${near}`).not.toBe(choice.recipeId);
      }
    }
  });

  it("zet de dag ernaast geen hoofdmaaltijd met dezelfde basis als het kan", () => {
    const choice: MenuChoice = { day: DAY, moment: "diner", recipeId: "diner-pasta" };
    for (const near of [-1, 1]) {
      const slots = plan(shiftDayKey(DAY, near), [choice]).slots;
      const diner = slots.find((slot) => slot.moment === "diner")!;
      expect(diner.recipe.ingredients[0].food.id).not.toBe("pasta");
    }
  });

  it("vult de dag aan tot het minimum, ook zonder Naleving", () => {
    const light = plan(DAY, [{ day: DAY, moment: "diner", recipeId: "diner-salade" }]);
    const total = (key: "carbsG" | "proteinG") =>
      light.slots.reduce((sum, slot) => sum + slot.portion.perPortion[key], 0);
    expect(light.slots.some((slot) => slot.toppedUp)).toBe(true);
    expect(total("carbsG")).toBeGreaterThan(plan(DAY, [{ day: DAY, moment: "diner", recipeId: "diner-salade" }], null).slots.reduce((sum, slot) => sum + slot.portion.perPortion.carbsG, 0));
    expect(total("proteinG")).toBeGreaterThanOrEqual(light.nutrition.protein!.min - 1);
  });

  it("maakt een portie nooit kleiner dan zonder aanvulling", () => {
    const day = nutritionDay(input(DAY));
    const plain = dayMenu(RECIPES, menuMoments(input(DAY), day), {
      rider: { weightKg: 70, energyFactor: 1, dayType: day.dayType, rideMinutes: day.rideMinutes },
      dayType: day.dayType,
      tomorrowType: day.tomorrowType,
      today: DAY,
      prefs: new Map(),
      diet: null,
    });
    const filled = plan(DAY, []).slots;
    expect(filled.map((slot) => slot.recipe.id)).toEqual(plain.map((slot) => slot.recipe.id));
    filled.forEach((slot, index) => {
      expect(slot.portion.perPortion.carbsG).toBeGreaterThanOrEqual(plain[index].portion.perPortion.carbsG);
      expect(slot.portion.perPortion.proteinG).toBeGreaterThanOrEqual(plain[index].portion.perPortion.proteinG);
    });
  });

  it("geeft voor een dag hetzelfde menu, of je nu één dag of een week plant", () => {
    const choices: MenuChoice[] = [
      { day: shiftDayKey(DAY, -1), moment: "diner", recipeId: "diner-rijst" },
      { day: DAY, moment: "lunch", recipeId: "diner-aardappel" },
      { day: shiftDayKey(DAY, 5), moment: "diner", recipeId: "diner-pasta" },
    ];
    const single = choiceWindow(DAY, DAY);
    const inWindow = choices.filter((choice) => choice.day >= single.from && choice.day <= single.to);
    const one = plan(DAY, inWindow).slots.map((slot) => [slot.moment, slot.recipe.id, slot.portion.perPortion.carbsG]);
    const week = plan(DAY, choices).slots.map((slot) => [slot.moment, slot.recipe.id, slot.portion.perPortion.carbsG]);
    expect(one).toEqual(week);
  });
});
