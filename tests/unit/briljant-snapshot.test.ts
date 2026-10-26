import { describe, expect, it } from "vitest";
import {
  complianceFrom,
  consistencyWeeks,
  curveRange,
  durabilityTestFrom,
  fatigueInputs,
  monthEnds,
  monthsSince,
  monthEndOfWeek,
  mondayKey,
  powerFromCurve,
  powerProfileStale,
  snapshotFrom,
  terugblikRows,
  weightOnOrBefore,
  zrsAtMonthEnd,
  type KnownRace,
} from "@/lib/briljant/snapshot";

describe("snapshot", () => {
  it("rekent de maandag van de week", () => {
    expect(mondayKey("2026-10-21")).toBe("2026-10-19");
    expect(mondayKey("2026-10-19")).toBe("2026-10-19");
    expect(mondayKey("2026-10-25")).toBe("2026-10-19");
  });

  it("neemt per drempel de duren van 1 tot 20 minuten die vers en vermoeid bestaan", () => {
    // De eigenaar (83 kg): 481 W en 282 W vers.
    const fresh = [
      { seconds: 60, watts: 481 },
      { seconds: 1200, watts: 282 },
    ];
    expect(
      fatigueInputs(fresh, [
        { afterKj: 2000, points: [{ seconds: 60, watts: 399 }, { seconds: 1200, watts: 212 }] },
        // Alleen een minuut na deze drempel: alleen die duur.
        { afterKj: 3000, points: [{ seconds: 60, watts: 399 }] },
        { afterKj: 4000, points: [{ seconds: 30, watts: 500 }] },
      ]),
    ).toEqual([
      { afterKj: 2000, seconds: 60, freshWatts: 481, fatiguedWatts: 399 },
      { afterKj: 2000, seconds: 1200, freshWatts: 282, fatiguedWatts: 212 },
      { afterKj: 3000, seconds: 60, freshWatts: 481, fatiguedWatts: 399 },
    ]);
  });

  it("leest de durability-test af: 20 minuten na de laagste stand met genoeg werk", () => {
    const fresh = [{ seconds: 1200, watts: 282 }];
    const curves = [
      { afterKj: 2000, points: [{ seconds: 1200, watts: 240 }] },
      { afterKj: 500, points: [{ seconds: 1200, watts: 280 }] },
      { afterKj: 1000, points: [{ seconds: 1200, watts: 262 }] },
    ];
    // 500 kJ is bij 83 kg te weinig (6 kJ/kg): de stand van 1000 kJ.
    expect(durabilityTestFrom("2026-10-25", fresh, curves, 83)).toEqual({
      day: "2026-10-25",
      afterKj: 1000,
      freshWatts: 282,
      fatiguedWatts: 262,
    });
    // Geen 20 minuten na het werk: geen uitslag.
    expect(durabilityTestFrom("2026-10-25", fresh, [{ afterKj: 1000, points: [{ seconds: 300, watts: 300 }] }], 83)).toBeNull();
    expect(durabilityTestFrom("2026-10-25", fresh, curves, null)).toBeNull();
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
      // Twaalf weken op de norm en twaalf op rij: V = 1, naleving zonder schema 100%,
      // consistentie 1, factor 1. Op de spreidingsschaal: sprint 6,3,
      // anaeroob 6,67, VO2max 5,5, drempel 5,22, CTL 65 is 5,5. Opgeteld met de
      // gewichten (durability en racen ontbreken en tellen voor 0): profiel 3,97.
      score: 3.97,
      consistency: 1,
      facets: { sprint: 6.3, anaeroob: 6.67, vo2max: 5.5, drempel: 5.22, durability: null, fitheid: 5.5, racen: null },
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

  it("telt een training met een rit op dezelfde dag als gedaan, één rit per training", () => {
    const planned = [
      { day: "2026-10-06", minutes: 60, status: "completed" as const },
      { day: "2026-10-06", minutes: 90, status: "planned" as const },
      { day: "2026-10-08", minutes: 120, status: "skipped" as const },
      { day: "2026-10-13", minutes: 60, status: "planned" as const },
      { day: "2026-10-14", minutes: 45, status: "planned" as const },
    ];
    const rides = [
      // Twee ritten op de 6e: de afgeronde training houdt er een bezet, de geplande krijgt de andere.
      { day: "2026-10-06", minutes: 55 },
      { day: "2026-10-06", minutes: 85 },
      // Een overgeslagen training telt niet, ook niet met een rit.
      { day: "2026-10-08", minutes: 100 },
      // Losgekoppeld van het schema: geen training.
      { day: "2026-10-13", minutes: 60, excluded: true },
      { day: "2026-10-14", minutes: 40 },
    ];
    expect(complianceFrom(planned, "2026-10-01", "2026-10-21", rides)).toBeCloseTo((60 + 90 + 45) / 375, 9);
    // Eén rit voor twee trainingen op een dag: de tweede telt niet.
    expect(complianceFrom(planned.slice(0, 2), "2026-10-01", "2026-10-21", rides.slice(0, 1))).toBeCloseTo(60 / 150, 9);
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

  it("neemt het laatste gewicht op of vóór het maandeinde", () => {
    const wellness = [
      { id: "2026-07-31", weight: 0 },
      { id: "2026-08-12", weight: 78.4 },
      { id: "2026-08-20" },
      { id: "2026-09-03", weight: 77.1 },
      { id: "2026-09-30", weight: 76.5 },
    ];
    expect(weightOnOrBefore(wellness, "2026-07-31")).toBeNull();
    expect(weightOnOrBefore(wellness, "2026-08-31")).toBe(78.4);
    expect(weightOnOrBefore(wellness, "2026-09-30")).toBe(76.5);
    // De volgorde van intervals.icu maakt niet uit.
    expect(weightOnOrBefore([...wellness].reverse(), "2026-09-29")).toBe(77.1);
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

  describe("zrsAtMonthEnd", () => {
    // Nieuw naar oud, zoals Zwift's lijst.
    const race = (day: string, before: number | null, after: number | null, lookedUp = true): KnownRace => ({
      activityId: day.replaceAll("-", ""),
      day,
      lookedUp,
      before,
      after,
    });
    const races = [
      race("2026-10-20", 410, 427),
      race("2026-10-05", 380, 410),
      race("2026-09-29", 300, 309),
      race("2026-09-10", 378, 300),
      race("2026-08-18", 378, 215),
    ];

    it("neemt de score na de laatste race tot het maandeinde", () => {
      expect(zrsAtMonthEnd(races, "2026-09-30", true, 4)).toEqual({ kind: "found", zrs: 309 });
    });

    it("probeert om en om de race voor en na het maandeinde als een score ontbreekt", () => {
      const gaps = [races[0], race("2026-10-05", 380, 410), race("2026-09-29", null, null), ...races.slice(3)];
      // 29-09 zonder score: dan de score vóór de eerste race erna (05-10).
      expect(zrsAtMonthEnd(gaps, "2026-09-30", true, 4)).toEqual({ kind: "found", zrs: 380 });
      const fewer = [races[0], race("2026-10-05", null, null), race("2026-09-29", null, null), ...races.slice(3)];
      // Daarna de race daarvoor (10-09, de score erna).
      expect(zrsAtMonthEnd(fewer, "2026-09-30", true, 4)).toEqual({ kind: "found", zrs: 300 });
      // Met twee pogingen blijft het bij de actuele ZRS.
      expect(zrsAtMonthEnd(fewer, "2026-09-30", true, 2)).toEqual({ kind: "none" });
    });

    it("gebruikt vóór de eerste race de score vóór de races erna", () => {
      expect(zrsAtMonthEnd(races, "2026-07-31", true, 4)).toEqual({ kind: "found", zrs: 378 });
    });

    it("leest eerst verder als de race vóór het maandeinde nog niet in de lijst staat", () => {
      // Alleen de races van oktober gelezen: voor september eerst verder lezen,
      // ook al is er een race erna, zodat de volgorde dezelfde blijft.
      expect(zrsAtMonthEnd(races.slice(0, 2), "2026-09-30", false, 4)).toEqual({ kind: "list" });
      // Is de lijst af, dan geldt de race erna.
      expect(zrsAtMonthEnd(races.slice(0, 2), "2026-09-30", true, 4)).toEqual({ kind: "found", zrs: 380 });
      // De eerste race vóór het maandeinde gaf een score: niet verder lezen.
      expect(zrsAtMonthEnd(races.slice(0, 3), "2026-09-30", false, 4)).toEqual({ kind: "found", zrs: 309 });
    });

    it("vraagt een race op die nog niet is opgezocht", () => {
      const unknown = [races[0], races[1], race("2026-09-29", null, null, false), ...races.slice(3)];
      expect(zrsAtMonthEnd(unknown, "2026-09-30", false, 4)).toEqual({ kind: "lookup", race: unknown[2] });
    });

    it("geeft geen ZRS zonder races, en zonder volledige lijst eerst lezen", () => {
      expect(zrsAtMonthEnd([], "2026-07-31", true, 4)).toEqual({ kind: "none" });
      expect(zrsAtMonthEnd([], "2026-07-31", false, 4)).toEqual({ kind: "list" });
    });
  });

  it("haalt het powerprofiel opnieuw op na een rit die na het ophalen eindigde", () => {
    // De eigenaar: opgehaald om 08:28, daarna een rit om 14:41.
    const syncedAt = "2026-10-22T08:28:23Z";
    const now = Date.parse("2026-10-22T20:00:00Z");
    const ride = { startDate: "2026-10-22T14:41:21Z", movingSeconds: 4822, sportType: "VirtualRide" };
    expect(powerProfileStale(syncedAt, [ride], now)).toBe(true);
    // Een rit die ruim voor het ophalen eindigde, of geen fietsrit, telt niet.
    expect(powerProfileStale(syncedAt, [{ ...ride, startDate: "2026-10-21T18:00:24Z" }], now)).toBe(false);
    expect(powerProfileStale(syncedAt, [{ ...ride, sportType: "Run" }], now)).toBe(false);
    // Opgehaald vlak na het eind: intervals.icu kan de rit nog missen.
    expect(powerProfileStale("2026-10-22T16:10:00Z", [ride], now)).toBe(true);
    expect(powerProfileStale("2026-10-22T16:40:00Z", [ride], now)).toBe(false);
    // Zonder profiel of na zes dagen altijd.
    expect(powerProfileStale(null, [], now)).toBe(true);
    expect(powerProfileStale("2026-10-15T08:00:00Z", [], now)).toBe(true);
  });
});
