import { describe, expect, it } from "vitest";
import { applyZwiftGopherResult } from "@/lib/ttt/zwiftgopher";
import { tttMaxRiders, type TttPlanRiderInput } from "@/lib/ttt/types";

function rider(patch: Partial<TttPlanRiderInput>): TttPlanRiderInput {
  return {
    profileId: null,
    isManual: false,
    zwiftId: "",
    name: "Renner",
    ftpWatts: 250,
    weightKg: 75,
    heightCm: 180,
    power300Watts: 320,
    pullWatts: 250,
    pullDurationSeconds: 30,
    displayOrder: 0,
    role: null,
    notes: null,
    ...patch,
  };
}

const riders = [
  rider({ zwiftId: "111", name: "Anna", displayOrder: 0 }),
  rider({ zwiftId: "222", name: "Bram", displayOrder: 1 }),
  rider({ isManual: true, name: "Gast 1", displayOrder: 2, notes: "eerste TTT" }),
];

describe("kopbeurten en volgorde uit ZwiftGopher", () => {
  it("neemt watts, duur en volgorde van het antwoord over", () => {
    const res = applyZwiftGopherResult(riders, {
      success: true,
      data: {
        riders: [
          { name: "gast 1", pull_power: 281.6, pull_duration: 45 },
          { zwift_id: 222, name: "B. de Vries", pull_power: 310, pull_duration: 60 },
          { zwift_id: "111", name: "Anna", pull_power: 295, pull_duration: 0 },
        ],
      },
    });

    expect(res.applied).toBe(3);
    expect(res.riders.map((r) => r.name)).toEqual(["Gast 1", "Bram", "Anna"]);
    expect(res.riders.map((r) => r.displayOrder)).toEqual([0, 1, 2]);
    expect(res.riders.map((r) => r.pullWatts)).toEqual([282, 310, 295]);
    expect(res.riders.map((r) => r.pullDurationSeconds)).toEqual([45, 60, 0]);
    expect(res.riders[0].notes).toBe("eerste TTT");
  });

  it("volgt een expliciet volgordeveld boven de plek in de lijst", () => {
    const res = applyZwiftGopherResult(riders, {
      data: {
        riders: [
          { zwift_id: 111, order: 2, pull_power: 300, pull_duration: 30 },
          { zwift_id: 222, order: 1, pull_power: 320, pull_duration: 45 },
        ],
      },
    });

    expect(res.riders.map((r) => r.name)).toEqual(["Bram", "Anna", "Gast 1"]);
    expect(res.riders[2].pullWatts).toBe(250);
    expect(res.applied).toBe(2);
  });

  it("laat het plan ongemoeid als het antwoord geen kopbeurten bevat", () => {
    const res = applyZwiftGopherResult(riders, {
      data: { riders: [{ zwift_id: "222", speed_index: 68 }, { zwift_id: "111" }] },
    });

    expect(res.applied).toBe(0);
    expect(res.riders).toEqual(riders);
    expect(applyZwiftGopherResult(riders, null).riders).toEqual(riders);
  });
});

describe("aantal renners in een TTT-plan", () => {
  it("is 5 bij de ZRL en anders 8", () => {
    expect(tttMaxRiders("zrl")).toBe(5);
    expect(tttMaxRiders("zwift")).toBe(8);
    expect(tttMaxRiders(null)).toBe(8);
  });
});
