// TV koppelen (0374): de pure stukken, voor de tests. De tv toont een code van
// zes tekens; een ingelogd lid keurt die goed; de tv krijgt een eigen sleutel.
// Zie docs/streamcenter-tv-onderzoek.md en lib/tv/store.ts.

import { amsterdamDateKey } from "@/lib/birthdays";

/** Zonder 0/O, 1/I/L: op een tv-scherm en een telefoon niet te verwarren. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

/** Zo lang geldt een code op het scherm. */
export const CODE_TTL_MS = 10 * 60_000;
/** Kijkt een tv zo lang niet, dan vervalt de koppeling. */
export const DEVICE_IDLE_MS = 90 * 24 * 3600_000;
/** Laatst gekeken hooguit zo vaak bijwerken: de tv ververst elke halve minuut. */
export const SEEN_EVERY_MS = 3600_000;
/** Tot dit uur in de nacht hoort de tv nog bij de avond ervoor. */
const NIGHT_UNTIL_HOUR = 4;

/** Cookies, alleen voor /tv: de sleutel van een gekoppelde tv en het geheim van een wachtende. */
export const TV_KEY_COOKIE = "zwb_tv";
export const TV_WAIT_COOKIE = "zwb_tv_wacht";
export const TV_COOKIE_PATH = "/tv";
/** Het maximum dat browsers toestaan (400 dagen); de koppeling zelf vervalt eerder bij niet kijken. */
export const TV_KEY_MAX_AGE_S = 400 * 24 * 3600;

/** Een code uit willekeurige bytes (minstens CODE_LENGTH). */
export function codeFromBytes(bytes: Uint8Array): string {
  if (bytes.length < CODE_LENGTH) throw new Error("te weinig bytes");
  let code = "";
  // 31 tekens: de modulo geeft een kleine scheefheid, onschuldig bij een code
  // die tien minuten geldt en waarvan het raden begrensd is.
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

/** Wat een lid intikt of de QR meegeeft, naar de vorm in de database; null als het geen code is. */
export function normalizeCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== CODE_LENGTH) return null;
  for (const char of code) if (!CODE_ALPHABET.includes(char)) return null;
  return code;
}

/** "K7M4QX" → "K7M 4QX": in twee groepjes van drie leest het makkelijker. */
export function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/** Is de koppeling vervallen omdat de tv te lang niet keek? */
export function deviceExpired(lastSeenAt: string, now: Date): boolean {
  return now.getTime() - Date.parse(lastSeenAt) > DEVICE_IDLE_MS;
}

/** Laatst gekeken bijwerken? Niet bij elke verversing. */
export function shouldTouch(lastSeenAt: string, now: Date): boolean {
  return now.getTime() - Date.parse(lastSeenAt) > SEEN_EVERY_MS;
}

/** De avond van de tv: tot 04:00 in Amsterdam nog de dag ervoor (JJJJ-MM-DD). */
export function tvNight(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", hourCycle: "h23" }).format(now),
  );
  // Een uur vóór de grens: in de nacht een paar uur terug, zodat de datum de vorige dag is.
  return hour < NIGHT_UNTIL_HOUR ? amsterdamDateKey(new Date(now.getTime() - (hour + 1) * 3600_000)) : amsterdamDateKey(now);
}
