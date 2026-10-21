import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0265 tegen een geïsoleerde PostgreSQL. Zegt niets over de productiedatabase
// zelf; daar worden migraties met de hand toegepast.

let db: PGlite;

const ANNA = "00000000-0000-0000-0000-00000000000a";
const BART = "00000000-0000-0000-0000-00000000000b";
const CEES = "00000000-0000-0000-0000-00000000000c";
// Nog niet goedgekeurd.
const DIRK = "00000000-0000-0000-0000-00000000000d";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create table profiles(id uuid primary key, is_approved boolean);",
      "create function touch_training_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;",
      `insert into profiles values ('${ANNA}', true), ('${BART}', true), ('${CEES}', true), ('${DIRK}', false);`,
      "grant usage on schema public to authenticated, anon;",
      // Net als op productie (0001): ingelogde leden lezen profielen.
      "grant select on profiles to authenticated;",
    ].join("\n"),
  );
  await db.exec(await readFile("supabase/migrations/0265_zwbeter_berg.sql", "utf8"));
  // Snapshots komen van de server; hier als eigenaar van de tabel.
  for (const id of [ANNA, BART, CEES, DIRK]) {
    await db.query(
      "insert into zwbeter_berg_snapshots(profile_id, week, height, ridges, consistency, source) values ($1, '2026-10-19', 3400, '{\"explosief\": 3404, \"racen\": null}', 0.8, 'week')",
      [id],
    );
  }
}, 60000);

afterAll(async () => {
  await db?.close();
});

async function as<T>(userId: string, run: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec("set role authenticated");
  try {
    return await run();
  } finally {
    await db.exec("reset role");
  }
}

const visibleTo = async (viewer: string) =>
  (
    await as(viewer, () => db.query<{ profile_id: string }>("select profile_id from zwbeter_berg_snapshots order by profile_id"))
  ).rows.map((row) => row.profile_id);

const share = (id: string, visible = true) =>
  as(id, () =>
    db.query(
      "insert into zwbeter_berg_preferences(profile_id, consent_version, visible) values ($1, '2026-10-21', $2) on conflict (profile_id) do update set consent_version = excluded.consent_version, visible = excluded.visible",
      [id, visible],
    ),
  );

describe("ZWBeter-berg (0265)", () => {
  it("toont zonder delen alleen je eigen berg", async () => {
    expect(await visibleTo(ANNA)).toEqual([ANNA]);
    expect(await visibleTo(BART)).toEqual([BART]);
  });

  it("toont de berg van een ander alleen als jullie allebei delen", async () => {
    await share(ANNA);
    expect(await visibleTo(ANNA)).toEqual([ANNA]);
    expect(await visibleTo(BART)).toEqual([BART]);
    await share(BART);
    expect(await visibleTo(ANNA)).toEqual([ANNA, BART]);
    expect(await visibleTo(BART)).toEqual([ANNA, BART]);
    expect(await visibleTo(CEES)).toEqual([CEES]);
  });

  it("laat wie nog niet is goedgekeurd niet meedoen", async () => {
    await expect(share(DIRK)).rejects.toThrow(/row-level security/);
    expect(await visibleTo(DIRK)).toEqual([DIRK]);
  });

  it("verbergt meteen bij verbergen of intrekken, maar houdt je eigen historie", async () => {
    await share(BART, false);
    expect(await visibleTo(ANNA)).toEqual([ANNA]);
    await share(BART, true);
    expect(await visibleTo(ANNA)).toEqual([ANNA, BART]);
    await as(BART, () => db.query(`update zwbeter_berg_preferences set consent_version = null where profile_id = '${BART}'`));
    expect(await visibleTo(ANNA)).toEqual([ANNA]);
    expect(await visibleTo(BART)).toEqual([BART]);
  });

  it("houdt voorkeuren privé", async () => {
    const seen = await as(CEES, () => db.query("select profile_id from zwbeter_berg_preferences"));
    expect(seen.rows).toEqual([]);
    await expect(
      as(CEES, () => db.query(`insert into zwbeter_berg_preferences(profile_id, consent_version) values ('${ANNA}', '2026-10-21')`)),
    ).rejects.toThrow(/row-level security/);
  });

  it("laat leden geen snapshot schrijven en alleen hun eigen berg wissen", async () => {
    await expect(
      as(ANNA, () =>
        db.query(
          `insert into zwbeter_berg_snapshots(profile_id, week, height, ridges, source) values ('${ANNA}', '2026-10-26', 9999, '{}', 'week')`,
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(ANNA, () => db.query(`update zwbeter_berg_snapshots set height = 9999 where profile_id = '${ANNA}'`)),
    ).rejects.toThrow(/permission denied/);
    await as(ANNA, () => db.query(`delete from zwbeter_berg_snapshots where profile_id = '${CEES}'`));
    expect((await db.query(`select 1 from zwbeter_berg_snapshots where profile_id = '${CEES}'`)).rows).toHaveLength(1);
    await as(CEES, () => db.query(`delete from zwbeter_berg_snapshots where profile_id = '${CEES}'`));
    expect((await db.query(`select 1 from zwbeter_berg_snapshots where profile_id = '${CEES}'`)).rows).toHaveLength(0);
  });

  it("weigert onbekende richtingen, een andere dag dan maandag en ruwe velden", async () => {
    await expect(
      db.query(
        `insert into zwbeter_berg_snapshots(profile_id, week, ridges, source) values ('${ANNA}', '2026-10-26', '{"watt": 300}', 'week')`,
      ),
    ).rejects.toThrow(/zwbeter_berg_snapshots_ridges_check/);
    await expect(
      db.query(
        `insert into zwbeter_berg_snapshots(profile_id, week, ridges, source) values ('${ANNA}', '2026-10-27', '{}', 'week')`,
      ),
    ).rejects.toThrow(/zwbeter_berg_snapshots_week_check/);
    const columns = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'zwbeter_berg_snapshots'",
    );
    expect(columns.rows.map((row) => row.column_name).sort()).toEqual(
      ["consistency", "created_at", "height", "profile_id", "provenance", "ridges", "source", "week"].sort(),
    );
  });

  it("laat anon de deelfunctie niet uitvoeren", async () => {
    const { rows } = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('anon', 'public.zwbeter_berg_shares(uuid)', 'execute') as allowed",
    );
    expect(rows[0].allowed).toBe(false);
  });
});
