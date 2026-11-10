import { describe, expect, it } from "vitest";
import { leaderboardRows } from "@/lib/zwblokken/leaderboard";

const members = [
  { id: "a", name: "Karen", blocks: 11411, zwiftBlocks: 891 },
  { id: "b", name: "Bart", blocks: 3794, zwiftBlocks: 805 },
  { id: "c", name: "Kevin", blocks: 610, zwiftBlocks: 409 },
  { id: "d", name: "Alleen buiten", blocks: 120, zwiftBlocks: 0 },
  { id: "e", name: "Alleen Zwift", blocks: 0, zwiftBlocks: 900 },
];

describe("leaderboardRows", () => {
  it("telt buiten alleen de blokken buiten", () => {
    expect(leaderboardRows(members, "buiten").map((m) => [m.id, m.count])).toEqual([
      ["a", 11411],
      ["b", 3794],
      ["c", 610],
      ["d", 120],
    ]);
  });

  // 2026-11-10: op het Zwift-tabblad stond de buitenlijst, waardoor Bart 6e en
  // Kevin 20e leek te staan.
  it("telt op het Zwift-tabblad alle werelden samen", () => {
    expect(leaderboardRows(members, "zwift").map((m) => [m.id, m.count])).toEqual([
      ["e", 900],
      ["a", 891],
      ["b", 805],
      ["c", 409],
    ]);
  });

  it("zet een gelijke stand op naam", () => {
    const tied = [
      { id: "x", name: "Zoë", blocks: 5, zwiftBlocks: 0 },
      { id: "y", name: "Anne", blocks: 5, zwiftBlocks: 0 },
    ];
    expect(leaderboardRows(tied, "buiten").map((m) => m.id)).toEqual(["y", "x"]);
  });
});
