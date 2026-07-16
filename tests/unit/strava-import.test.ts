import { describe, expect, it } from "vitest";
import {
  parseCsv,
  stravaActivitiesFromCsv,
  stravaActivityFromGpx,
  syntheticAthleteId,
} from "@/lib/strava/import";

const profileId = "00000000-0000-0000-0000-000000000001";

describe("parseCsv", () => {
  it("handles quoted delimiters and escaped quotes", () => {
    const rows = parseCsv(
      'Activity ID,Activity Name,Distance\n1,"Morning, ride",12.5\n2,"He said ""go""",8\n',
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].values["Activity Name"]).toBe("Morning, ride");
    expect(rows[1].values["Activity Name"]).toBe('He said "go"');
  });

  it("detects semicolon separated exports", () => {
    const rows = parseCsv("Activity ID;Activity Name;Distance\n1;Rit;12,5\n");

    expect(rows).toHaveLength(1);
    expect(rows[0].values.Distance).toBe("12,5");
  });
});

describe("stravaActivitiesFromCsv", () => {
  it("normalizes cycling rows for strava_activities", () => {
    const result = stravaActivitiesFromCsv(
      [
        "Activity ID,Activity Date,Activity Name,Activity Type,Distance,Elevation Gain,Moving Time,Elapsed Time,Commute",
        "123,2025-06-01T08:00:00Z,Sunday ride,Ride,101.4,875,03:30:00,03:45:00,False",
        "124,2025-06-02T18:00:00Z,Alpe du Zwift,Virtual Ride,15,1036,3600,3700,False",
      ].join("\n"),
      profileId,
      42,
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      id: "123",
      profile_id: profileId,
      strava_athlete_id: 42,
      name: "Sunday ride",
      sport_type: "Ride",
      distance_m: 101400,
      total_elevation_gain_m: 875,
      moving_time_seconds: 12600,
      elapsed_time_seconds: 13500,
      trainer: false,
      commute: false,
    });
    expect(result.rows[1].sport_type).toBe("VirtualRide");
    expect(result.rows[1].trainer).toBe(true);
  });

  it("skips non-cycling rows and rows without dates", () => {
    const result = stravaActivitiesFromCsv(
      [
        "Activity ID,Activity Date,Activity Name,Activity Type,Distance",
        "1,2025-06-01T08:00:00Z,Run,Run,10",
        "2,,Missing date,Ride,50",
        "3,2025-06-03T08:00:00Z,Gravel,Gravel Ride,75",
      ].join("\n"),
      profileId,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].sport_type).toBe("GravelRide");
    expect(result.skippedNonCycling).toBe(1);
    expect(result.skippedRows).toBe(1);
  });

  it("herkent een Nederlandstalige Strava-export (kolomnamen, types en datums)", () => {
    const result = stravaActivitiesFromCsv(
      [
        // Zoals de echte export: dubbele kolommen voor tijd en afstand.
        '"Activiteits-ID","Datum van activiteit","Naam van activiteit","Activiteitstype","Verstreken tijd","Afstand","Woon-werkverkeer","Materiaal voor activiteit","Bestandsnaam","Verstreken tijd","Beweegtijd","Afstand","Hoogtewinst"',
        '123,"6 mrt. 2024 14:23:15",Ochtendrit,Fietsrit,3700,"24,5",false,Canyon,activities/123.fit.gz,3700.0,3600.0,24500.0,350.0',
        '124,"7 mrt. 2024 19:00:00","Alpe du Zwift","Virtuele fietsrit",3600,15,false,,activities/124.fit.gz,3600.0,3550.0,15000.0,1036.0',
        '125,"8 mrt. 2024 09:00:00",Rondje lopen,Hardloopsessie,1800,5,false,,,1800.0,1750.0,5000.0,20.0',
      ].join("\n"),
      profileId,
      42,
    );

    expect(result.rows).toHaveLength(2);
    expect(result.skippedNonCycling).toBe(1);
    expect(result.rows[0]).toMatchObject({
      id: "123",
      name: "Ochtendrit",
      sport_type: "Ride",
      distance_m: 24500,
      total_elevation_gain_m: 350,
      moving_time_seconds: 3600,
      elapsed_time_seconds: 3700,
    });
    expect(result.rows[0].start_date.slice(0, 7)).toBe("2024-03");
    expect(result.rows[1].sport_type).toBe("VirtualRide");
    expect(result.rows[1].trainer).toBe(true);
  });

  it("valt terug op kolomposities bij een onbekende exporttaal", () => {
    const headers = Array.from({ length: 21 }, (_, i) => `columna_${i}`);
    const row = [
      "555", // 0 id
      "1 jun. 2025 8:00:00", // 1 datum
      "Vuelta matinal", // 2 naam
      "Bicicleta", // 3 type
      "", // 4 omschrijving
      "7200", // 5 verstreken tijd
      "50.0", // 6 afstand (km)
      "", // 7 max hartslag
      "", // 8 relative effort
      "false", // 9 woon-werk
      "", // 10 notitie
      "Orbea", // 11 materiaal
      "activities/555.fit.gz", // 12 bestandsnaam
      "", // 13 gewicht atleet
      "", // 14 gewicht fiets
      "7200.0", // 15 verstreken tijd
      "7000.0", // 16 beweegtijd
      "50000.0", // 17 afstand (m)
      "14.2", // 18 max snelheid
      "6.9", // 19 gem snelheid
      "850.0", // 20 hoogtewinst
    ];

    const result = stravaActivitiesFromCsv(
      [headers.join(","), row.join(",")].join("\n"),
      profileId,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: "555",
      name: "Vuelta matinal",
      sport_type: "Ride",
      distance_m: 50000,
      total_elevation_gain_m: 850,
      moving_time_seconds: 7000,
      elapsed_time_seconds: 7200,
    });
  });

  it("creates deterministic synthetic IDs", () => {
    const csv = [
      "Activity Date,Activity Name,Activity Type,Distance",
      "2025-06-01T08:00:00Z,Rit,Ride,50",
    ].join("\n");

    const first = stravaActivitiesFromCsv(csv, profileId);
    const second = stravaActivitiesFromCsv(csv, profileId);

    expect(first.rows[0].id).toBe(second.rows[0].id);
    expect(Number(first.rows[0].id)).toBeLessThan(0);
    expect(first.rows[0].strava_athlete_id).toBe(syntheticAthleteId(profileId));
  });
});

describe("stravaActivityFromGpx", () => {
  const rideGpx = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx creator="StravaGPX" version="1.1">',
    "<metadata><time>2025-06-01T08:00:00Z</time></metadata>",
    "<trk><name>Ochtendrit &amp; koffie</name><type>cycling</type><trkseg>",
    '<trkpt lat="50.85" lon="4.35"><ele>10.0</ele><time>2025-06-01T08:00:00Z</time></trkpt>',
    '<trkpt lat="50.86" lon="4.35"><ele>20.0</ele><time>2025-06-01T08:05:00Z</time></trkpt>',
    '<trkpt lat="50.87" lon="4.35"><ele>15.0</ele><time>2025-06-01T08:05:10Z</time></trkpt>',
    "</trkseg></trk></gpx>",
  ].join("\n");

  it("importeert één rit met afstand, hoogte en tijden", () => {
    const result = stravaActivityFromGpx(rideGpx, profileId, 42);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row.name).toBe("Ochtendrit & koffie");
    expect(result.row.sport_type).toBe("Ride");
    expect(result.row.start_date).toBe("2025-06-01T08:00:00.000Z");
    expect(result.row.elapsed_time_seconds).toBe(310);
    // Het gat van 5 minuten telt niet mee als beweegtijd.
    expect(result.row.moving_time_seconds).toBe(10);
    expect(result.row.distance_m).toBeGreaterThan(2100);
    expect(result.row.distance_m).toBeLessThan(2400);
    expect(result.row.total_elevation_gain_m).toBe(10);
    expect(Number(result.row.id)).toBeLessThan(0);
    expect(result.row.strava_athlete_id).toBe(42);
  });

  it("is deterministisch bij opnieuw uploaden van hetzelfde bestand", () => {
    const first = stravaActivityFromGpx(rideGpx, profileId);
    const second = stravaActivityFromGpx(rideGpx, profileId);
    expect(first.ok && second.ok && first.row.id === second.row.id).toBe(true);
  });

  it("weigert een route-GPX zonder tijdstempels", () => {
    const routeGpx = [
      "<gpx><trk><name>Route</name><trkseg>",
      '<trkpt lat="50.85" lon="4.35"><ele>10.0</ele></trkpt>',
      '<trkpt lat="50.86" lon="4.35"><ele>20.0</ele></trkpt>',
      "</trkseg></trk></gpx>",
    ].join("");

    const result = stravaActivityFromGpx(routeGpx, profileId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("tijdstempels");
  });

  it("weigert een GPX van een niet-fietsactiviteit", () => {
    const runGpx = rideGpx.replace("<type>cycling</type>", "<type>running</type>");
    const result = stravaActivityFromGpx(runGpx, profileId);
    expect(result.ok).toBe(false);
  });
});
