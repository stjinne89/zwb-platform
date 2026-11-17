import { describe, expect, it } from "vitest";
import {
  PositionTracker,
  SETTLE_SAMPLES,
  columnFor,
  parsePlan,
  powerStatus,
  targetFor,
} from "../../sauce-mod/zwb-zrl-live/pages/src/ttt-plan-core.mjs";

// Ingekorte Export JSON van zwiftgopher.com/TTT (versie 1.34.1), met verzonnen
// namen en ID's. Getallen staan er deels als tekst in, net als in het echt.
function rider(order: number, name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    alt_name: "",
    weight: "75",
    ftp: "280",
    pull_duration: 60,
    order,
    sIndex: 59 - order,
    color: "#ff6600",
    pull_power: 318.03,
    pull_power_wkg: 4.24,
    pull_ftp_percent: 113.99,
    wheel_power: { "2": 252.76, "3": 238.26, "4": 234.16 },
    IF: 94.21,
    ...extra,
  };
}

const EXPORT = JSON.stringify({
  source: "zwiftgopher-ttt",
  version: "1.34.1",
  riders: {
    "1003": rider(2, "Cees [ZWB]"),
    "1001": rider(0, "Anna "),
    "1002": rider(1, "Bram", { alt_name: "Brammetje", pull_duration: "30", color: "red" }),
  },
  team: { name: "ZWB B3" },
  plan: {
    route: "London Calling",
    distance_km: 31.7,
    elevation_m: 211.5,
    estimated_time: "43:53",
    estimated_avg_speed: 43.34,
  },
});

const near = (rows: Array<[number, number, number?]>, watching?: number) =>
  rows.map(([athleteId, gap, power]) => ({
    athleteId,
    gap,
    watching: athleteId === watching,
    state: { power: power ?? 250 },
  }));

describe("parsePlan", () => {
  it("leest de Export JSON in planvolgorde", () => {
    const plan = parsePlan(EXPORT);
    expect(plan.team).toBe("ZWB B3");
    expect(plan.route).toBe("London Calling");
    expect(plan.distanceKm).toBe(31.7);
    expect(plan.elevationM).toBe(212);
    expect(plan.estimatedTime).toBe("43:53");
    expect(plan.avgSpeedKmh).toBe(43.3);
    expect(plan.riders.map((r) => r.name)).toEqual(["Anna", "Brammetje", "Cees"]);
    expect(plan.riders[0]).toMatchObject({
      id: 1001,
      order: 1,
      color: "#ff6600",
      pullWatts: 318,
      pullWkg: 4.2,
      pullSeconds: 60,
      ftpPercent: 114,
      wheel: { 2: 253, 3: 238, 4: 234 },
      intensityFactor: 94,
    });
    expect(plan.riders[1].pullSeconds).toBe(30);
    expect(plan.riders[1].color).toBeNull();
  });

  it("weigert wat geen Export JSON is", () => {
    expect(() => parsePlan("Anna\t318\t60")).toThrow(/Export JSON/);
    expect(() => parsePlan("{kapot")).toThrow(/geldige JSON/);
    expect(() => parsePlan('{"riders": []}')).toThrow(/Export JSON/);
    expect(() => parsePlan('{"riders": {}}')).toThrow(/Geen renners/);
    expect(() => parsePlan('{"riders": {"x": {"name": "A"}}}')).toThrow(/Zwift-ID/);
  });

  it("laat de wielkolommen leeg bij een oude export zonder wheel_power", () => {
    const plan = parsePlan(JSON.stringify({ riders: { "1": { name: "A", pull_power: 300 } } }));
    expect(plan.riders[0].wheel).toEqual({ 2: null, 3: null, 4: null });
    expect(targetFor(plan.riders[0], 2)).toBeNull();
  });
});

describe("doel per plek", () => {
  const anna = parsePlan(EXPORT).riders[0];

  it("kop is de kopbeurt, daarachter het wiel; vanaf plek 4 telt plek 4", () => {
    expect(targetFor(anna, 1)).toBe(318);
    expect(targetFor(anna, 2)).toBe(253);
    expect(targetFor(anna, 3)).toBe(238);
    expect(targetFor(anna, 4)).toBe(234);
    expect(targetFor(anna, 5)).toBe(234);
    expect(targetFor(anna, null)).toBeNull();
    expect(columnFor(6)).toBe(4);
  });

  it("vermogen binnen 5% is goed", () => {
    expect(powerStatus(250, 253)).toBe("ok");
    expect(powerStatus(230, 253)).toBe("low");
    expect(powerStatus(280, 253)).toBe("high");
    expect(powerStatus(null, 253)).toBeNull();
  });
});

describe("PositionTracker", () => {
  it("zet renners op volgorde van gat en negeert wie niet in het plan staat", () => {
    const tracker = new PositionTracker([1001, 1002, 1003]);
    const live = tracker.update(near([[1002, 0], [9999, -5], [1001, -0.4], [1003, 0.5]], 1002));
    expect(live.watchingId).toBe(1002);
    expect(live.riders.get(1001)?.position).toBe(1);
    expect(live.riders.get(1002)?.position).toBe(2);
    expect(live.riders.get(1003)?.position).toBe(3);
    expect(live.riders.has(9999)).toBe(false);
  });

  it("een nieuwe plek telt pas na een paar metingen", () => {
    const tracker = new PositionTracker([1001, 1002]);
    tracker.update(near([[1001, -0.3], [1002, 0]]));
    // Eén meting naast elkaar: nog niets veranderd.
    let live = tracker.update(near([[1002, -0.1], [1001, 0]]));
    expect(live.riders.get(1001)?.position).toBe(1);
    for (let i = 1; i < SETTLE_SAMPLES; i++) live = tracker.update(near([[1002, -0.4], [1001, 0]]));
    expect(live.riders.get(1002)?.position).toBe(1);
    expect(live.riders.get(1001)?.position).toBe(2);
  });

  it("middelt het vermogen op de huidige plek en begint opnieuw na een wissel", () => {
    const tracker = new PositionTracker([1001, 1002]);
    tracker.update(near([[1001, -0.3, 300], [1002, 0, 240]]));
    let live = tracker.update(near([[1001, -0.3, 320], [1002, 0, 260]]));
    expect(live.riders.get(1001)?.power).toBe(310);
    for (let i = 0; i < SETTLE_SAMPLES; i++) live = tracker.update(near([[1002, -0.4, 330], [1001, 0, 200]]));
    expect(live.riders.get(1001)?.position).toBe(2);
    expect(live.riders.get(1001)?.power).toBe(200);
  });

  it("wie uit beeld is, heeft geen plek", () => {
    const tracker = new PositionTracker([1001, 1002]);
    tracker.update(near([[1001, -0.3], [1002, 0]]));
    const live = tracker.update(near([[1002, 0]]));
    expect(live.riders.has(1001)).toBe(false);
    expect(live.riders.get(1002)?.position).toBe(2);
  });
});
