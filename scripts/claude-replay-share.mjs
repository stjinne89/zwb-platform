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

const key = {};
const pairs = results.map((r, i) => {
  const id = `g${String(i + 1).padStart(2, "0")}`;
  // Zelfde kant als in compare.html.
  const claudeIsA = createHash("sha256").update(r.id).digest()[0] % 2 === 0;
  key[id] = { generationId: r.id, kind: r.kind, claude: claudeIsA ? "A" : "B" };
  const { athleteName: _name, ...input } = r.input;
  return {
    id,
    kind: r.kind,
    date: r.createdAt.slice(0, 10),
    input,
    a: claudeIsA ? r.claude : r.openai,
    b: claudeIsA ? r.openai : r.claude,
  };
});

const template = fs.readFileSync(path.join(root, "scripts", "claude-replay-share.html"), "utf8");
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), template.replace("__DATA__", JSON.stringify(pairs).replace(/</g, "\u003c")));
fs.writeFileSync(path.join(OUT, "key.json"), JSON.stringify(key, null, 2));
console.log(`${pairs.length} gevallen naar ${path.join(OUT, "index.html")}; sleutel in key.json`);
