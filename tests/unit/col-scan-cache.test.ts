import polyline from "@mapbox/polyline";
import { describe, expect, it } from "vitest";
import { fakeDb } from "./fake-db";
import {
  aggregateColPassages,
  colCatalogKey,
  rideScanKey,
  syncClimbedColsForUser,
} from "@/lib/cols/detector";

// De col-detector scant elke rit één keer en bewaart de cols per rit (migratie
// 0255). Daarna telt hij uit die lichte kolom; zie de databasecheck van 2026-10-20.

const A = "00000000-0000-0000-0000-00000000000a";
const COL = { slug: "testcol", summit_lat: 45.05, summit_lon: 6.0, detection_radius_m: 200, ascent_m: null };
const CLIMB = polyline.encode([[45.0, 6.0], [45.05, 6.0], [45.1, 6.0]]);

function dbWithRpc(rides: Record<string, unknown>[]) {
  const db = fakeDb({ cols: [COL], strava_activities: rides, profile_climbed_cols: [] });
  const calls: Array<Array<{ id: number; col_slugs: string[]; col_scan_key: string }>> = [];
  Object.assign(db, {
    rpc: async (_name: string, args: { p_rows: Array<{ id: number; col_slugs: string[]; col_scan_key: string }> }) => {
      calls.push(args.p_rows);
      for (const update of args.p_rows) {
        const ride = db.tables.strava_activities.find((r) => r.id === update.id);
        if (ride) Object.assign(ride, { col_slugs: update.col_slugs, col_scan_key: update.col_scan_key });
      }
      return { data: null, error: null };
    },
  });
  return { db, calls };
}

describe("aggregateColPassages", () => {
  it("telt een dubbele opname één keer en houdt de kopie met de col", () => {
    const { passages, uniqueRides } = aggregateColPassages([
      { id: 11, start_date: "2026-09-17T15:00:00Z", distance_m: 40_000, col_slugs: [] },
      { id: 12, start_date: "2026-09-17T15:01:00Z", distance_m: 40_200, col_slugs: ["testcol"] },
      { id: 13, start_date: "2026-09-20T09:00:00Z", distance_m: 60_000, col_slugs: ["testcol"] },
    ]);
    expect(uniqueRides).toBe(2);
    expect(passages.get("testcol")).toMatchObject({ count: 2, firstActivityId: 12, lastActivityId: 13 });
  });
});

describe("colCatalogKey", () => {
  it("verandert als een top verschuift, niet door de volgorde", () => {
    const other = { ...COL, slug: "ander" };
    expect(colCatalogKey([COL, other])).toBe(colCatalogKey([other, COL]));
    expect(colCatalogKey([COL])).not.toBe(colCatalogKey([{ ...COL, summit_lat: 45.06 }]));
  });
});

describe("syncClimbedColsForUser met scancache", () => {
  const rides = () => [
    { id: 11, profile_id: A, start_date: "2026-09-17T15:00:00Z", distance_m: 40_000, total_elevation_gain_m: 900, summary_polyline: CLIMB, synced_at: "2026-10-01T00:00:00Z" },
    { id: 13, profile_id: A, start_date: "2026-09-20T09:00:00Z", distance_m: 60_000, total_elevation_gain_m: 1200, summary_polyline: CLIMB, synced_at: "2026-10-01T00:00:00Z" },
  ];

  it("scant de eerste keer alles en daarna alleen een gewijzigde rit", async () => {
    const { db, calls } = dbWithRpc(rides());
    await syncClimbedColsForUser(db, A);
    expect(calls.flat().map((u) => u.id).sort()).toEqual([11, 13]);
    expect(db.tables.profile_climbed_cols).toMatchObject([{ col_slug: "testcol", times_climbed: 2 }]);

    calls.length = 0;
    await syncClimbedColsForUser(db, A);
    expect(calls).toHaveLength(0);

    db.tables.strava_activities[1].synced_at = "2026-10-20T00:00:00Z";
    await syncClimbedColsForUser(db, A);
    expect(calls.flat().map((u) => u.id)).toEqual([13]);
    expect(calls[0][0].col_scan_key).toBe(rideScanKey(colCatalogKey([COL]), "2026-10-20T00:00:00Z"));
  });
});
