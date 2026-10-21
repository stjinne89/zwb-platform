import { describe, expect, it } from "vitest";
import { CTL_ANCHORS, DURABILITY_ANCHORS, RANGES, ZRS_ANCHORS, powerAnchors } from "@/lib/berg/norms";
import {
  clubPercentile,
  consistency,
  durabilityDecline,
  heightFor,
  metersFor,
  rangeFor,
  ridgeMeters,
  selfFrame,
  type BergInput,
} from "@/lib/berg/score";

const EVEREST = 8849;

describe("meterschaal", () => {
  it("geeft bij elke ijkwaarde precies de hoogte van de top van de keten", () => {
    const anchors = powerAnchors("m20", "man");
    anchors.peaks.forEach((peak, index) => {
      expect(metersFor(anchors, peak)).toBeCloseTo(RANGES[index].meters, 6);
    });
    expect(metersFor(anchors, anchors.zero)).toBe(0);
    expect(metersFor(anchors, 0.5)).toBe(0);
  });

  it("stijgt overal mee en heeft geen plafond", () => {
    const anchors = powerAnchors("m5", "man");
    let previous = -1;
    for (let wkg = 0; wkg <= 12; wkg += 0.05) {
      const meters = metersFor(anchors, wkg);
      expect(meters).toBeGreaterThanOrEqual(previous);
      previous = meters;
    }
    expect(metersFor(anchors, 9)).toBeGreaterThan(EVEREST);
    // Boven de Everest lineair door: twee gelijke stappen, twee gelijke winsten.
    const a = metersFor(anchors, 8);
    const b = metersFor(anchors, 8.5);
    const c = metersFor(anchors, 9);
    expect(c - b).toBeCloseTo(b - a, 6);
  });

  it("draait om bij durability: minder verval is hoger", () => {
    expect(metersFor(DURABILITY_ANCHORS, 1.2)).toBeCloseTo(EVEREST, 6);
    expect(metersFor(DURABILITY_ANCHORS, 5)).toBeCloseTo(3404, 6);
    expect(metersFor(DURABILITY_ANCHORS, 20)).toBe(0);
    expect(metersFor(DURABILITY_ANCHORS, 0.5)).toBeGreaterThan(EVEREST);
  });

  it("zet de top van de ZRS-schaal op de Everest", () => {
    expect(metersFor(ZRS_ANCHORS, 1000)).toBeCloseTo(EVEREST, 6);
    expect(metersFor(ZRS_ANCHORS, 0)).toBe(0);
    expect(metersFor(CTL_ANCHORS, 125)).toBeCloseTo(6961, 6);
  });

  it("geeft vrouwen voor hetzelfde vermogen meer hoogte", () => {
    expect(metersFor(powerAnchors("m20", "vrouw"), 4)).toBeGreaterThan(metersFor(powerAnchors("m20", "man"), 4));
    expect(powerAnchors("m20", null)).toEqual(powerAnchors("m20", "man"));
  });
});

describe("ketens", () => {
  it("zet je in de keten waarvan je de top nog niet hebt gehaald", () => {
    expect(rangeFor(4212)).toMatchObject({ range: { name: "Alpen" }, next: { name: "Kaukasus" }, toNext: 594 });
    expect(rangeFor(0)).toMatchObject({ range: { name: "Heuvelland" }, toNext: 322 });
    expect(rangeFor(322)).toMatchObject({ range: { name: "Ardennen" } });
  });

  it("houdt boven de Everest de Himalaya en telt de meters erboven", () => {
    expect(rangeFor(9100)).toMatchObject({ range: { name: "Himalaya" }, next: null, toNext: 0, aboveEverest: 251 });
    expect(rangeFor(8000)).toMatchObject({ range: { name: "Himalaya" }, toNext: 849, aboveEverest: 0 });
  });
});

describe("richtingen en hoogte", () => {
  const rider: BergInput = {
    sex: "man",
    weightKg: 75,
    power: { s15: 12, m1: 7.4, m5: 4.8, m20: 4 },
    fatigue: [{ afterKj: 1500, freshWatts: 300, fatiguedWatts: 285 }],
    ctl: 65,
    zrs: 550,
  };

  it("rekent elke richting om naar meters", () => {
    const ridges = ridgeMeters(rider);
    expect(ridges.explosief).toBeCloseTo(3404, 6);
    expect(ridges.duurvermogen).toBeCloseTo(3404, 6);
    expect(ridges.fitheid).toBeCloseTo(3404, 6);
    expect(ridges.racen).toBeCloseTo(3404, 6);
    // 5% verlies na 20 kJ/kg is 2,5% per 10 kJ/kg.
    expect(durabilityDecline(rider.fatigue, 75)).toBeCloseTo(2.5, 6);
    expect(heightFor(ridges)).toBeGreaterThan(3404);
  });

  it("laat ontbrekende gegevens weg in plaats van ze te verzinnen", () => {
    const ridges = ridgeMeters({ sex: null, weightKg: null, power: null, fatigue: [], ctl: null, zrs: null });
    expect(Object.values(ridges).every((value) => value == null)).toBe(true);
    expect(heightFor(ridges)).toBeNull();
    const one = ridgeMeters({ ...rider, power: null, fatigue: [], zrs: null });
    expect(heightFor(one)).toBeNull();
    expect(ridgeMeters({ ...rider, power: { s15: null, m1: 7.4, m5: null, m20: null } }).duurvermogen).toBeNull();
  });

  it("telt durability pas na genoeg werk, en meer vermogen na het werk als geen verval", () => {
    expect(durabilityDecline([{ afterKj: 500, freshWatts: 300, fatiguedWatts: 250 }], 75)).toBeNull();
    expect(durabilityDecline([{ afterKj: 1500, freshWatts: 300, fatiguedWatts: 310 }], 75)).toBe(0);
    expect(durabilityDecline([{ afterKj: 1500, freshWatts: 300, fatiguedWatts: 285 }], null)).toBeNull();
  });
});

describe("consistentie", () => {
  const today = "2026-10-21";
  const day = (offset: number) => new Date(Date.parse(`${today}T12:00:00Z`) - offset * 86_400_000).toISOString().slice(0, 10);

  it("geeft 1 bij elke week twee ritten zonder uitval", () => {
    const rides = Array.from({ length: 84 }, (_, index) => index).filter((offset) => offset % 3 === 0).map((offset) => ({ day: day(offset), minutes: 60 }));
    expect(consistency(rides, today)).toBe(1);
  });

  it("trekt een vijfde af bij meer dan twee weken uitval", () => {
    const rides = Array.from({ length: 84 }, (_, index) => index)
      .filter((offset) => offset % 2 === 0 && (offset < 20 || offset > 40))
      .map((offset) => ({ day: day(offset), minutes: 60 }));
    // Drie weken zonder rit: negen actieve weken van twaalf, maal 0,8.
    expect(consistency(rides, today)).toBeCloseTo(0.6, 2);
  });

  it("is 0 zonder ritten en negeert ritten buiten de twaalf weken", () => {
    expect(consistency([], today)).toBe(0);
    expect(consistency([{ day: day(100), minutes: 300 }], today)).toBe(0);
  });
});

describe("kaders", () => {
  it("rekent het clubpercentiel met de helft van wie gelijk zit", () => {
    expect(clubPercentile(3000, [1000, 2000, 3000, 4000])).toBe(63);
    expect(clubPercentile(3000, [null, null])).toBeNull();
    expect(clubPercentile(null, [1000])).toBeNull();
  });

  it("vergelijkt met vier weken geleden en het beste van het jaar", () => {
    const history = [2800, 3000, 3100, null, 3050, 3200].map((meters, index) => ({ week: `w${index}`, meters }));
    expect(selfFrame(history)).toEqual({ delta4w: 200, best: 3200, ofBest: 100 });
    expect(selfFrame([{ week: "w0", meters: null }])).toEqual({ delta4w: null, best: null, ofBest: null });
  });
});
