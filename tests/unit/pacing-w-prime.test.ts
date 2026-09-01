import { describe, expect, it } from "vitest";
import {
  deepestDrawPct,
  recoveryTau,
  wPrimeBalance,
  type PowerSegment,
} from "@/lib/pacing/w-prime";

const CP = 280;
const W_PRIME = 20_000;

/** Reeks segmenten van gelijke duur op één vermogen. */
function block(watts: number, seconds: number, startKm = 0): PowerSegment[] {
  const out: PowerSegment[] = [];
  const step = 10;
  for (let t = 0; t < seconds; t += step) {
    out.push({ durationS: step, watts, endKm: startKm + (t + step) / 1000 });
  }
  return out;
}

describe("recoveryTau", () => {
  it("herstelt sneller naarmate je dieper onder CP zit", () => {
    expect(recoveryTau(150)).toBeLessThan(recoveryTau(20));
  });

  it("is bij DCP=0 de bovengrens van de formule", () => {
    expect(recoveryTau(0)).toBeCloseTo(546 + 316, 5);
  });
});

describe("wPrimeBalance", () => {
  it("laat een rit op CP nooit leeglopen", () => {
    const balance = wPrimeBalance(block(CP, 3 * 3600), CP, W_PRIME);
    expect(balance.depletedAtKm).toBeNull();
    expect(balance.minBalanceJ).toBe(W_PRIME);
  });

  it("laat een rit onder CP vol blijven", () => {
    const balance = wPrimeBalance(block(CP - 60, 3600), CP, W_PRIME);
    expect(balance.finalBalanceJ).toBe(W_PRIME);
  });

  it("verbruikt boven CP precies (P - CP) joule per seconde", () => {
    // 100 W boven CP gedurende 60 s = 6000 J.
    const balance = wPrimeBalance(block(CP + 100, 60), CP, W_PRIME);
    expect(balance.finalBalanceJ).toBeCloseTo(W_PRIME - 6000, 0);
  });

  it("trekt de reserve leeg en meldt waar", () => {
    const balance = wPrimeBalance(block(CP + 200, 200, 10), CP, W_PRIME);
    expect(balance.depletedAtKm).not.toBeNull();
    expect(balance.minBalanceJ).toBe(0);
  });

  it("vult bij na een inspanning, maar niet meteen volledig", () => {
    const segments = [...block(CP + 150, 60), ...block(CP - 80, 300, 1)];
    const balance = wPrimeBalance(segments, CP, W_PRIME);
    const afterEffort = balance.balanceBySegment[5];
    expect(afterEffort).toBeLessThan(W_PRIME);
    expect(balance.finalBalanceJ).toBeGreaterThan(afterEffort);
    expect(balance.finalBalanceJ).toBeLessThan(W_PRIME);
  });

  it("gaat nooit boven de volle reserve uit", () => {
    const balance = wPrimeBalance(block(100, 7200), CP, W_PRIME);
    expect(balance.finalBalanceJ).toBeLessThanOrEqual(W_PRIME);
  });

  it("houdt één klim vol, drie achter elkaar niet", () => {
    // 35 W boven CP gedurende acht minuten kost 16,8 kJ van de 20 kJ reserve.
    // Eén keer past; het herstel in de dalen haalt dat er niet op tijd weer in.
    const climb = () => block(CP + 35, 480);
    const rest = (km: number) => block(CP - 100, 600, km);

    const one = wPrimeBalance([...climb(), ...rest(10)], CP, W_PRIME);
    expect(one.depletedAtKm).toBeNull();

    const three = wPrimeBalance(
      [...climb(), ...rest(10), ...climb(), ...rest(30), ...climb()],
      CP,
      W_PRIME,
    );
    expect(three.depletedAtKm).not.toBeNull();
  });
});

describe("deepestDrawPct", () => {
  it("is 0 zonder verbruik en 100 als de reserve leeg raakt", () => {
    const untouched = wPrimeBalance(block(CP, 600), CP, W_PRIME);
    expect(deepestDrawPct(untouched, W_PRIME)).toBe(0);

    const drained = wPrimeBalance(block(CP + 300, 300), CP, W_PRIME);
    expect(deepestDrawPct(drained, W_PRIME)).toBe(100);
  });
});
