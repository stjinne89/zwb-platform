import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { dayMenu, type MenuContext } from "@/lib/nutrition/menu";
import { portionForRider, type Recipe } from "@/lib/nutrition/recipes";
import type { NutritionFood } from "@/lib/nutrition/scale";
import {
  NO_HOUSEHOLD,
  formatGrams,
  formatMillilitres,
  formatPieces,
  householdFromRow,
  householdPortions,
  householdSize,
  parseDaySwaps,
  serializeDaySwaps,
  shoppingList,
  shoppingText,
  withDaySwap,
  type Household,
  type ShoppingSlot,
} from "@/lib/nutrition/shopping";
import { SHOPPING_NAMES, cleanNevoName, departmentFor } from "@/lib/nutrition/shopping-names";
import type { MealMoment } from "@/lib/nutrition/targets";

function food(nevo: number, name: string, carbs: number, protein: number, group: string | null = null) {
  return {
    id: `food-${nevo}`,
    nevo_code: nevo,
    name_nl: name,
    kcal: carbs * 4 + protein * 4,
    carbs_g: carbs,
    sugars_g: null,
    protein_g: protein,
    fat_g: 1,
    fiber_g: 1,
    sodium_mg: 0,
    food_group: group,
    quantity_unit: "g" as const,
  } satisfies NutritionFood & { quantity_unit: "g" | "ml" };
}

const PASTA = food(4, "Pasta witte rauw", 72, 12, "Graanproducten en meelsoorten");
const CHICKEN = food(1634, "Kipfilet rauw", 0, 23, "Vlees en gevogelte");
const OIL = food(601, "Olie olijf-", 0, 0, "Vetten en oliën");
const EGG = food(83, "Ei kippen- rauw gem", 0.5, 12.5, "Eieren");
const MILK = food(286, "Melk halfvolle", 4.7, 3.5, "Melk en melkproducten");
const OATS = food(213, "Vlokken haver-", 59, 13, "Graanproducten en meelsoorten");
const UNKNOWN = food(9999, "Kool spruit- rauw", 3, 4, "Groente");

function recipe(
  slug: string,
  moment: MealMoment,
  items: [ReturnType<typeof food>, number, "kh_bron" | "eiwit_bron" | "vast"][],
  servings = 1,
): Recipe {
  return {
    id: slug,
    slug,
    title: slug,
    meal_moment: moment,
    fuel_profile: "gemengd",
    diet_tags: [],
    servings,
    prep_minutes: 10,
    steps_md: "",
    is_standard: true,
    owner_id: null,
    source_name: null,
    source_url: null,
    share_status: null,
    contributor: null,
    ingredients: items.map(([itemFood, grams, role], index) => ({
      id: `${slug}-${index}`,
      sort_order: index,
      grams,
      role,
      food: itemFood,
    })),
  };
}

const DINNER = recipe(
  "pasta-kip",
  "diner",
  [
    [PASTA, 200, "kh_bron"],
    [CHICKEN, 300, "eiwit_bron"],
    [OIL, 20, "vast"],
  ],
  2,
);
const BREAKFAST = recipe("havermout", "ontbijt", [
  [OATS, 70, "kh_bron"],
  [MILK, 250, "vast"],
  [EGG, 110, "eiwit_bron"],
]);

/** Zonder gewicht krijgt de renner de gewone portie; zo zijn de sommen na te rekenen. */
function slot(item: Recipe): ShoppingSlot {
  return { moment: item.meal_moment, recipe: item, portion: portionForRider(item, null) };
}

const byName = (items: ReturnType<typeof shoppingList>) => new Map(items.map((item) => [item.name, item]));

describe("gezin", () => {
  it("leest een rij van nutrition_profiles, en niemand zonder rij", () => {
    expect(householdFromRow(null)).toEqual(NO_HOUSEHOLD);
    expect(householdFromRow({ height_cm: 180 })).toEqual(NO_HOUSEHOLD);
    expect(
      householdFromRow({
        household_adults: 1,
        household_children_full: 1,
        household_children_half: 2,
        household_moments: ["diner", "ontbijt", "voor_slapen"],
      }),
    ).toEqual({ adults: 1, childrenFull: 1, childrenHalf: 2, moments: ["ontbijt", "diner"] });
  });

  it("begrenst rare aantallen", () => {
    expect(householdFromRow({ household_adults: -3, household_children_full: 40, household_children_half: "x" })).toMatchObject({
      adults: 0,
      childrenFull: 10,
      childrenHalf: 0,
    });
  });

  it("telt een kind met een halve portie half, maar wel als persoon", () => {
    const household: Household = { adults: 1, childrenFull: 1, childrenHalf: 2, moments: ["diner"] };
    expect(householdPortions(household)).toBe(3);
    expect(householdSize(household)).toBe(5);
  });
});

describe("boodschappenlijst", () => {
  it("telt dezelfde producten over dagen op", () => {
    const items = byName(shoppingList([slot(DINNER), slot(DINNER)], NO_HOUSEHOLD));
    // Recept voor twee porties: 100 g pasta per portie, twee dagen.
    expect(items.get("Pasta")?.grams).toBe(200);
    expect(items.get("Kipfilet")?.grams).toBe(300);
  });

  it("laat het gezin alleen meeëten bij de aangezette maaltijden", () => {
    const household: Household = { adults: 1, childrenFull: 0, childrenHalf: 1, moments: ["diner"] };
    const items = byName(shoppingList([slot(DINNER), slot(BREAKFAST)], household));
    // Renner 100 g, plus 1,5 gewone portie van 100 g.
    expect(items.get("Pasta")?.grams).toBe(250);
    // Het ontbijt eet alleen de renner.
    expect(items.get("Havervlokken")?.grams).toBe(70);
  });

  it("geeft aantallen in stuks, melk in ml en zet de voorraad uit", () => {
    const items = byName(shoppingList([slot(BREAKFAST)], NO_HOUSEHOLD));
    expect(items.get("Eieren")?.amount).toBe("2 stuks");
    expect(items.get("Halfvolle melk")?.amount).toBe("250 ml");
    const dinner = byName(shoppingList([slot(DINNER)], NO_HOUSEHOLD));
    expect(dinner.get("Olijfolie")?.pantry).toBe(true);
    expect(dinner.get("Kipfilet")?.pantry).toBe(false);
  });

  it("valt voor een onbekend ingrediënt terug op de NEVO-naam en -groep", () => {
    const own = recipe("eigen", "diner", [[UNKNOWN, 300, "vast"]]);
    const [item] = shoppingList([slot(own)], NO_HOUSEHOLD);
    expect(item).toMatchObject({ name: "Spruitkool", department: "groente_fruit", amount: "300 g" });
  });

  it("sorteert per afdeling, in winkelvolgorde", () => {
    const items = shoppingList([slot(DINNER), slot(BREAKFAST)], NO_HOUSEHOLD);
    const departments = items.map((item) => item.department);
    expect(departments.indexOf("vlees_vis_vega")).toBeLessThan(departments.indexOf("zuivel"));
    expect(departments.indexOf("zuivel")).toBeLessThan(departments.indexOf("houdbaar"));
    expect(departments.at(-1)).toBe("voorraad");
  });

  it("maakt één regel per product", () => {
    expect(
      shoppingText([
        { name: "Bananen", amount: "3 stuks" },
        { name: "Pasta", amount: "250 g" },
      ]),
    ).toBe("Bananen, 3 stuks\nPasta, 250 g");
  });

  it("volgt per dag hetzelfde menu als het Dagmenu", () => {
    const dinners = ["a", "b", "c"].map((slug) =>
      recipe(slug, "diner", [
        [PASTA, 100, "kh_bron"],
        [CHICKEN, 150, "eiwit_bron"],
      ]),
    );
    const context = (today: string): MenuContext => ({
      rider: null,
      dayType: "matig",
      tomorrowType: "matig",
      today,
      prefs: new Map(),
      diet: null,
    });
    // De lijst rekent met dayMenu per dag; dezelfde dag geeft hetzelfde recept.
    const monday = dayMenu(dinners, ["diner"], context("2026-10-19"));
    const tuesday = dayMenu(dinners, ["diner"], context("2026-10-20"));
    expect(dayMenu(dinners, ["diner"], context("2026-10-19"))[0].recipe.slug).toBe(monday[0].recipe.slug);
    expect(tuesday[0].recipe.slug).not.toBe(monday[0].recipe.slug);
  });
});

describe("afronden", () => {
  it("rondt naar boven af op winkelgetallen", () => {
    expect(formatGrams(3.2)).toBe("4 g");
    expect(formatGrams(42)).toBe("45 g");
    expect(formatGrams(251)).toBe("260 g");
    expect(formatGrams(1240)).toBe("1,3 kg");
    expect(formatGrams(2000)).toBe("2 kg");
    expect(formatMillilitres(1500)).toBe("1,5 l");
  });

  it("telt een tiende stuk niet als een stuk extra", () => {
    expect(formatPieces(110, 110, "stuks")).toBe("1 stuk");
    expect(formatPieces(115, 110, "stuks")).toBe("1 stuk");
    expect(formatPieces(140, 110, "stuks")).toBe("2 stuks");
    expect(formatPieces(5, 35, "sneetjes")).toBe("1 sneetje");
  });
});

describe("namen", () => {
  it("maakt van een NEVO-samenstelling een winkelnaam", () => {
    expect(cleanNevoName("Kool bloem- rauw")).toBe("Bloemkool");
    expect(cleanNevoName("Ei kippen- rauw gem")).toBe("Kippenei");
    expect(cleanNevoName("Noten wal- ongezouten")).toBe("Walnoten ongezouten");
    expect(cleanNevoName("Banaan")).toBe("Banaan");
  });

  it("kent elk ingrediënt van de clubrecepten", async () => {
    const seed = await readFile("supabase/migrations/0214_nutrition_seed_v2.sql", "utf8");
    const used = new Set(
      [...seed.matchAll(/\('[a-z0-9-]+', (\d+), \d+, [\d.]+, '(?:kh_bron|eiwit_bron|vast)'\)/g)].map((match) =>
        Number(match[1]),
      ),
    );
    expect(used.size).toBeGreaterThan(100);
    expect([...used].filter((code) => !SHOPPING_NAMES[code])).toEqual([]);
  });

  it("zet verse kruiden bij de groente en blikken bij houdbaar", () => {
    expect(departmentFor(128, "Kruiden en specerijen")).toBe("groente_fruit");
    expect(departmentFor(2293, "Groente")).toBe("houdbaar");
    expect(departmentFor(1, null)).toBe("overig");
  });
});

describe("keuzes per dag in de URL", () => {
  it("leest en schrijft dag, moment en keuze", () => {
    const swaps = parseDaySwaps("0.diner:2,3.lunch:1,9.diner:1,1.vlieg:2,2.ontbijt:0,x");
    expect(swaps.get(0)).toEqual({ diner: 2 });
    expect(swaps.get(3)).toEqual({ lunch: 1 });
    expect(swaps.size).toBe(2);
    expect(serializeDaySwaps(withDaySwap(swaps, 0, "ontbijt", 1))).toBe("0.ontbijt:1,0.diner:2,3.lunch:1");
  });
});
