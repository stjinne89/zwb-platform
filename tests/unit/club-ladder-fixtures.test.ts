import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/training/events", () => ({
  syncEventWorkout: vi.fn(async (_admin: unknown, _profile: string, _event: string, status: string) => ({
    inserted: status === "yes",
    removed: status === "no",
    pushed: false,
  })),
}));
vi.mock("@/lib/training/replan", () => ({ requestReplan: vi.fn(async () => ({ started: false })) }));

import {
  activeLadderTeamIds,
  ladderEventFields,
  ladderFixtureMatches,
  ladderLineup,
  ladderOpponentFromTitle,
} from "@/lib/club-ladder/fixture-events";
import { LadderLoginError, parseLadderFixturePage } from "@/lib/club-ladder/fixture-page";
import { ladderRaceLinks } from "@/lib/events/race-links";
import { syncLadderFixtures } from "@/lib/club-ladder/fixture-sync";
import { parseClubLadderSummary, type ClubLadderFixture, type ClubLadderSummary } from "@/lib/club-ladder/summary";
import { clubLadderResultFromSummary } from "@/lib/team-results/sync";
import { dayRow, fixturePage, fixtureRow, ladderRow, ladderSection, summaryPage } from "../fixtures/club-ladder";

const stay = { cls: "staticMove" } as const;
const MUCKLE_YIN = 3662705581;

function fixture(overrides: Partial<ClubLadderFixture> = {}): ClubLadderFixture {
  return {
    fixtureId: 17729,
    date: "2026-11-06",
    time: "18:30",
    startsAt: "2026-11-06T18:30:00Z",
    home: "ZWBeasts",
    away: "Galaxy Avengers",
    homeId: 164,
    awayId: 567,
    route: "The Muckle Yin",
    powerups: ["FEATHER", "DRAFT"],
    ...overrides,
  };
}

const page = (home: Array<[number, string, number | null]>) =>
  parseLadderFixturePage(
    fixturePage({
      route: "The Muckle Yin",
      laps: 1,
      km: 23.57,
      home: home.map(([zwiftId, name, position]) => ({ zwiftId, name, position })),
      away: [{ zwiftId: 3327689, name: "Marnix van Zetten [GXY]", position: 1 }],
    }),
  );

describe("ladderwedstrijden lezen", () => {
  it("leest wedstrijdnummer en team-ID's uit de stand", () => {
    const html = summaryPage(
      [dayRow("2026-11-06"), fixtureRow("18:30", "ZWBeasts", "Galaxy Avengers", "The Muckle Yin", ["FEATHER"], false, { fixtureId: 17729, homeId: 164, awayId: 567 })],
      [ladderSection("EMEA", [ladderRow(1, "Galaxy Avengers", [], stay)])],
    );
    expect(parseClubLadderSummary(html).fixtures[0]).toMatchObject({
      fixtureId: 17729,
      homeId: 164,
      awayId: 567,
      startsAt: "2026-11-06T18:30:00Z",
    });
  });

  it("leest route, rondes en aanmeldingen per ploeg, zonder de samengevoegde tabel", () => {
    const parsed = page([
      [619970, "T ako [ZWB]", 1],
      [2650151, "Bart de Groot [ZWB]", 2],
      [555, "Reserve [ZWB]", null],
    ]);
    expect(parsed).toMatchObject({ zwiftEventId: 5772909, routeName: "The Muckle Yin", laps: 1, km: 23.57 });
    expect(parsed.home.map((rider) => rider.zwiftId)).toEqual([619970, 2650151, 555]);
    expect(parsed.away).toEqual([{ zwiftId: 3327689, name: "Marnix van Zetten [GXY]", position: 1 }]);
    expect(ladderLineup(parsed, "home").map((rider) => rider.name)).toEqual(["T ako [ZWB]", "Bart de Groot [ZWB]"]);
  });
});

describe("wedstrijd naar event", () => {
  const teams = [
    { id: "beasts", name: "ZWBeasts" },
    { id: "bullets", name: "ZWBullets" },
  ];

  it("koppelt een wedstrijd aan elk ZWB-team dat meedoet", () => {
    const matches = ladderFixtureMatches(
      [fixture(), fixture({ fixtureId: 2, home: "ZWBullets", away: "ZWBeasts" }), fixture({ fixtureId: null }), fixture({ fixtureId: 3, home: "A", away: "B" })],
      teams,
    );
    expect(matches.map((match) => `${match.fixture.fixtureId}:${match.team.id}:${match.side}`)).toEqual([
      "17729:beasts:home",
      "2:bullets:home",
      "2:beasts:away",
    ]);
  });

  it("vult route, rondes en powerups in", () => {
    const [match] = ladderFixtureMatches([fixture()], teams);
    expect(ladderEventFields(match, null)).toEqual({
      title: "Club Ladder: ZWBeasts – Galaxy Avengers",
      start_at: "2026-11-06T18:30:00.000Z",
      location: "Zwift · Scotland",
      description: "Powerups: Feather, Draft",
      external_url: "https://ladder.cycleracing.club/fixture/17729",
      zwift_route_id: MUCKLE_YIN,
      laps: 1,
      distance_km: 23.7,
      elevation_m: 282,
      club_ladder_opponent: "Galaxy Avengers",
    });
    const [, away] = ladderFixtureMatches([fixture({ fixtureId: 2, home: "ZWBullets", away: "ZWBeasts" })], teams);
    expect(ladderEventFields(away, null).club_ladder_opponent).toBe("ZWBullets");
    // Events van vóór 0302: de tegenstander uit de titel.
    expect(ladderOpponentFromTitle("Club Ladder: ZWBeasts – Galaxy Avengers", "ZWBeasts")).toBe("Galaxy Avengers");
    expect(ladderOpponentFromTitle("Club Ladder: ZWBullets – ZWBeasts", "ZWBeasts")).toBe("ZWBullets");
    expect(ladderOpponentFromTitle("Club Ladder: A – B", "ZWBeasts")).toBeNull();
    expect(ladderEventFields(match, page([]))).toMatchObject({ laps: 1, distance_km: 23.57, zwift_event_id: 5772909 });
  });

  it("geeft een ladderrace de wedstrijd op de ladder en de route op ZwiftInsider", () => {
    const event = { external_url: "https://ladder.cycleracing.club/fixture/17729", zwift_route_id: MUCKLE_YIN };
    expect(ladderRaceLinks(event, []).map((link) => [link.kind, link.url])).toEqual([
      ["ladder", "https://ladder.cycleracing.club/fixture/17729"],
      ["zwiftinsider", "https://zwiftinsider.com/route/the-muckle-yin"],
    ]);
    const own = [{ key: "x", kind: "zwiftinsider" as const, label: "ZwiftInsider", url: "https://zwiftinsider.com/eigen/" }];
    expect(ladderRaceLinks(event, own).map((link) => link.kind)).toEqual(["ladder"]);
  });

  it("telt een team als actief in de stand of met een wedstrijd", () => {
    const active = activeLadderTeamIds(teams, [{ position: 1, name: "ZWBullets", ladderTeamId: 1, region: "EMEA", form: [], move: null }], [fixture()]);
    expect([...active].sort()).toEqual(["beasts", "bullets"]);
  });

  it("slaat een team van het kerkhof met een geplande wedstrijd over in plaats van een fout", () => {
    const summary = { standings: [], fixtures: [fixture()], results: [], fetchedAt: "", sourceUrl: "" };
    const source = { id: "s", team_id: "beasts", provider: "club_ladder", source_url: "", match_name: "ZWBeasts", teams: { name: "ZWBeasts", type: "ladder", division: null, is_graveyard: false } };
    expect(() => clubLadderResultFromSummary(source as never, summary)).toThrow(/Wel een wedstrijd gepland/);
  });
});

// Kleine nep-Supabase: genoeg voor select/insert/update/delete/upsert met filters.
type Row = Record<string, unknown>;
function fakeDb(tables: Record<string, Row[]>) {
  let seq = 0;
  class Query {
    private filters: Array<(row: Row) => boolean> = [];
    private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
    private payload: Row | Row[] | null = null;
    private conflict: string[] = [];
    private one = false;
    constructor(private table: string) {
      tables[table] ??= [];
    }
    select() {
      return this;
    }
    eq(column: string, value: unknown) {
      this.filters.push((row) => String(row[column]) === String(value));
      return this;
    }
    in(column: string, values: unknown[]) {
      this.filters.push((row) => values.map(String).includes(String(row[column])));
      return this;
    }
    not(column: string) {
      this.filters.push((row) => row[column] != null);
      return this;
    }
    gte(column: string, value: string) {
      this.filters.push((row) => Date.parse(String(row[column])) >= Date.parse(value));
      return this;
    }
    insert(payload: Row | Row[]) {
      this.op = "insert";
      this.payload = payload;
      return this;
    }
    update(payload: Row) {
      this.op = "update";
      this.payload = payload;
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    upsert(payload: Row, options: { onConflict: string }) {
      this.op = "upsert";
      this.payload = payload;
      this.conflict = options.onConflict.split(",");
      return this;
    }
    single() {
      this.one = true;
      return this;
    }
    maybeSingle() {
      return this.single();
    }
    private run() {
      const rows = tables[this.table];
      const match = (row: Row) => this.filters.every((filter) => filter(row));
      let data: Row[] = [];
      if (this.op === "select") data = rows.filter(match);
      if (this.op === "insert") {
        data = [this.payload].flat().map((row) => ({ id: `${this.table}-${++seq}`, ...row }) as Row);
        rows.push(...data);
      }
      if (this.op === "update") {
        data = rows.filter(match);
        for (const row of data) Object.assign(row, this.payload);
      }
      if (this.op === "delete") {
        data = rows.filter(match);
        tables[this.table] = rows.filter((row) => !match(row));
      }
      if (this.op === "upsert") {
        const payload = this.payload as Row;
        const existing = rows.find((row) => this.conflict.every((key) => row[key] === payload[key]));
        if (existing) Object.assign(existing, payload);
        else rows.push({ ...payload });
      }
      return { data: this.one ? (data[0] ?? null) : data, error: null };
    }
    then<T>(resolve: (value: { data: unknown; error: null }) => T) {
      return Promise.resolve(this.run()).then(resolve);
    }
  }
  return { tables, from: (table: string) => new Query(table) };
}

describe("syncLadderFixtures", () => {
  const now = new Date("2026-11-02T18:00:00Z");
  let db: ReturnType<typeof fakeDb>;
  const summary = (fixtures: ClubLadderFixture[]): ClubLadderSummary => ({
    standings: Array.from({ length: 25 }, (_, i) => ({
      position: i + 1,
      name: i === 0 ? "ZWBeauties" : `Team ${i + 1}`,
      ladderTeamId: i + 1,
      region: "EMEA",
      form: [],
      move: null,
    })),
    fixtures,
    results: [],
    fetchedAt: now.toISOString(),
    sourceUrl: "",
  });

  beforeEach(() => {
    db = fakeDb({
      teams: [
        { id: "beasts", name: "ZWBeasts", type: "ladder", is_graveyard: true },
        { id: "bullets", name: "ZWBullets", type: "ladder", is_graveyard: false },
        { id: "beauties", name: "ZWBeauties", type: "ladder", is_graveyard: true },
      ],
      team_members: [{ team_id: "beasts", profile_id: "bart", role: "captain" }],
      profiles: [
        { id: "tako", zwift_id: "619970" },
        { id: "bart", zwift_id: "2650151" },
      ],
      roster_entries: [{ id: "gast", zwift_id: "777", team_id: "beasts" }],
      zwift_routes: [{ route_id: MUCKLE_YIN }],
      events: [
        { id: "afgezegd", club_ladder_fixture_id: 999, team_id: "beasts", start_at: "2026-11-05T18:00:00Z" },
        { id: "gereden", club_ladder_fixture_id: 998, team_id: "beasts", start_at: "2026-11-02T16:00:00Z" },
      ],
      team_event_lineups: [],
      event_rsvps: [],
    });
  });

  it("zet de wedstrijd met opstelling in de kalender en ruimt een afgezegde op", async () => {
    const result = await syncLadderFixtures(db, summary([fixture()]), {
      cookie: "connect.sid=x",
      now,
      fetchPage: async () => page([[619970, "T ako [ZWB]", 1], [2650151, "Bart de Groot [ZWB]", 2], [777, "Gast", 3], [555, "Reserve", null]]),
    });

    expect(result).toMatchObject({ created: 1, removed: 1, lineupRiders: 3, lineupError: null, archived: ["ZWBullets"] });
    expect(result.reactivated.sort()).toEqual(["ZWBeasts", "ZWBeauties"]);
    const event = db.tables.events.find((row) => row.club_ladder_fixture_id === 17729)!;
    expect(event).toMatchObject({ type: "ladder", team_id: "beasts", created_by: "bart", laps: 1, distance_km: 23.57, zwift_route_id: MUCKLE_YIN, zwift_event_id: 5772909 });
    expect(db.tables.events.map((row) => row.id)).not.toContain("afgezegd");
    expect(db.tables.events.map((row) => row.id)).toContain("gereden");
    expect(db.tables.team_event_lineups.map((row) => [row.profile_id ?? row.roster_entry_id, row.slot, row.parent_team_id])).toEqual([
      ["tako", 1, "beasts"],
      ["bart", 2, "beasts"],
      ["gast", 3, "beasts"],
    ]);
    expect(db.tables.event_rsvps.map((row) => [row.profile_id, row.status])).toEqual([
      ["tako", "yes"],
      ["bart", "yes"],
    ]);
    // Voor de matchup: de tegenstander en de aanmeldingen van beide ploegen.
    expect(event.club_ladder_opponent).toBe("Galaxy Avengers");
    expect(db.tables.club_ladder_fixture_signups.map((row) => [row.zwift_id, row.team, row.position])).toEqual([
      [619970, "ZWBeasts", 1],
      [2650151, "ZWBeasts", 2],
      [777, "ZWBeasts", 3],
      [555, "ZWBeasts", null],
      [3327689, "Galaxy Avengers", 1],
    ]);
  });

  it("volgt een gewijzigde opstelling en laat het event staan zonder sessie", async () => {
    const options = { cookie: "connect.sid=x", now };
    await syncLadderFixtures(db, summary([fixture()]), { ...options, fetchPage: async () => page([[619970, "T ako", 1], [2650151, "Bart", 2]]) });
    const second = await syncLadderFixtures(db, summary([fixture()]), { ...options, fetchPage: async () => page([[2650151, "Bart", 1]]) });

    expect(second).toMatchObject({ created: 0, updated: 0, lineupRiders: 1 });
    expect(db.tables.team_event_lineups.map((row) => [row.profile_id, row.slot])).toEqual([["bart", 1]]);
    expect(db.tables.event_rsvps.map((row) => row.profile_id)).toEqual(["bart"]);
    // Aanmeldingen worden vervangen, niet aangevuld.
    expect(db.tables.club_ladder_fixture_signups.map((row) => row.zwift_id)).toEqual([2650151, 3327689]);

    const expired = await syncLadderFixtures(db, summary([fixture()]), {
      ...options,
      fetchPage: async () => {
        throw new LadderLoginError("Ladder-sessie verlopen: vernieuw LADDER_COOKIE.");
      },
    });
    expect(expired.lineupError).toMatch(/verlopen/);
    expect(db.tables.events.filter((row) => row.club_ladder_fixture_id === 17729)).toHaveLength(1);
    // Zonder wedstrijdpagina blijven Zwift-event en gelezen afstand staan.
    expect(expired.updated).toBe(0);
    expect(db.tables.events.find((row) => row.club_ladder_fixture_id === 17729)).toMatchObject({ zwift_event_id: 5772909, distance_km: 23.57 });
    expect(db.tables.team_event_lineups).toHaveLength(1);
    expect(db.tables.club_ladder_fixture_signups).toHaveLength(2);
  });

  it("doet niets met een stand die niet gelezen is", async () => {
    const result = await syncLadderFixtures(db, { ...summary([]), standings: [] }, { now });
    expect(result.warnings).toHaveLength(1);
    expect(db.tables.events).toHaveLength(2);
    expect(db.tables.teams.find((team) => team.id === "bullets")?.is_graveyard).toBe(false);
  });
});
