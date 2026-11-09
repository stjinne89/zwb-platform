import { describe, expect, it } from "vitest";
import type { LadderPlace } from "@/lib/club-ladder/briefing";
import { heatHue, ladderPower, ladderPowerRange, nextLadderSort, sortLadderPlaces } from "@/lib/club-ladder/briefing-sort";

const place = (
  zwiftId: number,
  name: string,
  placeNo: number,
  s15: number | null,
  m20: number | null,
  weightKg: number | null,
  rating: number | null = 1,
): LadderPlace => ({
  zwiftId,
  name,
  own: zwiftId % 2 === 0,
  rating,
  wkg: s15 == null && m20 == null ? null : { s15, m1: null, m5: null, m20 },
  source: "90d",
  racingScore: 600 - placeNo * 10,
  weightKg,
  place: placeNo,
  points: rating === null ? 0 : 11 - placeNo,
});

// Bart is licht en sterk per kilo, Anna zwaar: in watt draait de 15 s om.
const rows = [
  place(1, "Bart", 1, 12, 4.5, 60),
  place(2, "Anna", 2, 10, 4.0, 90),
  place(3, "Cees", 3, null, 4.2, null),
  place(4, "Dirk", 4, null, null, 80, null),
];
const ids = (list: LadderPlace[]) => list.map((r) => r.zwiftId);

describe("sortLadderPlaces", () => {
  it("houdt zonder sortering de verwachte volgorde", () => {
    expect(ids(sortLadderPlaces(rows, null))).toEqual([1, 2, 3, 4]);
  });

  it("sorteert per duur in W/kg of watt, zonder waarde onderaan", () => {
    expect(ids(sortLadderPlaces(rows, { key: "s15", direction: "desc" }, "wkg"))).toEqual([1, 2, 3, 4]);
    expect(ids(sortLadderPlaces(rows, { key: "s15", direction: "desc" }, "w"))).toEqual([2, 1, 3, 4]);
    expect(ids(sortLadderPlaces(rows, { key: "m20", direction: "asc" }, "wkg"))).toEqual([2, 3, 1, 4]);
    // Cees heeft geen gewicht: in watt geen 20 min.
    expect(ids(sortLadderPlaces(rows, { key: "m20", direction: "desc" }, "w"))).toEqual([2, 1, 3, 4]);
  });

  it("zet wie geen punten krijgt onderaan, ook omgedraaid", () => {
    expect(ids(sortLadderPlaces(rows, { key: "points", direction: "asc" }))).toEqual([3, 2, 1, 4]);
  });

  it("sorteert op naam en ZRS", () => {
    expect(ids(sortLadderPlaces(rows, { key: "name", direction: "asc" }))).toEqual([2, 1, 3, 4]);
    expect(ids(sortLadderPlaces(rows, { key: "zrs", direction: "asc" }))).toEqual([4, 3, 2, 1]);
  });
});

describe("ladderPower", () => {
  it("rekent watt uit gewicht en geeft niets zonder gewicht", () => {
    expect(ladderPower(rows[1], "w")?.s15).toBe(900);
    expect(ladderPower(rows[2], "w")).toBeNull();
    expect(ladderPower(rows[2], "wkg")?.m20).toBe(4.2);
  });
});

describe("nextLadderSort", () => {
  it("plek en naam eerst oplopend, getallen eerst hoogste; nog een klik draait om", () => {
    expect(nextLadderSort(null, "place")).toEqual({ key: "place", direction: "asc" });
    expect(nextLadderSort(null, "m1")).toEqual({ key: "m1", direction: "desc" });
    expect(nextLadderSort({ key: "m1", direction: "desc" }, "m1")).toEqual({ key: "m1", direction: "asc" });
  });
});

describe("heatHue", () => {
  it("hoogste rood, laagste groen, zonder verschil of waarde geen kleur", () => {
    const range = ladderPowerRange(rows, "m20", "wkg");
    expect(range).toEqual({ min: 4.0, max: 4.5 });
    expect(heatHue(4.5, range)).toBe(0);
    expect(heatHue(4.0, range)).toBe(120);
    expect(heatHue(4.25, range)).toBe(60);
    expect(heatHue(null, range)).toBeNull();
    expect(heatHue(4, { min: 4, max: 4 })).toBeNull();
    // In watt telt alleen wie gewicht heeft: Bart 270, Anna 360.
    expect(ladderPowerRange(rows, "m20", "w")).toEqual({ min: 270, max: 360 });
    expect(ladderPowerRange(rows, "m1", "wkg")).toBeNull();
  });
});
