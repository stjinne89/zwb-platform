// Het formaat tussen het platform en de stream-hulp (livestreams, fase 3).
// Een kopie van stream-hulp/src/protocol.ts: de hulp wordt los van GitHub
// geïnstalleerd en kan niet uit src importeren.
// tests/unit/stream-hulp-protocol.test.ts houdt de twee gelijk.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CODE_PREFIX = "zwb1.";
/** Een terugmelding van de hulp mag zo oud zijn (klokverschil, trage verbinding). */
export const REPORT_MAX_AGE_MS = 5 * 60_000;

export type PairingCode = {
  v: 1;
  site: string;
  supabaseUrl: string;
  anonKey: string;
  channel: string;
  secret: string;
};

export type ObsState = "streaming" | "idle" | "obs-offline";
export const OBS_STATES: readonly ObsState[] = ["streaming", "idle", "obs-offline"];

export function encodePairingCode(code: PairingCode): string {
  return CODE_PREFIX + Buffer.from(JSON.stringify(code), "utf8").toString("base64url");
}

function hmac(secret: string, text: string): string {
  return createHmac("sha256", secret).update(text).digest("hex");
}

export function commandSignature(secret: string, action: string, ts: number, nonce: string): string {
  return hmac(secret, `cmd.${action}.${ts}.${nonce}`);
}

export function reportSignature(secret: string, state: string, ts: number): string {
  return hmac(secret, `rep.${state}.${ts}`);
}

export function sameHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

/** Een nieuw kanaal en geheim: lang en willekeurig. */
export function newHelperSecrets(): { channel: string; secret: string } {
  return {
    channel: `hulp-${randomBytes(24).toString("base64url")}`,
    secret: randomBytes(32).toString("base64url"),
  };
}

export function signedCommand(secret: string, action: "start" | "stop", now: number) {
  const nonce = randomBytes(12).toString("base64url");
  return { action, ts: now, nonce, sig: commandSignature(secret, action, now, nonce) };
}

/** Klopt deze terugmelding: bekende stand, recent, nieuwer dan de vorige, en ondertekend? */
export function reportIsValid(
  secret: string,
  report: { state: unknown; ts: unknown; sig: unknown },
  now: number,
  previousTs: number | null,
): report is { state: ObsState; ts: number; sig: string } {
  if (!OBS_STATES.includes(report.state as ObsState)) return false;
  if (typeof report.ts !== "number" || !Number.isFinite(report.ts)) return false;
  if (typeof report.sig !== "string") return false;
  if (Math.abs(now - report.ts) > REPORT_MAX_AGE_MS) return false;
  if (previousTs !== null && report.ts <= previousTs) return false;
  return sameHex(report.sig, reportSignature(secret, report.state as string, report.ts));
}
