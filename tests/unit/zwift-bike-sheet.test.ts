import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  deriveCatalog,
  parseBaselineTab,
  parseCsv,
  parseFramesTab,
  parseWheelsTab,
} from "@/lib/zwift/bike-sheet";
import { ZWIFT_BASE_BIKE_KG, ZWIFT_BASE_CDA } from "@/lib/pacing/zwift-setup";

// Uitsnede van de echte sheet (21 september 2026): een handvol frames, wielen
// en het volledige basistabblad.
const read = (name: string) =>
  readFileSync(path.join(__dirname, "..", "fixtures", "zwift", name), "utf8");

const frames = parseFramesTab(read("bike-sheet-frames.csv"));
const wheels = parseWheelsTab(read("bike-sheet-wheels.csv"));
const baseline = parseBaselineTab(read("bike-sheet-baseline.csv"));
const catalog = deriveCatalog({ frames, wheels, baseline });

describe("CSV", () => {
  it("leest aanhalingstekens met komma's erin als één cel", () => {
    expect(parseCsv('a,"550,000",b\n')).toEqual([["a", "550,000", "b"]]);
  });
});

describe("tabbladen", () => {
  it("leest per frame alleen de ingevulde upgradeniveaus, bij 150 én 300 W", () => {
    const sl8 = frames.filter((frame) => frame.name === "Specialized Tarmac SL8");
    expect(sl8.map((frame) => frame.stage).sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(sl8[0].tests.map((test) => test.powerW).sort()).toEqual([150, 300]);
  });

  it("slaat fun bikes over", () => {
    expect(frames.some((frame) => frame.name === "Zwift MX Rider")).toBe(false);
  });

  it("neemt uit het basistabblad alleen de Zwift Carbon, de nieuwste meting", () => {
    expect(baseline).toHaveLength(2);
    expect(baseline.find((test) => test.powerW === 300)?.flatMph).toBeCloseTo(24.574, 3);
  });
});

describe("afgeleide onderdelen", () => {
  it("de referentie komt overeen met de constanten in zwift-setup.ts", () => {
    expect(catalog.baseline?.cda).toBeCloseTo(ZWIFT_BASE_CDA, 3);
    expect(catalog.baseline?.bikeKg).toBeCloseTo(ZWIFT_BASE_BIKE_KG, 1);
  });

  it("een aerofiets heeft minder luchtweerstand, een mountainbike weegt meer", () => {
    const part = (name: string, stage = 0) =>
      catalog.parts.find((item) => item.part === "frame" && item.name === name && item.stage === stage)!;
    expect(part("Zwift Carbon").cdaDelta).toBeCloseTo(0, 4);
    expect(part("Specialized Tarmac SL8").cdaDelta).toBeLessThan(-0.01);
    expect(part("Specialized Tarmac SL8", 5).cdaDelta).toBeLessThan(part("Specialized Tarmac SL8").cdaDelta);
    expect(part("Zwift TT").kind).toBe("tt");
    expect(part("Zwift Mountain").kgDelta).toBeGreaterThan(2);
  });

  it("wielen worden vergeleken met hun eigen testframe", () => {
    const wheel = catalog.parts.find(
      (item) => item.part === "wheel" && item.name.startsWith("DT Swiss ARC 1100 DICUT 62") && item.testFrame === "Zwift Carbon",
    )!;
    expect(wheel.kind).toBe("road");
    expect(wheel.cdaDelta).toBeLessThan(0);
    expect(catalog.parts.some((item) => item.part === "wheel" && item.testFrame === "Zwift Gravel")).toBe(true);
  });
});
