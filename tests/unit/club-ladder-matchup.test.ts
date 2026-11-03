import { describe, expect, it } from "vitest";
import { buildLadderMatchup, ourAdvantages, riderPowerFromMatches, type MatchupSignup } from "@/lib/club-ladder/matchup";
import type { MatchRider, PowerWkg, StoredMatch } from "@/lib/club-ladder/team-power";

const wkg = (s15: number | null, m1: number | null, m5: number | null, m20: number | null): PowerWkg => ({ s15, m1, m5, m20 });

function rider(zwiftId: number, team: string, power: PowerWkg | null, racingScore: number | null = null): MatchRider {
  return {
    name: `R${zwiftId}`,
    position: 1,
    points: 0,
    team,
    timeS: null,
    avgWkg: null,
    zwiftId,
    weightKg: 70,
    racingScore,
    powerWkg: power,
  };
}

function match(resultId: number, challenger: string, opponent: string, riders: MatchRider[]): StoredMatch {
  return {
    resultId,
    racedOn: "2026-11-01",
    routeName: null,
    routeSlug: null,
    challenger,
    challengerScore: 30,
    opponent,
    opponentScore: 25,
    riders,
  };
}

const signup = (zwiftId: number, team: string, position: number | null): MatchupSignup => ({
  zwiftId,
  team,
  name: `R${zwiftId}`,
  position,
});

const climb = { s15: 0, m1: 0.1, m5: 0.3, m20: 0.6 };

describe("riderPowerFromMatches", () => {
  it("neemt per duur het beste over alle races en de nieuwste ZRS", () => {
    const power = riderPowerFromMatches([
      match(2, "A", "B", [rider(1, "A", wkg(10, 6, 4, 3.2), 600)]),
      match(1, "A", "B", [rider(1, "A", wkg(11, 5.5, 4.2, null), 550)]),
    ]);
    expect(power.get(1)).toEqual({ wkg: wkg(11, 6, 4.2, 3.2), races: 2, racingScore: 600 });
  });
});

describe("buildLadderMatchup", () => {
  const matches = [
    match(1, "ZWBeasts", "Galaxy Avengers", [
      rider(1, "ZWBeasts", wkg(10, 6, 4.4, 4)),
      rider(2, "ZWBeasts", wkg(10, 6, 4.4, 4)),
      rider(11, "Galaxy Avengers", wkg(12, 6.6, 4, 3.6)),
      rider(12, "Galaxy Avengers", wkg(12, 6.6, 4, 3.6)),
    ]),
  ];

  it("zet de opgestelde renners tegen elkaar af en weegt naar het parcours", () => {
    const result = buildLadderMatchup({
      ourName: "ZWBeasts",
      opponent: "Galaxy Avengers",
      signups: [
        signup(1, "ZWBeasts", 1),
        signup(2, "ZWBeasts", 2),
        signup(3, "ZWBeasts", null),
        signup(11, "Galaxy Avengers", 1),
        signup(12, "Galaxy Avengers", 2),
      ],
      matches,
      power90: new Map(),
      scores: new Map([[1, 640]]),
      weights: climb,
    });
    expect(result.basis).toBe("lineup");
    // Alleen opgestelden; de aangemelde reserve valt weg.
    expect(result.ours.riders.map((r) => r.zwiftId)).toEqual([1, 2]);
    expect(result.ours.lineup).toBe(true);
    expect(result.ours.riders[0].racingScore).toBe(640);
    const byDuration = Object.fromEntries(result.durations.map((row) => [row.duration, row.edgePct]));
    expect(byDuration).toEqual({ s15: -18, m1: -10, m5: 10, m20: 11 });
    expect(ourAdvantages(result)).toEqual(["m5", "m20"]);
    // 0,1 × −0,0953 + 0,3 × 0,0953 + 0,6 × 0,1054 = 0,082 → +8%
    expect(result.routeEdgePct).toBe(8);
  });

  it("valt zonder opstelling terug op de ladderraces van beide teams", () => {
    const result = buildLadderMatchup({
      ourName: "ZWBeasts",
      opponent: "Galaxy Avengers",
      signups: [],
      matches,
      power90: new Map(),
      scores: new Map(),
      weights: null,
    });
    expect(result.basis).toBe("races");
    expect(result.ours.wkg).toEqual(wkg(10, 6, 4.4, 4));
    expect(result.theirs.races).toBe(1);
    expect(result.routeEdgePct).toBeNull();
    expect(result.durations.every((row) => row.weight === null)).toBe(true);
  });

  it("gebruikt 90 dagen van ZwiftRacing voor beide teams, ook boven de ladderraces", () => {
    const result = buildLadderMatchup({
      ourName: "ZWBeasts",
      opponent: "Galaxy Avengers",
      signups: [signup(1, "ZWBeasts", 1), signup(11, "Galaxy Avengers", 1), signup(12, "Galaxy Avengers", 2)],
      matches,
      // Dawson: 20 min 3,62 in de ladder, 4,18 over 90 dagen.
      power90: new Map([
        [1, wkg(11, 7, 5.3, 4.7)],
        [11, wkg(14.5, 8.2, 5.1, 4.2)],
      ]),
      scores: new Map(),
      weights: climb,
    });
    expect(result.ours.riders[0]).toMatchObject({ wkg: wkg(11, 7, 5.3, 4.7), source: "90d" });
    expect(result.theirs.riders.map((r) => r.source)).toEqual(["90d", "ladder"]);
    expect(result.basis).toBe("lineup");
    // Tegenstander: gemiddelde van 90 dagen (11) en ladder (12).
    expect(result.theirs.wkg).toEqual(wkg(13.25, 7.4, 4.55, 3.9));
  });

  it("mengt zonder aanmeldingen aan beide kanten geen bronnen", () => {
    const result = buildLadderMatchup({
      ourName: "ZWBeasts",
      opponent: "Galaxy Avengers",
      signups: [signup(5, "ZWBeasts", 1)],
      matches: [],
      power90: new Map([[5, wkg(null, 6, 4.5, 4)]]),
      scores: new Map(),
      weights: climb,
    });
    expect(result.ours.riders[0]).toMatchObject({ wkg: wkg(null, 6, 4.5, 4), source: "90d" });
    expect(result.basis).toBe("races");
    expect(result.ours.wkg).toBeNull();
    expect(result.durations.every((row) => row.edgePct === null)).toBe(true);
  });

  it("toont alle aanmeldingen zolang niemand een startplek heeft", () => {
    const result = buildLadderMatchup({
      ourName: "ZWBeasts",
      opponent: "Galaxy Avengers",
      signups: [signup(2, "ZWBeasts", null), signup(1, "ZWBeasts", null)],
      matches,
      power90: new Map(),
      scores: new Map(),
      weights: null,
    });
    expect(result.ours.lineup).toBe(false);
    expect(result.ours.riders.map((r) => r.zwiftId)).toEqual([1, 2]);
  });
});
