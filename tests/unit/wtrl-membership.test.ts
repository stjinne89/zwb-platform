import { describe, expect, it } from "vitest";
import {
  personNameKey,
  planWtrlMembership,
  suggestProfileLinks,
  type RosterEntryRow,
} from "@/lib/teams/wtrl-membership";
import { summarizeWtrlRiders, type WtrlRider } from "@/lib/teams/wtrl-roster";

function rider(zwiftId: string, name: string, status: "member" | "invited" = "member"): WtrlRider {
  return { zwiftId, name, status, category: "B", zftpW: 260, zftpWkg: 3.4, zmapWkg: 4.2 };
}

function entry(partial: Partial<RosterEntryRow> & { id: string; name: string }): RosterEntryRow {
  return {
    zwift_id: null,
    claimed_by: null,
    team_id: null,
    team_assignment_source: "manual",
    ...partial,
  };
}

const TEAM = "team-b1";

describe("planWtrlMembership", () => {
  it("maakt leden met een account lid en zet de rest in het rooster", () => {
    const plan = planWtrlMembership({
      teamId: TEAM,
      riders: [rider("1", "Anna"), rider("2", "Bert")],
      profileByZwiftId: new Map([["1", "p-anna"]]),
      roster: [],
      members: [],
      excluded: new Set(),
    });
    expect(plan.addMembers).toEqual(["p-anna"]);
    expect(plan.upsertRoster).toEqual([{ id: null, name: "Bert", zwiftId: "2", category: "B" }]);
  });

  it("voegt een uitnodiging niet toe", () => {
    const plan = planWtrlMembership({
      teamId: TEAM,
      riders: [rider("1", "Anna", "invited")],
      profileByZwiftId: new Map([["1", "p-anna"]]),
      roster: [],
      members: [],
      excluded: new Set(),
    });
    expect(plan.addMembers).toEqual([]);
    expect(plan.upsertRoster).toEqual([]);
  });

  it("respecteert een captain die iemand uit het team haalde", () => {
    const plan = planWtrlMembership({
      teamId: TEAM,
      riders: [rider("1", "Anna")],
      profileByZwiftId: new Map([["1", "p-anna"]]),
      roster: [],
      members: [],
      excluded: new Set(["p-anna"]),
    });
    expect(plan.addMembers).toEqual([]);
  });

  it("ruimt alleen op wat via WTRL binnenkwam", () => {
    const plan = planWtrlMembership({
      teamId: TEAM,
      riders: [rider("1", "Anna")],
      profileByZwiftId: new Map([["1", "p-anna"]]),
      roster: [],
      members: [
        { profile_id: "p-anna", assignment_source: "wtrl" },
        { profile_id: "p-weg", assignment_source: "wtrl" },
        { profile_id: "p-hand", assignment_source: "manual" },
        { profile_id: "p-beschikbaar", assignment_source: "event_availability" },
      ],
      excluded: new Set(),
    });
    expect(plan.addMembers).toEqual([]);
    expect(plan.removeMembers).toEqual(["p-weg"]);
  });

  it("gebruikt een bestaande rosternaam, eerst op Zwift-ID en anders op naam", () => {
    const plan = planWtrlMembership({
      teamId: TEAM,
      riders: [rider("2", "Bert"), rider("3", "Cor Jansen")],
      profileByZwiftId: new Map(),
      roster: [
        entry({ id: "r-bert", name: "B. de Wit", zwift_id: "2" }),
        entry({ id: "r-cor", name: "cor jansen" }),
      ],
      members: [],
      excluded: new Set(),
    });
    expect(plan.upsertRoster.map((row) => row.id)).toEqual(["r-bert", "r-cor"]);
  });

  it("een geclaimde rosternaam met dat Zwift-ID telt als account", () => {
    const plan = planWtrlMembership({
      teamId: TEAM,
      riders: [rider("2", "Bert")],
      profileByZwiftId: new Map(),
      roster: [entry({ id: "r-bert", name: "Bert", zwift_id: "2", claimed_by: "p-bert" })],
      members: [],
      excluded: new Set(),
    });
    expect(plan.addMembers).toEqual(["p-bert"]);
    expect(plan.upsertRoster).toEqual([]);
  });

  it("laat een bewust buitengesloten rosternaam met rust", () => {
    const plan = planWtrlMembership({
      teamId: TEAM,
      riders: [rider("2", "Bert")],
      profileByZwiftId: new Map(),
      roster: [entry({ id: "r-bert", name: "Bert", team_assignment_source: "manual_excluded" })],
      members: [],
      excluded: new Set(),
    });
    expect(plan.upsertRoster).toEqual([]);
  });

  it("koppelt een vertrokken WTRL-rosternaam los, maar geen handwerk", () => {
    const plan = planWtrlMembership({
      teamId: TEAM,
      riders: [rider("2", "Bert")],
      profileByZwiftId: new Map(),
      roster: [
        entry({ id: "r-bert", name: "Bert", zwift_id: "2", team_id: TEAM, team_assignment_source: "wtrl" }),
        entry({ id: "r-weg", name: "Weg", zwift_id: "9", team_id: TEAM, team_assignment_source: "wtrl" }),
        entry({ id: "r-hand", name: "Hand", team_id: TEAM, team_assignment_source: "manual" }),
        entry({ id: "r-ander", name: "Ander", team_id: "team-b2", team_assignment_source: "wtrl" }),
      ],
      members: [],
      excluded: new Set(),
    });
    expect(plan.detachRoster).toEqual(["r-weg"]);
  });

  it("ruimt niets op als er voor dit team geen renners gelezen zijn", () => {
    const plan = planWtrlMembership({
      teamId: TEAM,
      riders: [],
      profileByZwiftId: new Map(),
      roster: [entry({ id: "r-weg", name: "Weg", team_id: TEAM, team_assignment_source: "wtrl" })],
      members: [{ profile_id: "p-weg", assignment_source: "wtrl" }],
      excluded: new Set(),
    });
    expect(plan.removeMembers).toEqual([]);
    expect(plan.detachRoster).toEqual([]);
  });
});

describe("summarizeWtrlRiders", () => {
  it("telt 'te sterk' als de renner in één van zijn teams niet past", () => {
    const strongB = { ...rider("5", "Jos"), zftpW: 292, zftpWkg: 4.06, zmapWkg: 4.81 };
    const summary = summarizeWtrlRiders([
      { division: "Open Aqua League Division B2", riders: [strongB] },
      { division: "Open Aqua Dev League Division B3", riders: [strongB] },
    ]).get("5");
    expect(summary).toMatchObject({ category: "B", advice: "B", fits: false });
  });

  it("past in beide divisies", () => {
    const summary = summarizeWtrlRiders([
      { division: "Open Aqua League Division B2", riders: [rider("6", "Gijs")] },
      { division: "Open Aqua Dev League Division B3", riders: [rider("6", "Gijs")] },
    ]).get("6");
    expect(summary).toMatchObject({ category: "B", advice: "B Dev", fits: true });
  });
});

describe("personNameKey", () => {
  it("negeert tussenvoegsels, toevoegingen en accenten", () => {
    expect(personNameKey("Pim de Meulemeester")).toBe(personNameKey("Pim Meulemeester"));
    expect(personNameKey("Tako Tabak [ZWB]")).toBe(personNameKey("tako tabak"));
    expect(personNameKey("Michiel van den Beuken (ZWB)")).toBe("michiel beuken");
    expect(personNameKey("Zoë Müller")).toBe("zoe muller");
  });
});

describe("suggestProfileLinks", () => {
  const riders = [
    { zwiftId: "10", name: "Daan Mulder", team: "B2" },
    { zwiftId: "11", name: "Anna Bakker", team: "A" },
    { zwiftId: "12", name: "Jan Jansen", team: "C" },
    { zwiftId: "13", name: "Kees Vos", team: "C" },
    { zwiftId: "10", name: "Daan Mulder", team: "B1" },
  ];
  const profiles = [
    { id: "p-daan", display_name: "Daan Mulder", zwift_id: null },
    { id: "p-anna", display_name: "Anna Bakker", zwift_id: "11" },
    { id: "p-jan1", display_name: "Jan Jansen", zwift_id: null },
    { id: "p-jan2", display_name: "Jan Jansen", zwift_id: null },
    { id: "p-kees", display_name: "Kees Vos", zwift_id: "999" },
  ];

  it("stelt alleen een eenduidig account zonder Zwift-ID voor", () => {
    expect(suggestProfileLinks(riders, profiles)).toEqual([
      {
        zwiftId: "10",
        riderName: "Daan Mulder",
        wtrlTeams: ["B2", "B1"],
        profileId: "p-daan",
        profileName: "Daan Mulder",
      },
    ]);
  });
});
