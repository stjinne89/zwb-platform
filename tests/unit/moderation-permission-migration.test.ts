import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// Migratie 0207 in PGlite: wie "Content modereren" heeft, kan chat, verslagen,
// foto's en verjaardagsberichten van een ander weghalen; een gewoon lid niet.
// Storage en de rechten zijn stubs.

let db: PGlite;
const moderator = "00000000-0000-0000-0000-0000000000a1";
const author = "00000000-0000-0000-0000-0000000000a2";
const other = "00000000-0000-0000-0000-0000000000a3";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role bypassrls;",
      "create schema auth; create schema storage;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create table storage.objects(id serial primary key, bucket_id text, name text);",
      "create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;",
      "create table public.test_permissions(profile_id uuid, permission text);",
      "create function public.current_user_has_permission(permission text) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from test_permissions t where t.profile_id = auth.uid() and t.permission = $1) $$;",
      "create table public.sponsors(id serial primary key, active boolean);",
      "create table public.member_benefits(id serial primary key, active boolean);",
      "create table public.event_photos(id serial primary key, profile_id uuid);",
      "create table public.event_reports(id serial primary key, profile_id uuid);",
      "create table public.event_report_comments(id serial primary key, profile_id uuid);",
      "create table public.event_chat_messages(id serial primary key, profile_id uuid);",
      "create table public.birthday_messages(id serial primary key, author_profile_id uuid, birthday_profile_id uuid);",
      "create table public.birthday_photos(id serial primary key, uploader_profile_id uuid, birthday_profile_id uuid);",
      "create table public.birthday_ride_rsvps(id serial primary key, profile_id uuid, birthday_profile_id uuid);",
      ...[
        "storage.objects",
        "public.sponsors",
        "public.member_benefits",
        "public.event_photos",
        "public.event_reports",
        "public.event_report_comments",
        "public.event_chat_messages",
        "public.birthday_messages",
        "public.birthday_photos",
        "public.birthday_ride_rsvps",
      ].map((table) => `alter table ${table} enable row level security;`),
      // Lezen mag iedereen, zodat de delete-policy het verschil maakt.
      "create policy read_all on public.event_chat_messages for select to authenticated using (true);",
      "create policy read_all on public.birthday_messages for select to authenticated using (true);",
      "create policy read_all on storage.objects for select to authenticated using (true);",
      "grant usage on schema public, auth, storage to authenticated, service_role;",
      "grant select, insert, update, delete on all tables in schema public, storage to authenticated, service_role;",
      "grant execute on all functions in schema public, storage to authenticated;",
    ].join("\n"),
  );
  await db.exec(await readFile("supabase/migrations/0207_moderation_permission.sql", "utf8"));
}, 30_000);

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec("reset role; truncate test_permissions, event_chat_messages, birthday_messages, storage.objects, sponsors;");
  await db.query("insert into test_permissions values ($1, 'content.moderate_posts')", [moderator]);
  await db.query("insert into event_chat_messages(profile_id) values ($1)", [author]);
  await db.query("insert into birthday_messages(author_profile_id, birthday_profile_id) values ($1, $2)", [author, author]);
  await db.query("insert into storage.objects(bucket_id, name) values ('event-photos', $1)", [`event/${author}/foto.jpg`]);
});

async function deletedAs(userId: string, sql: string) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId}', false); set role authenticated;`);
  try {
    const result = await db.query(sql);
    return result.affectedRows ?? 0;
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}

describe("0207: moderatie via content.moderate_posts", () => {
  it("laat een gewoon lid niets van een ander weghalen", async () => {
    expect(await deletedAs(other, "delete from event_chat_messages")).toBe(0);
    expect(await deletedAs(other, "delete from birthday_messages")).toBe(0);
    expect(await deletedAs(other, "delete from storage.objects")).toBe(0);
  });

  it("laat de moderator chat, verjaardagsberichten en eventfoto's weghalen", async () => {
    expect(await deletedAs(moderator, "delete from event_chat_messages")).toBe(1);
    expect(await deletedAs(moderator, "delete from birthday_messages")).toBe(1);
    expect(await deletedAs(moderator, "delete from storage.objects")).toBe(1);
  });

  it("laat de eigenaar zijn eigen bericht en foto weghalen", async () => {
    expect(await deletedAs(author, "delete from event_chat_messages")).toBe(1);
    expect(await deletedAs(author, "delete from storage.objects")).toBe(1);
  });

  it("laat inactieve sponsors zien aan wie sponsors beheert", async () => {
    await db.query("insert into sponsors(active) values (false)");
    await db.query("insert into test_permissions values ($1, 'sponsors.manage')", [other]);
    await db.exec(`select set_config('request.jwt.claim.sub', '${other}', false); set role authenticated;`);
    const { rows } = await db.query("select * from sponsors");
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
    expect(rows).toHaveLength(1);
  });
});
