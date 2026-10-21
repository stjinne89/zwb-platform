import { describe, expect, it } from "vitest";
import {
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

  it("legt alleen meters, hoogte, consistentie en ja/nee per bron vast", () => {
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
      rides: [{ day: "2026-10-20", minutes: 120 }],
    });
    expect(row).toMatchObject({
      profile_id: "p1",
      week: "2026-10-19",
      height: 3404,
      ridges: { explosief: 3404, duurvermogen: 3404, durability: null, fitheid: 3404, racen: null },
      source: "week",
      provenance: { power: true, fatigue: false, ctl: true, zrs: false, rides: true },
    });
    expect(row.consistency).toBeGreaterThan(0);
    // Geen ruwe waarden in de rij.
    expect(JSON.stringify(row)).not.toMatch(/watts|wkg|weight|ctl"\s*:\s*\d|zrs"\s*:\s*\d/);
  });

  it("laat de consistentie leeg zonder ritgegevens", () => {
    const row = snapshotFrom({
      profileId: "p1",
      day: "2026-10-21",
      source: "terugblik",
      input: { sex: null, weightKg: null, power: null, fatigue: [], ctl: null, zrs: null },
      rides: null,
    });
    expect(row).toMatchObject({ height: null, consistency: null, provenance: { rides: false } });
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
