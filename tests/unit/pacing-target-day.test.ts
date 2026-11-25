import { describe, expect, it } from "vitest";
import type { RiderContext } from "@/lib/pacing/draft";
import {
  applyTargetDay,
  TARGET_DAY_PCT,
  targetDayChosen,
  targetDayComputedPct,
} from "@/lib/pacing/target-day";
import { buildAssumptions } from "@/lib/pacing/staleness";

const RIDER: RiderContext = {
  model: { cpWatts: 300, wPrimeJoules: 20_000, source: "curve", weightKg: 75 },
  durability: null,
  curve: [
    { seconds: 300, watts: 360 },
    { seconds: 1200, watts: 315 },
  ],
  riderType: "allrounder",
  ftpWatts: 295,
};

const BASE = {
  cpWatts: 300,
  wPrimeJoules: 20_000,
  ftpWatts: 295,
  weightKg: 75,
  cpSource: "curve",
  routeSyncedAt: null,
};

describe("applyTargetDay", () => {
  it("legt de opslag op CP, W′ en de curve", () => {
    const day = applyTargetDay(RIDER, true);
    const factor = 1 + TARGET_DAY_PCT / 100;
    expect(day.model.cpWatts).toBe(Math.round(300 * factor));
    expect(day.model.wPrimeJoules).toBe(Math.round(20_000 * factor));
    expect(day.curve![0].watts).toBeCloseTo(360 * factor, 6);
    expect(day.targetDay).toEqual({
      pct: TARGET_DAY_PCT,
      baseCpWatts: 300,
      baseWPrimeJoules: 20_000,
      baseCurve: RIDER.curve,
    });
    expect(day.model.weightKg).toBe(75);
  });

  it("stapelt niet en is terug te draaien", () => {
    const twice = applyTargetDay(applyTargetDay(RIDER, true), true);
    expect(twice.model.cpWatts).toBe(applyTargetDay(RIDER, true).model.cpWatts);
    const back = applyTargetDay(twice, false);
    expect(back.model.cpWatts).toBe(300);
    expect(back.curve).toEqual(RIDER.curve);
    expect(back.targetDay).toBeNull();
  });

  it("laat de renner ongemoeid als hij uit staat", () => {
    expect(applyTargetDay(RIDER, false).model).toEqual(RIDER.model);
  });
});

describe("keuze bij het plan", () => {
  it("staat standaard aan, ook bij een plan van vóór de doeldag", () => {
    expect(targetDayChosen(null)).toBe(true);
    expect(targetDayChosen(buildAssumptions(BASE))).toBe(true);
    expect(targetDayComputedPct(buildAssumptions(BASE))).toBe(0);
  });

  it("onthoudt uitzetten", () => {
    expect(targetDayChosen(buildAssumptions({ ...BASE, targetDayPct: 0 }))).toBe(false);
    expect(targetDayChosen(buildAssumptions({ ...BASE, targetDayPct: 3 }))).toBe(true);
  });
});
