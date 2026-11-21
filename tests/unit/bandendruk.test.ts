import { describe, expect, it } from "vitest";
import {
  HOOKLESS_MAX_BAR,
  MIN_BAR,
  bandendruk,
  bertoPsi,
  standaardWegdek,
  type BandSetup,
} from "@/lib/materiaal/bandendruk";

const SETUP: BandSetup = {
  voorBreedteMm: 28,
  achterBreedteMm: 28,
  voorGemetenMm: null,
  achterGemetenMm: null,
  bandType: "binnenband",
  hookless: false,
  fietsKg: 8,
  maxBar: null,
};

describe("bertoPsi", () => {
  it("volgt de regressie op Berto's 15 %-lijnen", () => {
    // Met de hand: 37,35 kg = 82,34 lb; 28^1,5785 = 192,48;
    // 153,6 × 82,34 / 192,48 − 7,1685 = 58,54 psi.
    expect(bertoPsi(37.35, 28)).toBeCloseTo(58.54, 1);
  });

  it("geeft een bredere band een lagere druk", () => {
    expect(bertoPsi(45, 32)).toBeLessThan(bertoPsi(45, 25));
  });
});

describe("bandendruk", () => {
  it("rekent 83 kg op 28 mm uit als 4,0 voor en 5,0 achter", () => {
    const druk = bandendruk({ renKg: 75, setup: SETUP, wegdek: "asfalt", nat: false });
    expect(druk.voor).toEqual({ bar: 4, psi: 58, begrensd: false });
    expect(druk.achter).toEqual({ bar: 5, psi: 73, begrensd: false });
  });

  it("neemt de gemeten breedte boven de breedte op de band", () => {
    const opBand = bandendruk({ renKg: 75, setup: SETUP, wegdek: "asfalt", nat: false });
    const gemeten = bandendruk({
      renKg: 75,
      setup: { ...SETUP, achterGemetenMm: 30.5 },
      wegdek: "asfalt",
      nat: false,
    });
    expect(gemeten.achter.bar).toBeLessThan(opBand.achter.bar);
    expect(gemeten.voor.bar).toBe(opBand.voor.bar);
  });

  it("zet de druk lager voor slecht wegdek, tubeless en nat", () => {
    const basis = bandendruk({ renKg: 75, setup: SETUP, wegdek: "asfalt", nat: false }).achter.bar;
    expect(bandendruk({ renKg: 75, setup: SETUP, wegdek: "klinkers", nat: false }).achter.bar).toBeLessThan(basis);
    expect(
      bandendruk({ renKg: 75, setup: { ...SETUP, bandType: "tubeless" }, wegdek: "asfalt", nat: false }).achter.bar,
    ).toBeLessThan(basis);
    expect(bandendruk({ renKg: 75, setup: SETUP, wegdek: "asfalt", nat: true }).achter.bar).toBeLessThan(basis);
  });

  it("gaat bij hookless niet boven 5 bar en meldt dat", () => {
    const druk = bandendruk({
      renKg: 95,
      setup: { ...SETUP, voorBreedteMm: 25, achterBreedteMm: 25, hookless: true },
      wegdek: "asfalt",
      nat: false,
    });
    expect(druk.achter.bar).toBe(HOOKLESS_MAX_BAR);
    expect(druk.achter.begrensd).toBe(true);
  });

  it("houdt het laagste maximum van band of velg aan", () => {
    const druk = bandendruk({ renKg: 75, setup: { ...SETUP, maxBar: 4.5 }, wegdek: "asfalt", nat: false });
    expect(druk.achter.bar).toBe(4.5);
    expect(druk.voor.begrensd).toBe(false);
  });

  it("zakt niet onder de ondergrens, ook niet met een brede band en weinig gewicht", () => {
    const druk = bandendruk({
      renKg: 40,
      setup: { ...SETUP, voorBreedteMm: 70, achterBreedteMm: 70, fietsKg: 10 },
      wegdek: "onverhard",
      nat: true,
    });
    expect(druk.voor.bar).toBeGreaterThanOrEqual(MIN_BAR);
  });
});

describe("standaardWegdek", () => {
  it("kiest onverhard voor gravel en mtb en asfalt voor de racefiets", () => {
    expect(standaardWegdek("gravel")).toBe("onverhard");
    expect(standaardWegdek("mtb")).toBe("onverhard");
    expect(standaardWegdek("race")).toBe("asfalt");
    expect(standaardWegdek(null)).toBe("asfalt");
  });
});
