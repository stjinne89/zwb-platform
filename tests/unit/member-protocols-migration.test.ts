import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0233 tegen een geïsoleerde PostgreSQL, bovenop 0037 en 0167 (de koppelingen
// en de toegangsfunctie van de coachchat). Zegt niets over de productiedatabase,
// wel over wie wat mag: het lid schrijft, de eigen trainer leest mee, het
// bestuur en een andere trainer zien niets.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

const LID = "11111111-1111-1111-1111-111111111111";
const TRAINER = "22222222-2222-2222-2222-222222222222";
const VREEMDE_TRAINER = "33333333-3333-3333-3333-333333333333";
const BESTUURDER = "44444444-4444-4444-4444-444444444444";
const RUN = "55555555-5555-5555-5555-555555555555";

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
    "0233_member_protocols.sql",
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
    insert into public.member_protocols(id, profile_id, protocol_slug, start_date, race_date, consent_version)
      values ('${RUN}', '${LID}', 'bicarbonaat', '2027-06-06', '2027-06-20', '2026-10-14');
    insert into public.member_protocol_checks(protocol_id, day, task_key)
      values ('${RUN}', '2027-06-10', 'proef');
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

const tel = (table: string) => `select count(*)::int as count from public.${table}`;

describe("protocollen (0233)", () => {
  it("laat het lid en de eigen trainer de protocollen en het afvinken zien", async () => {
    for (const user of [LID, TRAINER]) {
      expect((await als<{ count: number }>(user, tel("member_protocols")))[0].count).toBe(1);
      expect((await als<{ count: number }>(user, tel("member_protocol_checks")))[0].count).toBe(1);
    }
  });

  it("houdt een andere trainer en het bestuur buiten", async () => {
    for (const user of [VREEMDE_TRAINER, BESTUURDER]) {
      expect((await als<{ count: number }>(user, tel("member_protocols")))[0].count).toBe(0);
      expect((await als<{ count: number }>(user, tel("member_protocol_checks")))[0].count).toBe(0);
    }
  });

  it("laat alleen het lid starten, afvinken en stoppen", async () => {
    expect(
      await als(
        LID,
        `insert into public.member_protocols(profile_id, protocol_slug, start_date, consent_version)
           values ('${LID}', 'creatine', '2027-06-01', '2026-10-14') returning id`,
      ),
    ).toHaveLength(1);
    expect(
      await als(LID, `insert into public.member_protocol_checks(protocol_id, day, task_key)
        values ('${RUN}', '2027-06-20', 'dosis') returning task_key`),
    ).toHaveLength(1);
    expect(
      await als(LID, `update public.member_protocols set status = 'gestopt' where id = '${RUN}' returning id`),
    ).toHaveLength(1);

    await expect(
      als(
        TRAINER,
        `insert into public.member_protocols(profile_id, protocol_slug, start_date, consent_version)
           values ('${LID}', 'creatine', '2027-06-01', '2026-10-14') returning id`,
      ),
    ).rejects.toThrow();
    await expect(
      als(TRAINER, `insert into public.member_protocol_checks(protocol_id, day, task_key)
        values ('${RUN}', '2027-06-20', 'dosis') returning task_key`),
    ).rejects.toThrow();
    expect(
      await als(TRAINER, `update public.member_protocols set status = 'gestopt' where id = '${RUN}' returning id`),
    ).toHaveLength(0);
    expect(await als(TRAINER, "delete from public.member_protocol_checks returning task_key")).toHaveLength(0);
  });

  it("vinkt niet af in een gestopt protocol", async () => {
    await db.exec("begin");
    try {
      await db.exec(`update public.member_protocols set status = 'gestopt' where id = '${RUN}'`);
      await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${LID}';`);
      await expect(
        db.query(`insert into public.member_protocol_checks(protocol_id, day, task_key)
          values ('${RUN}', '2027-06-20', 'dosis')`),
      ).rejects.toThrow();
    } finally {
      await db.exec("rollback");
    }
  });

  it("staat één lopend exemplaar per protocol toe", async () => {
    await expect(
      als(
        LID,
        `insert into public.member_protocols(profile_id, protocol_slug, start_date, race_date, consent_version)
           values ('${LID}', 'bicarbonaat', '2027-07-01', '2027-07-15', '2026-10-14')`,
      ),
    ).rejects.toThrow();
  });

  it("weigert zonder geldige toestemming, een vreemde slug of een wedstrijd vóór de start", async () => {
    const insert = (slug: string, consent: string, race: string | null) =>
      db.query(
        `insert into public.member_protocols(profile_id, protocol_slug, start_date, race_date, consent_version)
           values ($1, $2, '2027-06-01', $3, $4)`,
        [LID, slug, race, consent],
      );
    await expect(insert("creatine", "2020-01-01", null)).rejects.toThrow();
    await expect(insert("Creatine!", "2026-10-14", null)).rejects.toThrow();
    await expect(insert("cafeine", "2026-10-14", "2027-05-01")).rejects.toThrow();
  });

  it("wist alles van een lid dat zijn account opheft", async () => {
    await db.exec("begin");
    try {
      await db.exec(`delete from public.training_coach_assignments where athlete_id = '${LID}';
        delete from public.profiles where id = '${LID}';`);
      expect((await db.query<{ count: number }>(tel("member_protocols"))).rows[0].count).toBe(0);
      expect((await db.query<{ count: number }>(tel("member_protocol_checks"))).rows[0].count).toBe(0);
    } finally {
      await db.exec("rollback");
    }
  });
});
