import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  alignBlockIntensity,
  blocksToWorkoutDoc,
  normalizeWorkoutBlocks,
  plannedWorkoutIntensity,
  type WorkoutBlock,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

// 0228 tegen een geïsoleerde PostgreSQL, bovenop de bibliotheek uit 0106, 0107,
// 0133, 0194, 0221 en 0227. Zegt niets over de productiedatabase zelf.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

const LONG_RIDES = [
  "Duur 180 golvend",
  "Duur 180 kracht",
  "Duur 180 souplesse",
  "Duur 195 cadanswissel",
  "Duur 210 alles kan",
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
    "0227_workout_library_long_rides.sql",
  ]) {
    await db.exec(await migration(file));
  }
  before = await templates();
  await db.exec(await migration("0228_workout_library_long_rides_cadence.sql"));
}, 30000);

afterAll(async () => {
  await db?.close();
});

const isNew = (row: TemplateRow) => row.form === "duur" && LONG_RIDES.includes(row.title);
const longRides = async () => (await templates()).filter(isNew);
const blocksOf = (row: TemplateRow) =>
  normalizeWorkoutBlocks(row.structure_json, row.intensity as WorkoutIntensity);
const ride = async (title: string) => (await longRides()).find((row) => row.title === title)!;
const minutes = (blocks: WorkoutBlock[]) => blocks.reduce((sum, block) => sum + block.durationMinutes, 0);

describe("lange ritten met cadans en alle zones (0228)", () => {
  it("voegt vijf standaard duurritten van minstens drie uur toe en laat de rest staan", async () => {
    const rows = await longRides();
    expect(rows.map((row) => row.title)).toEqual(LONG_RIDES);
    expect(rows.every((row) => row.is_standard && row.intensity === "endurance")).toBe(true);
    expect(rows.every((row) => row.duration_minutes >= 180)).toBe(true);
    expect((await templates()).filter((row) => !isNew(row))).toEqual(before);
  });

  it("heeft als duur de som van de blokken, ook met sprints", async () => {
    for (const row of await longRides()) {
      const blocks = blocksOf(row);
      expect(blocks.length).toBe((row.structure_json as unknown[]).length);
      expect(minutes(blocks)).toBe(row.duration_minutes);
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
      "Duur 180 golvend": "VO2max",
      "Duur 180 kracht": "Drempel",
      "Duur 180 souplesse": "Intensieve duur",
      "Duur 195 cadanswissel": "Tempo",
      "Duur 210 alles kan": "VO2max",
    });
  });

  it("zet de cadans in de notitie van elk cadansblok", async () => {
    const cadence = (title: string, label: string) =>
      ride(title).then((row) => blocksOf(row).filter((block) => block.label.startsWith(label)));
    const low = [...(await cadence("Duur 180 kracht", "Kracht")), ...(await cadence("Duur 195 cadanswissel", "Lage"))];
    const high = [
      ...(await cadence("Duur 180 souplesse", "Souplesse")),
      ...(await cadence("Duur 195 cadanswissel", "Hoge")),
    ];
    expect(low.length).toBe(10);
    expect(high.length).toBe(10);
    expect(low.every((block) => block.durationMinutes === 5 && block.notes.includes("Cadans 55-65"))).toBe(true);
    expect(high.every((block) => block.durationMinutes === 5 && block.notes.includes("Cadans 105-115"))).toBe(true);
  });

  it("raakt in alles kan elke zone aan", async () => {
    const blocks = blocksOf(await ride("Duur 210 alles kan"));
    expect(new Set(blocks.map((block) => block.intensity))).toEqual(
      new Set(["recovery", "endurance", "tempo", "threshold", "vo2max", "anaerobic"]),
    );
    expect(blocks.filter((block) => block.burstSeconds).map((block) => block.burstSeconds)).toEqual([10, 10]);
    // Van hard en kort naar lang en rustiger.
    const order = ["Sprint 1/2", "Anaeroob 1/2", "VO2max 1/2", "Drempel", "Sweet spot", "Tempo", "Intensieve duur"];
    const positions = order.map((label) => blocks.findIndex((block) => block.label === label));
    expect(positions).not.toContain(-1);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("rijdt in golvend twaalf versnellingen van een minuut, tien minuten uit elkaar", async () => {
    const blocks = blocksOf(await ride("Duur 180 golvend"));
    const starts = blocks.flatMap((block, index) =>
      block.label.startsWith("Versnelling") ? [minutes(blocks.slice(0, index))] : [],
    );
    expect(starts).toEqual(Array.from({ length: 12 }, (_, i) => 24 + i * 10));
  });

  it("kan opnieuw draaien zonder iets te veranderen", async () => {
    const once = await templates();
    await db.exec(await migration("0228_workout_library_long_rides_cadence.sql"));
    expect(await templates()).toEqual(once);
  });
});
