import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildLadderAdvice } from "@/lib/club-ladder/advice";
import { buildLadderMatchup, type MatchupSignup } from "@/lib/club-ladder/matchup";
import { referenceWkg, shownWeight, sideRouteWkg, weightsUsable } from "@/lib/club-ladder/rider-weight";
import { latestRiderWeights } from "@/lib/club-ladder/rider-weights";
import { durationDemand, durationWeights, ladderRouteBySlug, ladderRouteOptions, type DurationTerrain } from "@/lib/club-ladder/routes";
import type { PowerWkg } from "@/lib/club-ladder/team-power";

const wkg = (s15: number, m1: number, m5: number, m20: number): PowerWkg => ({ s15, m1, m5, m20 });
const same = wkg(12, 7, 4.8, 4);
const flat: DurationTerrain = { s15: [{ pct: 0, share: 1 }], m1: [{ pct: 0, share: 1 }], m5: [{ pct: 0, share: 1 }], m20: [{ pct: 0, share: 1 }] };

describe("referenceWkg", () => {
  it("laat 75 kg zoals het is", () => {
    expect(referenceWkg(4, 75, 0)).toBeCloseTo(4, 6);
    expect(referenceWkg(4, 75, 7)).toBeCloseTo(4, 6);
  });

  it("maakt een zware renner bij gelijke W/kg sterker, vooral op het vlakke", () => {
    const flatGain = referenceWkg(4, 85, 0) / referenceWkg(4, 65, 0);
    const climbGain = referenceWkg(4, 85, 6) / referenceWkg(4, 65, 6);
    expect(flatGain).toBeGreaterThan(1.15);
    expect(flatGain).toBeLessThan(1.25);
    expect(climbGain).toBeGreaterThan(1);
    expect(climbGain).toBeLessThan(1.05);
  });
});

describe("durationDemand", () => {
  it("geeft dezelfde gewichten als durationWeights en hellingen die per duur optellen tot 1", () => {
    const climbs = [{ km: 2, pct: 6 }];
    const { weights, terrain } = durationDemand(12, climbs, null, 2);
    expect(weights).toEqual(durationWeights(12, climbs, null, 2));
    for (const parts of Object.values(terrain)) {
      if (parts.length === 0) continue;
      expect(parts.reduce((sum, part) => sum + part.share, 0)).toBeCloseTo(1, 9);
    }
    expect(terrain.m5.some((part) => part.pct === 6)).toBe(true);
    expect(terrain.s15).toEqual([{ pct: 0, share: 1 }]);
  });

  it("staat op elk ladderparcours", () => {
    expect(ladderRouteOptions().every((option) => option.terrain.m20.length > 0)).toBe(true);
  });
});

describe("gewicht per kant", () => {
  it("geeft wie geen gewicht heeft het gemiddelde van zijn kant", () => {
    const withGap = sideRouteWkg([{ wkg: same, weightKg: 80 }, { wkg: same, weightKg: null }], flat, true)!;
    const full = sideRouteWkg([{ wkg: same, weightKg: 80 }, { wkg: same, weightKg: 80 }], flat, true)!;
    expect(withGap).toEqual(full);
    expect(full.m20!).toBeGreaterThan(4);
  });

  it("rekent zonder parcours of zonder gewicht in gewone W/kg", () => {
    expect(sideRouteWkg([{ wkg: same, weightKg: 90 }], null, true)).toEqual(same);
    expect(sideRouteWkg([{ wkg: same, weightKg: 90 }], flat, false)).toEqual(same);
  });

  it("telt gewicht pas vanaf drie per kant, en toont het ook pas dan", () => {
    const three = [80, 81, 82].map((weightKg) => ({ weightKg }));
    const two = [{ weightKg: 70 }, { weightKg: 71 }, { weightKg: null }];
    expect(weightsUsable(three, three)).toBe(true);
    expect(weightsUsable(three, two)).toBe(false);
    expect(shownWeight(three)).toBe(81);
    expect(shownWeight(two)).toBeNull();
  });
});

describe("matchup met gewicht", () => {
  const ids = [1, 2, 3, 11, 12, 13];
  const signups: MatchupSignup[] = ids.map((zwiftId) => ({ zwiftId, team: zwiftId < 10 ? "Ons" : "Zij", name: `R${zwiftId}`, position: null }));
  const power90 = new Map(ids.map((id) => [id, same]));
  const heavy = new Map(ids.map((id) => [id, id < 10 ? 85 : 65]));
  const route = ladderRouteBySlug("tempus-fugit")!;

  const build = (riderWeights: Map<number, number>, withRoute = true) =>
    buildLadderMatchup({
      ourName: "Ons",
      opponent: "Zij",
      signups,
      matches: [],
      power90,
      scores: new Map(),
      weights: withRoute ? route.weights : null,
      terrain: withRoute ? route.terrain : null,
      riderWeights,
    });

  it("geeft de zwaardere ploeg bij gelijke W/kg het voordeel op een vlak parcours", () => {
    const matchup = build(heavy);
    expect(matchup.weightCounts).toBe(true);
    expect(matchup.durations.every((row) => row.ours === row.theirs)).toBe(true);
    expect(matchup.routeEdgePct!).toBeGreaterThan(10);
    expect(matchup.ours.weightKg).toBe(85);
    expect(matchup.theirs.weightKg).toBe(65);
    expect(matchup.ours.riders[0].routeWkg!.s15!).toBeGreaterThan(12);
  });

  it("rekent zonder parcours of met te weinig gewichten alleen W/kg", () => {
    expect(build(heavy, false).weightCounts).toBe(false);
    expect(build(heavy, false).durations.every((row) => row.edgePct === 0)).toBe(true);
    const few = new Map([...heavy].filter(([id]) => id !== 12 && id !== 13));
    const matchup = build(few);
    expect(matchup.weightCounts).toBe(false);
    expect(matchup.routeEdgePct).toBe(0);
    expect(matchup.theirs.weightKg).toBeNull();
  });
});

describe("advies met gewicht", () => {
  const rows = (kg: number) => [1, 2, 3, 4, 5].map(() => ({ wkg: same, weightKg: kg }));
  const advise = (ours: number, theirs: number) =>
    buildLadderAdvice({
      options: ladderRouteOptions(),
      favorites: new Set(),
      ourNames: ["Ons"],
      ourPower: { wkg: same, riders: 5, rows: rows(ours) },
      theirName: "Zij",
      theirPower: { wkg: same, riders: 5, rows: rows(theirs) },
      matches: [],
    })!;

  it("stuurt een zware ploeg naar het vlakke en een lichte naar de klim", () => {
    const heavy = advise(85, 65);
    expect(heavy.weightCounts).toBe(true);
    expect(heavy.weightKg).toEqual({ ours: 85, theirs: 65 });
    expect(heavy.routes[0].routeClass).toBe("vlak");
    expect(heavy.routes[0].reasons.some((reason) => reason.startsWith("Gewicht scheelt hier +"))).toBe(true);
    expect(["klim", "heuvel"]).toContain(advise(65, 85).routes[0].routeClass);
    // De W/kg-chips blijven gewone W/kg.
    expect(heavy.edge.m20).toBe(0);
  });
});

describe("latestRiderWeights", () => {
  it("neemt per renner het nieuwste gewicht", () => {
    const weights = latestRiderWeights([
      { zwiftId: 1, kg: 80, at: "2026-01-10" },
      { zwiftId: 1, kg: 78, at: "2026-10-01" },
      { zwiftId: 2, kg: 64, at: "" },
    ]);
    expect(weights).toEqual(new Map([[1, 78], [2, 64]]));
  });
});
