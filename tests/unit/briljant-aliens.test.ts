import { describe, expect, it } from "vitest";
import { ALIENS, MIN_ALIEN_MEASUREMENTS, SHOWN_ALIENS, alienView } from "@/lib/briljant/aliens";

describe("Aliens", () => {
  it("laat alleen renners met minstens vier onderdelen meedoen, elk met een bron", () => {
    for (const alien of SHOWN_ALIENS) {
      const measurements = Object.values(alien.power);
      expect(measurements.length).toBeGreaterThanOrEqual(MIN_ALIEN_MEASUREMENTS);
      for (const measurement of measurements) expect(measurement!.source).toMatch(/^https:\/\//);
    }
    expect(SHOWN_ALIENS.length).toBe(ALIENS.filter((alien) => Object.keys(alien.power).length >= 4).length);
  });

  it("maakt een steen met alleen de vermogensonderdelen", () => {
    const view = alienView(SHOWN_ALIENS.find((alien) => alien.id === "alien-van-der-poel")!);
    expect(view.facets.map((facet) => facet.key)).toEqual(["sprint", "anaeroob", "vo2max", "drempel"]);
    expect(view.consistency).toBeNull();
    expect(view.facets[0].value).toBe("15,16 W/kg");
    expect(view.points).toBeGreaterThan(700);
  });
});
