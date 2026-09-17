import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0167 tegen een geïsoleerde PostgreSQL, bovenop 0037 (dat de koppelingen en
// training_plans maakt). Zegt niets over de productiedatabase, maar wél over de
// toegangsregel — en die wijkt hier bewust af van de rest van de trainingsmodule,
// dus die verdient een test die hem vastzet.

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
      // Alleen de kolommen die 0037 en 0167 aanraken.
      "create table public.profiles(id uuid primary key, is_approved boolean default true, is_admin boolean default false, display_name text, community_roles text[] not null default array['community_member']::text[]);",
      "create table public.community_role_permissions(role text primary key, permissions text[] not null default array[]::text[]);",
      "create table public.notification_preferences(profile_id uuid primary key references public.profiles(id));",
      "create table public.events(id uuid primary key);",
      // Alleen de bestuurder heeft training.manage_assignments; zo is te zien of
      // dat recht wél of niet toegang tot de chat geeft.
      `create function public.current_user_has_permission(p text) returns boolean language sql stable as $$
         select auth.uid() = '${BESTUURDER}'::uuid and p = 'training.manage_assignments' $$;`,
      "create publication supabase_realtime;",
    ].join("\n"),
  );

  for (const file of ["0037_training_coach_cockpit.sql", "0167_training_chat.sql"]) {
    await db.exec(await migration(file));
  }

  // Wat Supabase zelf al heeft staan: de rollen mogen bij het schema en de
  // tabellen, en RLS doet daarna het echte werk.
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
    insert into public.training_chat_messages(profile_id, author_id, role, body)
      values ('${LID}', '${LID}', 'member', 'Waarom staat er vandaag 90 minuten?');
    insert into public.training_chat_messages(profile_id, author_id, role, body, status)
      values ('${LID}', null, 'coach', 'Omdat je beschikbaarheid deze week lager lag.', 'sent');
  `);
}, 30000);

afterAll(async () => {
  await db?.close();
});

/** Leest berichten alsof `userId` is ingelogd, met RLS aan. */
async function zichtbaarVoor(userId: string): Promise<number> {
  await db.exec("begin");
  try {
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${userId}';`);
    const { rows } = await db.query<{ count: number }>(
      "select count(*)::int as count from public.training_chat_messages",
    );
    return rows[0].count;
  } finally {
    await db.exec("rollback");
  }
}

describe("coachchat (0167)", () => {
  it("laat het lid zijn eigen gesprek zien", async () => {
    expect(await zichtbaarVoor(LID)).toBe(2);
  });

  it("laat de aangewezen trainer meelezen", async () => {
    expect(await zichtbaarVoor(TRAINER)).toBe(2);
  });

  it("houdt een trainer zonder koppeling buiten", async () => {
    expect(await zichtbaarVoor(VREEMDE_TRAINER)).toBe(0);
  });

  it("houdt ook training.manage_assignments buiten", async () => {
    // Dit is de afwijking van current_user_can_train_profile(): bestuur en
    // communitybeheer lezen schema's en belasting wél, maar dit gesprek niet.
    expect(await zichtbaarVoor(BESTUURDER)).toBe(0);
  });

  it("geeft bestuur wél de rest van de trainingsmodule", async () => {
    // Tegenproef: de afwijking zit in deze tabel, niet in een kapotte stub.
    await db.exec(`insert into public.training_plans(profile_id, title, start_date, end_date)
      values ('${LID}', 'Basis', current_date, current_date + 30);`);
    await db.exec("begin");
    try {
      await db.exec(
        `set local role authenticated; set local request.jwt.claim.sub = '${BESTUURDER}';`,
      );
      const { rows } = await db.query<{ count: number }>(
        "select count(*)::int as count from public.training_plans",
      );
      expect(rows[0].count).toBe(1);
    } finally {
      await db.exec("rollback");
    }
  });

  it("laat alleen de auteur zijn eigen bericht verwijderen", async () => {
    await db.exec("begin");
    try {
      await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${TRAINER}';`);
      // De trainer mag meelezen, maar niet het bericht van het lid weghalen.
      const { rows } = await db.query<{ id: string }>(
        `delete from public.training_chat_messages where role = 'member' returning id`,
      );
      expect(rows).toHaveLength(0);
    } finally {
      await db.exec("rollback");
    }
  });

  it("laat een coach-antwoord door niemand verwijderen", async () => {
    await db.exec("begin");
    try {
      await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${LID}';`);
      const { rows } = await db.query<{ id: string }>(
        `delete from public.training_chat_messages where role = 'coach' returning id`,
      );
      expect(rows).toHaveLength(0);
    } finally {
      await db.exec("rollback");
    }
  });

  it("zet de meldingsvoorkeur standaard aan", async () => {
    const { rows } = await db.query<{ column_default: string | null }>(
      `select column_default from information_schema.columns
       where table_name = 'notification_preferences' and column_name = 'on_training_chat'`,
    );
    expect(rows[0]?.column_default).toContain("true");
  });
});
