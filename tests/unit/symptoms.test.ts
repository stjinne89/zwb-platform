import { describe, expect, it } from "vitest";
import {
  estimateCycle,
  summarizeSymptomLoad,
  type SymptomLog,
} from "@/lib/training/symptoms";

function log(date: string, severity: number | null, cycleStart = false): SymptomLog {
  return {
    id: date,
    log_date: date,
    severity,
    symptoms: [],
    cycle_start: cycleStart,
    note: null,
  };
}

const NOW = new Date("2026-08-18T12:00:00Z");

describe("summarizeSymptomLoad", () => {
  it("geeft null zonder invoer — niets invullen is geen signaal", () => {
    expect(summarizeSymptomLoad([], 7, NOW)).toBeNull();
    // Alleen een cyclusmarkering zonder score telt ook niet mee.
    expect(summarizeSymptomLoad([log("2026-08-17", null, true)], 7, NOW)).toBeNull();
  });

  it("schaalt 1 tot 5 naar 0 tot 1", () => {
    expect(summarizeSymptomLoad([log("2026-08-17", 1)], 7, NOW)?.score).toBe(0);
    expect(summarizeSymptomLoad([log("2026-08-17", 5)], 7, NOW)?.score).toBe(1);
    expect(summarizeSymptomLoad([log("2026-08-17", 3)], 7, NOW)?.score).toBeCloseTo(0.5);
  });

  it("kijkt alleen naar het venster", () => {
    const oud = log("2026-06-01", 5);
    const recent = log("2026-08-17", 1);
    const summary = summarizeSymptomLoad([oud, recent], 7, NOW);
    expect(summary?.days).toBe(1);
    expect(summary?.score).toBe(0);
  });

  it("labelt hoge klachtenlast", () => {
    expect(summarizeSymptomLoad([log("2026-08-17", 5)], 7, NOW)?.label).toBe(
      "hoge klachtenlast",
    );
    expect(summarizeSymptomLoad([log("2026-08-17", 1)], 7, NOW)?.label).toBe(
      "weinig klachten",
    );
  });
});

describe("estimateCycle", () => {
  it("geeft null zonder markeringen", () => {
    expect(estimateCycle([log("2026-08-17", 2)])).toBeNull();
  });

  it("geeft de laatste start zonder lengte bij één markering", () => {
    const result = estimateCycle([log("2026-08-01", 3, true)]);
    expect(result?.lastStart).toBe("2026-08-01");
    expect(result?.averageLengthDays).toBeNull();
  });

  it("middelt de lengte over meerdere cycli", () => {
    const result = estimateCycle([
      log("2026-08-01", 3, true),
      log("2026-07-04", 3, true),
      log("2026-06-06", 3, true),
    ]);
    expect(result?.lastStart).toBe("2026-08-01");
    expect(result?.averageLengthDays).toBe(28);
  });

  it("negeert onmogelijke gaten", () => {
    const result = estimateCycle([
      log("2026-08-01", 3, true),
      log("2026-07-31", 3, true),
    ]);
    expect(result?.averageLengthDays).toBeNull();
  });
});
