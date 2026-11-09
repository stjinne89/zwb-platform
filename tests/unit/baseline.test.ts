import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

// Fase 5 (docs/multi-club-ontwerp.md §7): een nieuwe club krijgt de baseline en
// de seed, en daarna de migraties na de baseline. ZWB speelt alle migraties af.
// Beide routes moeten op hetzelfde schema uitkomen. Dit draait op PGlite met een
// Supabase-stub, niet op Supabase zelf (docs/installatie.md).
import * as stub from "../../scripts/baseline/stub.mjs";

type Fingerprint = Record<string, string[]>;
const { BASELINE_DIR, BASELINE_VERSION, applySqlFiles, createSupabasePglite, migrationFiles, schemaFingerprint } = stub as {
  BASELINE_DIR: string;
  BASELINE_VERSION: number;
  applySqlFiles: (db: PGlite, files: string[], dir?: string) => Promise<void>;
  createSupabasePglite: () => Promise<PGlite>;
  migrationFiles: (options?: { after?: number }) => string[];
  schemaFingerprint: (db: PGlite) => Promise<Fingerprint>;
};

const version = String(BASELINE_VERSION).padStart(4, "0");
const seedSql = readFileSync(join(BASELINE_DIR, `${version}_seed.sql`), "utf8");

let full: PGlite;
let fresh: PGlite;

beforeAll(async () => {
  full = await createSupabasePglite();
  await applySqlFiles(full, migrationFiles());
  fresh = await createSupabasePglite();
  await applySqlFiles(fresh, [`${version}_baseline.sql`, `${version}_seed.sql`], BASELINE_DIR);
  await applySqlFiles(fresh, migrationFiles({ after: BASELINE_VERSION }));
}, 240_000);

describe("baseline voor een nieuwe installatie", () => {
  it("geeft hetzelfde schema als alle migraties na elkaar", async () => {
    const [a, b] = await Promise.all([schemaFingerprint(full), schemaFingerprint(fresh)]);
    for (const key of Object.keys(a)) {
      const missing = a[key].filter((row) => !b[key].includes(row));
      const extra = b[key].filter((row) => !a[key].includes(row));
      expect({ key, missing, extra }).toEqual({ key, missing: [], extra: [] });
    }
  });

  it("neemt geen leden, teams, sponsors of releasenotes van ZWB mee", async () => {
    for (const table of ["roster_entries", "teams", "team_result_sources", "sponsors", "app_updates", "audit_log", "profiles"]) {
      const { rows } = await fresh.query<{ n: number }>(`select count(*)::int as n from public.${table}`);
      expect({ table, n: rows[0].n }).toEqual({ table, n: 0 });
    }
    expect(seedSql).not.toMatch(/ZWB|zwbcycling/);
  });

  it("begint met een neutrale club zonder eigen modulenamen", async () => {
    const { rows } = await fresh.query<{ name: string; short_name: string; team_tag: string | null; static_brand: boolean }>(
      "select name, short_name, team_tag, static_brand from public.club_settings",
    );
    // static_brand uit (0322): geen ZWB-logo's als terugval.
    expect(rows).toEqual([{ name: "Club", short_name: "Club", team_tag: null, static_brand: false }]);
    const labels = await fresh.query<{ n: number }>("select count(*)::int as n from public.club_modules where label is not null");
    expect(labels.rows[0].n).toBe(0);
  });

  it("houdt bij ZWB de vaste logo's en iconen aan (0322)", async () => {
    const { rows } = await full.query<{ short_name: string; static_brand: boolean }>(
      "select short_name, static_brand from public.club_settings",
    );
    expect(rows).toEqual([{ short_name: "ZWB", static_brand: true }]);
  });

  it("houdt de startinhoud", async () => {
    for (const table of ["cols", "training_workout_templates", "mobility_exercises", "nutrition_foods", "nutrition_recipes", "achievement_badges", "community_role_permissions"]) {
      const [a, b] = await Promise.all(
        [full, fresh].map((db) => db.query<{ n: number }>(`select count(*)::int as n from public.${table}`)),
      );
      expect({ table, n: b.rows[0].n }).toEqual({ table, n: a.rows[0].n });
    }
  });

  it("zet geen regeleinde van Windows in functies of startinhoud", async () => {
    const functions = await fresh.query<{ n: number }>(
      "select count(*)::int as n from pg_proc where pronamespace = 'public'::regnamespace and prosrc like '%' || chr(13) || '%'",
    );
    expect(functions.rows[0].n).toBe(0);
    const tips = await fresh.query<{ n: number }>(
      "select count(*)::int as n from public.maintenance_tips t where t::text like '%' || chr(13) || '%'",
    );
    expect(tips.rows[0].n).toBe(0);
  });

  it("maakt bij een aanmelding een profiel aan", async () => {
    await fresh.exec(`
      insert into auth.users (id, email, raw_user_meta_data)
      values ('00000000-0000-0000-0000-00000000000a', 'eerste@example.com', '{"full_name": "Eerste Lid"}');
    `);
    const { rows } = await fresh.query<{ n: number }>(
      "select count(*)::int as n from public.profiles where id = '00000000-0000-0000-0000-00000000000a'",
    );
    expect(rows[0].n).toBe(1);
    await fresh.exec("delete from public.profiles; delete from auth.users;");
  });
});
