import { describe, expect, it } from "vitest";
import { adoptGeneratedPlan } from "@/lib/pacing/adopt";
import { buildBaselinePlan } from "@/lib/pacing/baseline";
import { defaultPacingPrompt } from "@/lib/pacing/prompt";
import { targetSecondsFromPromptSummary } from "@/lib/pacing/store";
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

describe("doeltijd en AI", () => {
  it("leest de doeltijd terug uit de opgeslagen AI-invoer", () => {
    expect(targetSecondsFromPromptSummary(JSON.stringify({ targetTime: { seconds: 19_800 } }))).toBe(19_800);
    expect(targetSecondsFromPromptSummary(JSON.stringify({ targetTime: null }))).toBeNull();
    expect(targetSecondsFromPromptSummary("geen json")).toBeNull();
    expect(targetSecondsFromPromptSummary(null)).toBeNull();
  });

  it("verbiedt de AI niet langer over een doeltijd te praten, maar laat het rekenen bij het platform", () => {
    const prompt = defaultPacingPrompt();
    expect(prompt).not.toContain("Noem geen verwachte finishtijd");
    expect(prompt).toContain("targetTime");
    expect(prompt).toContain("fastestSeconds");
    expect(prompt).toContain("Je rekent geen tijden of snelheden uit");
  });

  it("zet een AI-verdeling op tijd met behoud van de verhouding tussen klim en vlak", () => {
    const r = route();
    const adopted = adoptGeneratedPlan(
      {
        strategy: "",
        risks: [],
        segments: [
          { startKm: 0, endKm: 30, targetWkg: 2.5, label: "Vlak", effort: "duur", rationale: "", accentId: "" },
          { startKm: 30, endKm: 35, targetWkg: 3.6, label: "Klim", effort: "drempel", rationale: "", accentId: "klim" },
          { startKm: 35, endKm: 40, targetWkg: 2.5, label: "Finish", effort: "duur", rationale: "", accentId: "" },
        ],
      },
      r,
      MODEL,
    );
    const target = adopted.evaluation.totalSeconds - 180;
    const fitted = fitPlanToTime(adopted.plan, r, MODEL, target);
    expect(Math.abs(fitted.evaluation.totalSeconds - target)).toBeLessThanOrEqual(TARGET_TOLERANCE_S);
    const ratio = (plan: typeof adopted.plan) => plan[1].targetWkg / plan[0].targetWkg;
    expect(ratio(fitted.plan)).toBeCloseTo(ratio(adopted.plan), 1);
  });
});

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
