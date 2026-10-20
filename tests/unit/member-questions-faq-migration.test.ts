import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0255 (Q&A: "Ik ook" en de FAQ) bovenop 0254, tegen een geïsoleerde
// PostgreSQL. Zegt niets over de productiedatabase, wel over wie wat mag en of
// de teller klopt.

let db: PGlite;

const VRAGER = "11111111-1111-1111-1111-111111111111";
const ANDER = "22222222-2222-2222-2222-222222222222";
const BESTUUR = "33333333-3333-3333-3333-333333333333";
const WACHTEND = "44444444-4444-4444-4444-444444444444";
const DERDE = "55555555-5555-5555-5555-555555555555";
const CLUBVRAAG = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BESTUURSVRAAG = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create table public.profiles(id uuid primary key, is_approved boolean not null default true, display_name text);",
      "create table public.notification_preferences(profile_id uuid primary key references public.profiles(id));",
      "create table public.community_role_permissions(role text primary key, permissions text[] not null default '{}');",
      `create function public.current_user_has_permission(p text) returns boolean language sql stable as $$
         select p = 'qa.answer' and auth.uid() = '${BESTUUR}'::uuid $$;`,
    ].join("\n"),
  );
  await db.exec(`insert into public.community_role_permissions values ('board', '{events.create}');`);

  await db.exec(await readFile("supabase/migrations/0254_member_questions.sql", "utf8"));
  await db.exec(await readFile("supabase/migrations/0255_member_questions_faq.sql", "utf8"));

  await db.exec(`
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    grant select on public.profiles to authenticated;
  `);

  await db.exec(`
    insert into public.profiles(id, display_name, is_approved) values
      ('${VRAGER}', 'Vrager', true), ('${ANDER}', 'Ander', true),
      ('${BESTUUR}', 'Bestuur', true), ('${WACHTEND}', 'Wachtend', false),
      ('${DERDE}', 'Derde', true);
    insert into public.member_questions(id, profile_id, body, visibility) values
      ('${CLUBVRAAG}', '${VRAGER}', 'Hoe koppel ik mijn Wahoo?', 'club'),
      ('${BESTUURSVRAAG}', '${VRAGER}', 'Mijn ritten van vorige week ontbreken.', 'bestuur');
  `);
}, 30000);

afterAll(async () => {
  await db?.close();
});

/** Voert de statements uit alsof `userId` is ingelogd, met RLS aan; draait alles terug. */
async function als<T>(userId: string, statements: string[], query: string): Promise<T[]> {
  await db.exec("begin");
  try {
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${userId}';`);
    for (const statement of statements) await db.exec(statement);
    return (await db.query<T>(query)).rows;
  } finally {
    await db.exec("rollback");
  }
}

const ikOok = (userId: string, questionId = CLUBVRAAG) =>
  `insert into public.member_question_askers(question_id, profile_id) values ('${questionId}', '${userId}')`;
const teller = `select asked_count from public.member_questions where id = '${CLUBVRAAG}'`;

describe("Ik ook", () => {
  it("telt elk lid dat het tikt, en telt terug bij weghalen", async () => {
    expect(await als(ANDER, [], teller)).toEqual([{ asked_count: 1 }]);
    expect(await als(ANDER, [ikOok(ANDER)], teller)).toEqual([{ asked_count: 2 }]);
    expect(
      await als(
        ANDER,
        [ikOok(ANDER), `delete from public.member_question_askers where profile_id = '${ANDER}'`],
        teller,
      ),
    ).toEqual([{ asked_count: 1 }]);
  });

  it("telt een lid maar één keer, en de vrager niet bij zijn eigen vraag", async () => {
    await expect(als(ANDER, [ikOok(ANDER), ikOok(ANDER)], "select 1")).rejects.toThrow();
    await expect(als(VRAGER, [ikOok(VRAGER)], "select 1")).rejects.toThrow(/eigen vraag/);
  });

  it("weigert het namens een ander, bij een bestuursvraag en voor een wachtend account", async () => {
    await expect(als(ANDER, [ikOok(DERDE)], "select 1")).rejects.toThrow();
    await expect(als(ANDER, [ikOok(ANDER, BESTUURSVRAAG)], "select 1")).rejects.toThrow();
    await expect(als(WACHTEND, [ikOok(WACHTEND)], "select 1")).rejects.toThrow();
  });

  it("laat wie antwoordt een lid toevoegen, voor het samenvoegen van een dubbele vraag", async () => {
    expect(await als(BESTUUR, [ikOok(ANDER), ikOok(DERDE)], teller)).toEqual([{ asked_count: 3 }]);
  });

  it("toont een lid alleen zijn eigen Ik ook, wie antwoordt ziet ze allemaal", async () => {
    const wie = "select profile_id from public.member_question_askers order by profile_id";
    await db.exec(`insert into public.member_question_askers values ('${CLUBVRAAG}', '${ANDER}', now()), ('${CLUBVRAAG}', '${DERDE}', now())`);
    try {
      expect(await als(ANDER, [], wie)).toEqual([{ profile_id: ANDER }]);
      expect(await als(BESTUUR, [], wie)).toEqual([{ profile_id: ANDER }, { profile_id: DERDE }]);
      expect(await als(DERDE, [`delete from public.member_question_askers where profile_id = '${ANDER}'`], wie)).toEqual([
        { profile_id: DERDE },
      ]);
      expect((await db.query<{ asked_count: number }>(teller)).rows).toEqual([{ asked_count: 3 }]);
    } finally {
      await db.exec("delete from public.member_question_askers");
    }
  });

  it("laat de teller niet van buiten zetten, ook niet door wie antwoordt", async () => {
    expect(
      await als(BESTUUR, [`update public.member_questions set asked_count = 40 where id = '${CLUBVRAAG}'`], teller),
    ).toEqual([{ asked_count: 1 }]);
  });

  it("verdwijnt met de vraag en met het account", async () => {
    await db.exec("begin");
    try {
      await db.exec(ikOok(ANDER));
      await db.exec(`delete from public.profiles where id = '${ANDER}'`);
      expect((await db.query(teller)).rows).toEqual([{ asked_count: 1 }]);
      await db.exec(ikOok(DERDE));
      await db.exec(`delete from public.member_questions where id = '${CLUBVRAAG}'`);
      const left = await db.query<{ count: number }>("select count(*)::int as count from public.member_question_askers");
      expect(left.rows[0].count).toBe(0);
    } finally {
      await db.exec("rollback");
    }
  });
});

describe("FAQ", () => {
  const faq = `select faq_at is not null as in_faq from public.member_questions where id = '${CLUBVRAAG}'`;
  const beantwoord = `update public.member_questions set answer = 'Via Samen fietsen.' where id = '${CLUBVRAAG}'`;
  const inFaq = `update public.member_questions set faq_at = now() where id = '${CLUBVRAAG}'`;

  it("laat wie antwoordt een beantwoorde clubvraag in de FAQ zetten", async () => {
    expect(await als(BESTUUR, [beantwoord, inFaq], faq)).toEqual([{ in_faq: true }]);
  });

  it("weigert een open vraag of een bestuursvraag", async () => {
    expect(await als(BESTUUR, [inFaq], faq)).toEqual([{ in_faq: false }]);
    expect(
      await als(
        BESTUUR,
        [
          `update public.member_questions set answer = 'Kijken we na.', faq_at = now() where id = '${BESTUURSVRAAG}'`,
        ],
        `select faq_at from public.member_questions where id = '${BESTUURSVRAAG}'`,
      ),
    ).toEqual([{ faq_at: null }]);
  });

  it("haalt hem eruit als het antwoord weggaat of de vraag wordt afgeschermd", async () => {
    expect(
      await als(BESTUUR, [beantwoord, inFaq, `update public.member_questions set answer = null where id = '${CLUBVRAAG}'`], faq),
    ).toEqual([{ in_faq: false }]);
    expect(
      await als(
        BESTUUR,
        [beantwoord, inFaq, `update public.member_questions set visibility = 'bestuur' where id = '${CLUBVRAAG}'`],
        faq,
      ),
    ).toEqual([{ in_faq: false }]);
  });

  it("laat een gewoon lid niets aan de FAQ veranderen", async () => {
    await db.exec(`update public.member_questions set answer = 'Via Samen fietsen.' where id = '${CLUBVRAAG}'`);
    try {
      expect(await als(VRAGER, [inFaq], faq)).toEqual([{ in_faq: false }]);
    } finally {
      await db.exec(`update public.member_questions set answer = null where id = '${CLUBVRAAG}'`);
    }
  });

  it("begint een nieuwe vraag buiten de FAQ en met teller 1", async () => {
    const rows = await als<{ faq_at: string | null; asked_count: number }>(
      ANDER,
      [`insert into public.member_questions(profile_id, body, faq_at, asked_count) values ('${ANDER}', 'Waar staat de kalender?', now(), 9)`],
      `select faq_at, asked_count from public.member_questions where profile_id = '${ANDER}'`,
    );
    expect(rows).toEqual([{ faq_at: null, asked_count: 1 }]);
  });
});

describe("grants", () => {
  it("laat anon niet bij Ik ook", async () => {
    await db.exec("begin");
    try {
      await db.exec("set local role anon");
      await expect(db.query("select 1 from public.member_question_askers")).rejects.toThrow();
    } finally {
      await db.exec("rollback");
    }
  });
});
