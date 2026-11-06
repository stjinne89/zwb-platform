import { describe, expect, it } from "vitest";
import type { MatchupRider } from "@/lib/club-ladder/matchup";
import { nextRiderSort, sortMatchupRiders } from "@/lib/club-ladder/matchup-sort";

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

  it("sorteert namen op alfabet", () => {
    expect(ids(sortMatchupRiders(riders, { key: "name", direction: "asc" }))).toEqual([2, 1, 3]);
  });
});

describe("nextRiderSort", () => {
  it("begint met namen oplopend en getallen aflopend, en draait bij een tweede klik om", () => {
    expect(nextRiderSort(null, "name")).toEqual({ key: "name", direction: "asc" });
    expect(nextRiderSort(null, "m20")).toEqual({ key: "m20", direction: "desc" });
    expect(nextRiderSort({ key: "m20", direction: "desc" }, "m20")).toEqual({ key: "m20", direction: "asc" });
  });
});
