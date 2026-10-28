import { describe, expect, it } from "vitest";
import { expectedOrder, riderExpectation } from "@/lib/zrl-analysis/expectation";
import { compareSegments, pointsBySource, raceContribution, raceRecord, raceTrend, type RaceRecord } from "@/lib/zrl-analysis/history";
import { strengthAdvice } from "@/lib/zrl-analysis/advice";
import { analysePersonalRace } from "@/lib/zrl-analysis/personal";
import type { RaceAnalysis, RiderAnalysis, RiderSegment } from "@/lib/zrl-analysis/race";
import type { RaceData } from "@/lib/zrl-live/snapshot";

describe("expectedOrder", () => {
  it("zet het veld op ZRS van vóór de race, renners zonder score achteraan", () => {
    const order = expectedOrder([1, 2, 3, 4], new Map([[1, 300], [2, 400], [3, null], [4, 350]]));
    expect([...order!.entries()]).toEqual([[2, 1], [4, 2], [1, 3], [3, 4]]);
  });

  it("geeft niets als minder dan 70% van het veld een score heeft", () => {
    expect(expectedOrder([1, 2, 3, 4], new Map([[1, 300], [2, 400]]))).toBeNull();
  });
});

describe("riderExpectation", () => {
  const scores = new Map([[1, 500], [2, 450], [3, 400], [4, 350], [5, 300]]);
  const passes = [
    { index: 0, segmentId: "A" },
    { index: 1, segmentId: "B" },
    { index: 2, segmentId: "A" },
  ];

  it("rekent de punten als de race in ZRS-volgorde was gereden", () => {
    const e = riderExpectation({ athleteId: 3, points: true, starters: [1, 2, 3, 4, 5], finishers: [1, 2, 3, 4, 5], scores, passes })!;
    expect(e.place).toBe(3);
    // FAL 3 per passage; FTS: op A (twee keer) de 5e en 6e tijd (6 + 5), op B de 3e (10); FIN 3; podium 6.
    expect(e.points).toEqual({ fal: 9, fts: 21, fin: 3, podium: 6, total: 39 });
    expect(e.passes).toEqual([
      { index: 0, falRank: 3, points: 8.5 },
      { index: 1, falRank: 3, points: 13 },
      { index: 2, falRank: 3, points: 8.5 },
    ]);
  });

  it("geeft buiten een puntenrace alleen de verwachte plek", () => {
    const e = riderExpectation({ athleteId: 3, points: false, starters: [1, 2, 3, 4, 5], finishers: [1, 3, 5], scores, passes })!;
    expect(e).toMatchObject({ place: 2, finishers: 3, points: null, passes: [] });
  });

  it("geeft niets voor wie niet finishte", () => {
    expect(riderExpectation({ athleteId: 2, points: true, starters: [1, 2, 3], finishers: [1, 3], scores, passes })).toBeNull();
  });
});

function seg(index: number, segmentId: string, name: string, kind: RiderSegment["kind"], elapsed: number, wkg: number, points: [number, number] = [0, 0]): RiderSegment {
  return { index, segmentId, name, kind, elapsed, watts: Math.round(wkg * 82), wkg, rank: 1, of: 30, falRank: 1, falPoints: points[0], ftsPoints: points[1] };
}

function rider(extra: Partial<RiderAnalysis> = {}): RiderAnalysis {
  return {
    athleteId: 1,
    name: "Stijn",
    time: 2_600_000,
    rank: 6,
    avgWatts: 246,
    wkg: 3,
    powerType: "POWER_METER",
    criticalPower: { s15: 700, m1: 410, m5: 300, m20: 260 },
    cp20Wkg: null,
    points: 100,
    pointsSplit: { fal: 70, fts: 15, fin: 25, podium: 0, total: 110 },
    expected: {
      scoreBefore: 336,
      place: 17,
      finishers: 31,
      points: { fal: 48, fts: 0, fin: 16, podium: 0, total: 64 },
      passes: [
        { index: 0, falRank: 17, points: 16 },
        { index: 1, falRank: 17, points: 16 },
        { index: 2, falRank: 17, points: 16 },
      ],
    },
    dropped: false,
    segments: [
      seg(0, "A", "Jarvis Sprint", "sprint", 12, 8.5, [30, 15]),
      seg(1, "B", "Jarvis KOM", "klim", 170, 4.5, [28, 0]),
      seg(2, "C", "Banner", "segment", 40, 5, [12, 0]),
    ],
    aheadWkg: null,
    ...extra,
  };
}

const RACE_START = Date.parse("2026-10-27T19:08:00Z");

function record(startAt: number, extra: Partial<RaceRecord> = {}): RaceRecord {
  return {
    zwiftEventId: String(startAt),
    title: "Race",
    startAt,
    kind: "race",
    points: true,
    place: 10,
    finishers: 30,
    expectedPlace: 12,
    pointsSplit: null,
    expectedPoints: null,
    byKind: null,
    best15Wkg: null,
    best60Wkg: null,
    segments: [],
    ...extra,
  };
}

describe("pointsBySource en raceRecord", () => {
  it("telt de punten per bron tegenover de verwachting", () => {
    expect(pointsBySource(rider())).toEqual({
      sprint: { scored: 45, expected: 16 },
      klim: { scored: 28, expected: 16 },
      segment: { scored: 12, expected: 16 },
      finish: { scored: 25, expected: 16 },
    });
  });

  it("vat de race samen, met beste 15 s in W/kg op het gewicht van de race", () => {
    const r = raceRecord(rider(), { zwiftEventId: "5758552", title: "ZRL", startAt: RACE_START, kind: "race", finishers: 31 });
    expect(r).toMatchObject({ points: true, place: 6, expectedPlace: 17, best15Wkg: 8.54 });
    expect(r.segments.map((s) => s.segmentId)).toEqual(["A", "B", "C"]);
  });

  it("geeft geen bronnen zonder verwachting", () => {
    expect(pointsBySource(rider({ expected: null }))).toBeNull();
  });
});

describe("compareSegments", () => {
  const before = new Date(RACE_START - 86_400_000).toISOString();
  const during = new Date(RACE_START + 600_000).toISOString();
  const best = (zwiftId: number, segmentId: string, seconds: number, watts: number, at: string) => ({
    zwiftId,
    segmentId,
    seconds,
    watts,
    weightKg: 80,
    at,
    fetchedAt: before,
  });

  const result = compareSegments({
    rider: rider(),
    raceStart: RACE_START,
    weightKg: 82,
    history: [
      record(RACE_START - 7 * 86_400_000, { segments: [{ segmentId: "A", name: "Jarvis Sprint", kind: "sprint", elapsed: 15, wkg: 3.5 }] }),
      record(RACE_START - 14 * 86_400_000, { segments: [{ segmentId: "A", name: "Jarvis Sprint", kind: "sprint", elapsed: 14, wkg: 4 }] }),
      // Later dan deze race: telt niet als eerder.
      record(RACE_START + 7 * 86_400_000, { segments: [{ segmentId: "A", name: "Jarvis Sprint", kind: "sprint", elapsed: 10, wkg: 9 }] }),
    ],
    bests: [
      best(1, "A", 14.5, 300, before),
      // De eigen PR uit deze race zelf: dat wist het briefje nog niet.
      best(1, "B", 165, 380, during),
      best(9, "A", 13, 320, before),
      // Niet in het startveld.
      best(50, "A", 11, 500, before),
    ],
    field: [1, 9],
  });

  it("legt vandaag naast de eigen eerdere passages", () => {
    const sprint = result.find((s) => s.index === 0)!;
    expect(sprint.earlier).toEqual({ count: 2, bestElapsed: 14, bestWkg: 4, medianWkg: 4 });
    expect(sprint.fastestYet).toBe(true);
    expect(sprint).toMatchObject({ points: 45, expectedPoints: 16, expectedFalRank: 17 });
  });

  it("neemt PR en richttijd van vóór de race, uit het startveld, met de watt voor jouw gewicht", () => {
    const sprint = result.find((s) => s.index === 0)!;
    expect(sprint.pr).toEqual({ seconds: 14.5, wkg: 3.75 });
    expect(sprint.target).toEqual({ seconds: 13, wkg: 4, neededWatts: 328 });
    const kom = result.find((s) => s.index === 1)!;
    expect(kom.pr).toBeNull();
    expect(kom.earlier).toBeNull();
    expect(kom.fastestYet).toBe(false);
  });

  it("toont in een puntenrace ook andere segmenten, daarbuiten alleen sprints en klimmen", () => {
    expect(result.map((s) => s.index)).toEqual([0, 1, 2]);
    const scratch = compareSegments({
      rider: rider({ expected: null, segments: rider().segments.map((s) => ({ ...s, falPoints: 0, ftsPoints: 0 })) }),
      raceStart: RACE_START,
      weightKg: 82,
      history: [],
      bests: [],
      field: [],
    });
    expect(scratch.map((s) => s.index)).toEqual([0, 1]);
    expect(scratch[0].points).toBeNull();
  });
});

describe("raceContribution", () => {
  const analysis = (format: RaceAnalysis["format"], riders: RiderAnalysis[]) => ({ format, riders }) as unknown as RaceAnalysis;

  it("vat in een puntenrace plek, punten en het deel van de ploeg samen", () => {
    const others = [
      rider({ athleteId: 2, points: 150, pointsSplit: null, expected: null }),
      rider({ athleteId: 3, points: 30, pointsSplit: null, expected: null }),
    ];
    const c = raceContribution(analysis("points", [rider({ points: 110 }), ...others]), 1)!;
    expect(c).toMatchObject({
      place: 6,
      expectedPlace: 17,
      finishers: 31,
      points: 110,
      expectedPoints: 64,
      teamShare: 38,
      teamRank: 2,
      teamRiders: 3,
      team: [150, 110, 30],
      ownIndex: 1,
      withTeam: null,
    });
    // Klimmen +12, sprints +29, andere segmenten −4, finish +9: de sprints springen eruit.
    expect(c.standout).toEqual({ source: "sprint", diff: 29 });
  });

  it("geeft in een ploegentijdrit W/kg en of je bij de ploeg finishte", () => {
    const c = raceContribution(
      analysis("ttt", [
        rider({ wkg: 3.3, dropped: true, expected: null, pointsSplit: null }),
        rider({ athleteId: 2, wkg: 3.5, expected: null, pointsSplit: null }),
        rider({ athleteId: 3, wkg: 3.2, expected: null, pointsSplit: null }),
      ]),
      1,
    )!;
    expect(c).toMatchObject({ points: null, teamShare: null, withTeam: false, wkg: 3.3, teamWkg: 3.33, team: [3.5, 3.3, 3.2], ownIndex: 1 });
  });

  it("geeft niets voor wie niet in de ploeg reed", () => {
    expect(raceContribution(analysis("points", [rider()]), 99)).toBeNull();
  });
});

describe("raceTrend", () => {
  it("middelt de plekken en de punten per bron over de races", () => {
    const byKind = (sprint: number, klim: number) => ({
      sprint: { scored: sprint, expected: 10 },
      klim: { scored: klim, expected: 10 },
      segment: { scored: 0, expected: 0 },
      finish: { scored: 10, expected: 10 },
    });
    const segments: RaceRecord["segments"] = [
      { segmentId: "A", name: "Sprint", kind: "sprint", elapsed: 12, wkg: 8 },
      { segmentId: "B", name: "KOM", kind: "klim", elapsed: 170, wkg: 4 },
    ];
    const trend = raceTrend([
      record(1, { place: 6, expectedPlace: 17, byKind: byKind(30, 5), segments }),
      record(2, { place: 10, expectedPlace: 8, byKind: byKind(14, 12), segments }),
      record(3, { place: null, expectedPlace: null }),
    ]);
    expect(trend.races.map((r) => r.startAt)).toEqual([3, 2, 1]);
    expect(trend.placed).toBe(2);
    expect(trend.placeGain).toBe(4.5);
    expect(trend.sources.find((s) => s.source === "sprint")).toMatchObject({ races: 2, perRace: 12, scored: 44, expected: 20 });
    expect(trend.sources.find((s) => s.source === "klim")?.perRace).toBe(-1.5);
    // Geen andere segmenten op de route: geen bron.
    expect(trend.sources.some((s) => s.source === "segment")).toBe(false);
  });
});

describe("strengthAdvice", () => {
  const trend = (sprint: number, klim: number, races = 3) => ({
    races: [],
    placed: 0,
    placeGain: null,
    sources: [
      { source: "sprint" as const, races, perRace: sprint, scored: 0, expected: 0 },
      { source: "klim" as const, races, perRace: klim, scored: 0, expected: 0 },
    ],
  });

  it("noemt de sprints als die structureel meer opleveren dan verwacht", () => {
    const [tip] = strengthAdvice(trend(6, -1));
    expect(tip.finding).toBe("In je laatste 3 puntenraces scoorde je op de sprints gemiddeld 6 punten per race meer dan je ZRS liet verwachten; op de klimmen −1.");
    expect(tip.tip).toMatch(/rond de sprints/);
  });

  it("zwijgt als het verschil met de klimmen klein is of er te weinig races zijn", () => {
    expect(strengthAdvice(trend(6, 3))).toEqual([]);
    expect(strengthAdvice(trend(8, -2, 2))).toEqual([]);
    expect(strengthAdvice(trend(4, -6))).toEqual([]);
  });
});

describe("analysePersonalRace met puntentelling", () => {
  const START = 1_800_000_000_000;
  const KOM = "-9223372027220687690";
  const SPRINT = "-9223372031501094040";
  const passage = (athleteId: number, segmentId: string, at: number, elapsed: number) => ({ id: `${athleteId}-${segmentId}-${at}`, athleteId, segmentId, ts: START + at, elapsed });
  const data: RaceData = {
    fetchedAt: START + 3 * 3600_000,
    eventName: "ZRL",
    format: "points",
    eventType: "RACE",
    subgroups: [
      {
        id: "11",
        label: "B",
        startAt: START,
        routeId: "553661379",
        laps: 1,
        entrants: [1, 2, 3].map((id) => ({ zwiftId: String(id), name: `R${id}` })),
        results: [
          { profileId: 3, rank: 1, durationMs: 2_500_000, scoreBefore: 400 },
          { profileId: 1, rank: 2, durationMs: 2_530_000, scoreBefore: 300 },
          { profileId: 2, rank: 3, durationMs: 2_600_000, scoreBefore: 350 },
        ],
        resultsOk: true,
      },
    ],
    passages: [
      passage(1, SPRINT, 200_000, 13),
      passage(3, SPRINT, 201_000, 14),
      passage(2, SPRINT, 202_000, 15),
      passage(3, KOM, 690_000, 262),
      passage(1, KOM, 700_000, 280),
      passage(2, KOM, 720_000, 300),
    ],
    segmentsOk: true,
    withPower: true,
    withScores: true,
  };

  it("geeft per passage de punten en de verwachting op ZRS", () => {
    const race = analysePersonalRace(data, 1, new Map(), "race", "points")!;
    const r = race.rider;
    // Op ZRS de zwakste van drie, gefinisht als tweede.
    expect(r.expected?.place).toBe(3);
    const segmentPoints = r.segments.reduce((sum, s) => sum + s.falPoints + s.ftsPoints, 0);
    expect(segmentPoints).toBe(r.pointsSplit!.fal + r.pointsSplit!.fts);
    const sprint = r.segments.find((s) => s.kind === "sprint")!;
    // Eerste over de streep (3 FAL) en snelste tijd (15 FTS).
    expect(sprint).toMatchObject({ falRank: 1, falPoints: 3, ftsPoints: 15 });
  });

  it("telt zonder puntentelling geen segmentpunten, wel de verwachte plek", () => {
    const r = analysePersonalRace(data, 1, new Map(), "race")!.rider;
    expect(r.segments.every((s) => s.falPoints === 0 && s.ftsPoints === 0)).toBe(true);
    expect(r.expected).toMatchObject({ place: 3, points: null });
  });
});
