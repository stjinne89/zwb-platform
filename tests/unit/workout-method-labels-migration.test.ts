import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  alignBlockIntensity,
  blocksToWorkoutDoc,
  normalizeWorkoutBlocks,
  onOffReps,
  plannedWorkoutIntensity,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

// 0246 tegen een geïsoleerde PostgreSQL, bovenop de bibliotheek uit 0106, 0107,
// 0133, 0194, 0221 en 0227. training_workouts is hier een kale tabel: alleen de
// nieuwe kolom wordt getest. Zegt niets over de productiedatabase zelf.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

const NEW = {
  "Sweet spot 5x10 blokweek": "veelbelovend",
  "Sweet spot 6x12 blokweek": "veelbelovend",
  "Sweet spot 7x14 blokweek": "veelbelovend",
  "VO2max 30/15 blokweek": "veelbelovend",
  "VO2max 5x5 snelle start": "experimenteel",
  "VO2max 4x4 aflopend": "experimenteel",
  "VO2max 5x5 wisselend": "experimenteel",
  "Sprint 6x30s onderhoud": "veelbelovend",
  "Duur 90 met 3x3 sprints": "veelbelovend",
} as Record<string, string>;

type TemplateRow = {
  form: string;
  title: string;
  intensity: string;
  duration_minutes: number;
  is_standard: boolean;
  structure_json: unknown;
  method_label: string | null;
};

async function templates(): Promise<TemplateRow[]> {
  const { rows } = await db.query<TemplateRow>(
    "select form, title, intensity, duration_minutes, is_standard, structure_json, method_label from training_workout_templates order by form, title",
  );
  return rows;
}

let before: Omit<TemplateRow, "method_label">[];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;",
      "create table profiles(id uuid primary key);",
      "create table training_workouts(id uuid primary key default gen_random_uuid());",
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
    "0227_workout_library_long_rides.sql",
  ]) {
    await db.exec(await migration(file));
  }
  const { rows } = await db.query<Omit<TemplateRow, "method_label">>(
    "select form, title, intensity, duration_minutes, is_standard, structure_json from training_workout_templates order by form, title",
  );
  before = rows;
  await db.exec(await migration("0246_workout_method_labels.sql"));
}, 30000);

afterAll(async () => {
  await db?.close();
});

const isNew = (row: TemplateRow) => row.title in NEW;
const blocksOf = (row: TemplateRow) =>
  normalizeWorkoutBlocks(row.structure_json, row.intensity as WorkoutIntensity);

describe("veelbelovende en experimentele workouts (0246)", () => {
  it("voegt negen standaardworkouts toe met hun label en laat de rest staan", async () => {
    const rows = (await templates()).filter(isNew);
    expect(rows.map((row) => row.title).sort()).toEqual(Object.keys(NEW).sort());
    for (const row of rows) {
      expect(row.is_standard, row.title).toBe(true);
      expect(row.method_label, row.title).toBe(NEW[row.title]);
    }
    const rest = (await templates()).filter((row) => !isNew(row));
    expect(rest.every((row) => row.method_label === null)).toBe(true);
    const withoutLabel = rest.map((row) => {
      const copy: Partial<TemplateRow> = { ...row };
      delete copy.method_label;
      return copy;
    });
    expect(withoutLabel).toEqual(before);
  });

  it("heeft als duur de som van de blokken, ook in intervals.icu", async () => {
    for (const row of (await templates()).filter(isNew)) {
      const blocks = blocksOf(row);
      expect(blocks.length, row.title).toBe((row.structure_json as unknown[]).length);
      expect(blocks.reduce((sum, block) => sum + block.durationMinutes, 0), row.title).toBe(row.duration_minutes);
      expect(blocksToWorkoutDoc(blocks, null)?.duration, row.title).toBe(row.duration_minutes * 60);
    }
  });

  it("geeft elk blok de intensiteit van de zone van zijn doel", async () => {
    for (const row of (await templates()).filter(isNew)) {
      for (const block of blocksOf(row).slice(1)) {
        expect(alignBlockIntensity(block, null), `${row.title}: ${block.label}`).toBe(block);
      }
    }
  });

  it("heet in een schema naar zijn kernwerk", async () => {
    const labels = Object.fromEntries(
      (await templates()).filter(isNew).map((row) => [row.title, plannedWorkoutIntensity(row, null).label]),
    );
    expect(labels).toEqual({
      "Duur 90 met 3x3 sprints": "Rustige duur",
      "Sprint 6x30s onderhoud": "Anaeroob",
      "Sweet spot 5x10 blokweek": "Sweet spot",
      "Sweet spot 6x12 blokweek": "Sweet spot",
      "Sweet spot 7x14 blokweek": "Sweet spot",
      "VO2max 30/15 blokweek": "VO2max",
      "VO2max 4x4 aflopend": "VO2max",
      "VO2max 5x5 snelle start": "VO2max",
      "VO2max 5x5 wisselend": "VO2max",
    });
  });

  it("rijdt de 30/15-week als vijf series van twaalf keer 30/15", async () => {
    const row = (await templates()).find((item) => item.title === "VO2max 30/15 blokweek")!;
    const series = blocksOf(row).filter((block) => block.onOff);
    expect(series).toHaveLength(5);
    for (const block of series) expect(onOffReps(block)).toBe(12);
  });

  it("weigert een onbekend label, ook op een geplande workout", async () => {
    await expect(
      db.exec("update training_workout_templates set method_label = 'bewezen' where title = 'Duur 240'"),
    ).rejects.toThrow();
    await expect(db.exec("insert into training_workouts(method_label) values ('bewezen')")).rejects.toThrow();
    await db.exec("insert into training_workouts(method_label) values ('experimenteel'), (null)");
  });

  it("kan opnieuw draaien zonder iets te veranderen", async () => {
    const once = await templates();
    await db.exec(await migration("0246_workout_method_labels.sql"));
    expect(await templates()).toEqual(once);
  });
});
