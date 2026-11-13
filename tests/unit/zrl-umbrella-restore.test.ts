import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0327 tegen een geïsoleerde PostgreSQL: eerst maakt een subteam het hoofdteam
// paraplu (0179 + 0323), daarna maakt het verwijderen van dat subteam het weer
// gewoon. Nagebouwde tabellen; zegt niets over de productiedatabase zelf.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

const LID = "00000000-0000-0000-0000-000000000001";
const LID_2 = "00000000-0000-0000-0000-000000000002";
const ZRL_A = "00000000-0000-0000-0000-0000000000a0";
const ZRL_A1 = "00000000-0000-0000-0000-0000000000a1";
const ZRL_A2 = "00000000-0000-0000-0000-0000000000a2";
const ZRL_C = "00000000-0000-0000-0000-0000000000c0";

const WEEK_1 = "00000000-0000-0000-0000-0000000000f1"; // gereden
const WEEK_2 = "00000000-0000-0000-0000-0000000000f2"; // gereden, A niets opgegeven
const WEEK_3 = "00000000-0000-0000-0000-0000000000f3"; // komt nog
const LOS_EVENT = "00000000-0000-0000-0000-0000000000f9"; // hoofdevent zonder teamraces

const RACE_A_1 = "00000000-0000-0000-0000-0000000000e1";
const RACE_A_3 = "00000000-0000-0000-0000-0000000000e3";

const count = async (sql: string, params: unknown[] = []) =>
  Number((await db.query<{ n: number }>(sql, params)).rows[0].n);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      `create table teams(
         id uuid primary key,
         name text not null,
         type text not null,
         parent_team_id uuid references teams(id) on delete set null
       );`,
      `create table events(
         id uuid primary key default gen_random_uuid(),
         type text not null,
         title text not null,
         start_at timestamptz not null,
         team_id uuid references teams(id) on delete set null,
         parent_event_id uuid references events(id) on delete set null,
         created_by uuid
       );`,
      `create table team_event_availability(
         event_id uuid not null references events(id) on delete cascade,
         team_id uuid not null references teams(id) on delete cascade,
         profile_id uuid not null,
         status text not null,
         note text,
         updated_at timestamptz not null default now(),
         unique (event_id, team_id, profile_id)
       );`,
      `create table event_rsvps(
         event_id uuid not null references events(id) on delete cascade,
         profile_id uuid not null,
         status text not null,
         updated_at timestamptz not null default now(),
         primary key (event_id, profile_id)
       );`,
      `create table team_event_lineups(
         id uuid primary key default gen_random_uuid(),
         event_id uuid not null references events(id) on delete cascade,
         parent_team_id uuid not null references teams(id) on delete cascade,
         team_id uuid not null references teams(id) on delete cascade,
         profile_id uuid,
         roster_entry_id uuid,
         slot int, role text, note text, selected_by uuid,
         updated_at timestamptz not null default now(),
         unique (event_id, parent_team_id, profile_id)
       );`,
      `create table ttt_plans(
         id uuid primary key default gen_random_uuid(),
         parent_team_id uuid not null references teams(id) on delete cascade,
         team_id uuid references teams(id) on delete set null,
         event_id uuid references events(id) on delete set null,
         updated_at timestamptz not null default now()
       );`,
    ].join("\n"),
  );
  await db.exec(await migration("0179_zrl_parent_team_events.sql"));
  await db.exec(await migration("0323_umbrella_safeupdate.sql"));
  await db.exec(await migration("0327_zrl_umbrella_restore.sql"));

  await db.exec(`
    insert into teams (id, name, type) values
      ('${ZRL_A}', 'ZRL A', 'zrl'), ('${ZRL_C}', 'ZRL C', 'zrl');
    insert into events (id, type, title, start_at) values
      ('${WEEK_1}', 'zrl', 'ZRL 2026/27 · R1 · W1 — Race of Truth', now() - interval '14 days'),
      ('${WEEK_2}', 'zrl', 'ZRL 2026/27 · R1 · W2', now() - interval '7 days'),
      ('${WEEK_3}', 'zrl', 'ZRL 2026/27 · R2 · W1', now() + interval '7 days'),
      ('${LOS_EVENT}', 'zrl', 'Losse ZRL-avond', now() + interval '8 days');
    insert into events (id, type, title, start_at, team_id, parent_event_id) values
      ('${RACE_A_1}', 'zrl', 'ZRL 2026/27 · R1 · W1 · ZRL A — Race of Truth', now() - interval '14 days', '${ZRL_A}', '${WEEK_1}'),
      ('${RACE_A_3}', 'zrl', 'ZRL 2026/27 · R2 · W1 · ZRL A', now() + interval '7 days', '${ZRL_A}', '${WEEK_3}');
    insert into events (type, title, start_at, team_id, parent_event_id)
      select 'zrl', 'C', start_at, '${ZRL_C}', id from events where id in ('${WEEK_1}', '${WEEK_2}', '${WEEK_3}');
    insert into team_event_availability (event_id, team_id, profile_id, status) values
      ('${RACE_A_1}', '${ZRL_A}', '${LID}', 'available'),
      ('${RACE_A_3}', '${ZRL_A}', '${LID_2}', 'maybe');
    insert into team_event_lineups (event_id, parent_team_id, team_id, profile_id, slot) values
      ('${RACE_A_1}', '${ZRL_A}', '${ZRL_A}', '${LID}', 1);
    insert into ttt_plans (parent_team_id, team_id, event_id) values
      ('${ZRL_A}', '${ZRL_A}', '${RACE_A_3}');
  `);
});

afterAll(async () => {
  await db.close();
});

describe("hoofdteam zonder subteams rijdt weer zelf (0327)", () => {
  it("een subteam maakt A paraplu: eigen races weg, opgaven naar het hoofdevent", async () => {
    await db.exec(`
      insert into teams (id, name, type, parent_team_id) values
        ('${ZRL_A1}', 'ZRL A1', 'zrl', '${ZRL_A}'),
        ('${ZRL_A2}', 'ZRL A2', 'zrl', '${ZRL_A}');
    `);
    expect(await count(`select count(*) n from events where team_id = $1`, [ZRL_A])).toBe(0);
    expect(
      await count(
        `select count(*) n from team_event_availability where team_id = $1 and event_id in ($2, $3)`,
        [ZRL_A, WEEK_1, WEEK_3],
      ),
    ).toBe(2);
  });

  it("één subteam weg: A blijft paraplu", async () => {
    await db.exec(`delete from teams where id = '${ZRL_A2}'`);
    expect(await count(`select count(*) n from events where team_id = $1`, [ZRL_A])).toBe(0);
  });

  it("laatste subteam weg: races terug, met opgaven, opstelling en TTT-plan", async () => {
    await db.exec(`delete from teams where id = '${ZRL_A1}'`);

    const races = await db.query<{ id: string; title: string; parent_event_id: string }>(
      `select id, title, parent_event_id from events where team_id = $1 order by start_at`,
      [ZRL_A],
    );
    // Week 1 (opgave) en week 3 (komt nog); week 2 had niets en is voorbij; het
    // losse event heeft geen teamraces.
    expect(races.rows.map((row) => row.parent_event_id)).toEqual([WEEK_1, WEEK_3]);
    expect(races.rows[0].title).toBe("ZRL 2026/27 · R1 · W1 · ZRL A — Race of Truth");
    expect(races.rows[1].title).toBe("ZRL 2026/27 · R2 · W1 · ZRL A");

    const [week1Race, week3Race] = races.rows.map((row) => row.id);
    expect(
      await count(`select count(*) n from team_event_availability where event_id = $1 and team_id = $2`, [
        week1Race,
        ZRL_A,
      ]),
    ).toBe(1);
    expect(
      await count(`select count(*) n from team_event_availability where event_id = $1 and team_id = $2`, [
        week3Race,
        ZRL_A,
      ]),
    ).toBe(1);
    expect(
      await count(`select count(*) n from team_event_lineups where event_id = $1`, [week1Race]),
    ).toBe(1);
    expect(await count(`select count(*) n from ttt_plans where event_id = $1`, [week3Race])).toBe(1);
    // Niets meer op de hoofdevents.
    expect(
      await count(
        `select count(*) n from team_event_availability where team_id = $1 and event_id in ($2, $3, $4)`,
        [ZRL_A, WEEK_1, WEEK_2, WEEK_3],
      ),
    ).toBe(0);
  });

  it("nogmaals aanroepen maakt geen dubbele races", async () => {
    await db.query(`select public.restore_zrl_team_races($1)`, [ZRL_A]);
    expect(await count(`select count(*) n from events where team_id = $1`, [ZRL_A])).toBe(2);
  });

  it("een ander team blijft ongemoeid", async () => {
    expect(await count(`select count(*) n from events where team_id = $1`, [ZRL_C])).toBe(3);
  });
});
