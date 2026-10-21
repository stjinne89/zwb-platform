import { describe, expect, it } from "vitest";
import { CTL_ANCHORS, DURABILITY_ANCHORS, LEVELS, FACET_WEIGHTS, ZRS_ANCHORS, levelOf, powerAnchors } from "@/lib/briljant/norms";
import {
  FACETS,
  clubPercentile,
  consistencyFrom,
  durabilityDecline,
  effectiveWeights,
  consistencyFactor,
  formatScore,
  levelAt,
  points,
  positionFor,
  facetLevels,
  facetReadings,
  scaleStep,
  scoreFor,
  selfFrame,
  type BriljantInput,
  type ConsistencyWeek,
} from "@/lib/briljant/score";

describe("schaal", () => {
  it("geeft bij elke ijkwaarde precies dat niveau", () => {
    const anchors = powerAnchors("m20", "man");
    anchors.levels.forEach((value, index) => expect(levelAt(anchors, value)).toBeCloseTo(index + 1, 9));
    expect(levelAt(anchors, anchors.zero)).toBe(0);
    expect(levelAt(anchors, 0.5)).toBe(0);
  });

  it("stijgt overal mee en heeft geen plafond", () => {
    const anchors = powerAnchors("m5", "man");
    let previous = -1;
    for (let wkg = 0; wkg <= 12; wkg += 0.05) {
      const level = levelAt(anchors, wkg);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
    expect(levelAt(anchors, 9)).toBeGreaterThan(9);
    const a = levelAt(anchors, 8);
    const b = levelAt(anchors, 8.5);
    const c = levelAt(anchors, 9);
    expect(c - b).toBeCloseTo(b - a, 9);
  });

  it("geeft het stuk van de schaal voor de formule op het scherm", () => {
    const step = scaleStep(powerAnchors("m20", "man"), 4.3);
    expect(step).toMatchObject({ kind: "between", lower: { level: 4, value: 4 }, upper: { level: 5, value: 4.6 } });
    // 4 + (4,3 − 4,0) ÷ (4,6 − 4,0) = 4,5
    expect(step.level).toBeCloseTo(4.5, 9);
    expect(scaleStep(powerAnchors("m20", "man"), 7.5)).toMatchObject({ kind: "beyond", lower: { level: 8 }, upper: { level: 9 } });
    expect(scaleStep(powerAnchors("m20", "man"), 0.8)).toMatchObject({ kind: "floor", level: 0 });
  });

  it("draait om bij durability: minder verval is beter", () => {
    expect(levelAt(DURABILITY_ANCHORS, 1.2)).toBeCloseTo(8, 9);
    expect(levelAt(DURABILITY_ANCHORS, 0.7)).toBeCloseTo(9, 9);
    expect(levelAt(DURABILITY_ANCHORS, 5)).toBeCloseTo(4, 9);
    expect(levelAt(DURABILITY_ANCHORS, 20)).toBe(0);
    expect(levelAt(DURABILITY_ANCHORS, 0.5)).toBeGreaterThan(9);
  });

  it("laat ZRS als rechte lijn lopen, los van Zwift's categorieën: 1000 is Diamant", () => {
    expect(levelAt(ZRS_ANCHORS, 1000)).toBeCloseTo(9, 9);
    expect(levelAt(ZRS_ANCHORS, 640)).toBeCloseTo(5.76, 4);
    expect(levelAt(ZRS_ANCHORS, 333)).toBeCloseTo(3, 2);
    expect(levelAt(CTL_ANCHORS, 180)).toBeCloseTo(9, 9);
  });

  it("heeft de tien vELO-klassen, Koper onderaan en Diamant bovenaan", () => {
    expect(LEVELS.map((level) => level.name)).toEqual([
      "Koper", "Brons", "Zilver", "Goud", "Platina", "Amethist", "Saffier", "Smaragd", "Robijn", "Diamant",
    ]);
    expect(LEVELS.every((level, index) => level.n === index)).toBe(true);
    expect(LEVELS[9]).toMatchObject({ color: "#82d5f7", kind: "edelsteen" });
    expect(LEVELS[4]).toMatchObject({ name: "Platina", kind: "metaal" });
    expect(powerAnchors("m20", "man").levels[8]).toBe(7.1);
  });

  it("vindt de klasse bij een niveau, ook onder 1 en voorbij 9", () => {
    expect(levelOf(0.4).name).toBe("Koper");
    expect(levelOf(4.27).name).toBe("Platina");
    expect(levelOf(5).name).toBe("Amethist");
    expect(levelOf(10.2).name).toBe("Diamant");
    expect(levelOf(-1).name).toBe("Koper");
  });

  it("geeft vrouwen voor hetzelfde vermogen een hoger niveau", () => {
    expect(levelAt(powerAnchors("m20", "vrouw"), 4)).toBeGreaterThan(levelAt(powerAnchors("m20", "man"), 4));
    expect(powerAnchors("m20", null)).toEqual(powerAnchors("m20", "man"));
  });
});

describe("niveaus", () => {
  it("noemt het gehaalde niveau en hoeveel punten er nog moeten", () => {
    expect(positionFor(4.55)).toEqual({ reached: LEVELS[4], next: LEVELS[5], toNext: 45 });
    expect(positionFor(0.6)).toEqual({ reached: LEVELS[0], next: LEVELS[1], toNext: 40 });
    expect(positionFor(5)).toMatchObject({ reached: { name: "Amethist" } });
  });

  it("telt voorbij Diamant gewoon door", () => {
    expect(positionFor(8.3)).toEqual({ reached: LEVELS[8], next: LEVELS[9], toNext: 70 });
    expect(positionFor(9.3)).toEqual({ reached: LEVELS[9], next: null, toNext: 0 });
    expect(formatScore(10.2)).toBe("1.020");
  });

  it("toont punten, 100 per niveau, zonder naar boven af te ronden", () => {
    expect(points(4.55)).toBe(455);
    expect(points(4.999)).toBe(499);
    expect(points(5)).toBe(500);
    expect(points(-1)).toBe(0);
    expect(formatScore(4.55)).toBe("455");
  });
});

describe("facetten en score", () => {
  // Het voorbeeld van de eigenaar (man), uit de fork van 2026-10-21.
  const rider: BriljantInput = {
    sex: "man",
    weightKg: 75,
    power: { s15: 13.2, m1: 7.6, m5: 5.1, m20: 4.3 },
    // 4,2% per 10 kJ/kg: 8,4% verlies na 20 kJ/kg.
    fatigue: [{ afterKj: 1500, freshWatts: 300, fatiguedWatts: 274.8 }],
    ctl: 78,
    zrs: 640,
  };

  it("rekent elke facet om naar een niveau", () => {
    const levels = facetLevels(rider);
    expect(levels.sprint).toBeCloseTo(4.8, 6);
    expect(levels.anaeroob).toBeCloseTo(4.25, 6);
    expect(levels.vo2max).toBeCloseTo(4.4286, 4);
    expect(levels.drempel).toBeCloseTo(4.5, 6);
    expect(levels.durability).toBeCloseTo(4.5714, 4);
    expect(levels.fitheid).toBeCloseTo(4.65, 6);
    expect(levels.racen).toBeCloseTo(5.76, 4);
  });

  it("weegt de facetten naar de literatuur: 5 minuten het zwaarst, fitheid het lichtst", () => {
    expect(Object.values(FACET_WEIGHTS).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 9);
    expect(FACET_WEIGHTS.sprint + FACET_WEIGHTS.anaeroob + FACET_WEIGHTS.vo2max + FACET_WEIGHTS.drempel).toBeCloseTo(0.6, 9);
    // 4,8 × 7,5% + 4,25 × 12,5% + 4,4286 × 22,5% + 4,5 × 17,5% + 4,5714 × 15%
    // + 4,65 × 10% + 5,76 × 15% = 4,6899.
    expect(scoreFor(facetLevels(rider))).toBe(4.69);
  });

  it("laat consistentie tot 20% meetellen als factor", () => {
    expect(consistencyFactor(1)).toBe(1);
    expect(consistencyFactor(0)).toBeCloseTo(0.8, 9);
    expect(consistencyFactor(0.55)).toBeCloseTo(0.91, 9);
    // Geen ritgegevens: ontbrekende gegevens kosten niets.
    expect(consistencyFactor(null)).toBe(1);
    // 4,6899 × 0,91 = 4,27: op het scherm 427 punten.
    expect(scoreFor(facetLevels(rider), 0.55)).toBe(4.27);
    expect(scoreFor(facetLevels(rider), 1)).toBe(4.69);
  });

  it("normaliseert de gewichten opnieuw als een facet ontbreekt", () => {
    const levels = facetLevels({ ...rider, zrs: null });
    const weights = effectiveWeights(levels);
    expect(weights.racen).toBeUndefined();
    expect(weights.durability).toBeCloseTo(0.15 / 0.85, 9);
    expect(Object.values(weights).reduce((sum, weight) => sum + weight!, 0)).toBeCloseTo(1, 9);
  });

  it("laat ontbrekende gegevens weg in plaats van ze te verzinnen", () => {
    const empty = facetLevels({ sex: null, weightKg: null, power: null, fatigue: [], ctl: null, zrs: null });
    expect(FACETS.every((facet) => empty[facet] == null)).toBe(true);
    expect(scoreFor(empty)).toBeNull();
    expect(scoreFor(facetLevels({ ...rider, power: null, fatigue: [], zrs: null }))).toBeNull();
    expect(facetReadings({ ...rider, power: { s15: null, m1: 7.6, m5: null, m20: null } }).sprint).toBeNull();
  });

  it("telt durability pas na genoeg werk, en meer vermogen na het werk als geen verval", () => {
    expect(durabilityDecline([{ afterKj: 500, freshWatts: 300, fatiguedWatts: 250 }], 75)).toBeNull();
    expect(durabilityDecline([{ afterKj: 1500, freshWatts: 300, fatiguedWatts: 310 }], 75)).toBe(0);
    expect(durabilityDecline([{ afterKj: 1500, freshWatts: 300, fatiguedWatts: 285 }], null)).toBeNull();
  });

});

describe("consistentie", () => {
  const week = (index: number, hours: number, plannedHours: number | null = null, plannedRecovery = false): ConsistencyWeek => ({
    monday: `w${index}`,
    hours,
    plannedHours,
    plannedRecovery,
  });

  it("rekent R × (0,5 + 0,5 · V) × N", () => {
    // Twee gemiste weken vooraan in het venster, daarna tien op rij gehaald.
    const weeks = [week(0, 8, 8), week(1, 1, 8), week(2, 1, 8), ...Array.from({ length: 10 }, (_, i) => week(3 + i, 8, 8))];
    const result = consistencyFrom({ weeks, compliance: 0.85 })!;
    expect(result).toMatchObject({ streak: 10, compliance: 0.85, normSource: "schema" });
    expect(result.regularity).toBeCloseTo(10 / 12, 2);
    const expected = (10 / 12) * (0.5 + 0.5 * (1 - Math.exp(-10 / 12))) * 0.85;
    expect(result.value).toBeCloseTo(expected, 2);
  });

  it("geeft 0,64 bij R 0,83, V 0,81 en N 0,85 (rekenvoorbeeld van de eigenaar)", () => {
    const value = (10 / 12) * (0.5 + 0.5 * (1 - Math.exp(-20 / 12))) * 0.85;
    expect(Math.round(value * 100) / 100).toBe(0.64);
  });

  it("telt meer dan de norm als gehaald, nooit als straf, en een herstelweek breekt de reeks niet", () => {
    const weeks = Array.from({ length: 12 }, (_, i) => week(i, i === 6 ? 1 : 20, 6, i === 6));
    expect(consistencyFrom({ weeks, compliance: null })).toMatchObject({ regularity: 1, streak: 12, compliance: null });
  });

  it("valt zonder schema terug op de eigen mediaan, en een week ziek breekt de reeks", () => {
    const weeks = [...Array.from({ length: 11 }, (_, i) => week(i, 5)), week(11, 0)];
    const result = consistencyFrom({ weeks, compliance: null })!;
    expect(result).toMatchObject({ normSource: "mediaan", normHours: 5, streak: 0 });
    expect(result.regularity).toBeCloseTo(11 / 12, 2);
    expect(result.value).toBeCloseTo((11 / 12) * 0.5, 2);
  });

  it("telt ontbrekende weken van een nieuw lid als niet gereden en geeft null zonder norm", () => {
    expect(consistencyFrom({ weeks: [week(0, 4, 4), week(1, 4, 4)], compliance: null })!.regularity).toBeCloseTo(2 / 12, 2);
    expect(consistencyFrom({ weeks: [week(0, 0)], compliance: null })).toBeNull();
    expect(consistencyFrom({ weeks: [], compliance: null })).toBeNull();
  });

  it("meet elke week aan wat het schema die week plande, niet aan de beschikbaarheid", () => {
    // De weken van de eigenaar, 27 juli tot en met 12 oktober 2026: gereden en gepland.
    const ridden = [6.9, 5.3, 5.4, 6.1, 0, 6.2, 11.8, 7.6, 5.9, 6.5, 9.2, 6.0];
    const planned = [4.8, 4.8, 6.3, 11.4, 6.8, 5.0, 4.3, 4.5, 7.0, 5.3, 6.1, 6.7];
    const weeks = ridden.map((hours, i) => week(i, hours, planned[i]));
    const result = consistencyFrom({ weeks, compliance: 0.79 })!;
    // Alleen de week van 17 augustus (6,1 van 11,4) en die van 24 augustus (niets)
    // missen; sinds 31 augustus zeven weken op rij.
    expect(result).toMatchObject({ streak: 7, normSource: "schema", normHours: 5.7 });
    expect(result.regularity).toBeCloseTo(10 / 12, 2);
    // Tegen 11 uur beschikbaarheid (60% = 6,6 uur) waren het er maar vier, zonder reeks.
    const againstAvailability = consistencyFrom({ weeks: ridden.map((hours, i) => week(i, hours, 11)), compliance: 0.79 })!;
    expect(againstAvailability.regularity).toBeCloseTo(4 / 12, 2);
    expect(againstAvailability.streak).toBe(0);
    expect(result.value).toBeGreaterThan(againstAvailability.value * 2);
  });

  it("gebruikt de eigen mediaan alleen voor weken zonder schema", () => {
    const weeks = [week(0, 3, 3), week(1, 3, 3), week(2, 6), week(3, 6), week(4, 2)];
    // Mediaan van de gereden weken is 3: de week met 2 uur zonder schema telt (2 ≥ 1,8).
    expect(consistencyFrom({ weeks, compliance: null })).toMatchObject({ streak: 5 });
  });

});

describe("kaders", () => {
  it("rekent het clubpercentiel met de helft van wie gelijk zit", () => {
    expect(clubPercentile(3, [1, 2, 3, 4])).toBe(63);
    expect(clubPercentile(3, [null, null])).toBeNull();
    expect(clubPercentile(null, [1])).toBeNull();
  });

  it("vergelijkt met vier weken geleden en het beste van het jaar", () => {
    const history = [2.8, 3, 3.1, null, 3.05, 3.2].map((score, index) => ({ week: `w${index}`, score }));
    expect(selfFrame(history)).toEqual({ delta4w: 0.2, best: 3.2, ofBest: 100 });
    expect(selfFrame([{ week: "w0", score: null }])).toEqual({ delta4w: null, best: null, ofBest: null });
  });
});
