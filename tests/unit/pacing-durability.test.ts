import { describe, expect, it } from "vitest";
import {
  buildDurabilityModel,
  cpAfterKj,
  MAX_FADE_FRACTION,
  type FatigueCurve,
} from "@/lib/pacing/durability";
import { wPrimeBalance, type PowerSegment } from "@/lib/pacing/w-prime";

function curve(cp: number, wPrime = 20_000) {
  return [180, 300, 600, 1200].map((seconds) => ({
    seconds,
    watts: cp + wPrime / seconds,
  }));
}

const FATIGUE: FatigueCurve[] = [
  { afterKj: 0, points: curve(300) },
  { afterKj: 1500, points: curve(276) },
];

describe("buildDurabilityModel", () => {
  it("leidt af hoeveel CP zakt met het verzette werk", () => {
    const model = buildDurabilityModel(FATIGUE, 300)!;
    expect(model.anchors[0]).toEqual({ kj: 0, factor: 1 });
    expect(model.anchors[1].kj).toBe(1500);
    expect(model.anchors[1].factor).toBeCloseTo(0.92, 2);
    expect(model.maxFadePct).toBeCloseTo(8, 0);
  });

  it("geeft null zonder bruikbare curves", () => {
    expect(buildDurabilityModel(null, 300)).toBeNull();
    expect(buildDurabilityModel([], 300)).toBeNull();
    expect(buildDurabilityModel([{ afterKj: 0, points: [] }], 300)).toBeNull();
  });

  it("vult een ontbrekend nulpunt aan", () => {
    const model = buildDurabilityModel([{ afterKj: 1200, points: curve(270) }], 300)!;
    expect(model.anchors[0].kj).toBe(0);
    expect(model.anchors[0].factor).toBe(1);
  });

  it("laat CP nooit stijgen met meer werk", () => {
    // Een fit die zegt dat je ná 1500 kJ sterker bent, is ruis.
    const model = buildDurabilityModel(
      [
        { afterKj: 0, points: curve(280) },
        { afterKj: 1500, points: curve(320) },
      ],
      280,
    )!;
    expect(model.anchors[1].factor).toBeLessThanOrEqual(model.anchors[0].factor);
  });

  it("begrenst een onwaarschijnlijk diepe afname", () => {
    const model = buildDurabilityModel(
      [
        { afterKj: 0, points: curve(300) },
        { afterKj: 2000, points: curve(150) },
      ],
      300,
    )!;
    expect(model.anchors[1].factor).toBeGreaterThanOrEqual(1 - MAX_FADE_FRACTION);
  });
});

describe("buildDurabilityModel met de eigen beste inspanningen", () => {
  // Echte vorm: de curve na 1000 kJ zakt 25 %, maar het lid reed wel 30 min op 310 W.
  const WEARY: FatigueCurve[] = [{ afterKj: 1000, points: curve(226) }];
  const BEST = [
    { seconds: 1800, watts: 310 },
    { seconds: 3600, watts: 262 },
  ];

  const survives = (model: ReturnType<typeof buildDurabilityModel>, watts: number, seconds: number) =>
    wPrimeBalance([{ durationS: seconds, watts, endKm: 1 }], 302, 16_000, {
      cpAfterKj: (kj) => cpAfterKj(model, 302, kj),
    }).depletedAtKm === null;

  it("noemt een inspanning die het lid echt reed niet onmogelijk", () => {
    expect(survives(buildDurabilityModel(WEARY, 302), 310, 1800)).toBe(false);
    const model = buildDurabilityModel(WEARY, 302, { curve: BEST, wPrimeJoules: 16_000 });
    for (const effort of BEST) expect(survives(model, effort.watts, effort.seconds)).toBe(true);
  });

  it("houdt de gemeten afname op de kJ-drempel als niets die tegenspreekt", () => {
    const model = buildDurabilityModel(WEARY, 302, { curve: BEST, wPrimeJoules: 16_000 })!;
    expect(cpAfterKj(model, 302, 1000)).toBeCloseTo(302 * 0.75, 0);
    expect(model.maxFadePct).toBeCloseTo(25, 0);
  });

  it("tilt de drempel op als een inspanning daar voorbij gaat", () => {
    const model = buildDurabilityModel(WEARY, 302, {
      curve: [{ seconds: 5400, watts: 270 }],
      wPrimeJoules: 16_000,
    })!;
    // 270 W × 90 min = 1458 kJ, dus ook bij 1000 kJ lag CP minstens op 267 W.
    expect(cpAfterKj(model, 302, 1000)).toBeGreaterThanOrEqual(267);
    expect(survives(model, 270, 5400)).toBe(true);
  });

  it("laat CP dalend met het werk", () => {
    const model = buildDurabilityModel(WEARY, 302, { curve: BEST, wPrimeJoules: 16_000 })!;
    for (let i = 1; i < model.anchors.length; i++) {
      expect(model.anchors[i].kj).toBeGreaterThan(model.anchors[i - 1].kj);
      expect(model.anchors[i].factor).toBeLessThanOrEqual(model.anchors[i - 1].factor);
    }
  });

  it("gaat nooit boven de verse CP", () => {
    const model = buildDurabilityModel(WEARY, 302, {
      curve: [{ seconds: 1800, watts: 400 }],
      wPrimeJoules: 16_000,
    })!;
    expect(Math.max(...model.anchors.map((anchor) => anchor.factor))).toBeLessThanOrEqual(1);
  });
});

describe("cpAfterKj", () => {
  const model = buildDurabilityModel(FATIGUE, 300)!;

  it("geeft het uitgeruste CP bij nul werk", () => {
    expect(cpAfterKj(model, 300, 0)).toBeCloseTo(300, 5);
  });

  it("interpoleert tussen de ankerpunten", () => {
    const halfway = cpAfterKj(model, 300, 750);
    expect(halfway).toBeLessThan(300);
    expect(halfway).toBeGreaterThan(cpAfterKj(model, 300, 1500));
  });

  it("extrapoleert niet voorbij het laatste ankerpunt", () => {
    expect(cpAfterKj(model, 300, 5000)).toBeCloseTo(cpAfterKj(model, 300, 1500), 5);
  });

  it("laat CP met rust zonder model", () => {
    expect(cpAfterKj(null, 300, 3000)).toBe(300);
  });
});

describe("wPrimeBalance met duurzaamheid", () => {
  const model = buildDurabilityModel(FATIGUE, 300)!;

  function block(watts: number, seconds: number): PowerSegment[] {
    const out: PowerSegment[] = [];
    for (let t = 0; t < seconds; t += 10) {
      out.push({ durationS: 10, watts, endKm: (t + 10) / 100 });
    }
    return out;
  }

  it("telt het verzette werk op", () => {
    // 300 W gedurende 1000 s = 300 kJ.
    const balance = wPrimeBalance(block(300, 1000), 300, 20_000);
    expect(balance.totalKj).toBeCloseTo(300, 0);
  });

  it("maakt hetzelfde tempo later in de rit zwaarder", () => {
    const segments = block(292, 4 * 3600);

    const zonder = wPrimeBalance(segments, 300, 20_000);
    const met = wPrimeBalance(segments, 300, 20_000, {
      cpAfterKj: (kj) => cpAfterKj(model, 300, kj),
    });

    // Zonder duurzaamheid zit 292 W netjes onder CP en gebeurt er niets.
    expect(zonder.depletedAtKm).toBeNull();
    expect(zonder.finalBalanceJ).toBe(20_000);
    // Met duurzaamheid zakt CP onder die 292 W en loopt de reserve leeg.
    expect(met.finalCpWatts).toBeLessThan(300);
    expect(met.finalBalanceJ).toBeLessThan(20_000);
  });

  it("verandert niets aan een korte rit", () => {
    const segments = block(250, 600);
    const zonder = wPrimeBalance(segments, 300, 20_000);
    const met = wPrimeBalance(segments, 300, 20_000, {
      cpAfterKj: (kj) => cpAfterKj(model, 300, kj),
    });
    expect(met.finalBalanceJ).toBeCloseTo(zonder.finalBalanceJ, 5);
  });
});
