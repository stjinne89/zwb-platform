// Het afgesproken formaat tussen het platform en de stream-hulp (livestreams,
// fase 3). Een kopie staat in src/lib/youtube-live/helper-protocol.ts van het
// platform; tests/unit/stream-hulp-protocol.test.ts daar houdt ze gelijk.
//
// - De koppelcode bevat het adres van het platform, het Realtime-kanaal en een
//   geheim. Alleen deze pc en het platform kennen het geheim.
// - Een opdracht (start of stop) komt via Supabase Realtime binnen en is
//   ondertekend met HMAC-SHA256. Zonder geldige handtekening, ouder dan een
//   minuut of al eens gezien: weigeren.
// - De hulp meldt de stand van OBS terug aan het platform, ook ondertekend.

import { createHmac, timingSafeEqual } from "node:crypto";

export const CODE_PREFIX = "zwb1.";
export const COMMAND_MAX_AGE_MS = 60_000;

export type PairingCode = {
  v: 1;
  /** Het adres van het platform, voor de terugmelding. */
  site: string;
  supabaseUrl: string;
  /** De publieke sleutel van Supabase, zoals in de browser. */
  anonKey: string;
  /** Het Realtime-kanaal, willekeurig en lang. */
  channel: string;
  /** Het geheim voor de handtekeningen. */
  secret: string;
};

export type Command = { action: "start" | "stop"; ts: number; nonce: string; sig: string };

export type ObsState = "streaming" | "idle" | "obs-offline";

export function decodePairingCode(code: string): PairingCode | null {
  const trimmed = code.trim();
  if (!trimmed.startsWith(CODE_PREFIX)) return null;
  try {
    const json = JSON.parse(Buffer.from(trimmed.slice(CODE_PREFIX.length), "base64url").toString("utf8"));
    if (
      json?.v === 1 &&
      typeof json.site === "string" &&
      /^https?:\/\//.test(json.site) &&
      typeof json.supabaseUrl === "string" &&
      typeof json.anonKey === "string" &&
      typeof json.channel === "string" &&
      json.channel.length >= 20 &&
      typeof json.secret === "string" &&
      json.secret.length >= 32
    ) {
      return json as PairingCode;
    }
  } catch {
    // geen geldige code
  }
  return null;
}

export function encodePairingCode(code: PairingCode): string {
  return CODE_PREFIX + Buffer.from(JSON.stringify(code), "utf8").toString("base64url");
}

function hmac(secret: string, text: string): string {
  return createHmac("sha256", secret).update(text).digest("hex");
}

function sameHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

export function commandSignature(secret: string, action: string, ts: number, nonce: string): string {
  return hmac(secret, `cmd.${action}.${ts}.${nonce}`);
}

export function reportSignature(secret: string, state: string, ts: number): string {
  return hmac(secret, `rep.${state}.${ts}`);
}

/**
 * Een geldige opdracht, of de reden van weigeren. `seen` houdt de nonces van de
 * laatste minuut bij, zodat een opgevangen bericht niet opnieuw werkt.
 */
export function verifyCommand(
  secret: string,
  payload: unknown,
  now: number,
  seen: Map<string, number>,
): { ok: true; command: Command } | { ok: false; reason: string } {
  const p = payload as Partial<Command> | null;
  if (!p || (p.action !== "start" && p.action !== "stop")) return { ok: false, reason: "onbekende opdracht" };
  if (typeof p.ts !== "number" || typeof p.nonce !== "string" || typeof p.sig !== "string") {
    return { ok: false, reason: "onvolledig" };
  }
  if (!sameHex(p.sig, commandSignature(secret, p.action, p.ts, p.nonce))) {
    return { ok: false, reason: "handtekening klopt niet" };
  }
  if (Math.abs(now - p.ts) > COMMAND_MAX_AGE_MS) return { ok: false, reason: "te oud" };
  for (const [nonce, at] of seen) if (now - at > COMMAND_MAX_AGE_MS * 2) seen.delete(nonce);
  if (seen.has(p.nonce)) return { ok: false, reason: "al uitgevoerd" };
  seen.set(p.nonce, now);
  return { ok: true, command: p as Command };
}
