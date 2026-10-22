import { describe, expect, it } from "vitest";
import { MIN_FOR_AVERAGE, clubAverage, clubAverages, compareLines, snapshotAt, storedScore, viewFromSnapshot, type StoredSnapshot } from "@/lib/briljant/compare";
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
    expect(view.consistency).toMatchObject({ value: 0.8, hitWeeks: null, streak: null, norm: null });
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
      snap("2026-10-19", 5, { sprint: 6, drempel: 4 }),
      snap("2026-10-19", 6, { sprint: 5, drempel: 4 }),
      snap("2026-10-19", 3, { sprint: 3, drempel: 5 }),
      snap("2026-10-19", 2, { sprint: 2, drempel: 4 }),
      snap("2026-10-19", 4, { sprint: 4, drempel: null }),
    ];
    const average = clubAverage(members)!;
    expect(average.members).toBe(6);
    expect(average.score).toBe(4);
    expect(average.facets.sprint).toBe(4);
    expect(average.facets.drempel).toBe(4);
    expect(average.facets.racen).toBeNull();
    expect(average.consistency).toBe(0.8);
    expect(average.week).toBe("2026-10-19");
  });

  it("laat een facet leeg dat minder dan vijf leden hebben", () => {
    const members = Array.from({ length: MIN_FOR_AVERAGE }, (_, i) =>
      snap("2026-10-19", 4, i === 0 ? { sprint: 4, durability: 7 } : { sprint: 4 }),
    );
    const average = clubAverage(members)!;
    expect(average.facets.sprint).toBe(4);
    expect(average.facets.durability).toBeNull();
  });
});

describe("clubAverages", () => {
  const member = (sex: "man" | "vrouw" | null, score: number) => ({ ...snap("2026-10-19", score, { sprint: score }), sex });

  it("geeft het ZWB-gemiddelde en per geslacht, elk pas vanaf vijf leden", () => {
    const men = Array.from({ length: 5 }, () => member("man", 5));
    const women = Array.from({ length: 4 }, () => member("vrouw", 3));
    const averages = clubAverages([...men, ...women, member(null, 4)]);
    expect(averages.zwb).toMatchObject({ members: 10 });
    expect(averages.zwb!.score).toBeCloseTo(4.1, 9);
    expect(averages.man).toMatchObject({ members: 5, score: 5 });
    expect(averages.man!.facets.sprint).toBe(5);
    expect(averages.vrouw).toBeNull();
    expect(clubAverages([...women, member("vrouw", 3)]).vrouw).toMatchObject({ members: 5, score: 3 });
  });

  it("telt wie geen geslacht opgaf alleen mee voor het ZWB-gemiddelde", () => {
    const averages = clubAverages(Array.from({ length: 6 }, () => member(null, 4)));
    expect(averages.zwb).toMatchObject({ members: 6 });
    expect(averages.man).toBeNull();
    expect(averages.vrouw).toBeNull();
    expect(averages.zwb).not.toHaveProperty("sex");
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
    // Drempel 7,35: Smaragd 4,75 + 0,35 × (5,2 − 4,75).
    expect(byKey.drempel.value).toBe("4,91 W/kg");
    expect(byKey.drempel.meter).toMatchObject({ from: "4,75 W/kg", to: "5,2 W/kg" });
    expect(byKey.fitheid.value).toBe("81 TSS/dag");
    expect(byKey.racen.value).toBe("576 ZRS");
  });

  it("toont van een ander geen metingen", () => {
    const view = viewFromSnapshot({ seed: "lid", snapshot: snap("2024-04-29", 6.8, { drempel: 7.35, vo2max: 7 }), source: "x" });
    expect(view.facets.every((facet) => facet.value === "")).toBe(true);
  });
});


describe("storedScore", () => {
  it("rekent een bewaarde score opnieuw als optelling van de gewogen onderdelen", () => {
    // Zonder fitheid en durability: 0,125 × 7,74 + 0,05 × 9,38 + 0,2 × 7,48 + 0,15 × 7,49 + 0,1 × 9,21.
    const facets = { racen: 7.74, sprint: 9.38, vo2max: 7.48, drempel: 7.49, anaeroob: 9.21, fitheid: null, durability: null };
    expect(storedScore(facets, null)).toBe(4.98);
    // Met consistentie 0,5: × 0,9.
    expect(storedScore(facets, 0.5)).toBe(4.48);
    expect(storedScore({ sprint: 5, drempel: 4 }, null)).toBeNull();
  });
});

describe("compareLines", () => {
  const stone = (facets: StoredSnapshot["facets"]) =>
    viewFromSnapshot({ seed: "x", snapshot: { week: "2026-10-19", score: 5, facets, consistency: null }, source: "x" });
  const me = stone({ sprint: 5, anaeroob: 5, vo2max: 5, drempel: 5, racen: 5 });
  const piet = stone({ sprint: 7.5, anaeroob: 5.1, vo2max: 5.5, drempel: 3.8, racen: 6.3 });

  it("noemt de grootste verschillen tussen jou en een ander in woorden, hooguit drie", () => {
    expect(compareLines(me, piet, null, "Piet")).toEqual([
      "Piet is een veel betere sprinter dan jij: een bordjessprint winnen wordt lastig.",
      "In een race eindigt Piet meestal voor jou.",
      "Als jullie samen de Alpe op rijden, kan Piet jou niet bijhouden.",
    ]);
  });

  it("draait de zinnen om als jij rechts staat", () => {
    expect(compareLines(piet, me, "Piet", null)[0]).toBe(
      "Piet is een veel betere sprinter dan jij: een bordjessprint winnen wordt lastig.",
    );
  });

  it("vergelijkt ook twee anderen met elkaar", () => {
    expect(compareLines(piet, me, "Piet", "Jan")).toEqual([
      "Piet is een veel betere sprinter dan Jan: de bordjessprint is voor Piet.",
      "In een race eindigt Piet meestal voor Jan.",
      "Als ze samen de Alpe op rijden, kan Piet Jan niet bijhouden.",
    ]);
  });

  it("begint met een hoofdletter en zegt het als ze aan elkaar gewaagd zijn", () => {
    const average = stone({ sprint: 5.1, anaeroob: 4.9, vo2max: 5, drempel: 5.2, racen: 5 });
    expect(compareLines(me, average, null, "het gemiddelde ZWB-lid")).toEqual(["Het gemiddelde ZWB-lid en jij zijn aan elkaar gewaagd."]);
    expect(compareLines(average, me, "het gemiddelde ZWB-lid", "Piet")).toEqual(["Het gemiddelde ZWB-lid en Piet zijn aan elkaar gewaagd."]);
  });

  it("slaat onderdelen over die een van beiden niet heeft", () => {
    const other = stone({ sprint: 5, anaeroob: 5, vo2max: 5, drempel: 5, fitheid: 9 });
    expect(compareLines(me, other, null, "Piet")).toEqual(["Piet en jij zijn aan elkaar gewaagd."]);
  });
});
