import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0070 → 0171 → 0172 tegen een geïsoleerde PostgreSQL, op nagebouwde tabellen
// uit 0001, 0004 en 0068. Reproduceert eerst de melding (een Zwiftlady in ZRL B
// door haar categorie) en controleert daarna dat 0172 hem opruimt én dichtzet.
// Zegt niets over de productiedatabase zelf.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

const ZWIFTLADY = "00000000-0000-0000-0000-000000000001";
const HERKENDE_LADY = "00000000-0000-0000-0000-000000000002";
const RACER = "00000000-0000-0000-0000-000000000003";
const HANDMATIG = "00000000-0000-0000-0000-000000000004";
const CLAIMER_CATEGORIE = "00000000-0000-0000-0000-000000000005";
const CLAIMER_ECHT = "00000000-0000-0000-0000-000000000006";
const VIA_ROSTER = "00000000-0000-0000-0000-000000000007";
const VIA_ROSTER_AANGEMELD = "00000000-0000-0000-0000-000000000008";

const teamIds = new Map<string, string>();
const voorDeFix = new Map<string, string[]>();

async function teamsOf(profileId: string) {
  const { rows } = await db.query<{ name: string }>(
    "select t.name from team_members m join teams t on t.id = m.team_id where m.profile_id = $1 order by t.name",
    [profileId],
  );
  return rows.map((row) => row.name);
}

async function sourceOf(profileId: string, teamName: string) {
  const { rows } = await db.query<{ assignment_source: string }>(
    "select m.assignment_source from team_members m join teams t on t.id = m.team_id where m.profile_id = $1 and t.name = $2",
    [profileId, teamName],
  );
  return rows[0]?.assignment_source ?? null;
}

async function claimAs(profileId: string, entryId: string) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [profileId]);
  const { rows } = await db.query<{ claim_roster_entry: boolean }>(
    "select public.claim_roster_entry($1)",
    [entryId],
  );
  return rows[0].claim_roster_entry;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create function current_user_has_permission(text) returns boolean language sql stable as $$ select false $$;",
      `create table profiles(
         id uuid primary key,
         is_approved boolean,
         zrl_category text,
         zwift_id text
       );`,
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
      // Categorie B voor alle dames; alleen bij de tweede staat "Zwiftladies"
      // ergens in haar rosternaam, en juist dat bepaalde de oude indeling.
      `insert into profiles (id, is_approved, zrl_category) values
         ('${ZWIFTLADY}', true, 'B'),
         ('${HERKENDE_LADY}', true, 'B'),
         ('${RACER}', true, 'C'),
         ('${HANDMATIG}', true, 'A'),
         ('${CLAIMER_CATEGORIE}', true, 'B'),
         ('${CLAIMER_ECHT}', true, 'B'),
         ('${VIA_ROSTER}', true, 'B'),
         ('${VIA_ROSTER_AANGEMELD}', true, 'B');`,
      `insert into roster_entries (name, pace_category, claimed_by) values
         ('Anna de Vries', 'B', '${ZWIFTLADY}'),
         ('Bo Jansen (Zwiftladies)', 'B', '${HERKENDE_LADY}');`,
    ].join("\n"),
  );

  // 0070 zoals hij draaide: indeling op categorie, inclusief de eindsync.
  await db.exec(await migration("0070_zrl_parent_team_auto_seed.sql"));

  for (const profile of [ZWIFTLADY, HERKENDE_LADY, RACER, HANDMATIG]) {
    voorDeFix.set(profile, await teamsOf(profile));
  }

  const { rows: teamRows } = await db.query<{ id: string; name: string }>(
    "select id, name from teams",
  );
  for (const row of teamRows) teamIds.set(row.name, row.id);
  const zrlB = teamIds.get("ZRL B")!;
  const zrlC = teamIds.get("ZRL C")!;

  await db.exec(
    [
      `insert into teams (id, name, type) values ('00000000-0000-0000-0000-0000000000f0', 'ZWB Mango', 'zrl');`,
      `insert into events (id, type, title, start_at, team_id) values
         ('00000000-0000-0000-0000-0000000000e1', 'zrl', 'ZRL B ronde 1', now() + interval '7 days', '${zrlB}');`,
      // Een C-renner die meedoet met een B-race: aanmelding wint van categorie.
      `insert into team_event_availability (event_id, team_id, profile_id, status) values
         ('00000000-0000-0000-0000-0000000000e1', '${zrlB}', '${RACER}', 'available'),
         ('00000000-0000-0000-0000-0000000000e1', '${zrlB}', '${VIA_ROSTER_AANGEMELD}', 'available');`,
      // Handmatig toegevoegd door een teambeheerder.
      `insert into team_members (team_id, profile_id, role, assignment_source)
         values ('${zrlC}', '${HANDMATIG}', 'member', 'manual');`,
      // Rosternamen: één op categorie bij ZRL B gezet, één die WTRL echt zo kent.
      `insert into roster_entries (id, name, pace_category, team_id, team_assignment_source) values
         ('00000000-0000-0000-0000-0000000000a1', 'Cato Smit', 'B', '${zrlB}', 'auto_zrl_category'),
         ('00000000-0000-0000-0000-0000000000a2', 'Dana Boer', 'B', '00000000-0000-0000-0000-0000000000f0', 'roster_sync');`,
      // Twee leden die hun rosternaam al claimden toen die op categorie bij ZRL B stond.
      `insert into roster_entries (name, pace_category, team_id, team_assignment_source, claimed_by) values
         ('Eva Mulder', 'B', '${zrlB}', 'auto_zrl_category', '${VIA_ROSTER}'),
         ('Fem Bakker', 'B', '${zrlB}', 'auto_zrl_category', '${VIA_ROSTER_AANGEMELD}');`,
      // Zij claimden hun naam vóór de categorie-sync, dus hun rij zegt
      // 'roster_claim'; de sync erna deed niets meer (on conflict do nothing).
      `insert into team_members (team_id, profile_id, role, assignment_source) values
         ('${zrlB}', '${VIA_ROSTER}', 'member', 'roster_claim'),
         ('${zrlB}', '${VIA_ROSTER_AANGEMELD}', 'member', 'roster_claim')
       on conflict (team_id, profile_id) do update set assignment_source = 'roster_claim';`,
    ].join("\n"),
  );

  await db.exec(await migration("0171_zrl_availability_team_join.sql"));
  await db.exec(await migration("0172_drop_zrl_category_team_seed.sql"));
}, 30000);

afterAll(async () => {
  await db?.close();
});

describe("categorie maakt geen teamlid meer (0172)", () => {
  it("laat zien wat 0070 deed: een Zwiftlady in ZRL B op haar categorie", () => {
    // De melding van de eigenaar, nagespeeld. Haar categorie won omdat de tekst
    // "Zwiftladies" nergens in haar rosternaam stond.
    expect(voorDeFix.get(ZWIFTLADY)).toEqual(["ZRL B"]);
    expect(voorDeFix.get(HERKENDE_LADY)).toEqual(["ZRL Zwiftladies"]);
    expect(voorDeFix.get(RACER)).toEqual(["ZRL C"]);
  });

  it("haalt de indeling op categorie weg", async () => {
    expect(await teamsOf(ZWIFTLADY)).toEqual([]);
    expect(await teamsOf(HERKENDE_LADY)).toEqual([]);
  });

  it("houdt wie zich heeft aangemeld, in het team van die race", async () => {
    expect(await teamsOf(RACER)).toEqual(["ZRL B"]);
    expect(await sourceOf(RACER, "ZRL B")).toBe("event_availability");
  });

  it("laat een handmatige toevoeging staan", async () => {
    expect(await teamsOf(HANDMATIG)).toEqual(["ZRL C"]);
    expect(await sourceOf(HANDMATIG, "ZRL C")).toBe("manual");
  });

  it("ruimt ook lidmaatschappen op die via een op categorie ingedeelde rosternaam kwamen", async () => {
    expect(await teamsOf(VIA_ROSTER)).toEqual([]);
  });

  it("laat zo iemand niet vallen als hij zich wél had aangemeld", async () => {
    expect(await teamsOf(VIA_ROSTER_AANGEMELD)).toEqual(["ZRL B"]);
    expect(await sourceOf(VIA_ROSTER_AANGEMELD, "ZRL B")).toBe("event_availability");
  });

  it("voegt niets meer toe als een categorie of goedkeuring verandert", async () => {
    await db.query("update profiles set zrl_category = 'A' where id = $1", [ZWIFTLADY]);
    await db.query("update profiles set is_approved = true where id = $1", [ZWIFTLADY]);
    expect(await teamsOf(ZWIFTLADY)).toEqual([]);
  });

  it("claimt een rosternaam zonder team als die naam alleen op categorie was ingedeeld", async () => {
    expect(await claimAs(CLAIMER_CATEGORIE, "00000000-0000-0000-0000-0000000000a1")).toBe(true);
    expect(await teamsOf(CLAIMER_CATEGORIE)).toEqual([]);
  });

  it("houdt de claim van een rosternaam die WTRL echt bij een team kent", async () => {
    expect(await claimAs(CLAIMER_ECHT, "00000000-0000-0000-0000-0000000000a2")).toBe(true);
    expect(await teamsOf(CLAIMER_ECHT)).toEqual(["ZWB Mango"]);
    expect(await sourceOf(CLAIMER_ECHT, "ZWB Mango")).toBe("roster_claim");
  });

  it("blijft leden toevoegen die zich aanmelden voor een race", async () => {
    await db.query(
      "insert into event_rsvps (event_id, profile_id, status) values ('00000000-0000-0000-0000-0000000000e1', $1, 'yes')",
      [ZWIFTLADY],
    );
    expect(await teamsOf(ZWIFTLADY)).toEqual(["ZRL B"]);
    expect(await sourceOf(ZWIFTLADY, "ZRL B")).toBe("event_availability");
  });

  it("kent de herkomst auto_zrl_category niet meer", async () => {
    await expect(
      db.query(
        "insert into team_members (team_id, profile_id, role, assignment_source) values ($1, $2, 'member', 'auto_zrl_category')",
        [teamIds.get("ZRL A"), HANDMATIG],
      ),
    ).rejects.toThrow();
  });

  it("heeft de categorie-sync zelf niet meer", async () => {
    const { rows } = await db.query<{ count: number }>(
      "select count(*)::int as count from pg_proc where proname in ('sync_zrl_parent_team_membership','sync_all_zrl_parent_team_memberships','handle_zrl_parent_team_seed')",
    );
    expect(rows[0].count).toBe(0);
  });

  it("is opnieuw te draaien", async () => {
    await db.exec(await migration("0172_drop_zrl_category_team_seed.sql"));
    expect(await teamsOf(RACER)).toEqual(["ZRL B"]);
    expect(await teamsOf(HANDMATIG)).toEqual(["ZRL C"]);
  });
});
