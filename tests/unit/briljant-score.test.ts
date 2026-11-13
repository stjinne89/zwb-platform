import { describe, expect, it } from "vitest";
import {
  CTL_ANCHORS,
  DURABILITY_DURATIONS,
  LEVELS,
  FACET_WEIGHTS,
  ZRS_ANCHORS,
  fatiguedPowerAnchors,
  levelOf,
  powerAnchors,
} from "@/lib/briljant/norms";
import {
  FACETS,
  clubPercentile,
  consistencyFrom,
  durabilityTestPower,
  fatiguedPower,
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
  valueAt,
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
    expect(step).toMatchObject({ kind: "between", lower: { level: 5, value: 3.9 }, upper: { level: 6, value: 4.35 } });
    // 5 + (4,3 − 3,9) ÷ (4,35 − 3,9) = 5,89
    expect(step.level).toBeCloseTo(5 + 0.4 / 0.45, 9);
    expect(scaleStep(powerAnchors("m20", "man"), 7.5)).toMatchObject({ kind: "beyond", lower: { level: 8 }, upper: { level: 9 } });
    expect(scaleStep(powerAnchors("m20", "man"), 0.8)).toMatchObject({ kind: "floor", level: 0 });
  });

  it("leidt de normen voor vermoeid vermogen af uit de verse normen en het verval per niveau", () => {
    // Zonder werk zijn ze de verse normen.
    expect(fatiguedPowerAnchors("m20", "man", 0)).toMatchObject({ zero: 1.3, levels: powerAnchors("m20", "man").levels });
    // Na 20 kJ/kg: Goud (3,05 W/kg vers, 7% per 10 kJ/kg) wordt 3,05 × 0,86 = 2,623.
    const anchors = fatiguedPowerAnchors("m20", "man", 20);
    expect(anchors.levels[2]).toBeCloseTo(2.623, 9);
    // Diamant (5,6 W/kg, 1,5% per 10 kJ/kg) zakt minder: 5,6 × 0,97.
    expect(anchors.levels[8]).toBeCloseTo(5.432, 9);
    expect(anchors.levels.every((value, index) => index === 0 || value > anchors.levels[index - 1])).toBe(true);
    // Vers Goud met Goud-verval is vermoeid ook Goud.
    expect(levelAt(anchors, 3.05 * (1 - 0.07 * 2))).toBeCloseTo(3, 9);
  });

  it("laat ZRS als rechte lijn lopen, los van Zwift's categorieën: elke ZRS een punt", () => {
    expect(levelAt(ZRS_ANCHORS, 900)).toBeCloseTo(9, 9);
    expect(levelAt(ZRS_ANCHORS, 1000)).toBeCloseTo(10, 9);
    expect(levelAt(ZRS_ANCHORS, 640)).toBeCloseTo(6.4, 9);
    // Fitheid naar de spreiding onder renners: 40 is Goud, 100 Diamant, en elke 10
    // CTL daarboven 100 punten (de WorldTour, 150, is 1400).
    expect(levelAt(CTL_ANCHORS, 40)).toBeCloseTo(3, 9);
    expect(levelAt(CTL_ANCHORS, 90)).toBeCloseTo(8, 9);
    expect(levelAt(CTL_ANCHORS, 100)).toBeCloseTo(9, 9);
    expect(levelAt(CTL_ANCHORS, 150)).toBeCloseTo(14, 9);
  });

  it("heeft de tien vELO-klassen, Koper onderaan en Diamant bovenaan", () => {
    expect(LEVELS.map((level) => level.name)).toEqual([
      "Koper", "Brons", "Zilver", "Goud", "Platina", "Amethist", "Saffier", "Smaragd", "Robijn", "Diamant",
    ]);
    expect(LEVELS.every((level, index) => level.n === index)).toBe(true);
    expect(LEVELS[9]).toMatchObject({ color: "#82d5f7", kind: "edelsteen" });
    expect(LEVELS[4]).toMatchObject({ name: "Platina", kind: "metaal" });
    // Diamant drie standaarddeviaties boven het gemiddelde, niet de records.
    expect(powerAnchors("m20", "man").levels[8]).toBe(5.6);
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
    // 274,8 W na 1500 kJ (20 kJ/kg): 3,664 W/kg op 5 en 20 minuten.
    fatigue: DURABILITY_DURATIONS.map((seconds) => ({ afterKj: 1500, seconds, freshWatts: 300, fatiguedWatts: 274.8 })),
    ctl: 78,
    zrs: 640,
  };

  it("rekent elke facet om naar een niveau", () => {
    const levels = facetLevels(rider);
    // Op de spreidingsschaal is dit een sterke amateur: alles boven Amethist.
    expect(levels.sprint).toBeCloseTo(7 + 0.15 / 1.5, 6);
    expect(levels.anaeroob).toBeCloseTo(6 + 0.7 / 0.75, 6);
    expect(levels.vo2max).toBeCloseTo(6.1, 6);
    expect(levels.drempel).toBeCloseTo(5 + 0.4 / 0.45, 6);
    // Vermoeid na 20 kJ/kg: 5 minuten 4 + 0,064 ÷ 0,586, 20 minuten 5 + 0,076 ÷ 0,4836;
    // gemiddeld 4,633, uit ritten voor de helft.
    expect(levels.durability).toBeCloseTo((4 + 0.064 / 0.586 + 5 + 0.076 / 0.4836) / 4, 6);
    expect(levels.fitheid).toBeCloseTo(6.8, 6);
    expect(levels.racen).toBeCloseTo(6.4, 6);
  });

  it("weegt vermogen samen 50%, met 5 minuten het zwaarst", () => {
    expect(Object.values(FACET_WEIGHTS).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 9);
    expect(FACET_WEIGHTS.sprint + FACET_WEIGHTS.anaeroob + FACET_WEIGHTS.vo2max + FACET_WEIGHTS.drempel).toBeCloseTo(0.5, 9);
    // 7,1 × 5% + 6,933 × 10% + 6,1 × 20% + 5,889 × 15% + 2,317 × 17,5%
    // + 6,8 × 20% + 6,4 × 12,5% = 5,72.
    expect(scoreFor(facetLevels(rider), 1)).toBe(5.72);
  });

  it("laat consistentie tot 20% meetellen als factor", () => {
    expect(consistencyFactor(1)).toBe(1);
    expect(consistencyFactor(0)).toBeCloseTo(0.8, 9);
    expect(consistencyFactor(0.55)).toBeCloseTo(0.91, 9);
    // Geen consistentie: de volle straf (eigenaar, 2026-10-25).
    expect(consistencyFactor(null)).toBeCloseTo(0.8, 9);
    // 5,717 × 0,91 = 5,20: op het scherm 520 punten.
    expect(scoreFor(facetLevels(rider), 0.55)).toBe(5.2);
    expect(scoreFor(facetLevels(rider), 1)).toBe(5.72);
  });

  it("telt de gewogen onderdelen op: een ontbrekend onderdeel draagt niets bij", () => {
    const levels = facetLevels({ ...rider, zrs: null });
    // Zonder racen (12,5% × 6,4 = 0,8) zakt de score met precies die bijdrage,
    // in plaats van de rest weer op 100% te zetten.
    expect(scoreFor(levels, 1)).toBe(4.92);
    const sum = FACETS.reduce((total, facet) => total + FACET_WEIGHTS[facet] * (levels[facet] ?? 0), 0);
    expect(scoreFor(levels, 1)).toBe(Math.round(sum * 100) / 100);
  });

  it("geeft pas een score vanaf vier onderdelen", () => {
    // Fitheid en racen alleen (zonder gewicht geen W/kg): geen steen.
    expect(scoreFor(facetLevels({ ...rider, power: null, fatigue: [] }), 1)).toBeNull();
    // Met twee vermogensonderdelen erbij wel.
    expect(scoreFor(facetLevels({ ...rider, power: { s15: null, m1: null, m5: 5.1, m20: 4.3 }, fatigue: [] }), 1)).not.toBeNull();
  });

  it("laat ontbrekende gegevens weg in plaats van ze te verzinnen", () => {
    const empty = facetLevels({ sex: null, weightKg: null, power: null, fatigue: [], ctl: null, zrs: null });
    expect(FACETS.every((facet) => empty[facet] == null)).toBe(true);
    expect(scoreFor(empty, 1)).toBeNull();
    expect(scoreFor(facetLevels({ ...rider, power: null, fatigue: [], zrs: null }), 1)).toBeNull();
    expect(facetReadings({ ...rider, power: { s15: null, m1: 7.6, m5: null, m20: null } }).sprint).toBeNull();
  });

  // Een kJ-stand met op 5 en 20 minuten dezelfde watts, of per duur.
  const stand = (afterKj: number, fresh: number[] | number, fatigued: number[] | number) =>
    DURABILITY_DURATIONS.map((seconds, index) => ({
      afterKj,
      seconds,
      freshWatts: typeof fresh === "number" ? fresh : fresh[index],
      fatiguedWatts: typeof fatigued === "number" ? fatigued : fatigued[index],
    }));

  it("telt durability pas na genoeg werk, op de laagste stand met 5 of 20 minuten", () => {
    // 500 kJ is bij 75 kg 6,7 kJ/kg: te weinig.
    expect(fatiguedPower(stand(500, 300, 250), 75)).toBeNull();
    expect(fatiguedPower(stand(1500, 300, 285), null)).toBeNull();
    expect(fatiguedPower([...stand(2000, 300, 200), ...stand(1500, 300, 285)], 75)).toEqual({
      kjPerKg: 20,
      wkg: { m5: 3.8, m20: 3.8 },
    });
    // Alleen 5 minuten na het werk: dan telt alleen die duur.
    expect(fatiguedPower(stand(1500, 300, 285).slice(0, 1), 75)).toEqual({ kjPerKg: 20, wkg: { m5: 3.8 } });
  });

  // De eigenaar (83 kg) op 2026-10-23, vers en na 1000 kJ op 5 en 20 minuten.
  const ownerFresh = [321, 282];
  const owner1000 = [297, 226];

  it("laat een betere verse waarde durability niet omlaag halen", () => {
    const owner = { ...rider, weightKg: 83 };
    const now = facetReadings({ ...owner, fatigue: stand(1000, ownerFresh, owner1000) }).durability!;
    // 3,58 en 2,72 W/kg na 12,05 kJ/kg: niveau 3,67 en 2,86, gemiddeld 3,27, voor de helft 163 punten.
    expect(points(now.level)).toBe(163);
    expect(now).toMatchObject({ source: "ritten", share: 0.5, fatigued: { m5: 297 / 83, m20: 226 / 83 } });
    // Vers 10% beter, vermoeid gelijk: durability blijft gelijk.
    const fresher = facetReadings({ ...owner, fatigue: stand(1000, [353, 310], owner1000) }).durability!;
    expect(fresher.level).toBeCloseTo(now.level, 12);
    // Vermoeid beter: durability stijgt.
    expect(facetReadings({ ...owner, fatigue: stand(1000, ownerFresh, [310, 240]) }).durability!.level).toBeGreaterThan(now.level);
  });

  it("telt uit ritten voor de helft en uit de test voor het hele punt, zonder plafond", () => {
    // Dezelfde 20 minuten na 1500 kJ, uit ritten en uit de test.
    const rides = facetReadings({ ...rider, fatigue: stand(1500, 300, 300).slice(1) }).durability!;
    const tested = facetReadings({ ...rider, fatigue: [], durabilityTest: { day: "2026-10-20", afterKj: 1500, freshWatts: 300, fatiguedWatts: 300 } })
      .durability!;
    expect(tested).toMatchObject({ source: "test", testDay: "2026-10-20", share: 1 });
    expect(rides.level).toBeCloseTo(tested.level / 2, 12);
    // Ver boven de Diamant-norm loopt de schaal door.
    const strong = facetReadings({ ...rider, fatigue: [], durabilityTest: { day: "2026-10-20", afterKj: 1500, freshWatts: 450, fatiguedWatts: 450 } })
      .durability!;
    expect(strong.level).toBeGreaterThan(9);
  });

  it("laat de test voorgaan op de ritten, ook als hij lager uitvalt", () => {
    // 262 W na 1000 kJ bij 83 kg: 3,16 W/kg na 12,05 kJ/kg, niveau 3,81.
    const test = { day: "2026-10-25", afterKj: 1000, freshWatts: 282, fatiguedWatts: 262 };
    expect(durabilityTestPower(test, 83)).toEqual({ kjPerKg: 1000 / 83, wkg: { m20: 262 / 83 } });
    const reading = facetReadings({ ...rider, weightKg: 83, fatigue: stand(1000, 300, 300), durabilityTest: test }).durability!;
    expect(reading.level).toBeCloseTo(3.8097, 3);
    // Te weinig werk voor het gewicht: geen uitslag, dan weer de ritten.
    expect(durabilityTestPower({ ...test, afterKj: 1000 }, 105)).toBeNull();
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
    const result = consistencyFrom({ weeks })!;
    expect(result).toMatchObject({ streak: 10, normSource: "schema" });
    expect(result.regularity).toBeCloseTo(10 / 12, 2);
    // Naleving: twee weken 1 van 8 uur, tien weken vol.
    expect(result.compliance).toBeCloseTo((2 / 8 + 10) / 12, 2);
    const expected = (10 / 12) * (0.5 + 0.5 * (10 / 12)) * ((2 / 8 + 10) / 12);
    expect(result.value).toBeCloseTo(expected, 2);
  });

  it("geeft volhouden vol bij twaalf weken op rij en lineair minder daaronder", () => {
    const weeks = (streak: number) => [week(0, 0, 8), ...Array.from({ length: streak }, (_, i) => week(1 + i, 8, 8))];
    expect(consistencyFrom({ weeks: weeks(12) })).toMatchObject({ persistence: 1, compliance: 1, value: 1 });
    expect(consistencyFrom({ weeks: weeks(20) })).toMatchObject({ persistence: 1, value: 1 });
    expect(consistencyFrom({ weeks: weeks(6) })!.persistence).toBe(0.5);
  });

  it("telt meer dan de norm als gehaald, nooit als straf, en een herstelweek breekt de reeks niet", () => {
    const weeks = Array.from({ length: 12 }, (_, i) => week(i, i === 6 ? 1 : 20, 6, i === 6));
    expect(consistencyFrom({ weeks })).toMatchObject({ regularity: 1, streak: 12, compliance: 1 });
  });

  it("valt zonder schema terug op de eigen mediaan, en een week ziek breekt de reeks", () => {
    const weeks = [...Array.from({ length: 11 }, (_, i) => week(i, 5)), week(11, 0)];
    const result = consistencyFrom({ weeks })!;
    expect(result).toMatchObject({ measure: "uren", normSource: "mediaan", norm: 5, streak: 0 });
    expect(result.regularity).toBeCloseTo(11 / 12, 2);
    expect(result.compliance).toBeCloseTo(11 / 12, 2);
    expect(result.value).toBeCloseTo((11 / 12) * 0.5 * (11 / 12), 2);
  });

  it("meet de naleving per week in gereden tegen geplande TSS, hooguit 100%", () => {
    // Winter: minder uren dan gepland, maar de geplande TSS wel gereden. Eén week
    // 600 van 400 TSS maakt de week met 200 van 400 niet goed.
    const weeks = Array.from({ length: 12 }, (_, i) => ({
      ...week(i, 4, 6),
      load: i === 10 ? 600 : i === 11 ? 200 : 400,
      plannedLoad: 400,
    }));
    const result = consistencyFrom({ weeks })!;
    expect(result).toMatchObject({ measure: "tss", normSource: "schema" });
    expect(result.compliance).toBeCloseTo((11 + 0.5) / 12, 2);
  });

  it("geeft zonder schema een naleving uit de weken tegen de eigen norm", () => {
    // Mediaan 6 uur; de weken met 3 en 4,5 uur halen de helft en driekwart, meer dan 6 telt als 100%.
    const weeks = [...Array.from({ length: 10 }, (_, i) => week(i, i % 2 ? 6 : 9)), week(10, 3), week(11, 4.5)];
    const result = consistencyFrom({ weeks })!;
    expect(result.norm).toBe(6);
    expect(result.compliance).toBeCloseTo((10 + 0.5 + 0.75) / 12, 2);
    // Wie een schema volgt en wie zonder schema net zo trouw rijdt, komen gelijk uit.
    const planned = Array.from({ length: 12 }, (_, i) => week(i, 6, 6));
    const free = Array.from({ length: 12 }, (_, i) => week(i, 6));
    expect(consistencyFrom({ weeks: planned })!.value).toBe(consistencyFrom({ weeks: free })!.value);
  });

  it("telt ontbrekende weken van een nieuw lid als niet gereden en geeft null zonder norm", () => {
    expect(consistencyFrom({ weeks: [week(0, 4, 4), week(1, 4, 4)] })!.regularity).toBeCloseTo(2 / 12, 2);
    expect(consistencyFrom({ weeks: [week(0, 0)] })).toBeNull();
    expect(consistencyFrom({ weeks: [] })).toBeNull();
  });

  it("meet in TSS als intervals.icu de belasting geeft, en anders in uren", () => {
    // Evenveel uren, maar de laatste week veel lichter: in TSS haal je die niet.
    const weeks = Array.from({ length: 12 }, (_, i) => ({ ...week(i, 8), load: i === 11 ? 150 : 500, plannedLoad: null }));
    const result = consistencyFrom({ weeks })!;
    expect(result).toMatchObject({ measure: "tss", norm: 500, normSource: "mediaan", streak: 0 });
    expect(consistencyFrom({ weeks: weeks.map(({ load, ...rest }) => rest) })).toMatchObject({ measure: "uren", streak: 12 });
    // Met een schema telt de geplande TSS als norm.
    const planned = weeks.map((item) => ({ ...item, plannedLoad: 400 }));
    expect(consistencyFrom({ weeks: planned })).toMatchObject({ measure: "tss", norm: 400, normSource: "schema" });
  });

  it("meet elke week aan wat het schema die week plande, niet aan de beschikbaarheid", () => {
    // De weken van de eigenaar, 27 juli tot en met 12 oktober 2026: gereden en gepland.
    const ridden = [6.9, 5.3, 5.4, 6.1, 0, 6.2, 11.8, 7.6, 5.9, 6.5, 9.2, 6.0];
    const planned = [4.8, 4.8, 6.3, 11.4, 6.8, 5.0, 4.3, 4.5, 7.0, 5.3, 6.1, 6.7];
    const weeks = ridden.map((hours, i) => week(i, hours, planned[i]));
    const result = consistencyFrom({ weeks })!;
    // Alleen de week van 17 augustus (6,1 van 11,4) en die van 24 augustus (niets)
    // missen; sinds 31 augustus zeven weken op rij.
    expect(result).toMatchObject({ streak: 7, normSource: "schema", norm: 5.7 });
    expect(result.regularity).toBeCloseTo(10 / 12, 2);
    // Tegen 11 uur beschikbaarheid (60% = 6,6 uur) waren het er maar vier, zonder reeks.
    const againstAvailability = consistencyFrom({ weeks: ridden.map((hours, i) => week(i, hours, 11)) })!;
    expect(againstAvailability.regularity).toBeCloseTo(4 / 12, 2);
    expect(againstAvailability.streak).toBe(0);
    expect(result.value).toBeGreaterThan(againstAvailability.value * 2);
  });

  it("valt niet op norm 0 bij minder dan de helft van de weken gereden", () => {
    // Twintig van de 52 weken gereden: de mediaan is 0, dus de mediaan van de ritweken (3 uur).
    const weeks = Array.from({ length: 52 }, (_, i) => week(i, i % 52 < 20 ? 3 : 0));
    const result = consistencyFrom({ weeks })!;
    expect(result).toMatchObject({ measure: "uren", norm: 3, streak: 0 });
    expect(result.value).toBe(0);
    // De laatste twaalf weken elke week 3 uur: dan telt elke week.
    const late = Array.from({ length: 52 }, (_, i) => week(i, i >= 32 ? 3 : 0));
    expect(consistencyFrom({ weeks: late })).toMatchObject({ regularity: 1, streak: 20 });
  });

  it("telt in TSS alleen de weken die intervals.icu kent", () => {
    // intervals.icu pas sinds twintig weken, Strava al een jaar: de weken daarvoor zijn geen 0 TSS.
    const weeks = Array.from({ length: 52 }, (_, i) => ({ ...week(i, 5), load: i >= 32 ? 300 : null }));
    expect(consistencyFrom({ weeks })).toMatchObject({ measure: "tss", norm: 300, streak: 20 });
  });

  it("meet in uren als intervals.icu de meeste ritweken mist", () => {
    // Wel een rit in Strava, maar 0 TSS in intervals.icu in acht van de twaalf weken.
    const weeks = Array.from({ length: 12 }, (_, i) => ({ ...week(i, 5), load: i >= 8 ? 300 : 0 }));
    expect(consistencyFrom({ weeks })).toMatchObject({ measure: "uren", norm: 5, streak: 12 });
  });

  it("gebruikt de eigen mediaan alleen voor weken zonder schema", () => {
    const weeks = [week(0, 3, 3), week(1, 3, 3), week(2, 6), week(3, 6), week(4, 2)];
    // Mediaan van de gereden weken is 3: de week met 2 uur zonder schema telt (2 ≥ 1,8).
    expect(consistencyFrom({ weeks })).toMatchObject({ streak: 5 });
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

describe("valueAt", () => {
  it("is het omgekeerde van levelAt, ook voorbij Diamant en bij minder-is-beter", () => {
    for (const anchors of [powerAnchors("m20", "man"), powerAnchors("s15", "vrouw"), CTL_ANCHORS, fatiguedPowerAnchors("m5", "vrouw", 15), ZRS_ANCHORS]) {
      for (const level of [0.4, 1, 3.37, 6.5, 8.99, 9.6]) {
        expect(levelAt(anchors, valueAt(anchors, level))).toBeCloseTo(level, 9);
      }
    }
    expect(valueAt(CTL_ANCHORS, 0)).toBe(CTL_ANCHORS.zero);
  });
});

