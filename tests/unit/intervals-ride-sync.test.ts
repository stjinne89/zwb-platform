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
  postSync: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({})),
  awards: vi.fn(async () => ({ awarded: 0 })),
}));

vi.mock("@/lib/intervals/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/intervals/client")>();
  return {
    ...actual,
    fetchIntervalsActivities: vi.fn(async (_key: string, _athlete: string, days: number) => {
      if (mocks.fetchError) throw mocks.fetchError;
      const oldest = NOW.getTime() - days * 86400_000;
      return mocks.activities.filter(
        (activity) => Date.parse(`${activity.start_date_local}Z`) >= oldest,
      );
    }),
    fetchIntervalsActivityTrack: vi.fn(async (_key: string, id: string) => {
      mocks.trackCalls.push(id);
      return [{ type: "latlng", data: [52, 52.01, 52.02], data2: [5, 5.01, 5.02] }];
    }),
  };
});
vi.mock("@/lib/strava/post-sync", () => ({ runPostSyncForProfile: mocks.postSync }));
vi.mock("@/lib/achievements/awards", () => ({
  awardCompletedAchievementWeeks: mocks.awards,
}));

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
  mocks.postSync.mockClear();
  mocks.awards.mockClear();
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

  it("laat een importrit staan en voegt dezelfde rit niet nog eens toe", async () => {
    const { db, conn } = setup();
    db.tables.strava_activities.push({
      id: -12345,
      profile_id: A,
      name: "Rondje Veluwe",
      start_date: "2026-09-27T06:30:30.000Z",
      distance_m: 67400,
      raw: { import_source: "strava_gpx" },
    });
    const result = await syncIntervalsRidesForProfile(db, conn, { now: NOW });
    expect(result.duplicates).toBe(2);
    expect(db.tables.strava_activities.find((ride) => ride.id === -12345)).toBeTruthy();
    expect(db.tables.strava_activities).toHaveLength(3);
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
  it("slaat leden met een actieve Strava-koppeling over, oudste eerst", async () => {
    const db = fakeDb({
      intervals_connections: [
        connection({ profile_id: A, last_synced_at: "2026-09-30T10:00:00Z" }),
        connection({ profile_id: B, last_synced_at: null }),
        connection({ profile_id: "c", last_synced_at: "2026-09-30T09:00:00Z" }),
        connection({ profile_id: "d", athlete_id: null }),
      ],
      strava_connections: [
        { profile_id: "c", revoked_at: null },
        { profile_id: A, revoked_at: "2026-09-01T00:00:00Z" },
      ],
    });
    const rows = await loadIntervalsRideConnections(db);
    expect(rows.map((row) => row.profile_id)).toEqual([B, A]);
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
