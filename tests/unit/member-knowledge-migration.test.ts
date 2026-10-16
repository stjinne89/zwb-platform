import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0239, 0240 en 0242 tegen een geïsoleerde PostgreSQL. Zegt niets over de productiedatabase,
// wel over wie wat mag: onderwerpen en tips zien goedgekeurde leden, een gesprek
// alleen de twee deelnemers (ook het bestuur niet), en een lid kan een tip die de
// moderatie verborg niet zelf terugzetten. Een antwoord uit een gesprek (0240)
// bewaart alleen de ander als tip, nooit de schrijver zelf. Onderwerpen (0242)
// voegt elk lid toe; alleen de moderatie hernoemt, verbergt of verwijdert.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

const VRAGER = "11111111-1111-1111-1111-111111111111";
const KENNER = "22222222-2222-2222-2222-222222222222";
const DERDE = "33333333-3333-3333-3333-333333333333";
const BESTUUR = "44444444-4444-4444-4444-444444444444";
const MODERATOR = "55555555-5555-5555-5555-555555555555";
const WACHTEND = "66666666-6666-6666-6666-666666666666";
const EVENT = "77777777-7777-7777-7777-777777777777";
const GESPREK = "88888888-8888-8888-8888-888888888888";
const TIP = "99999999-9999-9999-9999-999999999999";
const VRAAG = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ANTWOORD = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create table public.profiles(id uuid primary key, is_approved boolean not null default true, display_name text);",
      "create table public.notification_preferences(profile_id uuid primary key references public.profiles(id));",
      "create table public.events(id uuid primary key);",
      "create table public.cols(slug text primary key);",
      // Elk goedgekeurd lid mag posten; het bestuur beheert, de moderator modereert.
      `create function public.current_user_has_permission(p text) returns boolean language sql stable as $$
         select case p
           when 'community.manage' then auth.uid() = '${BESTUUR}'::uuid
           when 'content.moderate_posts' then auth.uid() in ('${BESTUUR}'::uuid, '${MODERATOR}'::uuid)
           when 'content.create_posts' then exists (
             select 1 from public.profiles where id = auth.uid() and is_approved)
           else false end $$;`,
    ].join("\n"),
  );

  await db.exec(await migration("0239_member_knowledge.sql"));
  await db.exec(await migration("0240_member_tips_from_thread.sql"));
  await db.exec(await migration("0242_knowledge_topics.sql"));

  await db.exec(`
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    grant execute on function public.current_user_has_permission(text) to anon, authenticated;
    grant execute on function public.current_user_moderates_member_tips() to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
  `);

  await db.exec(`
    insert into public.profiles(id, display_name, is_approved) values
      ('${VRAGER}', 'Vrager', true), ('${KENNER}', 'Kenner', true),
      ('${DERDE}', 'Derde', true), ('${BESTUUR}', 'Bestuur', true),
      ('${MODERATOR}', 'Moderator', true), ('${WACHTEND}', 'Wachtend', false);
    insert into public.notification_preferences(profile_id) values ('${KENNER}');
    insert into public.events(id) values ('${EVENT}');
    insert into public.cols(slug) values ('mont-ventoux');
    insert into public.member_knowledge(profile_id, consent_version) values
      ('${VRAGER}', '2026-10-15'), ('${KENNER}', '2026-10-15'), ('${WACHTEND}', '2026-10-15');
    insert into public.member_knowledge_topics(profile_id, topic_slug, note) values
      ('${KENNER}', 'bergen-cols', 'Alpen en Pyreneeën'),
      ('${WACHTEND}', 'gravel', null);
    insert into public.member_tips(id, profile_id, topic_slug, event_id, col_slug, body) values
      ('${TIP}', '${KENNER}', 'bergen-cols', '${EVENT}', 'mont-ventoux', 'Vanaf Bédoin: rustig tot Chalet Reynard.');
    insert into public.knowledge_threads(id, asker_id, expert_id, topic_slug)
      values ('${GESPREK}', '${VRAGER}', '${KENNER}', 'bergen-cols');
    insert into public.knowledge_messages(id, thread_id, author_id, body) values
      ('${VRAAG}', '${GESPREK}', '${VRAGER}', 'Welke kant is het mooist?'),
      ('${ANTWOORD}', '${GESPREK}', '${KENNER}', 'Vanaf Bédoin, de klassieke kant.');
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

/** Als `als`, maar met meerdere statements in één transactie; geeft de laatste query terug. */
async function alsReeks<T>(userId: string, statements: string[], query: string): Promise<T[]> {
  await db.exec("begin");
  try {
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${userId}';`);
    for (const statement of statements) await db.exec(statement);
    return (await db.query<T>(query)).rows;
  } finally {
    await db.exec("rollback");
  }
}

const tel = (table: string) => `select count(*)::int as count from public.${table}`;
const aantal = async (user: string, table: string) =>
  (await als<{ count: number }>(user, tel(table)))[0].count;

describe("meedoen en onderwerpen", () => {
  it("toont de toestemming alleen aan het lid zelf", async () => {
    expect(await aantal(VRAGER, "member_knowledge")).toBe(1);
    expect(await aantal(BESTUUR, "member_knowledge")).toBe(0);
  });

  it("toont onderwerpen van goedgekeurde leden aan goedgekeurde leden", async () => {
    // Het onderwerp van het wachtende lid telt niet mee.
    expect(await aantal(DERDE, "member_knowledge_topics")).toBe(1);
    expect(await aantal(WACHTEND, "member_knowledge_topics")).toBe(1); // alleen het eigen
  });

  it("laat een lid geen onderwerp namens een ander zetten", async () => {
    await expect(
      als(DERDE, `insert into public.member_knowledge_topics(profile_id, topic_slug)
        values ('${KENNER}', 'gravel')`),
    ).rejects.toThrow();
    expect(
      await als(DERDE, `update public.member_knowledge_topics set note = 'x' returning topic_slug`),
    ).toHaveLength(0);
  });

  it("weigert een vreemde toestemming, slug of te lange notitie", async () => {
    await expect(
      db.query(`insert into public.member_knowledge(profile_id, consent_version) values ($1, '2020-01-01')`, [DERDE]),
    ).rejects.toThrow();
    await expect(
      db.query(`insert into public.member_knowledge_topics(profile_id, topic_slug) values ($1, 'Bergen!')`, [KENNER]),
    ).rejects.toThrow();
    await expect(
      db.query(`insert into public.member_knowledge_topics(profile_id, topic_slug, note) values ($1, 'gravel', $2)`, [
        KENNER,
        "x".repeat(141),
      ]),
    ).rejects.toThrow();
  });

  it("wist de onderwerpen bij stoppen, maar laat gesprekken staan", async () => {
    const rows = await alsReeks<{ topics: number; threads: number }>(
      KENNER,
      [`delete from public.member_knowledge where profile_id = '${KENNER}'`],
      `select (select count(*)::int from public.member_knowledge_topics where profile_id = '${KENNER}') as topics,
              (select count(*)::int from public.knowledge_threads) as threads`,
    );
    expect(rows[0]).toEqual({ topics: 0, threads: 1 });
  });
});

describe("gesprekken", () => {
  it("toont een gesprek alleen aan de twee deelnemers, ook niet aan het bestuur", async () => {
    for (const user of [VRAGER, KENNER]) {
      expect(await aantal(user, "knowledge_threads")).toBe(1);
      expect(await aantal(user, "knowledge_messages")).toBe(2);
    }
    for (const user of [DERDE, BESTUUR, MODERATOR]) {
      expect(await aantal(user, "knowledge_threads")).toBe(0);
      expect(await aantal(user, "knowledge_messages")).toBe(0);
    }
  });

  it("zet het gesprek bij na een bericht", async () => {
    const rows = await alsReeks<{ last_author_id: string; unread_for_asker: boolean; expert_read: boolean }>(
      KENNER,
      [`insert into public.knowledge_messages(thread_id, author_id, body) values ('${GESPREK}', '${KENNER}', 'Bédoin.')`],
      `select last_author_id, last_message_at > asker_read_at as unread_for_asker,
              expert_read_at = last_message_at as expert_read
         from public.knowledge_threads where id = '${GESPREK}'`,
    );
    expect(rows[0]).toEqual({ last_author_id: KENNER, unread_for_asker: true, expert_read: true });
  });

  it("weigert een vraag aan iemand die niet meedoet, aan jezelf of zonder eigen toestemming", async () => {
    const vraag = (asker: string, expert: string, topic = "bergen-cols") =>
      als(asker, `insert into public.knowledge_threads(asker_id, expert_id, topic_slug)
        values ('${asker}', '${expert}', '${topic}') returning id`);
    await expect(vraag(VRAGER, DERDE)).rejects.toThrow();
    await expect(vraag(KENNER, KENNER)).rejects.toThrow();
    await expect(vraag(DERDE, KENNER)).rejects.toThrow(); // geen member_knowledge-rij
    await expect(vraag(VRAGER, KENNER, "gravel")).rejects.toThrow(); // ander onderwerp
    await expect(vraag(VRAGER, WACHTEND, "gravel")).rejects.toThrow(); // niet goedgekeurd
    expect(await vraag(VRAGER, KENNER)).toHaveLength(1);
  });

  it("laat geen vraag namens een ander stellen", async () => {
    await expect(
      als(KENNER, `insert into public.knowledge_threads(asker_id, expert_id, topic_slug)
        values ('${VRAGER}', '${KENNER}', 'bergen-cols')`),
    ).rejects.toThrow();
  });

  it("stopt na tien nieuwe vragen per dag", async () => {
    const inserts = Array.from(
      { length: 9 },
      () => `insert into public.knowledge_threads(asker_id, expert_id, topic_slug)
               values ('${VRAGER}', '${KENNER}', 'bergen-cols')`,
    );
    await expect(
      alsReeks(VRAGER, [...inserts, inserts[0]], "select 1"),
    ).rejects.toThrow(/Daglimiet/);
  });

  it("laat een derde geen bericht in andermans gesprek zetten", async () => {
    await expect(
      als(DERDE, `insert into public.knowledge_messages(thread_id, author_id, body)
        values ('${GESPREK}', '${DERDE}', 'Ik ook!')`),
    ).rejects.toThrow();
    await expect(
      als(KENNER, `insert into public.knowledge_messages(thread_id, author_id, body)
        values ('${GESPREK}', '${VRAGER}', 'Namens jou')`),
    ).rejects.toThrow();
  });

  it("accepteert geen berichten meer in een gesloten gesprek", async () => {
    await expect(
      alsReeks(
        VRAGER,
        [
          `select public.close_knowledge_thread('${GESPREK}')`,
          `insert into public.knowledge_messages(thread_id, author_id, body) values ('${GESPREK}', '${KENNER}', 'Nog één ding')`,
        ],
        "select 1",
      ),
    ).rejects.toThrow();
  });

  it("laat een derde een gesprek niet sluiten of lezen markeren", async () => {
    // Na de pogingen terug naar de superuser, die het gesprek wél ziet.
    const rows = await alsReeks<{ status: string; expert_read_at: string | null }>(
      DERDE,
      [
        `select public.close_knowledge_thread('${GESPREK}')`,
        `select public.mark_knowledge_thread_read('${GESPREK}')`,
        "reset role",
      ],
      `select status, expert_read_at from public.knowledge_threads where id = '${GESPREK}'`,
    );
    const before = (
      await db.query<{ expert_read_at: string | null }>(
        `select expert_read_at from public.knowledge_threads where id = '${GESPREK}'`,
      )
    ).rows[0];
    expect(rows[0]).toEqual({ status: "open", expert_read_at: before.expert_read_at });
  });

  it("zet bij gelezen alleen de eigen kolom", async () => {
    const rows = await alsReeks<{ asker_read_at: string | null; expert_read: boolean }>(
      KENNER,
      [`select public.mark_knowledge_thread_read('${GESPREK}')`],
      `select asker_read_at, expert_read_at is not null as expert_read from public.knowledge_threads where id = '${GESPREK}'`,
    );
    const before = (
      await db.query<{ asker_read_at: string | null }>(
        `select asker_read_at from public.knowledge_threads where id = '${GESPREK}'`,
      )
    ).rows[0];
    expect(rows[0].expert_read).toBe(true);
    expect(rows[0].asker_read_at).toEqual(before.asker_read_at);
  });

  it("laat leden een gesprek niet rechtstreeks bijwerken", async () => {
    expect(
      await als(VRAGER, `update public.knowledge_threads set status = 'closed' returning id`),
    ).toHaveLength(0);
  });

  it("wist het gesprek met het account van een deelnemer", async () => {
    await db.exec("begin");
    try {
      await db.exec(`delete from public.profiles where id = '${VRAGER}'`);
      expect((await db.query<{ count: number }>(tel("knowledge_threads"))).rows[0].count).toBe(0);
      expect((await db.query<{ count: number }>(tel("knowledge_messages"))).rows[0].count).toBe(0);
    } finally {
      await db.exec("rollback");
    }
  });
});

describe("tips", () => {
  it("toont gepubliceerde tips aan goedgekeurde leden, niet aan een wachtend account", async () => {
    expect(await aantal(DERDE, "member_tips")).toBe(1);
    expect(await aantal(WACHTEND, "member_tips")).toBe(0);
  });

  it("laat een lid een eigen tip plaatsen, maar niet namens een ander of als import", async () => {
    const plaats = (user: string, profile: string, source = "lid") =>
      als(user, `insert into public.member_tips(profile_id, topic_slug, body, source)
        values ('${profile}', 'gravel', 'Neem 40 mm.', '${source}') returning id`);
    expect(await plaats(DERDE, DERDE)).toHaveLength(1);
    await expect(plaats(DERDE, KENNER)).rejects.toThrow();
    await expect(plaats(DERDE, DERDE, "import")).rejects.toThrow();
    await expect(plaats(WACHTEND, WACHTEND)).rejects.toThrow();
    expect(await plaats(BESTUUR, KENNER, "import")).toHaveLength(1);
  });

  it("verbergt een tip voor anderen, en de auteur kan hem niet zelf terugzetten", async () => {
    await db.exec("begin");
    try {
      await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${MODERATOR}';`);
      await db.exec(`update public.member_tips set status = 'hidden' where id = '${TIP}'`);
      await db.exec(`set local request.jwt.claim.sub = '${DERDE}';`);
      expect((await db.query<{ count: number }>(tel("member_tips"))).rows[0].count).toBe(0);
      await db.exec(`set local request.jwt.claim.sub = '${KENNER}';`);
      expect((await db.query<{ count: number }>(tel("member_tips"))).rows[0].count).toBe(1);
      await expect(
        db.query(`update public.member_tips set status = 'published' where id = '${TIP}'`),
      ).rejects.toThrow(/moderatie/);
    } finally {
      await db.exec("rollback");
    }
  });

  it("laat de auteur de tekst wel aanpassen, een derde niet", async () => {
    expect(
      await als(KENNER, `update public.member_tips set body = 'Vanaf Malaucène.' where id = '${TIP}' returning id`),
    ).toHaveLength(1);
    expect(
      await als(DERDE, `update public.member_tips set body = 'Anders.' where id = '${TIP}' returning id`),
    ).toHaveLength(0);
    expect(await als(DERDE, `delete from public.member_tips where id = '${TIP}' returning id`)).toHaveLength(0);
  });

  it("weigert een te korte of te lange tip", async () => {
    for (const body of ["ok", "x".repeat(301)]) {
      await expect(
        db.query(`insert into public.member_tips(profile_id, topic_slug, body) values ($1, 'gravel', $2)`, [
          KENNER,
          body,
        ]),
      ).rejects.toThrow();
    }
  });

  it("houdt de tip als het event of de col verdwijnt", async () => {
    await db.exec("begin");
    try {
      await db.exec(`delete from public.events where id = '${EVENT}'; delete from public.cols where slug = 'mont-ventoux';`);
      const tip = (
        await db.query<{ event_id: string | null; col_slug: string | null }>(
          `select event_id, col_slug from public.member_tips where id = '${TIP}'`,
        )
      ).rows[0];
      expect(tip).toEqual({ event_id: null, col_slug: null });
    } finally {
      await db.exec("rollback");
    }
  });
});

describe("tip uit een gesprek (0240)", () => {
  const bewaar = (user: string, profile: string, message: string, createdBy = user) =>
    als(
      user,
      `insert into public.member_tips(profile_id, topic_slug, body, source, message_id, created_by)
         values ('${profile}', 'bergen-cols', 'Vanaf Bédoin.', 'gesprek', '${message}', '${createdBy}') returning id`,
    );

  it("laat de ontvanger een antwoord van de ander bewaren, op naam van de schrijver", async () => {
    expect(await bewaar(VRAGER, KENNER, ANTWOORD)).toHaveLength(1);
    expect(await bewaar(KENNER, VRAGER, VRAAG)).toHaveLength(1);
  });

  it("weigert je eigen bericht, een vreemde auteur of een gesprek waar je niet in zit", async () => {
    await expect(bewaar(KENNER, KENNER, ANTWOORD)).rejects.toThrow();
    await expect(bewaar(VRAGER, KENNER, VRAAG)).rejects.toThrow();
    await expect(bewaar(DERDE, KENNER, ANTWOORD)).rejects.toThrow();
    await expect(bewaar(VRAGER, KENNER, ANTWOORD, KENNER)).rejects.toThrow();
  });

  it("geeft een eigen tip geen bericht mee", async () => {
    await expect(
      als(KENNER, `insert into public.member_tips(profile_id, topic_slug, body, source, message_id)
        values ('${KENNER}', 'bergen-cols', 'Vanaf Bédoin.', 'lid', '${ANTWOORD}')`),
    ).rejects.toThrow();
  });

  it("bewaart een bericht maar één keer", async () => {
    await expect(
      alsReeks(
        VRAGER,
        [
          `insert into public.member_tips(profile_id, topic_slug, body, source, message_id, created_by)
             values ('${KENNER}', 'bergen-cols', 'Een.', 'gesprek', '${ANTWOORD}', '${VRAGER}')`,
          `insert into public.member_tips(profile_id, topic_slug, body, source, message_id, created_by)
             values ('${KENNER}', 'bergen-cols', 'Twee.', 'gesprek', '${ANTWOORD}', '${VRAGER}')`,
        ],
        "select 1",
      ),
    ).rejects.toThrow();
  });

  it("laat de schrijver de tip aanpassen en verwijderen, wie hem bewaarde niet", async () => {
    const insert = `insert into public.member_tips(id, profile_id, topic_slug, body, source, message_id, created_by)
      values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '${KENNER}', 'bergen-cols', 'Vanaf Bédoin.', 'gesprek', '${ANTWOORD}', '${VRAGER}')`;
    const tip = "id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'";
    expect(
      await alsReeks(VRAGER, [insert], `update public.member_tips set body = 'Anders.' where ${tip} returning id`),
    ).toHaveLength(0);
    expect(
      await alsReeks(VRAGER, [insert], `delete from public.member_tips where ${tip} returning id`),
    ).toHaveLength(0);
    await db.exec("begin");
    try {
      await db.exec(insert);
      await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${KENNER}';`);
      expect(
        (await db.query(`update public.member_tips set body = 'Bédoin, rustig.' where ${tip} returning id`)).rows,
      ).toHaveLength(1);
      await expect(
        db.query(`update public.member_tips set message_id = null where ${tip}`),
      ).rejects.toThrow(/moderatie/);
    } finally {
      await db.exec("rollback");
    }
  });
});

describe("onderwerpen (0242)", () => {
  const voegToe = (user: string, slug: string, label: string) =>
    als(
      user,
      `insert into public.knowledge_topics(slug, label, created_by) values ('${slug}', '${label}', '${user}') returning slug, label`,
    );

  it("start met de vijftien onderwerpen en zes spullen uit code", async () => {
    expect(await aantal(DERDE, "knowledge_topics")).toBe(21);
    const spullen = await als<{ count: number }>(
      DERDE,
      "select count(*)::int as count from public.knowledge_topics where kind = 'spullen'",
    );
    expect(spullen[0].count).toBe(6);
    expect(await aantal(WACHTEND, "knowledge_topics")).toBe(0);
  });

  it("laat een lid een onderwerp toevoegen, met de naam zonder spaties eromheen", async () => {
    expect(await voegToe(DERDE, "tijdrijden", "  Tijdrijden ")).toEqual([{ slug: "tijdrijden", label: "Tijdrijden" }]);
  });

  it("weigert dezelfde naam twee keer, een wachtend account en een ander als maker", async () => {
    await expect(voegToe(DERDE, "gravel-2", "gravel en BIKEPACKING")).rejects.toThrow();
    await expect(voegToe(WACHTEND, "tijdrijden", "Tijdrijden")).rejects.toThrow();
    await expect(
      als(DERDE, `insert into public.knowledge_topics(slug, label, created_by) values ('tijdrijden', 'Tijdrijden', '${KENNER}')`),
    ).rejects.toThrow();
    await expect(
      als(DERDE, `insert into public.knowledge_topics(slug, label, created_by, sort_order) values ('tijdrijden', 'Tijdrijden', '${DERDE}', 1)`),
    ).rejects.toThrow();
  });

  it("stopt na vijf nieuwe onderwerpen per dag, behalve voor de moderatie", async () => {
    const vijf = [1, 2, 3, 4, 5].map(
      (n) => `insert into public.knowledge_topics(slug, label, created_by) values ('nieuw-${n}', 'Nieuw ${n}', '${DERDE}')`,
    );
    await expect(
      alsReeks(DERDE, [...vijf, `insert into public.knowledge_topics(slug, label, created_by) values ('nieuw-6', 'Nieuw 6', '${DERDE}')`], "select 1"),
    ).rejects.toThrow(/Daglimiet/);
    const zes = [1, 2, 3, 4, 5, 6].map(
      (n) => `insert into public.knowledge_topics(slug, label, created_by) values ('mod-${n}', 'Mod ${n}', '${MODERATOR}')`,
    );
    expect(await alsReeks(MODERATOR, zes, "select 1 as ok")).toHaveLength(1);
  });

  it("laat alleen de moderatie hernoemen en verbergen", async () => {
    expect(
      await als(DERDE, `update public.knowledge_topics set label = 'Gravel' where slug = 'gravel' returning slug`),
    ).toHaveLength(0);
    expect(
      await als(MODERATOR, `update public.knowledge_topics set label = 'Gravel', status = 'hidden' where slug = 'gravel' returning slug`),
    ).toHaveLength(1);
  });

  it("verwijdert een onderwerp alleen als niemand het gebruikt", async () => {
    await expect(als(MODERATOR, `delete from public.knowledge_topics where slug = 'bergen-cols'`)).rejects.toThrow();
    expect(
      await als(MODERATOR, `delete from public.knowledge_topics where slug = 'kleding-weer' returning slug`),
    ).toHaveLength(1);
  });

  it("weigert een onderwerp dat niet in de lijst staat", async () => {
    await expect(
      db.query(`insert into public.member_knowledge_topics(profile_id, topic_slug) values ($1, 'bestaat-niet')`, [KENNER]),
    ).rejects.toThrow();
    await expect(
      db.query(`insert into public.knowledge_topics(slug, label, kind) values ('boot', 'Boot', 'vervoer')`),
    ).rejects.toThrow();
  });
});

describe("meldingen", () => {
  it("zet de nieuwe voorkeur standaard aan", async () => {
    const row = (
      await db.query<{ on_knowledge_message: boolean }>(
        `select on_knowledge_message from public.notification_preferences where profile_id = '${KENNER}'`,
      )
    ).rows[0];
    expect(row.on_knowledge_message).toBe(true);
  });
});
