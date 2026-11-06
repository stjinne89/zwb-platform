import { describe, expect, it } from "vitest";
import type { MatchupRider } from "@/lib/club-ladder/matchup";
import { nextRiderSort, riderWatts, sortMatchupRiders } from "@/lib/club-ladder/matchup-sort";

const rider = (zwiftId: number, name: string, m5: number | null, racingScore: number | null, position: number | null): MatchupRider => ({
  zwiftId,
  name,
  position,
  wkg: m5 == null ? null : { s15: null, m1: null, m5, m20: null },
  source: m5 == null ? null : "90d",
  racingScore,
  weightKg: null,
  routeWkg: null,
  races: null,
});

const riders = [rider(1, "Bart", 4.8, 700, 1), rider(2, "Anna", null, 900, 2), rider(3, "Cees", 5.2, null, 3)];
const ids = (rows: MatchupRider[]) => rows.map((r) => r.zwiftId);

describe("sortMatchupRiders", () => {
  it("houdt zonder sortering de startplekken", () => {
    expect(ids(sortMatchupRiders(riders, null))).toEqual([1, 2, 3]);
  });

  it("zet getallen hoogste eerst en wie geen waarde heeft onderaan, ook omgedraaid", () => {
    expect(ids(sortMatchupRiders(riders, { key: "m5", direction: "desc" }))).toEqual([3, 1, 2]);
    expect(ids(sortMatchupRiders(riders, { key: "m5", direction: "asc" }))).toEqual([1, 3, 2]);
    expect(ids(sortMatchupRiders(riders, { key: "zrs", direction: "desc" }))).toEqual([2, 1, 3]);
  });

  it("sorteert in watt op W/kg maal gewicht, zonder gewicht onderaan", () => {
    const withKg = [
      { ...riders[0], weightKg: 90 }, // 4,8 × 90 = 432 W
      { ...riders[1], weightKg: 60 },
      { ...riders[2], weightKg: 60 }, // 5,2 × 60 = 312 W
    ];
    expect(ids(sortMatchupRiders(withKg, { key: "m5", direction: "desc" }, "w"))).toEqual([1, 3, 2]);
    expect(ids(sortMatchupRiders(withKg, { key: "m5", direction: "desc" }, "wkg"))).toEqual([3, 1, 2]);
    // Zonder gewicht heeft niemand watt: dan op naam.
    expect(ids(sortMatchupRiders(riders, { key: "m5", direction: "desc" }, "w"))).toEqual([2, 1, 3]);
  });

  it("sorteert namen op alfabet", () => {
    expect(ids(sortMatchupRiders(riders, { key: "name", direction: "asc" }))).toEqual([2, 1, 3]);
  });
});

describe("riderWatts", () => {
  it("rekent W/kg om met het gewicht, en geeft niets zonder geldig gewicht", () => {
    expect(riderWatts({ s15: 10, m1: null, m5: 5, m20: 4 }, 70)).toEqual({ s15: 700, m1: null, m5: 350, m20: 280 });
    expect(riderWatts({ s15: 10, m1: null, m5: 5, m20: 4 }, null)).toBeNull();
    expect(riderWatts({ s15: 10, m1: null, m5: 5, m20: 4 }, 12)).toBeNull();
  });
});

describe("nextRiderSort", () => {
  it("begint met namen oplopend en getallen aflopend, en draait bij een tweede klik om", () => {
    expect(nextRiderSort(null, "name")).toEqual({ key: "name", direction: "asc" });
    expect(nextRiderSort(null, "m20")).toEqual({ key: "m20", direction: "desc" });
    expect(nextRiderSort({ key: "m20", direction: "desc" }, "m20")).toEqual({ key: "m20", direction: "asc" });
  });
});
