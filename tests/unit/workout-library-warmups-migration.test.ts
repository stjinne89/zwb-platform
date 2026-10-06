import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { TRAINING_FORM_SLUGS } from "@/lib/training/training-forms";
import {
  blocksToWorkoutDoc,
  dropShortRecoveryRides,
  normalizeWorkoutBlocks,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

// 0221 tegen een geïsoleerde PostgreSQL, bovenop de bibliotheek uit 0106, 0107,
// 0133 en 0194. Zegt niets over de productiedatabase zelf.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

type TemplateRow = {
  form: string;
  title: string;
  intensity: string;
  duration_minutes: number;
  is_standard: boolean;
  structure_json: unknown;
};

async function templates(): Promise<TemplateRow[]> {
  const { rows } = await db.query<TemplateRow>(
    "select form, title, intensity, duration_minutes, is_standard, structure_json from training_workout_templates order by form, title",
  );
  return rows;
}

let before: TemplateRow[];

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
  ]) {
    await db.exec(await migration(file));
  }
  before = await templates();
  await db.exec(await migration("0221_workout_library_warmups.sql"));
}, 30000);

afterAll(async () => {
  await db?.close();
});

const warmups = async () => (await templates()).filter((row) => row.form === "warmup");

describe("warming-ups in de bibliotheek (0221)", () => {
  it("voegt vijf standaard warming-ups toe en laat de rest staan", async () => {
    const rows = await warmups();
    expect(rows.map((row) => row.title)).toEqual([
      "Warming-up ZRL kort",
      "Warming-up ZRL lang",
      "Warming-up lange wedstrijd",
      "Warming-up ploegentijdrit",
      "Warming-up tijdrit",
    ]);
    expect(rows.every((row) => row.is_standard)).toBe(true);
    expect((await templates()).filter((row) => row.form !== "warmup")).toEqual(before);
  });

  it("heeft als duur de som van de blokken, ook met bursts", async () => {
    for (const row of await warmups()) {
      const blocks = normalizeWorkoutBlocks(row.structure_json, row.intensity as WorkoutIntensity);
      expect(blocks.length).toBe((row.structure_json as unknown[]).length);
      expect(blocks.reduce((sum, block) => sum + block.durationMinutes, 0)).toBe(
        row.duration_minutes,
      );
      expect(blocksToWorkoutDoc(blocks, null)?.duration).toBe(row.duration_minutes * 60);
    }
  });

  it("geeft elke warming-up bursts van 6 seconden met minstens 54 seconden ertussen", async () => {
    for (const row of await warmups()) {
      const blocks = normalizeWorkoutBlocks(row.structure_json, row.intensity as WorkoutIntensity);
      const bursts = blocks.filter((block) => block.burstSeconds);
      expect(bursts.length).toBeGreaterThanOrEqual(1);
      expect(bursts.length).toBeLessThanOrEqual(4);
      for (const block of bursts) {
        expect(block.burstSeconds).toBe(6);
        expect(block.durationMinutes).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("valt niet weg als korte herstelrit", async () => {
    const rows = await warmups();
    expect(dropShortRecoveryRides(rows.map((row) => ({ ...row, durationMinutes: row.duration_minutes }))).length).toBe(
      rows.length,
    );
  });

  it("accepteert elke trainingsvorm uit de code", async () => {
    for (const slug of TRAINING_FORM_SLUGS) {
      await db.query(
        "insert into training_workout_templates (form, title, duration_minutes, intensity) values ($1, $2, 10, 'endurance')",
        [slug, `Eigen ${slug}`],
      );
    }
    await db.exec("delete from training_workout_templates where title like 'Eigen %'");
  });

  it("kan opnieuw draaien zonder iets te veranderen", async () => {
    const once = await templates();
    await db.exec(await migration("0221_workout_library_warmups.sql"));
    expect(await templates()).toEqual(once);
  });
});
