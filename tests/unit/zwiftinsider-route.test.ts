import { describe, expect, it } from "vitest";
import {
  routeFromZwiftInsiderUrl,
  zwiftInsiderSlug,
} from "@/lib/zwift/zwiftinsider-route";

describe("zwiftInsiderSlug", () => {
  it("haalt de slug uit een routelink", () => {
    expect(zwiftInsiderSlug("https://zwiftinsider.com/route/downtown-titans/")).toBe(
      "downtown-titans",
    );
    expect(zwiftInsiderSlug("  zwiftinsider.com/route/Lady-Liberty?ref=x ")).toBe(
      "lady-liberty",
    );
  });

  it("negeert andere links", () => {
    expect(zwiftInsiderSlug("https://zwiftinsider.com/crr/")).toBeNull();
    expect(zwiftInsiderSlug("https://zwift.com/events/view/123")).toBeNull();
  });
});

describe("routeFromZwiftInsiderUrl", () => {
  it("vult naam, wereld en afstand uit de catalogus", () => {
    const route = routeFromZwiftInsiderUrl("https://zwiftinsider.com/route/lady-liberty");
    expect(route).toEqual({ name: "Lady Liberty", world: "New York", distanceKm: 12.4 });
  });

  it("geeft null voor een onbekende route", () => {
    expect(routeFromZwiftInsiderUrl("https://zwiftinsider.com/route/bestaat-niet")).toBeNull();
  });
});
