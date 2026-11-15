import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0332 tegen een geïsoleerde PostgreSQL, op nagebouwde tabellen. Zegt niets over
// de productiedatabase zelf; daar is de migratie nog niet toegepast.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

const CAPTAIN = "00000000-0000-0000-0000-000000000001";
const LID = "00000000-0000-0000-0000-000000000002";
const ANDER = "00000000-0000-0000-0000-000000000003";
const CLAIMER = "00000000-0000-0000-0000-000000000004";
const BEHEERDER = "00000000-0000-0000-0000-000000000005";

const ZRL_B = "00000000-0000-0000-0000-0000000000b0";
const B1 = "00000000-0000-0000-0000-0000000000b1";
const LOS = "00000000-0000-0000-0000-0000000000c0";

const WEEK = "00000000-0000-0000-0000-0000000000e1";
const RACE_B1 = "00000000-0000-0000-0000-0000000000e2";
const WEEK_2 = "00000000-0000-0000-0000-0000000000e3";

const ROSTER = "00000000-0000-0000-0000-0000000000f1";
const ROSTER_2 = "00000000-0000-0000-0000-0000000000f2";

async function as(user: string | null) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""]);
}

async function setFor(event: string, profile: string | null, roster: string | null, status: string | null) {
  const { rows } = await db.query<{ ok: boolean }>(
    "select public.set_team_availability_for($1, $2, $3, $4, $5) as ok",
    [event, ZRL_B, profile, roster, status],
  );
  return rows[0].ok;
}

async function row(event: string, column: "profile_id" | "roster_entry_id", id: string) {
  const { rows } = await db.query<{ status: string; set_by: string | null; profile_id: string | null }>(
    `select status, set_by, profile_id from team_event_availability where event_id = $1 and ${column} = $2`,
    [event, id],
  );
  return rows[0] ?? null;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create table profiles(id uuid primary key);",
      "create table teams(id uuid primary key, name text not null, parent_team_id uuid references teams(id));",
      `create table team_members(
         team_id uuid not null references teams(id),
         profile_id uuid not null references profiles(id),
         role text not null default 'member',
         primary key (team_id, profile_id)
       );`,
      `create table events(
         id uuid primary key,
         type text not null,
         parent_event_id uuid references events(id),
         team_id uuid references teams(id)
       );`,
      "create table roster_entries(id uuid primary key, claimed_by uuid references profiles(id));",
      `create table team_event_availability(
         id uuid primary key default gen_random_uuid(),
         event_id uuid not null references events(id) on delete cascade,
         team_id uuid not null references teams(id) on delete cascade,
         profile_id uuid not null references profiles(id) on delete cascade,
         status text not null check (status in ('available','maybe','unavailable')),
         note text,
         updated_at timestamptz not null default now(),
         unique (event_id, team_id, profile_id)
       );`,
      // Nagebouwd: rechten en het lid worden van 0171.
      "create table joins(profile_id uuid, event_id uuid);",
      `create function public.join_event_team_for_member(p_profile_id uuid, p_event_id uuid, p_fallback_team_id uuid default null)
         returns uuid language plpgsql as $$ begin insert into joins values (p_profile_id, p_event_id); return null; end $$;`,
      `create function public.current_user_has_permission(p text) returns boolean language sql stable
         as $$ select auth.uid() = '${BEHEERDER}'::uuid $$;`,
      `insert into profiles values ('${CAPTAIN}'), ('${LID}'), ('${ANDER}'), ('${CLAIMER}'), ('${BEHEERDER}');`,
      `insert into teams values ('${ZRL_B}', 'ZRL B', null), ('${B1}', 'B1', '${ZRL_B}'), ('${LOS}', 'ZRL C', null);`,
      `insert into team_members values ('${B1}', '${CAPTAIN}', 'captain'), ('${ZRL_B}', '${LID}', 'member');`,
      `insert into events values
         ('${WEEK}', 'zrl', null, null),
         ('${RACE_B1}', 'zrl', '${WEEK}', '${B1}'),
         ('${WEEK_2}', 'zrl', null, null);`,
      `insert into roster_entries values ('${ROSTER}', null), ('${ROSTER_2}', null);`,
    ].join("\n"),
  );
  await db.exec(await migration("0332_captain_availability.sql"));
  await db.exec(
    `create trigger team_event_availability_team_join after insert or update of status on team_event_availability
       for each row execute function public.handle_team_availability_team_join();`,
  );
}, 30000);

afterAll(async () => {
  await db?.close();
});

describe("captain zet beschikbaarheid (0332)", () => {
  it("zet een rosternaam zonder account, zonder hem lid te maken", async () => {
    await as(CAPTAIN);
    expect(await setFor(WEEK, null, ROSTER, "available")).toBe(true);
    expect(await row(WEEK, "roster_entry_id", ROSTER)).toEqual({
      status: "available",
      set_by: CAPTAIN,
      profile_id: null,
    });
    const { rows } = await db.query("select * from joins where profile_id is null");
    expect(rows).toHaveLength(0);
  });

  it("zet een lid, en dat telt als aanmelding (0171)", async () => {
    await as(CAPTAIN);
    expect(await setFor(WEEK, LID, null, "available")).toBe(true);
    expect((await row(WEEK, "profile_id", LID))?.set_by).toBe(CAPTAIN);
    const { rows } = await db.query("select * from joins where profile_id = $1", [LID]);
    expect(rows).toHaveLength(1);
  });

  it("past een eigen waarde aan of wist hem", async () => {
    await as(CAPTAIN);
    expect(await setFor(WEEK, LID, null, "maybe")).toBe(true);
    expect((await row(WEEK, "profile_id", LID))?.status).toBe("maybe");
    expect(await setFor(WEEK, null, ROSTER, null)).toBe(true);
    expect(await row(WEEK, "roster_entry_id", ROSTER)).toBeNull();
  });

  it("de eigen keuze van de renner gaat voor", async () => {
    await as(LID);
    await db.query("update team_event_availability set status = 'unavailable' where event_id = $1 and profile_id = $2", [
      WEEK,
      LID,
    ]);
    expect((await row(WEEK, "profile_id", LID))?.set_by).toBeNull();
    await as(CAPTAIN);
    expect(await setFor(WEEK, LID, null, "available")).toBe(false);
    expect((await row(WEEK, "profile_id", LID))?.status).toBe("unavailable");
  });

  it("weigert wie geen captain is, en mag met teams.manage_roster", async () => {
    await as(ANDER);
    await expect(setFor(WEEK, ANDER, null, "available")).rejects.toThrow(/captains/);
    await as(BEHEERDER);
    expect(await setFor(WEEK, ANDER, null, "available")).toBe(true);
  });

  it("alleen op een raceweek van een hoofdteam", async () => {
    await as(CAPTAIN);
    await expect(setFor(RACE_B1, LID, null, "available")).rejects.toThrow(/raceweek/);
    await expect(
      db.query("select public.set_team_availability_for($1, $2, $3, null, 'available')", [WEEK, LOS, LID]),
    ).rejects.toThrow();
  });

  it("precies één renner per regel", async () => {
    await as(CAPTAIN);
    await expect(setFor(WEEK, LID, ROSTER, "available")).rejects.toThrow(/één renner/);
    await expect(
      db.query("insert into team_event_availability (event_id, team_id, status) values ($1, $2, 'available')", [
        WEEK,
        ZRL_B,
      ]),
    ).rejects.toThrow();
  });

  it("een claim neemt de beschikbaarheid mee, nog steeds van de captain; een eigen regel wint", async () => {
    await as(CAPTAIN);
    await setFor(WEEK, null, ROSTER, "available");
    await setFor(WEEK_2, null, ROSTER, "maybe");
    await as(CLAIMER);
    await db.query("insert into team_event_availability (event_id, team_id, profile_id, status) values ($1, $2, $3, 'unavailable')", [
      WEEK_2,
      ZRL_B,
      CLAIMER,
    ]);
    await db.query("update roster_entries set claimed_by = $1 where id = $2", [CLAIMER, ROSTER]);
    expect(await row(WEEK, "profile_id", CLAIMER)).toEqual({
      status: "available",
      set_by: CAPTAIN,
      profile_id: CLAIMER,
    });
    expect((await row(WEEK_2, "profile_id", CLAIMER))?.status).toBe("unavailable");
    const { rows } = await db.query("select * from team_event_availability where roster_entry_id = $1", [ROSTER]);
    expect(rows).toHaveLength(0);
  });

  it("is opnieuw te draaien", async () => {
    await db.exec(await migration("0332_captain_availability.sql"));
    await as(CAPTAIN);
    expect(await setFor(WEEK, null, ROSTER_2, "available")).toBe(true);
  });
});
