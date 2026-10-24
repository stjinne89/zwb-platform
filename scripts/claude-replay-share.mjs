#!/usr/bin/env node
// Maakt van de uitkomst van claude-replay.mjs een deelbare pagina om met meer
// mensen blind te beoordelen (gepubliceerd als artifact). Anders dan
// compare.html staat er in de pagina niet welke kant Claude is: dat staat
// alleen lokaal in key.json. De naam van de renner gaat er niet in mee.
//
//   node scripts/claude-replay-share.mjs [--in .tmp/claude-replay] [--out .tmp/claude-replay/share]

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => {
  const at = process.argv.indexOf(name);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
};
const IN = arg("--in", path.join(root, ".tmp", "claude-replay"));
const OUT = arg("--out", path.join(IN, "share"));
const ORDER = ["daily", "day", "plan_update", "nieuw_schema"];

const results = fs
  .readFileSync(path.join(IN, "results.jsonl"), "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .filter((r) => r.claude)
  .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || b.createdAt.localeCompare(a.createdAt));

// De naam van de renner staat niet alleen in de invoer maar ook overal in de
// schema's ("Op rustdagen mag Stijn ..."). In titels valt hij weg, in lopende
// tekst wordt hij "de renner"; de bezittelijke vorm wordt "zijn".
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function anonymizer(name) {
  if (!name) return (value) => value;
  const n = escapeRe(name);
  const start = (offset, whole) => offset === 0 || /[.!?:;]\s*$|\n\s*$|["“(]\s*$/.test(whole.slice(0, offset));
  const cap = (word, offset, whole) => (start(offset, whole) ? word[0].toUpperCase() + word.slice(1) : word);
  const inTitle = (s) =>
    s
      .replace(new RegExp(`^${n}('s)?\\s*[—–:-]\\s*`), "")
      .replace(new RegExp(`\\s*[—–-]\\s*${n}$`), "")
      .replace(new RegExp(`\\s+(voor\\s+)?${n}\\b`, "g"), "")
      .replace(new RegExp(`^${n}('s)?\\s+`), "");
  const inText = (s) =>
    s
      .replace(new RegExp(`\\b${n}(?:'s|s)\\b`, "g"), (_m, offset, whole) => cap("zijn", offset, whole))
      .replace(new RegExp(`\\b${n}\\b`, "g"), (_m, offset, whole) => cap("de renner", offset, whole));
  const walk = (value, key) => {
    if (typeof value === "string") return key === "title" || key === "previousTitle" ? inText(inTitle(value)) : inText(value);
    if (Array.isArray(value)) return value.map((item) => walk(item, key));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, k)]));
    return value;
  };
  return (value) => walk(value, null);
}

const key = {};
const pairs = results.map((r, i) => {
  const id = `g${String(i + 1).padStart(2, "0")}`;
  // Zelfde kant als in compare.html.
  const claudeIsA = createHash("sha256").update(r.id).digest()[0] % 2 === 0;
  key[id] = { generationId: r.id, kind: r.kind, claude: claudeIsA ? "A" : "B" };
  const anon = anonymizer(r.input.athleteName);
  const input = { ...r.input };
  delete input.athleteName;
  return {
    id,
    kind: r.kind,
    date: r.createdAt.slice(0, 10),
    input: anon(input),
    a: anon(claudeIsA ? r.claude : r.openai),
    b: anon(claudeIsA ? r.openai : r.claude),
  };
});
const leftover = results.map((r) => r.input.athleteName).filter(Boolean).find((name) => JSON.stringify(pairs).includes(name));
if (leftover) throw new Error(`Naam staat nog in de pagina: ${leftover}`);

const template = fs.readFileSync(path.join(root, "scripts", "claude-replay-share.html"), "utf8");
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), template.replace("__DATA__", JSON.stringify(pairs).replace(/</g, "\\u003c")));
fs.writeFileSync(path.join(OUT, "key.json"), JSON.stringify(key, null, 2));
console.log(`${pairs.length} gevallen naar ${path.join(OUT, "index.html")}; sleutel in key.json`);
