import { describe, expect, it } from "vitest";
import {
  percentRangeForIntensity,
  percentRangeForRpe,
  rpeFromText,
  targetHint,
  wattRangeLabel,
} from "@/lib/training/targets";

describe("percentRangeForIntensity", () => {
  it("geeft de %FTP-band per intensiteit", () => {
    expect(percentRangeForIntensity("endurance")).toEqual([60, 75]);
    expect(percentRangeForIntensity("threshold")).toEqual([91, 105]);
    expect(percentRangeForIntensity("race")).toEqual([85, 115]);
  });

  it("behandelt rust als niet-rijden, niet als lage band", () => {
    expect(percentRangeForIntensity("rest")).toEqual([0, 0]);
  });

  it("geeft null voor een onbekende intensiteit", () => {
    expect(percentRangeForIntensity("sweetspot")).toBeNull();
  });
});

describe("percentRangeForRpe", () => {
  it("loopt op met de RPE", () => {
    expect(percentRangeForRpe(1)).toEqual([0, 45]);
    expect(percentRangeForRpe(5)).toEqual([70, 80]);
    expect(percentRangeForRpe(10)).toEqual([125, 150]);
  });
});

describe("rpeFromText", () => {
  it("leest een RPE uit vrije tekst", () => {
    expect(rpeFromText("RPE 6, 210-235w")).toBe(6);
    expect(rpeFromText("rpe 10")).toBe(10);
    // Zonder spatie mag ook; de blok-notities zijn met de hand geschreven.
    expect(rpeFromText("rpe10 all-out")).toBe(10);
    expect(rpeFromText("gewoon rustig")).toBeNull();
    // 11 is geen geldige RPE en mag niet als 1 worden gelezen.
    expect(rpeFromText("rpe 11")).toBeNull();
  });
});

describe("wattRangeLabel", () => {
  it("rekent de band om naar watt", () => {
    expect(wattRangeLabel(250, [60, 75])).toBe("150-188w");
  });

  it("noemt rust bij naam", () => {
    expect(wattRangeLabel(250, [0, 0])).toBe("Rust");
  });

  it("geeft null zonder FTP of band", () => {
    expect(wattRangeLabel(null, [60, 75])).toBeNull();
    expect(wattRangeLabel(250, null)).toBeNull();
  });
});

describe("targetHint", () => {
  it("vertaalt de intensiteit naar een wattage-band", () => {
    expect(targetHint({ ftpWatts: 250, intensity: "endurance", target: "65%" })).toBe("150-188w");
  });

  it("geeft de RPE-band voorrang boven de intensiteit", () => {
    expect(targetHint({ ftpWatts: 250, intensity: "endurance", notes: "RPE 8" })).toBe(
      "RPE 8: 250-275w",
    );
  });

  it("herhaalt een doel dat al in watt staat niet", () => {
    expect(targetHint({ ftpWatts: 250, intensity: "threshold", target: "230-245w" })).toBeNull();
    expect(targetHint({ ftpWatts: 250, intensity: "threshold", target: "240w" })).toBeNull();
  });

  it("geeft null zonder FTP", () => {
    expect(targetHint({ ftpWatts: null, intensity: "endurance", target: "65%" })).toBeNull();
  });
});
