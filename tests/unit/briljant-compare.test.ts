import { describe, expect, it } from "vitest";
import { MIN_FOR_AVERAGE, clubAverage, snapshotAt, viewFromSnapshot, type StoredSnapshot } from "@/lib/briljant/compare";
import type { BriljantInput } from "@/lib/briljant/score";
import { LEVELS } from "@/lib/briljant/norms";
import { bestWins } from "@/lib/briljant/view";

const snap = (week: string, score: number | null, facets: StoredSnapshot["facets"] = { sprint: 5, drempel: 4 }): StoredSnapshot => ({
  week,
  score,
  facets,
  consistency: 0.8,
});

// Het voorbeeld van de eigenaar (man), zoals in briljant-view.test.ts.
const rider: BriljantInput = {
  sex: "man",
  weightKg: 75,
  power: { s15: 13.2, m1: 7.6, m5: 5.1, m20: 4.3 },
  fatigue: [{ afterKj: 1500, freshWatts: 300, fatiguedWatts: 274.8 }],
  ctl: 78,
  zrs: 640,
};

describe("snapshotAt", () => {
  const history = [snap("2026-09-14", 4.2), snap("2026-09-07", 4.0), snap("2026-09-21", null), snap("2026-09-28", 4.5)];

  it("neemt de laatste week op of vóór de datum, en slaat weken zonder score over", () => {
    expect(snapshotAt(history, "2026-09-16")?.week).toBe("2026-09-14");
    expect(snapshotAt(history, "2026-09-14")?.week).toBe("2026-09-14");
    expect(snapshotAt(history, "2026-09-25")?.week).toBe("2026-09-14");
    expect(snapshotAt(history, "2026-10-20")?.week).toBe("2026-09-28");
  });

  it("valt vóór de eerste week terug op de eerste, en geeft null zonder score", () => {
    expect(snapshotAt(history, "2026-01-01")?.week).toBe("2026-09-07");
    expect(snapshotAt([snap("2026-09-07", null)], "2026-09-10")).toBeNull();
  });
});

describe("viewFromSnapshot", () => {
  it("toont punten en klassen zonder metingen, met de balk in punten", () => {
    const view = viewFromSnapshot({ seed: "lid", snapshot: snap("2026-09-14", 4.37, { sprint: 5.25, drempel: 3.9 }), source: "week van 14 september" });
    expect(view.points).toBe(437);
    expect(view.level).toBe(LEVELS[4]);
    expect(view.facets.map((facet) => facet.key)).toEqual(["sprint", "drempel"]);
    const sprint = view.facets[0];
    expect(sprint).toMatchObject({ value: "", points: 525, source: "week van 14 september" });
    expect(sprint.meter).toMatchObject({ from: "500 punten", to: "600 punten", toLevel: LEVELS[6], note: `nog 75 punten tot ${LEVELS[6].name}` });
    expect(sprint.meter.share).toBeCloseTo(0.25, 9);
    expect(view.consistency).toMatchObject({ value: 0.8, hitWeeks: null, streak: null, normHours: null });
    expect(view.delta4w).toBeNull();
  });
});

describe("clubAverage", () => {
  it("geeft pas vanaf vijf leden met een score een gemiddelde", () => {
    const four = Array.from({ length: MIN_FOR_AVERAGE - 1 }, (_, i) => snap("2026-10-19", 4 + i / 10));
    expect(clubAverage(four)).toBeNull();
    expect(clubAverage([...four, snap("2026-10-19", null)])).toBeNull();
  });

  it("middelt per facet over wie dat facet heeft", () => {
    const members = [
      snap("2026-10-12", 4, { sprint: 4, drempel: 3 }),
      snap("2026-10-19", 5, { sprint: 6, drempel: null }),
      snap("2026-10-19", 6, { sprint: 5 }),
      snap("2026-10-19", 3, { sprint: 3, drempel: 5 }),
      snap("2026-10-19", 2, { sprint: 2 }),
    ];
    const average = clubAverage(members)!;
    expect(average.members).toBe(5);
    expect(average.score).toBe(4);
    expect(average.facets.sprint).toBe(4);
    expect(average.facets.drempel).toBe(4);
    expect(average.facets.racen).toBeNull();
    expect(average.consistency).toBe(0.8);
    expect(average.week).toBe("2026-10-19");
  });
});

describe("bestWins", () => {
  it("rekent per onderdeel uit wat 5% beter oplevert, van meeste naar minste winst", () => {
    const wins = bestWins(rider, null);
    expect(wins.length).toBeGreaterThan(0);
    expect(wins.every((win) => win.gain > 0)).toBe(true);
    expect(wins.map((win) => win.gain)).toEqual([...wins.map((win) => win.gain)].sort((a, b) => b - a));
    const drempel = wins.find((win) => win.key === "drempel")!;
    expect(drempel.step).toBe("4,3 → 4,52 W/kg");
  });

  it("maakt durability lager en houdt racen onder de 1000", () => {
    const durability = bestWins(rider, null).find((win) => win.key === "durability");
    if (durability) expect(durability.step).toMatch(/→/);
    const top = bestWins({ ...rider, zrs: 1000 }, null);
    expect(top.find((win) => win.key === "racen")).toBeUndefined();
  });

  it("is leeg zonder score", () => {
    expect(bestWins({ sex: "man", weightKg: 75, power: { s15: null, m1: null, m5: null, m20: null }, fatigue: [], ctl: null, zrs: null }, null)).toEqual([]);
  });
});

describe("eigen steen uit een snapshot", () => {
  it("rekent de meting terug uit het niveau, met de balk tussen de klassen", () => {
    const view = viewFromSnapshot({
      seed: "lid",
      snapshot: snap("2024-04-29", 6.8, { drempel: 7.35, fitheid: 7.09, racen: 5.76 }),
      source: "week van 29 april 2024",
      own: { sex: "man" },
    });
    const byKey = Object.fromEntries(view.facets.map((facet) => [facet.key, facet]));
    // Drempel 7,35: Smaragd 4,75 + 0,35 × (6,4 − 4,75).
    expect(byKey.drempel.value).toBe("5,33 W/kg");
    expect(byKey.drempel.meter).toMatchObject({ from: "4,75 W/kg", to: "6,4 W/kg" });
    expect(byKey.fitheid.value).toBe("93 TSS/dag");
    expect(byKey.racen.value).toBe("640 ZRS");
  });

  it("toont van een ander geen metingen", () => {
    const view = viewFromSnapshot({ seed: "lid", snapshot: snap("2024-04-29", 6.8, { drempel: 7.35, vo2max: 7 }), source: "x" });
    expect(view.facets.every((facet) => facet.value === "")).toBe(true);
  });
});

