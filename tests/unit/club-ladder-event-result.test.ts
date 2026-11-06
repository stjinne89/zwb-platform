import { describe, expect, it } from "vitest";
import { expectationRiders, expectedPlaces, ladderEventResult, pickEventMatch, starterRatings, startersFromResult } from "@/lib/club-ladder/event-result";
import type { LadderMatchup, MatchupRider, MatchupSide } from "@/lib/club-ladder/matchup";
import type { MatchRider, PowerWkg, StoredMatch } from "@/lib/club-ladder/team-power";

const wkg = (value: number): PowerWkg => ({ s15: value * 2, m1: value * 1.5, m5: value * 1.1, m20: value });

const rider = (position: number, team: string, zwiftId: number | null = null, name = `R${position}`): MatchRider => ({
  name,
  position,
  points: 11 - position,
  timeS: 2400 + position,
  avgWkg: 3.5,
  team,
  zwiftId,
  weightKg: null,
  racingScore: null,
  powerWkg: null,
});

const match = (riders: MatchRider[], challengerScore: number, opponentScore: number): StoredMatch => ({
  resultId: 77,
  racedOn: "2026-11-05",
  routeName: null,
  routeSlug: null,
  challenger: "ZWBandits",
  challengerScore,
  opponent: "Rivals",
  opponentScore,
  riders,
});

describe("pickEventMatch", () => {
  const rows = [
    { result_id: 1, raced_on: "2026-11-05", raced_at: "19:00:00", challenger: "ZWBandits", opponent: "Rivals" },
    { result_id: 2, raced_on: "2026-11-05", raced_at: "19:00:00", challenger: "ZWBandits", opponent: "Others" },
    { result_id: 3, raced_on: "2026-11-03", raced_at: "19:00:00", challenger: "Rivals", opponent: "ZWBandits" },
  ];

  it("kiest dezelfde twee teams op de dag van het event, in beide richtingen", () => {
    expect(pickEventMatch(rows, { ours: "zwbandits", opponent: "Rivals" }, "2026-11-05T19:00:00.000Z")?.result_id).toBe(1);
    expect(pickEventMatch(rows, { ours: "ZWBandits", opponent: "Rivals" }, "2026-11-03T19:00:00.000Z")?.result_id).toBe(3);
  });

  it("negeert een wedstrijd van een andere dag", () => {
    expect(pickEventMatch(rows, { ours: "ZWBandits", opponent: "Rivals" }, "2026-11-04T19:00:00.000Z")).toBeNull();
  });
});

describe("startersFromResult", () => {
  it("neemt het Zwift-ID uit de uitslag en anders op naam uit de aanmeldingen", () => {
    const starters = startersFromResult(
      [rider(1, "ZWBandits", 11), rider(2, "Rivals", null, "Ann [XYZ]"), rider(3, "Rivals", null, "Onbekend")],
      [{ zwiftId: 22, team: "Rivals", name: "ann", position: 1 }],
    );
    expect([...starters.entries()].map(([position, s]) => [position, s.zwiftId])).toEqual([
      [1, 11],
      [2, 22],
    ]);
  });
});

describe("expectedPlaces", () => {
  it("zet de sterkste op de vrije plekken en laat wie geen vermogen heeft op zijn plek", () => {
    const places = expectedPlaces([
      { position: 1, rating: 0.9 },
      { position: 2, rating: null },
      { position: 3, rating: 1.2 },
      { position: 4, rating: 1.0 },
    ]);
    expect(places).toEqual(
      new Map([
        [3, 1],
        [4, 3],
        [1, 4],
        [2, 2],
      ]),
    );
  });

  it("verwacht niets met minder dan twee sterktes", () => {
    expect(expectedPlaces([{ position: 1, rating: 1 }, { position: 2, rating: null }])).toBeNull();
  });
});

describe("ladderEventResult", () => {
  const riders = [rider(1, "Rivals"), rider(2, "ZWBandits"), rider(3, "ZWBandits"), rider(4, "Rivals")];

  it("geeft per renner verwacht en verschil, en de verwachte score", () => {
    // Verwacht: 2, 3, 1, 4 → ZWBandits 10 + 9, Rivals 8 + 7.
    const ratings = new Map<number, number | null>([
      [1, 1.0],
      [2, 1.3],
      [3, 1.2],
      [4, 0.8],
    ]);
    const result = ladderEventResult(match(riders, 17, 17), "ZWBandits", ratings);
    expect(result.rows.map((row) => [row.position, row.expected, row.delta])).toEqual([
      [1, 3, 2],
      [2, 1, -1],
      [3, 2, -1],
      [4, 4, 0],
    ]);
    expect(result.expectedScore).toEqual({ ours: 19, theirs: 15 });
    // Gelijk: de uitdager verliest.
    expect(result.won).toBe(false);
    expect(result.rows[1].own).toBe(true);
  });

  it("toont de score van ZWB ook als ZWB de uitgedaagde is", () => {
    const result = ladderEventResult({ ...match(riders, 15, 19), challenger: "Rivals", opponent: "ZWBandits" }, "ZWBandits", new Map());
    expect([result.ourScore, result.theirScore, result.won, result.opponent]).toEqual([19, 15, true, "Rivals"]);
    expect(result.expectedScore).toBeNull();
    expect(result.rows.every((row) => row.expected === null && row.delta === null)).toBe(true);
  });
});

describe("expectationRiders", () => {
  const matchupRider = (zwiftId: number, power: PowerWkg | null, routeWkg: PowerWkg | null = null): MatchupRider => ({
    zwiftId,
    name: `R${zwiftId}`,
    position: null,
    wkg: power,
    source: power ? "90d" : null,
    racingScore: null,
    weightKg: null,
    routeWkg,
    races: null,
  });
  const side = (name: string, riders: MatchupRider[]) => ({ name, riders }) as unknown as MatchupSide;
  const matchup = (ours: MatchupRider[], theirs: MatchupRider[]) =>
    ({ ours: side("ZWBandits", ours), theirs: side("Rivals", theirs) }) as unknown as LadderMatchup;

  it("neemt het vermogen met gewicht als dat meetelt, zonder vermogen niet, en de eerste matchup wint", () => {
    const riders = expectationRiders([
      matchup([matchupRider(1, wkg(4), wkg(4.2)), matchupRider(2, null)], [matchupRider(3, wkg(3.8))]),
      matchup([], [matchupRider(3, wkg(9)), matchupRider(4, wkg(3.5))]),
    ]);
    expect(riders.map((rider) => [rider.zwiftId, rider.own, rider.wkg.m20])).toEqual([
      [1, true, 4.2],
      [3, false, 3.8],
      [4, false, 3.5],
    ]);
  });
});

describe("starterRatings", () => {
  const starters = new Map([
    [1, { zwiftId: 11, team: "Rivals", name: "A", position: null }],
    [2, { zwiftId: 22, team: "ZWBandits", name: "B", position: null }],
    [3, { zwiftId: 33, team: "ZWBandits", name: "C", position: null }],
  ]);

  it("gebruikt het vermogen van vóór de start, en voor een wissel dat van nu", () => {
    const frozen = new Map([
      [11, wkg(3)],
      [22, wkg(4)],
    ]);
    // Na de race hoger (de race zelf in de 90 dagen): telt niet, het bevroren getal wel.
    const live = new Map([
      [11, wkg(5)],
      [33, wkg(3.5)],
    ]);
    const ratings = starterRatings(starters, frozen, live, null);
    expect(ratings.get(2)!).toBeGreaterThan(ratings.get(3)!);
    expect(ratings.get(3)!).toBeGreaterThan(ratings.get(1)!);
  });

  it("geeft null zonder vermogen", () => {
    expect(starterRatings(starters, new Map(), new Map([[11, wkg(3)]]), null).get(2)).toBeNull();
  });
});
