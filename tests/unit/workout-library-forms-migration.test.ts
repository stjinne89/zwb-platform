import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  normalizeWorkoutBlocks,
  plannedWorkoutIntensity,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

// 0194 tegen een geïsoleerde PostgreSQL, bovenop de bibliotheek uit 0106, 0107
// en 0133. Zegt niets over de productiedatabase zelf.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

type TemplateRow = {
  form: string;
  title: string;
  intensity: string;
  is_standard: boolean;
  structure_json: unknown;
};

async function templates(): Promise<TemplateRow[]> {
  const { rows } = await db.query<TemplateRow>(
    "select form, title, intensity, is_standard, structure_json from training_workout_templates order by form, title",
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
  ]) {
    await db.exec(await migration(file));
  }
  // Een eigen workout van een trainer, die de migratie niet mag raken.
  await db.exec(
    `insert into training_workout_templates (form, title, duration_minutes, intensity, structure_json, is_standard)
     values ('sweetspot', 'Eigen sweet spot', 20, 'tempo',
       '[{"label":"SS","durationMinutes":20,"target":"90-94%","notes":"","intensity":"tempo"}]'::jsonb, false)`,
  );
  before = await templates();
  await db.exec(await migration("0194_workout_library_training_forms.sql"));
}, 30000);

afterAll(async () => {
  await db?.close();
});

function targetsOf(row: TemplateRow, intensity: string) {
  return (row.structure_json as Array<{ target: string; intensity: string }>)
    .filter((block) => block.intensity === intensity)
    .map((block) => block.target);
}

function labelOf(row: TemplateRow) {
  return plannedWorkoutIntensity(
    { intensity: row.intensity, structure_json: row.structure_json },
    null,
  ).label;
}

describe("bibliotheek op de trainingsvormen (0194)", () => {
  it("zet de sweet-spotblokken op 87-89%, zodat ze Sweet spot heten", async () => {
    const rows = (await templates()).filter((row) => row.form === "sweetspot" && row.is_standard);
    expect(rows.length).toBe(4);
    for (const row of rows) {
      expect(new Set(targetsOf(row, "tempo"))).toEqual(new Set(["87-89%"]));
      expect(labelOf(row)).toBe("Sweet spot");
    }
  });

  it("zet de tempoblokken op 81-86%, ook in de duurrit met tempoblokken", async () => {
    const rows = (await templates()).filter(
      (row) =>
        row.is_standard &&
        (row.form === "tempo" || row.title === "Duur met tempoblokken"),
    );
    expect(rows.length).toBe(4);
    for (const row of rows) {
      expect(new Set(targetsOf(row, "tempo"))).toEqual(new Set(["81-86%"]));
      expect(labelOf(row)).toBe("Tempo");
    }
  });

  it("laat de andere blokken, de andere vormen en eigen workouts staan", async () => {
    const after = await templates();
    const key = (row: TemplateRow) => `${row.form}/${row.title}`;
    const beforeByKey = new Map(before.map((row) => [key(row), row]));
    for (const row of after) {
      const old = beforeByKey.get(key(row))!;
      const touched =
        row.is_standard &&
        (row.form === "sweetspot" || row.form === "tempo" || row.title === "Duur met tempoblokken");
      if (!touched) {
        expect(row.structure_json).toEqual(old.structure_json);
        continue;
      }
      const oldBlocks = old.structure_json as Array<Record<string, unknown>>;
      const newBlocks = row.structure_json as Array<Record<string, unknown>>;
      expect(newBlocks.length).toBe(oldBlocks.length);
      newBlocks.forEach((block, index) => {
        // Alleen het doel van een tempoblok mag veranderen.
        expect({ ...block, target: null }).toEqual({ ...oldBlocks[index], target: null });
        if (block.intensity !== "tempo") expect(block.target).toBe(oldBlocks[index].target);
      });
      // Nog steeds bruikbaar als workoutblokken.
      expect(
        normalizeWorkoutBlocks(row.structure_json, row.intensity as WorkoutIntensity).length,
      ).toBe(newBlocks.length);
    }
  });

  it("kan opnieuw draaien zonder iets te veranderen", async () => {
    const once = await templates();
    await db.exec(await migration("0194_workout_library_training_forms.sql"));
    expect(await templates()).toEqual(once);
  });
});
