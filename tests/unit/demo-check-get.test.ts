import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0357: demo_read_only() slaat GET en HEAD over (die zijn in PostgREST al
// alleen-lezen) en strava_activities krijgt een index voor uitgesloten ritten
// (databasecheck 2026-11-24).
let db: PGlite;
const DEMO = "00000000-0000-0000-0000-00000000000d";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;",
      "create table profiles(id uuid primary key, is_demo boolean not null default false);",
      `insert into profiles values ('${DEMO}', true);`,
      "create function current_user_is_demo() returns boolean language sql stable as $$ select coalesce((select is_demo from profiles where id = (select auth.uid())), false) $$;",
      "create table strava_activities(id bigint primary key, profile_id uuid, training_excluded_at timestamptz);",
    ].join("\n"),
  );
  await db.exec(await readFile("supabase/migrations/0357_demo_check_get_excluded_idx.sql", "utf8"));
});

afterAll(async () => {
  await db.close();
});

async function readOnlyAfter(method: string | null, uid: string | null) {
  await db.exec("begin");
  try {
    if (method !== null) await db.query("select set_config('request.method', $1, true)", [method]);
    if (uid !== null) await db.query("select set_config('test.uid', $1, true)", [uid]);
    await db.query("select public.demo_read_only()");
    const { rows } = await db.query<{ ro: string }>("select current_setting('transaction_read_only') as ro");
    return rows[0].ro;
  } finally {
    await db.exec("rollback");
  }
}

describe("0357 demo_read_only", () => {
  it("slaat GET en HEAD over", async () => {
    expect(await readOnlyAfter("GET", DEMO)).toBe("off");
    expect(await readOnlyAfter("HEAD", DEMO)).toBe("off");
  });

  it("zet een schrijvend verzoek van een demo-account op alleen-lezen", async () => {
    expect(await readOnlyAfter("POST", DEMO)).toBe("on");
    expect(await readOnlyAfter("PATCH", DEMO)).toBe("on");
  });

  it("valt zonder request.method terug op de oude controle", async () => {
    expect(await readOnlyAfter(null, DEMO)).toBe("on");
  });

  it("laat verzoeken zonder gebruiker met rust", async () => {
    expect(await readOnlyAfter("POST", null)).toBe("off");
  });
});

describe("0357 index", () => {
  it("legt een partiële index op uitgesloten ritten", async () => {
    const { rows } = await db.query<{ indexdef: string }>(
      "select indexdef from pg_indexes where indexname = 'strava_activities_excluded_idx'",
    );
    expect(rows[0]?.indexdef).toMatch(/\(profile_id\) WHERE \(training_excluded_at IS NOT NULL\)/);
  });
});
