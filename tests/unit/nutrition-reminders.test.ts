import { describe, expect, it } from "vitest";
import { nutritionReminderDue, remindersFor, tomorrowRidePlan } from "@/lib/nutrition/reminders";

describe("voedingsherinneringen, wanneer", () => {
  it("verstuurt tussen 19:00 en 21:00 Nederlandse tijd", () => {
    // Oktober: zomertijd, UTC+2.
    expect(nutritionReminderDue(new Date("2026-10-14T16:59:00Z"))).toBe(false);
    expect(nutritionReminderDue(new Date("2026-10-14T17:00:00Z"))).toBe(true);
    expect(nutritionReminderDue(new Date("2026-10-14T18:59:00Z"))).toBe(true);
    expect(nutritionReminderDue(new Date("2026-10-14T19:00:00Z"))).toBe(false);
    // December: wintertijd, UTC+1.
    expect(nutritionReminderDue(new Date("2026-12-01T18:05:00Z"))).toBe(true);
  });
});

describe("voedingsherinneringen, welke", () => {
  it("waarschuwt de avond voor een zware, lange of wedstrijddag", () => {
    for (const tomorrowType of ["zwaar", "lang", "wedstrijd"] as const) {
      expect(remindersFor({ tomorrowType, rodeMinutesToday: 0, recoveryLogged: false }).map((r) => r.kind)).toEqual([
        "morgen_zwaar",
      ]);
    }
    expect(remindersFor({ tomorrowType: "matig", rodeMinutesToday: 0, recoveryLogged: false })).toEqual([]);
  });

  it("vraagt naar de herstelmaaltijd na een rit van een uur of langer", () => {
    expect(remindersFor({ tomorrowType: "rust", rodeMinutesToday: 75, recoveryLogged: false }).map((r) => r.kind)).toEqual([
      "herstel",
    ]);
    expect(remindersFor({ tomorrowType: "rust", rodeMinutesToday: 75, recoveryLogged: true })).toEqual([]);
    expect(remindersFor({ tomorrowType: "rust", rodeMinutesToday: 45, recoveryLogged: false })).toEqual([]);
  });

  it("vraagt nooit om minder te eten", () => {
    const all = remindersFor({ tomorrowType: "lang", rodeMinutesToday: 120, recoveryLogged: false });
    for (const reminder of all) {
      expect(`${reminder.title} ${reminder.body}`).not.toMatch(/minder|te veel|calorie|afval|gewicht/i);
    }
  });

  it("zet erbij wat je voor de rit van morgen klaarzet", () => {
    const tomorrowRide = {
      minutes: 120,
      perHourG: 45,
      totalG: 90,
      bidons: { recipe: { slug: "sportdrank", title: "Zelfgemaakte sportdrank" }, count: 2, carbsG: 45, ingredients: [] },
      solid: null,
      feeds: [],
    };
    const [reminder] = remindersFor({ tomorrowType: "zwaar", rodeMinutesToday: 0, recoveryLogged: false, tomorrowRide });
    expect(reminder.body).toContain("Zet klaar: 2× bidon Zelfgemaakte sportdrank.");
    expect(reminder.body).not.toMatch(/minder|te veel|calorie|afval|gewicht/i);
    // Zonder rit van een uur of langer blijft het bericht zoals het was.
    expect(remindersFor({ tomorrowType: "zwaar", rodeMinutesToday: 0, recoveryLogged: false })[0].body).not.toContain("Zet klaar");
  });
});

describe("voedingsherinneringen, het ritplan van morgen", () => {
  const food = (id: string, carbs: number, group: string) => ({
    id,
    nevo_code: 1,
    name_nl: id,
    kcal: null,
    carbs_g: carbs,
    sugars_g: null,
    protein_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sodium_mg: 0,
    food_group: group,
    quantity_unit: "g" as const,
  });
  const recipe = (slug: string, owner: string | null, visibility: "prive" | "leden", drink: boolean) => ({
    id: slug,
    slug,
    title: slug,
    meal_moment: "tijdens_rit" as const,
    fuel_profile: "hoog_kh" as const,
    diet_tags: [],
    servings: 1,
    prep_minutes: 5,
    steps_md: "",
    is_standard: owner == null,
    owner_id: owner,
    visibility,
    source_name: null,
    source_url: null,
    share_status: null,
    contributor: null,
    ingredients: [
      {
        id: `${slug}-0`,
        sort_order: 0,
        grams: 60,
        role: "kh_bron" as const,
        food: food(`${slug}-kh`, 100, drink ? "Niet-alcoholische dranken" : "Graanproducten en meelsoorten"),
      },
    ],
  });
  const ctx = (choice?: string) => ({
    recipes: [recipe("club", null, "prive", true), recipe("prive-van-ander", "ander", "prive", true), recipe("eigen", "lid", "prive", true)],
    prefs: [],
    choices: choice ? [{ profile_id: "lid", recipe_id: choice }] : [],
    profiles: new Map(),
    heights: new Map(),
  });

  it("kiest nooit een privérecept van een ander lid, wel het eigen recept als het lid dat koos", () => {
    const auto = tomorrowRidePlan(ctx(), "lid", 120, "2026-10-26", "2026-10-25")!;
    expect(auto.bidons.recipe?.slug).not.toBe("prive-van-ander");
    const own = tomorrowRidePlan(ctx("eigen"), "lid", 120, "2026-10-26", "2026-10-25")!;
    expect(own.bidons.recipe?.slug).toBe("eigen");
    const sneaky = tomorrowRidePlan(ctx("prive-van-ander"), "lid", 120, "2026-10-26", "2026-10-25")!;
    expect(sneaky.bidons.recipe?.slug).not.toBe("prive-van-ander");
  });
});
