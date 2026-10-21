import { describe, expect, it } from "vitest";
import type { BriljantInput, ConsistencyWeek } from "@/lib/briljant/score";
import { briljantView, formatMeasure } from "@/lib/briljant/view";

// Het voorbeeld van de eigenaar (man), zoals in briljant-score.test.ts.
const rider: BriljantInput = {
  sex: "man",
  weightKg: 75,
  power: { s15: 13.2, m1: 7.6, m5: 5.1, m20: 4.3 },
  fatigue: [{ afterKj: 1500, freshWatts: 300, fatiguedWatts: 274.8 }],
  ctl: 78,
  zrs: 640,
};

const week = (index: number, hours: number): ConsistencyWeek => ({ monday: `w${index}`, hours, plannedHours: 8, plannedRecovery: false });

describe("briljantView", () => {
  it("geeft score, klasse en de volgende klasse in punten", () => {
    const view = briljantView({ seed: "lid", input: rider, consistency: null });
    expect(view.score).toBe(4.69);
    expect(view.points).toBe(469);
    expect(view.profilePoints).toBe(469);
    expect(view.level.name).toBe("Platina");
    expect(view.next?.name).toBe("Amethist");
    expect(view.toNext).toBe(31);
    expect(view.facets.map((facet) => facet.key)).toEqual([
      "sprint", "anaeroob", "vo2max", "drempel", "durability", "fitheid", "racen",
    ]);
    expect(view.missing).toEqual([]);
  });

  it("maakt de steen kleiner met de consistentiefactor", () => {
    // Tien van twaalf weken gehaald, tien op rij, zonder schema.
    const weeks = [week(0, 8), week(1, 1), week(2, 1), ...Array.from({ length: 10 }, (_, i) => week(3 + i, 8))];
    const view = briljantView({ seed: "lid", input: rider, consistency: { weeks, compliance: 0.85 } });
    expect(view.consistency).toMatchObject({ hitWeeks: 10, weeks: 12, streak: 10, compliance: 0.85, normSource: "schema" });
    expect(view.consistency!.factor).toBeCloseTo(0.8 + 0.2 * view.consistency!.value, 9);
    expect(view.points).toBeLessThan(view.profilePoints);
  });

  it("toont de meting als balk tussen de grenzen van de klassen", () => {
    const sprint = briljantView({ seed: "lid", input: rider, consistency: null }).facets[0];
    expect(sprint).toMatchObject({ value: "13,2 W/kg", points: 480, level: { name: "Platina" } });
    expect(sprint.meter).toMatchObject({ from: "12,0 W/kg", to: "13,5 W/kg", fromLevel: { name: "Platina" }, toLevel: { name: "Amethist" } });
    expect(sprint.meter.share).toBeCloseTo(0.8, 6);
    expect(sprint.meter.note).toBe("nog 0,3 W/kg meer tot Amethist");
  });

  it("zegt bij durability 'minder' en meet racen over de hele schaal", () => {
    const view = briljantView({ seed: "lid", input: rider, consistency: null });
    const durability = view.facets.find((facet) => facet.key === "durability")!;
    expect(durability.lowerIsBetter).toBe(true);
    expect(durability.meter.note).toMatch(/minder tot Amethist$/);
    const racen = view.facets.find((facet) => facet.key === "racen")!;
    expect(racen.meter).toMatchObject({ from: "0 ZRS", to: "1.000 ZRS", fromLevel: null, toLevel: null, note: "64% van de schaal" });
  });

  it("verdeelt de gewichten opnieuw als een onderdeel ontbreekt", () => {
    const view = briljantView({ seed: "lid", input: { ...rider, zrs: null }, consistency: null });
    expect(view.missing).toEqual(["racen"]);
    expect(view.facets.reduce((sum, facet) => sum + facet.weight, 0)).toBeCloseTo(1, 9);
  });

  it("geeft geen score bij te weinig gegevens", () => {
    const view = briljantView({
      seed: "lid",
      input: { sex: null, weightKg: null, power: null, fatigue: [], ctl: 50, zrs: null },
      consistency: null,
    });
    expect(view.score).toBeNull();
    expect(view.level.name).toBe("Koper");
  });

  it("rekent het verschil met vier weken geleden in punten", () => {
    const history = Array.from({ length: 12 }, (_, i) => ({ week: `w${i}`, score: i === 8 ? 4.5 : null }));
    const view = briljantView({ seed: "lid", input: rider, consistency: null, history });
    expect(view.delta4w).toBe(19);
  });

  it("schrijft metingen in de eenheid van het onderdeel", () => {
    expect(formatMeasure("fitheid", 78.4)).toBe("78 TSS/dag");
    expect(formatMeasure("durability", 4.2)).toBe("4,2 % per 10 kJ/kg");
  });
});
