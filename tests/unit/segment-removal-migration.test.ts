import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0212 haalt de segmentverkenner en de KOM's uit de database. Deze test bouwt de
// situatie van vóór de migratie na met de echte migraties, en controleert wat weg
// is, wat blijft, en dat de andere tabellen daarna nog gewoon te wijzigen zijn.
let db: PGlite;
const ids = [1, 2, 3, 4].map((n) => `00000000-0000-0000-0000-00000000000${n}`);

async function count(sql: string) {
  return Number((await db.query<{ n: string }>(sql)).rows[0].n);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;",
      "grant usage on schema public,auth to anon,authenticated,service_role;",
      "create table profiles(id uuid primary key,display_name text,is_approved boolean,privacy_accepted_version text,sex text);",
      "create table notification_preferences(profile_id uuid primary key references profiles(id), on_new_badge boolean default true);",
      "create table strava_connections(profile_id uuid primary key references profiles(id),revoked_at timestamptz);",
      "create table strava_activities(id bigint primary key,profile_id uuid references profiles(id),sport_type text,trainer boolean,raw jsonb,synced_at timestamptz default now());",
      "create table strava_activity_segment_efforts(effort_uid text primary key,profile_id uuid references profiles(id),activity_id bigint references strava_activities(id) on delete cascade,strava_segment_id bigint,segment_name text,elapsed_time_seconds integer,moving_time_seconds integer,distance_m numeric,elevation_gain_m numeric,average_grade numeric,start_lat numeric,start_lon numeric,end_lat numeric,end_lon numeric,started_at timestamptz,raw jsonb,created_at timestamptz default now());",
      "create table cols(slug text primary key,strava_segment_id bigint);",
      "create table zwb_segments(slug text primary key,collection text,strava_segment_id bigint,active boolean default true);",
      "create table profile_completed_segments(profile_id uuid references profiles(id),segment_slug text references zwb_segments(slug),best_time_seconds integer,primary key(profile_id,segment_slug));",
    ].join("\n"),
  );
  for (const file of [
    "0152_zwb_segment_explorer.sql",
    "0154_segment_club_include_hidden_efforts.sql",
    "0155_segment_geometry_priority.sql",
    "0156_segment_geometry_priority_fast.sql",
    "0161_zwb_segment_koms.sql",
    "0162_zwb_segment_qom_push.sql",
    "0209_slim_segment_efforts.sql",
    "0211_drop_segment_efforts_priority_index.sql",
  ]) {
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  }

  await db.exec("insert into zwb_segments values('vam','benelux_popular',99,true); insert into cols values('alpe',77);");
  for (let i = 0; i < ids.length; i++) {
    await db.query("insert into profiles values($1,$2,true,'2026-09-13')", [ids[i], "Lid " + i]);
    await db.query("insert into notification_preferences(profile_id) values($1)", [ids[i]]);
    await db.query("insert into strava_connections values($1,null)", [ids[i]]);
    await db.query("insert into strava_activities(id,profile_id,sport_type,trainer,raw) values($1,$2,'Ride',false,'{\"name\":\"rit\"}')", [i + 1, ids[i]]);
    // Segment 99 is uitgekozen, 500 hoort alleen bij de verkenner.
    await db.query("select replace_activity_segment_efforts($1,$2,$3)", [
      ids[i],
      i + 1,
      JSON.stringify([
        { effort_uid: `s99-${i}`, profile_id: ids[i], activity_id: i + 1, strava_segment_id: 99, segment_name: "VAM", elapsed_time_seconds: 100 + i, moving_time_seconds: 90, start_lat: 52, start_lon: 5, end_lat: 52.1, end_lon: 5, distance_m: 1000, average_grade: 3, raw: {} },
        { effort_uid: `s500-${i}`, profile_id: ids[i], activity_id: i + 1, strava_segment_id: 500, segment_name: "Los", elapsed_time_seconds: 60, moving_time_seconds: 60, start_lat: 52, start_lon: 5, end_lat: 52.1, end_lon: 5, distance_m: 500, average_grade: 1, raw: {} },
      ]),
    ]);
  }
  // Eigen GPS-tijden van lid 1: twee op het uitgekozen segment, één op de col, één
  // op een segment dat alleen in de verkenner stond.
  await db.exec(`
    insert into strava_activity_segment_efforts(effort_uid,profile_id,activity_id,strava_segment_id,elapsed_time_seconds,started_at,raw) values
      ('gps:1:99:0','${ids[0]}',1,99,95,'2026-09-30T08:00:00Z','{"source":"gps"}'),
      ('gps:1:99:1','${ids[0]}',1,99,91,'2026-09-30T09:00:00Z','{"source":"gps"}'),
      ('gps:1:77:0','${ids[0]}',1,77,3000,'2026-09-30T10:00:00Z','{"source":"gps"}'),
      ('gps:1:500:0','${ids[0]}',1,500,40,'2026-09-30T11:00:00Z','{"source":"gps"}');
    update zwb_segment_maps set polyline='abc', geometry_status='ready' where id=99;
    insert into profile_completed_segments values('${ids[0]}','vam',95);
  `);
  await db.query("select refresh_segment_koms(100)");
  expect(await count("select count(*) n from zwb_segment_koms")).toBeGreaterThan(0);

  await db.exec(await readFile("supabase/migrations/0212_remove_segment_explorer.sql", "utf8"));
}, 30000);
afterAll(async () => {
  await db?.close();
});

describe("0212 remove segment explorer", () => {
  it("haalt tabellen, views, functies en triggers weg", async () => {
    for (const name of ["strava_activity_segment_efforts", "zwb_segment_koms", "zwb_segment_kom_events", "zwb_segment_club", "zwb_segment_kom_club"]) {
      expect(await count(`select count(*) n from pg_class where relname='${name}'`)).toBe(0);
    }
    expect(
      await count(
        "select count(*) n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace and ns.nspname='public' where p.proname ~ 'segment|kom'",
      ),
    ).toBe(0);
    expect(
      await count(
        "select count(*) n from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and c.relname in ('strava_activities','profiles','strava_connections','zwb_segment_maps')",
      ),
    ).toBe(0);
    expect(await count("select count(*) n from information_schema.columns where table_name='notification_preferences' and column_name='on_segment_kom'")).toBe(0);
    expect(await count("select count(*) n from information_schema.columns where table_name='zwb_segment_maps' and column_name in ('kom_dirty','kom_computed_at')")).toBe(0);
  });

  it("houdt in het register alleen de lijnen van uitgekozen segmenten en cols", async () => {
    const rows = (await db.query<{ id: string; polyline: string | null }>("select id, polyline from zwb_segment_maps order by id")).rows;
    expect(rows.map((row) => Number(row.id))).toEqual([77, 99]);
    expect(rows[1].polyline).toBe("abc");
  });

  it("zet de eigen GPS-tijden op uitgekozen segmenten in de rit, de snelste per segment", async () => {
    const raw = (await db.query<{ raw: { name: string; gps_segment_times: Array<{ segment_id: number; seconds: number; started_at: string }> } }>("select raw from strava_activities where id=1")).rows[0].raw;
    expect(raw.name).toBe("rit");
    expect(raw.gps_segment_times.map((time) => [time.segment_id, time.seconds])).toEqual([[77, 3000], [99, 91]]);
    expect(Date.parse(raw.gps_segment_times[1].started_at)).toBe(Date.parse("2026-09-30T09:00:00Z"));
    const other = (await db.query<{ raw: Record<string, unknown> }>("select raw from strava_activities where id=2")).rows[0].raw;
    expect(other).toEqual({ name: "rit" });
  });

  it("laat de collecties staan en de overige tabellen werken", async () => {
    expect(await count("select count(*) n from profile_completed_segments")).toBe(1);
    expect(await count("select count(*) n from zwb_segments")).toBe(1);
    await db.exec(`
      update strava_activities set sport_type='VirtualRide', raw='{"private":true}' where id=2;
      update profiles set is_approved=false where id='${ids[1]}';
      update strava_connections set revoked_at=now() where profile_id='${ids[2]}';
      delete from strava_activities where id=3;
      insert into zwb_segment_maps(id,name) values(123,'Nieuw');
    `);
    expect(await count("select count(*) n from strava_activities")).toBe(3);
  });
});
