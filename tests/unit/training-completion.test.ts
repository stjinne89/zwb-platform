import { describe, expect, it } from "vitest";
import {
  buildMetricsSnapshot,
  ctlAround,
  pairWorkoutsWithRides,
  targetSummaryFor,
  type PlannedWorkoutRow,
  type WorkoutForPairing,
} from "@/lib/training/completion";
import type { StravaRideRow } from "@/lib/training/ride-metrics";
import type { IntervalsWellness } from "@/lib/intervals/client";

const workout: PlannedWorkoutRow = {
  id: "w1",
  profile_id: "p1",
  trainer_id: "t1",
  scheduled_at: "2026-07-20T09:00:00+02:00",
  title: "Drempel 2x20",
  duration_minutes: 75,
  intensity: "threshold",
  target_type: "power",
  structure_json: [
    { label: "Warming-up", durationMinutes: 15, target: "50-65%", notes: "", intensity: "endurance" },
    { label: "Drempel 1/2", durationMinutes: 20, target: "95-100%", notes: "", intensity: "threshold" },
    { label: "Herstel", durationMinutes: 10, target: "50-58%", notes: "", intensity: "recovery" },
    { label: "Drempel 2/2", durationMinutes: 20, target: "95-100%", notes: "", intensity: "threshold" },
    { label: "Cooling-down", durationMinutes: 10, target: "45-55%", notes: "", intensity: "recovery" },
  ],
  intervals_event_id: "e1",
};

const ride: StravaRideRow = {
  id: 19505093978,
  name: "Ochtendrit",
  start_date: "2026-07-20T07:00:00Z",
  moving_time_seconds: 4500,
  raw: {
    moving_time: 4500,
    device_watts: true,
    weighted_average_watts: 232,
    average_watts: 208,
    max_watts: 620,
    average_heartrate: 148,
    max_heartrate: 176,
    average_cadence: 88,
    kilojoules: 936,
  },
};

const noCtl = { before: null, after: null };
const noReadiness = { score: null, level: null, title: null };

describe("targetSummaryFor", () => {
  it("beschrijft het zwaarste blok, met wattage als de FTP bekend is", () => {
    expect(targetSummaryFor(workout, 250)).toBe("Drempel · 95-100% · 228-263w");
  });

  it("laat het wattage weg zonder FTP", () => {
    expect(targetSummaryFor(workout, null)).toBe("Drempel · 95-100%");
  });

  it("valt terug op de intensiteit van de workout als er geen zwaar blok is", () => {
    expect(
      targetSummaryFor({ ...workout, intensity: "endurance", structure_json: [] }, 250),
    ).toBe("Duur");
  });
});

describe("ctlAround", () => {
  const wellness = [
    { id: "2026-07-18", ctl: 50 },
    { id: "2026-07-19", ctl: 51.5 },
    { id: "2026-07-20", ctl: 53 },
  ] as IntervalsWellness[];

  it("pakt de dag ervoor en de dag zelf", () => {
    expect(ctlAround(wellness, "2026-07-20")).toEqual({ before: 51.5, after: 53 });
  });

  it("valt terug op de laatst bekende dag als een dag ontbreekt", () => {
    expect(ctlAround(wellness, "2026-07-25")).toEqual({ before: 53, after: 53 });
  });

  it("geeft null als er niets bekend is voor die datum", () => {
    expect(ctlAround(wellness, "2026-07-01")).toEqual({ before: null, after: null });
  });
});

describe("buildMetricsSnapshot", () => {
  it("neemt de cijfers van de rit over en beoordeelt de naleving", () => {
    const snapshot = buildMetricsSnapshot({
      workout,
      ride,
      ftpWatts: 250,
      ctl: { before: 51.5, after: 53 },
      readiness: { score: 26, level: 2, title: "RICHT OP HERSTEL" },
    });

    // 15*0.6 + 20*0.95 + 10*0.45 + 20*0.95 + 10*0.45 = 56
    expect(snapshot.plannedLoad).toBe(56);
    // IF = 232/250 = 0,928; TSS = 4500*232*0,928/(250*3600)*100 = 108
    expect(snapshot.intensityFactor).toBe(0.93);
    expect(snapshot.tss).toBe(108);
    expect(snapshot.normalizedWatts).toBe(232);
    expect(snapshot.averageWatts).toBe(208);
    expect(snapshot.averageHr).toBe(148);
    expect(snapshot.maxHr).toBe(176);
    expect(snapshot.averageCadence).toBe(88);
    expect(snapshot.movingMinutes).toBe(75);
    expect(snapshot.hasPowerMeter).toBe(true);
    expect(snapshot.ctlBefore).toBe(51.5);
    expect(snapshot.ctlAfter).toBe(53);
    expect(snapshot.readinessScore).toBe(26);
    expect(snapshot.readinessTitle).toBe("RICHT OP HERSTEL");
    expect(snapshot.loadPct).toBe(193);
    expect(snapshot.verdict).toBe("te_zwaar");
  });

  it("houdt ontbrekende metingen op null in plaats van 0", () => {
    const snapshot = buildMetricsSnapshot({
      workout,
      ride: {
        ...ride,
        raw: { moving_time: 4500, device_watts: true, weighted_average_watts: 232 },
      },
      ftpWatts: null,
      ctl: noCtl,
      readiness: noReadiness,
    });
    expect(snapshot.averageHr).toBeNull();
    expect(snapshot.averageCadence).toBeNull();
    // Zonder FTP is er geen TSS te berekenen.
    expect(snapshot.tss).toBeNull();
    expect(snapshot.loadPct).toBeNull();
    // Wel gereden, maar zonder belasting valt er niets af te wijken.
    expect(snapshot.verdict).toBe("volgens_plan");
  });

  it("laat TSS en IF leeg bij een rit zonder vermogensmeter", () => {
    const snapshot = buildMetricsSnapshot({
      workout,
      ride: {
        ...ride,
        raw: { moving_time: 4500, device_watts: false, average_watts: 64.9, average_heartrate: 80 },
      },
      ftpWatts: 250,
      ctl: noCtl,
      readiness: noReadiness,
    });
    expect(snapshot.hasPowerMeter).toBe(false);
    expect(snapshot.tss).toBeNull();
    expect(snapshot.intensityFactor).toBeNull();
    expect(snapshot.normalizedWatts).toBeNull();
    // Wat Strava wél meet blijft staan.
    expect(snapshot.averageWatts).toBe(64.9);
    expect(snapshot.averageHr).toBe(80);
    expect(snapshot.movingMinutes).toBe(75);
  });

  it("markeert een workout zonder rit als niet gereden", () => {
    const snapshot = buildMetricsSnapshot({
      workout,
      ride: null,
      ftpWatts: 250,
      ctl: noCtl,
      readiness: noReadiness,
    });
    expect(snapshot.verdict).toBe("niet_gereden");
    expect(snapshot.movingMinutes).toBeNull();
    expect(snapshot.plannedMinutes).toBe(75);
  });
});

describe("pairWorkoutsWithRides", () => {
  const ochtend: StravaRideRow = {
    id: 101,
    name: "Ochtendrit",
    start_date: "2026-07-20T07:00:00Z",
    moving_time_seconds: 4500,
    raw: { moving_time: 4500, device_watts: true, weighted_average_watts: 232 },
  };
  const avond: StravaRideRow = {
    id: 202,
    name: "Avondrondje",
    start_date: "2026-07-20T17:00:00Z",
    moving_time_seconds: 3600,
    raw: { moving_time: 3600, device_watts: true, weighted_average_watts: 190 },
  };

  const ochtendtraining: WorkoutForPairing = {
    id: "w1",
    scheduled_at: "2026-07-20T09:00:00+02:00",
    duration_minutes: 75,
  };
  const avondtraining: WorkoutForPairing = {
    id: "w2",
    scheduled_at: "2026-07-20T19:00:00+02:00",
    duration_minutes: 60,
  };

  it("geeft elke training van dezelfde dag zijn eigen rit", () => {
    const pairs = pairWorkoutsWithRides(
      [ochtendtraining, avondtraining],
      [ochtend, avond],
      new Map(),
    );
    expect(pairs.get("w1")?.id).toBe(101);
    expect(pairs.get("w2")?.id).toBe(202);
  });

  it("laat een training die al aan een rit hangt geen tweede rit claimen", () => {
    // w1 hangt vastgelegd aan de avondrit; zonder de vooraf gevulde used-set zou
    // w1 de ochtendrit opeisen en w2 met lege handen achterblijven.
    const pairs = pairWorkoutsWithRides(
      [ochtendtraining, avondtraining],
      [ochtend, avond],
      new Map([["w1", "202"]]),
    );
    expect(pairs.get("w1")?.id).toBe(202);
    expect(pairs.get("w2")?.id).toBe(101);
  });

  it("houdt de vastgelegde koppeling aan, ook als een andere rit beter past", () => {
    const pairs = pairWorkoutsWithRides([ochtendtraining], [ochtend, avond], new Map([["w1", "202"]]));
    expect(pairs.get("w1")?.id).toBe(202);
  });

  it("laat de training zonder rit als de vastgelegde rit niet meer in de bron staat", () => {
    const pairs = pairWorkoutsWithRides([ochtendtraining], [ochtend], new Map([["w1", "999"]]));
    expect(pairs.get("w1")).toBeNull();
  });

  it("laat een training niet leeglopen doordat een gekoppelde training haar rit inpikt", () => {
    // De ochtendtraining hangt vastgelegd aan een rit van de dag ervoor. Zonder
    // die koppeling te respecteren pikt zij de rit van 20 juli in, en blijft de
    // avondtraining als niet-gereden staan terwijl er wel gereden is.
    const vorigeAvond: StravaRideRow = {
      ...avond,
      id: 303,
      start_date: "2026-07-19T17:00:00Z",
    };
    const pairs = pairWorkoutsWithRides(
      [ochtendtraining, avondtraining],
      [vorigeAvond, ochtend],
      new Map([["w1", "303"]]),
    );
    expect(pairs.get("w1")?.id).toBe(303);
    expect(pairs.get("w2")?.id).toBe(101);
  });

  it("negeert een lege koppeling en matcht gewoon opnieuw", () => {
    const pairs = pairWorkoutsWithRides([ochtendtraining], [ochtend], new Map([["w1", ""]]));
    expect(pairs.get("w1")?.id).toBe(101);
  });
});
