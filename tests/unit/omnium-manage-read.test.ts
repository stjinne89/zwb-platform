import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// Speelt de melding na: /beheer/omnium leest met de RLS-client en zag het
// conceptseizoen 2026-27 niet, omdat de leespolicy alleen gepubliceerde rijen
// vrijgaf. 0174 geeft wie omnium.manage heeft ook de concepten.

let db: PGlite;
const managerId = "00000000-0000-0000-0000-000000000001";
const memberId = "00000000-0000-0000-0000-000000000002";
const seasonId = "10000000-0000-0000-0000-000000000001";
const editionId = "20000000-0000-0000-0000-000000000001";
const partId = "30000000-0000-0000-0000-000000000001";

beforeAll(async () => {
  db = new PGlite();
  await db.exec([
    "create role anon; create role authenticated; create role service_role;",
    "create schema auth;",
    "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
    "create function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;",
    "create table public.profiles(id uuid primary key, is_approved boolean default true);",
    "create table public.events(id uuid primary key default gen_random_uuid(), type text not null, title text, start_at timestamptz, end_at timestamptz, created_by uuid references profiles(id));",
    // Stub van 0024: alleen de beheerder heeft omnium.manage.
    `create function public.current_user_has_permission(permission text) returns boolean language sql stable as $$ select auth.uid() = '${managerId}'::uuid and permission = 'omnium.manage' $$;`,
    "grant usage on schema public,auth to anon,authenticated,service_role;",
  ].join("\n"));
  for (const migration of [
    "0126_omnium_seasons_editions.sql",
    "0127_omnium_riders_entrants.sql",
    "0128_omnium_results_standings.sql",
    "0129_omnium_prizes.sql",
    "0134_omnium_result_time_precision.sql",
    "0157_omnium_entrants_results.sql",
    "0158_omnium_award_kit.sql",
    "0174_omnium_manage_read_drafts.sql",
  ]) {
    await db.exec(await readFile(`supabase/migrations/${migration}`, "utf8"));
  }
  await db.exec("grant select on all tables in schema public to anon,authenticated; revoke all on omnium_kit_codes from anon,authenticated; grant execute on all functions in schema public to anon,authenticated;");
}, 30_000);

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec("reset role; truncate omnium_kit_codes,omnium_prize_awards,omnium_prizes,omnium_season_standings,omnium_edition_standings,omnium_results,omnium_entrants,omnium_rider_links,omnium_riders,omnium_edition_events,omnium_editions,omnium_seasons,events,profiles cascade;");
  await db.query("insert into profiles(id) values($1),($2)", [managerId, memberId]);
  // Precies de productiestand: seizoen bestaat, niet gepubliceerd.
  await db.query("insert into omnium_seasons(id,slug,name) values($1,'2026-27','ZWB Omnium 2026/27')", [seasonId]);
  await db.query("insert into omnium_editions(id,season_id,number,slug,title,starts_at) values($1,$2,1,'editie-1','Editie 1',now())", [editionId, seasonId]);
  await db.query("insert into omnium_edition_events(id,edition_id,discipline,order_index,title,starts_at) values($1,$2,'scratch',1,'Scratch',now())", [partId, editionId]);
});

async function countAs(role: "anon" | "authenticated", userId: string | null, table: string) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false); set role ${role};`);
  const result = await db.query<{ count: number | string }>(`select count(*) from ${table}`);
  await db.exec("reset role;");
  return Number(result.rows[0].count);
}

describe("Omnium migration 0174", () => {
  it("shows draft seasons, editions and parts to omnium.manage", async () => {
    expect(await countAs("authenticated", managerId, "omnium_seasons")).toBe(1);
    expect(await countAs("authenticated", managerId, "omnium_editions")).toBe(1);
    expect(await countAs("authenticated", managerId, "omnium_edition_events")).toBe(1);
  });

  it("keeps drafts hidden from members and anonymous visitors", async () => {
    for (const table of ["omnium_seasons", "omnium_editions", "omnium_edition_events"]) {
      expect(await countAs("authenticated", memberId, table)).toBe(0);
      expect(await countAs("anon", null, table)).toBe(0);
    }
  });

  it("still shows published rows to everyone", async () => {
    await db.query("update omnium_seasons set published_at = now()");
    await db.query("update omnium_editions set published_at = now()");
    expect(await countAs("anon", null, "omnium_seasons")).toBe(1);
    expect(await countAs("authenticated", memberId, "omnium_editions")).toBe(1);
  });

  it("gives nobody read access to kit codes", async () => {
    await expect(countAs("authenticated", managerId, "omnium_kit_codes")).rejects.toThrow(/permission denied/);
  });
});
