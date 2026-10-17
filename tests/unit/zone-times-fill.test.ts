import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeDb } from "./fake-db";

const mocks = vi.hoisted(() => ({
  streams: vi.fn(),
}));

vi.mock("@/lib/intervals/client", () => ({
  fetchIntervalsActivityStreams: mocks.streams,
}));

const { fillZoneTimes } = await import("@/lib/training/zone-times-fill");

const NOW = new Date("2026-10-02T12:00:00Z");
const PROFILE = "lid";

function report(zoneTimes?: unknown) {
  return {
    workout_id: "w1",
    profile_id: PROFILE,
    paired_activity_id: "101",
    updated_at: "2026-09-30T12:00:00Z",
    metrics_json: { hasPowerMeter: true, ...(zoneTimes ? { zoneTimes } : {}) },
  };
}

const ride = {
  id: 101,
  profile_id: PROFILE,
  start_date: "2026-09-27T10:40:04Z",
  moving_time_seconds: 8315,
  raw: { start_date_local: "2026-09-27T12:40:04Z" },
};

const stravaStub = {
  intervals_id: "20351566337",
  profile_id: PROFILE,
  start_date_local: "2026-09-27",
  moving_time_seconds: null,
  raw: { start_date_local: "2026-09-27T12:40:04", source: "STRAVA" },
};

const wahoo = {
  intervals_id: "i1",
  profile_id: PROFILE,
  start_date_local: "2026-09-27",
  moving_time_seconds: 8411,
  raw: { start_date_local: "2026-09-27T12:40:04", source: "WAHOO" },
};

/** 5 min inrijden, 3 × 2 min op 300 W met 2 min rust, 5 min uitrijden. */
const intervalsWorkout = {
  id: "w1",
  intensity: "vo2max",
  structure_json: [
    { label: "Inrijden", durationMinutes: 5, target: "60%", notes: "", intensity: "endurance" },
    { label: "Herhaling", durationMinutes: 2, target: "120%", notes: "", intensity: "vo2max" },
    { label: "Rust", durationMinutes: 2, target: "50%", notes: "", intensity: "recovery" },
    { label: "Herhaling", durationMinutes: 2, target: "120%", notes: "", intensity: "vo2max" },
    { label: "Rust", durationMinutes: 2, target: "50%", notes: "", intensity: "recovery" },
    { label: "Herhaling", durationMinutes: 2, target: "120%", notes: "", intensity: "vo2max" },
    { label: "Uitrijden", durationMinutes: 5, target: "55%", notes: "", intensity: "recovery" },
  ],
};

function db(reportRow: ReturnType<typeof report>, activities: unknown[]) {
  return fakeDb({
    training_workout_reports: [reportRow],
    strava_activities: [ride],
    profiles: [{ id: PROFILE, ftp_watts: 250 }],
    intervals_activities: activities as Record<string, unknown>[],
    training_workouts: [intervalsWorkout],
  });
}

/** Het geplande vermogen per seconde, met de herhalingen op 330, 300 en 280 W. */
function ridden() {
  const watts: number[] = [];
  const reps = [330, 300, 280];
  let rep = 0;
  for (const block of intervalsWorkout.structure_json) {
    const seconds = block.durationMinutes * 60;
    const w = block.label === "Herhaling" ? reps[rep++] : block.label === "Rust" ? 125 : 150;
    for (let i = 0; i < seconds; i++) watts.push(w);
  }
  return [
    { type: "watts", data: watts },
    { type: "time", data: watts.map((_, i) => i) },
  ];
}

function run(fake: ReturnType<typeof fakeDb>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fillZoneTimes(fake as any, PROFILE, { api_key: "k" }, NOW);
}

describe("fillZoneTimes", () => {
  beforeEach(() => {
    mocks.streams.mockReset();
    mocks.streams.mockResolvedValue([
      { type: "watts", data: [150, 150, 150] },
      { type: "time", data: [0, 1, 2] },
    ]);
  });

  it("zet na twee dagen zonder passende activiteit 'geen zonedata'", async () => {
    const fake = db(report(), [stravaStub]);
    expect(await run(fake)).toEqual({ filled: 0, none: 1 });
    expect(mocks.streams).not.toHaveBeenCalled();
    const stored = fake.tables.training_workout_reports[0].metrics_json as {
      zoneTimes: { source: string; intervalsId?: string };
    };
    expect(stored.zoneTimes.source).toBe("none");
    expect(stored.zoneTimes.intervalsId).toBeUndefined();
  });

  it("vult alsnog als de rit later rechtstreeks in intervals.icu komt", async () => {
    const fake = db(report({ source: "none", checkedAt: "2026-09-30T12:49:23Z" }), [
      stravaStub,
      wahoo,
    ]);
    expect(await run(fake)).toEqual({ filled: 1, none: 0 });
    expect(mocks.streams).toHaveBeenCalledWith("k", "i1", ["time", "watts", "heartrate"]);
    const stored = fake.tables.training_workout_reports[0].metrics_json as {
      zoneTimes: { source: string; intervalsId?: string };
    };
    expect(stored.zoneTimes).toMatchObject({ source: "intervals", intervalsId: "i1" });
  });

  it("laat 'geen zonedata' staan zolang er niets bij komt", async () => {
    const earlier = { source: "none", checkedAt: "2026-09-30T12:49:23Z" };
    const fake = db(report(earlier), [stravaStub]);
    expect(await run(fake)).toEqual({ filled: 0, none: 0 });
    expect(
      (fake.tables.training_workout_reports[0].metrics_json as { zoneTimes: unknown }).zoneTimes,
    ).toEqual(earlier);
  });

  it("vraagt een activiteit zonder vermogen niet nog eens op", async () => {
    mocks.streams.mockResolvedValue([{ type: "time", data: [0, 1, 2] }]);
    const fake = db(report(), [wahoo]);
    expect(await run(fake)).toEqual({ filled: 0, none: 1 });
    expect(mocks.streams).toHaveBeenCalledTimes(1);

    expect(await run(fake)).toEqual({ filled: 0, none: 0 });
    expect(mocks.streams).toHaveBeenCalledTimes(1);
  });

  it("bewaart de uitvoering per herhaling bij de zonetijden", async () => {
    mocks.streams.mockResolvedValue(ridden());
    const fake = db(report(), [wahoo]);
    expect(await run(fake)).toEqual({ filled: 1, none: 0 });
    const stored = fake.tables.training_workout_reports[0].metrics_json as {
      execution: { reps: Array<{ avgWatts: number; targetWatts: number }>; offset: number };
    };
    expect(stored.execution.offset).toBe(0);
    expect(stored.execution.reps.map((r) => r.avgWatts)).toEqual([330, 300, 280]);
    expect(stored.execution.reps[0].targetWatts).toBe(300);
  });

  it("vult de uitvoering aan bij een training die al zonetijden had", async () => {
    mocks.streams.mockResolvedValue(ridden());
    const zoneTimes = { source: "intervals", intervalsId: "i1", ftpWatts: 250, seconds: [0, 600, 0, 0, 0, 360] };
    const fake = db(report(zoneTimes), []);
    expect(await run(fake)).toEqual({ filled: 1, none: 0 });
    expect(mocks.streams).toHaveBeenCalledWith("k", "i1", ["time", "watts", "heartrate"]);
    const stored = fake.tables.training_workout_reports[0].metrics_json as { zoneTimes: unknown; execution: unknown };
    // De zonetijden blijven zoals ze waren.
    expect(stored.zoneTimes).toEqual(zoneTimes);
    expect(stored.execution).toBeTruthy();

    // Een tweede keer vraagt niets meer op.
    expect(await run(fake)).toEqual({ filled: 0, none: 0 });
    expect(mocks.streams).toHaveBeenCalledTimes(1);
  });
});
