import { describe, expect, it } from "vitest";
import type { Recipe } from "@/lib/nutrition/recipes";
import { ridePlan } from "@/lib/nutrition/ride-plan";
import type { NutritionFood } from "@/lib/nutrition/scale";
import { presetFloor, presetFor } from "@/lib/nutrition/event-fuel";
import {
  eventFuelPlanner,
  maxPlannerMinutes,
  plannerPlanInput,
  plannerResult,
  plannerWatts,
  presetIntensity,
  type EventFuelPlanner,
} from "@/lib/nutrition/event-planner";

function food(id: string, carbs: number, group: string, unit: "g" | "ml" = "g"): NutritionFood & { quantity_unit: "g" | "ml" } {
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

function recipe(slug: string, servings: number, items: [ReturnType<typeof food>, number, "kh_bron" | "vast"][]): Recipe {
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
    ingredients: items.map(([itemFood, grams, role], index) => ({ id: `${slug}-${index}`, sort_order: index, grams, role, food: itemFood })),
  };
}

const DRINK = recipe("sportdrank", 1, [
  [food("suiker", 100, "Suiker, snoep, zoet beleg en zoete sauzen"), 60, "kh_bron"],
  [food("siroop", 58, "Niet-alcoholische dranken", "ml"), 20, "kh_bron"],
  [food("zout", 0, "Diversen"), 1, "vast"],
]);
const CAKES = recipe("rijsttaartjes", 6, [[food("rijst", 78, "Graanproducten en meelsoorten"), 250, "kh_bron"]]);

const INPUT = {
  minutes: 120,
  intensity: "race",
  gut: null,
  sweatMlPerHour: null,
  weightKg: 75,
  ranked: [DRINK, CAKES],
  lead: DRINK,
  leadChosen: false,
  energyFactor: 1,
};

function planner(overrides: Partial<Parameters<typeof eventFuelPlanner>[0]> = {}): EventFuelPlanner {
  return eventFuelPlanner({
    input: INPUT,
    minutes: 122,
    intensity: "race",
    setting: "binnen",
    raceIf: 0.82,
    pacing: null,
    ftpWatts: 260,
    ...overrides,
  });
}

describe("ridePlan met een doel van buiten", () => {
  it("maakt ook onder een uur een plan, bij 0 g alleen water", () => {
    expect(ridePlan({ ...INPUT, minutes: 45 })).toBeNull();
    const plan = ridePlan({ ...INPUT, minutes: 45, perHourG: 0, fluidMlPerHour: 1000 });
    expect(plan).not.toBeNull();
    expect(plan!.totalG).toBe(0);
    expect(plan!.solid).toBeNull();
    expect(plan!.bidons.every((bidon) => bidon.recipe == null)).toBe(true);
    expect(plan!.fluid).toEqual({ minMl: 1000, maxMl: 1000 });
  });

  it("rekent met het getal van Reken met, ook boven de band", () => {
    const plan = ridePlan({ ...INPUT, minutes: 120, perHourG: 135, fluidMlPerHour: 750 });
    expect(plan!.perHourG).toBe(135);
    expect(plan!.totalG).toBeGreaterThanOrEqual(260);
    expect(plan!.totalG).toBeLessThanOrEqual(280);
    // Zonder getal van buiten: de band, zoals altijd.
    expect(ridePlan({ ...INPUT, minutes: 120 })!.perHourG).toBe(60);
  });

  it("laat het vochtschuifje het aantal bidons bepalen", () => {
    const few = ridePlan({ ...INPUT, minutes: 120, perHourG: 60, fluidMlPerHour: 400 })!;
    const many = ridePlan({ ...INPUT, minutes: 120, perHourG: 60, fluidMlPerHour: 1200 })!;
    const count = (plan: typeof few) => plan.bidons.reduce((sum, bidon) => sum + bidon.count, 0);
    expect(count(few)).toBe(1);
    expect(count(many)).toBe(3);
  });
});

describe("de knop Duur, Tempo, Race", () => {
  it("geeft vanaf 2,5 uur 60, 90 en 120 als ondergrens, korter minder", () => {
    expect([presetFloor("duur", 180), presetFloor("tempo", 180), presetFloor("race", 180)]).toEqual([60, 90, 120]);
    expect([presetFloor("duur", 90), presetFloor("tempo", 90), presetFloor("race", 90)]).toEqual([30, 45, 60]);
    expect(presetFloor("race", 45)).toBe(0);
  });

  it("volgt de zwaarte van het event", () => {
    expect(presetFor("race")).toBe("race");
    expect(presetFor("threshold")).toBe("race");
    expect(presetFor("tempo")).toBe("tempo");
    expect(presetFor("endurance")).toBe("duur");
    expect(presetFor(null)).toBe("duur");
  });

  it("houdt het advies bij Race binnen de grens van de darm", () => {
    const p = planner();
    const result = plannerResult(p, { ...p.defaults, preset: "race", minutes: 240 });
    expect(result.capG).toBe(90);
    expect(result.adviceG).toBe(90);
    expect(result.aboveCap).toBe(false);
  });

  it("zet bij een andere stand de IF van die stand; het pacingplan alleen bij de eigen zwaarte", () => {
    const paced = planner({ pacing: { watts: 230, intensityFactor: 0.88 } });
    expect(presetIntensity(paced, "race")).toBe(0.88);
    expect(presetIntensity(paced, "duur")).toBe(0.65);
    expect(presetIntensity(planner(), "race")).toBe(0.82);
  });
});

describe("plannerResult", () => {
  it("rekent het vermogen uit het pacingplan, of uit FTP met het deel van NP", () => {
    const paced = planner({ pacing: { watts: 230, intensityFactor: 0.88 } });
    expect(plannerWatts(paced, "race", 0.88)).toBeCloseTo(230);
    expect(plannerWatts(planner(), "race", 0.8)).toBeCloseTo(260 * 0.8 * 0.9);
    expect(plannerWatts(planner({ ftpWatts: null }), "race", 0.8)).toBeNull();
  });

  it("volgt het advies tot je zelf iets invult, en kleurt boven de grens", () => {
    const p = planner();
    const advised = plannerResult(p, p.defaults);
    expect(advised.perHourG).toBe(advised.adviceG);
    expect(advised.balance).not.toBeNull();
    const own = plannerResult(p, { ...p.defaults, perHourG: 135 });
    expect(own.perHourG).toBe(135);
    expect(own.adviceG).toBe(advised.adviceG);
    expect(own.aboveCap).toBe(true);
    expect(own.balance!.intakeG).toBeGreaterThan(advised.balance!.intakeG);
  });

  it("schat het vocht uit de warmte, en het schuifje gaat voor", () => {
    const p = planner();
    const result = plannerResult(p, p.defaults);
    // ~1 l zweet per uur binnen; het midden tussen "onder 2% verlies" en "niet meer dan je zweet".
    expect(result.adviceFluidMl).toBe(650);
    const outside = plannerResult(planner({ setting: "buiten", temperatureC: 10 }), p.defaults);
    expect(outside.adviceFluidMl).toBeLessThan(result.adviceFluidMl);
    expect(plannerResult(p, { ...p.defaults, fluidMlPerHour: 500 }).fluidMlPerHour).toBe(500);
    expect(plannerPlanInput(p, { ...p.defaults, fluidMlPerHour: 500 }).fluidMlPerHour).toBe(500);
  });

  it("zonder vermogen: de ondergrens van de knop, geen balans, 750 ml", () => {
    const p = planner({ ftpWatts: null });
    const result = plannerResult(p, { ...p.defaults, minutes: 180 });
    expect(result.advice).toBeNull();
    expect(result.balance).toBeNull();
    expect(result.adviceG).toBe(90);
    expect(result.adviceFluidMl).toBe(750);
  });

  it("volgt tijdens de darmtraining het weekgetal", () => {
    const p = planner({ input: { ...INPUT, gut: { weekGrams: 70, minMinutes: 90, high: false } } });
    expect(plannerResult(p, p.defaults).adviceG).toBe(70);
    expect(plannerResult({ ...p, ftpWatts: null }, p.defaults).adviceG).toBe(70);
  });

  it("geeft onder een uur een plan met alleen drinken", () => {
    const p = planner({ minutes: 45 });
    const result = plannerResult(p, p.defaults);
    expect(result.adviceG).toBe(0);
    const plan = ridePlan(plannerPlanInput(p, p.defaults));
    expect(plan).not.toBeNull();
    expect(plan!.totalG).toBe(0);
  });
});

it("laat het duurschuifje tot twee keer de verwachte duur lopen, tussen 4 en 12 uur", () => {
  expect(maxPlannerMinutes(45)).toBe(240);
  expect(maxPlannerMinutes(206)).toBe(420);
  expect(maxPlannerMinutes(540)).toBe(720);
});
