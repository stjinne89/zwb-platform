import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0157 en 0158 tegen een geïsoleerde PostgreSQL, bovenop de bestaande
// bibliotheek uit 0109 en 0110. Zegt niets over de productiedatabase zelf.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create table profiles(id uuid primary key, is_approved boolean);",
      "create function current_user_has_permission(text) returns boolean language sql stable as $$ select false $$;",
      "create function touch_training_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;",
    ].join("\n"),
  );
  for (const file of [
    "0109_mobility_library.sql",
    "0110_mobility_library_seed.sql",
    "0157_mobility_strength.sql",
    "0158_mobility_strength_seed.sql",
  ]) {
    await db.exec(await migration(file));
  }
}, 30000);

afterAll(async () => {
  await db?.close();
});

async function itemCounts() {
  const { rows } = await db.query<{ slug: string; count: number }>(
    "select s.slug, count(i.id)::int as count from mobility_series s left join mobility_series_items i on i.series_id = s.id group by s.slug order by s.slug",
  );
  return Object.fromEntries(rows.map((row) => [row.slug, row.count]));
}

describe("krachtreeksen (0157 + 0158)", () => {
  it("voegt drie krachtseries met elk vijf oefeningen toe en laat de rest staan", async () => {
    expect(await itemCounts()).toEqual({
      fundament: 5,
      "kracht-basis": 5,
      "kracht-eenbenig": 5,
      "kracht-klimmen": 5,
      "na-de-rit": 5,
      "voor-de-rit": 5,
      zithouding: 8,
    });
    const { rows } = await db.query<{ count: number }>(
      "select count(*)::int as count from mobility_exercises where category = 'kracht'",
    );
    expect(rows[0].count).toBe(7);
  });

  it("is opnieuw te draaien zonder dubbele items", async () => {
    await db.exec(await migration("0158_mobility_strength_seed.sql"));
    expect((await itemCounts())["kracht-klimmen"]).toBe(5);
  });

  it("houdt de checks strikt voor onbekende waarden", async () => {
    await expect(
      db.query(
        "insert into mobility_exercises(slug,title,category,region,cue_md,default_reps) values('x','X','onzin','been','-',5)",
      ),
    ).rejects.toThrow(/mobility_exercises_category_check/);
    await expect(
      db.query(
        "insert into mobility_series(slug,title,goal,timing,duration_minutes,is_standard) values('y','Y','onzin','rustdag',10,true)",
      ),
    ).rejects.toThrow(/mobility_series_goal_check/);
  });
});
