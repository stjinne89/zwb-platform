import { describe, expect, it } from "vitest";
import { fatigueSetupIssue, loadFatigueSetupIssue } from "@/lib/briljant/fatigue-setup";

describe("kJ-standen voor durability", () => {
  it("meldt een ontbrekende vermoeide curve", () => {
    expect(fatigueSetupIssue(null, 80)).toEqual({ kind: "geen" });
    expect(fatigueSetupIssue([], null)).toEqual({ kind: "geen" });
  });

  it("meldt standen die allemaal onder 10 kJ/kg liggen", () => {
    // 500 kJ bij 82 kg is 6,1 kJ/kg.
    expect(fatigueSetupIssue([{ afterKj: 500 }], 82)).toEqual({ kind: "te-laag", afterKj: 500 });
    expect(fatigueSetupIssue([{ afterKj: 500 }, { afterKj: 2000 }], 82)).toBeNull();
    expect(fatigueSetupIssue([{ afterKj: 1000 }, { afterKj: 2000 }], 83)).toBeNull();
    // Zonder gewicht is te laag niet te beoordelen.
    expect(fatigueSetupIssue([{ afterKj: 500 }], null)).toBeNull();
  });

  it("zegt niets zonder powerprofiel uit intervals.icu", async () => {
    const client = (row: unknown) =>
      ({
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }) }),
      }) as unknown as Parameters<typeof loadFatigueSetupIssue>[0];
    expect(await loadFatigueSetupIssue(client(null), "lid")).toBeNull();
    expect(await loadFatigueSetupIssue(client({ athlete_id: null, weight_kg: 80, curve_points_fatigue: [] }), "lid")).toBeNull();
    expect(
      await loadFatigueSetupIssue(client({ athlete_id: "i1", weight_kg: "82.00", curve_points_fatigue: [{ afterKj: 500, points: [] }] }), "lid"),
    ).toEqual({ kind: "te-laag", afterKj: 500 });
  });
});
