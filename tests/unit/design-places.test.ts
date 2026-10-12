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
    expect(placeForPath("/beheer/rechten")).toBe("meer");
  });

  it("kiest de langste passende route", () => {
    // /profiel hoort bij Meer, maar de segmenten eronder bij Club.
    expect(placeForPath("/profiel")).toBe("meer");
    expect(placeForPath("/profiel/segments/collecties")).toBe("club");
  });

  it("matcht alleen op hele padsegmenten", () => {
    expect(placeForPath("/clubhuis")).toBe("vandaag");
  });

  it("valt terug op Vandaag", () => {
    expect(placeForPath("/onbekend")).toBe("vandaag");
  });
});
