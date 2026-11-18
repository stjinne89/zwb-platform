import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  commandSignature as platformCommandSignature,
  encodePairingCode,
  newHelperSecrets,
  reportIsValid,
  reportSignature as platformReportSignature,
  signedCommand,
} from "@/lib/youtube-live/helper-protocol";
import {
  commandSignature as hulpCommandSignature,
  decodePairingCode,
  reportSignature as hulpReportSignature,
  verifyCommand,
} from "../../stream-hulp/src/protocol";

// Livestreams, fase 3 (0340): het platform en de stream-hulp spreken hetzelfde
// protocol. De hulp heeft een eigen kopie (hij wordt los van GitHub
// geïnstalleerd); deze test houdt de twee gelijk.

const NOW = 1_800_000_000_000;

describe("platform en stream-hulp", () => {
  it("ondertekenen op dezelfde manier", () => {
    expect(platformCommandSignature("geheim", "start", 1, "n")).toBe(hulpCommandSignature("geheim", "start", 1, "n"));
    expect(platformReportSignature("geheim", "idle", 1)).toBe(hulpReportSignature("geheim", "idle", 1));
  });

  it("de hulp leest de koppelcode van het platform", () => {
    const { channel, secret } = newHelperSecrets();
    const code = encodePairingCode({
      v: 1,
      site: "https://app.example",
      supabaseUrl: "https://abc.supabase.co",
      anonKey: "publiek",
      channel,
      secret,
    });
    expect(decodePairingCode(code)).toMatchObject({ channel, secret, site: "https://app.example" });
  });

  it("de hulp voert een opdracht van het platform uit, één keer", () => {
    const { secret } = newHelperSecrets();
    const seen = new Map<string, number>();
    const command = signedCommand(secret, "stop", NOW);
    expect(verifyCommand(secret, command, NOW + 1000, seen)).toMatchObject({ ok: true, command: { action: "stop" } });
    expect(verifyCommand(secret, command, NOW + 2000, seen)).toMatchObject({ ok: false });
  });

  it("het platform neemt alleen een geldige, nieuwe terugmelding aan", () => {
    const { secret } = newHelperSecrets();
    const sig = hulpReportSignature(secret, "streaming", NOW);
    expect(reportIsValid(secret, { state: "streaming", ts: NOW, sig }, NOW + 1000, null)).toBe(true);
    expect(reportIsValid(secret, { state: "streaming", ts: NOW, sig }, NOW + 1000, NOW)).toBe(false);
    expect(reportIsValid(secret, { state: "streaming", ts: NOW, sig }, NOW + 6 * 60_000, null)).toBe(false);
    expect(reportIsValid(secret, { state: "idle", ts: NOW, sig }, NOW, null)).toBe(false);
    expect(reportIsValid(secret, { state: "kapot", ts: NOW, sig }, NOW, null)).toBe(false);
    expect(reportIsValid("ander", { state: "streaming", ts: NOW, sig }, NOW, null)).toBe(false);
    expect(reportIsValid(secret, { state: "streaming", ts: NOW, sig: "zz" }, NOW, null)).toBe(false);
  });

  it("maakt lange, verschillende kanalen en geheimen", () => {
    const a = newHelperSecrets();
    const b = newHelperSecrets();
    expect(a.channel).not.toBe(b.channel);
    expect(a.secret.length).toBeGreaterThanOrEqual(43);
    expect(a.channel.length).toBeGreaterThanOrEqual(30);
  });
});

describe("migratie 0340", () => {
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
        "create table public.profiles(id uuid primary key, is_approved boolean not null default true);",
      ].join("\n"),
    );
    const sql = await readFile("supabase/migrations/0340_stream_helpers.sql", "utf8");
    await db.exec(sql);
    await db.exec(sql);
    await db.exec(`
      grant usage on schema auth, public to anon, authenticated, service_role;
      grant execute on all functions in schema auth to anon, authenticated, service_role;
      insert into public.profiles(id) values ('${LID}'), ('${ANDER}');
      insert into public.stream_helpers(profile_id, channel_hash, channel_enc, secret_enc, obs_state)
        values ('${LID}', '${"a".repeat(64)}', 'enc:v1:kanaal', 'enc:v1:geheim', 'idle');
    `);
  }, 30000);

  afterAll(async () => {
    await db?.close();
  });

  async function als<T>(userId: string, query: string): Promise<T[]> {
    await db.exec("begin");
    try {
      await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${userId}';`);
      return (await db.query<T>(query)).rows;
    } finally {
      await db.exec("rollback");
    }
  }

  it("laat een lid alleen de stand van de eigen hulp lezen", async () => {
    expect(await als(LID, "select obs_state from public.stream_helpers")).toEqual([{ obs_state: "idle" }]);
    expect(await als(ANDER, "select obs_state from public.stream_helpers")).toEqual([]);
  });

  it("laat niemand kanaal of geheim lezen, en niet schrijven", async () => {
    await expect(als(LID, "select secret_enc from public.stream_helpers")).rejects.toThrow();
    await expect(als(LID, "select channel_enc from public.stream_helpers")).rejects.toThrow();
    await expect(als(LID, "update public.stream_helpers set obs_state = 'streaming'")).rejects.toThrow();
  });

  it("weigert een onbekende stand en een rare hash", async () => {
    await expect(
      db.exec(`update public.stream_helpers set obs_state = 'kapot' where profile_id = '${LID}'`),
    ).rejects.toThrow();
    await expect(
      db.exec(`insert into public.stream_helpers(profile_id, channel_hash, channel_enc, secret_enc)
               values ('${ANDER}', 'geen-hash', 'x', 'y')`),
    ).rejects.toThrow();
  });
});
