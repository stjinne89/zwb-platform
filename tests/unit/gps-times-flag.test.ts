import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { applyGpsColTimesForUser } from "@/lib/cols/gps-col-times";

// 0281 zet has_gps_times op de ritten met eigen tijden, zodat gps-col-times.ts
// niet per rit de hele raw uitpakt (databasecheck 2026-10-27). 0280 legt indexen
// op de verwijzingen naar training_plans.
let db: PGlite;
const A = "00000000-0000-0000-0000-00000000000a";

async function migrate(file: string) {
  await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
}

async function flag(id: number) {
  return (await db.query<{ has_gps_times: boolean | null }>(`select has_gps_times from strava_activities where id=${id}`)).rows[0]
    .has_gps_times;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create table strava_activities(id bigint primary key,profile_id uuid,name text,raw jsonb);",
      `insert into strava_activities values (1,'${A}','oud met col','{"gps_col_times":[{"slug":"x","seconds":9}]}'),`,
      `(2,'${A}','oud met segment','{"gps_segment_times":[]}'),(3,'${A}','oud zonder','{"name":"rit"}'),(4,'${A}','geen raw',null);`,
      "create table training_plans(id uuid primary key,parent_plan_id uuid references training_plans(id) on delete set null,root_plan_id uuid references training_plans(id) on delete set null);",
      "create table training_workouts(id uuid primary key,plan_id uuid references training_plans(id) on delete cascade,superseded_by_plan_id uuid references training_plans(id) on delete set null);",
      "create table training_adaptation_runs(id uuid primary key,source_plan_id uuid references training_plans(id) on delete set null,draft_plan_id uuid references training_plans(id) on delete set null);",
      "create table training_chat_messages(id uuid primary key,plan_id uuid references training_plans(id) on delete set null);",
    ].join("\n"),
  );
  await migrate("0280_training_plan_fk_indexes.sql");
  await migrate("0281_strava_has_gps_times.sql");
});

afterAll(async () => {
  await db.close();
});

describe("0281 has_gps_times", () => {
  it("zet bestaande ritten met eigen tijden op true en laat de rest null", async () => {
    expect([await flag(1), await flag(2), await flag(3), await flag(4)]).toEqual([true, true, null, null]);
  });

  it("houdt de vlag bij als raw wordt geschreven, en alleen dan", async () => {
    await db.exec(`insert into strava_activities values (5,'${A}','nieuw','{"gps_segment_times":[{"segment_id":1}]}')`);
    expect(await flag(5)).toBe(true);
    await db.exec(`update strava_activities set raw='{"name":"rit"}' where id=5`);
    expect(await flag(5)).toBe(false);
    await db.exec(`update strava_activities set raw=raw || '{"gps_col_times":[]}' where id=3`);
    expect(await flag(3)).toBe(true);
    await db.exec(`update strava_activities set has_gps_times=null, name='andere naam' where id=1`);
    expect(await flag(1)).toBeNull();
  });

  it("is idempotent", async () => {
    await migrate("0281_strava_has_gps_times.sql");
    await migrate("0280_training_plan_fk_indexes.sql");
  });
});

describe("0280 indexen op training_plans-verwijzingen", () => {
  it("legt op elke verwijzing een index", async () => {
    const { rows } = await db.query<{ tabel: string; kolom: string; geindexeerd: boolean }>(`
      select c.conrelid::regclass::text as tabel, a.attname as kolom,
        exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1]) as geindexeerd
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f' and c.confrelid = 'training_plans'::regclass and c.confdeltype = 'n'`);
    expect(rows).toHaveLength(6);
    expect(rows.filter((row) => !row.geindexeerd)).toEqual([]);
  });
});

describe("gps-col-times leest via has_gps_times", () => {
  type Call = { filters: string[] };

  function stubAdmin(withFlag: boolean) {
    const calls: Call[] = [];
    const rides = [
      { id: 1, col_times: [{ slug: "x", seconds: 90, started_at: null }], segment_times: null },
      { id: 2, col_times: null, segment_times: [] },
    ];
    const query = (table: string) => {
      const call: Call = { filters: [] };
      if (table === "strava_activities") calls.push(call);
      const builder = {
        select: () => builder,
        eq: (column: string) => (call.filters.push(`eq:${column}`), builder),
        in: () => builder,
        update: () => builder,
        is: (column: string) => (call.filters.push(`is:${column}`), builder),
        not: (column: string) => (call.filters.push(`not:${column}`), builder),
        then: (resolve: (value: unknown) => void) => {
          if (table === "cols") return resolve({ data: [{ slug: "x", strava_segment_id: null }], error: null });
          if (table === "profile_climbed_cols") return resolve({ data: [], error: null });
          if (call.filters.includes("is:has_gps_times") && !withFlag) {
            return resolve({ data: null, error: { message: "column strava_activities.has_gps_times does not exist" } });
          }
          if (call.filters.includes("not:raw->gps_col_times")) return resolve({ data: [rides[0]], error: null });
          if (call.filters.includes("not:raw->gps_segment_times")) return resolve({ data: [rides[1]], error: null });
          return resolve({ data: rides, error: null });
        },
      };
      return builder;
    };
    return { admin: { from: query }, calls };
  }

  it("doet één query zonder filter op raw als de kolom bestaat", async () => {
    const { admin, calls } = stubAdmin(true);
    await applyGpsColTimesForUser(admin, A);
    expect(calls.map((call) => call.filters)).toEqual([["eq:profile_id", "is:has_gps_times"]]);
  });

  it("valt zonder 0281 terug op het filter op raw", async () => {
    const { admin, calls } = stubAdmin(false);
    await applyGpsColTimesForUser(admin, A);
    expect(calls.map((call) => call.filters)).toEqual([
      ["eq:profile_id", "is:has_gps_times"],
      ["eq:profile_id", "not:raw->gps_col_times"],
      ["eq:profile_id", "not:raw->gps_segment_times"],
    ]);
  });
});
