import { describe, expect, it } from "vitest";
import { lonLatToBlock } from "@/lib/zwblokken/grid";
import { REGIONS, regionByCode, regionForBlock } from "@/lib/zwblokken/regions";

/** Handige wrapper: van coördinaat naar regio, via het blok. */
function regionAt(lat: number, lon: number) {
  const { x, y } = lonLatToBlock(lat, lon);
  return regionForBlock(x, y);
}

describe("regionForBlock", () => {
  it("wijst Nederlandse plekken aan land én provincie toe", () => {
    expect(regionAt(50.8654, 5.8319)).toEqual({
      country: "NL",
      province: "NL-LI",
    }); // Cauberg
    expect(regionAt(52.0907, 5.1214)).toEqual({
      country: "NL",
      province: "NL-UT",
    }); // Utrecht
    expect(regionAt(53.2012, 5.7999)).toEqual({
      country: "NL",
      province: "NL-FR",
    }); // Leeuwarden
    expect(regionAt(51.4416, 5.4697)).toEqual({
      country: "NL",
      province: "NL-NB",
    }); // Eindhoven
  });

  it("herkent omringende landen zonder provincie", () => {
    expect(regionAt(50.8467, 4.3517)).toEqual({
      country: "BE",
      province: null,
    }); // Brussel
    expect(regionAt(50.9375, 6.9603)).toEqual({
      country: "DE",
      province: null,
    }); // Keulen
    expect(regionAt(48.8566, 2.3522)).toEqual({
      country: "FR",
      province: null,
    }); // Parijs
  });

  it("rekent de Canarische Eilanden tot Spanje", () => {
    // ZWB rijdt daar; die blokken horen bij Spanje, niet bij niets.
    expect(regionAt(28.2916, -16.6291).country).toBe("ES"); // Tenerife
    expect(regionAt(27.9202, -15.5474).country).toBe("ES"); // Gran Canaria
  });

  it("geeft niets terug buiten Europa en op zee", () => {
    expect(regionAt(37.7749, -122.4194)).toEqual({
      country: null,
      province: null,
    }); // San Francisco
    expect(regionAt(54.0, 3.0)).toEqual({ country: null, province: null }); // Noordzee
  });
});

describe("regio-noemers", () => {
  it("kent alle twaalf provincies", () => {
    const provinces = REGIONS.filter((r) => r.level === "province");
    expect(provinces).toHaveLength(12);
    expect(provinces.every((p) => p.blocks > 0)).toBe(true);
  });

  it("laat de provincies samen ongeveer op Nederland uitkomen", () => {
    // Onafhankelijk gerasterd, dus een klein verschil op de grenzen is normaal.
    const sum = REGIONS.filter((r) => r.level === "province").reduce(
      (total, p) => total + p.blocks,
      0,
    );
    const nl = regionByCode("NL")!.blocks;
    expect(Math.abs(sum - nl) / nl).toBeLessThan(0.02);
  });

  it("heeft blokaantallen die kloppen met de werkelijke oppervlakte", () => {
    // Een blok is op onze breedte ~1,5 km in het vierkant, dus ~2,27 km².
    // Gelderland is ~5.136 km², dus ergens rond de 2.260 blokken.
    const gelderland = regionByCode("NL-GE")!.blocks;
    const km2 = gelderland * 2.27;
    expect(km2).toBeGreaterThan(4600);
    expect(km2).toBeLessThan(5700);
  });
});
