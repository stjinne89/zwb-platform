import { describe, expect, it } from "vitest";
import { joinRide, splitRide } from "@/lib/training/completion";
import { pairWorkoutsWithRides } from "@/lib/training/compliance";
import { rideMetricsFromStrava, type StravaRideRow } from "@/lib/training/ride-metrics";
import { canJoinRide, combineRideParts, mergeRideParts } from "@/lib/training/ride-parts";
import { unplannedRides } from "@/lib/training/unplanned-rides";

// Eigenaar, 3 november 2026: de duurtraining in drie Zwift-ritten gereden (een
// ZWB-workout van 49 minuten, een video-rit van 32 en een group ride van 24). De
// training telde alleen de eerste; de andere twee stonden als ongepland. Met
// 0306 zet het lid die twee bij de eerste rit, en telt het schema ze als één.

const FTP = 250;

function ride(id: number, start: string, minutes: number, np: number | null, extra: Record<string, unknown> = {}): StravaRideRow {
  const seconds = minutes * 60;
  return {
    id,
    name: `Rit ${id}`,
    start_date: start,
    moving_time_seconds: seconds,
    distance_m: minutes * 500,
    raw: {
      moving_time: seconds,
      distance: minutes * 500,
      device_watts: np != null,
      weighted_average_watts: np,
      average_watts: np == null ? null : np - 10,
      average_heartrate: 140,
      max_heartrate: 170,
      kilojoules: minutes * 10,
      ...extra,
    },
  };
}

const workout = ride(1, "2026-11-03T15:29:43Z", 49, 200);
const video = ride(2, "2026-11-03T16:22:21Z", 32, 150);
const group = ride(3, "2026-11-03T17:00:25Z", 24, 250);

describe("combineRideParts", () => {
  it("telt rijtijd, afstand en TSS van de stukken op, onder het id van de hoofdrit", () => {
    const whole = combineRideParts(workout, [group, video]);
    const metrics = rideMetricsFromStrava(whole.raw, whole.moving_time_seconds, FTP);
    const separate = [workout, video, group]
      .map((part) => rideMetricsFromStrava(part.raw, part.moving_time_seconds, FTP).tss ?? 0)
      .reduce((sum, value) => sum + value, 0);

    expect(whole.id).toBe(1);
    expect(whole.name).toBe("Rit 1");
    expect(metrics.movingMinutes).toBe(105);
    expect(whole.distance_m).toBe(105 * 500);
    expect(metrics.kilojoules).toBe(1050);
    expect(metrics.maxHr).toBe(170);
    // De TSS van het geheel is de som van de stukken, op afronding na.
    expect(Math.abs((metrics.tss ?? 0) - separate)).toBeLessThanOrEqual(1);
    expect(whole.parts?.map((part) => part.id)).toEqual([2, 3]);
  });

  it("begint bij het eerste stuk, ook als de hoofdrit later was", () => {
    const whole = combineRideParts(group, [workout]);
    expect(whole.id).toBe(3);
    expect(whole.start_date).toBe(workout.start_date);
  });

  it("rekent met hartslag zodra één stuk geen vermogensmeter had", () => {
    const outside = ride(4, "2026-11-03T18:00:00Z", 30, null);
    const whole = combineRideParts(workout, [outside]);
    const metrics = rideMetricsFromStrava(whole.raw, whole.moving_time_seconds, FTP);
    expect(metrics.hasPowerMeter).toBe(false);
    expect(metrics.normalizedWatts).toBeNull();
    expect(metrics.averageWatts).toBeNull();
  });
});

describe("mergeRideParts", () => {
  const links = new Map([
    ["2", "1"],
    ["3", "1"],
  ]);

  it("laat de stukken opgaan in hun hoofdrit", () => {
    const merged = mergeRideParts([group, video, workout], links);
    expect(merged.map((row) => row.id)).toEqual([1]);
    expect(merged[0].moving_time_seconds).toBe(105 * 60);
  });

  it("laat een stuk los staan als de hoofdrit niet in de lijst zit", () => {
    const merged = mergeRideParts([group, video], links);
    expect(merged.map((row) => row.id)).toEqual([3, 2]);
  });

  it("gaat maar één niveau diep", () => {
    const merged = mergeRideParts([workout, video, group], new Map([["2", "1"], ["1", "3"]]));
    // 1 is zelf een stuk van 3, dus 2 hangt niet aan 1; 1 gaat op in 3.
    expect(merged.map((row) => row.id).sort()).toEqual([2, 3]);
  });

  it("geeft de training het geheel, en houdt geen ongeplande stukken over", () => {
    const merged = mergeRideParts([workout, video, group], links);
    const pairs = pairWorkoutsWithRides(
      [{ id: "duur", scheduled_at: "2026-11-03T08:00:00Z", duration_minutes: 90 }],
      merged,
      new Map([["duur", "1"]]),
    );
    expect(pairs.get("duur")?.moving_time_seconds).toBe(105 * 60);
    expect(
      unplannedRides(merged, [], FTP, [{ workoutId: "duur", activityId: "1" }]),
    ).toEqual([]);
  });
});

describe("canJoinRide", () => {
  it("alleen een andere rit van dezelfde dag", () => {
    expect(canJoinRide(video, workout)).toBe(true);
    expect(canJoinRide(workout, workout)).toBe(false);
    expect(canJoinRide(ride(5, "2026-11-04T08:00:00Z", 30, 200), workout)).toBe(false);
  });
});

type Row = Record<string, unknown>;

/** Supabase-stub met net genoeg querytaal; zie reassign-ride.test.ts. */
function fakeAdmin(tables: Record<string, Row[]>) {
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;
    const run = () => {
      const matched = (tables[table] ?? []).filter((row) => filters.every((f) => f(row)));
      if (patch) for (const row of matched) Object.assign(row, patch);
      return matched.map((row) => ({ ...row }));
    };
    const builder = {
      select: () => builder,
      update: (values: Row) => {
        patch = values;
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push((row) => String(row[column] ?? "") === String(value));
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        const wanted = new Set(values.map(String));
        filters.push((row) => wanted.has(String(row[column] ?? "")));
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => (row[column] ?? null) === value);
        return builder;
      },
      not: (column: string) => {
        filters.push((row) => (row[column] ?? null) !== null);
        return builder;
      },
      maybeSingle: async () => ({ data: run()[0] ?? null }),
      then: (resolve: (value: { data: Row[]; error: null }) => unknown) =>
        Promise.resolve({ data: run(), error: null }).then(resolve),
    };
    return builder;
  }
  return { from } as never;
}

function world() {
  return {
    training_workouts: [
      {
        id: "duur",
        profile_id: "lid",
        trainer_id: null,
        scheduled_at: "2026-11-03T08:00:00Z",
        title: "Rustige duur 90 min",
        duration_minutes: 90,
        intensity: "endurance",
        target_type: "power",
        structure_json: [
          { label: "Duur", durationMinutes: 90, target: "65%", notes: "", intensity: "endurance" },
        ],
        intervals_event_id: null,
        status: "completed",
      },
      {
        id: "morgen",
        profile_id: "lid",
        scheduled_at: "2026-11-03T08:00:00Z",
        title: "Andere training",
        status: "completed",
      },
    ] as Row[],
    training_workout_reports: [
      {
        workout_id: "duur",
        profile_id: "lid",
        paired_activity_id: "1",
        athlete_rpe: 4,
        athlete_confirmed_at: "2026-11-03T18:00:00Z",
        metrics_json: { plannedTitle: "Rustige duur 90 min", movingMinutes: 49, ctlBefore: 60, ctlAfter: 61 },
      },
    ] as Row[],
    strava_activities: [workout, video, group].map((row) => ({
      ...row,
      profile_id: "lid",
      part_of_activity_id: null,
      training_excluded_at: null,
    })) as Row[],
    profiles: [{ id: "lid", ftp_watts: FTP }] as Row[],
  };
}

describe("joinRide en splitRide", () => {
  it("zet de ritten bij de hoofdrit en rekent de training opnieuw uit", async () => {
    const tables = world();
    const admin = fakeAdmin(tables);
    expect(await joinRide(admin, { profileId: "lid", activityId: "2", parentId: "1" })).toEqual({ ok: true });
    expect(await joinRide(admin, { profileId: "lid", activityId: "3", parentId: "1" })).toEqual({ ok: true });

    expect(tables.strava_activities.map((row) => row.part_of_activity_id)).toEqual([null, 1, 1]);
    const report = tables.training_workout_reports[0];
    const metrics = report.metrics_json as { movingMinutes: number; ctlBefore: number; tss: number };
    expect(metrics.movingMinutes).toBe(105);
    // CTL hoort bij de dag van de rit, en wat het lid invulde blijft staan.
    expect(metrics.ctlBefore).toBe(60);
    expect(report.athlete_rpe).toBe(4);
    expect(report.athlete_confirmed_at).toBe("2026-11-03T18:00:00Z");

    expect(await splitRide(admin, { profileId: "lid", activityId: "2" })).toEqual({ ok: true });
    expect(tables.strava_activities[1].part_of_activity_id).toBeNull();
    expect((tables.training_workout_reports[0].metrics_json as { movingMinutes: number }).movingMinutes).toBe(73);
  });

  it("hangt een stuk altijd aan de hoofdrit, niet aan een ander stuk", async () => {
    const tables = world();
    const admin = fakeAdmin(tables);
    await joinRide(admin, { profileId: "lid", activityId: "2", parentId: "1" });
    await joinRide(admin, { profileId: "lid", activityId: "3", parentId: "2" });
    expect(tables.strava_activities[2].part_of_activity_id).toBe(1);
  });

  it("weigert een rit die zelf aan een training hangt", async () => {
    const tables = world();
    tables.training_workout_reports.push({ workout_id: "morgen", profile_id: "lid", paired_activity_id: "3" });
    const result = await joinRide(fakeAdmin(tables), { profileId: "lid", activityId: "3", parentId: "1" });
    expect(result.ok).toBe(false);
    expect(tables.strava_activities[2].part_of_activity_id).toBeNull();
  });

  it("weigert een rit van een andere dag", async () => {
    const tables = world();
    tables.strava_activities.push({
      ...ride(4, "2026-11-04T08:00:00Z", 30, 200),
      profile_id: "lid",
      part_of_activity_id: null,
    });
    const result = await joinRide(fakeAdmin(tables), { profileId: "lid", activityId: "4", parentId: "1" });
    expect(result).toEqual({ ok: false, error: "Alleen ritten van dezelfde dag horen samen." });
  });
});
