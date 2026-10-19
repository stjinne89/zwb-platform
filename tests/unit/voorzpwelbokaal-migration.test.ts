import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0252 tegen een geïsoleerde PostgreSQL. Zegt niets over de productiedatabase,
// wel over de spelregels die de database zelf afdwingt: meedoen, de quotering
// van het bord, hoogstens 5 ballen per wedstrijd, het saldo, en wie wanneer
// andermans briefjes ziet.

let db: PGlite;

const JAN = "11111111-1111-4111-8111-111111111111";
const AN = "22222222-2222-4222-8222-222222222222";
const WACHTEND = "33333333-3333-4333-8333-333333333333";
const DAMES = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HEREN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const VOLGENDE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const GESTART = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CONCEPT = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const SEIZOEN = "2026-2027";

const board = JSON.stringify({
  riders: [
    { slug: "marie-schreiber", name: "Marie Schreiber", rating: 955, win: 20, pod: 3.5, top: 1.1 },
    { slug: "lucinda-brand", name: "Lucinda Brand", rating: 1044, win: 1.6, pod: null, top: null },
    { slug: "aniek-van-alphen", name: "Aniek van Alphen", rating: 949, win: 25, pod: 4, top: 1.1 },
  ],
  duels: [{ a: "marie-schreiber", b: "aniek-van-alphen", oa: 1.8, ob: 2.1 }],
});
const bonus = JSON.stringify({ key: "marge", question: "Voorsprong?", options: ["a", "b", "c"], answer: null });

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table public.profiles(id uuid primary key, is_approved boolean not null default true, display_name text);
  `);
  await db.exec(await readFile("supabase/migrations/0252_voorzpwelbokaal.sql", "utf8"));
  await db.exec(`
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    grant select on public.profiles to authenticated;
    insert into public.profiles(id, display_name, is_approved) values
      ('${JAN}', 'Jan', true), ('${AN}', 'An', true), ('${WACHTEND}', 'Wachtend', false);
    insert into public.bokaal_players(profile_id, season, consent_version) values
      ('${JAN}', '${SEIZOEN}', '2026-10-19'), ('${AN}', '${SEIZOEN}', '2026-10-19');
    insert into public.bokaal_races(id, season, category, event_slug, event_name, race_slug, starts_at, status, board, bonus) values
      ('${DAMES}', '${SEIZOEN}', 'w', 'x-2026', 'X', 'x-we-2026', now() + interval '1 day', 'open', '${board}', '${bonus}'),
      ('${HEREN}', '${SEIZOEN}', 'm', 'x-2026', 'X', 'x-2026', now() + interval '1 day', 'open', '${board}', null),
      ('${VOLGENDE}', '${SEIZOEN}', 'w', 'y-2026', 'Y', 'y-we-2026', now() + interval '8 days', 'open', '${board}', null),
      ('${GESTART}', '${SEIZOEN}', 'w', 'z-2026', 'Z', 'z-we-2026', now() - interval '1 hour', 'open', '${board}', null),
      ('${CONCEPT}', '${SEIZOEN}', 'w', 'q-2026', 'Q', 'q-we-2026', now() + interval '1 day', 'concept', '${board}', null);
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

const zet = (race: string, market: string, rider: string, stake: number, vs: string | null = null) =>
  `select public.bokaal_place_bet('${race}', '${market}', '${rider}', ${vs ? `'${vs}'` : "null"}, ${stake})`;
const saldo = (user: string) => `select public.bokaal_balance('${user}', '${SEIZOEN}')::float as saldo`;

describe("meedoen", () => {
  it("laat een goedgekeurd lid zichzelf aanmelden, een wachtend lid niet", async () => {
    await expect(
      als(WACHTEND, [`insert into public.bokaal_players(profile_id, season, consent_version) values ('${WACHTEND}', '${SEIZOEN}', '2026-10-19')`], "select 1"),
    ).rejects.toThrow();
    await expect(
      als(JAN, [`insert into public.bokaal_players(profile_id, season, consent_version) values ('${AN}', '2027-2028', '2026-10-19')`], "select 1"),
    ).rejects.toThrow();
  });

  it("begint met 10 ballen", async () => {
    expect((await als<{ saldo: number }>(JAN, [], saldo(JAN)))[0].saldo).toBe(10);
  });
});

describe("inzetten", () => {
  it("neemt de quotering van het bord, niet van de inzetter", async () => {
    const rows = await als<{ odds: string; rider_name: string }>(JAN, [zet(DAMES, "win", "marie-schreiber", 2)],
      `select odds::text, rider_name from public.bokaal_bets where profile_id = '${JAN}'`);
    expect(rows).toEqual([{ odds: "20.00", rider_name: "Marie Schreiber" }]);
  });

  it("zet een duel op de quotering van die kant", async () => {
    const rows = await als<{ odds: string; vs_name: string }>(JAN, [zet(DAMES, "duel", "aniek-van-alphen", 1, "marie-schreiber")],
      `select odds::text, vs_name from public.bokaal_bets where profile_id = '${JAN}'`);
    expect(rows).toEqual([{ odds: "2.10", vs_name: "Marie Schreiber" }]);
  });

  it("weigert een markt zonder quotering, een onbekende renner of een fout duel", async () => {
    await expect(als(JAN, [zet(DAMES, "pod", "lucinda-brand", 1)], "select 1")).rejects.toThrow(/geen quotering/);
    await expect(als(JAN, [zet(DAMES, "win", "niemand", 1)], "select 1")).rejects.toThrow(/niet op het bord/);
    await expect(als(JAN, [zet(DAMES, "duel", "marie-schreiber", 1, "lucinda-brand")], "select 1")).rejects.toThrow(/duel/);
  });

  it("staat hoogstens 5 ballen per wedstrijd toe, dames en heren apart", async () => {
    await expect(
      als(JAN, [zet(DAMES, "win", "marie-schreiber", 3), zet(DAMES, "top", "aniek-van-alphen", 3)], "select 1"),
    ).rejects.toThrow(/hoogstens 5/);
    const rows = await als<{ saldo: number }>(JAN,
      [zet(DAMES, "win", "marie-schreiber", 5), zet(HEREN, "win", "marie-schreiber", 5)], saldo(JAN));
    expect(rows[0].saldo).toBe(0);
  });

  it("stopt als het saldo op is", async () => {
    await expect(
      als(JAN, [zet(DAMES, "win", "marie-schreiber", 5), zet(HEREN, "win", "marie-schreiber", 5), zet(VOLGENDE, "win", "marie-schreiber", 1)], "select 1"),
    ).rejects.toThrow(/niet genoeg/);
  });

  it("weigert een gestarte koers, een concept, een inzet buiten 1 tot 5 en wie niet meedoet", async () => {
    await expect(als(JAN, [zet(GESTART, "win", "marie-schreiber", 1)], "select 1")).rejects.toThrow(/dicht/);
    await expect(als(JAN, [zet(CONCEPT, "win", "marie-schreiber", 1)], "select 1")).rejects.toThrow(/dicht/);
    await expect(als(JAN, [zet(DAMES, "win", "marie-schreiber", 6)], "select 1")).rejects.toThrow(/1 tot 5/);
    await expect(als(WACHTEND, [zet(DAMES, "win", "marie-schreiber", 1)], "select 1")).rejects.toThrow(/goedgekeurde/);
  });

  it("kan geen briefje rechtstreeks schrijven of aanpassen", async () => {
    await expect(
      als(JAN, [`insert into public.bokaal_bets(race_id, profile_id, season, market, rider_slug, rider_name, odds, stake)
        values ('${DAMES}', '${JAN}', '${SEIZOEN}', 'win', 'marie-schreiber', 'Marie Schreiber', 50, 5)`], "select 1"),
    ).rejects.toThrow();
  });

  it("laat een open briefje intrekken voor de start", async () => {
    const rows = await als<{ saldo: number }>(JAN, [
      zet(DAMES, "win", "marie-schreiber", 4),
      `select public.bokaal_cancel_bet((select id from public.bokaal_bets where profile_id = '${JAN}'))`,
    ], saldo(JAN));
    expect(rows[0].saldo).toBe(10);
  });
});

describe("saldo na de koers", () => {
  it("telt uitbetalingen en goede bonusantwoorden op, en wie wint kan opnieuw inzetten", async () => {
    await db.exec("begin");
    try {
      await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${JAN}';`);
      await db.exec(zet(DAMES, "win", "marie-schreiber", 2));
      await db.exec(zet(DAMES, "pod", "aniek-van-alphen", 1));
      await db.exec(`select public.bokaal_answer_bonus('${DAMES}', 1)`);
      await db.exec("reset role");
      // De server rekent af met de service-rol.
      await db.exec(`
        update public.bokaal_bets set outcome = 'raak', payout = stake * odds where rider_slug = 'marie-schreiber';
        update public.bokaal_bets set outcome = 'mis', payout = 0 where rider_slug = 'aniek-van-alphen';
        update public.bokaal_bonus_answers set correct = true;
      `);
      await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${JAN}';`);
      expect((await db.query<{ saldo: number }>(saldo(JAN))).rows[0].saldo).toBe(10 - 3 + 40 + 1);
      await db.exec(zet(VOLGENDE, "win", "marie-schreiber", 5));
      const lei = await db.query<{ display_name: string; balance: string }>(
        `select display_name, balance::text from public.bokaal_standings('${SEIZOEN}') order by balance desc`);
      expect(lei.rows).toEqual([{ display_name: "Jan", balance: "43.00" }, { display_name: "An", balance: "10" }]);
    } finally {
      await db.exec("rollback");
    }
  });
});

describe("meekijken", () => {
  it("toont andermans briefjes en antwoorden pas na de start", async () => {
    await db.exec("begin");
    try {
      await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${JAN}';`);
      await db.exec(zet(DAMES, "win", "marie-schreiber", 1));
      await db.exec(`select public.bokaal_answer_bonus('${DAMES}', 2)`);
      await db.exec(`set local request.jwt.claim.sub = '${AN}';`);
      expect((await db.query("select * from public.bokaal_bets")).rows).toHaveLength(0);
      expect((await db.query("select * from public.bokaal_bonus_answers")).rows).toHaveLength(0);
      await db.exec("reset role");
      await db.exec(`update public.bokaal_races set starts_at = now() - interval '1 minute' where id = '${DAMES}'`);
      await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${AN}';`);
      expect((await db.query("select * from public.bokaal_bets")).rows).toHaveLength(1);
      expect((await db.query("select * from public.bokaal_bonus_answers")).rows).toHaveLength(1);
    } finally {
      await db.exec("rollback");
    }
  });

  it("verbergt concepten", async () => {
    const rows = await als<{ id: string }>(AN, [], `select id from public.bokaal_races where id = '${CONCEPT}'`);
    expect(rows).toHaveLength(0);
  });
});

describe("stoppen", () => {
  it("wist bij stoppen ook alle briefjes en antwoorden", async () => {
    const rows = await als<{ n: number }>(JAN, [
      zet(DAMES, "win", "marie-schreiber", 1),
      `select public.bokaal_answer_bonus('${DAMES}', 0)`,
      `delete from public.bokaal_players where profile_id = '${JAN}'`,
    ], `select ((select count(*) from public.bokaal_bets) + (select count(*) from public.bokaal_bonus_answers))::int as n`);
    expect(rows[0].n).toBe(0);
  });
});
