import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { ftpTestBlocks, ftpTestDurationMinutes } from "@/lib/training/ftp-test";

// 0244 tegen een geïsoleerde PostgreSQL, bovenop de bibliotheek uit 0106, 0107,
// 0133 en 0194. Zegt niets over de productiedatabase zelf.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

type Row = { duration_minutes: number; structure_json: Array<Record<string, unknown>> };

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
    "0244_workout_library_ftp20_warmup.sql",
  ]) {
    await db.exec(await migration(file));
  }
}, 30000);

afterAll(async () => {
  await db?.close();
});

describe("20-minutentest in de bibliotheek (0244)", () => {
  it("heeft dezelfde blokken en duur als de test die de app zelf inplant", async () => {
    const { rows } = await db.query<Row>(
      "select duration_minutes, structure_json from training_workout_templates where is_standard and test_type = 'twenty_min'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].duration_minutes).toBe(ftpTestDurationMinutes("twenty_min"));
    const code = ftpTestBlocks("twenty_min").map((block) => ({
      label: block.label,
      durationMinutes: block.durationMinutes,
      target: block.target,
    }));
    const library = rows[0].structure_json.map((block) => ({
      label: block.label,
      durationMinutes: block.durationMinutes,
      target: block.target,
    }));
    expect(library).toEqual(code);
    expect(library.some((block) => block.label === "Opener")).toBe(false);
  });
});
