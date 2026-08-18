import { describe, expect, it } from "vitest";
import {
  unplannedRides,
  type PlannedWorkoutForRides,
} from "@/lib/training/unplanned-rides";
import type { StravaRideRow } from "@/lib/training/ride-metrics";

const FTP = 250;

/** 60 min op 250w NP = precies FTP een uur lang = 100 TSS. */
function ride(
  overrides: Partial<StravaRideRow> & { id: number } & { np?: number | null },
): StravaRideRow {
  const { np = 250, ...rest } = overrides;
  return {
    name: "Rit",
    start_date: "2026-07-20T09:00:00Z",
    moving_time_seconds: 3600,
    distance_m: 40000,
    raw: {
      moving_time: rest.moving_time_seconds ?? 3600,
      device_watts: np != null,
      weighted_average_watts: np,
      average_watts: np,
      average_heartrate: 148,
    },
    ...rest,
  };
}

function workout(
  overrides: Partial<PlannedWorkoutForRides> & { id: string },
): PlannedWorkoutForRides {
  return {
    scheduled_at: "2026-07-20T08:00:00Z",
    title: "Duurrit",
    duration_minutes: 60,
    intensity: "endurance",
    structure_json: null,
    ...overrides,
  };
}

describe("unplannedRides", () => {
  it("laat een rit die bij een geplande training hoort weg", () => {
    const result = unplannedRides([ride({ id: 1 })], [workout({ id: "w1" })], FTP);
    expect(result).toEqual([]);
  });

  it("houdt de tweede helft over van een rit die in tweeën is geknipt", () => {
    const rides = [
      ride({ id: 1, moving_time_seconds: 3300, name: "Ochtendrit" }),
      ride({ id: 2, moving_time_seconds: 900, start_date: "2026-07-20T10:15:00Z", name: "Ochtendrit deel 2" }),
    ];
    const result = unplannedRides(rides, [workout({ id: "w1" })], FTP);
    // De workout claimt de helft die het dichtst bij de geplande 60 min ligt.
    expect(result.map((row) => row.id)).toEqual([2]);
    expect(result[0].name).toBe("Ochtendrit deel 2");
    expect(result[0].metrics.movingMinutes).toBe(15);
  });

  it("toont een extra rit op een dag waarop al één training gepland stond", () => {
    const rides = [
      ride({ id: 1 }),
      ride({ id: 2, moving_time_seconds: 1800, start_date: "2026-07-20T18:00:00Z", name: "Herstelrondje" }),
    ];
    const result = unplannedRides(rides, [workout({ id: "w1" })], FTP);
    expect(result.map((row) => row.name)).toEqual(["Herstelrondje"]);
  });

  it("laat een rustdag geen rit opeisen", () => {
    const result = unplannedRides(
      [ride({ id: 1 })],
      [workout({ id: "w1", intensity: "rest" })],
      FTP,
    );
    expect(result.map((row) => row.id)).toEqual([1]);
  });

  it("laat een als rustdag afgeschreven training geen rit opeisen", () => {
    const result = unplannedRides(
      [ride({ id: 1 })],
      [workout({ id: "w1", status: "skipped" })],
      FTP,
    );
    expect(result.map((row) => row.id)).toEqual([1]);
  });

  it("respecteert een vastgelegde koppeling, ook zonder de workout erbij", () => {
    const result = unplannedRides([ride({ id: 1 })], [], FTP, [
      { workoutId: "w-elders", activityId: "1" },
    ]);
    expect(result).toEqual([]);
  });

  it("laat een workout die al aan een rit hangt geen tweede rit claimen", () => {
    // De regressie uit de praktijk: twee Zwift-ritten op een avond met een
    // geplande training ertegenover. De training hing al aan de race; zonder
    // deze regel eiste ze ook de pacer-rit op en bleef er niets over.
    const rides = [
      ride({ id: 19798282373, moving_time_seconds: 1200, name: "Pacer Group Ride with Coco" }),
      ride({
        id: 19798921295,
        moving_time_seconds: 2460,
        start_date: "2026-07-20T18:34:00Z",
        name: "Race: UK Armed Forces",
      }),
    ];
    const result = unplannedRides(
      rides,
      [workout({ id: "w1", duration_minutes: 120, status: "completed" })],
      FTP,
      [{ workoutId: "w1", activityId: "19798921295" }],
    );
    expect(result.map((row) => row.name)).toEqual(["Pacer Group Ride with Coco"]);
  });

  it("laat een workout zonder koppeling wel gewoon een rit claimen", () => {
    const rides = [ride({ id: 1 }), ride({ id: 2, moving_time_seconds: 900, name: "Extra" })];
    const result = unplannedRides(rides, [workout({ id: "w1" })], FTP, [
      { workoutId: "w-andere-dag", activityId: "999" },
    ]);
    expect(result.map((row) => row.name)).toEqual(["Extra"]);
  });

  it("rekent de cijfers uit en sorteert nieuwste eerst", () => {
    const rides = [
      ride({ id: 1, start_date: "2026-07-18T09:00:00Z" }),
      ride({ id: 2, start_date: "2026-07-21T09:00:00Z" }),
    ];
    const result = unplannedRides(rides, [], FTP);
    expect(result.map((row) => row.dateKey)).toEqual(["2026-07-21", "2026-07-18"]);
    expect(result[0].metrics.tss).toBe(100);
    expect(result[0].distanceKm).toBe(40);
  });

  it("laat TSS leeg zonder vermogensmeter, maar toont de rit wel", () => {
    const result = unplannedRides([ride({ id: 1, np: null })], [], FTP);
    expect(result).toHaveLength(1);
    expect(result[0].metrics.tss).toBeNull();
    expect(result[0].metrics.hasPowerMeter).toBe(false);
  });
});
