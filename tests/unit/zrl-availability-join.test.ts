import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0171 tegen een geïsoleerde PostgreSQL, op nagebouwde tabellen uit 0001, 0068
// en 0070. Zegt niets over de productiedatabase zelf; die migratie is daar met
// de hand toegepast.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

const LID = "00000000-0000-0000-0000-000000000001";
const CAPTAIN = "00000000-0000-0000-0000-000000000002";
const WACHT_OP_GOEDKEURING = "00000000-0000-0000-0000-000000000003";
const VERWIJDERD = "00000000-0000-0000-0000-000000000004";
const AL_BESCHIKBAAR = "00000000-0000-0000-0000-000000000005";

const ZRL_B = "00000000-0000-0000-0000-0000000000b0";
const ZRL_B_MANGO = "00000000-0000-0000-0000-0000000000b1";
const SOCIALS = "00000000-0000-0000-0000-0000000000c0";

const RACE_B = "00000000-0000-0000-0000-0000000000e1";
const RACE_MANGO = "00000000-0000-0000-0000-0000000000e2";
const KOFFIERIT = "00000000-0000-0000-0000-0000000000e3";
const RACE_ZONDER_TEAM = "00000000-0000-0000-0000-0000000000e4";
const RACE_GEREDEN = "00000000-0000-0000-0000-0000000000e5";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create table profiles(id uuid primary key, is_approved boolean);",
      `create table teams(
         id uuid primary key,
         name text not null,
         type text not null check (type in ('zrl','ladder','social','outdoor')),
         parent_team_id uuid references teams(id) on delete set null
       );`,
      `create table team_members(
         team_id uuid not null references teams(id) on delete cascade,
         profile_id uuid not null references profiles(id) on delete cascade,
         role text not null default 'member' check (role in ('member','captain','co-captain')),
         joined_at timestamptz not null default now(),
         assignment_source text not null default 'manual'
           check (assignment_source in ('manual','roster_claim','auto_zrl_category')),
         primary key (team_id, profile_id)
       );`,
      `create table events(
         id uuid primary key,
         type text not null check (type in ('outdoor','zrl','ladder','flamme_rouge','social','training')),
         title text not null,
         start_at timestamptz not null,
         team_id uuid references teams(id) on delete set null
       );`,
      `create table event_rsvps(
         event_id uuid not null references events(id) on delete cascade,
         profile_id uuid not null references profiles(id) on delete cascade,
         status text not null check (status in ('yes','maybe','no')),
         updated_at timestamptz not null default now(),
         primary key (event_id, profile_id)
       );`,
      `create table team_event_availability(
         id uuid primary key default gen_random_uuid(),
         event_id uuid not null references events(id) on delete cascade,
         team_id uuid not null references teams(id) on delete cascade,
         profile_id uuid not null references profiles(id) on delete cascade,
         status text not null check (status in ('available','maybe','unavailable')),
         updated_at timestamptz not null default now(),
         unique (event_id, team_id, profile_id)
       );`,
      `create table team_member_seed_overrides(
         team_id uuid not null references teams(id) on delete cascade,
         profile_id uuid not null references profiles(id) on delete cascade,
         excluded boolean not null default true,
         primary key (team_id, profile_id)
       );`,
      `insert into profiles values
         ('${LID}', true),
         ('${CAPTAIN}', true),
         ('${WACHT_OP_GOEDKEURING}', false),
         ('${VERWIJDERD}', true),
         ('${AL_BESCHIKBAAR}', true);`,
      `insert into teams (id, name, type, parent_team_id) values
         ('${ZRL_B}', 'ZRL B', 'zrl', null),
         ('${ZRL_B_MANGO}', 'ZRL B Mango', 'zrl', '${ZRL_B}'),
         ('${SOCIALS}', 'Zondagrit', 'social', null);`,
      `insert into events (id, type, title, start_at, team_id) values
         ('${RACE_B}', 'zrl', 'ZRL B ronde 1', now() + interval '7 days', '${ZRL_B}'),
         ('${RACE_MANGO}', 'zrl', 'ZRL B Mango ronde 1', now() + interval '8 days', '${ZRL_B_MANGO}'),
         ('${KOFFIERIT}', 'social', 'Koffierit', now() + interval '3 days', '${SOCIALS}'),
         ('${RACE_ZONDER_TEAM}', 'zrl', 'ZRL open race', now() + interval '9 days', null),
         ('${RACE_GEREDEN}', 'zrl', 'ZRL B ronde 0', now() - interval '30 days', '${ZRL_B}');`,
      // Captainrol die de aanmelding straks niet mag overschrijven.
      `insert into team_members (team_id, profile_id, role, assignment_source)
         values ('${ZRL_B}', '${CAPTAIN}', 'captain', 'manual');`,
      // Handmatig uit het team gehaald door de captain.
      `insert into team_member_seed_overrides (team_id, profile_id, excluded)
         values ('${ZRL_B}', '${VERWIJDERD}', true);`,
      // Stond al beschikbaar vóór de migratie: één race die nog komt, één die
      // allang gereden is.
      `insert into team_event_availability (event_id, team_id, profile_id, status) values
         ('${RACE_B}', '${ZRL_B}', '${AL_BESCHIKBAAR}', 'available'),
         ('${RACE_GEREDEN}', '${ZRL_B}', '${AL_BESCHIKBAAR}', 'available');`,
    ].join("\n"),
  );
  await db.exec(await migration("0171_zrl_availability_team_join.sql"));
}, 30000);

afterAll(async () => {
  await db?.close();
});

async function membership(teamId: string, profileId: string) {
  const { rows } = await db.query<{ role: string; assignment_source: string }>(
    "select role, assignment_source from team_members where team_id = $1 and profile_id = $2",
    [teamId, profileId],
  );
  return rows[0] ?? null;
}

async function teamsOf(profileId: string) {
  const { rows } = await db.query<{ name: string }>(
    "select t.name from team_members m join teams t on t.id = m.team_id where m.profile_id = $1 order by t.name",
    [profileId],
  );
  return rows.map((row) => row.name);
}

describe("aanmelden voor een ZRL-race maakt je lid van dat team (0171)", () => {
  it("voegt toe bij beschikbaar op de teampagina", async () => {
    await db.query(
      "insert into team_event_availability (event_id, team_id, profile_id, status) values ($1, $2, $3, 'available')",
      [RACE_B, ZRL_B, LID],
    );
    expect(await membership(ZRL_B, LID)).toEqual({
      role: "member",
      assignment_source: "event_availability",
    });
  });

  it("volgt het team van de race, niet het team waar je de knop indrukt", async () => {
    // Een race van een subteam staat ook op de pagina van het hoofdteam; de
    // beschikbaarheid wordt daar op het hoofdteam vastgelegd.
    await db.query(
      "insert into team_event_availability (event_id, team_id, profile_id, status) values ($1, $2, $3, 'available')",
      [RACE_MANGO, ZRL_B, LID],
    );
    expect(await membership(ZRL_B_MANGO, LID)).toEqual({
      role: "member",
      assignment_source: "event_availability",
    });
  });

  it("voegt toe bij Ja op de eventpagina", async () => {
    await db.query(
      "insert into event_rsvps (event_id, profile_id, status) values ($1, $2, 'yes')",
      [RACE_MANGO, CAPTAIN],
    );
    expect(await membership(ZRL_B_MANGO, CAPTAIN)).toEqual({
      role: "member",
      assignment_source: "event_availability",
    });
  });

  it("laat een bestaande captainrol staan", async () => {
    await db.query(
      "insert into event_rsvps (event_id, profile_id, status) values ($1, $2, 'yes')",
      [RACE_B, CAPTAIN],
    );
    expect(await membership(ZRL_B, CAPTAIN)).toEqual({
      role: "captain",
      assignment_source: "manual",
    });
  });

  it("doet niets bij misschien, nee of afmelden, en haalt niemand uit een team", async () => {
    const before = await teamsOf(LID);
    await db.query(
      "insert into event_rsvps (event_id, profile_id, status) values ($1, $2, 'maybe')",
      [RACE_ZONDER_TEAM, LID],
    );
    await db.query(
      "update team_event_availability set status = 'unavailable' where event_id = $1 and profile_id = $2",
      [RACE_B, LID],
    );
    await db.query(
      "insert into event_rsvps (event_id, profile_id, status) values ($1, $2, 'no')",
      [RACE_B, LID],
    );
    expect(await teamsOf(LID)).toEqual(before);
  });

  it("negeert events die geen ZRL-race zijn", async () => {
    await db.query(
      "insert into event_rsvps (event_id, profile_id, status) values ($1, $2, 'yes')",
      [KOFFIERIT, LID],
    );
    expect(await membership(SOCIALS, LID)).toBeNull();
  });

  it("negeert een lid dat nog op goedkeuring wacht", async () => {
    await db.query(
      "insert into team_event_availability (event_id, team_id, profile_id, status) values ($1, $2, $3, 'available')",
      [RACE_B, ZRL_B, WACHT_OP_GOEDKEURING],
    );
    expect(await membership(ZRL_B, WACHT_OP_GOEDKEURING)).toBeNull();
  });

  it("respecteert een lid dat de captain uit het team haalde", async () => {
    await db.query(
      "insert into team_event_availability (event_id, team_id, profile_id, status) values ($1, $2, $3, 'available')",
      [RACE_B, ZRL_B, VERWIJDERD],
    );
    expect(await membership(ZRL_B, VERWIJDERD)).toBeNull();
  });

  it("haalt bestaande aanmeldingen voor komende races in, en laat gereden races met rust", async () => {
    // AL_BESCHIKBAAR stond voor beide races beschikbaar; alleen de race die nog
    // komt telt. Eén lidmaatschap dus, niet twee keer hetzelfde team.
    expect(await teamsOf(AL_BESCHIKBAAR)).toEqual(["ZRL B"]);
    const { rows } = await db.query<{ count: number }>(
      "select count(*)::int as count from team_members where profile_id = $1",
      [AL_BESCHIKBAAR],
    );
    expect(rows[0].count).toBe(1);
  });

  it("houdt de herkomstcheck strikt", async () => {
    await expect(
      db.query(
        "insert into team_members (team_id, profile_id, role, assignment_source) values ($1, $2, 'member', 'onzin')",
        [SOCIALS, LID],
      ),
    ).rejects.toThrow();
  });

  it("is opnieuw te draaien", async () => {
    await db.exec(await migration("0171_zrl_availability_team_join.sql"));
    expect(await teamsOf(LID)).toEqual(["ZRL B", "ZRL B Mango"]);
    expect(await membership(ZRL_B, CAPTAIN)).toEqual({
      role: "captain",
      assignment_source: "manual",
    });
  });
});
