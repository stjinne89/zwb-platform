import { describe, expect, it } from "vitest";
import {
  CP_FTP_FRACTION,
  DEFAULT_W_PRIME_J,
  fitCpWPrime,
  resolveCpWPrime,
} from "@/lib/pacing/cp";

/** Curve die exact op P = CP + W'/t ligt, zodat de fit terug moet komen. */
function syntheticCurve(cp: number, wPrime: number, durations: number[]) {
  return durations.map((seconds) => ({ seconds, watts: cp + wPrime / seconds }));
}

describe("fitCpWPrime", () => {
  it("vindt CP en W' terug uit een curve die het model volgt", () => {
    const fit = fitCpWPrime(syntheticCurve(280, 22_000, [180, 300, 600, 1200]));
    expect(fit).not.toBeNull();
    expect(fit!.cpWatts).toBe(280);
    expect(fit!.wPrimeJoules).toBe(22_000);
  });

  it("negeert punten buiten het geldige venster", () => {
    // De sprintpunten liggen ver boven het model; als ze meetelden zou W' door
    // het dak gaan en CP kelderen.
    const curve = [
      { seconds: 15, watts: 1100 },
      { seconds: 60, watts: 520 },
      ...syntheticCurve(280, 22_000, [180, 300, 600, 1200]),
      { seconds: 3600, watts: 250 },
    ];
    const fit = fitCpWPrime(curve);
    expect(fit!.cpWatts).toBe(280);
    expect(fit!.wPrimeJoules).toBe(22_000);
  });

  it("geeft null bij te weinig bruikbare punten", () => {
    expect(fitCpWPrime(syntheticCurve(280, 22_000, [300, 600]))).toBeNull();
    expect(fitCpWPrime([])).toBeNull();
    expect(fitCpWPrime(null)).toBeNull();
  });

  it("weigert een fit die fysiologisch nergens op slaat", () => {
    // Vlakke curve: iedereen levert overal 250 W → W' wordt 0.
    const flat = [180, 300, 600, 1200].map((seconds) => ({ seconds, watts: 250 }));
    expect(fitCpWPrime(flat)).toBeNull();

    // Curve die te steil daalt → W' boven de bovengrens.
    expect(fitCpWPrime(syntheticCurve(200, 90_000, [180, 300, 600, 1200]))).toBeNull();
  });

  it("geeft null als alle punten dezelfde duur hebben", () => {
    const same = [1, 2, 3].map(() => ({ seconds: 300, watts: 300 }));
    expect(fitCpWPrime(same)).toBeNull();
  });
});

describe("resolveCpWPrime", () => {
  it("gebruikt intervals.icu als beide waarden er staan", () => {
    const model = resolveCpWPrime({
      storedCpWatts: 291,
      storedWPrimeJoules: 19_400,
      curvePoints: syntheticCurve(280, 22_000, [180, 300, 600, 1200]),
      ftpWatts: 300,
      weightKg: 72,
    });
    expect(model).toMatchObject({ cpWatts: 291, wPrimeJoules: 19_400, source: "intervals" });
  });

  it("valt terug op de curve als intervals maar half gevuld is", () => {
    const model = resolveCpWPrime({
      storedCpWatts: 291,
      storedWPrimeJoules: null,
      curvePoints: syntheticCurve(280, 22_000, [180, 300, 600, 1200]),
      weightKg: 72,
    });
    expect(model.source).toBe("curve");
    expect(model.cpWatts).toBe(280);
  });

  it("valt terug op FTP als er geen bruikbare curve is", () => {
    const model = resolveCpWPrime({ ftpWatts: 300, weightKg: 72 });
    expect(model.source).toBe("ftp");
    expect(model.cpWatts).toBe(Math.round(300 * CP_FTP_FRACTION));
    expect(model.wPrimeJoules).toBe(DEFAULT_W_PRIME_J);
  });

  it("houdt een los opgeslagen W' vast bij de FTP-terugval", () => {
    const model = resolveCpWPrime({
      ftpWatts: 300,
      storedWPrimeJoules: 25_000,
      weightKg: 72,
    });
    expect(model.wPrimeJoules).toBe(25_000);
  });

  it("levert ook zonder enige data een bruikbaar model", () => {
    const model = resolveCpWPrime({});
    expect(model.source).toBe("schatting");
    expect(model.weightKg).toBe(75);
    expect(model.cpWatts).toBeGreaterThan(150);
    expect(model.cpWatts).toBeLessThan(350);
  });
});
