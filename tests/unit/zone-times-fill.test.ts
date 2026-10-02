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

function db(reportRow: ReturnType<typeof report>, activities: unknown[]) {
  return fakeDb({
    training_workout_reports: [reportRow],
    strava_activities: [ride],
    profiles: [{ id: PROFILE, ftp_watts: 250 }],
    intervals_activities: activities as Record<string, unknown>[],
  });
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
    expect(mocks.streams).toHaveBeenCalledWith("k", "i1");
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
});
