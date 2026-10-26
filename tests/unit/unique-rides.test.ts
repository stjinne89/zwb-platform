import polyline from "@mapbox/polyline";
import { describe, expect, it, vi } from "vitest";
import { fakeDb } from "./fake-db";

// Dezelfde rit twee keer in strava_activities: het lid nam hem met twee toestellen
// op en zette beide op Strava, of importeerde hem twee keer. Elke lezer telt hem
// één keer (docs/dubbele-ritten-2026-10-18.md).

vi.mock("@/lib/push/send", () => ({ sendNotificationToMembers: vi.fn(async () => null) }));

const { uniqueRides, trackFirst } = await import("@/lib/rides/unique-rides");
const { rideLoadRows } = await import("@/lib/training/ride-metrics");
const { trainingDataFrom } = await import("@/lib/training/training-data");
const { todayRidesFrom } = await import("@/lib/training/adapt-context");
const { weeklyScores } = await import("@/lib/achievements/awards");
const { activitiesForEval } = await import("@/lib/achievements/milestone-evaluators");
const { syncClimbedColsForUser } = await import("@/lib/cols/detector");

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const START = "2026-09-17T15:00:00.000Z";
const LATER = "2026-09-17T15:01:10.000Z";

const power = { device_watts: true, average_watts: 210, weighted_average_watts: 230, moving_time: 3600 };
const track = { map: { summary_polyline: polyline.encode([[45.9, 6.4], [45.91, 6.41]]) } };

function row(overrides: Record<string, unknown>) {
  return {
    id: 1,
    profile_id: A,
    name: "Rit",
    start_date: START,
    distance_m: 40_000,
    moving_time_seconds: 3600,
    total_elevation_gain_m: 300,
    raw: {},
    ...overrides,
  };
}

describe("uniqueRides", () => {
  it("houdt van twee opnames die met vermogen, in de volgorde van de invoer", () => {
    const rows = [
      row({ id: 11, name: "Telefoon", raw: track }),
      row({ id: 99, name: "Los" , start_date: "2026-09-18T08:00:00Z" }),
      row({ id: 12, name: "Wahoo", start_date: LATER, distance_m: 40_900, raw: { ...power } }),
    ];
    expect(uniqueRides(rows).map((ride) => ride.name)).toEqual(["Los", "Wahoo"]);
  });

  it("houdt voor de cols de opname met een spoor", () => {
    const rows = [row({ id: 11, raw: { ...power } }), row({ id: 12, start_date: LATER, raw: track })];
    expect(uniqueRides(rows, trackFirst).map((ride) => ride.id)).toEqual([12]);
  });

  it("kiest bij gelijke stand de Strava-rit boven een kopie met negatief id", () => {
    const rows = [row({ id: -1_000_000_000_123 }), row({ id: 20131400295, start_date: LATER })];
    expect(uniqueRides(rows).map((ride) => ride.id)).toEqual([20131400295]);
  });

  it("voegt ritten van verschillende leden of ver uit elkaar niet samen", () => {
    const rows = [
      row({ id: 1, profile_id: A }),
      row({ id: 2, profile_id: B }),
      row({ id: 3, profile_id: A, start_date: "2026-09-17T15:03:00.000Z" }),
      row({ id: 4, profile_id: A, start_date: LATER, distance_m: 30_000 }),
    ];
    expect(uniqueRides(rows).map((ride) => ride.id)).toEqual([1, 2, 3, 4]);
  });

  it("laat een rij zonder bruikbare starttijd staan", () => {
    expect(uniqueRides([row({ id: 1, start_date: "onzin" }), row({ id: 2 })])).toHaveLength(2);
  });
});

describe("lezers tellen een dubbele opname één keer", () => {
  const twins = [
    row({ id: 11, raw: { ...power } }),
    row({ id: 12, start_date: LATER, distance_m: 40_500, raw: { ...power, average_watts: 205 } }),
  ];

  it("belasting (rideLoadRows)", () => {
    expect(rideLoadRows(twins, 250)).toHaveLength(1);
  });

  it("planner (trainingDataFrom)", () => {
    const data = trainingDataFrom({
      rides: twins,
      ftpWatts: 250,
      weightKg: 72,
      ftpTests: [],
      powerProfile: null,
      form: null,
      now: Date.parse("2026-09-18T08:00:00Z"),
    });
    expect(data.ritten).toHaveLength(1);
    expect(data.weken.reduce((sum, week) => sum + week.km, 0)).toBe(40);
  });

  it("dag-aanpassing (todayRidesFrom)", () => {
    expect(todayRidesFrom({ todayKey: "2026-09-17", rides: twins, ftpWatts: 250 })).toHaveLength(1);
  });

  it("week-awards (weeklyScores)", () => {
    const rows = twins.map((ride) => ({
      ...ride,
      achievement_week: "2026-09-14",
      kudos_count: 2,
    }));
    const [score] = weeklyScores([...rows, { ...rows[0], id: 13, profile_id: B }]).filter(
      (entry) => entry.profileId === A,
    );
    expect(score).toMatchObject({ activities: 1, distanceM: 40_000 });
  });

  it("mijlpalen (activitiesForEval)", () => {
    const rows = twins.map((ride) => ({
      ...ride,
      elapsed_time_seconds: 3700,
      kudos_count: 0,
      trainer: false,
      commute: false,
      sport_type: "Ride",
      raw_start_date_local: null,
      raw_achievement_count: null,
      raw_pr_count: null,
      raw_athlete_count: null,
      raw_name: null,
      raw_sport_type: null,
      raw_type: null,
    }));
    expect(activitiesForEval(rows as never)).toHaveLength(1);
  });

  it("cols (times_climbed)", async () => {
    const climb = polyline.encode([[45.0, 6.0], [45.05, 6.0], [45.1, 6.0]]);
    const db = fakeDb({
      cols: [
        { slug: "testcol", summit_lat: 45.05, summit_lon: 6.0, detection_radius_m: 200, ascent_m: null },
      ],
      strava_activities: [
        { id: 11, profile_id: A, start_date: START, distance_m: 40_000, total_elevation_gain_m: 900, summary_polyline: climb },
        { id: 12, profile_id: A, start_date: LATER, distance_m: 40_200, total_elevation_gain_m: 880, summary_polyline: climb },
        { id: 13, profile_id: A, start_date: "2026-09-20T09:00:00.000Z", distance_m: 60_000, total_elevation_gain_m: 1200, summary_polyline: climb },
      ],
      profile_climbed_cols: [],
    });
    const result = await syncClimbedColsForUser(db, A);
    expect(result.scanned).toBe(2);
    expect(db.tables.profile_climbed_cols).toMatchObject([
      { col_slug: "testcol", times_climbed: 2, first_activity_id: 11, last_activity_id: 13 },
    ]);
  });

  it("clubstatistiek: alleen de opnames van hetzelfde lid", () => {
    const club = [
      row({ id: 21, profile_id: A }),
      row({ id: 22, profile_id: A, start_date: LATER }),
      row({ id: 23, profile_id: B }),
    ];
    const km = uniqueRides(club).reduce((sum, ride) => sum + Number(ride.distance_m) / 1000, 0);
    expect(km).toBe(80);
  });
});
