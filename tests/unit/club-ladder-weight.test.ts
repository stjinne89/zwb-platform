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
    expect(full.s15!).toBeGreaterThan(12);
  });

  it("telt gewicht op het vlakke alleen in de sprint, bergop op elke duur", () => {
    const heavy = sideRouteWkg([{ wkg: same, weightKg: 90 }], flat, true)!;
    expect(heavy.s15!).toBeGreaterThan(12);
    expect(heavy.m1).toBe(7);
    expect(heavy.m20).toBe(4);
    const slope: DurationTerrain = { s15: [{ pct: 6, share: 1 }], m1: [{ pct: 6, share: 1 }], m5: [{ pct: 6, share: 1 }], m20: [{ pct: 6, share: 1 }] };
    expect(sideRouteWkg([{ wkg: same, weightKg: 90 }], slope, true)!.m20!).toBeGreaterThan(4);
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

  it("geeft de zwaardere ploeg bij gelijke W/kg op een vlak parcours het voordeel in de sprint", () => {
    const matchup = build(heavy);
    expect(matchup.weightCounts).toBe(true);
    expect(matchup.durations.every((row) => row.ours === row.theirs)).toBe(true);
    expect(matchup.routeEdgePct!).toBeGreaterThan(5);
    const edge = Object.fromEntries(matchup.durations.map((row) => [row.duration, row.edgePct]));
    expect(edge.s15!).toBeGreaterThan(10);
    // Op het vlakke valt in de groep niemand weg: daar geen voordeel uit gewicht.
    expect(edge.m20).toBe(0);
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
  const riders = (side: string, kg: number) =>
    [1, 2, 3, 4, 5].map((i) => ({ key: `${side}${i}`, name: `${side}${i}`, wkg: same, weightKg: kg, source: "90d" as const }));
  const advise = (ours: number, theirs: number) =>
    buildLadderAdvice({
      options: ladderRouteOptions(),
      favorites: new Set(),
      ourNames: ["Ons"],
      ours: riders("o", ours),
      theirName: "Zij",
      theirs: riders("z", theirs),
      matches: [],
    })!;

  it("stuurt een zware ploeg naar het vlakke en een lichte naar de klim", () => {
    const heavy = advise(85, 65);
    expect(heavy.weightCounts).toBe(true);
    expect(heavy.weightKg).toEqual({ ours: 85, theirs: 65 });
    expect(heavy.routes[0].routeClass).toBe("vlak");
    expect(heavy.routes[0].edgePct!).toBeGreaterThan(5);
    expect(heavy.routes[0].reasons.some((reason) => reason.text === "Gewicht scheelt hier" && reason.pct! > 0)).toBe(true);
    expect(["klim", "heuvel"]).toContain(advise(65, 85).routes[0].routeClass);
    // Het overzicht per duur blijft gewone W/kg.
    expect(heavy.durations.every((row) => row.edgePct === 0)).toBe(true);
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

import { pickFive, recentTeamRiders, type PoolRider } from "@/lib/club-ladder/opponent-five";
import type { MatchRider, StoredMatch } from "@/lib/club-ladder/team-power";

describe("beste vijf van de tegenstander", () => {
  // Vijf sprinters (hard op 15 s, zwak op 20 min) en vijf klimmers (andersom), allemaal 72 kg.
  const sprinter = (id: number): PoolRider => ({ zwiftId: id, name: `S${id}`, races: 3, wkg: wkg(14, 8, 4.4, 3.6), weightKg: 72 });
  const climber = (id: number): PoolRider => ({ zwiftId: id, name: `K${id}`, races: 3, wkg: wkg(9, 6.2, 5.2, 4.6), weightKg: 72 });
  const pool = [1, 2, 3, 4, 5].map(sprinter).concat([11, 12, 13, 14, 15].map(climber));

  it("kiest voor Sprint de sprinters en voor Klim de klimmers", () => {
    expect(pickFive(pool, "sprint").map((r) => r.zwiftId).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect(pickFive(pool, "klim").map((r) => r.zwiftId).sort((a, b) => a - b)).toEqual([11, 12, 13, 14, 15]);
    expect(pickFive(pool, "overall")).toHaveLength(5);
  });

  it("laat op het vlakke een zware renner voorgaan bij gelijke W/kg", () => {
    const even = [1, 2, 3, 4, 5, 6].map((id) => ({ zwiftId: id, name: `R${id}`, races: 1, wkg: same, weightKg: id === 6 ? 90 : 70 }));
    expect(pickFive(even, "sprint").map((r) => r.zwiftId)).toContain(6);
  });

  it("telt per renner in hoeveel van de laatste tien races hij reed", () => {
    const race = (id: number, date: string, riders: number[]): StoredMatch => ({
      resultId: id,
      racedOn: date,
      routeName: null,
      routeSlug: null,
      challenger: "Zij",
      challengerScore: 30,
      opponent: "Ander",
      opponentScore: 25,
      riders: riders.map(
        (zwiftId): MatchRider => ({ name: `R${zwiftId}`, position: 1, points: 0, team: "Zij", timeS: null, avgWkg: null, zwiftId, weightKg: 70, racingScore: null, powerWkg: null }),
      ),
    });
    const matches = Array.from({ length: 12 }, (_, i) => race(i + 1, `2026-10-${String(i + 1).padStart(2, "0")}`, i < 2 ? [9] : [1, i % 2 ? 2 : 3]));
    const recent = recentTeamRiders(matches, "Zij");
    expect(recent.races).toBe(10);
    expect(recent.riders.find((r) => r.zwiftId === 1)?.races).toBe(10);
    // Renner 9 reed alleen de twee oudste races.
    expect(recent.riders.some((r) => r.zwiftId === 9)).toBe(false);
  });

  it("zet in de matchup de gekozen vijf aan de kant van de tegenstander, met hun races", () => {
    const ids = [...pool.map((r) => r.zwiftId)];
    const matchup = buildLadderMatchup({
      ourName: "Ons",
      opponent: "Zij",
      signups: [],
      ourSelection: [21, 22, 23].map((zwiftId) => ({ zwiftId, team: "Ons", name: `O${zwiftId}`, position: null })),
      matches: [],
      power90: new Map([...pool.map((r) => [r.zwiftId, r.wkg] as const), [21, same], [22, same], [23, same]]),
      scores: new Map(),
      weights: null,
      riderWeights: new Map(ids.map((id) => [id, 72])),
      theirRecent: { riders: pool.map(({ zwiftId, name, races }) => ({ zwiftId, name, races })), races: 10 },
      theirFocus: "klim",
    });
    expect(matchup.basis).toBe("squad");
    expect(matchup.theirs.focus).toBe("klim");
    expect(matchup.theirs.recentRaces).toBe(10);
    expect(matchup.theirs.riders.map((r) => r.zwiftId).sort((a, b) => a - b)).toEqual([11, 12, 13, 14, 15]);
    expect(matchup.theirs.riders.every((r) => r.races === 3)).toBe(true);
    expect(matchup.theirs.wkg?.m20).toBe(4.6);
  });

  describe("met een bekende ploeg van de tegenstander", () => {
    const ids = [...pool.map((r) => r.zwiftId)];
    const build = (signups: Array<{ zwiftId: number; position: number | null }>, theirFocus?: "klim") =>
      buildLadderMatchup({
        ourName: "Ons",
        opponent: "Zij",
        signups: [
          ...[21, 22, 23].map((zwiftId) => ({ zwiftId, team: "Ons", name: `O${zwiftId}`, position: null })),
          ...signups.map(({ zwiftId, position }) => ({ zwiftId, team: "Zij", name: `Z${zwiftId}`, position })),
        ],
        matches: [],
        power90: new Map([...pool.map((r) => [r.zwiftId, r.wkg] as const), [21, same], [22, same], [23, same]]),
        scores: new Map(),
        weights: null,
        riderWeights: new Map(ids.map((id) => [id, 72])),
        theirRecent: { riders: pool.map(({ zwiftId, name, races }) => ({ zwiftId, name, races })), races: 10 },
        theirFocus,
      });
    const sprinters = [1, 2, 3, 4, 5].map((zwiftId, i) => ({ zwiftId, position: i + 1 }));

    it("houdt zonder type de echte opstelling", () => {
      const matchup = build(sprinters);
      expect(matchup.basis).toBe("lineup");
      expect(matchup.theirs.lineup).toBe(true);
      expect(matchup.theirs.focus).toBeNull();
      expect(matchup.theirs.riders.map((r) => r.zwiftId)).toEqual([1, 2, 3, 4, 5]);
    });

    it("kiest per type naast een opstelling uit de recente renners", () => {
      const matchup = build(sprinters, "klim");
      expect(matchup.basis).toBe("squad");
      expect(matchup.theirs.focus).toBe("klim");
      expect(matchup.theirs.riders.map((r) => r.zwiftId).sort((a, b) => a - b)).toEqual([11, 12, 13, 14, 15]);
    });

    it("kiest per type uit meer dan vijf aanmeldingen zonder startplek", () => {
      const signed = [1, 2, 3, 11, 12, 13].map((zwiftId) => ({ zwiftId, position: null }));
      const matchup = build(signed, "klim");
      expect(matchup.basis).toBe("lineup");
      expect(matchup.theirs.riders.map((r) => r.zwiftId)).toEqual(expect.arrayContaining([11, 12, 13]));
      expect(matchup.theirs.riders.every((r) => [1, 2, 3, 11, 12, 13].includes(r.zwiftId))).toBe(true);
      expect(matchup.theirs.riders).toHaveLength(5);
    });
  });
});
