import { describe, expect, it } from "vitest";
import { parsePowerCurveList } from "@/lib/intervals/client";
import {
  compactCurve,
  cpSeries,
  curveGranularity,
  curveRange,
  eftpSeries,
  peakSeries,
  type CompactPoint,
} from "@/lib/stats/curves";
import { bucketKey } from "@/lib/stats/personal";

/** Een curve die precies het tweeparametermodel volgt: P = W′/t + CP. */
function modelCurve(cp: number, wPrime: number): CompactPoint[] {
  return [5, 60, 120, 180, 300, 600, 1200, 3600].map((seconds) => ({
    seconds,
    watts: Math.round(cp + wPrime / seconds),
    wattsPerKg: null,
  }));
}

describe("parsePowerCurveList", () => {
  it("houdt elke curve uit list apart, met zijn id", () => {
    const curves = parsePowerCurveList({
      list: [
        { id: "r.2026-01-01.2026-01-31", secs: [5, 60, 300], values: [900, 500, 330], watts_per_kg: [12, 6.7, 4.4] },
        { id: "r.2026-02-01.2026-02-28", secs: [5, 60], values: [950, 520] },
        { id: "r.2026-03-01.2026-03-31", secs: [], values: [] },
      ],
    });
    expect(curves.map((curve) => curve.id)).toEqual([
      "r.2026-01-01.2026-01-31",
      "r.2026-02-01.2026-02-28",
      "r.2026-03-01.2026-03-31",
    ]);
    expect(curves[0].points.map((point) => point.watts)).toEqual([900, 500, 330]);
    expect(curves[0].points[2].wattsPerKg).toBe(4.4);
    expect(curves[2].points).toEqual([]);
  });

  it("geeft een lege lijst zonder list", () => {
    expect(parsePowerCurveList({ secs: [5], values: [900] })).toEqual([]);
  });
});

describe("periodes voor curves", () => {
  it("telt weken als maanden", () => {
    expect(curveGranularity("week")).toBe("maand");
    expect(curveGranularity("jaar")).toBe("jaar");
  });

  it("kapt de lopende periode af op vandaag", () => {
    expect(curveRange("2026-10", "maand", "2026-10-16")).toBe("r.2026-10-01.2026-10-16");
    expect(curveRange("2025", "jaar", "2026-10-16")).toBe("r.2025-01-01.2025-12-31");
  });
});

describe("compactCurve", () => {
  it("brengt de curve terug tot vaste duren, met W/kg waar die er is", () => {
    const compact = compactCurve([
      { seconds: 5, watts: 900, wattsPerKg: 12 },
      { seconds: 61, watts: 500 },
      { seconds: 1190, watts: 300 },
    ]);
    expect(compact).toEqual([
      { seconds: 5, watts: 900, wattsPerKg: 12 },
      { seconds: 60, watts: 500, wattsPerKg: null },
      { seconds: 1200, watts: 300, wattsPerKg: null },
    ]);
  });
});

describe("peakSeries en cpSeries", () => {
  const curves = {
    "2026-01": modelCurve(250, 20_000),
    "2026-02": modelCurve(270, 18_000),
    "2026-03": undefined,
  };

  it("leest het piekvermogen per duur, met een gat waar geen curve is", () => {
    const peaks = peakSeries(["2026-01", "2026-02", "2026-03"], curves);
    // 5 s, 1 min, 5 min, 20 min
    expect(peaks[0].watts).toEqual([4250, 583, 317, 267]);
    expect(peaks[2].watts).toEqual([null, null, null, null]);
  });

  it("fit CP en W′ per periode", () => {
    const cps = cpSeries(["2026-01", "2026-02", "2026-03"], curves);
    expect(cps[0].cpWatts).toBeCloseTo(250, -1);
    expect(cps[0].wPrimeKj).toBeCloseTo(20, 0);
    expect(cps[1].cpWatts).toBeCloseTo(270, -1);
    expect(cps[2]).toEqual({ key: "2026-03", cpWatts: null, wPrimeKj: null });
  });
});

describe("eftpSeries", () => {
  it("neemt de laatste eFTP en het gemiddelde gewicht per periode", () => {
    const points = eftpSeries(
      ["2026-09", "2026-10"],
      [
        { id: "2026-09-02", eftp: 260, weight: 80 },
        { id: "2026-09-20", eftp: 265, weight: 79 },
        { id: "2026-09-25", eftp: null, weight: null },
        { id: "2026-10-03", eftp: 270, weight: 400 },
      ],
      (day) => bucketKey(day, "maand"),
    );
    expect(points[0]).toEqual({ key: "2026-09", eftp: 265, weightKg: 79.5, wkg: 3.33 });
    // Een onmogelijk gewicht telt niet mee.
    expect(points[1]).toEqual({ key: "2026-10", eftp: 270, weightKg: null, wkg: null });
  });
});
