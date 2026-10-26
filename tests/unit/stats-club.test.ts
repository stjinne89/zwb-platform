import { describe, expect, it } from "vitest";
import {
  cellsInScope,
  clubByDiscipline,
  clubByRegion,
  clubByRider,
  clubPreviousYear,
  clubRecords,
  clubSeries,
  clubTotals,
  clubYearLines,
  mergeClubData,
  summarizeClubRides,
  yearsNeeded,
  type ClubRideRow,
} from "@/lib/stats/club";

let nextId = 1;
const ride = (profile: string, start: string, km: number, sport = "Ride"): ClubRideRow => ({
  id: nextId++,
  profile_id: profile,
  start_date: start,
  sport_type: sport,
  distance_m: km * 1000,
  total_elevation_gain_m: km * 5,
  moving_time_seconds: km * 120,
});

describe("summarizeClubRides en mergeClubData", () => {
  it("telt per maand, per week en per dag, in Amsterdamse dagen", () => {
    // 31 december 23:30 UTC is 1 januari in Amsterdam.
    const data = summarizeClubRides([ride("a", "2025-12-31T23:30:00Z", 30), ride("a", "2026-01-02T09:00:00Z", 20)]);
    expect(data.days.map((day) => [day.day, day.km])).toEqual([
      ["2026-01-01", 30],
      ["2026-01-02", 20],
    ]);
    expect(data.months).toEqual([expect.objectContaining({ key: "2026-01", km: 50, rides: 2 })]);
    // Beide in de week van maandag 29 december.
    expect(data.weeks).toEqual([expect.objectContaining({ key: "2025-12-29", km: 50 })]);
  });

  it("telt dezelfde rit van een lid uit twee bronnen één keer", () => {
    const data = summarizeClubRides([
      ride("a", "2026-09-11T13:45:33Z", 35.3),
      // De intervals-kopie: zelfde start, zelfde afstand.
      ride("a", "2026-09-11T13:45:33Z", 35.3),
      // Een ander lid in dezelfde groepsrit telt wel.
      ride("b", "2026-09-11T13:45:40Z", 35.3),
      // Zelfde lid, tien minuten later: een tweede rit.
      ride("a", "2026-09-11T13:55:33Z", 35.3),
    ]);
    expect(data.days[0]).toMatchObject({ rides: 3 });
  });

  it("telt een week over de jaargrens uit twee jaren op", () => {
    const merged = mergeClubData([
      summarizeClubRides([ride("a", "2025-12-30T09:00:00Z", 10)]),
      summarizeClubRides([ride("a", "2026-01-02T09:00:00Z", 15)]),
    ]);
    expect(merged.weeks).toEqual([expect.objectContaining({ key: "2025-12-29", km: 25, rides: 2 })]);
  });
});

describe("clubreeksen", () => {
  const data = summarizeClubRides([
    ride("a", "2026-09-05T09:00:00Z", 40),
    ride("b", "2026-09-06T09:00:00Z", 60, "VirtualRide"),
    ride("a", "2026-10-03T09:00:00Z", 30),
    ride("a", "2025-10-04T09:00:00Z", 20),
    ride("c", "2025-09-10T09:00:00Z", 80),
  ]);

  it("geeft per periode het volume en het aantal leden", () => {
    const series = clubSeries(data, ["2026-09", "2026-10"], "maand");
    expect(series.map((row) => [row.key, row.km, row.members])).toEqual([
      ["2026-09", 100, 2],
      ["2026-10", 30, 1],
    ]);
    expect(clubSeries(data, ["2025", "2026"], "jaar").map((row) => row.km)).toEqual([100, 130]);
  });

  it("vergelijkt de lopende maand tot dezelfde dag vorig jaar", () => {
    const previous = clubPreviousYear(data, ["2026-09", "2026-10"], "maand", "2026-10-03");
    expect(previous[0]?.km).toBe(80);
    // Oktober loopt nog: vorig jaar tot en met 3 oktober, de rit van 4 oktober niet.
    expect(previous[1]).toBeNull();
    expect(clubPreviousYear(data, ["2026-10"], "maand", "2026-10-16")[0]?.km).toBe(20);
  });

  it("rekent totalen exact per dag, met de leden uit de maanden", () => {
    const totals = clubTotals(data, "2026-09-01", "2026-10-16", "maand");
    expect(totals).toMatchObject({ km: 130, rides: 3, members: 2 });
  });

  it("verdeelt naar discipline, regio en renner, voor het venster of één periode", () => {
    const span = { start: "2026-09-01", end: "2026-10-16" };
    const all = cellsInScope(data, "maand", span, null);
    expect(clubByDiscipline(all).map((row) => row.id)).toEqual(["Ride", "VirtualRide"]);
    expect(clubByRegion(all, (id) => (id === "a" ? "Utrecht" : null)).map((row) => [row.id, row.km])).toEqual([
      ["Utrecht", 70],
      ["Onbekend", 60],
    ]);
    // Zonder regio altijd onderaan, ook als dat de grootste groep is.
    expect(clubByRegion(all, (id) => (id === "b" ? "Utrecht" : null)).map((row) => row.id)).toEqual([
      "Utrecht",
      "Onbekend",
    ]);
    expect(clubByRider(cellsInScope(data, "maand", span, "2026-10")).map((row) => row.id)).toEqual(["a"]);
  });

  it("vindt de clubrecords", () => {
    const records = clubRecords(data);
    expect(records.find((record) => record.label === "Beste maand")).toMatchObject({ key: "2026-09", value: 100 });
    expect(records.find((record) => record.label === "Beste jaar")).toMatchObject({ key: "2026", value: 130 });
    expect(records.find((record) => record.unit === "leden")).toMatchObject({ value: 2 });
  });

  it("telt de km van het jaar cumulatief op", () => {
    const [line] = clubYearLines(data, ["2026"], "2026-10-16");
    expect(line.total).toBe(130);
    expect(line.weeks.at(-1)).toBeNull();
  });
});

describe("yearsNeeded", () => {
  it("neemt het jaar vóór het venster mee voor de vergelijking", () => {
    expect(yearsNeeded("2025-11-01", "2026-10-16")).toEqual(["2024", "2025", "2026"]);
  });
});
