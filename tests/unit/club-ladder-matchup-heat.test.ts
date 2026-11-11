import { describe, expect, it } from "vitest";
import type { MatchupRider } from "@/lib/club-ladder/matchup";
import { HEAT_CLASS, HEAT_STEPS, heatRange, heatStep } from "@/lib/club-ladder/matchup-heat";

const rider = (name: string, wkg: Partial<Record<"s15" | "m1" | "m5" | "m20", number | null>> | null, weightKg: number | null = 70) =>
  ({
    zwiftId: name.length,
    name,
    wkg: wkg ? { s15: null, m1: null, m5: null, m20: null, ...wkg } : null,
    weightKg,
  }) as unknown as MatchupRider;

describe("heatRange", () => {
  it("neemt laagste en hoogste per duur over alle renners", () => {
    const range = heatRange([rider("a", { s15: 10, m20: 4 }), rider("bb", { s15: 14, m20: 3.5 }), rider("ccc", null)], "wkg");
    expect(range.s15).toEqual({ min: 10, max: 14 });
    expect(range.m20).toEqual({ min: 3.5, max: 4 });
    expect(range.m1).toBeNull();
  });

  it("geen schaal bij één renner of gelijke waarden", () => {
    expect(heatRange([rider("a", { s15: 10 })], "wkg").s15).toBeNull();
    expect(heatRange([rider("a", { s15: 10 }), rider("bb", { s15: 10 })], "wkg").s15).toBeNull();
  });

  it("rekent in watt met het gewicht; zonder gewicht telt een renner niet", () => {
    const range = heatRange([rider("a", { m5: 5 }, 60), rider("bb", { m5: 4 }, 80), rider("ccc", { m5: 6 }, null)], "w");
    expect(range.m5).toEqual({ min: 300, max: 320 });
  });
});

describe("heatStep", () => {
  const range = { min: 10, max: 14 };

  it("zwakste stap 0, sterkste de hoogste stap, daartussen afgerond", () => {
    expect(heatStep(10, range)).toBe(0);
    expect(heatStep(14, range)).toBe(HEAT_STEPS - 1);
    expect(heatStep(12, range)).toBe(2);
  });

  it("geen stap zonder waarde of schaal", () => {
    expect(heatStep(null, range)).toBeNull();
    expect(heatStep(12, null)).toBeNull();
  });

  it("een klasse per stap", () => {
    expect(HEAT_CLASS).toHaveLength(HEAT_STEPS);
  });
});
