import { describe, expect, it } from "vitest";
import {
  availabilityHours,
  complianceFrom,
  consistencyWeeks,
  curveRange,
  fatigueInputs,
  monthEnds,
  mondayKey,
  powerFromCurve,
  snapshotFrom,
} from "@/lib/berg/snapshot";

describe("snapshot", () => {
  it("rekent de maandag van de week", () => {
    expect(mondayKey("2026-10-21")).toBe("2026-10-19");
    expect(mondayKey("2026-10-19")).toBe("2026-10-19");
    expect(mondayKey("2026-10-25")).toBe("2026-10-19");
  });

  it("neemt de beste 20 minuten, anders 5, vers en na het werk", () => {
    const fresh = [
      { seconds: 300, watts: 330 },
      { seconds: 1200, watts: 290 },
    ];
    expect(
      fatigueInputs(fresh, [
        { afterKj: 1500, points: [{ seconds: 1200, watts: 270 }] },
        { afterKj: 2500, points: [{ seconds: 300, watts: 300 }] },
        { afterKj: 3000, points: [{ seconds: 60, watts: 400 }] },
      ]),
    ).toEqual([
      { afterKj: 1500, freshWatts: 290, fatiguedWatts: 270 },
      { afterKj: 2500, freshWatts: 330, fatiguedWatts: 300 },
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
        weeks: Array.from({ length: 12 }, (_, i) => ({ monday: `w${i}`, hours: 6, plannedRecovery: false })),
        normHours: 6,
        compliance: null,
      },
    });
    expect(row).toMatchObject({
      profile_id: "p1",
      week: "2026-10-19",
      // Twaalf weken op de norm, maar een reeks van 12 weken: V = 1 − e^(−1) = 0,63,
      // consistentie 0,82, factor 0,964.
      score: 3.86,
      consistency: 0.82,
      ridges: { sprint: 4, anaeroob: 4, vo2max: 4, drempel: 4, durability: null, fitheid: 4, racen: null },
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
      { monday: "2026-09-28", hours: 0, plannedRecovery: false },
      { monday: "2026-10-05", hours: 2.5, plannedRecovery: false },
      // 240 van de 400 geplande minuten: onder 75%, dus een herstelweek.
      { monday: "2026-10-12", hours: 2, plannedRecovery: true },
    ]);
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

  it("telt de beschikbaarheid op tot uren per week", () => {
    expect(availabilityHours({ ma: 60, wo: 90, za: 150 })).toBe(5);
    expect(availabilityHours({})).toBeNull();
    expect(availabilityHours(null)).toBeNull();
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
});
