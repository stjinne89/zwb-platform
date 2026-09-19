import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0172 op een database waar 0070 niet helemaal is aangekomen: de productie-DB
// van de club kent `roster_entries.team_assignment_source` niet, waardoor het
// opruimen van omgeleide roster_claim-rijen stukliep op
//   ERROR: 42703: column r.team_assignment_source does not exist
// Hier nagespeeld door die kolom na 0070 te laten vallen. Zegt niets over de
// productiedatabase zelf.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

const CATEGORIE_LID = "00000000-0000-0000-0000-000000000001";
const AANGEMELD = "00000000-0000-0000-0000-000000000002";
const CLAIMER = "00000000-0000-0000-0000-000000000003";

const teamIds = new Map<string, string>();

async function teamsOf(profileId: string) {
  const { rows } = await db.query<{ name: string }>(
    "select t.name from team_members m join teams t on t.id = m.team_id where m.profile_id = $1 order by t.name",
    [profileId],
  );
  return rows.map((row) => row.name);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create function current_user_has_permission(text) returns boolean language sql stable as $$ select false $$;",
      "create table profiles(id uuid primary key, is_approved boolean, zrl_category text, zwift_id text);",
      `create table teams(
         id uuid primary key default gen_random_uuid(),
         name text not null,
         type text not null check (type in ('zrl','ladder','social','outdoor')),
         division text,
         description text,
         parent_team_id uuid references teams(id) on delete set null,
         created_at timestamptz not null default now()
       );`,
      `create table team_members(
         team_id uuid not null references teams(id) on delete cascade,
         profile_id uuid not null references profiles(id) on delete cascade,
         role text not null default 'member' check (role in ('member','captain','co-captain')),
         joined_at timestamptz not null default now(),
         primary key (team_id, profile_id)
       );`,
      `create table roster_entries(
         id uuid primary key default gen_random_uuid(),
         name text not null,
         team_name text,
         pace_category text,
         zwift_id text,
         claimed_by uuid references profiles(id) on delete set null,
         team_id uuid references teams(id) on delete set null
       );`,
      `create table events(
         id uuid primary key default gen_random_uuid(),
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
      `insert into profiles (id, is_approved, zrl_category) values
         ('${CATEGORIE_LID}', true, 'B'),
         ('${AANGEMELD}', true, 'B'),
         ('${CLAIMER}', true, 'C');`,
    ].join("\n"),
  );

  await db.exec(await migration("0070_zrl_parent_team_auto_seed.sql"));
  // Dit is het verschil met een volledig toegepaste 0070.
  await db.exec("alter table public.roster_entries drop column team_assignment_source;");

  const { rows: teamRows } = await db.query<{ id: string; name: string }>(
    "select id, name from teams",
  );
  for (const row of teamRows) teamIds.set(row.name, row.id);
  const zrlB = teamIds.get("ZRL B")!;
  const zrlC = teamIds.get("ZRL C")!;

  await db.exec(
    [
      `insert into events (id, type, title, start_at, team_id) values
         ('00000000-0000-0000-0000-0000000000e1', 'zrl', 'ZRL C ronde 1', now() + interval '7 days', '${zrlC}');`,
      `insert into team_event_availability (event_id, team_id, profile_id, status) values
         ('00000000-0000-0000-0000-0000000000e1', '${zrlC}', '${AANGEMELD}', 'available');`,
      `insert into roster_entries (id, name, pace_category, team_id) values
         ('00000000-0000-0000-0000-0000000000a1', 'Cato Smit', 'C', '${zrlB}');`,
    ].join("\n"),
  );

  await db.exec(await migration("0171_zrl_availability_team_join.sql"));
}, 30000);

afterAll(async () => {
  await db?.close();
});

describe("0172 op een database zonder roster_entries.team_assignment_source", () => {
  it("draait zonder te vallen over de ontbrekende kolom", async () => {
    await expect(db.exec(await migration("0172_drop_zrl_category_team_seed.sql"))).resolves.toBeDefined();
  });

  it("ruimt de indeling op categorie alsnog op", async () => {
    expect(await teamsOf(CATEGORIE_LID)).toEqual([]);
  });

  it("houdt wie zich had aangemeld in het team van die race", async () => {
    expect(await teamsOf(AANGEMELD)).toEqual(["ZRL C"]);
  });

  it("laat een rosternaam claimen zonder over de kolom te struikelen", async () => {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [CLAIMER]);
    const { rows } = await db.query<{ claim_roster_entry: boolean }>(
      "select public.claim_roster_entry('00000000-0000-0000-0000-0000000000a1')",
    );
    expect(rows[0].claim_roster_entry).toBe(true);
    // Zonder die kolom heeft niets ooit een rosternaam op categorie ingedeeld,
    // dus het team van de naam telt gewoon mee.
    expect(await teamsOf(CLAIMER)).toEqual(["ZRL B"]);
  });

  it("is opnieuw te draaien", async () => {
    await db.exec(await migration("0172_drop_zrl_category_team_seed.sql"));
    expect(await teamsOf(AANGEMELD)).toEqual(["ZRL C"]);
    expect(await teamsOf(CLAIMER)).toEqual(["ZRL B"]);
  });

  it("zet met 0173 de ontbrekende kolom terug, zodat de rostersync weer kan schrijven", async () => {
    await db.exec(await migration("0173_restore_roster_team_assignment_source.sql"));

    // Precies wat saveRosterEntries() doet bij elke naam uit de WTRL-sync.
    await db.query(
      "insert into roster_entries (name, pace_category, team_id, team_assignment_source) values ('Gijs Vos', 'B', $1, 'roster_sync')",
      [teamIds.get("ZRL B")],
    );
    const { rows } = await db.query<{ team_assignment_source: string }>(
      "select team_assignment_source from roster_entries where name = 'Gijs Vos'",
    );
    expect(rows[0].team_assignment_source).toBe("roster_sync");

    // Nieuwe rijen zonder opgave zijn handwerk, niet meer 'auto_zrl_category'.
    await db.query("insert into roster_entries (name) values ('Hanna Peters')");
    const { rows: defaults } = await db.query<{ team_assignment_source: string }>(
      "select team_assignment_source from roster_entries where name = 'Hanna Peters'",
    );
    expect(defaults[0].team_assignment_source).toBe("manual");
  });

  it("is ook na 0173 opnieuw te draaien", async () => {
    await db.exec(await migration("0173_restore_roster_team_assignment_source.sql"));
    await db.exec(await migration("0172_drop_zrl_category_team_seed.sql"));
    expect(await teamsOf(AANGEMELD)).toEqual(["ZRL C"]);
    expect(await teamsOf(CLAIMER)).toEqual(["ZRL B"]);
  });
});
