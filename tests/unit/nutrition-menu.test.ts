import { describe, expect, it } from "vitest";
import {
  dayMenu,
  menuMoments,
  parseSwaps,
  portionFit,
  rankRecipes,
  serializeSwaps,
  stapleOf,
  wantedProfiles,
  type MenuContext,
} from "@/lib/nutrition/menu";
import { portionForRider, type Recipe } from "@/lib/nutrition/recipes";
import type { NutritionFood } from "@/lib/nutrition/scale";
import type { MealMoment } from "@/lib/nutrition/targets";
import { nutritionDay, type NutritionDayInput } from "@/lib/nutrition/tips";
import { portionTraits } from "@/lib/nutrition/traits";
import { shiftDayKey } from "@/lib/training/mobility";

type FoodValues = Partial<NutritionFood> & { carbs: number; protein: number; fat?: number; fiber?: number; kcal?: number };

function food(id: string, values: FoodValues): NutritionFood & { quantity_unit: "g" | "ml" } {
  const { carbs, protein, fat = 1, fiber = 1, kcal, ...rest } = values;
  return {
    id,
    nevo_code: 1,
    name_nl: id,
    kcal: kcal ?? carbs * 4 + protein * 4 + fat * 9,
    carbs_g: carbs,
    sugars_g: null,
    protein_g: protein,
    fat_g: fat,
    fiber_g: fiber,
    sodium_mg: 0,
    quantity_unit: "g",
    ...rest,
  };
}

const PASTA = food("pasta", { carbs: 72, protein: 12, fat: 1.5, fiber: 3 });
const RICE = food("rijst", { carbs: 78, protein: 7, fat: 1, fiber: 1 });
const CHICKEN = food("kip", { carbs: 0, protein: 23, fat: 2, fiber: 0 });
const BEANS = food("bonen", { carbs: 15, protein: 8, fat: 1, fiber: 9 });
const VEG = food("groente", { carbs: 3, protein: 2, fat: 0, fiber: 3 });
const OIL = food("olie", { carbs: 0, protein: 0, fat: 100, fiber: 0 });

function recipe(
  slug: string,
  moment: MealMoment,
  profile: Recipe["fuel_profile"],
  items: [NutritionFood & { quantity_unit: "g" | "ml" }, number, "kh_bron" | "eiwit_bron" | "vast"][],
  tags: Recipe["diet_tags"] = [],
): Recipe {
  return {
    id: slug,
    slug,
    title: slug,
    meal_moment: moment,
    fuel_profile: profile,
    diet_tags: tags,
    servings: 1,
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

const base: NutritionDayInput = {
  today: "2026-10-05",
  weightKg: 70,
  plannedToday: [],
  ridesToday: [],
  plannedTomorrow: [],
};

function context(input: NutritionDayInput, extra: Partial<MenuContext> = {}): MenuContext {
  const day = nutritionDay(input);
  return {
    rider: { weightKg: input.weightKg, energyFactor: 1, dayType: day.dayType, rideMinutes: day.rideMinutes },
    dayType: day.dayType,
    tomorrowType: day.tomorrowType,
    today: input.today,
    prefs: new Map(),
    diet: null,
    ...extra,
  };
}

describe("menuMoments", () => {
  const moments = (input: NutritionDayInput) => menuMoments(input, nutritionDay(input));

  it("houdt een rustdag bij de drie maaltijden", () => {
    expect(moments(base)).toEqual(["ontbijt", "lunch", "diner"]);
  });

  it("voegt rond een lange rit alles toe wat erbij hoort", () => {
    expect(moments({ ...base, plannedToday: [{ minutes: 180, intensity: "endurance" }] })).toEqual([
      "ontbijt",
      "lunch",
      "diner",
      "tussendoor",
      "voor_rit",
      "tijdens_rit",
      "na_rit",
      "voor_slapen",
    ]);
  });

  it("geeft bij een korte race wel een maaltijd vooraf, maar niets voor onderweg", () => {
    const result = moments({ ...base, plannedToday: [{ minutes: 40, intensity: "race" }] });
    expect(result).toContain("voor_rit");
    expect(result).not.toContain("tijdens_rit");
    expect(result).not.toContain("na_rit");
  });

  it("laat na een gereden avondrit de rit zelf weg en zet eiwit voor het slapen erbij", () => {
    const result = moments({ ...base, ridesToday: [{ minutes: 75, intensity: null, startHour: 19 }] });
    expect(result).not.toContain("voor_rit");
    expect(result).not.toContain("tijdens_rit");
    expect(result).toContain("na_rit");
    expect(result).toContain("voor_slapen");
  });
});

describe("wantedProfiles", () => {
  it("volgt het dagtype, en bij het diner ook de dag van morgen", () => {
    expect(wantedProfiles("diner", "zwaar", "rust")[0]).toBe("hoog_kh");
    expect(wantedProfiles("lunch", "rust", "zwaar")[0]).toBe("eiwitrijk");
    expect(wantedProfiles("diner", "rust", "zwaar")[0]).toBe("hoog_kh");
    expect(wantedProfiles("lunch", "matig", "rust")[0]).toBe("gemengd");
    expect(wantedProfiles("tijdens_rit", "zwaar", "rust")).toEqual([]);
  });
});

describe("rankRecipes", () => {
  const heavy: NutritionDayInput = { ...base, ridesToday: [{ minutes: 150, intensity: null, startHour: 9 }] };
  const pasta = recipe("pasta-kip", "diner", "hoog_kh", [
    [PASTA, 150, "kh_bron"],
    [CHICKEN, 80, "eiwit_bron"],
    [VEG, 150, "vast"],
  ]);
  const beans = recipe(
    "bonenschotel",
    "diner",
    "eiwitrijk",
    [
      [BEANS, 250, "kh_bron"],
      [CHICKEN, 100, "eiwit_bron"],
      [VEG, 200, "vast"],
    ],
  );
  const salad = recipe(
    "salade",
    "diner",
    "gemengd",
    [
      [RICE, 60, "kh_bron"],
      [BEANS, 200, "eiwit_bron"],
      [VEG, 200, "vast"],
    ],
    ["vegetarisch", "vegan"],
  );

  it("kiest op een zware dag het recept dat het koolhydraatdoel haalt", () => {
    expect(rankRecipes([beans, salad, pasta], "diner", context(heavy))[0].recipe.slug).toBe("pasta-kip");
  });

  it("kiest op een rustdag het eiwitrijke, vezelrijke recept", () => {
    const ranked = rankRecipes([beans, salad, pasta], "diner", context(base));
    expect(ranked[0].recipe.slug).not.toBe("pasta-kip");
    expect(ranked.at(-1)?.recipe.slug).toBe("pasta-kip");
  });

  it("laat verborgen recepten en recepten buiten het dieet weg", () => {
    const hidden = context(heavy, { prefs: new Map([["pasta-kip", "verborgen"]]) });
    expect(rankRecipes([beans, salad, pasta], "diner", hidden).map((item) => item.recipe.slug)).not.toContain(
      "pasta-kip",
    );
    const vegan = context(heavy, { diet: "vegan" });
    expect(rankRecipes([beans, salad, pasta], "diner", vegan).map((item) => item.recipe.slug)).toEqual(["salade"]);
  });

  it("geeft een favoriet de hoogste score als hij verder gelijkwaardig is", () => {
    const twin = { ...pasta, id: "pasta-twee", slug: "pasta-twee" };
    for (let offset = 0; offset < 4; offset += 1) {
      const today = shiftDayKey(heavy.today, offset);
      const ranked = rankRecipes([pasta, twin], "diner", {
        ...context({ ...heavy, today }),
        prefs: new Map([["pasta-twee", "favoriet"]]),
      });
      // Beide blijven in de kopgroep en wisselen per dag; de favoriet scoort wel hoger.
      expect(Math.max(...ranked.map((item) => item.score))).toBe(
        ranked.find((item) => item.recipe.slug === "pasta-twee")?.score,
      );
    }
  });

  it("wisselt gelijkwaardige recepten per dag af zonder er een over te slaan", () => {
    const pool = Array.from({ length: 6 }, (_, index) => ({ ...pasta, id: `p${index}`, slug: `pasta-${index}` }));
    const seen: string[] = [];
    for (let offset = 0; offset < 6; offset += 1) {
      const today = shiftDayKey(heavy.today, offset);
      seen.push(rankRecipes(pool, "diner", context({ ...heavy, today }))[0].recipe.slug);
    }
    expect(new Set(seen).size).toBe(6);
    // Dezelfde dag geeft steeds hetzelfde recept.
    expect(rankRecipes(pool, "diner", context(heavy))[0].recipe.slug).toBe(seen[0]);
  });

  it("werkt zonder gewicht op profiel en soort eten", () => {
    const ranked = rankRecipes([beans, salad, pasta], "diner", context({ ...base, weightKg: null }, { rider: null }));
    expect(ranked).toHaveLength(3);
    expect(ranked.at(-1)?.recipe.slug).toBe("pasta-kip");
  });
});

describe("portionFit", () => {
  it("straft te weinig koolhydraten af, maar niet te veel eiwit", () => {
    const rider = { weightKg: 70, energyFactor: 1, dayType: "lang" as const, rideMinutes: 200 };
    const small = recipe("klein", "diner", "gemengd", [
      [RICE, 40, "kh_bron"],
      [CHICKEN, 300, "eiwit_bron"],
    ]);
    const big = recipe("groot", "diner", "hoog_kh", [
      [RICE, 220, "kh_bron"],
      [CHICKEN, 300, "eiwit_bron"],
    ]);
    expect(portionFit(small, portionForRider(small, rider), rider)).toBeLessThan(0.6);
    expect(portionFit(big, portionForRider(big, rider), rider)).toBeGreaterThan(0.95);
    expect(portionFit(big, portionForRider(big, null), null)).toBe(1);
  });
});

describe("dayMenu", () => {
  const moments: MealMoment[] = ["ontbijt", "lunch", "diner"];
  const withPasta = (slug: string, moment: MealMoment) =>
    recipe(slug, moment, "gemengd", [
      [PASTA, 110, "kh_bron"],
      [CHICKEN, 60, "eiwit_bron"],
    ]);
  const withRice = (slug: string, moment: MealMoment) =>
    recipe(slug, moment, "gemengd", [
      [RICE, 100, "kh_bron"],
      [CHICKEN, 60, "eiwit_bron"],
    ]);
  const light: NutritionDayInput = { ...base, ridesToday: [{ minutes: 70, intensity: null, startHour: 9 }] };
  const recipes = [
    withPasta("lunch-pasta", "lunch"),
    withPasta("diner-pasta", "diner"),
    withRice("diner-rijst", "diner"),
    withRice("ontbijt-rijst", "ontbijt"),
  ];

  it("zet niet twee keer dezelfde koolhydraatbasis op één dag", () => {
    for (let offset = 0; offset < 7; offset += 1) {
      const menu = dayMenu(recipes, moments, context({ ...light, today: shiftDayKey(light.today, offset) }));
      const staples = menu.map((slot) => stapleOf(slot.recipe));
      expect(new Set(staples).size, `dag ${offset}`).toBe(staples.length - 1);
      // Ontbijt (rijst) en lunch (pasta) liggen vast; het diner kan niet anders dan dubbelen.
      expect(menu).toHaveLength(3);
    }
    const free = dayMenu(recipes.slice(0, 3), ["lunch", "diner"], context(light));
    expect(free.map((slot) => slot.recipe.slug)).toEqual(["lunch-pasta", "diner-rijst"]);
  });

  it("volgt een eigen keuze, ook als die de basis dubbelt", () => {
    const menu = dayMenu(recipes.slice(0, 3), ["lunch", "diner"], context(light), { diner: 1 });
    const diner = menu.find((slot) => slot.moment === "diner");
    const unswapped = dayMenu(recipes.slice(0, 3), ["lunch", "diner"], context(light), {});
    expect(diner?.index).toBe(1);
    expect(diner?.choices).toBe(2);
    expect(unswapped.find((slot) => slot.moment === "diner")?.recipe.slug).toBe("diner-rijst");
  });

  it("slaat een moment zonder recepten over", () => {
    expect(dayMenu(recipes, ["voor_slapen"], context(light))).toEqual([]);
  });
});

describe("wissels in de URL", () => {
  it("leest en schrijft alleen geldige momenten", () => {
    expect(parseSwaps("lunch:2,diner:1")).toEqual({ lunch: 2, diner: 1 });
    expect(parseSwaps("lunch:0,brunch:3,diner:x,ontbijt:-1,tussendoor:1.5")).toEqual({});
    expect(parseSwaps(undefined)).toEqual({});
    expect(serializeSwaps({ diner: 1, lunch: 2 })).toBe("lunch:2,diner:1");
    expect(serializeSwaps({})).toBe("");
  });
});

describe("portionTraits", () => {
  it("noemt weinig vezel en vet licht verteerbaar, en veel vezel vezelrijk", () => {
    expect(portionTraits([{ food: RICE, grams: 100, role: "kh_bron" }]).lightDigest).toBe(true);
    expect(
      portionTraits([
        { food: RICE, grams: 100, role: "kh_bron" },
        { food: OIL, grams: 30, role: "vast" },
      ]).lightDigest,
    ).toBe(false);
    const beans = portionTraits([{ food: BEANS, grams: 300, role: "kh_bron" }]);
    expect(beans.fiberRich).toBe(true);
    expect(beans.lightDigest).toBe(false);
  });

  it("geeft 'rijk aan' pas vanaf 30% van de referentie-inname per portie", () => {
    const milk = food("melk", { carbs: 5, protein: 3.4, calcium_mg: 120, epa_g: null });
    expect(portionTraits([{ food: milk, grams: 150, role: "vast" }]).richIn).toEqual([]);
    expect(portionTraits([{ food: milk, grams: 250, role: "vast" }]).richIn).toEqual(["calcium"]);
    const salmon = food("zalm", { carbs: 0, protein: 20, fat: 11, epa_g: 0.5, dha_g: 0.9, vitamin_d_ug: 5 });
    expect(portionTraits([{ food: salmon, grams: 100, role: "eiwit_bron" }]).richIn).toEqual(["vitamine_d", "omega3"]);
  });
});
