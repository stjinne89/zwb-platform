import { describe, expect, it } from "vitest";
import { recordView } from "@/lib/briljant/records";

describe("recordsteen", () => {
  it("ligt ver boven Diamant: de schaal loopt na 900 door", () => {
    const { view, holders } = recordView("man");
    expect(view.facets.map((facet) => facet.key)).toEqual(["sprint", "anaeroob", "vo2max", "drempel", "durability", "fitheid", "racen"]);
    expect(view.facets.every((facet) => facet.points >= 1000)).toBe(true);
    expect(view.points).toBe(1150);
    expect(view.level.name).toBe("Diamant");
    expect(view.facets.find((facet) => facet.key === "drempel")).toMatchObject({ value: "7,1 W/kg", points: 1275 });
    expect(holders.drempel).toBe("Tadej Pogačar");
  });

  it("gebruikt voor vrouwen hun eigen records, zonder houders", () => {
    const { view, holders } = recordView("vrouw");
    expect(view.points).toBe(1142);
    expect(view.facets.find((facet) => facet.key === "drempel")!.value).toBe("6,05 W/kg");
    expect(holders).toEqual({});
  });
});
