import { describe, expect, it } from "vitest";
import { checkTeamResult, teamResultOf } from "@/lib/zrl-live/team-result";
import type { ZrlLiveView } from "@/lib/zrl-live/snapshot";

const LIJNEN = ["Lutece Sprint", "Monceau Sprint", "Église Sprint"];

/** Stand van drie teams met vier finishers, met een instelbare dekking. */
function view({
  final = true,
  ownTeam = "zwb cycling b1" as string | null,
  crossingsPerPass = 4,
  emptyPass = -1,
  complete = true,
}: {
  final?: boolean;
  ownTeam?: string | null;
  crossingsPerPass?: number;
  /** Index van een passage waar Zwift niemand teruggaf (een haperend segment). */
  emptyPass?: number;
  complete?: boolean;
} = {}): ZrlLiveView {
  const riders = [1, 2, 3, 4].map((athleteId) => ({
    athleteId,
    name: `Renner ${athleteId}`,
    team: athleteId <= 2 ? "zwb cycling b1" : "andere ploeg",
    fal: 10,
    fts: 0,
    fin: 4,
    podium: 0,
    total: 14,
    void: false,
  }));
  const passes = LIJNEN.map((name, index) => ({
    index,
    segmentId: String(index),
    name,
    lap: 1,
    crossings: riders.slice(0, index === emptyPass ? 0 : crossingsPerPass).map((rider, i) => ({
      athleteId: rider.athleteId,
      ts: 1000 + i,
      elapsed: 20 + i,
      fal: 4 - i,
    })),
  }));
  return {
    event: { id: "e1", title: "ZRL · R1 · W1 · B1", teamName: "ZWB Cycling B1", zwiftEventId: "5711304" },
    subgroupLabel: "B",
    startAt: 0,
    fetchedAt: 1,
    ownTeam,
    ownRiders: [1, 2],
    leagueKey: "26/27|open aqua league|1|B",
    entrants: riders.map(({ athleteId, name, team }) => ({ athleteId, name, team })),
    teamLabels: {},
    score: {
      starters: 4,
      final,
      passes,
      riders,
      teams: [
        { team: "andere ploeg", total: 40, riders: 2, rank: 1 },
        { team: "zwb cycling b1", total: 28, riders: 2, rank: 2 },
        { team: "derde ploeg", total: 10, riders: 1, rank: 3 },
      ],
    },
    complete,
  };
}

describe("teamResultOf", () => {
  it("geeft de plaats van ons team in de divisie", () => {
    expect(teamResultOf(view())).toEqual({ rank: 2, teams: 3, points: 28, riders: 2 });
  });

  it("zwijgt zolang de uitslag niet definitief is", () => {
    expect(teamResultOf(view({ final: false }))).toBeNull();
  });

  it("zwijgt als Zwift de segmentpassages niet meer geeft", () => {
    // Zonder passages telt alleen FIN mee: de stand zou kloppend lijken maar het niet zijn.
    expect(teamResultOf(view({ crossingsPerPass: 0 }))).toBeNull();
    expect(teamResultOf(view({ crossingsPerPass: 2 }))).toBeNull();
    expect(teamResultOf(view({ crossingsPerPass: 4 }))?.rank).toBe(2);
  });

  it("zwijgt als ons team niet in de stand staat", () => {
    expect(teamResultOf(view({ ownTeam: null }))).toBeNull();
    expect(teamResultOf(view({ ownTeam: "ploeg zonder punten" }))).toBeNull();
  });

  it("zwijgt als Zwift een segment of de uitslag niet teruggaf", () => {
    expect(checkTeamResult(view({ complete: false }))).toEqual({
      ok: false,
      reason: "Zwift gaf niet alle gegevens terug",
    });
  });

  it("zwijgt als één passage leeg is, ook als het totaal nog ruim lijkt", () => {
    // Twee van de drie passages volledig is 67%: vroeger bij 80% nog net niet,
    // maar bij een route van zeven passages was één lege passage 86% en ging hij erdoor.
    expect(checkTeamResult(view({ emptyPass: 1 }))).toEqual({
      ok: false,
      reason: "Monceau Sprint: 0 van 4 finishers",
    });
  });
});
