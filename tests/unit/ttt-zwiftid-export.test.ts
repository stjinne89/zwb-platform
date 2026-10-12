import { describe, expect, it } from "vitest";
import { zwiftIdExport } from "@/lib/ttt/zwiftgopher";
import type { TttPlanRiderInput } from "@/lib/ttt/types";

function rider(patch: Partial<TttPlanRiderInput>): TttPlanRiderInput {
  return {
    profileId: null,
    isManual: false,
    zwiftId: "",
    name: "Renner",
    ftpWatts: 250,
    weightKg: 75,
    heightCm: null,
    power300Watts: 320,
    pullWatts: 250,
    pullDurationSeconds: 30,
    displayOrder: 0,
    role: null,
    notes: null,
    ...patch,
  };
}

describe("zwiftIdExport", () => {
  it("geeft de ID's in planvolgorde, één per regel", () => {
    const result = zwiftIdExport([
      rider({ zwiftId: "222", displayOrder: 1 }),
      rider({ zwiftId: " 111 ", displayOrder: 0 }),
      rider({ zwiftId: "333", displayOrder: 2 }),
    ]);
    expect(result).toEqual({ text: "111\n222\n333", count: 3, missing: [] });
  });

  it("noemt renners zonder numeriek Zwift-ID en slaat dubbele ID's over", () => {
    const result = zwiftIdExport([
      rider({ zwiftId: "111", displayOrder: 0 }),
      rider({ zwiftId: "", name: "Gast 1", isManual: true, displayOrder: 1 }),
      rider({ zwiftId: "abc", name: "Piet", displayOrder: 2 }),
      rider({ zwiftId: "111", displayOrder: 3 }),
    ]);
    expect(result).toEqual({ text: "111", count: 1, missing: ["Gast 1", "Piet"] });
  });

  it("geeft een lege tekst bij een leeg plan", () => {
    expect(zwiftIdExport([])).toEqual({ text: "", count: 0, missing: [] });
  });
});
