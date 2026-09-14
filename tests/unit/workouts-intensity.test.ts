import { describe, expect, it } from "vitest";
import {
  blockColor,
  detectIntensityFromLoad,
  INTENSITY_COLORS,
  ZWIFT_ZONES,
  zwiftZoneForPct,
  estimateTrainingLoad,
  intensityFromLoad,
  intensityFromPct,
  intensityLabel,
  normalizeWorkoutBlocks,
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

describe("estimateTrainingLoad", () => {
  const blocks = (rows: Array<Record<string, unknown>>) => normalizeWorkoutBlocks(rows);

  it("rekent kwadratisch: een uur op FTP is 100", () => {
    expect(
      estimateTrainingLoad(
        blocks([{ durationMinutes: 60, target: "100%", intensity: "threshold" }]),
      ),
    ).toBe(100);
    // Half zo hard is een kwart van de belasting, niet de helft.
    expect(
      estimateTrainingLoad(
        blocks([{ durationMinutes: 60, target: "50%", intensity: "recovery" }]),
      ),
    ).toBe(25);
  });

  it("volgt het doel van het blok, niet de intensiteitsklasse", () => {
    const sweetspot = blocks([{ durationMinutes: 60, target: "88%", intensity: "tempo" }]);
    const rustigTempo = blocks([{ durationMinutes: 60, target: "77%", intensity: "tempo" }]);
    expect(estimateTrainingLoad(sweetspot)).toBe(77);
    expect(estimateTrainingLoad(rustigTempo)).toBe(59);
  });

  it("leest een wattage-doel af tegen de meegegeven FTP", () => {
    const block = blocks([{ durationMinutes: 60, target: "200-220w", intensity: "tempo" }]);
    // 210w op FTP 250 is 84%; op FTP 210 is het precies FTP.
    expect(estimateTrainingLoad(block, 250)).toBe(71);
    expect(estimateTrainingLoad(block, 210)).toBe(100);
  });

  it("valt zonder leesbaar doel terug op de band van de intensiteit", () => {
    // Zonder FTP is "200-220w" onleesbaar; drempel is dan 91-105%, midden 98%.
    const block = blocks([{ durationMinutes: 60, target: "200-220w", intensity: "threshold" }]);
    expect(estimateTrainingLoad(block, null)).toBe(96);
  });

  it("telt rust niet mee", () => {
    expect(
      estimateTrainingLoad(
        blocks([
          { durationMinutes: 30, target: "", intensity: "rest" },
          { durationMinutes: 60, target: "100%", intensity: "threshold" },
        ]),
      ),
    ).toBe(100);
  });
});

describe("Zwift-zonekleuren", () => {
  it("legt de zonegrenzen van Zwift vast", () => {
    const zones = [0, 59.9, 60, 75.9, 76, 89.9, 90, 104.9, 105, 118.9, 119, 200].map(
      (pct) => zwiftZoneForPct(pct).zone,
    );
    expect(zones).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
  });

  it("kleurt elke intensiteit als de zone waar hij in valt", () => {
    expect(INTENSITY_COLORS.recovery).toBe(ZWIFT_ZONES[0].color);
    expect(INTENSITY_COLORS.endurance).toBe(ZWIFT_ZONES[1].color);
    expect(INTENSITY_COLORS.tempo).toBe(ZWIFT_ZONES[2].color);
    expect(INTENSITY_COLORS.threshold).toBe(ZWIFT_ZONES[3].color);
    expect(INTENSITY_COLORS.vo2max).toBe(ZWIFT_ZONES[4].color);
    expect(INTENSITY_COLORS.anaerobic).toBe(ZWIFT_ZONES[5].color);
    expect(INTENSITY_COLORS.rest).not.toBe(ZWIFT_ZONES[0].color);
  });

  it("kleurt een blok op het midden van zijn doel, niet op zijn label", () => {
    const block = { label: "Blok", durationMinutes: 10, target: "88-92%", notes: "", intensity: "tempo" as const };
    expect(blockColor(block, 250)).toBe(ZWIFT_ZONES[3].color);
    expect(blockColor({ ...block, target: "225-237w" }, 250)).toBe(ZWIFT_ZONES[3].color);
    expect(blockColor({ ...block, target: "", intensity: "rest" }, 250)).toBe(INTENSITY_COLORS.rest);
  });
});