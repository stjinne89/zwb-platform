import { describe, expect, it } from "vitest";
import { applyCuratedEffortsFromDetail, curatedEffortTimes } from "@/lib/segments/sync";
import { fakeDb } from "./fake-db";

// De collecties werken zonder pogingentabel: de tijden komen uit het
// Strava-antwoord van de rit zelf.
const A = "00000000-0000-0000-0000-00000000000a";

const segments = [
  { slug: "vam", collection: "benelux_popular", strava_segment_id: 10, active: true },
  { slug: "alpe", collection: "cols", strava_segment_id: 652851, active: true },
  { slug: "zonder-id", collection: "europe_flat", strava_segment_id: null, active: true },
];

const detail = {
  start_date: "2026-05-01T08:00:00Z",
  segment_efforts: [
    { segment: { id: 10 }, elapsed_time: 300, start_date: "2026-05-01T08:10:00Z" },
    { segment: { id: 10 }, elapsed_time: 280, start_date: "2026-05-01T09:10:00Z" },
    { segment: { id: 652851 }, moving_time: 3000 },
    { segment: { id: 999 }, elapsed_time: 50 },
    { segment: { id: 10 }, elapsed_time: 0 },
  ],
};

describe("curatedEffortTimes", () => {
  it("houdt per uitgekozen segment de snelste tijd over", () => {
    expect(curatedEffortTimes(detail, segments)).toEqual([
      { slug: "vam", collection: "benelux_popular", seconds: 280, startedAt: "2026-05-01T09:10:00Z" },
      { slug: "alpe", collection: "cols", seconds: 3000, startedAt: "2026-05-01T08:00:00Z" },
    ]);
  });

  it("is leeg zonder inspanningen", () => {
    expect(curatedEffortTimes({}, segments)).toEqual([]);
  });
});

describe("applyCuratedEffortsFromDetail", () => {
  it("maakt een collectierij aan en zet de coltijd op een al beklommen col", async () => {
    const db = fakeDb({
      zwb_segments: segments,
      profile_completed_segments: [],
      profile_climbed_cols: [{ profile_id: A, col_slug: "alpe", best_time_seconds: null }],
    });

    expect(await applyCuratedEffortsFromDetail(db, A, 77, detail)).toBe(2);

    expect(db.tables.profile_completed_segments).toHaveLength(1);
    expect(db.tables.profile_completed_segments[0]).toMatchObject({
      profile_id: A,
      segment_slug: "vam",
      best_time_seconds: 280,
      best_time_activity_id: 77,
      times_completed: 1,
      first_activity_id: 77,
    });
    expect(db.tables.profile_climbed_cols[0]).toMatchObject({ best_time_seconds: 3000, best_time_activity_id: 77 });
  });

  it("laat een snellere bestaande tijd staan en telt een herhaalde rit niet dubbel", async () => {
    const db = fakeDb({
      zwb_segments: segments,
      profile_completed_segments: [
        {
          profile_id: A,
          segment_slug: "vam",
          best_time_seconds: 250,
          best_time_activity_id: 5,
          times_completed: 4,
          first_activity_id: 1,
          first_completed_at: "2025-01-01T00:00:00Z",
          last_completed_at: "2026-06-01T00:00:00Z",
        },
      ],
      profile_climbed_cols: [{ profile_id: A, col_slug: "alpe", best_time_seconds: 2900 }],
    });

    expect(await applyCuratedEffortsFromDetail(db, A, 77, detail)).toBe(0);

    expect(db.tables.profile_completed_segments[0]).toMatchObject({ best_time_seconds: 250, times_completed: 4 });
    expect(db.tables.profile_climbed_cols[0]).toMatchObject({ best_time_seconds: 2900 });
  });

  it("zet geen coltijd als de col-detector de col nog niet heeft vastgelegd", async () => {
    const db = fakeDb({ zwb_segments: segments, profile_completed_segments: [], profile_climbed_cols: [] });

    await applyCuratedEffortsFromDetail(db, A, 77, detail);

    expect(db.tables.profile_climbed_cols).toHaveLength(0);
  });
});
