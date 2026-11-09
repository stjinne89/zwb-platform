import { describe, expect, it } from "vitest";
import {
  isTeamRace,
  raceTeamIds,
  scheduleEventsFilter,
  teamIdsForRaces,
} from "@/lib/events/team-races";

const B = "00000000-0000-4000-8000-00000000000b";
const B1 = "00000000-0000-4000-8000-0000000000b1";
const B2 = "00000000-0000-4000-8000-0000000000b2";
const A = "00000000-0000-4000-8000-00000000000a";
const RACE = "00000000-0000-4000-8000-000000000001";

const teams = [
  { id: B1, parent_team_id: B },
  { id: B2, parent_team_id: B },
];

describe("isTeamRace", () => {
  it("geldt voor een ZRL- of ladderrace met team", () => {
    expect(isTeamRace({ type: "zrl", team_id: B1 })).toBe(true);
    expect(isTeamRace({ type: "ladder", team_id: A })).toBe(true);
  });

  it("niet voor een raceweek of een teamrit buiten", () => {
    expect(isTeamRace({ type: "zrl", team_id: null })).toBe(false);
    expect(isTeamRace({ type: "outdoor", team_id: A })).toBe(false);
  });
});

describe("teamIdsForRaces", () => {
  it("geeft je eigen teams plus de subteams eronder", () => {
    expect(teamIdsForRaces([B], teams).sort()).toEqual([B, B1, B2].sort());
  });

  it("een subteamlid krijgt geen races van zijn zusterteam", () => {
    expect(teamIdsForRaces([B1], teams)).toEqual([B1]);
  });

  it("zonder team geen teamraces", () => {
    expect(teamIdsForRaces([], teams)).toEqual([]);
  });
});

describe("raceTeamIds", () => {
  it("geeft het team van de race en zijn hoofdteam", () => {
    expect(raceTeamIds(B1, teams)).toEqual([B1, B]);
    expect(raceTeamIds(A, teams)).toEqual([A]);
  });
});

describe("scheduleEventsFilter", () => {
  it("houdt gewone events en laat FRR-tijdsloten weg, ook zonder team", () => {
    expect(scheduleEventsFilter([], [])).toBe(
      "and(team_id.is.null,or(type.neq.flamme_rouge,parent_event_id.is.null))," +
        "and(team_id.not.is.null,type.not.in.(zrl,ladder))",
    );
  });

  it("voegt je eigen teams en je eigen antwoorden toe", () => {
    const filter = scheduleEventsFilter([B1, A], [RACE]);
    expect(filter).toContain(`team_id.in.(${B1},${A})`);
    expect(filter).toContain(`id.in.(${RACE})`);
  });

  it("laat alles wat geen uuid is weg", () => {
    expect(scheduleEventsFilter(["x),id.not.is.null"], [])).not.toContain("x)");
  });
});
