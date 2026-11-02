import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./fake-db";

const mocks = vi.hoisted(() => ({
  ingest: vi.fn(async () => ({ status: "stored", activityId: 77, efforts: 0 })),
  postSync: vi.fn(async () => ({})),
}));

vi.mock("@/lib/strava/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/strava/client")>();
  return { ...actual, accessTokenFor: vi.fn(async () => "token") };
});
vi.mock("@/lib/strava/ingest-activity", () => ({
  ingestStravaActivity: mocks.ingest,
  removeStravaActivity: vi.fn(async () => false),
}));
vi.mock("@/lib/strava/post-sync", () => ({
  runPostSyncForProfile: mocks.postSync,
  webhookPostSyncSteps: () => ({ summaries: 1, milestones: true }),
}));

const { processStravaWebhookEvents } = await import("@/lib/strava/webhook-processor");

const A = "00000000-0000-0000-0000-00000000000a";

function setup(ridesViaIntervals: boolean) {
  return fakeDb({
    strava_webhook_events: [
      {
        id: 1,
        object_type: "activity",
        object_id: 77,
        aspect_type: "create",
        owner_id: 5,
        event_time: "2026-11-02T10:00:00Z",
        updates: {},
        attempts: 0,
        processed_at: null,
        received_at: "2026-11-02T10:00:01Z",
      },
    ],
    strava_connections: [
      {
        profile_id: A,
        strava_athlete_id: 5,
        access_token: "x",
        refresh_token: "y",
        expires_at: 0,
        scope: "activity:read_all,activity:write",
        revoked_at: null,
      },
    ],
    intervals_connections: [
      { profile_id: A, athlete_id: "i1", rides_via_intervals: ridesViaIntervals },
    ],
  });
}

beforeEach(() => {
  mocks.ingest.mockClear();
  mocks.postSync.mockClear();
});

describe("processStravaWebhookEvents", () => {
  it("slaat de rit niet op als die via intervals.icu komt, maar draait wel het nawerk", async () => {
    const db = setup(true);
    const result = await processStravaWebhookEvents(db);
    expect(mocks.ingest).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
    expect(db.tables.strava_webhook_events[0].processed_at).toBeTruthy();
    expect(mocks.postSync).toHaveBeenCalledTimes(1);
    expect(mocks.postSync.mock.calls[0]).toMatchObject([db, A, "token", { summaries: 1 }]);
  });

  it("slaat de rit gewoon op zonder die keuze", async () => {
    const db = setup(false);
    const result = await processStravaWebhookEvents(db);
    expect(mocks.ingest).toHaveBeenCalledTimes(1);
    expect(result.stored).toBe(1);
  });
});
