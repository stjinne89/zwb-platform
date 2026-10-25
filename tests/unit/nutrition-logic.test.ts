import { describe, expect, it } from "vitest";
import { classifyFuelDay, isKeyDay } from "@/lib/nutrition/day-type";
import {
  ageFromBirthDate,
  dailyCarbs,
  dailyProtein,
  mealCarbsBasis,
  mealTarget,
  portionEnergyFactor,
  rideCarbsPerHour,
  rideDayCarbs,
  rideTargetPerHour,
  type MealMoment,
} from "@/lib/nutrition/targets";
import { basePortion, macrosFor, roundGrams, scaleRecipe, type NutritionFood } from "@/lib/nutrition/scale";

function food(id: string, carbs: number | null, protein: number | null): NutritionFood {
  return {
    id,
    nevo_code: Number(id.replace(/\D/g, "")) || 1,
    name_nl: id,
    kcal: null,
    carbs_g: carbs,
    sugars_g: null,
    protein_g: protein,
    fat_g: 1,
    fiber_g: 1,
    sodium_mg: null,
  };
}

describe("classifyFuelDay", () => {
  it("herkent de dagtypes op duur en intensiteit", () => {
    expect(classifyFuelDay([])).toBe("rust");
    expect(classifyFuelDay([{ minutes: 60, intensity: "rest" }])).toBe("rust");
    expect(classifyFuelDay([{ minutes: 45, intensity: "endurance" }])).toBe("licht");
    expect(classifyFuelDay([{ minutes: 90, intensity: "recovery" }])).toBe("licht");
    expect(classifyFuelDay([{ minutes: 75, intensity: "endurance" }])).toBe("matig");
    expect(classifyFuelDay([{ minutes: 60, intensity: "threshold" }])).toBe("zwaar");
    expect(classifyFuelDay([{ minutes: 120, intensity: "endurance" }])).toBe("zwaar");
    expect(classifyFuelDay([{ minutes: 200, intensity: "endurance" }])).toBe("lang");
    expect(classifyFuelDay([{ minutes: 45, intensity: "race" }])).toBe("zwaar");
    expect(classifyFuelDay([{ minutes: 240, intensity: "race" }])).toBe("wedstrijd");
  });

  it("telt twee sessies op één dag bij elkaar op", () => {
    expect(
      classifyFuelDay([
        { minutes: 100, intensity: "endurance" },
        { minutes: 90, intensity: "endurance" },
      ]),
    ).toBe("lang");
  });

  it("noemt alleen zware dagen en zwaarder een sleuteldag", () => {
    expect(isKeyDay("matig")).toBe(false);
    expect(isKeyDay("zwaar")).toBe(true);
    expect(isKeyDay("wedstrijd")).toBe(true);
  });
});

describe("doelen", () => {
  it("rekent dagbanden om naar grammen", () => {
    expect(dailyCarbs("rust", 70)).toEqual({ min: 210, max: 350 });
    expect(dailyCarbs("lang", 70)).toEqual({ min: 560, max: 840 });
    expect(dailyProtein(70)).toEqual({ min: 112, max: 147 });
  });

  it("geeft koolhydraten per uur pas vanaf een uur rijden", () => {
    expect(rideCarbsPerHour(45)).toBeNull();
    expect(rideCarbsPerHour(90)).toEqual({ min: 30, max: 60 });
    expect(rideCarbsPerHour(240)).toEqual({ min: 60, max: 90 });
  });

  it("kiest het doel per uur binnen de band naar de zwaarte van de rit", () => {
    expect(rideTargetPerHour(45, "race")).toBeNull();
    expect(rideTargetPerHour(120, "endurance")).toBe(30);
    expect(rideTargetPerHour(120, "recovery")).toBe(30);
    expect(rideTargetPerHour(120, "tempo")).toBe(45);
    expect(rideTargetPerHour(120, null)).toBe(45);
    expect(rideTargetPerHour(120, "threshold")).toBe(60);
    expect(rideTargetPerHour(240, "endurance")).toBe(60);
    expect(rideTargetPerHour(240, "race")).toBe(90);
    // De portie per uur en de aftrek van het dagdoel volgen hetzelfde doel.
    const hard = { weightKg: 70, dayType: "lang" as const, rideMinutes: 240, rideIntensity: "race" };
    expect(mealTarget("tijdens_rit", hard).carbsG).toBe(90);
    expect(rideDayCarbs(70, 240, "race")).toBe(70 + 360 + 70);
    expect(rideDayCarbs(70, 240, "endurance")).toBe(70 + 240 + 70);
  });

  it("zet per moment een passend doel", () => {
    const input = { weightKg: 70, dayType: "rust" as const, rideMinutes: null };
    expect(mealTarget("diner", input)).toEqual({ carbsG: 84, proteinG: 25 });
    expect(mealTarget("voor_slapen", input)).toEqual({ carbsG: null, proteinG: 40 });
    expect(mealTarget("tijdens_rit", { ...input, rideMinutes: 240 })).toEqual({ carbsG: 75, proteinG: null });
    expect(mealTarget("na_rit", input)).toEqual({ carbsG: 70, proteinG: 21 });
  });

  it("telt de koolhydraten rond de rit mee", () => {
    expect(rideDayCarbs(70, null)).toBe(0);
    expect(rideDayCarbs(70, 45)).toBe(70);
    // 70 voor + 4 × 75 tijdens + 70 na.
    expect(rideDayCarbs(70, 240)).toBe(440);
  });

  it("geeft de maaltijden wat er na de rit overblijft, nooit minder dan op een rustdag", () => {
    expect(mealCarbsBasis({ weightKg: 70, dayType: "rust", rideMinutes: null })).toBe(280);
    // Zwaar, 2 uur: 560 − (70 + 90 + 70) = 330.
    expect(mealCarbsBasis({ weightKg: 70, dayType: "zwaar", rideMinutes: 120 })).toBe(330);
    // Lang, 4 uur: 700 − 440 = 260, onder de 280 van een rustdag.
    expect(mealCarbsBasis({ weightKg: 70, dayType: "lang", rideMinutes: 240 })).toBe(280);
    expect(mealTarget("diner", { weightKg: 70, dayType: "lang", rideMinutes: 240 }).carbsG).toBe(84);
  });

  it("houdt het dagtotaal van alle momenten binnen de band", () => {
    const outside: string[] = [];
    for (const weightKg of [55, 70, 90]) {
      for (const [minutes, intensity] of [0, 45, 75, 90, 120, 150, 180, 240].flatMap((m) =>
        ["endurance", "tempo", "threshold"].map((i) => [m, m === 0 ? "rest" : i] as const),
      )) {
        const dayType = classifyFuelDay(minutes === 0 ? [] : [{ minutes, intensity }]);
        const input = { weightKg, dayType, rideMinutes: minutes || null, rideIntensity: intensity };
        const moments: [MealMoment, number][] = [
          ["ontbijt", 1],
          ["lunch", 1],
          ["diner", 1],
        ];
        if (dayType !== "rust" && dayType !== "licht") moments.push(["tussendoor", 1]);
        if (minutes > 0) moments.push(["voor_rit", 1]);
        if (minutes >= 60) moments.push(["tijdens_rit", minutes / 60], ["na_rit", 1]);
        const total = moments.reduce((sum, [moment, times]) => sum + (mealTarget(moment, input).carbsG ?? 0) * times, 0);
        const band = dailyCarbs(dayType, weightKg);
        if (total < band.min - 1 || total > band.max + 1) outside.push(`${weightKg} kg ${minutes} min ${intensity}: ${total} (${band.min}–${band.max})`);
      }
    }
    expect(outside).toEqual([]);
  });

  it("schaalt vaste ingrediënten begrensd mee met de renner", () => {
    expect(portionEnergyFactor({ weightKg: 70, heightCm: 180, ageYears: 35, sex: null })).toBe(1);
    expect(portionEnergyFactor({ weightKg: 70, heightCm: null, ageYears: null, sex: null })).toBe(1);
    expect(portionEnergyFactor({ weightKg: 40, heightCm: 150, ageYears: 60, sex: "vrouw" })).toBe(0.75);
    expect(portionEnergyFactor({ weightKg: 140, heightCm: null, ageYears: null, sex: null })).toBe(1.5);
  });

  it("rekent leeftijd uit de geboortedatum", () => {
    expect(ageFromBirthDate("1990-09-18", "2026-09-17")).toBe(35);
    expect(ageFromBirthDate("1990-09-17", "2026-09-17")).toBe(36);
    expect(ageFromBirthDate(null, "2026-09-17")).toBeNull();
  });
});

describe("scaleRecipe", () => {
  const oats = food("haver1", 60, 13);
  const quark = food("kwark2", 4, 8);
  const milk = food("melk3", 5, 3);
  const recipe = [
    { food: oats, grams: 70, role: "kh_bron" as const },
    { food: quark, grams: 100, role: "eiwit_bron" as const },
    { food: milk, grams: 250, role: "vast" as const },
  ];

  it("laat de basisportie ongemoeid", () => {
    const base = basePortion(recipe, 1);
    expect(base.factors).toEqual({ kh_bron: 1, eiwit_bron: 1, vast: 1 });
    expect(base.ingredients.map((item) => item.grams)).toEqual([70, 100, 250]);
  });

  it("raakt het doel binnen de grenzen", () => {
    const scaled = scaleRecipe(recipe, 1, { carbsG: 80, proteinG: 30 }, 1);
    expect(scaled.perPortion.carbsG).toBeGreaterThan(70);
    expect(scaled.perPortion.carbsG).toBeLessThan(90);
    expect(scaled.perPortion.proteinG).toBeGreaterThan(25);
    expect(scaled.perPortion.proteinG).toBeLessThan(35);
    expect(scaled.factors.vast).toBe(1);
  });

  it("begrenst elke factor tussen 0,5 en 2", () => {
    const huge = scaleRecipe(recipe, 1, { carbsG: 900, proteinG: 300 }, 3);
    expect(huge.factors).toEqual({ kh_bron: 2, eiwit_bron: 2, vast: 2 });
    const tiny = scaleRecipe(recipe, 1, { carbsG: 1, proteinG: 1 }, 0.1);
    expect(tiny.factors).toEqual({ kh_bron: 0.5, eiwit_bron: 0.5, vast: 0.5 });
  });

  it("deelt door het aantal porties", () => {
    const double = recipe.map((item) => ({ ...item, grams: item.grams * 2 }));
    expect(basePortion(double, 2).ingredients.map((item) => item.grams)).toEqual([70, 100, 250]);
  });

  it("markeert een totaal met ontbrekende NEVO-waarden als onvolledig", () => {
    expect(macrosFor([{ food: food("x", null, 1), grams: 100 }]).incomplete).toBe(true);
    expect(macrosFor([{ food: oats, grams: 100 }])).toEqual({
      carbsG: 60,
      proteinG: 13,
      fatG: 1,
      fiberG: 1,
      incomplete: false,
    });
  });

  it("rondt hoeveelheden netjes af", () => {
    expect(roundGrams(1.3)).toBe(1.5);
    expect(roundGrams(12.4)).toBe(12);
    expect(roundGrams(123)).toBe(125);
  });
});
