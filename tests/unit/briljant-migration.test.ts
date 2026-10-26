import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { CTL_ANCHORS } from "@/lib/briljant/norms";
import { storedScore } from "@/lib/briljant/compare";
import { levelAt } from "@/lib/briljant/score";

// 0265 tot en met 0270 tegen een geïsoleerde PostgreSQL. Zegt niets over de productiedatabase
// zelf; daar worden migraties met de hand toegepast.

let db: PGlite;

const ANNA = "00000000-0000-0000-0000-00000000000a";
const BART = "00000000-0000-0000-0000-00000000000b";
const CEES = "00000000-0000-0000-0000-00000000000c";
// Nog niet goedgekeurd.
const DIRK = "00000000-0000-0000-0000-00000000000d";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create table profiles(id uuid primary key, is_approved boolean);",
      "create function touch_training_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;",
      `insert into profiles values ('${ANNA}', true), ('${BART}', true), ('${CEES}', true), ('${DIRK}', false);`,
      "grant usage on schema public to authenticated, anon;",
      // Net als op productie (0001): ingelogde leden lezen profielen.
      "grant select on profiles to authenticated;",
    ].join("\n"),
  );
  await db.exec(await readFile("supabase/migrations/0265_zwbriljant.sql", "utf8"));
  await db.exec(await readFile("supabase/migrations/0266_zwbriljant_share_all_members.sql", "utf8"));
  await db.exec(await readFile("supabase/migrations/0267_zwbriljant_share_by_default.sql", "utf8"));
  await db.exec(await readFile("supabase/migrations/0268_zwbriljant_share_to_see.sql", "utf8"));
  // Snapshots komen van de server; hier als eigenaar van de tabel.
  for (const id of [ANNA, BART, CEES, DIRK]) {
    await db.query(
      "insert into zwbriljant_snapshots(profile_id, week, score, facets, consistency, source) values ($1, '2026-10-19', 4.55, '{\"sprint\": 4.8, \"racen\": null}', 0.8, 'week')",
      [id],
    );
  }
}, 60000);

afterAll(async () => {
  await db?.close();
});

async function as<T>(userId: string, run: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec("set role authenticated");
  try {
    return await run();
  } finally {
    await db.exec("reset role");
  }
}

const visibleTo = async (viewer: string) =>
  (
    await as(viewer, () => db.query<{ profile_id: string }>("select profile_id from zwbriljant_snapshots order by profile_id"))
  ).rows.map((row) => row.profile_id);

const share = (id: string, visible = true) =>
  as(id, () =>
    db.query(
      "insert into zwbriljant_preferences(profile_id, consent_version, visible) values ($1, '2026-10-21', $2) on conflict (profile_id) do update set consent_version = excluded.consent_version, visible = excluded.visible",
      [id, visible],
    ),
  );

// Zoals de server doet als een lid ZWBriljant opent: een voorkeur met de standaard.
const opened = (id: string) =>
  db.query("insert into zwbriljant_preferences(profile_id) values ($1) on conflict (profile_id) do nothing", [id]);

describe("ZWBriljant (0265 tot en met 0270)", () => {
  it("toont zonder voorkeur (nog nooit geopend) alleen je eigen steen", async () => {
    expect(await visibleTo(ANNA)).toEqual([ANNA]);
    expect(await visibleTo(BART)).toEqual([BART]);
  });

  it("toont een gedeelde steen aan alle goedgekeurde leden, ook als ze zelf niet delen", async () => {
    await share(ANNA);
    expect(await visibleTo(BART)).toEqual([ANNA, BART]);
    expect(await visibleTo(CEES)).toEqual([ANNA, CEES]);
    // Anna deelt, Bart niet: Anna ziet Bart dus niet.
    expect(await visibleTo(ANNA)).toEqual([ANNA]);
    await share(BART);
    expect(await visibleTo(ANNA)).toEqual([ANNA, BART]);
    expect(await visibleTo(CEES)).toEqual([ANNA, BART, CEES]);
  });

  it("toont gedeelde stenen niet aan wie nog niet is goedgekeurd", async () => {
    expect(await visibleTo(DIRK)).toEqual([DIRK]);
  });

  it("laat wie nog niet is goedgekeurd niet meedoen", async () => {
    await expect(share(DIRK)).rejects.toThrow(/row-level security/);
    expect(await visibleTo(DIRK)).toEqual([DIRK]);
  });

  it("verbergt meteen bij verbergen, maar houdt je eigen historie", async () => {
    await share(BART, false);
    expect(await visibleTo(CEES)).toEqual([ANNA, CEES]);
    // Wie verbergt, ziet ook de anderen niet meer (0268); zijn eigen steen wel.
    expect(await visibleTo(BART)).toEqual([BART]);
    await share(BART, true);
    expect(await visibleTo(CEES)).toEqual([ANNA, BART, CEES]);
  });

  it("deelt standaard zodra je ZWBriljant opent, ook zonder toestemming (0267)", async () => {
    await opened(CEES);
    expect(await visibleTo(ANNA)).toEqual([ANNA, BART, CEES]);
    // De oude toestemming beslist niet meer: alleen verbergen telt.
    await as(BART, () => db.query(`update zwbriljant_preferences set consent_version = null where profile_id = '${BART}'`));
    expect(await visibleTo(ANNA)).toEqual([ANNA, BART, CEES]);
    await as(CEES, () => db.query(`update zwbriljant_preferences set visible = false where profile_id = '${CEES}'`));
    expect(await visibleTo(ANNA)).toEqual([ANNA, BART]);
  });

  it("houdt voorkeuren privé", async () => {
    // Alleen je eigen voorkeur, nooit die van een ander.
    const seen = await as(CEES, () => db.query<{ profile_id: string }>("select profile_id from zwbriljant_preferences"));
    expect(seen.rows.map((row) => row.profile_id)).toEqual([CEES]);
    await expect(
      as(CEES, () => db.query(`insert into zwbriljant_preferences(profile_id, consent_version) values ('${ANNA}', '2026-10-21')`)),
    ).rejects.toThrow(/row-level security/);
  });

  it("laat leden geen snapshot schrijven en alleen hun eigen steen wissen", async () => {
    await expect(
      as(ANNA, () =>
        db.query(
          `insert into zwbriljant_snapshots(profile_id, week, score, facets, source) values ('${ANNA}', '2026-10-26', 9.9, '{}', 'week')`,
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(ANNA, () => db.query(`update zwbriljant_snapshots set score = 9.9 where profile_id = '${ANNA}'`)),
    ).rejects.toThrow(/permission denied/);
    await as(ANNA, () => db.query(`delete from zwbriljant_snapshots where profile_id = '${CEES}'`));
    expect((await db.query(`select 1 from zwbriljant_snapshots where profile_id = '${CEES}'`)).rows).toHaveLength(1);
    await as(CEES, () => db.query(`delete from zwbriljant_snapshots where profile_id = '${CEES}'`));
    expect((await db.query(`select 1 from zwbriljant_snapshots where profile_id = '${CEES}'`)).rows).toHaveLength(0);
  });

  it("weigert onbekende facetten, een andere dag dan maandag, een onzinscore en ruwe velden", async () => {
    await expect(
      db.query(
        `insert into zwbriljant_snapshots(profile_id, week, facets, source) values ('${ANNA}', '2026-10-26', '{"explosief": 4}', 'week')`,
      ),
    ).rejects.toThrow(/zwbriljant_snapshots_facets_check/);
    await expect(
      db.query(
        `insert into zwbriljant_snapshots(profile_id, week, score, facets, source) values ('${ANNA}', '2026-10-26', 250, '{}', 'week')`,
      ),
    ).rejects.toThrow(/zwbriljant_snapshots_score_check/);
    await expect(
      db.query(
        `insert into zwbriljant_snapshots(profile_id, week, facets, source) values ('${ANNA}', '2026-10-26', '{"watt": 300}', 'week')`,
      ),
    ).rejects.toThrow(/zwbriljant_snapshots_facets_check/);
    await expect(
      db.query(
        `insert into zwbriljant_snapshots(profile_id, week, facets, source) values ('${ANNA}', '2026-10-27', '{}', 'week')`,
      ),
    ).rejects.toThrow(/zwbriljant_snapshots_week_check/);
    const columns = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'zwbriljant_snapshots'",
    );
    expect(columns.rows.map((row) => row.column_name).sort()).toEqual(
      ["consistency", "created_at", "profile_id", "provenance", "facets", "score", "source", "week"].sort(),
    );
  });

  it("laat anon de deelfunctie niet uitvoeren", async () => {
    const { rows } = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('anon', 'public.zwbriljant_shares(uuid)', 'execute') as allowed",
    );
    expect(rows[0].allowed).toBe(false);
  });

  it("zet de bewaarde stenen om naar CTL-Goud op 40 (0269) en de gewichten van nu (0270)", async () => {
    // Fitheid op de oude schaal: 0,5 (CTL 15), 0,8 (CTL 24), 3,79 (CTL 57,9), 9,6 (CTL 116).
    const rows = [
      { week: "2026-09-07", fitheid: 0.5, consistency: null },
      { week: "2026-09-14", fitheid: 0.8, consistency: 0.5 },
      { week: "2026-09-21", fitheid: 3.79, consistency: 0.46 },
      { week: "2026-09-28", fitheid: 9.6, consistency: null },
      { week: "2026-10-05", fitheid: null, consistency: 0.8 },
    ];
    for (const row of rows) {
      const facets = { sprint: 6.2, anaeroob: 5.4, vo2max: 5.9, drempel: 5.1, durability: null, fitheid: row.fitheid, racen: 7.3 };
      await db.query(
        "insert into zwbriljant_snapshots(profile_id, week, score, facets, consistency, source, provenance) values ($1, $2, 4, $3, $4, 'terugblik', $5)",
        [CEES, row.week, JSON.stringify(facets), row.consistency, JSON.stringify({ scale: "2026-10-21-sd3", terugblik: "x" })],
      );
    }
    await db.exec(await readFile("supabase/migrations/0269_zwbriljant_ctl40.sql", "utf8"));
    // 0270 rekent de score daarna opnieuw met de gewichten van nu.
    await db.exec(await readFile("supabase/migrations/0270_zwbriljant_weights_fitheid20.sql", "utf8"));
    const { rows: after } = await db.query<{ week: string; score: string | null; facets: Record<string, number | null>; provenance: Record<string, string> }>(
      "select week::text, score, facets, provenance from zwbriljant_snapshots where profile_id = $1 and week < '2026-10-19' order by week",
      [CEES],
    );
    const oldCtl = (level: number) => (level < 1 ? level * 30 : 20 + level * 10);
    after.forEach((row, index) => {
      const before = rows[index];
      expect(row.provenance).toEqual({ scale: "2026-10-22-ctl40", terugblik: "x" });
      if (before.fitheid == null) expect(row.facets.fitheid).toBeNull();
      else expect(row.facets.fitheid).toBeCloseTo(levelAt(CTL_ANCHORS, oldCtl(before.fitheid)), 2);
      // SQL rondt exact af, JavaScript in drijvende komma: hooguit 0,01 verschil.
      // 0270 rekende zonder consistentie nog met factor 1 (de straf kwam op 2026-10-25).
      expect(Math.abs(Number(row.score) - storedScore(row.facets, before.consistency ?? 1)!)).toBeLessThanOrEqual(0.011);
    });
  });
});
