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

  it("wijst provincies en deelstaten in de buurlanden toe", () => {
    expect(regionAt(50.8467, 4.3517)).toEqual({
      country: "BE",
      province: "BE-BRU",
    }); // Brussel
    expect(regionAt(50.9307, 5.3378)).toEqual({
      country: "BE",
      province: "BE-VLI",
    }); // Hasselt
    expect(regionAt(50.9375, 6.9603)).toEqual({
      country: "DE",
      province: "DE-NW",
    }); // Keulen
    expect(regionAt(49.6116, 6.1319)).toEqual({
      country: "LU",
      province: "LU-L",
    }); // Luxemburg-stad
    expect(regionAt(45.9237, 6.8694)).toEqual({
      country: "FR",
      province: "FR-ARA",
    }); // Chamonix
  });

  it("voegt Franse departementen samen tot regio's", () => {
    expect(regionAt(48.8566, 2.3522).province).toBe("FR-IDF"); // Parijs
    expect(regionAt(48.4047, 2.7016).province).toBe("FR-IDF"); // Fontainebleau
    expect(regionAt(50.6292, 3.0573).province).toBe("FR-HDF"); // Rijsel
    expect(regionAt(49.8941, 2.2958).province).toBe("FR-HDF"); // Amiens
  });

  it("geeft een blok alleen een provincie uit het eigen land", () => {
    // Grensgebied Baarle en Zuid-Limburg: land- en provinciegrenzen komen uit
    // twee lagen, maar de provincie moet altijd bij het land passen.
    const coords: [number, number][] = [];
    for (let lat = 50.75; lat <= 51.5; lat += 0.01) {
      for (let lon = 4.8; lon <= 6.1; lon += 0.02) coords.push([lat, lon]);
    }
    for (const [lat, lon] of coords) {
      const { country, province } = regionAt(lat, lon);
      if (province) expect(province.startsWith(`${country}-`)).toBe(true);
    }
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
  const provincesOf = (country: string) =>
    REGIONS.filter(
      (r) => r.level === "province" && r.code.startsWith(`${country}-`),
    );

  it("kent alle provincies, deelstaten en regio's", () => {
    expect(provincesOf("NL")).toHaveLength(12);
    expect(provincesOf("BE")).toHaveLength(11); // tien provincies en Brussel
    expect(provincesOf("LU")).toHaveLength(3);
    expect(provincesOf("DE")).toHaveLength(16);
    expect(provincesOf("FR")).toHaveLength(13); // Europees Frankrijk, met Corsica
    expect(
      REGIONS.filter((r) => r.level === "province").every((p) => p.blocks > 0),
    ).toBe(true);
  });

  it("laat de provincies samen ongeveer op hun land uitkomen", () => {
    // Onafhankelijk gerasterd, dus een klein verschil op de grenzen is normaal.
    // Frankrijk niet: het land telt de overzeese gebieden mee, de regio's niet.
    for (const country of ["NL", "BE", "LU", "DE"]) {
      const sum = provincesOf(country).reduce((t, p) => t + p.blocks, 0);
      const total = regionByCode(country)!.blocks;
      expect(Math.abs(sum - total) / total).toBeLessThan(0.02);
    }
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
