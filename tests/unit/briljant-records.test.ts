import { describe, expect, it } from "vitest";
import { recordView } from "@/lib/briljant/records";

describe("recordsteen", () => {
  it("zet elk onderdeel op de recordwaarde: precies Diamant", () => {
    const { view, holders } = recordView("man");
    expect(view.facets.map((facet) => facet.key)).toEqual(["sprint", "anaeroob", "vo2max", "drempel", "durability", "fitheid", "racen"]);
    expect(view.facets.every((facet) => facet.points === 900)).toBe(true);
    expect(view.points).toBe(900);
    expect(view.level.name).toBe("Diamant");
    expect(view.facets.find((facet) => facet.key === "drempel")!.value).toBe("7,1 W/kg");
    expect(holders.drempel).toBe("Tadej Pogačar");
  });

  it("gebruikt voor vrouwen hun eigen recordwaarden, zonder houders", () => {
    const { view, holders } = recordView("vrouw");
    expect(view.points).toBe(900);
    expect(view.facets.find((facet) => facet.key === "drempel")!.value).toBe("6,05 W/kg");
    expect(holders).toEqual({});
  });
});
