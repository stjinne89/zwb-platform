import { describe, expect, it } from "vitest";
import { ladderVelo, ladderVeloByZwiftId, rankFromLegacyVelo } from "@/lib/club-ladder/legacy-velo";
import { buildPuzzleRiders, effectiveLadderRank } from "@/lib/club-ladder/puzzle";

describe("legacy vELO voor de ladder", () => {
  it("rekent met max 30 dagen, anders max 90 dagen", () => {
    expect(ladderVelo({ zwift_id: 1, velo_live: 1500, velo_max30: "1537.8", velo_max90: 1779.4 })).toBe(1537.8);
    expect(ladderVelo({ zwift_id: 1, velo_live: 1768.7, velo_max30: null, velo_max90: "1768.7" })).toBe(1768.7);
    expect(ladderVelo({ zwift_id: 1, velo_live: null, velo_max30: null, velo_max90: null })).toBeNull();
    expect(ladderVelo(null)).toBeNull();
  });

  it("geeft de open legacy-klasse, ondergrens inbegrepen", () => {
    expect(rankFromLegacyVelo(3122.2)).toBe(1);
    expect(rankFromLegacyVelo(2200)).toBe(1);
    expect(rankFromLegacyVelo(2199.9)).toBe(2);
    expect(rankFromLegacyVelo(1450)).toBe(4);
    expect(rankFromLegacyVelo(1000)).toBe(7);
    expect(rankFromLegacyVelo(649)).toBe(10);
    expect(rankFromLegacyVelo(null)).toBeNull();
    expect(rankFromLegacyVelo(0)).toBeNull();
  });

  it("maakt een kaart op Zwift-ID zonder lege ratings", () => {
    const map = ladderVeloByZwiftId([
      { zwift_id: "101", velo_live: 1, velo_max30: 1626, velo_max90: 1626 },
      { zwift_id: 202, velo_live: null, velo_max30: null, velo_max90: null },
    ]);
    expect([...map]).toEqual([[101, 1626]]);
  });
});

describe("effectiveLadderRank", () => {
  it("houdt de vastgezette rank, maar stijgen telt meteen", () => {
    expect(effectiveLadderRank(6, 1367.8)).toBe(5);
    expect(effectiveLadderRank(4, 1300)).toBe(4);
    expect(effectiveLadderRank(4, null)).toBe(4);
    expect(effectiveLadderRank(null, 1626)).toBe(4);
    expect(effectiveLadderRank(null, null)).toBeNull();
  });

  it("zet vELO en rank op de puzzelstukjes", () => {
    const riders = buildPuzzleRiders(
      [],
      [
        { roster_entry_id: "r1", team_id: null, sex: null, name: "Bram", zwift_id: "202" },
        { roster_entry_id: "r2", team_id: null, sex: null, name: "Cor", zwift_id: "303" },
      ],
      new Map([["303", 3]]),
      new Set(),
      new Map([
        [202, 2303.2],
        [303, 1500],
      ]),
    );
    expect(riders.map((r) => [r.name, r.rank, r.velo])).toEqual([
      ["Bram", 1, 2303.2],
      ["Cor", 3, 1500],
    ]);
  });
});
