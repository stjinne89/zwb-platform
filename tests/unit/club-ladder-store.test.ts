import { describe, expect, it } from "vitest";
import { changedLadderResults } from "@/lib/club-ladder/store";
import type { ClubLadderResult } from "@/lib/club-ladder/summary";

const result = (over: Partial<ClubLadderResult> = {}): ClubLadderResult => ({
  resultId: 18294,
  date: "2026-11-19",
  time: "19:15",
  route: "BRAEk-fast Crits and Grits",
  challenger: "ZWBeasts",
  challengerScore: 26,
  opponent: "TeamNL Cloud9 Thunder",
  opponentScore: 29,
  stage: "Final",
  ...over,
});

const stored = { result_id: 18294, challenger_score: 31, opponent_score: 23, stage: "Final" };

describe("changedLadderResults", () => {
  it("vindt een score die de ladder achteraf corrigeerde", () => {
    expect(changedLadderResults([stored], [result()]).map((r) => r.resultId)).toEqual([18294]);
  });

  it("laat een ongewijzigde wedstrijd staan", () => {
    expect(changedLadderResults([stored], [result({ challengerScore: 31, opponentScore: 23 })])).toEqual([]);
  });

  it("volgt een fase die verandert, maar niet een die ontbreekt", () => {
    const finished = { ...stored, stage: "Finished" };
    expect(changedLadderResults([finished], [result({ challengerScore: 31, opponentScore: 23 })])).toHaveLength(1);
    expect(changedLadderResults([finished], [result({ challengerScore: 31, opponentScore: 23, stage: null })])).toEqual([]);
  });

  it("negeert een nieuwe wedstrijd en scores als tekst uit de database", () => {
    expect(changedLadderResults([], [result()])).toEqual([]);
    const asText = { result_id: "18294", challenger_score: "26", opponent_score: "29", stage: "Final" } as never;
    expect(changedLadderResults([asText], [result()])).toEqual([]);
  });
});
