import { describe, expect, it } from "vitest";
import {
  cadans,
  hoek,
  knieBuiging,
  maskerPixels,
  mediaan,
  mmPerPixel,
  naarCsv,
  pixelsNaarM2,
  rompHoek,
  uiterstenPerOmwenteling,
  veelhoekOppervlak,
  type Monster,
} from "@/lib/houding/meting";

describe("hoeken", () => {
  it("rekent een rechte hoek en een gestrekt been", () => {
    expect(hoek({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90);
    expect(knieBuiging({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 })).toBeCloseTo(0);
  });

  it("geeft 35° kniebuiging bij een knie die 35° uit lijn staat", () => {
    const r = (35 * Math.PI) / 180;
    const knie = { x: 0, y: 0 };
    const heup = { x: 0, y: -1 };
    const enkel = { x: Math.sin(r), y: Math.cos(r) };
    expect(knieBuiging(heup, knie, enkel)).toBeCloseTo(35);
  });

  it("meet de romp tegen de horizontaal, met beeld-y naar beneden", () => {
    expect(rompHoek({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0);
    expect(rompHoek({ x: 0, y: 0 }, { x: 10, y: -10 })).toBeCloseTo(45);
    expect(rompHoek({ x: 0, y: 0 }, { x: -10, y: -10 })).toBeCloseTo(45);
  });

  it("geeft NaN bij samenvallende punten", () => {
    expect(hoek({ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 2 })).toBeNaN();
  });
});

describe("oppervlak en schaal", () => {
  it("rekent het oppervlak van een vierkant en een driehoek", () => {
    const vierkant = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(veelhoekOppervlak(vierkant)).toBe(100);
    expect(veelhoekOppervlak([...vierkant].reverse())).toBe(100);
    expect(veelhoekOppervlak([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }])).toBe(6);
    expect(veelhoekOppervlak([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
  });

  it("telt maskerpixels boven de drempel", () => {
    expect(maskerPixels([0, 0.4, 0.6, 1, 0.5])).toBe(2);
  });

  it("rekent een stuur van 420 mm over 300 px om naar m²", () => {
    const schaal = mmPerPixel({ x: 100, y: 200 }, { x: 400, y: 200 }, 420);
    expect(schaal).toBeCloseTo(1.4);
    // 200 000 px² · (1,4 mm)² = 0,392 m²
    expect(pixelsNaarM2(200_000, schaal!)).toBeCloseTo(0.392);
    expect(mmPerPixel({ x: 1, y: 1 }, { x: 1, y: 1 }, 420)).toBeNull();
  });
});

describe("omwentelingen", () => {
  // Kniebuiging als sinus tussen 35° en 110° bij 90 omw/min, 30 beelden/s.
  function sinus(seconden: number, ruis = 0): Monster[] {
    const uit: Monster[] = [];
    for (let i = 0; i < seconden * 30; i++) {
      const t = (i * 1000) / 30;
      const fase = (t / 1000) * 1.5 * 2 * Math.PI;
      const v = 72.5 - 37.5 * Math.cos(fase) + (i % 2 ? ruis : -ruis);
      uit.push({ t, v });
    }
    return uit;
  }

  it("vindt per omwenteling het dal en de top", () => {
    const { minima, maxima } = uiterstenPerOmwenteling(sinus(10));
    // 15 omwentelingen; de eerste en laatste zijn half.
    expect(minima.length).toBeGreaterThanOrEqual(13);
    expect(maxima.length).toBeGreaterThanOrEqual(13);
    expect(mediaan(minima.map((m) => m.v))).toBeCloseTo(35, 0);
    expect(mediaan(maxima.map((m) => m.v))).toBeCloseTo(110, 0);
    expect(cadans(minima)).toBeCloseTo(90, 0);
  });

  it("telt ruis niet als extra omwenteling", () => {
    const { minima } = uiterstenPerOmwenteling(sinus(10, 3));
    expect(cadans(minima)).toBeCloseTo(90, 0);
  });

  it("geeft niets bij een vlak signaal of te weinig monsters", () => {
    expect(uiterstenPerOmwenteling([{ t: 0, v: 40 }, { t: 1, v: 41 }]).minima).toEqual([]);
    const vlak = Array.from({ length: 100 }, (_, i) => ({ t: i, v: 40 + (i % 2) }));
    expect(uiterstenPerOmwenteling(vlak).minima).toEqual([]);
  });
});

describe("hulpjes", () => {
  it("rekent de mediaan en negeert NaN", () => {
    expect(mediaan([3, 1, 2])).toBe(2);
    expect(mediaan([4, 1, 2, 3])).toBe(2.5);
    expect(mediaan([Number.NaN])).toBeNull();
  });

  it("maakt CSV met puntkomma's en decimale komma's", () => {
    expect(naarCsv([{ a: 1.5, b: "x;y" }, { a: 2, c: null }])).toBe('a;b;c\n1,5;"x;y";\n2;;');
  });
});
