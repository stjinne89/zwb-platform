import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

let db: PGlite;
const userId = "00000000-0000-0000-0000-000000000001";
const seasonId = "10000000-0000-0000-0000-000000000001";
const editionId = "20000000-0000-0000-0000-000000000001";
const partId = "30000000-0000-0000-0000-000000000001";
const riderOne = "40000000-0000-0000-0000-000000000001";
const riderTwo = "40000000-0000-0000-0000-000000000002";

beforeAll(async () => {
  db = new PGlite();
  await db.exec([
    "create role anon; create role authenticated; create role service_role;",
    "create schema auth;",
    "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
    "create function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;",
    "create table public.profiles(id uuid primary key, is_approved boolean default true);",
    "create table public.events(id uuid primary key default gen_random_uuid(), type text not null, title text, start_at timestamptz, end_at timestamptz, created_by uuid references profiles(id));",
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
  ]) {
    await db.exec(await readFile(`supabase/migrations/${migration}`, "utf8"));
  }
  await db.exec("grant select on all tables in schema public to anon,authenticated; revoke all on omnium_kit_codes from anon,authenticated;");
}, 30_000);

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec("reset role; truncate omnium_kit_codes,omnium_prize_awards,omnium_prizes,omnium_season_standings,omnium_edition_standings,omnium_results,omnium_entrants,omnium_rider_links,omnium_riders,omnium_edition_events,omnium_editions,omnium_seasons,events,profiles cascade;");
  await db.query("insert into profiles(id) values($1)", [userId]);
  await db.query("insert into omnium_seasons(id,slug,name,published_at) values($1,'2026-27','ZWB Omnium',now())", [seasonId]);
  await db.query("insert into omnium_editions(id,season_id,number,slug,title,starts_at) values($1,$2,1,'editie-1','Editie 1',now())", [editionId, seasonId]);
  await db.query("insert into omnium_edition_events(id,edition_id,discipline,order_index,title,starts_at,zwift_event_id,subgroup_leagues) values($1,$2,'scratch',1,'Scratch',now(),'123','{\"10\":\"DIAMOND-RUBY\"}')", [partId, editionId]);
});

describe("Omnium migration 0157", () => {
  it("replaces an entrant snapshot and invalidates it after mapping changes", async () => {
    const rows = [{ zwift_id: "9001", name_key: "ada", display_name: "Ada", league: "DIAMOND-RUBY", subgroup_label: "A" }];
    await db.query("select omnium_replace_entrants($1,'123',$2,$3)", [partId, JSON.stringify({ "10": "DIAMOND-RUBY" }), JSON.stringify(rows)]);
    expect(Number((await db.query<{ count: number | string }>("select count(*) from omnium_entrants")).rows[0].count)).toBe(1);
    expect((await db.query<{ entrants_synced_at: Date | null }>("select entrants_synced_at from omnium_edition_events where id=$1", [partId])).rows[0].entrants_synced_at).not.toBeNull();

    await db.query("update omnium_edition_events set subgroup_leagues='{\"10\":\"EMERALD-SAPPHIRE\"}' where id=$1", [partId]);
    expect(Number((await db.query<{ count: number | string }>("select count(*) from omnium_entrants")).rows[0].count)).toBe(0);
    expect((await db.query<{ entrants_synced_at: Date | null }>("select entrants_synced_at from omnium_edition_events where id=$1", [partId])).rows[0].entrants_synced_at).toBeNull();
  });

  it("keeps the prior result when a preview snapshot is stale", async () => {
    await db.query("insert into omnium_riders(id,name_key,display_name) values($1,'ada','Ada')", [riderOne]);
    const oldRows = [{ rider_id: riderOne, league: "DIAMOND-RUBY", status: "finished", position: 1, overall_position: 1, points: 40, points_raw: 40, finish_points: 40, sprint_points: 0, matched_via: "name", source: "paste", entered_by: userId }];
    await db.query("select omnium_replace_results($1,$2,'final',null)", [partId, JSON.stringify(oldRows)]);
    await db.query("update omnium_edition_events set entrants_synced_at=now() where id=$1", [partId]);
    await expect(db.query("select omnium_replace_results($1,$2,'final',null)", [partId, JSON.stringify([{ ...oldRows[0], points: 20 }])])).rejects.toThrow(/Startlijst gewijzigd/);
    expect((await db.query<{ points: string }>("select points from omnium_results where edition_event_id=$1", [partId])).rows[0].points).toBe("40.00");
  });

  it("moves results and entrants atomically when riders are merged", async () => {
    await db.query("insert into omnium_riders(id,zwift_id,name_key,display_name) values($1,'9001','ada-old','Ada old'),($2,null,'ada','Ada')", [riderOne, riderTwo]);
    await db.query("insert into omnium_results(edition_id,edition_event_id,rider_id,league) values($1,$2,$3,'DIAMOND-RUBY')", [editionId, partId, riderOne]);
    await db.query("insert into omnium_entrants(edition_event_id,rider_id,league,source) values($1,$2,'DIAMOND-RUBY','manual')", [partId, riderOne]);
    const result = await db.query<{ omnium_merge_riders: string[] }>("select omnium_merge_riders($1,$2)", [riderOne, riderTwo]);
    expect(result.rows[0].omnium_merge_riders).toEqual([editionId]);
    expect((await db.query<{ rider_id: string }>("select rider_id from omnium_results")).rows[0].rider_id).toBe(riderTwo);
    expect((await db.query<{ rider_id: string }>("select rider_id from omnium_entrants")).rows[0].rider_id).toBe(riderTwo);
    expect((await db.query<{ zwift_id: string }>("select zwift_id from omnium_riders where id=$1", [riderTwo])).rows[0].zwift_id).toBe("9001");
  });
});

describe("Omnium migration 0158", () => {
  it("allocates different kitcodes and never exposes them to app roles", async () => {
    const partIds = [partId, "30000000-0000-0000-0000-000000000002", "30000000-0000-0000-0000-000000000003", "30000000-0000-0000-0000-000000000004"];
    await db.query("insert into omnium_edition_events(id,edition_id,discipline,order_index,title,starts_at,results_state) values($1,$2,'prologue',2,'P',now(),'final'),($3,$2,'sprint',3,'S',now(),'final'),($4,$2,'crit',4,'C',now(),'final')", [partIds[1], editionId, partIds[2], partIds[3]]);
    await db.query("update omnium_edition_events set results_state='final' where id=$1", [partId]);
    await db.query("insert into omnium_riders(id,name_key,display_name) values($1,'ada','Ada'),($2,'grace','Grace')", [riderOne, riderTwo]);
    await db.query("insert into omnium_edition_standings(edition_id,rider_id,league,rank,is_provisional) values($1,$2,'DIAMOND-RUBY',1,false),($1,$3,'EMERALD-SAPPHIRE',1,false)", [editionId, riderOne, riderTwo]);
    const prizeOne = "50000000-0000-0000-0000-000000000001";
    const prizeTwo = "50000000-0000-0000-0000-000000000002";
    await db.query("insert into omnium_prizes(id,season_id,scope,league,title) values($1,$2,'edition','DIAMOND-RUBY','Kit'),($3,$2,'edition','EMERALD-SAPPHIRE','Kit')", [prizeOne, seasonId, prizeTwo]);
    await db.query("insert into omnium_kit_codes(season_id,code) values($1,'CODE-A'),($1,'CODE-B')", [seasonId]);

    await Promise.all([
      db.query("select omnium_award_prize($1,$2,$3,$4)", [prizeOne, editionId, riderOne, userId]),
      db.query("select omnium_award_prize($1,$2,$3,$4)", [prizeTwo, editionId, riderTwo, userId]),
    ]);
    const codes = await db.query<{ code: string; award_id: string }>("select code,award_id from omnium_kit_codes order by code");
    expect(codes.rows.map((row) => row.award_id)).toHaveLength(2);
    expect(new Set(codes.rows.map((row) => row.award_id)).size).toBe(2);

    await db.exec("set role anon");
    await expect(db.query("select * from omnium_kit_codes")).rejects.toThrow(/permission denied/);
  });

  it("hides awards for concept editions and exposes them after publication", async () => {
    await db.query("insert into omnium_riders(id,name_key,display_name) values($1,'ada','Ada')", [riderOne]);
    const prizeId = "50000000-0000-0000-0000-000000000001";
    await db.query("insert into omnium_prizes(id,season_id,scope,league,title,kind) values($1,$2,'edition','DIAMOND-RUBY','Bidon','other')", [prizeId, seasonId]);
    await db.query("insert into omnium_prize_awards(prize_id,edition_id,league,rider_id) values($1,$2,'DIAMOND-RUBY',$3)", [prizeId, editionId, riderOne]);
    await db.query("select set_config('request.jwt.claim.role','anon',false)");
    await db.exec("set role anon");
    expect(Number((await db.query<{ count: number | string }>("select count(*) from omnium_prize_awards")).rows[0].count)).toBe(0);
    await db.exec("reset role");
    await db.query("update omnium_editions set published_at=now() where id=$1", [editionId]);
    await db.exec("set role anon");
    expect(Number((await db.query<{ count: number | string }>("select count(*) from omnium_prize_awards")).rows[0].count)).toBe(1);
  });
});
