import { describe, expect, it } from "vitest";
import { formatDuration } from "@/lib/charts/format";
import { valueAt, median } from "@/lib/charts/interpolate";
import { areaPath, lineSegments, linePath } from "@/lib/charts/paths";
import { absMax, linearScale, logScale, positiveMax } from "@/lib/charts/scale";
import { MAX_SERIES, seriesColor } from "@/lib/charts/palette";
import { defsId } from "@/lib/charts/ids";

describe("scale", () => {
  it("mapt lineair van domein naar bereik", () => {
    const scale = linearScale({ domain: [0, 100], range: [0, 200] });
    expect(scale.forward(50)).toBe(100);
    expect(scale.invert(100)).toBe(50);
  });

  it("keert een omgekeerd bereik om (y-as loopt omlaag)", () => {
    const scale = linearScale({ domain: [0, 100], range: [300, 100] });
    expect(scale.forward(0)).toBe(300);
    expect(scale.forward(100)).toBe(100);
  });

  it("logschaal is heen en terug consistent", () => {
    const scale = logScale({ domain: [5, 18000], range: [58, 896] });
    for (const seconds of [5, 60, 1200, 18000]) {
      expect(scale.invert(scale.forward(seconds))).toBeCloseTo(seconds, 6);
    }
  });

  it("rondt assen af op hele stappen", () => {
    expect(positiveMax([12, 88, null], 100)).toBe(100);
    expect(positiveMax([12, 188, null], 100)).toBe(190);
    expect(absMax([-32, 8], 30)).toBe(35);
  });
});

describe("valueAt", () => {
  const points = [
    { seconds: 60, watts: 400 },
    { seconds: 600, watts: 300 },
    { seconds: 1200, watts: 280 },
  ];

  it("geeft exacte punten terug", () => {
    expect(valueAt(points, 60)).toBe(400);
    expect(valueAt(points, 1200)).toBe(280);
  });

  it("interpoleert logaritmisch tussen punten", () => {
    const value = valueAt(points, 300);
    expect(value).not.toBeNull();
    expect(value!).toBeLessThan(400);
    expect(value!).toBeGreaterThan(300);
  });

  it("geeft null buiten het bereik en bij een lege curve", () => {
    expect(valueAt(points, 5)).toBeNull();
    expect(valueAt(points, 3600)).toBeNull();
    expect(valueAt([], 60)).toBeNull();
  });
});

describe("median", () => {
  it("rekent met oneven en even aantallen", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("paths", () => {
  const points = [
    { value: 1 as number | null },
    { value: null as number | null },
    { value: 3 as number | null },
  ];

  it("breekt de lijn bij ontbrekende waarden", () => {
    const segments = lineSegments(points, (p) => p.value, (index) => index * 10, (value) => value);
    expect(segments).toHaveLength(2);
    expect(segments[0].startsWith("M")).toBe(true);
    expect(segments[1].startsWith("M")).toBe(true);
  });

  it("maakt één doorlopend pad zonder gaten", () => {
    const path = linePath([{ x: 0, y: 5 }, { x: 10, y: 8 }], (p) => p.x, (p) => p.y);
    expect(path).toBe("M 0.0 5.0 L 10.0 8.0");
  });

  it("sluit een vlak af op de basislijn", () => {
    const area = areaPath("M 0.0 5.0 L 10.0 8.0", 0, 10, 100);
    expect(area.endsWith("Z")).toBe(true);
    expect(area).toContain("L 10.0 100.0");
    expect(areaPath("", 0, 10, 100)).toBe("");
  });
});

describe("format en palette", () => {
  it("formatteert duur in s, m en u", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(300)).toBe("5m");
    expect(formatDuration(7200)).toBe("2u");
  });

  it("geeft elke reeks binnen de limiet een eigen kleur", () => {
    const colors = Array.from({ length: MAX_SERIES }, (_, index) => seriesColor(index));
    expect(new Set(colors).size).toBe(MAX_SERIES);
    expect(seriesColor(MAX_SERIES)).toBe(seriesColor(0));
  });

  it("maakt defs-ids uniek per instantie", () => {
    expect(defsId("power-area")).toBe("power-area");
    expect(defsId("power-area", "coach")).toBe("power-area-coach");
  });
});
