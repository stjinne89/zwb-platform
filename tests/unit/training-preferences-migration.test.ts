import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0230 tegen een geïsoleerde PostgreSQL, bovenop 0037 en 0167 (de koppelingen en
// de toegangsfunctie van de coachchat). Zegt niets over de productiedatabase,
// wel over de toegangsregel: voorkeuren zijn vrije tekst en horen in dezelfde
// kring te blijven als de chat.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

const LID = "11111111-1111-1111-1111-111111111111";
const TRAINER = "22222222-2222-2222-2222-222222222222";
const VREEMDE_TRAINER = "33333333-3333-3333-3333-333333333333";
const BESTUURDER = "44444444-4444-4444-4444-444444444444";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create table public.profiles(id uuid primary key, is_approved boolean default true, is_admin boolean default false, display_name text, community_roles text[] not null default array['community_member']::text[]);",
      "create table public.community_role_permissions(role text primary key, permissions text[] not null default array[]::text[]);",
      "create table public.notification_preferences(profile_id uuid primary key references public.profiles(id));",
      "create table public.events(id uuid primary key);",
      `create function public.current_user_has_permission(p text) returns boolean language sql stable as $$
         select auth.uid() = '${BESTUURDER}'::uuid and p = 'training.manage_assignments' $$;`,
      "create publication supabase_realtime;",
    ].join("\n"),
  );

  for (const file of [
    "0037_training_coach_cockpit.sql",
    "0167_training_chat.sql",
    "0230_training_preferences.sql",
  ]) {
    await db.exec(await migration(file));
  }

  await db.exec(`
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on all functions in schema auth, public to anon, authenticated, service_role;
    grant select, insert, update, delete on all tables in schema public to authenticated;
  `);

  await db.exec(`
    insert into public.profiles(id, display_name) values
      ('${LID}', 'Lid'), ('${TRAINER}', 'Trainer'),
      ('${VREEMDE_TRAINER}', 'Andere trainer'), ('${BESTUURDER}', 'Bestuur');
    insert into public.training_coach_assignments(athlete_id, trainer_id, status)
      values ('${LID}', '${TRAINER}', 'active');
    insert into public.training_preferences(profile_id, author_id, author_role, body)
      values ('${LID}', '${LID}', 'member', 'In de winter liever indoor races dan lange duur.');
    insert into public.training_preferences(profile_id, author_id, author_role, body, source)
      values ('${LID}', '${TRAINER}', 'trainer', 'Reageert goed op korte VO2max-blokken.', 'chat');
  `);
}, 30000);

afterAll(async () => {
  await db?.close();
});

/** Voert `sql` uit alsof `userId` is ingelogd, met RLS aan; draait alles terug. */
async function als<T>(userId: string, sql: string): Promise<T[]> {
  await db.exec("begin");
  try {
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${userId}';`);
    return (await db.query<T>(sql)).rows;
  } finally {
    await db.exec("rollback");
  }
}

const tel = "select count(*)::int as count from public.training_preferences";

describe("persoonlijke voorkeuren (0230)", () => {
  it("laat het lid en de aangewezen trainer de voorkeuren zien", async () => {
    expect((await als<{ count: number }>(LID, tel))[0].count).toBe(2);
    expect((await als<{ count: number }>(TRAINER, tel))[0].count).toBe(2);
  });

  it("houdt een trainer zonder koppeling en het bestuur buiten", async () => {
    expect((await als<{ count: number }>(VREEMDE_TRAINER, tel))[0].count).toBe(0);
    expect((await als<{ count: number }>(BESTUURDER, tel))[0].count).toBe(0);
  });

  it("laat niemand rechtstreeks schrijven of verwijderen", async () => {
    await expect(
      als(
        LID,
        `insert into public.training_preferences(profile_id, author_id, author_role, body)
           values ('${LID}', '${LID}', 'member', 'Rechtstreeks') returning id`,
      ),
    ).rejects.toThrow();
    expect(await als(LID, "delete from public.training_preferences returning id")).toHaveLength(0);
  });

  it("weigert een lege of te lange voorkeur en een onbekende rol", async () => {
    const insert = (role: string, body: string) =>
      db.query(
        "insert into public.training_preferences(profile_id, author_id, author_role, body) values ($1, $1, $2, $3)",
        [LID, role, body],
      );
    await expect(insert("member", "")).rejects.toThrow();
    await expect(insert("member", "x".repeat(1001))).rejects.toThrow();
    await expect(insert("coach", "Geldige tekst")).rejects.toThrow();
  });

  it("bewaart de voorkeur van een trainer die zijn account opheft", async () => {
    await db.exec("begin");
    try {
      await db.exec(`delete from public.training_coach_assignments where trainer_id = '${TRAINER}';
        delete from public.profiles where id = '${TRAINER}';`);
      const rest = await db.query<{ author_id: string | null }>(
        "select author_id from public.training_preferences where author_role = 'trainer'",
      );
      expect(rest.rows).toEqual([{ author_id: null }]);
    } finally {
      await db.exec("rollback");
    }
  });
});
