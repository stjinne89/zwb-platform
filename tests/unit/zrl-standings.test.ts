import { describe, expect, it } from "vitest";
import { standingsPerTeam, wtrlRankFor, wtrlTeamIdOf, type StoredStandings } from "@/lib/teams/zrl-standings";

// Namen en ID's verzonnen.
const row = (rank: number, teamId: string, name: string) => ({
  rank,
  teamId,
  name,
  points: 20 - rank,
  perRace: [10 - rank],
  races: 1,
  fin: 0,
  fal: 0,
  fts: 0,
  pbp: 0,
});

describe("standingsPerTeam", () => {
  const standings: StoredStandings[] = [
    { season: 20, class: "2420B40", race: 6, final: true, rows: [row(1, "500", "Oud")] },
    { season: 21, class: "2420B40", race: 2, final: false, rows: [row(1, "111", "Een"), row(2, "500", "Ons")] },
  ];

  it("vindt de divisie van het team in het nieuwste seizoen", () => {
    const map = standingsPerTeam(
      ["team-a", "team-b"],
      [
        { trc_ref: "10/500", team_id: "team-a", division: "Open Aqua League Division B4", name: "Ons" },
        { trc_ref: "11/999", team_id: "team-b", division: null, name: "Ander" },
      ],
      standings,
    );
    expect(map.get("team-a")).toMatchObject({ race: 2, final: false, ownTeamId: "500", class: "2420B40", season: 21, ownName: "Ons" });
    expect(map.get("team-a")?.rows.map((r) => r.name)).toEqual(["Een", "Ons"]);
    expect(map.has("team-b")).toBe(false);
  });

  it("zonder standen is er niets", () => {
    expect(standingsPerTeam(["team-a"], [{ trc_ref: "10/500", team_id: "team-a", division: null, name: "Ons" }], []).size).toBe(0);
  });

  it("leest het WTRL-team-ID uit de TRC-referentie", () => {
    expect(wtrlTeamIdOf("79152/8683")).toBe("8683");
    expect(wtrlTeamIdOf("79152")).toBeNull();
  });
});

describe("wtrlRankFor", () => {
  const results = [
    {
      season: 21,
      class: "2420A10",
      race: 1,
      teams: [
        { name: "Ander", rank: 1, zwiftEventId: "900" },
        { name: "Ons A", rank: 2, zwiftEventId: "900" },
        { name: "Ons B", rank: 3, zwiftEventId: "900" },
        { name: "Weg", rank: null, zwiftEventId: "900" },
      ],
    },
  ];

  it("kiest het team op naam als twee ZWB-teams één event delen", () => {
    expect(wtrlRankFor(results, ["Ons B"], "900")).toEqual({ rank: 3, teams: 4, race: 1 });
  });

  it("geen plaats bij een ander event of een gediskwalificeerd team", () => {
    expect(wtrlRankFor(results, ["Ons A"], "901")).toBeNull();
    expect(wtrlRankFor(results, ["Weg"], "900")).toBeNull();
  });
});

