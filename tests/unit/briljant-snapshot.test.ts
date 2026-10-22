import { describe, expect, it } from "vitest";
import {
  complianceFrom,
  consistencyWeeks,
  curveRange,
  fatigueInputs,
  monthEnds,
  monthsSince,
  monthEndOfWeek,
  mondayKey,
  powerFromCurve,
  raceCandidates,
  snapshotFrom,
  terugblikRows,
} from "@/lib/briljant/snapshot";

describe("snapshot", () => {
  it("rekent de maandag van de week", () => {
    expect(mondayKey("2026-10-21")).toBe("2026-10-19");
    expect(mondayKey("2026-10-19")).toBe("2026-10-19");
    expect(mondayKey("2026-10-25")).toBe("2026-10-19");
  });

  it("neemt de beste minuut, vers en na elke drempel", () => {
    // De beste minuut van de eigenaar (83 kg): 481 W vers, 399 W na 2000 en na 3000 kJ.
    const fresh = [
      { seconds: 60, watts: 481 },
      { seconds: 1200, watts: 282 },
    ];
    expect(
      fatigueInputs(fresh, [
        { afterKj: 2000, points: [{ seconds: 60, watts: 399 }, { seconds: 1200, watts: 212 }] },
        { afterKj: 3000, points: [{ seconds: 60, watts: 399 }, { seconds: 1200, watts: 197 }] },
        // Zonder minuut na deze drempel: geen meting, ook al is er een 20 minuten.
        { afterKj: 4000, points: [{ seconds: 1200, watts: 150 }] },
      ]),
    ).toEqual([
      { afterKj: 2000, freshWatts: 481, fatiguedWatts: 399 },
      { afterKj: 3000, freshWatts: 481, fatiguedWatts: 399 },
    ]);
  });

  it("legt alleen niveaus, de score, de consistentie en ja/nee per bron vast", () => {
    const row = snapshotFrom({
      profileId: "p1",
      day: "2026-10-21",
      source: "week",
      input: {
        sex: "man",
        weightKg: 75,
        power: { s15: 12, m1: 7.4, m5: 4.8, m20: 4 },
        fatigue: [],
        ctl: 65,
        zrs: null,
      },
      consistency: {
        weeks: Array.from({ length: 12 }, (_, i) => ({ monday: `w${i}`, hours: 6, plannedHours: 6, plannedRecovery: false })),
        compliance: null,
      },
    });
    expect(row).toMatchObject({
      profile_id: "p1",
      week: "2026-10-19",
      // Twaalf weken op de norm, maar een reeks van 12 weken: V = 1 − e^(−1) = 0,63,
      // consistentie 0,82, factor 0,964. Op de spreidingsschaal: sprint 6,3,
      // anaeroob 6,67, VO2max 5,5, drempel 5,22, CTL 65 is 4,5. Opgeteld met de
      // gewichten (durability en racen ontbreken en tellen voor 0): profiel 3,91,
      // maal 0,964 is 3,77.
      score: 3.77,
      consistency: 0.82,
      facets: { sprint: 6.3, anaeroob: 6.67, vo2max: 5.5, drempel: 5.22, durability: null, fitheid: 4.5, racen: null },
      source: "week",
      provenance: { power: true, fatigue: false, ctl: true, zrs: false, rides: true },
    });
    expect(JSON.stringify(row)).not.toMatch(/watts|wkg|weight|ctl"\s*:\s*\d|zrs"\s*:\s*\d|hours/);
  });

  it("laat de consistentie leeg zonder ritgegevens", () => {
    const row = snapshotFrom({
      profileId: "p1",
      day: "2026-10-21",
      source: "terugblik",
      input: { sex: null, weightKg: null, power: null, fatigue: [], ctl: null, zrs: null },
      consistency: null,
    });
    expect(row).toMatchObject({ score: null, consistency: null, provenance: { rides: false } });
  });

  it("telt de uren per afgesloten week en herkent een geplande herstelweek", () => {
    const weeks = consistencyWeeks(
      [
        { day: "2026-10-06", minutes: 90 },
        { day: "2026-10-08", minutes: 60 },
        { day: "2026-10-14", minutes: 120 },
        // De lopende week telt niet mee.
        { day: "2026-10-20", minutes: 300 },
      ],
      [
        { day: "2026-10-07", minutes: 400, status: "completed" },
        { day: "2026-10-15", minutes: 240, status: "completed" },
      ],
      "2026-10-21",
      3,
    );
    expect(weeks).toEqual([
      { monday: "2026-09-28", hours: 0, plannedHours: null, plannedRecovery: false, load: null, plannedLoad: null },
      // Geplande TSS: 400 minuten duur (IF 0,68) is 6,67 × 0,4624 × 100.
      { monday: "2026-10-05", hours: 2.5, plannedHours: 6.67, plannedRecovery: false, load: null, plannedLoad: 308 },
      // 240 van de 400 geplande minuten: onder 75%, dus een herstelweek.
      { monday: "2026-10-12", hours: 2, plannedHours: 4, plannedRecovery: true, load: null, plannedLoad: 185 },
    ]);
    // Met TSS per dag uit intervals.icu: vanaf de eerste dag met belasting.
    const loads = new Map([["2026-10-06", 80], ["2026-10-08", 60], ["2026-10-14", 120]]);
    const withLoad = consistencyWeeks([], [], "2026-10-21", 3, loads);
    expect(withLoad.map((item) => item.load)).toEqual([null, 140, 120]);
  });

  it("rekent de naleving gewogen naar duur, alleen over afgesloten weken", () => {
    const planned = [
      { day: "2026-10-06", minutes: 60, status: "completed" as const },
      { day: "2026-10-08", minutes: 120, status: "skipped" as const },
      { day: "2026-10-13", minutes: 60, status: "planned" as const },
      { day: "2026-10-20", minutes: 600, status: "planned" as const },
    ];
    expect(complianceFrom(planned, "2026-10-01", "2026-10-21")).toBeCloseTo(60 / 240, 9);
    expect(complianceFrom([], "2026-10-01", "2026-10-21")).toBeNull();
  });

  it("haalt W/kg uit een curve, met het gewicht als de punten die niet hebben", () => {
    const power = powerFromCurve(
      [
        { seconds: 15, watts: 900, wattsPerKg: 12 },
        { seconds: 60, watts: 555 },
        { seconds: 300, watts: 360 },
        { seconds: 1200, watts: 300 },
      ],
      75,
    );
    expect(power).toEqual({ s15: 12, m1: 7.4, m5: 4.8, m20: 4 });
    expect(powerFromCurve([], 75)).toBeNull();
    expect(powerFromCurve([{ seconds: 60, watts: 555 }], null)).toEqual({ s15: null, m1: null, m5: null, m20: null });
  });

  it("geeft de maandeinden van het afgelopen jaar en het bereik van 90 dagen", () => {
    const ends = monthEnds("2026-10-21", 12);
    expect(ends).toHaveLength(12);
    expect(ends[0]).toBe("2025-10-31");
    expect(ends[11]).toBe("2026-09-30");
    expect(ends).toContain("2026-02-28");
    expect(curveRange("2026-09-30")).toBe("r.2026-07-03.2026-09-30");
  });

  it("telt de maanden van de historie vanaf de eerste dag, met een grens", () => {
    expect(monthsSince("2026-10-21", "2025-10-03", 120)).toBe(12);
    expect(monthsSince("2026-10-21", "2019-03-15", 120)).toBe(91);
    expect(monthsSince("2026-10-21", "2010-01-01", 120)).toBe(120);
    expect(monthsSince("2026-10-21", "2026-10-02", 120)).toBe(0);
    expect(monthsSince("2026-10-21", null, 120)).toBe(0);
    expect(monthEnds("2026-10-21", monthsSince("2026-10-21", "2026-07-09", 120))).toEqual([
      "2026-07-31",
      "2026-08-31",
      "2026-09-30",
    ]);
  });

  it("laat een terugblik beginnen bij de eerste maand met een score", () => {
    const row = (score: number | null, consistency: number | null) => ({ score, consistency });
    expect(terugblikRows([row(null, 0), row(null, 0.2), row(3.1, 0.2), row(null, null), row(null, 0.4), row(3.4, null)])).toEqual([
      row(3.1, 0.2),
      row(null, 0.4),
      row(3.4, null),
    ]);
    expect(terugblikRows([row(null, 0.5)])).toEqual([]);
  });

  it("vindt het maandeinde bij een terugblikweek", () => {
    expect(monthEndOfWeek("2026-09-28")).toBe("2026-09-30");
    expect(monthEndOfWeek("2025-11-24")).toBe("2025-11-30");
    expect(monthEndOfWeek("2024-02-26")).toBe("2024-02-29");
    expect(monthEndOfWeek(mondayKey("2026-08-31"))).toBe("2026-08-31");
  });

  it("probeert om en om de race voor en na het maandeinde", () => {
    const races = ["2026-10-20", "2026-10-05", "2026-09-29", "2026-09-10", "2026-08-18"].map((day) => ({ day }));
    expect(raceCandidates(races, "2026-09-30", 4)).toEqual([
      { race: { day: "2026-09-29" }, use: "after" },
      { race: { day: "2026-10-05" }, use: "before" },
      { race: { day: "2026-09-10" }, use: "after" },
      { race: { day: "2026-10-20" }, use: "before" },
    ]);
    // Vóór de eerste race: alleen de scores vóór de races erna.
    expect(raceCandidates(races, "2026-07-31", 2)).toEqual([
      { race: { day: "2026-08-18" }, use: "before" },
      { race: { day: "2026-09-10" }, use: "before" },
    ]);
    expect(raceCandidates([], "2026-07-31", 4)).toEqual([]);
  });
});
