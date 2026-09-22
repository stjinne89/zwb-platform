import { describe, expect, it } from "vitest";
import { routeSegments } from "@/lib/zwift/route-segments";

describe("routeSegments", () => {
  it("geeft Montmartre Mixer in rijvolgorde, met herhaalde segmenten", () => {
    expect(routeSegments(1247427185)?.map((s) => s.name)).toEqual([
      "Lutece Sprint",
      "Monceau Sprint",
      "Église Sprint",
      "Monceau Sprint",
      "Montmartre KOM",
      "Montmartre KOM",
      "Tchou Tchou Sprint",
    ]);
  });

  it("herhaalt de segmenten per ronde en kent onbekende routes niet", () => {
    expect(routeSegments(1247427185, 2)).toHaveLength(14);
    expect(routeSegments(123)).toBeNull();
  });
});
