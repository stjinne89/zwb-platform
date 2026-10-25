import { describe, expect, it } from "vitest";
import { gutHighAllowed, gutTrainingOn, type GutRun } from "@/lib/nutrition/gut-training";
import { rideBand, rideTargetPerHour } from "@/lib/nutrition/targets";

const running = (startDate: string, protocolSlug = "darmtraining"): GutRun => ({
  protocolSlug,
  startDate,
  status: "actief",
});

describe("darmtraining als plafond onderweg", () => {
  it("geeft tijdens de darmtraining het getal van die week", () => {
    const source = { runs: [running("2026-10-05")], high: false };
    expect(gutTrainingOn(source, "2026-10-05")?.weekGrams).toBe(60);
    expect(gutTrainingOn(source, "2026-10-12")?.weekGrams).toBe(70);
    expect(gutTrainingOn(source, "2026-11-15")?.weekGrams).toBe(110);
    // Voor de start en na zes weken geen weekgetal meer.
    expect(gutTrainingOn(source, "2026-10-04")).toBeNull();
    expect(gutTrainingOn(source, "2026-11-16")).toBeNull();
  });

  it("maakt het weekgetal het doel bij een rit van minstens anderhalf uur, ook boven de band", () => {
    const gut = gutTrainingOn({ runs: [running("2026-10-05")], high: false }, "2026-11-02")!; // week 5: 100 g
    expect(rideTargetPerHour(120, "endurance", gut)).toBe(100);
    expect(rideTargetPerHour(240, "race", gut)).toBe(100);
    // Korter dan anderhalf uur: de gewone regel.
    expect(rideTargetPerHour(75, "endurance", gut)).toBe(30);
  });

  it("rekent het vervolg naar 150 alleen bij ritten van drie uur of langer", () => {
    const gut = gutTrainingOn({ runs: [running("2026-10-05", "darmtraining-150")], high: false }, "2026-10-06")!;
    expect(rideTargetPerHour(200, "endurance", gut)).toBe(130);
    expect(rideTargetPerHour(150, "endurance", gut)).toBe(60);
  });

  it("laat 120 g alleen toe na een afgeronde darmtraining, en alleen als het lid dat koos", () => {
    const done: GutRun = { protocolSlug: "darmtraining", startDate: "2026-08-01", status: "afgerond" };
    expect(gutHighAllowed([done], "2026-10-25")).toBe(true);
    // Nog actief maar voorbij de zesde week telt ook als afgerond.
    expect(gutHighAllowed([running("2026-08-01")], "2026-10-25")).toBe(true);
    expect(gutHighAllowed([running("2026-10-20")], "2026-10-25")).toBe(false);
    expect(gutHighAllowed([{ ...done, protocolSlug: "creatine" }], "2026-10-25")).toBe(false);

    expect(gutTrainingOn({ runs: [done], high: false }, "2026-10-25")).toBeNull();
    // Gekozen zonder afgeronde darmtraining: geen effect.
    expect(gutTrainingOn({ runs: [running("2026-10-20")], high: true }, "2026-10-25")?.high).toBe(false);

    const gut = gutTrainingOn({ runs: [done], high: true }, "2026-10-25")!;
    expect(rideBand(240, gut)).toEqual({ min: 60, max: 120 });
    expect(rideTargetPerHour(240, "race", gut)).toBe(120);
    expect(rideTargetPerHour(240, "tempo", gut)).toBe(90);
    // Een rustige rit en een rit onder 2,5 uur blijven zoals ze waren.
    expect(rideTargetPerHour(240, "endurance", gut)).toBe(60);
    expect(rideBand(120, gut)).toEqual({ min: 30, max: 60 });
  });
});
