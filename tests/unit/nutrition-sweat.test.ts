import { describe, expect, it } from "vitest";
import { currentSweatRate, fluidBidons, fluidPerHour, sweatRate } from "@/lib/nutrition/sweat";

describe("zweettest", () => {
  it("rekent gewichtsverlies plus wat je dronk om naar zweet per uur", () => {
    // 0,8 kg lichter en 0,5 l gedronken in een uur: 1,3 l per uur.
    expect(sweatRate({ durationMinutes: 60, weightBeforeKg: 80, weightAfterKg: 79.2, drankMl: 500 })).toEqual({
      ok: true,
      mlPerHour: 1300,
    });
    expect(sweatRate({ durationMinutes: 90, weightBeforeKg: 70, weightAfterKg: 69.4, drankMl: 600 })).toEqual({
      ok: true,
      mlPerHour: 800,
    });
  });

  it("telt een te korte of onwaarschijnlijke test niet mee", () => {
    expect(sweatRate({ durationMinutes: 30, weightBeforeKg: 80, weightAfterKg: 79.5, drankMl: 0 }).ok).toBe(false);
    // Zwaarder na de rit dan wat je dronk verklaart: negatief zweetverlies.
    expect(sweatRate({ durationMinutes: 60, weightBeforeKg: 80, weightAfterKg: 81, drankMl: 200 }).ok).toBe(false);
    // Vijf liter per uur kan niet.
    expect(sweatRate({ durationMinutes: 60, weightBeforeKg: 80, weightAfterKg: 75, drankMl: 0 }).ok).toBe(false);
    expect(sweatRate({ durationMinutes: 60, weightBeforeKg: Number.NaN, weightAfterKg: 79, drankMl: 0 }).ok).toBe(false);
  });

  it("rekent met de laatste test", () => {
    expect(
      currentSweatRate([
        { testedOn: "2026-10-01", mlPerHour: 900 },
        { testedOn: "2026-10-20", mlPerHour: 1200 },
      ]),
    ).toBe(1200);
    expect(currentSweatRate([])).toBeNull();
  });

  it("geeft een vochtdoel tussen 2% verlies en niet meer dan je zweet", () => {
    // 1 l per uur, 80 kg, 2 uur: 1,6 l mag je verliezen, dus minstens 0,2 l per uur.
    expect(fluidPerHour(1000, 80, 120)).toEqual({ minMl: 200, maxMl: 1000 });
    // Hoe langer de rit, hoe meer je moet drinken.
    expect(fluidPerHour(1000, 80, 240)).toEqual({ minMl: 600, maxMl: 1000 });
    // Weinig zweet op een korte rit: drinken hoeft niet.
    expect(fluidPerHour(400, 80, 90).minMl).toBe(0);
    // Zonder gewicht alleen de bovengrens.
    expect(fluidPerHour(1000, null, 120)).toEqual({ minMl: null, maxMl: 1000 });
  });

  it("neemt zoveel bidons mee als het midden van het vochtdoel vraagt", () => {
    expect(fluidBidons({ minMl: 200, maxMl: 1000 }, 120)).toBe(2);
    expect(fluidBidons({ minMl: 600, maxMl: 1000 }, 240)).toBe(4);
    expect(fluidBidons({ minMl: 0, maxMl: 400 }, 60)).toBe(1);
  });
});
