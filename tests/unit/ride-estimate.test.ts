import { describe, expect, it } from "vitest";
import {
  arrivalSecondsAtKm,
  estimateRide,
  MAX_DESCENT_MS,
  solveSpeedMs,
  type RouteSegment,
} from "@/lib/ride-estimate";

const OPTS = {
  cda: 0.32,
  crr: 0.005,
  airDensity: 1.225,
  drivetrainEff: 0.97,
  massKg: 80,
};

function flatSegments(km: number, watts: number, step = 1000): RouteSegment[] {
  const segs: RouteSegment[] = [];
  let left = km * 1000;
  while (left > 0) {
    const d = Math.min(step, left);
    segs.push({ distanceM: d, gradient: 0, watts });
    left -= d;
  }
  return segs;
}

describe("solveSpeedMs", () => {
  it("geeft een plausibele snelheid op vlak (250 W, 80 kg)", () => {
    const v = solveSpeedMs(250, 0, OPTS);
    const kmh = v * 3.6;
    expect(kmh).toBeGreaterThan(32);
    expect(kmh).toBeLessThan(46);
  });

  it("is langzamer op een klim dan op vlak", () => {
    const flat = solveSpeedMs(250, 0, OPTS);
    const climb = solveSpeedMs(250, 0.08, OPTS);
    expect(climb).toBeLessThan(flat);
    expect(climb * 3.6).toBeGreaterThan(4);
    expect(climb * 3.6).toBeLessThan(20);
  });

  it("is monotoon sneller bij meer vermogen", () => {
    expect(solveSpeedMs(300, 0.05, OPTS)).toBeGreaterThan(solveSpeedMs(200, 0.05, OPTS));
  });

  it("capt afdalingen en levert nooit NaN/Infinity", () => {
    const v = solveSpeedMs(200, -0.15, OPTS);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeLessThanOrEqual(MAX_DESCENT_MS);
  });
});

describe("estimateRide", () => {
  it("cumulatieve tijd is strikt stijgend", () => {
    const est = estimateRide({ segments: flatSegments(5, 220), totalMassKg: 80 });
    const cum = est.cumulativeSecondsAtSegmentEnd;
    for (let i = 1; i < cum.length; i++) {
      expect(cum[i]).toBeGreaterThan(cum[i - 1]);
    }
    expect(est.totalSeconds).toBeCloseTo(cum[cum.length - 1], 5);
  });

  it("harder op de klim-segmenten verkort de totaaltijd", () => {
    const base: RouteSegment[] = [
      { distanceM: 2000, gradient: 0, watts: 200 },
      { distanceM: 2000, gradient: 0.07, watts: 200 },
      { distanceM: 2000, gradient: 0, watts: 200 },
    ];
    const harder = base.map((s) =>
      s.gradient > 0 ? { ...s, watts: 300 } : s,
    );
    const tBase = estimateRide({ segments: base, totalMassKg: 80 }).totalSeconds;
    const tHard = estimateRide({ segments: harder, totalMassKg: 80 }).totalSeconds;
    expect(tHard).toBeLessThan(tBase);
  });
});

describe("arrivalSecondsAtKm", () => {
  it("interpoleert lineair binnen een segment", () => {
    const est = estimateRide({
      segments: [
        { distanceM: 1000, gradient: 0, watts: 220 },
        { distanceM: 1000, gradient: 0, watts: 220 },
      ],
      totalMassKg: 80,
    });
    const ends = [1, 2];
    expect(arrivalSecondsAtKm(est, ends, 0)).toBe(0);
    expect(arrivalSecondsAtKm(est, ends, 1)).toBeCloseTo(est.cumulativeSecondsAtSegmentEnd[0], 5);
    // Halverwege segment 0.
    expect(arrivalSecondsAtKm(est, ends, 0.5)).toBeCloseTo(est.segments[0].durationS / 2, 5);
    // Voorbij het einde → totaal.
    expect(arrivalSecondsAtKm(est, ends, 9)).toBeCloseTo(est.totalSeconds, 5);
  });
});
