import { describe, expect, it } from "vitest";
import { pairUp, powerOverview, riderPower, routeEdge, type AdviceRider } from "@/lib/club-ladder/rank-pairs";
import type { PowerWkg } from "@/lib/club-ladder/team-power";

const wkg = (s15: number, m1: number, m5: number, m20: number): PowerWkg => ({ s15, m1, m5, m20 });
const flat = { s15: [{ pct: 0, share: 1 }], m1: [{ pct: 0, share: 1 }], m5: [{ pct: 0, share: 1 }], m20: [{ pct: 0, share: 1 }] };

function side(name: string, values: PowerWkg[], weightKg: number | null = null): AdviceRider[] {
  return values.map((value, i) => ({ key: `${name}${i}`, name: `${name}${i}`, wkg: value, weightKg, source: "90d" }));
}

describe("pairUp: beste tegen beste", () => {
  it("zet beide kanten op volgorde en middelt de verschillen per paar", () => {
    // Het voorbeeld uit de vraag aan de eigenaar (5 min): +2, +4, −3, −3, −7.
    const result = pairUp([4.31, 4.95, 3.9, 4.79, 4.22], [4.62, 4.45, 4.83, 4.19, 4.37]);
    expect(result.pairs.map((pair) => [pair.ours, pair.theirs])).toEqual([
      [4.95, 4.83],
      [4.79, 4.62],
      [4.31, 4.45],
      [4.22, 4.37],
      [3.9, 4.19],
    ]);
    expect(result.pairs.map((pair) => pair.pct)).toEqual([2, 4, -3, -3, -7]);
    // Gemiddeld over de exacte verschillen −1,56%, dus −2% (de afgeronde paren middelen tot −1,4%).
    expect(result.edge! * 100).toBeCloseTo(-1.56, 2);
    expect(Math.round(result.edge! * 100)).toBe(-2);
  });

  it("maakt zoveel paren als de kleinste kant, en pas vanaf drie telt het", () => {
    expect(pairUp([5, 4, 3, 2], [4, 4, 4, 4, 4]).pairs).toHaveLength(4);
    expect(pairUp([5, 4], [4, 4, 4]).edge).toBeNull();
  });

  it("is niet het verschil van de gemiddelden", () => {
    // Gemiddelde gelijk (4), maar onze beste is veel beter en onze slechtste veel slechter.
    const result = pairUp([5, 4, 3], [4.2, 4, 3.8]);
    expect(result.pairs.map((pair) => pair.pct)).toEqual([17, 0, -24]);
    expect(result.edge!).toBeLessThan(0);
  });
});

describe("routeEdge", () => {
  const base = wkg(11, 6.5, 4.5, 4);

  it("weegt de duren naar het parcours", () => {
    const ours = side("o", Array(5).fill(wkg(10, 6.5, 4.5, 4.4)));
    const theirs = side("z", Array(5).fill(wkg(12, 6.5, 4.5, 4)));
    const climb = routeEdge({ ours, theirs, weights: { s15: 0, m1: 0, m5: 0.5, m20: 0.5 }, terrain: null })!;
    const sprint = routeEdge({ ours, theirs, weights: { s15: 1, m1: 0, m5: 0, m20: 0 }, terrain: null })!;
    expect(Math.round(climb.edge * 100)).toBe(5); // (0 + 10%) / 2
    expect(Math.round(sprint.edge * 100)).toBe(-18);
  });

  it("kiest zonder selectie per parcours onze sterkste vijf", () => {
    const ours = side("o", [wkg(14, 8, 4, 3.2), wkg(14, 8, 4, 3.2), base, base, base, wkg(9, 6, 5.2, 4.6), wkg(9, 6, 5.2, 4.6)]);
    const theirs = side("z", Array(5).fill(base));
    const climb = routeEdge({ ours, theirs, weights: { s15: 0, m1: 0, m5: 0.5, m20: 0.5 }, terrain: null })!;
    const sprint = routeEdge({ ours, theirs, weights: { s15: 0.7, m1: 0.3, m5: 0, m20: 0 }, terrain: null })!;
    expect(climb.five.map((rider) => rider.key)).toEqual(expect.arrayContaining(["o5", "o6"]));
    expect(sprint.five.map((rider) => rider.key)).toEqual(expect.arrayContaining(["o0", "o1"]));
  });

  it("geeft een zware ploeg met gelijke W/kg op het vlakke het voordeel, alleen in de sprint", () => {
    const heavy = routeEdge({ ours: side("o", Array(5).fill(base), 85), theirs: side("z", Array(5).fill(base), 65), weights: { s15: 0.25, m1: 0.25, m5: 0.25, m20: 0.25 }, terrain: flat })!;
    expect(heavy.weightCounts).toBe(true);
    // Een kwart van ~19% sprintvoordeel; 1, 5 en 20 min op het vlakke tellen gewone W/kg.
    expect(heavy.edge).toBeGreaterThan(0.03);
    expect(heavy.edge).toBeLessThan(0.07);
  });

  it("laat wie geen vermogen heeft buiten de paren en noemt hem", () => {
    const ours = [...side("o", Array(4).fill(base)), { key: "gina", name: "Gina", wkg: null, weightKg: null, source: null }];
    const result = routeEdge({ ours, theirs: side("z", Array(5).fill(base)), weights: { s15: 0.25, m1: 0.25, m5: 0.25, m20: 0.25 }, terrain: null })!;
    expect(result.missing).toEqual(["Gina"]);
    expect(result.edge).toBe(0);
  });
});

describe("powerOverview", () => {
  it("geeft per duur de paren in gewone W/kg", () => {
    const overview = powerOverview(side("o", [wkg(10, 6, 4.6, 4), wkg(9, 6, 4.4, 3.9), wkg(9, 6, 4.2, 3.8)]), side("z", Array(3).fill(wkg(9, 6, 4.4, 3.9))));
    const m5 = overview.durations.find((row) => row.duration === "m5")!;
    expect(m5.pairs.map((pair) => pair.pct)).toEqual([4, 0, -5]);
  });
});

describe("riderPower: bron per renner", () => {
  const intervals = { watts: { s15: 900, m1: 450, m5: 300, m20: 260 }, weightKg: 59 };

  it("neemt van ons eerst intervals.icu, gedeeld door het gewicht waarmee Zwift rekent", () => {
    const result = riderPower({ intervals, power90: wkg(10, 6, 4.5, 4), zwiftWeightKg: 60 });
    expect(result.source).toBe("intervals");
    expect(result.wkg).toEqual(wkg(15, 7.5, 5, 4.33));
    expect(result.weightKg).toBe(60);
  });

  it("deelt zonder Zwift-gewicht door het gewicht uit intervals.icu of het profiel", () => {
    const result = riderPower({ intervals, power90: null });
    expect(result.source).toBe("intervals");
    expect(result.wkg!.m5).toBeCloseTo(5.08, 2);
    expect(result.weightKg).toBe(59);
  });

  it("valt terug op 90 dagen en dan op de ladderraces", () => {
    expect(riderPower({ intervals: { ...intervals, weightKg: null }, power90: wkg(10, 6, 4.5, 4) }).source).toBe("90d");
    expect(riderPower({ power90: null, ladder: wkg(9, 5, 4, 3.5) }).source).toBe("ladder");
    expect(riderPower({}).source).toBeNull();
  });
});
