import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  alignBlockIntensity,
  blocksToWorkoutDoc,
  normalizeWorkoutBlocks,
  plannedWorkoutIntensity,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

// 0227 tegen een geïsoleerde PostgreSQL, bovenop de bibliotheek uit 0106, 0107,
// 0133, 0194 en 0221. Zegt niets over de productiedatabase zelf.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

const LONG_RIDES = [
  "Duur 150 tempo aan het eind",
  "Duur 180 fris en moe",
  "Duur 180 met sprints",
  "Duur 180 oplopend",
  "Duur 210 drempel aan het eind",
  "Duur 240",
];

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
    "0221_workout_library_warmups.sql",
  ]) {
    await db.exec(await migration(file));
  }
  before = await templates();
  await db.exec(await migration("0227_workout_library_long_rides.sql"));
}, 30000);

afterAll(async () => {
  await db?.close();
});

const isNew = (row: TemplateRow) => row.form === "duur" && LONG_RIDES.includes(row.title);
const longRides = async () => (await templates()).filter(isNew);
const blocksOf = (row: TemplateRow) =>
  normalizeWorkoutBlocks(row.structure_json, row.intensity as WorkoutIntensity);
const ride = async (title: string) => (await longRides()).find((row) => row.title === title)!;

describe("lange ritten in de bibliotheek (0227)", () => {
  it("voegt zes standaard duurritten toe en laat de rest staan", async () => {
    const rows = await longRides();
    expect(rows.map((row) => row.title)).toEqual(LONG_RIDES);
    expect(rows.every((row) => row.is_standard && row.intensity === "endurance")).toBe(true);
    expect((await templates()).filter((row) => !isNew(row))).toEqual(before);
  });

  it("heeft als duur de som van de blokken, ook met sprints", async () => {
    for (const row of await longRides()) {
      const blocks = blocksOf(row);
      expect(blocks.length).toBe((row.structure_json as unknown[]).length);
      expect(blocks.reduce((sum, block) => sum + block.durationMinutes, 0)).toBe(
        row.duration_minutes,
      );
      expect(blocksToWorkoutDoc(blocks, null)?.duration).toBe(row.duration_minutes * 60);
    }
  });

  it("geeft elk blok de intensiteit van de zone van zijn doel", async () => {
    for (const row of await longRides()) {
      // De warming-up (50-65%) heet in de hele standaardset 'endurance'.
      for (const block of blocksOf(row).slice(1)) {
        expect(alignBlockIntensity(block, null)).toBe(block);
      }
    }
  });

  it("heet in een schema naar zijn kernwerk", async () => {
    const labels = Object.fromEntries(
      (await longRides()).map((row) => [row.title, plannedWorkoutIntensity(row, null).label]),
    );
    expect(labels).toEqual({
      "Duur 150 tempo aan het eind": "Tempo",
      "Duur 180 fris en moe": "Drempel",
      "Duur 180 met sprints": "Rustige duur",
      "Duur 180 oplopend": "Intensieve duur",
      "Duur 210 drempel aan het eind": "Drempel",
      "Duur 240": "Rustige duur",
    });
  });

  it("rijdt drie series van drie sprints van 30 seconden, elk met 4,5 minuut herstel", async () => {
    const blocks = blocksOf(await ride("Duur 180 met sprints"));
    const sprints = blocks.filter((block) => block.burstSeconds);
    expect(sprints.length).toBe(9);
    for (const block of sprints) {
      expect(block.burstSeconds).toBe(30);
      expect(block.durationMinutes).toBe(5);
    }
    // Tussen de series zit een duurblok: nooit meer dan drie sprints op rij.
    const runs = blocks
      .map((block) => (block.burstSeconds ? "s" : "-"))
      .join("")
      .split("-")
      .filter(Boolean);
    expect(runs).toEqual(["sss", "sss", "sss"]);
  });

  it("zet het harde werk pas na twee uur, behalve de frisse blokken en het instapniveau", async () => {
    const hardStart = (row: TemplateRow, fromIndex = 0) => {
      const blocks = blocksOf(row);
      const index = blocks.findIndex(
        (block, i) => i >= fromIndex && (block.intensity === "tempo" || block.intensity === "threshold"),
      );
      return blocks.slice(0, index).reduce((sum, block) => sum + block.durationMinutes, 0);
    };
    expect(hardStart(await ride("Duur 150 tempo aan het eind"))).toBe(90);
    expect(hardStart(await ride("Duur 210 drempel aan het eind"))).toBe(165);
    // Na de frisse blokken (index 1-3) begint de tweede set op 2:25.
    expect(hardStart(await ride("Duur 180 fris en moe"), 4)).toBe(145);
  });

  it("kan opnieuw draaien zonder iets te veranderen", async () => {
    const once = await templates();
    await db.exec(await migration("0227_workout_library_long_rides.sql"));
    expect(await templates()).toEqual(once);
  });
});
