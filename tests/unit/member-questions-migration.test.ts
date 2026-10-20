import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0254 (Q&A over de app) tegen een geïsoleerde PostgreSQL. Zegt niets over de
// productiedatabase, wel over wie wat mag: een clubvraag ziet elk goedgekeurd
// lid, een bestuursvraag alleen de vrager en wie antwoordt; alleen wie
// qa.answer heeft, antwoordt, en de vraag zelf verandert niet.

let db: PGlite;

const VRAGER = "11111111-1111-1111-1111-111111111111";
const ANDER = "22222222-2222-2222-2222-222222222222";
const BESTUUR = "33333333-3333-3333-3333-333333333333";
const WACHTEND = "44444444-4444-4444-4444-444444444444";
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
  await db.exec(`
    insert into public.community_role_permissions values
      ('board', '{events.create,polls.manage}'),
      ('community_manager', '{community.manage}'),
      ('community_member', '{content.create_posts,live.start}');
  `);

  await db.exec(await readFile("supabase/migrations/0254_member_questions.sql", "utf8"));

  await db.exec(`
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    grant select on public.profiles to authenticated;
  `);

  await db.exec(`
    insert into public.profiles(id, display_name, is_approved) values
      ('${VRAGER}', 'Vrager', true), ('${ANDER}', 'Ander', true),
      ('${BESTUUR}', 'Bestuur', true), ('${WACHTEND}', 'Wachtend', false);
    insert into public.notification_preferences(profile_id) values ('${VRAGER}');
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

const zichtbaar = async (userId: string) =>
  (
    await als<{ id: string }>(userId, [], "select id from public.member_questions order by id")
  ).map((row) => row.id);

describe("wie een vraag ziet", () => {
  it("toont een clubvraag aan elk goedgekeurd lid, een bestuursvraag niet", async () => {
    expect(await zichtbaar(VRAGER)).toEqual([CLUBVRAAG, BESTUURSVRAAG]);
    expect(await zichtbaar(ANDER)).toEqual([CLUBVRAAG]);
    expect(await zichtbaar(BESTUUR)).toEqual([CLUBVRAAG, BESTUURSVRAAG]);
  });

  it("toont een account dat nog wacht niets", async () => {
    expect(await zichtbaar(WACHTEND)).toEqual([]);
  });
});

describe("een vraag stellen", () => {
  it("laat een goedgekeurd lid vragen, en een vraag begint altijd open", async () => {
    const rows = await als<{ answer: string | null; answered_by: string | null }>(
      ANDER,
      [
        `insert into public.member_questions(profile_id, body, answer, answered_by, answered_at)
           values ('${ANDER}', 'Kan de kalender naar mijn agenda?', 'Ja', '${ANDER}', now())`,
      ],
      `select answer, answered_by from public.member_questions where profile_id = '${ANDER}'`,
    );
    expect(rows).toEqual([{ answer: null, answered_by: null }]);
  });

  it("weigert een vraag namens een ander, of van een account dat wacht", async () => {
    await expect(
      als(ANDER, [`insert into public.member_questions(profile_id, body) values ('${VRAGER}', 'Namens jou')`], "select 1"),
    ).rejects.toThrow();
    await expect(
      als(WACHTEND, [`insert into public.member_questions(profile_id, body) values ('${WACHTEND}', 'Mag ik al?')`], "select 1"),
    ).rejects.toThrow();
  });

  it("houdt de daglimiet van vijf vragen aan", async () => {
    const vraag = (n: number) =>
      `insert into public.member_questions(profile_id, body) values ('${ANDER}', 'Vraag nummer ${n}')`;
    const vijf = [1, 2, 3, 4, 5].map(vraag);
    const rows = await als<{ count: number }>(
      ANDER,
      vijf,
      `select count(*)::int as count from public.member_questions where profile_id = '${ANDER}'`,
    );
    expect(rows[0].count).toBe(5);
    await expect(als(ANDER, [...vijf, vraag(6)], "select 1")).rejects.toThrow(/Daglimiet/);
  });

  it("weigert een te korte, te lange of onbekend zichtbare vraag", async () => {
    for (const statement of [
      `insert into public.member_questions(profile_id, body) values ('${ANDER}', ' a ')`,
      `insert into public.member_questions(profile_id, body) values ('${ANDER}', '${"x".repeat(1001)}')`,
      `insert into public.member_questions(profile_id, body, visibility) values ('${ANDER}', 'Een vraag', 'iedereen')`,
    ]) {
      await expect(als(ANDER, [statement], "select 1")).rejects.toThrow();
    }
  });
});

describe("antwoorden", () => {
  it("laat alleen wie qa.answer heeft antwoorden", async () => {
    for (const user of [VRAGER, ANDER]) {
      const rows = await als<{ id: string }>(
        user,
        [],
        `update public.member_questions set answer = 'Zelf gedaan' where id = '${CLUBVRAAG}' returning id`,
      );
      expect(rows).toHaveLength(0);
    }
  });

  it("zet zelf wie antwoordde en wanneer, ook als iemand een ander invult", async () => {
    const rows = await als<{ answered_by: string; answered: boolean; activity_is_answer: boolean }>(
      BESTUUR,
      [
        `update public.member_questions
            set answer = 'Via Samen fietsen.', answered_by = '${ANDER}'
          where id = '${CLUBVRAAG}'`,
      ],
      `select answered_by, answered_at is not null as answered, activity_at = answered_at as activity_is_answer
         from public.member_questions where id = '${CLUBVRAAG}'`,
    );
    expect(rows).toEqual([{ answered_by: BESTUUR, answered: true, activity_is_answer: true }]);
  });

  it("houdt de eerste antwoordtijd bij een aanpassing, en opent de vraag weer zonder antwoord", async () => {
    const rows = await als<{ same_time: boolean }>(
      BESTUUR,
      [
        `update public.member_questions set answer = 'Eerste' where id = '${CLUBVRAAG}'`,
        `create temp table eerst as select answered_at from public.member_questions where id = '${CLUBVRAAG}'`,
        `update public.member_questions set answer = 'Beter' where id = '${CLUBVRAAG}'`,
      ],
      `select (select answered_at from public.member_questions where id = '${CLUBVRAAG}')
                = (select answered_at from eerst) as same_time`,
    );
    expect(rows[0].same_time).toBe(true);

    const open = await als<{ answered_by: string | null; answered_at: string | null }>(
      BESTUUR,
      [
        `update public.member_questions set answer = 'Eerste' where id = '${CLUBVRAAG}'`,
        `update public.member_questions set answer = null where id = '${CLUBVRAAG}'`,
      ],
      `select answered_by, answered_at from public.member_questions where id = '${CLUBVRAAG}'`,
    );
    expect(open).toEqual([{ answered_by: null, answered_at: null }]);
  });

  it("verandert de vraag zelf niet, ook niet door wie antwoordt", async () => {
    await expect(
      als(BESTUUR, [`update public.member_questions set body = 'Andere vraag' where id = '${CLUBVRAAG}'`], "select 1"),
    ).rejects.toThrow(/verandert niet/);
    await expect(
      als(BESTUUR, [`update public.member_questions set profile_id = '${ANDER}' where id = '${CLUBVRAAG}'`], "select 1"),
    ).rejects.toThrow(/verandert niet/);
  });

  it("laat wie antwoordt een clubvraag naar het bestuur zetten", async () => {
    const rows = await als<{ id: string }>(
      BESTUUR,
      [`update public.member_questions set visibility = 'bestuur' where id = '${CLUBVRAAG}'`],
      `select id from public.member_questions where visibility = 'club'`,
    );
    expect(rows).toHaveLength(0);
  });
});

describe("verwijderen", () => {
  it("laat de vrager en wie antwoordt verwijderen, een ander lid niet", async () => {
    const tel = `select count(*)::int as count from public.member_questions where id = '${CLUBVRAAG}'`;
    const weg = `delete from public.member_questions where id = '${CLUBVRAAG}'`;
    expect((await als<{ count: number }>(ANDER, [weg], tel))[0].count).toBe(1);
    expect((await als<{ count: number }>(VRAGER, [weg], tel))[0].count).toBe(0);
    expect((await als<{ count: number }>(BESTUUR, [weg], tel))[0].count).toBe(0);
  });

  it("verwijdert de vragen met het account, en laat een antwoord staan als wie antwoordde vertrekt", async () => {
    await db.exec("begin");
    try {
      await db.exec(`update public.member_questions set answer = 'Klaar', answered_by = '${BESTUUR}' where id = '${CLUBVRAAG}'`);
      await db.exec(`delete from public.profiles where id = '${BESTUUR}'`);
      const answered = await db.query<{ answer: string; answered_by: string | null }>(
        `select answer, answered_by from public.member_questions where id = '${CLUBVRAAG}'`,
      );
      expect(answered.rows).toEqual([{ answer: "Klaar", answered_by: null }]);
      await db.exec(`delete from public.notification_preferences where profile_id = '${VRAGER}'`);
      await db.exec(`delete from public.profiles where id = '${VRAGER}'`);
      const left = await db.query<{ count: number }>("select count(*)::int as count from public.member_questions");
      expect(left.rows[0].count).toBe(0);
    } finally {
      await db.exec("rollback");
    }
  });
});

describe("recht en pushvoorkeuren", () => {
  it("geeft qa.answer alleen aan het bestuur en weigert een onbekend recht", async () => {
    const { rows } = await db.query<{ role: string }>(
      "select role from public.community_role_permissions where 'qa.answer' = any(permissions) order by role",
    );
    expect(rows.map((row) => row.role)).toEqual(["board"]);
    await expect(
      db.exec("update public.community_role_permissions set permissions = '{qa.anything}' where role = 'board'"),
    ).rejects.toThrow();
  });

  it("zet beide meldingen standaard aan", async () => {
    const { rows } = await db.query<{ on_qa_question: boolean; on_qa_answer: boolean }>(
      `select on_qa_question, on_qa_answer from public.notification_preferences where profile_id = '${VRAGER}'`,
    );
    expect(rows).toEqual([{ on_qa_question: true, on_qa_answer: true }]);
  });

  it("laat anon niet bij de tabel", async () => {
    await db.exec("begin");
    try {
      await db.exec("set local role anon");
      await expect(db.query("select id from public.member_questions")).rejects.toThrow();
    } finally {
      await db.exec("rollback");
    }
  });
});
