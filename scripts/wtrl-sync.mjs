#!/usr/bin/env node
// WTRL-import vanaf je eigen pc: `npm run wtrl`.
//
// Haalt met jouw WTRL-sessie My Teams, de teamgegevens en de uitslagen van de
// lopende ronde op en stuurt ze naar het platform (/api/zrl/wtrl-import). Het
// platform zegt welke pagina's nodig zijn; dit script haalt alleen die op, één
// voor één met een paar seconden ertussen, en nooit meer dan MAX_REQUESTS.
// Het platform zelf roept WTRL niet aan (zie src/lib/wtrl/import.ts).
//
// Nodig in .env.local (staat niet in git):
//   WTRL_SID            de cookie `wtrl_sid` van wtrl.racing (Chrome: F12 →
//                       Application → Cookies → https://www.wtrl.racing)
//   WTRL_IMPORT_SECRET  dezelfde waarde als op Netlify
//   WTRL_IMPORT_URL     het adres van het platform, zonder pad
//
// Geeft WTRL een nieuwe wtrl_sid terug, dan zet het script die in .env.local.

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENV_FILE = ".env.local";
const WTRL = "https://www.wtrl.racing";
// Op 2026-11-25 gaf WTRL na 16 verzoeken met 3 s ertussen een 429.
const DELAY_MS = 5000;
/** Langer dan dit wachten we niet op een Retry-After. */
const MAX_RETRY_WAIT_S = 90;
const MAX_REQUESTS = 40;
const MAX_ROUNDS = 6;
const USER_AGENT = "ZWB-WTRL-script/1.0 (handmatig gestart door de teambeheerder)";

// Gelijk aan WTRL_PATHS in src/lib/wtrl/import.ts.
const ALLOWED = [
  /^\/zrl\/myteams\/$/,
  /^\/api\/zrl\/(\d{1,4})\/teams\/(\d{1,9})$/,
  /^\/api\/zrl\/results\/(\d{1,4})$/,
  /^\/api\/zrl\/results\/(\d{1,4})\/(\d{4}[A-E]\d{1,2}\d)\/(\d{1,2})$/,
];

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

if (!existsSync(ENV_FILE)) fail(`${ENV_FILE} niet gevonden. Start het script in de projectmap.`);
process.loadEnvFile(ENV_FILE);

let sid = process.env.WTRL_SID?.trim().replace(/^wtrl_sid=/, "");
const secret = process.env.WTRL_IMPORT_SECRET?.trim();
const base = process.env.WTRL_IMPORT_URL?.trim().replace(/\/+$/, "");
if (!sid) fail("WTRL_SID ontbreekt in .env.local.");
if (!secret) fail("WTRL_IMPORT_SECRET ontbreekt in .env.local.");
if (!base || !/^https?:\/\//.test(base)) fail("WTRL_IMPORT_URL ontbreekt of is geen adres.");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function saveSid(value) {
  const text = readFileSync(ENV_FILE, "utf8");
  const line = `WTRL_SID=${value}`;
  const next = /^WTRL_SID=.*$/m.test(text) ? text.replace(/^WTRL_SID=.*$/m, line) : `${text.trimEnd()}\n${line}\n`;
  writeFileSync(ENV_FILE, next);
}

let requests = 0;
const RATE_LIMITED = Symbol("429");

async function fromWtrl(path, retried = false) {
  if (!ALLOWED.some((pattern) => pattern.test(path))) fail(`Het platform vroeg een onbekend pad: ${path}`);
  if (requests >= MAX_REQUESTS) fail(`Meer dan ${MAX_REQUESTS} verzoeken; gestopt.`);
  if (requests > 0) await sleep(DELAY_MS);
  requests += 1;
  const res = await fetch(`${WTRL}${path}`, {
    headers: {
      Cookie: `wtrl_sid=${sid}`,
      "User-Agent": USER_AGENT,
      Accept: path.startsWith("/api/") ? "application/json" : "text/html",
      Referer: `${WTRL}/zrl/myteams/`,
    },
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
  const fresh = res.headers
    .getSetCookie()
    .map((cookie) => /^wtrl_sid=([^;]+)/.exec(cookie)?.[1])
    .find((value) => value && value !== "deleted");
  if (fresh && fresh !== sid) {
    sid = fresh;
    saveSid(fresh);
    console.log("  (WTRL gaf een nieuwe sessie; bijgewerkt in .env.local)");
  }
  const body = await res.text();
  if (res.status === 401 || (res.status >= 300 && res.status < 400)) {
    fail("De WTRL-sessie is verlopen. Log in op wtrl.racing in Chrome en zet de nieuwe wtrl_sid in .env.local.");
  }
  if (res.status === 429) {
    const hint = res.headers.get("retry-after");
    const wait = Number(hint);
    if (!retried && Number.isFinite(wait) && wait > 0 && wait <= MAX_RETRY_WAIT_S) {
      console.log(`  WTRL 429, wacht ${wait} s zoals gevraagd`);
      await sleep((wait + 1) * 1000);
      return fromWtrl(path, true);
    }
    console.log(`  WTRL 429 ${path}${hint ? ` (Retry-After: ${hint})` : ""}`);
    return RATE_LIMITED;
  }
  console.log(`  WTRL ${res.status} ${path}`);
  return { path, status: res.status, body };
}

async function toPlatform(pages, carry) {
  const res = await fetch(`${base}/api/zrl/wtrl-import`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pages, carry }),
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  if (!res.ok) fail(`Platform gaf HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

console.log("WTRL-import gestart.");
let step = await toPlatform([], null);
let limited = false;
for (let round = 1; round <= MAX_ROUNDS && step.fetch?.length && !limited; round += 1) {
  const pages = [];
  for (const path of step.fetch) {
    const page = await fromWtrl(path);
    if (page === RATE_LIMITED) {
      limited = true;
      break;
    }
    pages.push(page);
  }
  // Ook na een 429: wat al binnen is, gaat naar het platform.
  if (pages.length > 0) {
    step = await toPlatform(pages, step.carry);
    for (const line of step.report ?? []) console.log(`• ${line}`);
  }
}
if (limited) {
  console.log(
    "\n! WTRL gaf 429 (te veel verzoeken). Wat al binnen was, is verwerkt. Draai het later nog eens;\n  verwerkte uitslagen worden dan overgeslagen.",
  );
}
console.log(`\nKlaar: ${requests} verzoeken aan WTRL.`);
