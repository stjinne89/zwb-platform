// F4 — App-laag versleuteling (AES-256-GCM) voor geheimen die at rest in de DB
// staan: intervals.icu API-keys en Strava OAuth-tokens. De sleutel komt uit
// env `TOKEN_ENCRYPTION_KEY` (32 bytes, base64).
//
// Backward-compatible ontwerp:
//  - Versleutelde waarden krijgen de prefix `enc:v1:`.
//  - `decryptSecret` laat waarden ZONDER die prefix ongemoeid (legacy plaintext),
//    zodat bestaande rijen blijven werken tot ze herschreven/gebackfilld zijn.
//  - Zonder sleutel valt `encryptSecret` terug op plaintext (geen breuk); de
//    app blijft werken, maar zet de env-sleutel om versleuteling te activeren.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY moet 32 bytes zijn (base64-gecodeerd, bv. `openssl rand -base64 32`).",
    );
  }
  return key;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** Versleutelt een geheim. Geen sleutel of al versleuteld → onveranderd terug. */
export function encryptSecret(plain: string): string {
  if (!plain || isEncrypted(plain)) return plain;
  const key = getKey();
  if (!key) return plain; // graceful: blijf werken zonder sleutel
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/** Ontsleutelt; legacy plaintext (zonder prefix) gaat ongewijzigd terug. */
export function decryptSecret(stored: string): string {
  if (!stored || !isEncrypted(stored)) return stored;
  const key = getKey();
  if (!key) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY ontbreekt; een versleuteld geheim kan niet worden gelezen.",
    );
  }
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
