import { describe, expect, it } from "vitest";
import { currentWeeklyLoad, loadForIntensity } from "@/lib/training/load-basis";

describe("currentWeeklyLoad", () => {
  it("is CTL × 7 als de ritten niets hogers laten zien", () => {
    expect(
      currentWeeklyLoad({ intervalsLoad: { ctl: 55.2 }, recentLoad: { tssPerWeek: 300, loadCoverage: 1 } }),
    ).toEqual({ weeklyTss: 386, source: "ctl" });
  });

  it("neemt de gereden belasting als die hoger is, opgeschaald naar ritten zonder TSS", () => {
    // 360 TSS over 80% van de rijtijd: zo'n 450 over alles.
    expect(
      currentWeeklyLoad({ intervalsLoad: { ctl: 50 }, recentLoad: { tssPerWeek: 360, loadCoverage: 0.8 } }),
    ).toEqual({ weeklyTss: 450, source: "ritten" });
  });

  it("valt terug op de CTL als ZWB de ritten mist", () => {
    // Het geval uit de analyse: CTL 78, nul ritten in ZWB.
    expect(currentWeeklyLoad({ intervalsLoad: { ctl: 78 }, recentLoad: { tssPerWeek: null, loadCoverage: 0 } })).toEqual({
      weeklyTss: 546,
      source: "ctl",
    });
  });

  it("negeert gereden belasting met te weinig ritten met TSS, en geeft null zonder bron", () => {
    expect(currentWeeklyLoad({ intervalsLoad: null, recentLoad: { tssPerWeek: 100, loadCoverage: 0.3 } })).toBeNull();
    expect(currentWeeklyLoad({ intervalsLoad: { ctl: null }, recentLoad: {} })).toBeNull();
    expect(currentWeeklyLoad({ intervalsLoad: null, recentLoad: { tssPerWeek: 200, loadCoverage: 1 } })).toEqual({
      weeklyTss: 200,
      source: "ritten",
    });
  });
});

describe("loadForIntensity", () => {
  it("rekent met het midden van de band", () => {
    // Drempel 90-104%: IF 0,97, een uur is 94 TSS.
    expect(Math.round(loadForIntensity(60, "threshold"))).toBe(94);
    // Onbekende intensiteit telt als duur.
    expect(loadForIntensity(60, "iets")).toBeCloseTo(loadForIntensity(60, "endurance"), 5);
  });
});
