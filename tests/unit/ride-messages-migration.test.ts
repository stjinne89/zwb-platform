import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0253 tegen een geïsoleerde PostgreSQL. Zegt niets over de productiedatabase,
// wel over de toegangsregel: een lid ziet en wist de eigen Telegram-koppeling,
// maar kan geen chat-id invullen (dat doet alleen de server).

let db: PGlite;

const LID = "11111111-1111-1111-1111-111111111111";
const ANDER = "22222222-2222-2222-2222-222222222222";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create table public.profiles(id uuid primary key);",
      "create table public.notification_preferences(profile_id uuid primary key references public.profiles(id));",
      "create table public.events(id uuid primary key);",
      "create table public.event_chat_messages(id uuid primary key default gen_random_uuid(), event_id uuid references public.events(id), body text not null);",
    ].join("\n"),
  );
  await db.exec(await readFile("supabase/migrations/0253_ride_messages.sql", "utf8"));
  await db.exec(`
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on all functions in schema auth, public to anon, authenticated, service_role;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    insert into public.profiles(id) values ('${LID}'), ('${ANDER}');
    insert into public.telegram_links(profile_id, chat_id, linked_at)
      values ('${LID}', 1001, now()), ('${ANDER}', 1002, now());
  `);
}, 30000);

afterAll(async () => {
  await db?.close();
});

async function alsLid<T>(sql: string): Promise<T[]> {
  await db.exec("begin");
  try {
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${LID}';`);
    const { rows } = await db.query<T>(sql);
    return rows;
  } finally {
    await db.exec("rollback");
  }
}

describe("0253 ride messages", () => {
  it("zet de nieuwe voorkeur en de chatmarkering standaard goed", async () => {
    await db.exec(`insert into public.notification_preferences(profile_id) values ('${LID}')`);
    const { rows } = await db.query<{ on_ride_message: boolean }>(
      `select on_ride_message from public.notification_preferences where profile_id = '${LID}'`,
    );
    expect(rows[0].on_ride_message).toBe(true);

    await db.exec(`insert into public.events(id) values ('${ANDER}')`);
    await db.exec(`insert into public.event_chat_messages(event_id, body) values ('${ANDER}', 'hoi')`);
    const chat = await db.query<{ to_riders: boolean }>("select to_riders from public.event_chat_messages");
    expect(chat.rows[0].to_riders).toBe(false);
  });

  it("laat een lid alleen de eigen koppeling zien", async () => {
    const rows = await alsLid<{ chat_id: string }>("select chat_id from public.telegram_links");
    expect(rows.map((r) => Number(r.chat_id))).toEqual([1001]);
  });

  it("laat een lid geen chat-id invullen of wijzigen", async () => {
    const updated = await alsLid<{ profile_id: string }>(
      `update public.telegram_links set chat_id = 9999 returning profile_id`,
    );
    expect(updated).toEqual([]);
    await expect(
      alsLid(`insert into public.telegram_links(profile_id, chat_id) values ('${LID}', 9999)`),
    ).rejects.toThrow(/row-level security/);
  });

  it("laat een lid alleen de eigen koppeling wissen", async () => {
    const deleted = await alsLid<{ profile_id: string }>(
      "delete from public.telegram_links returning profile_id",
    );
    expect(deleted.map((r) => r.profile_id)).toEqual([LID]);
  });

  it("koppelt één Telegram-chat aan hoogstens één lid", async () => {
    await expect(
      db.exec(`update public.telegram_links set chat_id = 1001 where profile_id = '${ANDER}'`),
    ).rejects.toThrow(/unique/i);
  });
});
