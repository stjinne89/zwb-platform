import { describe, expect, it } from "vitest";
import type { Recipe } from "@/lib/nutrition/recipes";
import {
  bidonMaxCarbs,
  eventRide,
  feedMinutes,
  formatRideMinute,
  isBidonRecipe,
  ridePlan,
  ridePlanMeals,
  ridePlanShoppingSlots,
  ridePlanSummary,
  resizeBidon,
} from "@/lib/nutrition/ride-plan";
import { basePortion, type NutritionFood } from "@/lib/nutrition/scale";
import { NO_HOUSEHOLD, shoppingList } from "@/lib/nutrition/shopping";

type Food = NutritionFood & { quantity_unit: "g" | "ml" };

function food(id: string, carbs: number, group: string, unit: "g" | "ml" = "g"): Food {
  return {
    id,
    nevo_code: 1,
    name_nl: id,
    kcal: carbs * 4,
    carbs_g: carbs,
    sugars_g: null,
    protein_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sodium_mg: 0,
    food_group: group,
    quantity_unit: unit,
  };
}

const SUGAR = food("suiker", 100, "Suiker, snoep, zoet beleg en zoete sauzen");
const SYRUP = food("siroop", 58, "Niet-alcoholische dranken", "ml");
const SALT = food("zout", 0, "Diversen");
const RICE = food("rijst", 78, "Graanproducten en meelsoorten");
const BANANA = food("banaan", 20, "Fruit");

function recipe(slug: string, servings: number, items: [Food, number, "kh_bron" | "vast"][]): Recipe {
  return {
    id: slug,
    slug,
    title: slug,
    meal_moment: "tijdens_rit",
    fuel_profile: "hoog_kh",
    diet_tags: [],
    servings,
    prep_minutes: 5,
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

// Zoals de clubrecepten: 60 g suiker en 20 ml siroop per bidon, rijsttaartjes in zes stukken.
const DRINK = recipe("sportdrank", 1, [
  [SUGAR, 60, "kh_bron"],
  [SYRUP, 20, "kh_bron"],
  [SALT, 1, "vast"],
]);
const CAKES = recipe("rijsttaartjes", 6, [
  [RICE, 250, "kh_bron"],
  [BANANA, 200, "kh_bron"],
]);
// 4 uur met 150 g per uur uit de darmtraining: 600 g, meer dan vier bidons dragen.
const LONG = { minutes: 240, gut: { weekGrams: 150, minMinutes: 60, high: false } };

describe("ritplan", () => {
  it("herkent een bidon aan een drank in het recept", () => {
    expect(isBidonRecipe(DRINK)).toBe(true);
    expect(isBidonRecipe(CAKES)).toBe(false);
  });

  it("geeft onder een uur geen plan", () => {
    expect(ridePlan({ minutes: 45, ranked: [DRINK, CAKES], energyFactor: 1 })).toBeNull();
  });

  it("laat de bidons het werk doen zolang ze onder de grens blijven", () => {
    // 2 uur × 45 g: twee bidons van ongeveer 45 g, geen vast eten.
    const plan = ridePlan({ minutes: 120, ranked: [CAKES, DRINK], energyFactor: 1 })!;
    expect(plan.perHourG).toBe(45);
    expect(plan.bidons.count).toBe(2);
    expect(plan.bidons.recipe?.slug).toBe("sportdrank");
    expect(Math.abs(plan.bidons.carbsG - 45)).toBeLessThanOrEqual(2);
    expect(plan.solid).toBeNull();
    expect(Math.abs(plan.totalG - 90)).toBeLessThanOrEqual(4);
  });

  it("vult boven de grens per bidon aan met vast eten", () => {
    // 600 g: vier bidons van 135 g en 60 g vast eten.
    const plan = ridePlan({ ...LONG, ranked: [DRINK, CAKES], energyFactor: 1 })!;
    expect(plan.bidons.count).toBe(4);
    // Boven 50 g rondt het recept af op vijftallen (roundGrams).
    expect(plan.bidons.carbsG).toBeLessThanOrEqual(bidonMaxCarbs(750) + 3);
    expect(plan.solid?.recipe?.slug).toBe("rijsttaartjes");
    expect(Math.abs(plan.totalG - 600)).toBeLessThanOrEqual(10);
    // Het vast eten staat niet op het eerste moment.
    const withSolid = plan.feeds.filter((feed) => feed.solid > 0);
    expect(withSolid.reduce((sum, feed) => sum + feed.solid, 0)).toBe(plan.solid!.count);
    expect(withSolid[0].minute).toBeGreaterThan(15);
  });

  it("houdt vast eten dat het lid zelf koos in het plan", () => {
    const plan = ridePlan({ minutes: 120, ranked: [DRINK, CAKES], lead: CAKES, leadChosen: true, energyFactor: 1 })!;
    expect(plan.solid?.recipe?.slug).toBe("rijsttaartjes");
    // De bidons dragen de helft: één bidon sportdrank, één met water.
    expect(plan.bidons.count).toBe(1);
    expect(plan.waterBidons).toBe(1);
    expect(Math.abs(plan.totalG - 90)).toBeLessThanOrEqual(10);
  });

  it("neemt water mee als er geen sportdrank is", () => {
    const plan = ridePlan({ minutes: 120, ranked: [CAKES], energyFactor: 1 })!;
    expect(plan.bidons.recipe).toBeNull();
    expect(plan.bidons.carbsG).toBe(0);
    expect(plan.solid?.recipe?.slug).toBe("rijsttaartjes");
  });

  it("legt bij Gegeten alle bidons en porties vast, per recept", () => {
    const plan = ridePlan({ ...LONG, ranked: [DRINK, CAKES], energyFactor: 1 })!;
    const meals = ridePlanMeals(plan);
    expect(meals.map((meal) => meal.slug)).toEqual(["sportdrank", "rijsttaartjes"]);
    const sugar = plan.bidons.ingredients.find((item) => item.foodId === "suiker")!;
    expect(meals[0].items.find((item) => "food_id" in item && item.food_id === "suiker")?.grams).toBe(sugar.amount * 4);
    expect(meals[0].title).toBe("4× sportdrank");
  });

  it("maakt van poeder met water een bidon die vol blijft", () => {
    const water = { ...food("water", 0, "Niet-alcoholische dranken"), nevo_code: 1885 };
    const powder = { ...food("poeder", 93, "Diversen"), barcode: "3830081922550" };
    const mix = recipe("poeder-met-water", 1, [
      [powder, 100, "kh_bron"],
      [water, 750, "vast"],
    ]);
    const plan = ridePlan({ minutes: 90, ranked: [mix, DRINK], energyFactor: 1.15 })!;
    expect(plan.bidons.recipe?.slug).toBe("poeder-met-water");
    expect(plan.bidons.ingredients.find((item) => item.foodId === "water")).toMatchObject({ amount: 750, unit: "ml" });
  });

  it("rekent met de gekozen bidon: aantal, grens en water", () => {
    expect([500, 750, 1000].map(bidonMaxCarbs)).toEqual([90, 135, 180]);
    const water = { ...food("water", 0, "Niet-alcoholische dranken"), nevo_code: 1885 };
    const mix = recipe("poeder-met-water", 1, [
      [SUGAR, 60, "kh_bron"],
      [water, 750, "vast"],
    ]);
    const plan = ridePlan({ minutes: 120, ranked: [mix, CAKES], energyFactor: 1 })!;
    expect(plan.bidonMl).toBe(750);
    expect(plan.sizes?.map((size) => [size.bidonMl, size.bidons.count + size.waterBidons])).toEqual([
      [500, 3],
      [750, 2],
      [1000, 2],
    ]);
    const small = plan.sizes!.find((size) => size.bidonMl === 500)!;
    expect(small.bidons.ingredients.find((item) => item.foodId === "water")?.amount).toBe(500);
    expect(Math.abs(small.totalG - plan.totalG)).toBeLessThanOrEqual(10);
    // Een andere standaard kiezen kan ook.
    expect(ridePlan({ minutes: 120, ranked: [mix], energyFactor: 1, bidonMl: 1000 })!.bidonMl).toBe(1000);
  });

  it("schaalt een sterke drank omlaag tot wat de rit vraagt", () => {
    const water = { ...food("water", 0, "Niet-alcoholische dranken"), nevo_code: 1885 };
    const powder = { ...food("poeder", 93, "Diversen"), barcode: "3830081922550" };
    const mix = recipe("poeder-met-water", 1, [
      [powder, 100, "kh_bron"],
      [water, 750, "vast"],
    ]);
    // 1u30 rustig: 30 g per uur, 45 g in totaal; de halve portie is al 46,5 g.
    const plan = ridePlan({ minutes: 90, intensity: "endurance", ranked: [mix], energyFactor: 1 })!;
    expect(plan.totalG).toBe(45);
    expect(plan.bidons.count).toBe(1);
    expect(plan.bidons.ingredients.find((item) => item.foodId === "poeder")?.amount).toBeLessThan(50);
  });

  it("toont in het receptenboek het hele recept voor een andere bidon", () => {
    const portion = basePortion(
      DRINK.ingredients.map((item) => ({ food: item.food, grams: item.grams, role: item.role })),
      1,
    );
    const small = resizeBidon(portion, 500);
    expect(small.ingredients.map((item) => item.grams)).toEqual([40, 13, 0.5]);
    expect(small.perPortion.carbsG).toBeLessThan(portion.perPortion.carbsG);
    expect(resizeBidon(portion, 750)).toBe(portion);
  });

  it("geeft sap en water in ml", () => {
    const plan = ridePlan({ minutes: 120, ranked: [DRINK], energyFactor: 1 })!;
    expect(plan.bidons.ingredients.find((item) => item.foodId === "siroop")?.unit).toBe("ml");
    expect(plan.bidons.ingredients.find((item) => item.foodId === "suiker")?.unit).toBe("g");
  });

  it("eet elke twintig minuten, vanaf een kwartier, en drinkt de bidons op volgorde leeg", () => {
    expect(feedMinutes(60)).toEqual([15, 35]);
    expect(feedMinutes(120)).toEqual([15, 35, 55, 75, 95]);
    const plan = ridePlan({ minutes: 120, ranked: [DRINK], energyFactor: 1 })!;
    expect(plan.feeds.map((feed) => feed.bidon)).toEqual([1, 1, 1, 2, 2]);
    expect(formatRideMinute(95)).toBe("1:35");
  });

  it("neemt bij een event de duur uit het pacingplan, dan het schema, dan de schatting", () => {
    const estimate = { minutes: 50, intensity: "race" };
    expect(eventRide({ pacedSeconds: 5400, workout: { minutes: 60, intensity: "race" }, estimate, eventType: "zrl" })).toEqual({
      minutes: 90,
      intensity: "race",
      longRace: true,
    });
    expect(eventRide({ pacedSeconds: null, workout: { minutes: 75, intensity: "race" }, estimate, eventType: "zrl" }).minutes).toBe(75);
    expect(eventRide({ pacedSeconds: null, workout: null, estimate, eventType: "zrl" })).toEqual({
      minutes: 50,
      intensity: "race",
      longRace: false,
    });
  });

  it("laadt alleen voor een lange wedstrijd, niet voor een lange clubrit", () => {
    const social = { minutes: 180, intensity: "endurance" };
    expect(eventRide({ pacedSeconds: null, workout: null, estimate: social, eventType: "social" }).longRace).toBe(false);
    expect(eventRide({ pacedSeconds: null, workout: null, estimate: { minutes: 300, intensity: "endurance" }, eventType: "gran_fondo" }).longRace).toBe(true);
  });

  it("vat het plan kort samen voor de herinnering", () => {
    const plan = ridePlan({ ...LONG, ranked: [DRINK, CAKES], energyFactor: 1 })!;
    expect(ridePlanSummary(plan)).toBe(`4× bidon sportdrank, ${plan.solid!.count}× rijsttaartjes`);
    expect(ridePlanSummary(ridePlan({ minutes: 120, ranked: [CAKES], energyFactor: 1 })!)).toMatch(/^2× bidon water/);
  });

  it("zet alle bidons en porties op de boodschappenlijst", () => {
    const plan = ridePlan({ ...LONG, ranked: [DRINK, CAKES], energyFactor: 1 })!;
    const items = shoppingList(ridePlanShoppingSlots(plan, [DRINK, CAKES]), NO_HOUSEHOLD);
    const sugarPerBidon = plan.bidons.ingredients.find((item) => item.foodId === "suiker")!.amount;
    expect(items.find((item) => item.id === "suiker")?.grams).toBe(sugarPerBidon * 4);
    expect(items.some((item) => item.id === "rijst")).toBe(true);
    // Een recept dat er niet meer is, valt weg.
    expect(ridePlanShoppingSlots(plan, [DRINK]).map((slot) => slot.recipe.slug)).toEqual(["sportdrank"]);
  });

  it("rekent met het doel dat bij de zwaarte past", () => {
    const easy = ridePlan({ minutes: 120, intensity: "endurance", ranked: [DRINK, CAKES], energyFactor: 1 })!;
    const hard = ridePlan({ minutes: 120, intensity: "threshold", ranked: [DRINK, CAKES], energyFactor: 1 })!;
    expect(easy.perHourG).toBe(30);
    expect(hard.perHourG).toBe(60);
    expect(hard.totalG).toBeGreaterThan(easy.totalG);
  });

  it("telt de bidons uit het vochtdoel als er een zweettest is", () => {
    // 4 uur, 1,2 l zweet per uur, 70 kg: 0,85–1,2 l per uur, dus vijf bidons.
    const plan = ridePlan({
      minutes: 240,
      intensity: "tempo",
      ranked: [DRINK, CAKES],
      sweatMlPerHour: 1200,
      weightKg: 70,
      energyFactor: 1,
    })!;
    expect(plan.fluid).toEqual({ minMl: 850, maxMl: 1200 });
    expect(plan.bidons.count + plan.waterBidons).toBe(5);
    // De koolhydraten blijven gelijk; ze zijn alleen over meer bidons verdeeld.
    expect(Math.abs(plan.totalG - 300)).toBeLessThanOrEqual(10);
    // Zonder test: één bidon per uur en geen vochtdoel.
    const without = ridePlan({ minutes: 240, intensity: "tempo", ranked: [DRINK, CAKES], energyFactor: 1 })!;
    expect(without.fluid).toBeNull();
    expect(without.bidons.count + without.waterBidons).toBe(4);
  });

  it("neemt water mee als de sportdrank niet kleiner kan dan nodig", () => {
    // 1,5 uur rustig: 45 g. Een halve portie sportdrank is al 36 g, dus niet
    // twee bidons sportdrank (72 g) maar één met sportdrank en één met water.
    const plan = ridePlan({ minutes: 90, intensity: "endurance", ranked: [DRINK, CAKES], energyFactor: 1 })!;
    expect(plan.bidons.count).toBe(1);
    expect(plan.waterBidons).toBe(1);
    expect(Math.abs(plan.totalG - 45)).toBeLessThanOrEqual(3);
    expect(ridePlanSummary(plan)).toBe("1× bidon sportdrank, 1× bidon water");
    // Uit de tweede bidon komen geen koolhydraten.
    expect(plan.feeds.filter((feed) => feed.bidon === 2).every((feed) => feed.carbsG === 0)).toBe(true);
  });
});
