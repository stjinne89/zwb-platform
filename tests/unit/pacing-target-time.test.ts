import { describe, expect, it } from "vitest";
import { buildBaselinePlan } from "@/lib/pacing/baseline";
import { evaluatePlan } from "@/lib/pacing/plan";
import type { CpModel } from "@/lib/pacing/cp";
import type { DurabilityModel } from "@/lib/pacing/durability";
import {
  normalizeNeutralZones,
  pacingRouteFromZwift,
  type PacingRoute,
} from "@/lib/pacing/route-profile";
import {
  fitPlanToTime,
  parseTargetTime,
  TARGET_TOLERANCE_S,
} from "@/lib/pacing/target-time";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";

const MODEL: CpModel = { cpWatts: 280, wPrimeJoules: 20_000, source: "intervals", weightKg: 70 };

/** 40 km: 30 km vlak, 5 km à 6 %, 5 km vlak. */
function profile(): RouteProfile {
  const distanceM: number[] = [];
  const altitudeM: number[] = [];
  for (let d = 0; d <= 40_000; d += 25) {
    distanceM.push(d);
    altitudeM.push(d <= 30_000 ? 0 : d <= 35_000 ? (d - 30_000) * 0.06 : 300);
  }
  return { distanceM, altitudeM };
}

function route(zones: Array<{ startKm: number; endKm: number }> = []): PacingRoute {
  const base = pacingRouteFromZwift({
    profile: profile(),
    accents: [{ slug: "klim", name: "Klim", kind: "climb", startKm: 30, endKm: 35, avgInclinePct: 6 }],
    leadInKm: 0,
    leadInElevationM: 0,
    lapKm: 40,
    laps: 1,
  });
  return { ...base, neutralZones: normalizeNeutralZones(zones, base.totalKm) };
}

describe("parseTargetTime", () => {
  it("leest u:mm, u.mm, 5u30 en losse minuten", () => {
    expect(parseTargetTime("1:05")).toBe(3900);
    expect(parseTargetTime("1.05")).toBe(3900);
    expect(parseTargetTime("5u30")).toBe(19_800);
    expect(parseTargetTime("75")).toBe(4500);
  });

  it("weigert onzin", () => {
    expect(parseTargetTime("")).toBeNull();
    expect(parseTargetTime("1:75")).toBeNull();
    expect(parseTargetTime("snel")).toBeNull();
    expect(parseTargetTime("0:00")).toBeNull();
  });
});

describe("fitPlanToTime", () => {
  const r = route();
  const baseline = buildBaselinePlan({ route: r, model: MODEL });
  const baseSeconds = baseline.evaluation.totalSeconds;

  it("haalt een iets snellere tijd binnen de marge en houdt de verhoudingen", () => {
    const target = baseSeconds - 120;
    const fitted = fitPlanToTime(baseline.plan, r, MODEL, target);
    expect(fitted.reachable).toBe(true);
    expect(Math.abs(fitted.evaluation.totalSeconds - target)).toBeLessThanOrEqual(TARGET_TOLERANCE_S);
    expect(fitted.evaluation.feasible).toBe(true);
    const climb = fitted.plan.find((piece) => piece.accentId === "klim")!;
    const flat = fitted.plan.find((piece) => !piece.accentId)!;
    expect(climb.targetWkg).toBeGreaterThan(flat.targetWkg);
  });

  it("haalt een langzamere tijd met lagere doelen", () => {
    const fitted = fitPlanToTime(baseline.plan, r, MODEL, baseSeconds + 300);
    expect(fitted.reachable).toBe(true);
    expect(fitted.evaluation.avgWatts).toBeLessThan(baseline.evaluation.avgWatts);
  });

  it("zegt eerlijk dat een te snelle tijd niet kan en geeft het snelste haalbare plan", () => {
    const fitted = fitPlanToTime(baseline.plan, r, MODEL, 20 * 60);
    expect(fitted.reachable).toBe(false);
    expect(fitted.fastestSeconds).toBeGreaterThan(20 * 60);
    expect(fitted.fastestSeconds).toBeLessThan(baseSeconds);
    expect(fitted.evaluation.feasible).toBe(true);
  });

  it("laat een neutralisatie ongemoeid", () => {
    const withZone = route([{ startKm: 0, endKm: 5 }]);
    const plan = buildBaselinePlan({ route: withZone, model: MODEL }).plan;
    const neutralBefore = plan.find((piece) => piece.kind === "neutral")!;
    const fitted = fitPlanToTime(plan, withZone, MODEL, evaluatePlan(plan, withZone, MODEL).totalSeconds - 60);
    expect(fitted.plan.find((piece) => piece.kind === "neutral")).toEqual(neutralBefore);
  });

  it("wordt langzamer als de drempel met het werk zakt", () => {
    const durability: DurabilityModel = {
      anchors: [
        { kj: 0, factor: 1 },
        { kj: 500, factor: 0.8 },
      ],
      maxFadePct: 20,
    };
    const fresh = fitPlanToTime(baseline.plan, r, MODEL, 20 * 60);
    const tired = fitPlanToTime(baseline.plan, r, MODEL, 20 * 60, { durability });
    expect(tired.fastestSeconds).toBeGreaterThan(fresh.fastestSeconds);
  });
});
