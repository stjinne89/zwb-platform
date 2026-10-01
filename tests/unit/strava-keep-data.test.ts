import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./fake-db";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";

const mocks = vi.hoisted(() => ({
  deauthorize: vi.fn(async () => ({ ok: true, alreadyGone: false }) as unknown),
}));

vi.mock("@/lib/strava/client", () => ({ accessTokenFor: vi.fn(async () => "token") }));
vi.mock("@/lib/strava/deauthorize", () => ({ deauthorizeStravaAthlete: mocks.deauthorize }));
vi.mock("@/lib/push/send", () => ({ sendNotificationToMembers: vi.fn(async () => null) }));

const { revokeAndCleanupStravaConnection, runStravaSweep } = await import("@/lib/strava/sweep");
const { keepsStravaData } = await import("@/lib/strava/lifecycle");

function setup(connection: Record<string, unknown> = {}) {
  return fakeDb({
    strava_connections: [
      {
        profile_id: A,
        strava_athlete_id: 1,
        revoked_at: null,
        revoked_reason: null,
        deauthorized_at: null,
        ...connection,
      },
    ],
    strava_activities: [
      { id: 111, profile_id: A },
      { id: -123, profile_id: A },
      { id: 222, profile_id: B },
    ],
    strava_activity_segment_efforts: [{ effort_uid: "strava:1", profile_id: A, activity_id: 111 }],
    strava_bikes: [{ id: "b1", profile_id: A, source: "strava" }],
    profiles: [{ id: A, strava_id: "1", avatar_url: "https://dgalywyr863hv.cloudfront.net/pictures/a.jpg" }],
  });
}

beforeEach(() => {
  mocks.deauthorize.mockReset();
  mocks.deauthorize.mockResolvedValue({ ok: true, alreadyGone: false });
});

describe("keepsStravaData", () => {
  it("geldt alleen voor de eigen keuze van het lid", () => {
    expect(keepsStravaData("member_keep_data")).toBe(true);
    for (const reason of ["member", "admin", "inactive", "strava", "switched_to_intervals", null]) {
      expect(keepsStravaData(reason)).toBe(false);
    }
  });
});

describe("ontkoppelen met ritten bewaren", () => {
  it("haalt de koppeling weg en laat ritten, tijden, fietsen en profiel staan", async () => {
    const db = setup();
    const result = await revokeAndCleanupStravaConnection(db, A, "member_keep_data");

    expect(result).toEqual({ deauthorized: true, purged: false });
    expect(mocks.deauthorize).toHaveBeenCalledOnce();
    expect(db.tables.strava_connections).toEqual([]);
    expect(db.tables.strava_activities.map((row) => row.id)).toEqual([111, -123, 222]);
    expect(db.tables.strava_activity_segment_efforts).toHaveLength(1);
    expect(db.tables.strava_bikes).toHaveLength(1);
    expect(db.tables.profiles[0].strava_id).toBe("1");
  });

  it("wist zoals voorheen bij gewoon ontkoppelen", async () => {
    const db = setup();
    const result = await revokeAndCleanupStravaConnection(db, A, "member");

    expect(result).toEqual({ deauthorized: true, purged: true });
    expect(db.tables.strava_connections).toEqual([]);
    expect(db.tables.strava_activities.map((row) => row.id)).toEqual([222]);
    expect(db.tables.strava_bikes).toEqual([]);
    expect(db.tables.profiles[0].strava_id).toBeNull();
  });

  it("onthoudt de keuze als Strava de deauthorisatie weigert, en de nachtrun houdt zich eraan", async () => {
    const db = setup();
    mocks.deauthorize.mockResolvedValueOnce({ ok: false, error: "Strava deauthorize faalde (500)" });

    const result = await revokeAndCleanupStravaConnection(db, A, "member_keep_data");
    expect(result.deauthorized).toBe(false);
    expect(db.tables.strava_connections[0].revoked_reason).toBe("member_keep_data");
    expect(db.tables.strava_connections[0].deauthorized_at).toBeNull();

    const sweep = await runStravaSweep(db, { loginRule: null });
    expect(sweep.deauthorized).toBe(1);
    expect(db.tables.strava_connections).toEqual([]);
    expect(db.tables.strava_activities.map((row) => row.id)).toEqual([111, -123, 222]);
  });

  it("de nachtrun wist wel bij elke andere reden", async () => {
    const db = setup({
      revoked_at: "2026-10-01T08:00:00.000Z",
      revoked_reason: "inactive",
      deauthorized_at: "2026-10-01T08:00:00.000Z",
    });
    await runStravaSweep(db, { loginRule: null });
    expect(db.tables.strava_connections).toEqual([]);
    expect(db.tables.strava_activities.map((row) => row.id)).toEqual([222]);
  });
});
