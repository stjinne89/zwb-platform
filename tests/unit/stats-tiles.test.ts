import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  defaultLayout,
  normalizeLayout,
  parseLayoutInput,
  type TileDef,
} from "@/lib/stats/tiles";

const tiles: TileDef[] = [
  { id: "a", title: "A", source: "strava", width: "full", defaultVisible: true },
  { id: "b", title: "B", source: "strava", width: "half", defaultVisible: false },
  { id: "c", title: "C", source: "intervals", width: "half", defaultVisible: true },
];

describe("normalizeLayout", () => {
  it("geeft zonder keuze de standaard", () => {
    expect(normalizeLayout(null, tiles)).toEqual(defaultLayout(tiles));
  });

  it("houdt de gekozen volgorde en vult nieuwe tegels achteraan aan", () => {
    expect(normalizeLayout([{ id: "b", visible: true }, { id: "a", visible: false }], tiles)).toEqual([
      { id: "b", visible: true },
      { id: "a", visible: false },
      { id: "c", visible: true },
    ]);
  });

  it("laat onbekende, dubbele en kapotte regels vallen", () => {
    expect(
      normalizeLayout([{ id: "weg", visible: true }, { id: "a", visible: true }, { id: "a", visible: false }, "x", null], tiles),
    ).toEqual([
      { id: "a", visible: true },
      { id: "b", visible: false },
      { id: "c", visible: true },
    ]);
  });
});

describe("parseLayoutInput", () => {
  it("accepteert een geldige keuze", () => {
    expect(parseLayoutInput([{ id: "c", visible: false }, { id: "a", visible: true }], tiles)).toEqual([
      { id: "c", visible: false },
      { id: "a", visible: true },
    ]);
  });

  it("weigert onbekende of dubbele id's, en een zichtbaarheid die geen boolean is", () => {
    expect(parseLayoutInput([{ id: "x", visible: true }], tiles)).toBeNull();
    expect(parseLayoutInput([{ id: "a", visible: true }, { id: "a", visible: true }], tiles)).toBeNull();
    expect(parseLayoutInput([{ id: "a", visible: "ja" }], tiles)).toBeNull();
    expect(parseLayoutInput("a", tiles)).toBeNull();
  });
});

describe("migratie 0241", () => {
  let db: PGlite;
  const memberId = "00000000-0000-0000-0000-000000000001";
  const otherId = "00000000-0000-0000-0000-000000000002";

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(
      [
        "create role anon; create role authenticated; create role service_role;",
        "create schema auth;",
        "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
        "create table public.profiles(id uuid primary key);",
        `insert into public.profiles values ('${memberId}'), ('${otherId}');`,
        "grant usage on schema public, auth to anon, authenticated;",
      ].join("\n"),
    );
    await db.exec(await readFile("supabase/migrations/0241_profile_stats_tiles.sql", "utf8"));
    await db.exec(`insert into profile_stats_tiles values ('${otherId}', '[{"id":"ritten","visible":true}]')`);
  }, 30_000);

  afterAll(async () => {
    await db?.close();
  });

  beforeEach(async () => {
    await db.exec("reset role;");
  });

  const as = (id: string) =>
    db.exec(`select set_config('request.jwt.claim.sub', '${id}', false); set role authenticated;`);

  it("laat een lid de eigen keuze opslaan en bijwerken", async () => {
    await as(memberId);
    await db.query(`insert into profile_stats_tiles (profile_id, tiles) values ($1, '[]')`, [memberId]);
    await db.query(
      `insert into profile_stats_tiles (profile_id, tiles) values ($1, '[{"id":"totalen","visible":false}]')
       on conflict (profile_id) do update set tiles = excluded.tiles`,
      [memberId],
    );
    const { rows } = await db.query<{ tiles: unknown }>("select tiles from profile_stats_tiles");
    expect(rows).toEqual([{ tiles: [{ id: "totalen", visible: false }] }]);
  });

  it("laat de keuze van een ander lid niet zien of schrijven", async () => {
    await as(memberId);
    const { rows } = await db.query("select * from profile_stats_tiles where profile_id = $1", [otherId]);
    expect(rows).toHaveLength(0);
    await expect(
      db.query(`insert into profile_stats_tiles (profile_id, tiles) values ($1, '[]')`, [otherId]),
    ).rejects.toThrow();
  });

  it("weigert iets anders dan een lijst", async () => {
    await expect(
      db.query(`insert into profile_stats_tiles (profile_id, tiles) values ($1, '{}')`, [memberId]),
    ).rejects.toThrow();
  });
});
