import { describe, expect, it } from "vitest";
import { analyseRace, segmentKind, type RaceViewInput } from "@/lib/zrl-analysis/race";
import { resultPowerFields, type SubgroupResult } from "@/lib/events/zwift-club";
import type { Passage, ScoredPass } from "@/lib/zrl-live/scoring";

const START = 1_800_000_000_000;
const MIN = 60_000;

/**
 * Ploegentijdrit met twee ploegen: "eigen" (renners 1-5) en "rivaal" (11-14).
 * Tussenpunten: sprint, klim, finish. De eigen ploeg ligt 3 s voor bij de
 * sprint, 1 s achter na de klim en wint 4 s op het slotstuk.
 */
function tttView(): { view: RaceViewInput; results: SubgroupResult[]; passages: Passage[] } {
  const own = [1, 2, 3, 4, 5];
  const rival = [11, 12, 13, 14];
  const ownTimes = [40 * MIN, 40 * MIN + 200, 40 * MIN + 400, 40 * MIN + 600, 50 * MIN];
  const rivalTimes = [40 * MIN + 3000, 40 * MIN + 3100, 40 * MIN + 3200, 40 * MIN + 3300];
  const passes: ScoredPass[] = [
    { index: 0, segmentId: "S", name: "Sprint", lap: 1, crossings: [] },
    { index: 1, segmentId: "K", name: "Zwift KOM", lap: 1, crossings: [] },
  ];
  const passages: Passage[] = [];
  [...own, ...rival].forEach((id, i) => {
    for (const pass of passes) {
      const ts = START + (pass.index + 1) * 10 * MIN + i * 100;
      const elapsed = pass.index === 0 ? 30 + i : 150 + i;
      pass.crossings.push({ athleteId: id, ts, elapsed, fal: 0 });
      passages.push({ id: `${id}-${pass.index}`, athleteId: id, segmentId: pass.segmentId, ts, elapsed, avgPower: 300 + i, weightKg: 75 });
    }
  });
  const riders = [
    ...own.map((id, i) => ({ athleteId: id, name: `Eigen ${id}`, team: "eigen", fal: 0, fts: 0, fin: 0, podium: 0, total: 0, time: ownTimes[i], void: false })),
    ...rival.map((id, i) => ({ athleteId: id, name: `Rivaal ${id}`, team: "rivaal", fal: 0, fts: 0, fin: 0, podium: 0, total: 0, time: rivalTimes[i], void: false })),
  ];
  const view: RaceViewInput = {
    subgroupLabel: "B",
    startAt: START,
    ownTeam: "eigen",
    ownRiders: own,
    teamLabels: { eigen: "ZWB Test", rivaal: "Rivalen" },
    entrants: riders.map(({ athleteId, name, team }) => ({ athleteId, name, team })),
    score: {
      format: "ttt",
      final: true,
      passes,
      riders,
      teams: [
        { team: "eigen", total: 0, riders: 5, finishers: 5, time: ownTimes[3], rank: 1, league: 2 },
        { team: "rivaal", total: 0, riders: 4, finishers: 4, time: rivalTimes[3], rank: 2, league: 1 },
      ],
      splits: [
        { index: 0, name: "Sprint", lap: 1, teams: [{ team: "eigen", row: 1, gap: 0 }, { team: "rivaal", row: 2, gap: 3000 }] },
        { index: 1, name: "Zwift KOM", lap: 1, teams: [{ team: "rivaal", row: 2, gap: 0 }, { team: "eigen", row: 1, gap: 1000 }] },
      ],
    },
  };
  const results: SubgroupResult[] = [...own, ...rival].map((id, i) => ({
    profileId: id,
    rank: i + 1,
    durationMs: riders[i].time,
    avgWatts: 250 + i,
    weightKg: 80,
    powerType: "POWER_METER",
    criticalPower: { s15: 600, m1: 400, m5: 320, m20: 280 },
  }));
  return { view, results, passages };
}

describe("analyseRace in een ploegentijdrit", () => {
  it("vergelijkt per stuk met de ploeg direct erachter", () => {
    const { view, results, passages } = tttView();
    const a = analyseRace(view, results, passages);
    expect(a.rival?.label).toBe("Rivalen");
    expect(a.gapTrace.map((g) => g.ahead)).toEqual([3000, -1000, 2700]);
    expect(a.sections.map((s) => s.versusRival)).toEqual([3000, -4000, 3700]);
    expect(a.sections.map((s) => s.name)).toEqual(["Start → Sprint", "Sprint → Zwift KOM", "Zwift KOM → finish"]);
    expect(a.sections[0].fastest).toBe("ZWB Test");
    expect(a.sections[1].fastest).toBe("Rivalen");
  });

  it("meldt winst, verlies, samenhang en wie niet bij de ploeg finishte", () => {
    const { view, results, passages } = tttView();
    const a = analyseRace(view, results, passages);
    expect(a.spread).toBe(600);
    expect(a.riders.find((r) => r.athleteId === 5)?.dropped).toBe(true);
    expect(a.riders.find((r) => r.athleteId === 4)?.dropped).toBe(false);
    expect(a.findings[0]).toBe("1e van 2, 2,7 s voor Rivalen.");
    expect(a.findings).toContain("Meeste winst op het stuk naar de finish: 3,7 s.");
    expect(a.findings).toContain("Meeste verlies op het stuk naar Zwift KOM: 4 s.");
    expect(a.findings).toContain("Eigen 5 finishte niet bij de ploeg.");
  });

  it("toont alleen de eigen renners, met W/kg en plek per segment", () => {
    const { view, results, passages } = tttView();
    const a = analyseRace(view, results, passages);
    expect(a.riders.map((r) => r.athleteId)).toEqual([1, 2, 3, 4, 5]);
    const first = a.riders[0];
    expect(first.wkg).toBe(3.13);
    expect(first.cp20Wkg).toBe(3.5);
    expect(first.segments).toHaveLength(2);
    expect(first.segments[0]).toMatchObject({ name: "Sprint", kind: "sprint", watts: 300, wkg: 4, rank: 1, of: 9 });
    expect(a.hasPower).toBe(true);
  });

  it("werkt zonder vermogen, en zegt dat", () => {
    const { view, results, passages } = tttView();
    const bare = results.map(({ profileId, rank, durationMs }) => ({ profileId, rank, durationMs }));
    const a = analyseRace(view, bare, passages.map((p) => ({ ...p, avgPower: undefined, weightKg: undefined })));
    expect(a.hasPower).toBe(false);
    expect(a.riders[0].avgWatts).toBeNull();
    expect(a.riders[0].segments[0].watts).toBeNull();
    expect(a.findings).toContain("Zwift gaf geen vermogen voor deze race.");
  });
});

describe("analyseRace in een puntenrace", () => {
  it("kiest de ploeg één plaats hoger als tegenstander en noemt de puntenpakker", () => {
    const { view, results, passages } = tttView();
    const points: RaceViewInput = {
      ...view,
      score: {
        ...view.score,
        format: "points",
        splits: [],
        riders: view.score.riders.map((r) => ({ ...r, total: r.team === "eigen" ? r.athleteId * 2 : 20 })),
        teams: [
          { team: "rivaal", total: 80, riders: 4, finishers: 4, time: null, rank: 1, league: 2 },
          { team: "eigen", total: 30, riders: 5, finishers: 5, time: null, rank: 2, league: 1 },
        ],
      },
    };
    const a = analyseRace(points, results, passages);
    expect(a.rival?.team).toBe("rivaal");
    expect(a.sections).toEqual([]);
    expect(a.findings[0]).toBe("2e van 2 met 30 punten.");
    expect(a.findings).toContain("Meeste punten: Eigen 5 (10).");
    expect(a.riders.every((r) => !r.dropped)).toBe(true);
  });
});

describe("segmentKind", () => {
  it("herkent klimmen en sprints aan de naam", () => {
    expect(segmentKind("Zwift KOM Reverse")).toBe("klim");
    expect(segmentKind("SPRINT Reverse")).toBe("sprint");
    expect(segmentKind("Fuego Flats")).toBe("segment");
  });
});

describe("resultPowerFields", () => {
  it("haalt vermogen, gewicht, meter en finishmoment uit een uitslagrij, maar geen hartslag", () => {
    const fields = resultPowerFields({
      activityData: { durationInMilliseconds: 2597964, endDate: "2026-10-13T18:50:17.964+0000" },
      criticalP: { criticalP15Seconds: 572, criticalP1Minute: 355, criticalP20Minutes: 259, criticalP5Minutes: 279 },
      sensorData: { avgWatts: 256, heartRateData: { avgHeartRate: 173, heartRateMonitor: true }, powerType: "POWER_METER" },
      profileData: { weightInGrams: 74000 },
    });
    expect(fields).toEqual({
      finishedAt: Date.parse("2026-10-13T18:50:17.964Z"),
      avgWatts: 256,
      weightKg: 74,
      powerType: "POWER_METER",
      criticalPower: { s15: 572, m1: 355, m5: 279, m20: 259 },
    });
    // Eigen start = finish min duur: precies de rijstart.
    expect(new Date((fields.finishedAt as number) - 2597964).toISOString()).toBe("2026-10-13T18:07:00.000Z");
  });

  it("laat ontbrekende of lege velden leeg", () => {
    expect(resultPowerFields({ sensorData: { avgWatts: 0 } })).toEqual({
      finishedAt: null,
      avgWatts: null,
      weightKg: null,
      powerType: null,
      criticalPower: null,
    });
  });
});
