import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0306 tegen een geïsoleerde PostgreSQL. Zegt niets over de productiedatabase,
// wel over de regels: geen rit bij zichzelf, en een verdwenen hoofdrit laat zijn
// stukken los in plaats van ze mee te nemen.

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create table public.strava_activities(id bigint primary key, name text);
    insert into public.strava_activities(id, name) values (1, 'workout'), (2, 'video'), (3, 'group');
  `);
  const sql = await readFile("supabase/migrations/0306_strava_activity_part_of.sql", "utf8");
  await db.exec(sql);
  // Twee keer draaien mag niets breken.
  await db.exec(sql);
}, 30000);

afterAll(async () => {
  await db?.close();
});

describe("0306 strava activity part of", () => {
  it("zet een rit bij een andere rit", async () => {
    await db.exec("update public.strava_activities set part_of_activity_id = 1 where id in (2, 3)");
    const { rows } = await db.query<{ id: number; part_of_activity_id: number | null }>(
      "select id, part_of_activity_id from public.strava_activities order by id",
    );
    expect(rows.map((row) => Number(row.part_of_activity_id ?? 0))).toEqual([0, 1, 1]);
  });

  it("weigert een rit bij zichzelf", async () => {
    await expect(
      db.exec("update public.strava_activities set part_of_activity_id = 1 where id = 1"),
    ).rejects.toThrow();
  });

  it("laat de stukken los als de hoofdrit verdwijnt", async () => {
    await db.exec("delete from public.strava_activities where id = 1");
    const { rows } = await db.query<{ part_of_activity_id: number | null }>(
      "select part_of_activity_id from public.strava_activities order by id",
    );
    expect(rows.map((row) => row.part_of_activity_id)).toEqual([null, null]);
  });
});
