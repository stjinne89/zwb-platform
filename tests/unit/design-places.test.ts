import { describe, expect, it } from "vitest";
import { PLACES, placeForPath } from "@/lib/design-places";

describe("placeForPath", () => {
  it("geeft elke plek zijn eigen startpagina", () => {
    for (const place of PLACES) expect(placeForPath(place.href)).toBe(place.id);
  });

  it("legt subroutes onder de juiste plek", () => {
    expect(placeForPath("/events/abc/pacing")).toBe("kalender");
    expect(placeForPath("/zwbeter-worden/schema")).toBe("zwbeter");
    expect(placeForPath("/teams/ttt-planner")).toBe("club");
  });

  it("kiest de langste passende route", () => {
    // /profiel hoort bij geen plek, maar de segmenten eronder bij Club.
    expect(placeForPath("/profiel")).toBeNull();
    expect(placeForPath("/profiel/segments/collecties")).toBe("club");
  });

  it("matcht alleen op hele padsegmenten", () => {
    expect(placeForPath("/clubhuis")).toBeNull();
  });

  it("geeft geen plek voor het persoonlijke menu en beheer", () => {
    for (const path of ["/mijn-garage", "/hulp", "/sponsors", "/beheer/rechten"]) {
      expect(placeForPath(path)).toBeNull();
    }
  });
});
