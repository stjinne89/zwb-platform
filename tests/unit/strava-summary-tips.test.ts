import { describe, expect, it } from "vitest";
import {
  TIP_VARIANTS,
  rideTip,
  tipSituation,
  type TipInput,
} from "@/lib/training/strava-summary-tips";

const BASE: TipInput = {
  activityId: 3,
  hasPlan: true,
  plannedIntensity: "threshold",
  detectedIntensity: "threshold",
  loadPct: 8,
  readinessLevel: 4,
  fitnessTrend: "stable",
  nextLevel: "Amethist",
  toNext: 73,
  growFacet: "Sprint",
};

describe("tipSituation", () => {
  it("gaat eerst over moe en toch hard", () => {
    expect(tipSituation({ ...BASE, readinessLevel: 2, loadPct: 40 })).toBe("moe-hard");
    // Rustig rijden met een lage gereedscore is precies goed: geen waarschuwing.
    expect(tipSituation({ ...BASE, readinessLevel: 1, detectedIntensity: "endurance" })).not.toBe("moe-hard");
  });

  it("ziet een rit die twee stappen zwaarder was dan gepland", () => {
    expect(tipSituation({ ...BASE, plannedIntensity: "endurance", loadPct: 40 })).toBe("harder-dan-type");
    expect(tipSituation({ ...BASE, plannedIntensity: "tempo", loadPct: 8 })).not.toBe("harder-dan-type");
  });

  it("deelt de belasting in rond het plan", () => {
    expect(tipSituation({ ...BASE, loadPct: 15 })).toBe("boven-plan");
    expect(tipSituation({ ...BASE, loadPct: -15 })).toBe("onder-plan");
    expect(tipSituation({ ...BASE, loadPct: -5 })).toBe("volgens-plan");
    expect(tipSituation({ ...BASE, loadPct: 0 })).toBe("volgens-plan");
  });

  it("noemt de volgende klasse pas vlak ervoor en met een facet", () => {
    expect(tipSituation({ ...BASE, toNext: 30 })).toBe("bijna-klasse");
    expect(tipSituation({ ...BASE, toNext: 31 })).toBe("algemeen");
    expect(tipSituation({ ...BASE, toNext: 10, growFacet: null })).toBe("algemeen");
    expect(tipSituation({ ...BASE, toNext: 0, nextLevel: null })).toBe("algemeen");
  });

  it("valt terug op fitheid, vrije rit en algemeen", () => {
    const loose = { ...BASE, loadPct: null, toNext: null, nextLevel: null };
    expect(tipSituation({ ...loose, fitnessTrend: "improving" })).toBe("fitheid-stijgt");
    expect(tipSituation({ ...loose, fitnessTrend: "declining" })).toBe("fitheid-zakt");
    expect(tipSituation({ ...loose, fitnessTrend: "unknown", hasPlan: false, plannedIntensity: null })).toBe("vrije-rit");
    expect(tipSituation({ ...loose, fitnessTrend: "unknown" })).toBe("algemeen");
  });
});

describe("rideTip", () => {
  it("vult de plaatshouders in, met hoofdletter aan het begin van een zin", () => {
    expect(
      rideTip({ ...BASE, activityId: 0, plannedIntensity: "endurance", loadPct: 40 }),
    ).toBe("Duur gepland, drempel gereden. Het schema was vandaag meer een suggestie.");
    expect(rideTip({ ...BASE, activityId: 0, loadPct: -20 })).toBe(
      "20% onder plan. Ook een halve training is een training.",
    );
    expect(rideTip({ ...BASE, activityId: 1, toNext: 18, nextLevel: "Saffier" })).toBe(
      "Saffier is nog 18 punten weg. Met Sprint kom je er het snelst.",
    );
  });

  it("kiest de variant op het ritnummer, stabiel bij een nieuwe poging", () => {
    const tips = [0, 1, 2].map((activityId) => rideTip({ ...BASE, activityId, loadPct: 0 }));
    expect(new Set(tips).size).toBe(3);
    expect(rideTip({ ...BASE, activityId: 3, loadPct: 0 })).toBe(tips[0]);
  });

  it("laat geen plaatshouder of verboden teken achter", () => {
    for (const [situation, variants] of Object.entries(TIP_VARIANTS)) {
      for (const template of variants) {
        expect(template, situation).not.toMatch(/[!;—–]/);
      }
    }
    for (let activityId = 0; activityId < 3; activityId++) {
      for (const input of [
        { ...BASE, activityId, readinessLevel: 1 },
        { ...BASE, activityId, plannedIntensity: "recovery" },
        { ...BASE, activityId, loadPct: 25 },
        { ...BASE, activityId, loadPct: -25 },
        { ...BASE, activityId, toNext: 5 },
      ]) {
        expect(rideTip(input)).not.toMatch(/[{}]/);
      }
    }
  });
});
