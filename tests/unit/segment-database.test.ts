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
    "create table profiles(id uuid primary key,display_name text,is_approved boolean,privacy_accepted_version text);",
    "create table strava_connections(profile_id uuid primary key references profiles(id),revoked_at timestamptz);",
    "create table strava_activities(id bigint primary key,profile_id uuid references profiles(id),sport_type text,trainer boolean,raw jsonb,synced_at timestamptz default now());",
    "create table strava_activity_segment_efforts(effort_uid text primary key,profile_id uuid references profiles(id),activity_id bigint references strava_activities(id) on delete cascade,strava_segment_id bigint,segment_name text,elapsed_time_seconds integer,moving_time_seconds integer,distance_m numeric,elevation_gain_m numeric,average_grade numeric,start_lat numeric,start_lon numeric,end_lat numeric,end_lon numeric,started_at timestamptz,raw jsonb,created_at timestamptz default now());",
  ].join("\n"));
  await db.exec(await readFile("supabase/migrations/0152_zwb_segment_explorer.sql","utf8"));
}, 20000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec("reset role; truncate strava_activity_segment_efforts,strava_activities,strava_connections,profiles,zwb_segment_maps cascade;");
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
    await db.exec("update strava_activities set raw='{\"private\":true}' where id=2");
    await db.query("update strava_connections set revoked_at=now() where profile_id=$1",[ids[2]]);
    await db.exec("delete from strava_activities where id=4; set role authenticated");
    const row = (await db.query<{ leaderboard:Array<{seconds:number}> }>("select leaderboard from zwb_segment_club")).rows[0];
    expect(row.leaderboard.map((r) => r.seconds)).toEqual([100]);
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
