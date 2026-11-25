import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0338 (livestreams via YouTube) tegen een geïsoleerde PostgreSQL. Zegt niets
// over de productiedatabase, wel over wie wat mag: tokens leest niemand behalve
// de service-role, een lid ziet alleen de eigen koppeling, streams ziet elk
// goedgekeurd lid, en schrijven doet alleen de service-role.

let db: PGlite;

const STREAMER = "11111111-1111-1111-1111-111111111111";
const ANDER = "22222222-2222-2222-2222-222222222222";
const WACHTEND = "44444444-4444-4444-4444-444444444444";
const RACE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create table public.profiles(id uuid primary key, is_approved boolean not null default true);",
      "create table public.events(id uuid primary key, title text not null);",
    ].join("\n"),
  );
  const sql = await readFile("supabase/migrations/0338_youtube_livestreams.sql", "utf8");
  await db.exec(sql);
  // Opnieuw uitvoeren mag niets breken.
  await db.exec(sql);
  await db.exec(`
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    grant select on public.profiles to authenticated;
    insert into public.profiles(id, is_approved) values
      ('${STREAMER}', true), ('${ANDER}', true), ('${WACHTEND}', false);
    insert into public.events(id, title) values ('${RACE}', 'ZRL 2026/27 · R2 · W6 · B3');
    insert into public.youtube_connections(profile_id, channel_id, channel_title, access_token, refresh_token)
      values ('${STREAMER}', 'UC123', 'Mijn kanaal', 'enc:v1:geheim', 'enc:v1:geheimer');
    insert into public.event_streams(event_id, profile_id, youtube_video_id, channel_title, scheduled_start_at)
      values ('${RACE}', '${STREAMER}', 'dQw4w9WgXcQ', 'Mijn kanaal', now());
  `);
}, 30000);

afterAll(async () => {
  await db?.close();
});

async function als<T>(userId: string | null, query: string): Promise<T[]> {
  await db.exec("begin");
  try {
    if (userId) {
      await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${userId}';`);
    } else {
      await db.exec("set local role anon;");
    }
    return (await db.query<T>(query)).rows;
  } finally {
    await db.exec("rollback");
  }
}

describe("youtube_connections", () => {
  it("laat een lid de eigen kanaalnaam lezen, niet die van een ander", async () => {
    const sql = "select profile_id, channel_title, needs_reconnect from public.youtube_connections";
    expect(await als(STREAMER, sql)).toEqual([
      { profile_id: STREAMER, channel_title: "Mijn kanaal", needs_reconnect: false },
    ]);
    expect(await als(ANDER, sql)).toEqual([]);
  });

  it("laat niemand de tokens lezen, ook het lid zelf niet", async () => {
    await expect(als(STREAMER, "select access_token from public.youtube_connections")).rejects.toThrow();
    await expect(als(STREAMER, "select refresh_token from public.youtube_connections")).rejects.toThrow();
    await expect(als(STREAMER, "select * from public.youtube_connections")).rejects.toThrow();
  });

  it("laat een lid niet zelf schrijven", async () => {
    await expect(
      als(STREAMER, `update public.youtube_connections set channel_title = 'x' where profile_id = '${STREAMER}'`),
    ).rejects.toThrow();
    await expect(
      als(ANDER, `insert into public.youtube_connections(profile_id, channel_id) values ('${ANDER}', 'UC9')`),
    ).rejects.toThrow();
  });

  it("is voor anon dicht", async () => {
    await expect(als(null, "select channel_title from public.youtube_connections")).rejects.toThrow();
  });
});

describe("event_streams", () => {
  it("toont streams aan goedgekeurde leden, niet aan wie wacht of anon", async () => {
    const sql = "select youtube_video_id from public.event_streams";
    expect(await als(ANDER, sql)).toEqual([{ youtube_video_id: "dQw4w9WgXcQ" }]);
    expect(await als(WACHTEND, sql)).toEqual([]);
    await expect(als(null, sql)).rejects.toThrow();
  });

  it("laat leden niet zelf een stream aanmaken of weghalen", async () => {
    await expect(
      als(
        ANDER,
        `insert into public.event_streams(event_id, profile_id, youtube_video_id, scheduled_start_at)
           values ('${RACE}', '${ANDER}', 'abcdefghijk', now())`,
      ),
    ).rejects.toThrow();
    await expect(als(STREAMER, "delete from public.event_streams")).rejects.toThrow();
  });

  it("houdt één stream per lid per race, en alleen een geldig video-ID", async () => {
    await expect(
      db.exec(`insert into public.event_streams(event_id, profile_id, youtube_video_id, scheduled_start_at)
               values ('${RACE}', '${STREAMER}', 'anderevideo', now())`),
    ).rejects.toThrow();
    await expect(
      db.exec(`insert into public.event_streams(event_id, profile_id, youtube_video_id, scheduled_start_at)
               values ('${RACE}', '${ANDER}', 'x"><script>', now())`),
    ).rejects.toThrow();
  });

  it("verdwijnt met de race en met het lid", async () => {
    await db.exec("begin");
    try {
      await db.exec(`delete from public.profiles where id = '${STREAMER}'`);
      const { rows } = await db.query("select 1 from public.event_streams union all select 1 from public.youtube_connections");
      expect(rows).toEqual([]);
    } finally {
      await db.exec("rollback");
    }
  });
});

describe("0341 overlay_stand", () => {
  it("zet de stand standaard aan, ook voor bestaande streams, en mag opnieuw", async () => {
    const sql = (await readFile("supabase/migrations/0341_stream_overlay_stand.sql", "utf8")).replace(
      /notify pgrst[^;]*;/g,
      "",
    );
    await db.exec(sql);
    await db.exec(sql);
    const { rows } = await db.query<{ overlay_stand: boolean }>("select overlay_stand from public.event_streams");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.overlay_stand === true)).toBe(true);
    await expect(db.exec("update public.event_streams set overlay_stand = null")).rejects.toThrow();
  });
});

describe("0345 overlay_theme", () => {
  it("zet bestaande streams op donker, laat alleen donker en licht toe, en mag opnieuw", async () => {
    const sql = (await readFile("supabase/migrations/0345_stream_overlay_theme.sql", "utf8")).replace(
      /notify pgrst[^;]*;/g,
      "",
    );
    await db.exec(sql);
    await db.exec(sql);
    const { rows } = await db.query<{ overlay_theme: string }>("select overlay_theme from public.event_streams");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.overlay_theme === "dark")).toBe(true);
    await db.exec("update public.event_streams set overlay_theme = 'light'");
    await expect(db.exec("update public.event_streams set overlay_theme = 'paars'")).rejects.toThrow();
    await expect(db.exec("update public.event_streams set overlay_theme = null")).rejects.toThrow();
  });
});

describe("0346 overlay_style", () => {
  it("zet bestaande streams op tegels, laat alleen de vier stijlen toe, en mag opnieuw", async () => {
    const sql = (await readFile("supabase/migrations/0346_stream_overlay_style.sql", "utf8")).replace(
      /notify pgrst[^;]*;/g,
      "",
    );
    await db.exec(sql);
    await db.exec(sql);
    const { rows } = await db.query<{ overlay_style: string }>("select overlay_style from public.event_streams");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.overlay_style === "tegels")).toBe(true);
    for (const style of ["rugnummer", "zeefdruk", "strip", "tegels"]) {
      await db.exec(`update public.event_streams set overlay_style = '${style}'`);
    }
    await expect(db.exec("update public.event_streams set overlay_style = 'kopman'")).rejects.toThrow();
    await expect(db.exec("update public.event_streams set overlay_style = null")).rejects.toThrow();
  });
});

describe("0360 source", () => {
  it("zet bestaande streams op zwb, laat alleen zwb en eigen toe, en mag opnieuw", async () => {
    const sql = (await readFile("supabase/migrations/0360_event_streams_source.sql", "utf8")).replace(
      /notify pgrst[^;]*;/g,
      "",
    );
    await db.exec(sql);
    await db.exec(sql);
    const { rows } = await db.query<{ source: string }>("select source from public.event_streams");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.source === "zwb")).toBe(true);
    await db.exec("update public.event_streams set source = 'eigen'");
    await db.exec("update public.event_streams set source = 'zwb'");
    await expect(db.exec("update public.event_streams set source = 'twitch'")).rejects.toThrow();
    await expect(db.exec("update public.event_streams set source = null")).rejects.toThrow();
  });
});

describe("0370 extra", () => {
  it("laat extra streams toe naast de eigen, maar elke video één keer per race, en mag opnieuw", async () => {
    const sql = (await readFile("supabase/migrations/0370_event_streams_extra.sql", "utf8")).replace(
      /notify pgrst[^;]*;/g,
      "",
    );
    await db.exec(sql);
    await db.exec(sql);
    const insert = (video: string, source: string) =>
      db.exec(`insert into public.event_streams(event_id, profile_id, youtube_video_id, scheduled_start_at, source)
        values ('${RACE}', '${STREAMER}', '${video}', now(), '${source}')`);
    // STREAMER heeft al een eigen stream bij RACE: twee extra mogen erbij.
    await insert("extraVideo01", "extra");
    await insert("extraVideo02", "extra");
    // Een tweede eigen stream niet, en dezelfde video ook niet.
    await expect(insert("tweedeEigen1", "zwb")).rejects.toThrow();
    await expect(insert("tweedeEigen2", "eigen")).rejects.toThrow();
    await expect(insert("extraVideo01", "extra")).rejects.toThrow();
    await expect(insert("andereBron01", "twitch")).rejects.toThrow();
    await db.exec("delete from public.event_streams where source = 'extra'");
  });
});
