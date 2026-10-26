import { describe, expect, it } from "vitest";
import type { CpModel } from "@/lib/pacing/cp";
import { withDescents, type PacingRoute } from "@/lib/pacing/route-profile";
import { CTL_ANCHORS, powerAnchors } from "@/lib/briljant/norms";
import { levelAt } from "@/lib/briljant/score";
import {
  EVENT_LOAD_PER_CTL,
  eventLoad,
  goalRequirements,
  normalizedWatts,
} from "@/lib/training/goal-requirements";
import { fastestPlan, forecastGoal, type ForecastRider } from "@/lib/training/goal-target-time";

const MODEL: CpModel = { cpWatts: 260, wPrimeJoules: 20_000, source: "intervals", weightKg: 75 };
const RIDER: ForecastRider = { model: MODEL, durability: null, curve: null };
const STEEN = { sex: "man" as const, wkg20: 3.56, ctl: 45 };

/** Een doorrekening met vaste segmenten: watt en duur per stuk. */
function evaluation(parts: Array<[watts: number, seconds: number]>) {
  return {
    watts: parts.map(([watts]) => watts),
    estimate: {
      totalSeconds: parts.reduce((sum, [, seconds]) => sum + seconds, 0),
      cumulativeSecondsAtSegmentEnd: [],
      segments: parts.map(([, seconds]) => ({ distanceM: 100, gradient: 0, speedMs: 10, durationS: seconds })),
    },
  };
}

function hillyRoute(): PacingRoute {
  const segments: PacingRoute["segments"] = [];
  const accents: PacingRoute["accents"] = [];
  const push = (km: number, gradient: number, accentIndex: number | null) => {
    for (let m = 0; m < km * 1000; m += 100) segments.push({ distanceM: 100, gradient, accentIndex });
  };
  let km = 0;
  for (let i = 0; i < 3; i++) {
    push(20, 0, null);
    km += 20;
    accents.push({ id: `klim-${i}`, name: `Klim ${i}`, kind: "climb", startKm: km, endKm: km + 8, avgGradient: 0.06, lap: null });
    push(8, 0.06, i);
    push(8, -0.06, null);
    km += 16;
  }
  return withDescents({ source: "gpx", totalKm: km, hasElevation: true, segments, accents, leadInApproximated: false });
}

describe("belasting van het event", () => {
  it("rekent genormaliseerd vermogen over de segmenten", () => {
    expect(normalizedWatts(evaluation([[200, 600], [200, 600]]))).toBeCloseTo(200, 6);
    // Wisselend vermogen weegt zwaarder dan het gemiddelde.
    expect(normalizedWatts(evaluation([[100, 600], [300, 600]]))).toBeGreaterThan(200);
  });

  it("is een uur op CP honderd, en rustiger als de doeltijd minder vraagt", () => {
    const hour = evaluation([[260, 3600]]);
    expect(eventLoad(hour, 260, 3600, 1)).toBe(100);
    expect(eventLoad(hour, 260, 3600, 0.8)).toBe(64);
    // Vraagt de tijd meer CP, dan rijdt een sterker lid hem even zwaar, niet zwaarder.
    expect(eventLoad(hour, 260, 3600, 1.2)).toBe(100);
    expect(eventLoad(hour, 0, 3600, 1)).toBe(0);
  });
});

describe("eisen per onderdeel", () => {
  it("legt de drempel maal de CP-factor op de schaal van de steen", () => {
    const result = goalRequirements({ cpFactor: 1.08, eventLoad: 393, steen: STEEN });
    const anchors = powerAnchors("m20", "man");
    expect(result.drempel.current).toBeCloseTo(levelAt(anchors, 3.56), 2);
    expect(result.drempel.required).toBeCloseTo(levelAt(anchors, 3.56 * 1.08), 2);
    // Platina: 3,56 W/kg is 424 punten, 8% meer is 486.
    expect(Math.floor(result.drempel.current! * 100)).toBe(424);
    expect(result.drempel.required!).toBeGreaterThan(4.86);
    expect(result.drempel.required!).toBeLessThan(5);
  });

  it("deelt de belasting door de ijking voor fitheid", () => {
    const result = goalRequirements({ cpFactor: 1, eventLoad: 393, steen: STEEN });
    expect(result.fitheid.required).toBeCloseTo(levelAt(CTL_ANCHORS, 393 / EVENT_LOAD_PER_CTL), 2);
    expect(result.fitheid.current).toBeCloseTo(levelAt(CTL_ANCHORS, 45), 2);
    expect(result.eventLoad).toBe(393);
  });

  it("laat weg wat het niet weet", () => {
    expect(goalRequirements({ cpFactor: null, eventLoad: 300, steen: STEEN }).drempel.required).toBeNull();
    const empty = goalRequirements({ cpFactor: 1, eventLoad: 0, steen: { sex: null, wkg20: null, ctl: null } });
    expect(empty.drempel).toEqual({ required: null, current: null });
    expect(empty.fitheid).toEqual({ required: null, current: null });
  });

  it("rekent voor een vrouw met de schaal voor vrouwen", () => {
    const man = goalRequirements({ cpFactor: 1, eventLoad: 0, steen: { ...STEEN, sex: "man" } });
    const vrouw = goalRequirements({ cpFactor: 1, eventLoad: 0, steen: { ...STEEN, sex: "vrouw" } });
    expect(vrouw.drempel.current!).toBeGreaterThan(man.drempel.current!);
  });
});

describe("eisen bij de prognose", () => {
  const route = hillyRoute();
  const fastest = fastestPlan(route, RIDER).evaluation.totalSeconds;
  const base = { route, rider: RIDER, riding: "alone" as const, weeksToGoal: 12, longestRideMinutes: 300 };

  it("vraagt minder dan je nu hebt bij een ruime doeltijd, en meer bij een scherpe", () => {
    const easy = forecastGoal({ ...base, targetSeconds: fastest * 1.15, steen: STEEN }).requirements!;
    const hard = forecastGoal({ ...base, targetSeconds: fastest * 0.95, steen: STEEN }).requirements!;
    expect(easy.drempel.required!).toBeLessThan(easy.drempel.current!);
    expect(hard.drempel.required!).toBeGreaterThan(hard.drempel.current!);
    expect(hard.fitheid.required!).toBeGreaterThan(easy.fitheid.required!);
  });

  it("vraagt ongeveer je huidige drempel als de doeltijd je prognose is", () => {
    const exact = forecastGoal({ ...base, targetSeconds: fastest, steen: STEEN }).requirements!;
    expect(Math.abs(exact.drempel.required! - exact.drempel.current!)).toBeLessThan(0.1);
  });

  it("heeft geen eisen zonder steengegevens", () => {
    expect(forecastGoal({ ...base, targetSeconds: fastest }).requirements).toBeNull();
  });
});
