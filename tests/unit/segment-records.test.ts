import { describe, expect, it } from "vitest";
import { matchSegmentIds, routeLap } from "@/lib/zwift/route-segments";
import { latestWeights, segmentRecords, type SegmentBest } from "@/lib/race-briefing/segment-records";
import type { BriefingSegment } from "@/lib/race-briefing/route";

// zwift-data 2.1, Spiral Summit: segmentsOnRoute (km binnen de ronde).
const spiral = [
  { slug: "jarvis-kom", name: "Jarvis KOM", kind: "climb" as const, startKm: 10.838 },
  { slug: "jarvis-sprint", name: "Jarvis Sprint", kind: "sprint" as const, startKm: 13.984 },
  { slug: "jarvis-kom", name: "Jarvis KOM", kind: "climb" as const, startKm: 15.685 },
  { slug: "jarvis-sprint", name: "Jarvis Sprint", kind: "sprint" as const, startKm: 18.817 },
  { slug: "volcano-kom", name: "Volcano KOM", kind: "climb" as const, startKm: 20.228 },
];

describe("matchSegmentIds", () => {
  it("koppelt de segmenten van Spiral Summit aan Zwifts ID's", () => {
    const ids = matchSegmentIds(spiral, routeLap(159415549)!);
    expect(Object.fromEntries(ids)).toEqual({
      "jarvis-kom": "1053743496",
      "jarvis-sprint": "1061044010",
      "volcano-kom": "8176359221329222504",
    });
  });

  it("valt terug op de plek als de naam anders is (Richmond: SPRINT)", () => {
    const ids = matchSegmentIds([{ slug: "richmond-sprint", name: "Richmond Sprint", kind: "sprint", startKm: 2 }], [["7", 2080], ["8", 2300]], { "7": "KOM", "8": "SPRINT" });
    expect(ids.get("richmond-sprint")).toBe("8");
  });

  it("koppelt niets wat te ver weg ligt", () => {
    const ids = matchSegmentIds([{ slug: "x-sprint", name: "X Sprint", kind: "sprint", startKm: 5 }], [["8", 6000]], { "8": "SPRINT" });
    expect(ids.size).toBe(0);
  });
});

describe("segmentRecords", () => {
  const seg = (kind: "sprint" | "kom", slug: string, name: string, startKm: number, pass: number, passes: number): BriefingSegment => ({
    kind,
    slug,
    name,
    startKm,
    endKm: startKm + 0.2,
    pass,
    passes,
  });
  const segments = [seg("sprint", "jarvis-sprint", "Jarvis Sprint", 14.13, 1, 2), seg("sprint", "jarvis-sprint", "Jarvis Sprint", 18.97, 2, 2), seg("kom", "unknown-kom", "Onbekend KOM", 20, 1, 1)];
  const ids = new Map([["jarvis-sprint", "2"]]);
  const best = (zwiftId: number, seconds: number | null, watts: number | null, weightKg: number | null, at = "2026-10-01T18:00:00Z"): SegmentBest => ({
    zwiftId,
    segmentId: "2",
    seconds,
    watts,
    weightKg,
    at: seconds === null ? null : at,
    fetchedAt: "2026-10-26T10:00:00Z",
  });
  const own = [
    { zwiftId: 1, name: "Stijn Martens" },
    { zwiftId: 2, name: "Jeroen Janssen" },
    { zwiftId: 3, name: "Han Vaessen" },
  ];

  it("zet de snelste PR van het veld als richttijd en rekent de watt per renner", () => {
    const bests = [best(1, 19.4, 610, 82), best(2, null, null, null), best(9, 17.9, 690, 71)];
    const [record, ...rest] = segmentRecords({ segments, segmentIds: ids, bests, own, field: [...own, { zwiftId: 9, name: "Bastie RCC" }] });
    expect(rest).toEqual([]);
    expect(record).toMatchObject({ label: "sprint Jarvis", firstKm: 14.13, passes: 2 });
    expect(record.target).toMatchObject({ zwiftId: 9, name: "Bastie RCC", seconds: 17.9, scope: "veld" });
    expect(record.target?.wkg).toBeCloseTo(690 / 71);
    const [stijn, jeroen, han] = record.riders;
    expect(stijn).toMatchObject({ pr: { seconds: 19.4, watts: 610 }, neededWatts: Math.round((690 / 71) * 82), holder: false, fetched: true });
    expect(jeroen).toMatchObject({ pr: null, neededWatts: null, fetched: true });
    expect(han).toMatchObject({ pr: null, fetched: false });
  });

  it("geeft de houder van de richttijd zijn eigen watt", () => {
    const [record] = segmentRecords({ segments, segmentIds: ids, bests: [best(1, 17.5, 700, 82), best(9, 17.9, 690, 71)], own, field: [...own, { zwiftId: 9, name: "Bastie RCC" }] });
    expect(record.target).toMatchObject({ zwiftId: 1, name: "Stijn Martens" });
    expect(record.riders[0]).toMatchObject({ holder: true, neededWatts: 700 });
  });

  it("neemt zonder startveld de snelste van de ploeg", () => {
    const [record] = segmentRecords({ segments, segmentIds: ids, bests: [best(1, 19.4, 610, 82), best(9, 17.9, 690, 71)], own, field: [] });
    expect(record.target).toMatchObject({ zwiftId: 1, scope: "ploeg" });
  });

  it("neemt het gewicht van de laatste passage met gewicht", () => {
    const weights = latestWeights([best(1, 19.4, 610, 82, "2026-09-01T18:00:00Z"), { ...best(1, 250, 300, 80, "2026-10-20T18:00:00Z"), segmentId: "1" }]);
    expect(weights.get(1)).toBe(80);
  });
});
