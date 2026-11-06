import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { suggestedWarmupTitle } from "@/lib/training/race-warmup";

// 0309 tegen een geïsoleerde PostgreSQL, bovenop de bibliotheek uit 0106, 0107,
// 0133, 0194 en 0221. Zegt niets over de productiedatabase zelf.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

type Row = { title: string; description: string | null; duration_minutes: number; structure_json: unknown };

async function warmups(): Promise<Row[]> {
  const { rows } = await db.query<Row>(
    "select title, description, duration_minutes, structure_json from training_workout_templates where form = 'warmup' and is_standard order by title",
  );
  return rows;
}

let before: Row[];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;",
      "create table profiles(id uuid primary key);",
      "create function current_user_has_permission(text) returns boolean language sql stable as $$ select false $$;",
      "create function touch_training_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;",
    ].join("\n"),
  );
  for (const file of [
    "0106_workout_library.sql",
    "0107_workout_library_seed.sql",
    "0133_workout_library_ftp_tests.sql",
    "0194_workout_library_training_forms.sql",
    "0221_workout_library_warmups.sql",
  ]) {
    await db.exec(await migration(file));
  }
  before = await warmups();
  await db.exec(await migration("0309_workout_library_warmup_names.sql"));
}, 30000);

afterAll(async () => {
  await db?.close();
});

describe("warming-ups zonder ZRL in de naam (0309)", () => {
  it("hernoemt ZRL lang en ZRL kort naar wedstrijd", async () => {
    expect((await warmups()).map((row) => row.title)).toEqual([
      "Warming-up lange wedstrijd",
      "Warming-up ploegentijdrit",
      "Warming-up tijdrit",
      "Warming-up wedstrijd",
      "Warming-up wedstrijd kort",
    ]);
  });

  it("houdt duur en opbouw gelijk", async () => {
    const after = await warmups();
    const byTitle = new Map(after.map((row) => [row.title, row]));
    const renamed: Record<string, string> = {
      "Warming-up ZRL lang": "Warming-up wedstrijd",
      "Warming-up ZRL kort": "Warming-up wedstrijd kort",
    };
    for (const row of before) {
      const now = byTitle.get(renamed[row.title] ?? row.title);
      expect(now?.duration_minutes).toBe(row.duration_minutes);
      expect(now?.structure_json).toEqual(row.structure_json);
    }
  });

  it("noemt de ZRL nergens meer", async () => {
    for (const row of await warmups()) {
      expect(`${row.title} ${row.description ?? ""}`).not.toMatch(/ZRL/);
    }
  });

  it("de voorkeuze bij een gewone race bestaat in de bibliotheek", async () => {
    const titles = (await warmups()).map((row) => row.title);
    expect(titles).toContain(suggestedWarmupTitle({ title: "Club race", duration_minutes: 45 }));
  });

  it("kan opnieuw draaien zonder iets te veranderen", async () => {
    const once = await warmups();
    await db.exec(await migration("0309_workout_library_warmup_names.sql"));
    expect(await warmups()).toEqual(once);
  });
});
