// Hulpfuncties voor de LiveTrack-mail die via Resend binnenkomt.
//
// Elke renner krijgt een persoonlijk adres live-<code>@<LIVE_INBOUND_DOMAIN>.
// De code is het geheim: alleen de SHA-256-hash staat in live_tracker_tokens
// (provider 'mail'), net als bij de OwnTracks-tokens.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ADDRESS_PREFIX = "live-";
const CODE_RE = /^[a-z2-7]{20}$/;
const SIGNATURE_TOLERANCE_S = 5 * 60;

export function hashMailCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

/** 20 tekens base32 (100 bits), kleine letters: mailadressen zijn hoofdletterongevoelig. */
export function newMailCode() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  const bytes = randomBytes(20);
  return Array.from(bytes, (b) => alphabet[b % 32]).join("");
}

/**
 * Het ontvangstdomein. Resend toont het als `<anything>@xxxx.resend.app`; wie
 * dat hele adres in de env-var plakt, krijgt toch alleen het domein.
 */
export function inboundDomain(value = process.env.LIVE_INBOUND_DOMAIN) {
  const domain = (value ?? "").trim().toLowerCase().split("@").pop()!.replace(/[<>\s]/g, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) ? domain : null;
}

export function mailAddressForCode(code: string, domain: string) {
  return `${ADDRESS_PREFIX}${code}@${domain}`;
}

/**
 * De code uit de ontvangers van een mail. Een adres kan als "Naam <adres>"
 * binnenkomen; alleen adressen op ons ontvangstdomein tellen.
 */
export function mailCodeFromRecipients(recipients: string[], domain: string): string | null {
  for (const recipient of recipients) {
    const address = (recipient.match(/<([^>]+)>/)?.[1] ?? recipient).trim().toLowerCase();
    const at = address.lastIndexOf("@");
    if (at < 0 || address.slice(at + 1) !== domain) continue;
    const local = address.slice(0, at);
    if (!local.startsWith(ADDRESS_PREFIX)) continue;
    const code = local.slice(ADDRESS_PREFIX.length);
    if (CODE_RE.test(code)) return code;
  }
  return null;
}

/**
 * Svix-handtekening van een Resend-webhook controleren
 * (https://docs.svix.com/receiving/verifying-payloads/how-manual).
 * Het geheim heeft de vorm whsec_<base64>.
 */
export function verifySvixSignature(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > SIGNATURE_TOLERANCE_S) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
