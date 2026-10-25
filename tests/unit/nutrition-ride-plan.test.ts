import { describe, expect, it } from "vitest";
import type { Recipe } from "@/lib/nutrition/recipes";
import {
  BIDON_MAX_CARBS_G,
  eventRide,
  feedMinutes,
  formatRideMinute,
  isBidonRecipe,
  ridePlan,
  ridePlanMeals,
} from "@/lib/nutrition/ride-plan";
import type { NutritionFood } from "@/lib/nutrition/scale";

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
    // 4 uur × 75 g = 300 g: vier bidons van 60 g en 60 g vast eten.
    const plan = ridePlan({ minutes: 240, ranked: [DRINK, CAKES], energyFactor: 1 })!;
    expect(plan.bidons.count).toBe(4);
    expect(plan.bidons.carbsG).toBeLessThanOrEqual(BIDON_MAX_CARBS_G + 1);
    expect(plan.solid?.recipe?.slug).toBe("rijsttaartjes");
    expect(Math.abs(plan.totalG - 300)).toBeLessThanOrEqual(10);
    // Het vast eten staat niet op het eerste moment.
    const withSolid = plan.feeds.filter((feed) => feed.solid > 0);
    expect(withSolid.reduce((sum, feed) => sum + feed.solid, 0)).toBe(plan.solid!.count);
    expect(withSolid[0].minute).toBeGreaterThan(15);
  });

  it("houdt vast eten dat het lid zelf koos in het plan", () => {
    const plan = ridePlan({ minutes: 120, ranked: [DRINK, CAKES], lead: CAKES, leadChosen: true, energyFactor: 1 })!;
    expect(plan.solid?.recipe?.slug).toBe("rijsttaartjes");
    // De bidon draagt minder dan de 45 g zonder eigen keuze (niet kleiner dan
    // de halve portie die het schalen toelaat).
    expect(plan.bidons.carbsG).toBeLessThan(40);
    expect(Math.abs(plan.totalG - 90)).toBeLessThanOrEqual(10);
  });

  it("neemt water mee als er geen sportdrank is", () => {
    const plan = ridePlan({ minutes: 120, ranked: [CAKES], energyFactor: 1 })!;
    expect(plan.bidons.recipe).toBeNull();
    expect(plan.bidons.carbsG).toBe(0);
    expect(plan.solid?.recipe?.slug).toBe("rijsttaartjes");
  });

  it("legt bij Gegeten alle bidons en porties vast, per recept", () => {
    const plan = ridePlan({ minutes: 240, ranked: [DRINK, CAKES], energyFactor: 1 })!;
    const meals = ridePlanMeals(plan);
    expect(meals.map((meal) => meal.slug)).toEqual(["sportdrank", "rijsttaartjes"]);
    const sugar = plan.bidons.ingredients.find((item) => item.foodId === "suiker")!;
    expect(meals[0].items.find((item) => item.food_id === "suiker")?.grams).toBe(sugar.amount * 4);
    expect(meals[0].title).toBe("4× sportdrank");
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
});
