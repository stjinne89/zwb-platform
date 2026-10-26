import { describe, expect, it } from "vitest";
import { weekSummary, type LoggedMeal } from "@/lib/nutrition/log";
import { topUpMenu, type MenuSlot } from "@/lib/nutrition/menu";
import { basePortion, type NutritionFood } from "@/lib/nutrition/scale";
import type { Recipe } from "@/lib/nutrition/recipes";
import type { MealMoment } from "@/lib/nutrition/targets";

function food(id: string, carbs: number, protein: number): NutritionFood & { quantity_unit: "g" } {
  return {
    id,
    nevo_code: 1,
    name_nl: id,
    quantity_unit: "g",
    kcal: null,
    carbs_g: carbs,
    sugars_g: null,
    protein_g: protein,
    fat_g: 0,
    fiber_g: 0,
    sodium_mg: null,
  };
}

const pasta = food("pasta", 30, 5);
const chicken = food("kip", 0, 30);

function recipe(moment: MealMoment): Recipe {
  return {
    id: `r-${moment}`,
    slug: `r-${moment}`,
    title: moment,
    meal_moment: moment,
    fuel_profile: "gemengd",
    diet_tags: [],
    servings: 1,
    prep_minutes: null,
    steps_md: "",
    is_standard: true,
    owner_id: null,
    source_name: null,
    source_url: null,
    share_status: null,
    contributor: null,
    ingredients: [
      { id: "a", sort_order: 0, grams: 200, role: "kh_bron", food: pasta },
      { id: "b", sort_order: 1, grams: 100, role: "eiwit_bron", food: chicken },
    ],
  };
}

function slot(moment: MealMoment): MenuSlot {
  const item = recipe(moment);
  const portion = basePortion(
    item.ingredients.map((row) => ({ food: row.food, grams: row.grams, role: row.role })),
    1,
  );
  return { recipe: item, portion, traits: { kcal: 0, sodiumMg: 0, lightDigest: false, fiberRich: false, richIn: [] }, score: 1, moment, choices: 1, chosen: false, nextRecipeId: null };
}

// Elke slot levert 60 g koolhydraten en 40 g eiwit.
const menu = [slot("ontbijt"), slot("lunch"), slot("diner")];

describe("dagmenu dat meerekent", () => {
  it("laat het menu staan als het minimum toch gehaald wordt", () => {
    const result = topUpMenu(menu, {
      eaten: { carbsG: 100, proteinG: 0 },
      eatenMoments: new Set<MealMoment>(["ontbijt"]),
      floor: { carbsG: 200, proteinG: 70 },
      energyFactor: 1,
    });
    expect(result).toBe(menu);
  });

  it("maakt de maaltijden die nog komen groter als er te weinig in zit", () => {
    const result = topUpMenu(menu, {
      eaten: { carbsG: 40, proteinG: 10 },
      eatenMoments: new Set<MealMoment>(["ontbijt"]),
      // Nog te gaan: 260 − 40 − 120 = 100 g koolhydraten, verdeeld over lunch en diner.
      floor: { carbsG: 260, proteinG: 80 },
      energyFactor: 1,
    });
    expect(result[0]).toBe(menu[0]);
    for (const item of result.slice(1)) {
      expect(item.toppedUp).toBe(true);
      expect(item.portion.perPortion.carbsG).toBeGreaterThan(100);
      expect(item.portion.perPortion.proteinG).toBeGreaterThanOrEqual(40);
      // Geen onderdeel wordt kleiner: de kip blijft, de pasta groeit.
      expect(item.portion.ingredients.map((row) => row.grams)).toEqual([365, 100]);
    }
  });

  it("maakt een portie nooit kleiner, ook niet als er al veel gegeten is", () => {
    const result = topUpMenu(menu, {
      eaten: { carbsG: 900, proteinG: 300 },
      eatenMoments: new Set<MealMoment>(),
      floor: { carbsG: 200, proteinG: 70 },
      energyFactor: 1,
    });
    expect(result).toBe(menu);
  });

  it("doet niets zonder gewicht of als alles al gegeten is", () => {
    expect(
      topUpMenu(menu, { eaten: { carbsG: 0, proteinG: 0 }, eatenMoments: new Set(), floor: { carbsG: null, proteinG: null }, energyFactor: 1 }),
    ).toBe(menu);
    expect(
      topUpMenu(menu, {
        eaten: { carbsG: 0, proteinG: 0 },
        eatenMoments: new Set<MealMoment>(["ontbijt", "lunch", "diner"]),
        floor: { carbsG: 500, proteinG: 100 },
        energyFactor: 1,
      }),
    ).toBe(menu);
  });

  it("telt elk uur op de fiets mee, niet één portie", () => {
    const withRide = [...menu, slot("tijdens_rit")];
    const input = {
      eaten: { carbsG: 0, proteinG: 0 },
      eatenMoments: new Set<MealMoment>(),
      // Menu: 3 × 60 + 60 per uur. Bij één uur 240, bij drie uur 360.
      floor: { carbsG: 300, proteinG: 70 },
      energyFactor: 1,
    };
    expect(topUpMenu(withRide, input)).not.toBe(withRide);
    expect(topUpMenu(withRide, { ...input, rideHours: 3 })).toBe(withRide);
  });

  it("wordt niet groter dan twee keer de gewone portie", () => {
    const result = topUpMenu(menu, {
      eaten: { carbsG: 0, proteinG: 0 },
      eatenMoments: new Set<MealMoment>(["ontbijt", "lunch"]),
      floor: { carbsG: 2000, proteinG: 70 },
      energyFactor: 1,
    });
    expect(result[2].portion.perPortion.carbsG).toBeLessThanOrEqual(120);
  });
});

function logged(day: string, carbs: number, protein: number): LoggedMeal {
  return {
    id: `${day}-${carbs}`,
    eatenOn: day,
    moment: "lunch",
    source: "handmatig",
    recipeId: null,
    title: "X",
    items: [
      { kind: "nevo", food: { id: "k", name_nl: "K", quantity_unit: "g", carbs_g: 100, protein_g: 0 }, grams: carbs },
      { kind: "nevo", food: { id: "e", name_nl: "E", quantity_unit: "g", carbs_g: 0, protein_g: 100 }, grams: protein },
    ],
  };
}

describe("weekoverzicht", () => {
  const band = { min: 300, max: 400 };
  const protein = { min: 110, max: 150 };

  it("toont per dag of de onderkant gehaald is, en telt een lege dag niet mee", () => {
    const week = weekSummary([
      { day: "2026-10-12", dayType: "zwaar", carbs: band, protein, meals: [logged("2026-10-12", 320, 90)] },
      { day: "2026-10-13", dayType: "zwaar", carbs: band, protein, meals: [] },
      { day: "2026-10-14", dayType: "zwaar", carbs: band, protein, meals: [logged("2026-10-14", 250, 120)] },
      { day: "2026-10-15", dayType: "rust", carbs: band, protein, meals: [logged("2026-10-15", 500, 200)] },
    ]);
    expect(week.days.map((day) => [day.logged, day.carbsReached, day.proteinReached])).toEqual([
      [true, true, false],
      [false, null, null],
      [true, false, true],
      [true, true, true],
    ]);
    expect(week.tally).toEqual([
      { dayType: "rust", logged: 1, carbsReached: 1 },
      { dayType: "zwaar", logged: 2, carbsReached: 1 },
    ]);
  });

  it("heeft zonder gewicht geen oordeel", () => {
    const week = weekSummary([
      { day: "2026-10-14", dayType: "matig", carbs: null, protein: null, meals: [logged("2026-10-14", 100, 50)] },
    ]);
    expect(week.days[0]).toMatchObject({ logged: true, carbsReached: null, proteinReached: null });
  });
});
