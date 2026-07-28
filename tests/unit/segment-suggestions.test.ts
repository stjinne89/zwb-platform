import { describe, expect, it } from "vitest";
import {
  suggestSegmentsForBlock,
  type SegmentCandidate,
} from "@/lib/training/segment-suggestions";

const flatShort: SegmentCandidate = {
  slug: "vlak-kort",
  name: "Vlak kort",
  distanceM: 2200,
  elevationGainM: 5,
  virtual: false,
};

const climb8min: SegmentCandidate = {
  slug: "klim-8",
  name: "Klim van 8 minuten",
  distanceM: 2600,
  elevationGainM: 180,
  virtual: false,
  bestTimeSeconds: 8 * 60,
};

const climbRidden5min: SegmentCandidate = {
  slug: "klim-5",
  name: "Klim van 5 minuten",
  distanceM: 1800,
  elevationGainM: 120,
  virtual: false,
  bestTimeSeconds: 5 * 60,
};

const wayTooLong: SegmentCandidate = {
  slug: "lang",
  name: "Veel te lang",
  distanceM: 30000,
  elevationGainM: 900,
  virtual: false,
};

describe("suggestSegmentsForBlock", () => {
  it("houdt alleen segmenten binnen 25% van de blokduur over", () => {
    const suggestions = suggestSegmentsForBlock(
      { durationMinutes: 8, intensity: "threshold" },
      [climb8min, wayTooLong],
    );
    expect(suggestions.map((s) => s.slug)).toEqual(["klim-8"]);
  });

  it("zet gereden segmenten voorop", () => {
    const unridden: SegmentCandidate = {
      slug: "onbekend",
      name: "Nooit gereden",
      distanceM: 3400,
      elevationGainM: 230,
      virtual: false,
    };
    const suggestions = suggestSegmentsForBlock(
      { durationMinutes: 8, intensity: "threshold" },
      [unridden, climb8min],
    );
    expect(suggestions[0].slug).toBe("klim-8");
    expect(suggestions[0].ridden).toBe(true);
  });

  it("kiest vlak bij korte explosieve blokken", () => {
    const suggestions = suggestSegmentsForBlock(
      { durationMinutes: 5, intensity: "anaerobic" },
      [climbRidden5min, { ...flatShort, distanceM: 2200, bestTimeSeconds: 5 * 60 }],
    );
    expect(suggestions[0].slug).toBe("vlak-kort");
  });

  it("geeft niets terug zonder blokduur", () => {
    expect(suggestSegmentsForBlock({ durationMinutes: 0, intensity: "endurance" }, [climb8min]))
      .toEqual([]);
  });

  it("beperkt het aantal suggesties", () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      ...climb8min,
      slug: `klim-${index}`,
      bestTimeSeconds: 8 * 60 + index,
    }));
    expect(suggestSegmentsForBlock({ durationMinutes: 8, intensity: "threshold" }, many)).toHaveLength(3);
  });
});
