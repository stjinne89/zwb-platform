import { describe, expect, it } from "vitest";
import {
  parseCsv,
  stravaActivitiesFromCsv,
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
