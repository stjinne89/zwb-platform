import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0202 herschrijft policies mechanisch; deze test bewijst dat alleen de kale
// auth-aanroepen worden omhuld en dat de rechten gelijk blijven.
let db: PGlite;
const me = "00000000-0000-0000-0000-000000000001";
const other = "00000000-0000-0000-0000-000000000002";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    grant usage on schema public, auth to authenticated;
    create table notes(id int primary key, owner uuid, body text);
    alter table notes enable row level security;
    grant select, insert, update on notes to authenticated;
    create policy notes_own on notes for select to authenticated using (owner = auth.uid());
    create policy notes_insert on notes for insert to authenticated with check (owner = auth.uid() and auth.role() = 'authenticated');
    create policy notes_update on notes for update to authenticated using (owner = auth.uid()) with check (owner = (select auth.uid()));
    create policy notes_admin on notes for select to authenticated using ((auth.jwt() ->> 'admin') = 'true');
    create policy notes_wrapped on notes for select to authenticated using (owner = (select auth.uid()) and id > 100);
    create policy notes_public on notes for select to authenticated using (id = 0);
    insert into notes values (0, null, 'publiek'), (1, '${me}', 'mijn'), (2, '${other}', 'ander'), (101, '${me}', 'groot');
  `);
  await db.exec(await readFile("supabase/migrations/0202_rls_initplan.sql", "utf8"));
});
afterAll(async () => { await db?.close(); });

async function policy(name: string) {
  return (await db.query<{ qual: string | null; with_check: string | null }>(
    "select qual, with_check from pg_policies where policyname = $1", [name],
  )).rows[0];
}
const bare = /(?<!SELECT )auth\.(uid|role|jwt)\(\)/;

describe("0202 RLS initplan rewrite", () => {
  it("wraps every bare auth call in using and with check", async () => {
    for (const name of ["notes_own", "notes_insert", "notes_update", "notes_admin", "notes_wrapped"]) {
      const p = await policy(name);
      expect(p.qual ?? "").not.toMatch(bare);
      expect(p.with_check ?? "").not.toMatch(bare);
    }
    expect((await policy("notes_insert")).with_check).toMatch(/SELECT auth\.role\(\)/);
    expect((await policy("notes_admin")).qual).toMatch(/SELECT auth\.jwt\(\)/);
  });

  it("leaves policies without auth calls untouched and drops its helper", async () => {
    expect((await policy("notes_public")).qual).toBe("(id = 0)");
    const helper = await db.query("select 1 from pg_proc where proname = 'rls_wrap_auth_calls'");
    expect(helper.rows).toHaveLength(0);
  });

  it("keeps the same access", async () => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role','authenticated',false)", [me]);
    await db.exec("set role authenticated");
    const ids = (await db.query<{ id: number }>("select id from notes order by id")).rows.map((r) => r.id);
    expect(ids).toEqual([0, 1, 101]);
    await expect(db.query("insert into notes values (3, $1, 'x')", [other])).rejects.toThrow(/row-level security/);
    await db.query("insert into notes values (4, $1, 'x')", [me]);
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims','{\"admin\":\"true\"}',false)");
    await db.exec("set role authenticated");
    const all = (await db.query<{ id: number }>("select id from notes order by id")).rows.map((r) => r.id);
    expect(all).toEqual([0, 1, 2, 4, 101]);
    await db.exec("reset role");
  });

  it("is safe to run twice", async () => {
    const before = await db.query("select policyname, qual, with_check from pg_policies order by 1");
    await db.exec(await readFile("supabase/migrations/0202_rls_initplan.sql", "utf8"));
    const after = await db.query("select policyname, qual, with_check from pg_policies order by 1");
    expect(after.rows).toEqual(before.rows);
  });
});
