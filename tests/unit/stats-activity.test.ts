import { describe, expect, it } from "vitest";
import {
  aggregateActivities,
  parseZoneTimes,
  recoverySeries,
  summarizeIntervalsActivity,
} from "@/lib/stats/activity-stats";
import { bucketKey } from "@/lib/stats/personal";

const direct = (overrides: Record<string, unknown> = {}) => ({
  id: "i1",
  type: "Ride",
  source: "GARMIN_CONNECT",
  start_date_local: "2026-10-03T08:15:00",
  moving_time: 7200,
  icu_zone_times: [
    { id: "Z1", secs: 1800 },
    { id: "Z2", secs: 3600 },
    { id: "Z3", secs: 900 },
    { id: "SS", secs: 600 },
    { id: "Z4", secs: 900 },
  ],
  icu_hr_zone_times: [600, 4200, 1800, 600, 0],
  icu_max_wbal_depletion: 14_350,
  icu_joules_above_ftp: 52_000,
  decoupling: 4.2,
  icu_efficiency_factor: 1.62,
  polarization_index: 1.8,
  ...overrides,
});

describe("parseZoneTimes", () => {
  it("leest objecten en laat sweetspot weg", () => {
    expect(parseZoneTimes(direct().icu_zone_times).map((zone) => zone.id)).toEqual(["Z1", "Z2", "Z3", "Z4"]);
  });

  it("nummert een kale lijst zelf", () => {
    expect(parseZoneTimes([10, 20])).toEqual([
      { id: "Z1", seconds: 10 },
      { id: "Z2", seconds: 20 },
    ]);
    expect(parseZoneTimes(null)).toEqual([]);
  });
});

describe("summarizeIntervalsActivity", () => {
  it("vat een gemeten rit samen, W′ en arbeid in kJ", () => {
    const summary = summarizeIntervalsActivity(direct())!;
    expect(summary.day).toBe("2026-10-03");
    expect(summary.wbalDepletionKj).toBe(14.4);
    expect(summary.joulesAboveFtpKj).toBe(52);
    expect(summary.hrZones).toEqual([600, 4200, 1800, 600, 0]);
  });

  it("slaat een Strava-stub en een andere sport over", () => {
    expect(summarizeIntervalsActivity({ id: "i2", type: "Ride", source: "STRAVA", start_date_local: "2026-10-03T08:00:00" })).toBeNull();
    expect(summarizeIntervalsActivity(direct({ type: "Run" }))).toBeNull();
  });
});

describe("aggregateActivities", () => {
  const keyOf = (day: string) => bucketKey(day, "maand");

  it("telt zones op per periode en houdt de diepste W′bal", () => {
    const summaries = [
      summarizeIntervalsActivity(direct())!,
      summarizeIntervalsActivity(direct({ start_date_local: "2026-10-10T08:00:00", icu_max_wbal_depletion: 20_000, decoupling: 8, moving_time: 3600 }))!,
      summarizeIntervalsActivity(direct({ start_date_local: "2025-01-10T08:00:00" }))!,
    ];
    const stats = aggregateActivities(summaries, ["2026-09", "2026-10"], keyOf);
    expect(stats.powerZoneIds).toEqual(["Z1", "Z2", "Z3", "Z4"]);
    expect(stats.rides).toBe(2);
    const october = stats.periods[1];
    expect(october.powerZoneHours).toEqual([1, 2, 0.5, 0.5]);
    expect(october.maxWbalDepletionKj).toBe(20);
    expect(october.joulesAboveFtpKj).toBe(104);
    // Decoupling alleen van de rit van minstens anderhalf uur.
    expect(october.decoupling).toBe(4.2);
    expect(stats.periods[0].rides).toBe(0);
    expect(stats.periods[0].decoupling).toBeNull();
  });
});

describe("recoverySeries", () => {
  it("middelt per periode en negeert onmogelijke waarden", () => {
    const points = recoverySeries(
      ["2026-10"],
      [
        { id: "2026-10-01", restingHR: 48, hrv: 60, sleepSecs: 7.5 * 3600 },
        { id: "2026-10-02", restingHR: 50, hrv: null, sleepSecs: 8.5 * 3600 },
        { id: "2026-10-03", restingHR: 0, hrv: 70, sleepSecs: 60 },
      ],
      (day) => bucketKey(day, "maand"),
    );
    expect(points[0]).toEqual({ key: "2026-10", restingHr: 49, hrv: 65, sleepHours: 8 });
  });
});
