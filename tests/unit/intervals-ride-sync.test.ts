import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/intervals/activities.json";
import { fakeDb } from "./fake-db";

const NOW = new Date("2026-09-30T12:00:00Z");
const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";

const mocks = vi.hoisted(() => ({
  activities: [] as Array<Record<string, unknown>>,
  fetchError: null as Error | null,
  trackCalls: [] as string[],
  trackErrors: {} as Record<string, Error>,
  postSync: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({})),
  awards: vi.fn(async () => ({ awarded: 0 })),
  summaries: vi.fn(async () => ({ written: 0, skipped: 0, rateLimited: false, errors: [] })),
}));

vi.mock("@/lib/intervals/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/intervals/client")>();
  return {
    ...actual,
    fetchIntervalsActivities: vi.fn(async (_key: string, _athlete: string, days: number) => {
      if (mocks.fetchError) throw mocks.fetchError;
      // Zoals de echte API: oldest is een kalenderdag, gefilterd op de lokale start.
      const oldest = new Date(NOW.getTime() - days * 86400_000).toISOString().slice(0, 10);
      return mocks.activities.filter(
        (activity) => String(activity.start_date_local).slice(0, 10) >= oldest,
      );
    }),
    fetchIntervalsActivityTrack: vi.fn(async (_key: string, id: string) => {
      mocks.trackCalls.push(id);
      if (mocks.trackErrors[id]) throw mocks.trackErrors[id];
      return [{ type: "latlng", data: [52, 52.01, 52.02], data2: [5, 5.01, 5.02] }];
    }),
  };
});
vi.mock("@/lib/strava/post-sync", () => ({ runPostSyncForProfile: mocks.postSync }));
vi.mock("@/lib/achievements/awards", () => ({
  awardCompletedAchievementWeeks: mocks.awards,
}));
vi.mock("@/lib/strava/summary-writer", () => ({ writeZwbSummariesForUser: mocks.summaries }));
vi.mock("@/lib/strava/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/strava/client")>();
  return { ...actual, accessTokenFor: vi.fn(async () => "token") };
});

const { syncIntervalsRidesForProfile, loadIntervalsRideConnections } = await import(
  "@/lib/intervals/ride-sync"
);
const { evaluateIntervalsRides } = await import("@/lib/health/checks");

function connection(overrides: Record<string, unknown> = {}) {
  return {
    profile_id: A,
    athlete_id: "i1",
    api_key: "key",
    rides_backfilled_at: null as string | null,
    last_synced_at: null as string | null,
    last_ride_sync_error: null as string | null,
    ...overrides,
  };
}

function setup() {
  const conn = connection();
  const db = fakeDb({
    intervals_connections: [conn],
    strava_activities: [],
    intervals_activities: [],
    strava_connections: [],
  });
  return { db, conn };
}

beforeEach(() => {
  mocks.activities = structuredClone(fixture) as Array<Record<string, unknown>>;
  mocks.fetchError = null;
  mocks.trackCalls = [];
  mocks.trackErrors = {};
  mocks.postSync.mockClear();
  mocks.awards.mockClear();
  mocks.summaries.mockClear();
});

describe("syncIntervalsRidesForProfile", () => {
  it("slaat bij de eerste run een jaar aan fietsritten op, zonder dubbelingen", async () => {
    const { db, conn } = setup();
    const result = await syncIntervalsRidesForProfile(db, conn, { now: NOW });

    expect(result.error).toBeUndefined();
    // Wahoo, Zwift en gravel; niet de Garmin-kopie van de Zwift-rit, de stub of de loop.
    expect(result.stored).toBe(3);
    expect(result.duplicates).toBe(1);
    const rides = db.tables.strava_activities;
    expect(rides.map((ride) => (ride.raw as Record<string, unknown>).intervals_id).sort()).toEqual(
      ["i81234567", "i81234600", "i81234800"],
    );
    expect(rides.every((ride) => Number(ride.id) <= -1e12)).toBe(true);
    expect(rides.every((ride) => ride.efforts_fetched_at)).toBe(true);

    // Sporen opgehaald en als polyline opgeslagen.
    expect(mocks.trackCalls).toHaveLength(3);
    const wahoo = rides.find((ride) => (ride.raw as Record<string, unknown>).intervals_id === "i81234567")!;
    expect((wahoo.raw as { map: { summary_polyline: string } }).map.summary_polyline).toBeTruthy();

    // Nawerk zonder Strava-token.
    expect(mocks.postSync).toHaveBeenCalledTimes(1);
    expect(mocks.postSync.mock.calls[0]).toMatchObject([db, A, null, { milestones: true }]);

    expect(conn.rides_backfilled_at).toBe(NOW.toISOString());
    expect(conn.last_synced_at).toBe(NOW.toISOString());
    expect(conn.last_ride_sync_error).toBeNull();
    // Belasting blijft ook in intervals_activities komen.
    expect(db.tables.intervals_activities.length).toBeGreaterThan(0);
  });

  it("schrijft en rekent niets als er niets veranderd is", async () => {
    const { db, conn } = setup();
    await syncIntervalsRidesForProfile(db, conn, { now: NOW });
    mocks.postSync.mockClear();
    mocks.trackCalls = [];

    const again = await syncIntervalsRidesForProfile(db, conn, { now: NOW });
    expect(again.stored).toBe(0);
    expect(again.removed).toBe(0);
    expect(mocks.trackCalls).toHaveLength(0);
    expect(mocks.postSync).not.toHaveBeenCalled();
  });

  describe("sporen van oudere ritten", () => {
    // Een rit van vóór het venster van 30 dagen, opgeslagen zonder spoor: bij de
    // eerste run (een jaar, vijf sporen) niet aan de beurt gekomen.
    function olderRide(intervalsId: string, startDate: string) {
      return {
        id: -1_000_000_000_000 - Number(intervalsId.slice(1)),
        profile_id: A,
        name: "Zwift - Watopia",
        sport_type: "VirtualRide",
        start_date: startDate,
        distance_m: 30000,
        blocks_processed_at: "2026-06-01T00:00:00Z",
        zwift_blocks_processed_at: "2026-06-01T00:00:00Z",
        raw: { import_source: "intervals", intervals_id: intervalsId, map: { summary_polyline: null } },
      };
    }
    const later = () => connection({ rides_backfilled_at: "2026-01-01T00:00:00Z" });
    const rideOf = (db: ReturnType<typeof fakeDb>, intervalsId: string) =>
      db.tables.strava_activities.find(
        (ride) => (ride.raw as Record<string, unknown>).intervals_id === intervalsId,
      )!;

    it("haalt het spoor alsnog op en zet de rit terug voor ZWBlokken", async () => {
      const { db } = setup();
      db.tables.strava_activities.push(olderRide("i70000000", "2026-05-01T07:00:00Z"));
      const result = await syncIntervalsRidesForProfile(db, later(), { now: NOW });

      expect(result.error).toBeUndefined();
      expect(mocks.trackCalls).toContain("i70000000");
      const ride = rideOf(db, "i70000000");
      const raw = ride.raw as { map: { summary_polyline: string | null }; track_checked_at: string };
      expect(raw.map.summary_polyline).toBeTruthy();
      expect(raw.track_checked_at).toBe(NOW.toISOString());
      expect(ride.blocks_processed_at).toBeNull();
      expect(ride.zwift_blocks_processed_at).toBeNull();
      expect(mocks.postSync).toHaveBeenCalledTimes(1);
      expect(mocks.postSync.mock.calls[0][3]).toMatchObject({ zwblokken: true, colsDetector: true });
    });

    it("rekent ook na zonder nieuwe rit in het venster", async () => {
      const { db } = setup();
      await syncIntervalsRidesForProfile(db, later(), { now: NOW });
      mocks.postSync.mockClear();
      db.tables.strava_activities.push(olderRide("i70000000", "2026-05-01T07:00:00Z"));

      const result = await syncIntervalsRidesForProfile(db, later(), { now: NOW });
      expect(result.stored).toBe(0);
      expect(mocks.postSync).toHaveBeenCalledTimes(1);
    });

    it("neemt de nieuwste eerst en houdt zich aan het maximum", async () => {
      const { db } = setup();
      db.tables.strava_activities.push(
        olderRide("i70000001", "2026-03-01T07:00:00Z"),
        olderRide("i70000002", "2026-07-01T07:00:00Z"),
      );
      await syncIntervalsRidesForProfile(db, later(), { now: NOW, maxOldTracks: 1 });
      expect(mocks.trackCalls).toContain("i70000002");
      expect(mocks.trackCalls).not.toContain("i70000001");
    });

    it("vinkt een rit af die intervals.icu niet meer kent, en vraagt hem niet opnieuw", async () => {
      const { db } = setup();
      db.tables.strava_activities.push(olderRide("i70000003", "2026-05-01T07:00:00Z"));
      mocks.trackErrors.i70000003 = new Error("intervals.icu 404: not found");
      await syncIntervalsRidesForProfile(db, later(), { now: NOW });

      const ride = rideOf(db, "i70000003");
      const raw = ride.raw as { map: { summary_polyline: string | null }; track_checked_at: string };
      expect(raw.map.summary_polyline).toBeNull();
      expect(raw.track_checked_at).toBe(NOW.toISOString());
      expect(ride.zwift_blocks_processed_at).not.toBeNull();

      mocks.trackCalls = [];
      await syncIntervalsRidesForProfile(db, later(), { now: NOW });
      expect(mocks.trackCalls).not.toContain("i70000003");
    });

    it("stopt bij een andere fout en probeert het de volgende run opnieuw", async () => {
      const { db } = setup();
      db.tables.strava_activities.push(
        olderRide("i70000004", "2026-03-01T07:00:00Z"),
        olderRide("i70000005", "2026-07-01T07:00:00Z"),
      );
      mocks.trackErrors.i70000005 = new Error("intervals.icu 429: too many requests");
      const result = await syncIntervalsRidesForProfile(db, later(), { now: NOW });

      expect(result.error).toBeUndefined();
      expect(mocks.trackCalls).not.toContain("i70000004");
      expect((rideOf(db, "i70000005").raw as Record<string, unknown>).track_checked_at).toBeUndefined();
    });
  });

  it("verwijdert een rit die intervals.icu niet meer kent", async () => {
    const { db, conn } = setup();
    await syncIntervalsRidesForProfile(db, conn, { now: NOW });
    mocks.postSync.mockClear();
    mocks.activities = mocks.activities.filter((activity) => activity.id !== "i81234567");

    const result = await syncIntervalsRidesForProfile(db, conn, { now: NOW });
    expect(result.removed).toBe(1);
    expect(db.tables.strava_activities).toHaveLength(2);
    expect(mocks.postSync).toHaveBeenCalledTimes(1);
    expect(mocks.postSync.mock.calls[0][3]).toMatchObject({
      removedActivityIds: [-1_000_081_234_567],
    });
  });

  it("verwijdert niets als intervals.icu een lege lijst geeft", async () => {
    const { db, conn } = setup();
    await syncIntervalsRidesForProfile(db, conn, { now: NOW });
    mocks.activities = [];
    const result = await syncIntervalsRidesForProfile(db, conn, { now: NOW });
    expect(result.removed).toBe(0);
    expect(db.tables.strava_activities).toHaveLength(3);
  });

  it("laat een importrit met vermogen staan en voegt dezelfde rit niet nog eens toe", async () => {
    const { db, conn } = setup();
    db.tables.strava_activities.push({
      id: -12345,
      profile_id: A,
      name: "Rondje Veluwe",
      start_date: "2026-09-27T06:30:30.000Z",
      distance_m: 67400,
      raw: { import_source: "strava_fit", device_watts: true, average_watts: 197 },
    });
    const result = await syncIntervalsRidesForProfile(db, conn, { now: NOW });
    expect(result.duplicates).toBe(2);
    expect(db.tables.strava_activities.find((ride) => ride.id === -12345)).toBeTruthy();
    expect(db.tables.strava_activities).toHaveLength(3);
  });

  // Jeroen Janssen, oktober 2026: zijn Zwift-ritten stonden er al uit
  // activities.csv, zonder vermogen. De rit met vermogen werd als dubbel
  // overgeslagen, dus NP, IF en TSS bleven leeg.
  it("vervangt een importrit zonder vermogen door de rit met vermogen", async () => {
    const { db, conn } = setup();
    const gpsTimes = [{ segment_id: 9, seconds: 58, started_at: "2026-09-27T07:00:00Z" }];
    db.tables.strava_activities.push({
      id: 20131400295,
      profile_id: A,
      name: "Rondje Veluwe",
      start_date: "2026-09-27T06:30:30.000Z",
      distance_m: 67400,
      raw: {
        import_source: "strava_csv",
        map: { summary_polyline: "_p~iF~ps|U_ulLnnqC" },
        gps_segment_times: gpsTimes,
      },
    });
    const result = await syncIntervalsRidesForProfile(db, conn, { now: NOW });

    expect(result.error).toBeUndefined();
    expect(db.tables.strava_activities.some((ride) => ride.id === 20131400295)).toBe(false);
    const veluwe = db.tables.strava_activities.find(
      (ride) => (ride.raw as Record<string, unknown>).intervals_id === "i81234567",
    )!;
    const raw = veluwe.raw as Record<string, unknown>;
    expect(raw.average_watts).toBe(198);
    expect(raw.map).toEqual({ summary_polyline: "_p~iF~ps|U_ulLnnqC" });
    expect(raw.gps_segment_times).toEqual(gpsTimes);
    // Het spoor kwam mee, dus niet nog eens opgevraagd.
    expect(mocks.trackCalls).not.toContain("i81234567");
    // De training van de oude rit komt vrij voor de nieuwe.
    expect(mocks.postSync.mock.calls[0][3]).toMatchObject({ removedActivityIds: [20131400295] });
    expect(db.tables.strava_activities).toHaveLength(3);
  });

  // Jeroen Janssen, 19 oktober 2026: de ruil liet zijn bevestigde trainingen
  // los, en de detectie hing alleen die van de laatste week terug.
  it("verhuist een bevestigde training mee naar de vervangende rit", async () => {
    const { db, conn } = setup();
    db.tables.strava_activities.push({
      id: 20131400295,
      profile_id: A,
      name: "Rondje Veluwe",
      start_date: "2026-09-27T06:30:30.000Z",
      distance_m: 67400,
      moving_time_seconds: 7200,
      raw: { import_source: "strava_csv" },
    });
    db.tables.training_workouts = [
      {
        id: "w1",
        profile_id: A,
        trainer_id: null,
        scheduled_at: "2026-09-27T08:00:00Z",
        title: "Duur 120 min",
        duration_minutes: 120,
        intensity: "endurance",
        target_type: "power",
        structure_json: [],
        intervals_event_id: null,
        status: "completed",
      },
    ];
    db.tables.training_workout_reports = [
      {
        workout_id: "w1",
        profile_id: A,
        paired_activity_id: "20131400295",
        athlete_rpe: 4,
        athlete_feel: "goed",
        athlete_confirmed_at: "2026-09-27T12:00:00Z",
        trainer_status: "approved",
        metrics_json: { plannedTitle: "Duur 120 min", ctlBefore: 61, averageWatts: null },
      },
    ];

    await syncIntervalsRidesForProfile(db, conn, { now: NOW });

    const report = db.tables.training_workout_reports[0];
    expect(report.paired_activity_id).toBe(String(-1_000_081_234_567));
    expect(report.athlete_confirmed_at).toBe("2026-09-27T12:00:00Z");
    expect(report.athlete_rpe).toBe(4);
    expect(report.trainer_status).toBe("approved");
    const metrics = report.metrics_json as Record<string, unknown>;
    expect(metrics.averageWatts).toBe(198);
    expect(metrics.ctlBefore).toBe(61);
  });

  it("slaat een rit uit de rand van het venster over als hij al via Strava staat", async () => {
    // Productie, 2026-10-18: intervals.icu geeft 30 kalenderdagen, de
    // ontdubbeling keek maar 29 dagen terug. De rit van 31 augustus kwam er
    // daardoor naast de Strava-rit bij.
    const { db, conn } = setup();
    conn.rides_backfilled_at = "2026-09-01T00:00:00Z";
    mocks.activities.push({
      id: "i81230000",
      source: "WAHOO",
      type: "Ride",
      name: "Le dernier",
      start_date: "2026-08-31T13:45:33Z",
      start_date_local: "2026-08-31T15:45:33",
      timezone: "Europe/Amsterdam",
      distance: 35329,
      moving_time: 5400,
    });
    db.tables.strava_activities.push({
      id: 20131400295,
      profile_id: A,
      name: "Le dernier",
      start_date: "2026-08-31T13:45:33.000Z",
      distance_m: 35325,
      raw: {},
    });

    const result = await syncIntervalsRidesForProfile(db, conn, { now: NOW });
    expect(result.error).toBeUndefined();
    const edge = db.tables.strava_activities.filter(
      (ride) => String(ride.start_date).startsWith("2026-08-31"),
    );
    expect(edge.map((ride) => ride.id)).toEqual([20131400295]);
  });

  it("verwijdert geen eigen rit uit de rand die de lijst niet meer bevat", async () => {
    const { db, conn } = setup();
    conn.rides_backfilled_at = "2026-09-01T00:00:00Z";
    db.tables.strava_activities.push({
      id: -1_000_081_230_000,
      profile_id: A,
      name: "Le dernier",
      start_date: "2026-08-31T13:45:33.000Z",
      distance_m: 35329,
      raw: { import_source: "intervals" },
    });
    const result = await syncIntervalsRidesForProfile(db, conn, { now: NOW });
    expect(result.removed).toBe(0);
    expect(db.tables.strava_activities.some((ride) => ride.id === -1_000_081_230_000)).toBe(true);
  });

  it("legt een fout vast en schuift toch op", async () => {
    const { db, conn } = setup();
    mocks.fetchError = new Error("intervals.icu API-key wordt afgewezen.");
    const result = await syncIntervalsRidesForProfile(db, conn, { now: NOW });
    expect(result.error).toContain("afgewezen");
    expect(conn.last_ride_sync_error).toContain("afgewezen");
    expect(conn.last_synced_at).toBe(NOW.toISOString());
    expect(conn.rides_backfilled_at).toBeNull();
  });
});

describe("loadIntervalsRideConnections", () => {
  it("slaat leden met een Strava-koppeling over, ook een die op opruiming wacht", async () => {
    const db = fakeDb({
      intervals_connections: [
        connection({ profile_id: A, last_synced_at: "2026-09-30T10:00:00Z" }),
        connection({ profile_id: B, last_synced_at: null }),
        connection({ profile_id: "e", last_synced_at: "2026-09-30T11:00:00Z" }),
        connection({ profile_id: "c", last_synced_at: "2026-09-30T09:00:00Z" }),
        connection({ profile_id: "d", athlete_id: null }),
      ],
      strava_connections: [
        { profile_id: "c", revoked_at: null },
        { profile_id: A, revoked_at: "2026-09-01T00:00:00Z" },
      ],
    });
    const rows = await loadIntervalsRideConnections(db);
    expect(rows.map((row) => row.profile_id)).toEqual([B, "e"]);
  });

  it("neemt een lid met Strava mee als hij zijn ritten via intervals.icu wil", async () => {
    const db = fakeDb({
      intervals_connections: [
        connection({ profile_id: A, last_synced_at: "2026-09-30T10:00:00Z" }),
        connection({ profile_id: "c", rides_via_intervals: true, last_synced_at: null }),
        connection({ profile_id: "d", rides_via_intervals: false }),
      ],
      strava_connections: [
        { profile_id: "c", revoked_at: null },
        { profile_id: "d", revoked_at: null },
      ],
    });
    const rows = await loadIntervalsRideConnections(db);
    expect(rows.map((row) => row.profile_id)).toEqual(["c", A]);
  });
});

describe("ritten via intervals.icu naast Strava", () => {
  it("laat een rit die al van Strava kwam staan en schrijft de samenvatting", async () => {
    const conn = connection({ rides_via_intervals: true, rides_backfilled_at: NOW.toISOString() });
    const wahoo = (fixture as Array<Record<string, unknown>>).find(
      (activity) => activity.id === "i81234567",
    )!;
    const db = fakeDb({
      intervals_connections: [conn],
      strava_activities: [
        {
          id: 9_000_001,
          profile_id: A,
          start_date: new Date(String(wahoo.start_date)).toISOString(),
          distance_m: Number(wahoo.distance),
          raw: { device_watts: true, average_watts: 190 },
        },
      ],
      intervals_activities: [],
      strava_connections: [
        { profile_id: A, revoked_at: null, scope: "read,activity:read_all,activity:write" },
      ],
    });

    const result = await syncIntervalsRidesForProfile(db, conn, { now: NOW });
    expect(result.error).toBeUndefined();
    expect(result.duplicates).toBeGreaterThanOrEqual(1);
    const ids = db.tables.strava_activities.map((ride) => Number(ride.id));
    expect(ids).toContain(9_000_001);
    expect(ids).not.toContain(-1_000_081_234_567);

    expect(mocks.summaries).toHaveBeenCalledTimes(1);
    expect(mocks.summaries.mock.calls[0]).toMatchObject([db, A, "token", { maxWrites: 1 }]);
  });

  it("schrijft geen samenvatting zonder Strava-schrijfrecht", async () => {
    const conn = connection({ rides_via_intervals: true });
    const db = fakeDb({
      intervals_connections: [conn],
      strava_activities: [],
      intervals_activities: [],
      strava_connections: [{ profile_id: A, revoked_at: null, scope: "read,activity:read_all" }],
    });
    await syncIntervalsRidesForProfile(db, conn, { now: NOW });
    expect(mocks.summaries).not.toHaveBeenCalled();
  });
});

describe("purgeStravaDataForProfile", () => {
  it("wist Strava-ritten en imports, maar laat intervals-ritten staan", async () => {
    const { purgeStravaDataForProfile } = await import("@/lib/strava/retention");
    const db = fakeDb({
      strava_activities: [
        { id: 111, profile_id: A },
        { id: -123, profile_id: A },
        { id: -1_000_081_234_567, profile_id: A },
        { id: 222, profile_id: B },
      ],
      strava_activity_segment_efforts: [],
      strava_bikes: [],
      profiles: [{ id: A, avatar_url: null }],
    });
    await purgeStravaDataForProfile(db, A);
    expect(db.tables.strava_activities.map((row) => row.id)).toEqual([-1_000_081_234_567, 222]);
  });

  it("laat eigen tijden op een intervals-rit staan", async () => {
    const { purgeStravaDataForProfile } = await import("@/lib/strava/retention");
    const gpsTimes = [{ segment_id: 9, seconds: 120, started_at: "2026-09-30T08:00:00Z" }];
    const db = fakeDb({
      strava_activities: [
        { id: 111, profile_id: A, raw: {} },
        { id: -1_000_081_234_567, profile_id: A, raw: { gps_segment_times: gpsTimes } },
      ],
      zwb_segments: [
        { slug: "vam", collection: "benelux_popular" },
        { slug: "posbank", collection: "benelux_popular" },
      ],
      profile_completed_segments: [
        { profile_id: A, segment_slug: "vam", best_time_seconds: 300, best_time_source: null },
        { profile_id: A, segment_slug: "posbank", best_time_seconds: 120, best_time_source: "gps" },
      ],
      strava_bikes: [],
      profiles: [{ id: A, avatar_url: null }],
    });
    const result = await purgeStravaDataForProfile(db, A);
    expect(result.segmentTimes).toBe(1);
    expect(db.tables.strava_activities).toEqual([{ id: -1_000_081_234_567, profile_id: A, raw: { gps_segment_times: gpsTimes } }]);
    expect(db.tables.profile_completed_segments.map((row) => row.segment_slug)).toEqual(["posbank"]);
  });
});

describe("loadRideHistory (pacing)", () => {
  it("telt een rit via intervals.icu niet dubbel", async () => {
    const { loadRideHistory } = await import("@/lib/pacing/draft");
    const recent = new Date(Date.now() - 5 * 86400_000).toISOString();
    const db = fakeDb({
      strava_activities: [
        { id: -1_000_081_234_567, profile_id: A, name: "Rit", start_date: recent, distance_m: 50000, raw: {} },
        { id: 999, profile_id: A, name: "Strava", start_date: recent, distance_m: 40000, raw: {} },
      ],
      intervals_activities: [
        { intervals_id: "i81234567", profile_id: A, name: "Rit", start_date_local: recent, distance_m: 50000 },
      ],
    });
    const rides = await loadRideHistory(db as never, A);
    expect(rides.map((ride) => ride.id).sort()).toEqual(["intervals-i81234567", "strava-999"]);
  });
});

describe("evaluateIntervalsRides", () => {
  const now = new Date("2026-09-30T12:00:00Z");

  it("is groen zonder leden en na een recente run", () => {
    expect(evaluateIntervalsRides([], 3, now).ok).toBe(true);
    const result = evaluateIntervalsRides(
      [
        { last_synced_at: "2026-09-30T11:10:00Z", last_ride_sync_error: null },
        { last_synced_at: "2026-09-30T10:00:00Z", last_ride_sync_error: "401" },
      ],
      3,
      now,
    );
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("1 van 2");
  });

  it("is rood als de cron niet draait of iedereen faalt", () => {
    expect(
      evaluateIntervalsRides([{ last_synced_at: "2026-09-30T06:00:00Z", last_ride_sync_error: null }], 3, now).ok,
    ).toBe(false);
    expect(evaluateIntervalsRides([{ last_synced_at: null, last_ride_sync_error: null }], 3, now).ok).toBe(false);
    expect(
      evaluateIntervalsRides([{ last_synced_at: "2026-09-30T11:30:00Z", last_ride_sync_error: "401" }], 3, now).ok,
    ).toBe(false);
  });
});
