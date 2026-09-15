import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

let db: PGlite;
const ids = ["00000000-0000-0000-0000-000000000001","00000000-0000-0000-0000-000000000002","00000000-0000-0000-0000-000000000003","00000000-0000-0000-0000-000000000004"];
beforeAll(async () => {
  db = new PGlite();
  await db.exec([
    "create role anon; create role authenticated; create role service_role;",
    "create schema auth;",
    "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
    "create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;",
    "grant usage on schema public,auth to anon,authenticated,service_role;",
    "create table profiles(id uuid primary key,display_name text,is_approved boolean,privacy_accepted_version text,sex text);",
    "create table notification_preferences(profile_id uuid primary key references profiles(id));",
    "create table strava_connections(profile_id uuid primary key references profiles(id),revoked_at timestamptz);",
    "create table strava_activities(id bigint primary key,profile_id uuid references profiles(id),sport_type text,trainer boolean,raw jsonb,synced_at timestamptz default now());",
    "create table strava_activity_segment_efforts(effort_uid text primary key,profile_id uuid references profiles(id),activity_id bigint references strava_activities(id) on delete cascade,strava_segment_id bigint,segment_name text,elapsed_time_seconds integer,moving_time_seconds integer,distance_m numeric,elevation_gain_m numeric,average_grade numeric,start_lat numeric,start_lon numeric,end_lat numeric,end_lon numeric,started_at timestamptz,raw jsonb,created_at timestamptz default now());",
  ].join("\n"));
  await db.exec(await readFile("supabase/migrations/0152_zwb_segment_explorer.sql","utf8"));
  await db.exec(await readFile("supabase/migrations/0154_segment_club_include_hidden_efforts.sql","utf8"));
  await db.exec(await readFile("supabase/migrations/0155_segment_geometry_priority.sql","utf8"));
  await db.exec(await readFile("supabase/migrations/0156_segment_geometry_priority_fast.sql","utf8"));
  await db.exec(await readFile("supabase/migrations/0161_zwb_segment_koms.sql","utf8"));
  await db.exec(await readFile("supabase/migrations/0162_zwb_segment_qom_push.sql","utf8"));
}, 20000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec("reset role; truncate strava_activity_segment_efforts,strava_activities,strava_connections,profiles,zwb_segment_maps,zwb_segment_kom_events cascade;");
  for (let i=0;i<ids.length;i++) {
    await db.query("insert into profiles values($1,$2,true,'2026-09-13')",[ids[i],"Lid "+i]);
    await db.query("insert into strava_connections values($1,null)",[ids[i]]);
    await db.query("insert into strava_activities(id,profile_id,sport_type,trainer,raw) values($1,$2,'Ride',false,'{}')",[i+1,ids[i]]);
    await db.query("select replace_activity_segment_efforts($1,$2,$3)",[ids[i],i+1,JSON.stringify([{effort_uid:String(i),profile_id:ids[i],activity_id:i+1,strava_segment_id:99,segment_name:"Klim",elapsed_time_seconds:100+i*10,moving_time_seconds:80,start_lat:52,start_lon:5,end_lat:52.1,end_lon:5,distance_m:1000,average_grade:3,raw:{}}])]);
  }
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",[ids[0]]);
});
async function count() { return Number((await db.query<{ count:string }>("select count(*) from zwb_segment_club")).rows[0].count); }

describe("segment migration against isolated PostgreSQL", () => {
  it("exposes a club aggregate without exposing registry or raw tokens", async () => {
    await db.exec("set role authenticated");
    expect(await count()).toBe(1);
    const row = (await db.query<{ leaderboard:Array<{seconds:number}> }>("select leaderboard from zwb_segment_club")).rows[0];
    expect(row.leaderboard.map((r) => r.seconds)).toEqual([100,110,120,130]);
    await expect(db.query("select * from zwb_segment_maps")).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from strava_connections")).rejects.toThrow(/permission denied/);
    await expect(db.query("select replace_activity_segment_efforts($1,1,'[]')",[ids[0]])).rejects.toThrow(/permission denied/);
  });
  it("denies anonymous, unapproved and old-consent viewers", async () => {
    await db.exec("set role anon");
    await expect(count()).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
    await db.query("update profiles set is_approved=false where id=$1",[ids[0]]);
    await db.exec("set role authenticated");
    expect(await count()).toBe(0);
    await db.exec("reset role");
    await db.query("update profiles set is_approved=true,privacy_accepted_version='2026-08-18' where id=$1",[ids[0]]);
    await db.exec("set role authenticated");
    expect(await count()).toBe(0);
  });
  it("removes private, revoked and deleted performances immediately", async () => {
    const seconds = async () => (await db.query<{ leaderboard:Array<{seconds:number}> }>("select leaderboard from zwb_segment_club")).rows[0].leaderboard.map((r) => r.seconds);
    await db.exec("update strava_activities set raw='{\"private\":true}' where id=2; set role authenticated");
    expect(await seconds()).toEqual([100,120,130]);
    await db.exec("reset role; update strava_activities set raw='{}' where id=2");
    await db.query("update strava_connections set revoked_at=now() where profile_id=$1",[ids[2]]);
    await db.exec("set role authenticated");
    expect(await seconds()).toEqual([100,110,130]);
    await db.exec("reset role; delete from strava_activities where id=4; set role authenticated");
    expect(await count()).toBe(0);
  });
  it("only lists segments ridden by at least three members", async () => {
    await db.exec("delete from strava_activities where id=4; set role authenticated");
    expect(await count()).toBe(1);
    await db.exec("reset role; delete from strava_activities where id=3; set role authenticated");
    expect(await count()).toBe(0);
    expect((await db.query("select * from segment_map_clusters(51,4,53,6,0.1)")).rows).toHaveLength(0);
  });
  it("counts Strava-hidden efforts but still excludes private segments", async () => {
    await db.exec(`update strava_activity_segment_efforts set raw='{"hidden":true}' where activity_id=2`);
    await db.exec(`update strava_activity_segment_efforts set raw='{"segment":{"private":true}}' where activity_id=3; set role authenticated`);
    const row = (await db.query<{ leaderboard:Array<{seconds:number}> }>("select leaderboard from zwb_segment_club")).rows[0];
    expect(row.leaderboard.map((r) => r.seconds)).toEqual([100,110,130]);
  });
  it("prioritises geometry by number of riders and hides the queue from members", async () => {
    await db.query("insert into strava_activities(id,profile_id,sport_type,trainer,raw) values(11,$1,'Ride',false,'{}'),(12,$1,'Ride',true,'{}')",[ids[0]]);
    await db.query("select replace_activity_segment_efforts($1,11,$2)",[ids[0],JSON.stringify([{effort_uid:"solo",profile_id:ids[0],activity_id:11,strava_segment_id:77,segment_name:"Solo",elapsed_time_seconds:50,raw:{}}])]);
    await db.query("select replace_activity_segment_efforts($1,12,$2)",[ids[0],JSON.stringify([{effort_uid:"indoor",profile_id:ids[0],activity_id:12,strava_segment_id:88,segment_name:"Binnen",elapsed_time_seconds:50,raw:{}}])]);
    await db.exec("update zwb_segment_maps set geometry_status='ready' where id=99");
    const first = await db.query<{ id:string }>("select id from segment_geometry_priority(10)");
    expect(first.rows.map((r) => r.id)).toEqual(["77"]);
    await db.exec("update zwb_segment_maps set geometry_status='pending' where id=99");
    const ranked = await db.query<{ id:string; profile_id:string }>("select * from segment_geometry_priority(10)");
    expect(ranked.rows.map((r) => r.id)).toEqual(["99","77"]);
    expect(ranked.rows[1].profile_id).toBe(ids[0]);
    await db.exec("set role authenticated");
    await expect(db.query("select * from segment_geometry_priority(1)")).rejects.toThrow(/permission denied/);
  });
  it("replaces missing efforts and rejects mismatched owners", async () => {
    await db.query("select replace_activity_segment_efforts($1,1,'[]')",[ids[0]]);
    expect((await db.query<{ leaderboard:unknown[] }>("select leaderboard from zwb_segment_club")).rows[0].leaderboard).toHaveLength(3);
    await expect(db.query("select replace_activity_segment_efforts($1,2,'[]')",[ids[0]])).rejects.toThrow(/belong/);
    expect((await db.query<{ leaderboard:unknown[] }>("select leaderboard from zwb_segment_club")).rows[0].leaderboard).toHaveLength(3);
  });
  it("registers more than 30 segment IDs and clusters without truncating the registry", async () => {
    await db.exec("insert into zwb_segment_maps(id,name) select n,'Segment '||n from generate_series(100,140) n");
    expect(Number((await db.query<{count:string}>("select count(*) from zwb_segment_maps")).rows[0].count)).toBe(42);
    await db.exec("set role authenticated");
    const cluster = await db.query<{count:number}>("select * from segment_map_clusters(51,4,53,6,0.1)");
    expect(Number(cluster.rows[0].count)).toBe(1);
  });
});

type KomRow = { segment_id:string; profile_id:string; seconds:number; riders:number; achieved_at:string|null; title:string };
async function refresh(limit = 100) { return Number((await db.query<{ n:number }>("select refresh_segment_koms($1) as n",[limit])).rows[0].n); }
async function koms(title = "kom") { return (await db.query<KomRow>("select segment_id,profile_id,seconds,riders,achieved_at,title from zwb_segment_kom_club where title=$1 order by segment_id,profile_id",[title])).rows; }
async function events() { return (await db.query<{ title:string; profile_id:string; kind:string; seconds:number; holder_id:string }>("select title,profile_id,kind,seconds,holder_id from zwb_segment_kom_events order by kind desc,title,profile_id")).rows; }
const recent = () => new Date(Date.now() - 86400000).toISOString();
async function dirty(id: number) { return (await db.query<{ kom_dirty:boolean }>("select kom_dirty from zwb_segment_maps where id=$1",[id])).rows[0].kom_dirty; }
async function ride(profile: string, activity: number, segment: number, seconds: number, startedAt = "2026-09-10T08:00:00Z") {
  await db.query("insert into strava_activities(id,profile_id,sport_type,trainer,raw) values($1,$2,'Ride',false,'{}') on conflict do nothing",[activity,profile]);
  await db.query("select replace_activity_segment_efforts($1,$2,$3)",[profile,activity,JSON.stringify([{effort_uid:`${activity}-${segment}`,profile_id:profile,activity_id:activity,strava_segment_id:segment,segment_name:"Segment "+segment,elapsed_time_seconds:seconds,started_at:startedAt,raw:{}}])]);
}

describe("ZWB KOM migration against isolated PostgreSQL", () => {
  it("awards the fastest member on segments with three riders and hides the table itself", async () => {
    await ride(ids[0],21,55,60); await ride(ids[1],22,55,70);
    expect(await refresh()).toBe(2);
    expect(await dirty(99)).toBe(false);
    await db.exec("set role authenticated");
    const rows = await koms();
    expect(rows.map((r) => [r.segment_id,r.profile_id,r.seconds,r.riders])).toEqual([["99",ids[0],100,4]]);
    await expect(db.query("select * from zwb_segment_koms")).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from zwb_segment_kom_events")).rejects.toThrow(/permission denied/);
    await expect(db.query("select refresh_segment_koms(10)")).rejects.toThrow(/permission denied/);
    await db.exec("reset role; set role anon");
    await expect(koms()).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
    await db.query("update profiles set privacy_accepted_version='2026-08-18' where id=$1",[ids[1]]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[1]]);
    await db.exec("set role authenticated");
    expect(await koms()).toEqual([]);
  });
  it("hands the title over when a faster ride arrives, dated by that ride", async () => {
    await refresh();
    await ride(ids[3],31,99,90,"2026-09-14T07:30:00Z");
    expect(await dirty(99)).toBe(true);
    expect(await refresh()).toBe(1);
    const [kom] = await koms();
    expect([kom.profile_id,kom.seconds]).toEqual([ids[3],90]);
    expect(new Date(kom.achieved_at!).toISOString()).toBe("2026-09-14T07:30:00.000Z");
  });
  it("shares the title on a tie and drops it when fewer than three riders remain", async () => {
    await ride(ids[1],41,99,100);
    await refresh();
    expect((await koms()).map((r) => r.profile_id)).toEqual([ids[0],ids[1]].sort());
    await db.exec("delete from strava_activities where id in (3,4)");
    await refresh();
    expect(await koms()).toEqual([]);
  });
  it("recomputes after a privacy change on a ride without rewritten efforts", async () => {
    await refresh();
    await db.exec("update strava_activities set raw='{\"visibility\":\"only_me\"}' where id=1");
    expect(await dirty(99)).toBe(true);
    await refresh();
    expect((await koms()).map((r) => [r.profile_id,r.riders])).toEqual([[ids[1],3]]);
    await db.exec("update strava_activities set synced_at=now() where id=2");
    expect(await dirty(99)).toBe(false);
  });
  it("hides a revoked holder at once and recomputes consent and approval changes", async () => {
    await refresh();
    await db.query("update strava_connections set revoked_at=now() where profile_id=$1",[ids[0]]);
    expect(await koms()).toEqual([]);
    expect(await dirty(99)).toBe(true);
    await refresh();
    expect((await koms()).map((r) => r.profile_id)).toEqual([ids[1]]);
    await db.query("update strava_connections set revoked_at=null where profile_id=$1",[ids[0]]);
    await refresh();
    await db.query("update profiles set privacy_accepted_version='2026-08-18' where id=$1",[ids[0]]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[1]]);
    expect(await dirty(99)).toBe(true);
    await refresh();
    expect((await koms()).map((r) => r.profile_id)).toEqual([ids[1]]);
    await db.query("update profiles set display_name='Nieuw' where id=$1",[ids[1]]);
    expect(await dirty(99)).toBe(false);
  });
  it("ignores private segments and respects the batch limit", async () => {
    for (const id of [101,102,103]) for (let i=0;i<3;i++) await ride(ids[i],id*10+i,id,50+i);
    expect(await refresh(2)).toBe(2);
    expect(await refresh(10)).toBe(2);
    expect(await refresh(10)).toBe(0);
    await db.exec("update zwb_segment_maps set private=true where id=101");
    expect((await koms()).map((r) => r.segment_id)).toEqual(["102","103","99"]);
  });

  it("gives the fastest woman the QOM next to an open KOM, also as the only woman", async () => {
    await db.query("update profiles set sex='vrouw' where id=$1",[ids[2]]);
    await db.query("update profiles set sex='zeg_ik_liever_niet' where id=$1",[ids[1]]);
    await refresh();
    expect((await koms()).map((r) => r.profile_id)).toEqual([ids[0]]);
    expect((await koms("qom")).map((r) => [r.profile_id,r.seconds,r.riders])).toEqual([[ids[2],120,4]]);
    await db.query("update profiles set sex='vrouw' where id=$1",[ids[0]]);
    expect(await dirty(99)).toBe(true);
    await refresh();
    expect((await koms()).map((r) => r.profile_id)).toEqual([ids[0]]);
    expect((await koms("qom")).map((r) => r.profile_id)).toEqual([ids[0]]);
    await db.query("update profiles set sex='man' where id=$1",[ids[0]]);
    expect(await koms("qom")).toEqual([]);
  });
});

describe("ZWB KOM notification queue", () => {
  it("stays silent on the first computation and for old rides", async () => {
    await refresh();
    expect(await events()).toEqual([]);
    await ride(ids[3],51,99,80,"2025-01-01T08:00:00Z");
    await refresh();
    expect((await koms()).map((r) => r.profile_id)).toEqual([ids[3]]);
    expect(await events()).toEqual([]);
  });
  it("queues a win and a loss for a recent faster ride, per title", async () => {
    await db.query("update profiles set sex='vrouw' where id=any($1)",[[ids[1],ids[3]]]);
    await refresh();
    await ride(ids[3],61,99,95,recent());
    await refresh();
    expect(await events()).toEqual([
      { title:"kom",profile_id:ids[3],kind:"won",seconds:95,holder_id:ids[3] },
      { title:"qom",profile_id:ids[3],kind:"won",seconds:95,holder_id:ids[3] },
      { title:"kom",profile_id:ids[0],kind:"lost",seconds:95,holder_id:ids[3] },
      { title:"qom",profile_id:ids[1],kind:"lost",seconds:95,holder_id:ids[3] },
    ]);
  });
  it("does not report a loss when the holder disappears or a tie is shared", async () => {
    await ride(ids[1],71,99,100,recent());
    await refresh();
    await ride(ids[2],72,99,100,recent());
    await refresh();
    expect(await events()).toEqual([{ title:"kom",profile_id:ids[2],kind:"won",seconds:100,holder_id:ids[2] }]);
    await db.exec("truncate zwb_segment_kom_events");
    await db.exec("update strava_activities set raw='{\"private\":true}' where id in (1,71,72)");
    await refresh();
    expect(await events()).toEqual([]);
  });
});
