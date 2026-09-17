import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
let db: PGlite;
const own = "00000000-0000-0000-0000-000000000001", other = "00000000-0000-0000-0000-000000000002";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table profiles(id uuid primary key, is_approved boolean default true);
    create table roster_entries(id uuid primary key);
    create table intervals_connections(profile_id uuid primary key, athlete_id text, api_key text);
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant select on profiles to authenticated;`);
  await db.exec(await readFile("supabase/migrations/0170_zwbgame.sql", "utf8"));
}, 30000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec("reset role; truncate profiles, roster_entries, intervals_connections cascade;");
  await db.query("insert into profiles(id) values ($1),($2)", [own, other]);
});
async function consent() {
  return (await db.query<{ revision: string }>("insert into zwbgame_preferences(profile_id,data_consent_version) values($1,'2026-09-17') returning revision", [own])).rows[0].revision;
}
async function insertRider(revision: string, source = "manual") {
  return db.query("insert into zwbgame_riders(profile_id,consent_revision,attributes,provenance) values($1,$2,$3,'{}')", [own, revision, JSON.stringify({ source })]);
}
async function asUser(id = own) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
describe("ZWBgame migration 0170", () => {
  it("allows only own preferences and blocks derived profile writes", async () => {
    await consent(); await asUser(other);
    expect((await db.query("select * from zwbgame_preferences")).rows).toHaveLength(0);
    await expect(db.query("insert into zwbgame_preferences(profile_id) values($1)", [own])).rejects.toThrow();
    await expect(insertRider("00000000-0000-0000-0000-000000000099")).rejects.toThrow();
    await db.query("insert into zwbgame_preferences(profile_id) values($1)", [other]);
    expect((await db.query("select * from zwbgame_preferences")).rows).toHaveLength(1);
  });
  it("denies anonymous reads and pending member consent", async () => {
    await db.exec("set role anon");
    await expect(db.query("select * from zwbgame_preferences")).rejects.toThrow();
    await db.exec("reset role"); await db.query("update profiles set is_approved=false where id=$1", [own]);
    await asUser(); await expect(consent()).rejects.toThrow();
  });
  it("atomically deletes the cache on revocation and rejects late sync results", async () => {
    const revision = await consent(); await insertRider(revision);
    await db.query("update zwbgame_preferences set data_consent_version=null where profile_id=$1", [own]);
    expect((await db.query("select * from zwbgame_riders")).rows).toHaveLength(0);
    await expect(insertRider(revision)).rejects.toThrow(/toestemming/);
    await db.query("update zwbgame_preferences set data_consent_version='2026-09-17' where profile_id=$1", [own]);
    await expect(insertRider(revision)).rejects.toThrow(/toestemming/);
  });
  it("deletes Intervals-derived data on disconnect", async () => {
    const revision = await consent(); await insertRider(revision, "intervals");
    await db.query("insert into intervals_connections(profile_id,athlete_id,api_key) values($1,'athlete','test')", [own]);
    await db.query("delete from intervals_connections where profile_id=$1", [own]);
    expect((await db.query("select * from zwbgame_riders")).rows).toHaveLength(0);
  });
  it("cascades account deletion and denies roster exclusion writes to ordinary members", async () => {
    const revision = await consent(); await insertRider(revision);
    await asUser(); await expect(db.query("select * from zwbgame_roster_exclusions")).rejects.toThrow();
    await db.exec("reset role"); await db.query("delete from profiles where id=$1", [own]);
    expect((await db.query("select * from zwbgame_riders")).rows).toHaveLength(0);
    expect((await db.query("select * from zwbgame_preferences")).rows).toHaveLength(0);
  });
});
