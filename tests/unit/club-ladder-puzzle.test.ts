import { describe, expect, it } from "vitest";
import {
  buildPuzzleRiders,
  checkLadderTeam,
  ladderRankName,
  parseLadderBand,
  parseLadderRank,
  puzzleTeamFor,
  sortPuzzleRiders,
  type LadderPuzzleRider,
  type LadderPuzzleTeam,
} from "@/lib/club-ladder/puzzle";

const team: LadderPuzzleTeam = { id: "t", name: "ZWBrains", archived: false, band: [4, 6] };

function rider(name: string, rank: number | null): LadderPuzzleRider {
  return { key: `p:${name}`, kind: "profile", id: name, name, sex: null, zwiftId: null, rank, teamId: "t" };
}

describe("checkLadderTeam", () => {
  it("laat een team binnen 3 ranks passen, hoeveel er per rank ook zijn", () => {
    const check = checkLadderTeam(team, [rider("a", 4), rider("b", 4), rider("c", 4), rider("d", 6)]);
    expect(check.level).toBe("ok");
    expect(check.issues).toEqual([]);
    expect(check.allowed).toEqual([4, 6]);
  });

  it("toont welke ranks er nog bij kunnen", () => {
    expect(checkLadderTeam(team, [rider("a", 5)]).allowed).toEqual([3, 7]);
    expect(checkLadderTeam({ ...team, band: [1, 2] }, [rider("a", 1), rider("b", 2)]).allowed).toEqual([1, 3]);
  });

  it("zet bij meer dan 3 ranks de hoogst gerankte renners op 50%", () => {
    const check = checkLadderTeam(team, [rider("hoog", 3), rider("b", 4), rider("c", 6)]);
    expect(check.level).toBe("bad");
    expect(check.allowed).toEqual([4, 6]);
    expect(check.outKeys).toEqual(["p:hoog"]);
    expect(check.issues[0].text).toContain("4 ranks");
    expect(check.issues[0].text).toContain("hoog");
  });

  it("weigert een renner zonder rank", () => {
    const check = checkLadderTeam(team, [rider("a", 5), rider("leeg", null)]);
    expect(check.level).toBe("bad");
    expect(check.outKeys).toEqual(["p:leeg"]);
  });

  it("waarschuwt buiten de afgesproken band", () => {
    const check = checkLadderTeam(team, [rider("a", 5), rider("b", 7)]);
    expect(check.level).toBe("warn");
    expect(check.offBandKeys).toEqual(["p:b"]);
  });

  it("waarschuwt bij een leeg team", () => {
    expect(checkLadderTeam(team, []).level).toBe("warn");
  });
});

describe("buildPuzzleRiders", () => {
  const member = {
    id: "m1",
    name: "Anna",
    sex: "vrouw" as const,
    zwiftId: 101,
    score: null,
    teams: ["ZWBrains"],
    teamIds: ["archief", "t"],
    interested: true,
    inPool: false,
    category: null,
    riderType: null,
    ftpWatts: null,
    ftpWkg: null,
    wkg1m: null,
    wkg5m: null,
    wkg20m: null,
  };
  const riders = buildPuzzleRiders(
    [member],
    [
      { roster_entry_id: "r1", team_id: "t", sex: "man", name: " Bram ", zwift_id: " 202 " },
      { roster_entry_id: "r2", team_id: null, sex: null, name: "Anna [ZWB]", zwift_id: "101" },
      { roster_entry_id: "r3", team_id: "weg", sex: "x", name: "Cor", zwift_id: null },
    ],
    new Map([
      ["101", 5],
      ["202", 4],
    ]),
    new Set(["t"]),
  );

  it("neemt leden en rosternamen, met rank op Zwift-ID", () => {
    expect(riders.map((r) => [r.key, r.name, r.rank, r.teamId])).toEqual([
      ["p:m1", "Anna", 5, "t"],
      ["r:r1", "Bram", 4, "t"],
      ["r:r3", "Cor", null, null],
    ]);
    expect(riders[1].zwiftId).toBe("202");
    expect(riders[2].sex).toBeNull();
  });
});

describe("hulpjes", () => {
  it("leest ranks en banden", () => {
    expect(parseLadderRank("3")).toBe(3);
    expect(parseLadderRank("11")).toBeNull();
    expect(parseLadderRank("")).toBeNull();
    expect(parseLadderBand(4, 6)).toEqual([4, 6]);
    expect(parseLadderBand(6, 4)).toBeNull();
    expect(ladderRankName(1)).toBe("Diamond");
    expect(ladderRankName(null)).toBe("geen rank");
  });

  it("sorteert op rank, zonder rank onderaan", () => {
    expect(sortPuzzleRiders([rider("z", null), rider("b", 5), rider("a", 5), rider("c", 2)]).map((r) => r.name)).toEqual([
      "c",
      "a",
      "b",
      "z",
    ]);
  });

  it("legt een lid in het eerste ladderteam dat in de puzzel staat", () => {
    expect(puzzleTeamFor(["oud", "t2", "t1"], new Set(["t1", "t2"]))).toBe("t2");
    expect(puzzleTeamFor(["oud"], new Set(["t1"]))).toBeNull();
  });
});
