import { describe, expect, it } from "vitest";
import { dismissedRideIds, dropDismissedRides, withoutDismissed } from "@/lib/rides/dismissed";
import { duplicateRideIds, isDuplicateRecording, type RideSpan } from "@/lib/rides/same-ride";

// Een lid nam een rit op met Zwift én een horloge; beide stonden in Strava en
// dus twee keer in het schema. De vorm komt uit productie (2026-11-08).

function ride(id: number, start: string, km: number, minutes: number): RideSpan {
  return {
    id,
    start_date: start,
    distance_m: km * 1000,
    moving_time_seconds: minutes * 60,
  };
}

describe("isDuplicateRecording", () => {
  it("ziet Zwift naast een horloge met 0 km als dubbel", () => {
    const zwift = ride(1, "2026-11-01T07:29:59Z", 45.5, 72);
    const watch = ride(2, "2026-11-01T07:30:02Z", 0, 72);
    expect(isDuplicateRecording(zwift, watch)).toBe(true);
  });

  it("ziet een opname die halverwege stopte als dubbel", () => {
    const full = ride(1, "2026-11-08T07:08:47Z", 0, 99);
    const short = ride(2, "2026-11-08T07:08:48Z", 6.7, 15);
    expect(isDuplicateRecording(full, short)).toBe(true);
  });

  it("houdt een warming-up vóór de race apart", () => {
    const warmup = ride(1, "2026-11-01T16:07:30Z", 6.6, 9);
    const race = ride(2, "2026-11-01T16:16:54Z", 16.9, 41);
    expect(isDuplicateRecording(warmup, race)).toBe(false);
  });

  it("houdt een korte overlap apart", () => {
    const first = ride(1, "2026-10-01T10:00:00Z", 30, 60);
    const second = ride(2, "2026-10-01T10:45:00Z", 30, 60);
    expect(isDuplicateRecording(first, second)).toBe(false);
  });

  it("vergelijkt een rit niet met zichzelf", () => {
    const one = ride(1, "2026-10-01T10:00:00Z", 30, 60);
    expect(isDuplicateRecording(one, { ...one })).toBe(false);
  });

  it("valt zonder rijtijd terug op isSameRide", () => {
    const a = { id: 1, start_date: "2026-10-01T10:00:00Z", distance_m: 20_000 };
    const b = { id: 2, start_date: "2026-10-01T10:00:30Z", distance_m: 20_300 };
    expect(isDuplicateRecording(a, b)).toBe(true);
  });
});

describe("duplicateRideIds", () => {
  it("markeert beide opnames en laat de rest staan", () => {
    const ids = duplicateRideIds([
      ride(3, "2026-11-01T16:16:54Z", 16.9, 41),
      ride(1, "2026-11-01T07:29:59Z", 45.5, 72),
      ride(4, "2026-11-01T16:07:30Z", 6.6, 9),
      ride(2, "2026-11-01T07:30:02Z", 0, 72),
    ]);
    expect([...ids].sort()).toEqual(["1", "2"]);
  });

  it("markeert twee lange ritten die elkaar overlappen", () => {
    const ids = duplicateRideIds([
      ride(1, "2026-11-01T07:00:00Z", 80, 180),
      ride(2, "2026-11-01T12:00:00Z", 2, 5),
      ride(3, "2026-11-01T07:20:00Z", 60, 150),
    ]);
    expect([...ids].sort()).toEqual(["1", "3"]);
  });
});

/** Net genoeg Supabase om strava_activity_dismissals te lezen. */
function fakeDb(rows: Array<{ profile_id: string; activity_id: number }>, fail = false) {
  return {
    from(table: string) {
      expect(table).toBe("strava_activity_dismissals");
      const filters: Array<(row: (typeof rows)[number]) => boolean> = [];
      const query = {
        select: () => query,
        eq: (column: "profile_id", value: string) => {
          filters.push((row) => row[column] === value);
          return query;
        },
        in: (column: "activity_id", values: number[]) => {
          filters.push((row) => values.includes(row[column]));
          return query;
        },
        then: (resolve: (value: unknown) => void) =>
          resolve(
            fail
              ? { data: null, error: { message: "relation does not exist" } }
              : { data: rows.filter((row) => filters.every((keep) => keep(row))), error: null },
          ),
      };
      return query;
    },
  };
}

describe("weggehaalde ritten", () => {
  const db = fakeDb([
    { profile_id: "lid", activity_id: 20813154145 },
    { profile_id: "ander", activity_id: 1 },
  ]);

  it("haalt alleen de eigen weggehaalde ritten uit de upsert", async () => {
    const rows = [{ id: 20813154145 }, { id: 20813135754 }, { id: 1 }];
    expect(await dropDismissedRides(db, "lid", rows)).toEqual([{ id: 20813135754 }, { id: 1 }]);
  });

  it("geeft een lege set als de tabel er nog niet is", async () => {
    expect((await dismissedRideIds(fakeDb([], true), "lid", [1])).size).toBe(0);
  });

  it("laat de rijen ongemoeid zonder weggehaalde ritten", () => {
    const rows = [{ id: 5 }];
    expect(withoutDismissed(rows, new Set())).toBe(rows);
  });
});
