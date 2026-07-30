import { describe, expect, it } from "vitest";
import {
  detectIntensityFromLoad,
  intensityFromLoad,
  intensityFromPct,
  intensityLabel,
} from "@/lib/training/workouts";

/** TSS-per-uur omzetten naar (load, minuten) voor een rit van een uur. */
function perHour(loadPerHour: number) {
  return detectIntensityFromLoad(loadPerHour, 60);
}

describe("detectIntensityFromLoad", () => {
  it("zit op de juiste kant van elke grens", () => {
    expect(perHour(34.9)).toBe("recovery");
    expect(perHour(35)).toBe("endurance");
    expect(perHour(64.9)).toBe("endurance");
    expect(perHour(65)).toBe("tempo");
    expect(perHour(84.9)).toBe("tempo");
    expect(perHour(85)).toBe("threshold");
    expect(perHour(104.9)).toBe("threshold");
    expect(perHour(105)).toBe("vo2max");
    expect(perHour(124.9)).toBe("vo2max");
    expect(perHour(125)).toBe("anaerobic");
  });

  it("rekent met belasting per uur, niet met de ruwe belasting", () => {
    // 50 TSS in 30 minuten is 100 TSS/uur.
    expect(detectIntensityFromLoad(50, 30)).toBe("threshold");
  });

  it("geeft null als er niets te bepalen is", () => {
    expect(detectIntensityFromLoad(null, 60)).toBeNull();
    expect(detectIntensityFromLoad(0, 60)).toBeNull();
    expect(detectIntensityFromLoad(80, null)).toBeNull();
    expect(detectIntensityFromLoad(80, 0)).toBeNull();
  });
});

describe("intensityFromLoad", () => {
  it("valt terug op endurance, zodat de trainingspagina niet verandert", () => {
    expect(intensityFromLoad(null, 60)).toBe("endurance");
    expect(intensityFromLoad(0, 60)).toBe("endurance");
    expect(intensityFromLoad(80, 0)).toBe("endurance");
    expect(intensityFromLoad(100, 60)).toBe("threshold");
  });
});

describe("intensityFromPct", () => {
  it("zit op de juiste kant van elke grens", () => {
    expect(intensityFromPct(54)).toBe("recovery");
    expect(intensityFromPct(55)).toBe("endurance");
    expect(intensityFromPct(75)).toBe("endurance");
    expect(intensityFromPct(76)).toBe("tempo");
    expect(intensityFromPct(90)).toBe("tempo");
    expect(intensityFromPct(91)).toBe("threshold");
    expect(intensityFromPct(105)).toBe("threshold");
    expect(intensityFromPct(106)).toBe("vo2max");
    expect(intensityFromPct(120)).toBe("vo2max");
    expect(intensityFromPct(121)).toBe("anaerobic");
  });

  it("valt terug op endurance zonder doel", () => {
    expect(intensityFromPct(null)).toBe("endurance");
  });
});

describe("intensityLabel", () => {
  it("vertaalt bekende intensiteiten", () => {
    expect(intensityLabel("threshold")).toBe("Drempel");
    expect(intensityLabel("rest")).toBe("Rust");
  });

  it("geeft een onbekende waarde ruw terug", () => {
    expect(intensityLabel("sweetspot")).toBe("sweetspot");
  });

  it("geeft een lege string bij niets", () => {
    expect(intensityLabel(null)).toBe("");
    expect(intensityLabel(undefined)).toBe("");
    expect(intensityLabel("")).toBe("");
  });
});
