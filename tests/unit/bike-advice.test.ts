import { describe, expect, it } from "vitest";
import { adviseBikes, steadySeconds } from "@/lib/pacing/bike-advice";
import type { CpModel } from "@/lib/pacing/cp";
import { evaluatePlan, type PlanSegment } from "@/lib/pacing/plan";
import type { PacingRoute, PacingSegment } from "@/lib/pacing/route-profile";
import {
  constraintsFromZwiftEvent,
  defaultSetup,
  resolveRidePhysics,
  type BikeKind,
  type BikePart,
  type EventConstraints,
  type RidePhysics,
} from "@/lib/pacing/zwift-setup";

const MODEL: CpModel = { cpWatts: 280, wPrimeJoules: 20_000, source: "intervals", weightKg: 70 };
const RACE = constraintsFromZwiftEvent({ eventType: "RACE", rules: [], tags: [] });
const NO_TT = constraintsFromZwiftEvent({ eventType: "RACE", rules: ["NO_TT_BIKES"], tags: [] });
const TT = constraintsFromZwiftEvent({ eventType: "TIME_TRIAL", rules: ["NO_DRAFTING"], tags: [] });

const frame = (name: string, kind: BikeKind, cdaDelta: number, kgDelta: number, stage = 0): BikePart => ({
  part: "frame",
  name,
  kind,
  testFrame: null,
  stage,
  cdaDelta,
  kgDelta,
});
const wheel = (name: string, testFrame: string, cdaDelta: number, kgDelta: number): BikePart => ({
  part: "wheel",
  name,
  kind: testFrame === "Zwift TT" ? "tt" : "road",
  testFrame,
  stage: 0,
  cdaDelta,
  kgDelta,
});

const PARTS: BikePart[] = [
  frame("Zwift Carbon", "road", 0, 0),
  frame("Aerofiets", "road", -0.03, 1.2),
  frame("Aerofiets", "road", -0.04, 1.0, 5),
  frame("Klimfiets", "road", 0.004, -2.2),
  frame("Zwift TT", "tt", -0.045, 1.5),
  wheel("Diep", "Zwift Carbon", -0.012, 0.4),
  wheel("Licht", "Zwift Carbon", 0.001, -0.45),
  wheel("Schijf", "Zwift TT", -0.015, 0.6),
];

function route(gradient: number, km: number): PacingRoute {
  const segments: PacingSegment[] = Array.from({ length: km * 10 }, () => ({
    distanceM: 100,
    gradient,
    accentIndex: null,
  }));
  return { source: "zwift", totalKm: km, hasElevation: true, segments, accents: [], leadInApproximated: false };
}

const plan = (km: number, wkg = 3.5): PlanSegment[] => [
  { startKm: 0, endKm: km, targetWkg: wkg, label: "Alles", effort: "tempo" },
];

function advise(input: { route: PacingRoute; constraints?: EventConstraints; parts?: BikePart[]; stage?: number }) {
  const constraints = input.constraints ?? RACE;
  return adviseBikes({
    parts: input.parts ?? PARTS,
    constraints,
    setup: { ...defaultSetup(constraints), stage: input.stage ?? 0 },
    weightKg: MODEL.weightKg,
    heightCm: 180,
    seconds: (physics: RidePhysics) =>
      evaluatePlan(plan(input.route.totalKm), input.route, MODEL, { ride: physics }).totalSeconds,
  });
}

describe("adviseBikes", () => {
  it("kiest op een vlakke tijdrit de tijdritfiets met de dichte wielen", () => {
    const advice = advise({ route: route(0, 20), constraints: TT })!;
    expect(advice.best[0]).toMatchObject({ frame: "Zwift TT", wheels: "Schijf" });
    expect(advice.best[1]).toMatchObject({ frame: "Aerofiets", wheels: "Diep" });
  });

  it("kiest op een lange klim de lichte fiets met lichte wielen", () => {
    const advice = advise({ route: route(0.08, 10), constraints: NO_TT })!;
    expect(advice.best[0]).toMatchObject({ frame: "Klimfiets", wheels: "Licht" });
  });

  it("laat een verboden tijdritfiets weg", () => {
    const advice = advise({ route: route(0, 20), constraints: NO_TT })!;
    expect(advice.best.map((row) => row.frame)).not.toContain("Zwift TT");
    expect(advice.best[0].frame).toBe("Aerofiets");
  });

  it("vergelijkt op het gekozen upgradeniveau, of het hoogste daaronder", () => {
    const flat = route(0, 20);
    const stage0 = advise({ route: flat, constraints: NO_TT, stage: 0 })!;
    const stage5 = advise({ route: flat, constraints: NO_TT, stage: 5 })!;
    expect(stage5.stage).toBe(5);
    expect(stage5.best[0].seconds).toBeLessThan(stage0.best[0].seconds);
    // De klimfiets heeft geen stage 5 en rijdt dan op stage 0.
    const climb0 = stage0.best.find((row) => row.frame === "Klimfiets")!;
    const climb5 = stage5.best.find((row) => row.frame === "Klimfiets")!;
    expect(climb5.seconds).toBeCloseTo(climb0.seconds, 6);
  });

  it("rekent zonder upgrades als het event die uitzet", () => {
    const off: EventConstraints = { ...NO_TT, upgradesDisabled: true };
    expect(advise({ route: route(0, 20), constraints: off, stage: 5 })!.stage).toBe(0);
  });

  it("geeft geen advies als het event het frame oplegt of de lijst leeg is", () => {
    expect(advise({ route: route(0, 5), constraints: { ...RACE, forcedFrame: "Zwift Carbon" } })).toBeNull();
    expect(advise({ route: route(0, 5), parts: [] })).toBeNull();
  });

  it("zet geen wielen op een halo-fiets: die zitten al in de meting", () => {
    const halo: BikePart = { ...frame("Halo", "road", -0.035, 0.3), fixedWheels: true };
    const advice = advise({ route: route(0, 20), constraints: NO_TT, parts: [...PARTS, halo] })!;
    const row = advice.best.find((item) => item.frame === "Halo")!;
    expect(row).toMatchObject({ wheels: null, fixedWheels: true });
    const physics = (wheels: string | null) =>
      resolveRidePhysics({
        setup: { ...defaultSetup(NO_TT), frame: "Halo", wheels },
        constraints: NO_TT,
        parts: [...PARTS, halo],
        weightKg: 70,
        heightCm: 180,
      });
    expect(physics("Diep").cda).toBeCloseTo(physics(null).cda, 6);
  });

  it("zonder wielkeuze bij opgelegde wielen", () => {
    const advice = advise({ route: route(0, 20), constraints: { ...NO_TT, forcedWheels: true } })!;
    expect(advice.best.every((row) => row.wheels === null)).toBe(true);
  });

  it("de huidige opzet is de referentiefiets zonder keuze", () => {
    const advice = advise({ route: route(0, 20), constraints: NO_TT })!;
    expect(advice.current).toMatchObject({ frame: "Zwift Carbon", wheels: null });
    expect(advice.current.seconds).toBeGreaterThan(advice.best[0].seconds);
  });

  it("is snel genoeg met een lijst zo groot als de echte", () => {
    const parts: BikePart[] = [];
    for (let i = 0; i < 146; i++) {
      const kind: BikeKind = i < 100 ? "road" : i < 125 ? "tt" : "gravel";
      for (let stage = 0; stage <= 5; stage++) parts.push(frame(`F${i}`, kind, -0.0004 * i, 0.01 * (i % 30) - 0.1 * stage, stage));
    }
    parts.push(frame("Zwift Carbon", "road", 0, 0), frame("Zwift TT", "tt", -0.045, 1.5), frame("Zwift Gravel", "gravel", -0.01, 0.5));
    for (let i = 0; i < 74; i++) parts.push(wheel(`R${i}`, "Zwift Carbon", -0.0002 * i, 0.01 * i - 0.3));
    for (let i = 0; i < 65; i++) parts.push(wheel(`T${i}`, "Zwift TT", -0.0002 * i, 0.01 * i));
    const start = performance.now();
    const advice = advise({ route: route(0.01, 45), parts, stage: 3 });
    const elapsed = performance.now() - start;
    expect(advice?.best).toHaveLength(3);
    expect(elapsed).toBeLessThan(3000);
  });
});

describe("steadySeconds", () => {
  it("rijdt in de groep sneller dan alleen", () => {
    const flat = route(0, 20);
    const base = { cda: 0.3, kind: "road" as const, rolling: "road" as const, bikeKg: 2.4, pullShare: null, powerups: [] };
    const bunch: RidePhysics = { ...base, format: "race", draftFactor: 0.7 };
    const alone: RidePhysics = { ...base, format: "tt", draftFactor: 0.7 };
    expect(steadySeconds(flat, bunch, 250, 75)).toBeLessThan(steadySeconds(flat, alone, 250, 75));
  });
});
