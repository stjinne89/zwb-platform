// Proef voor de TTT-bot (bot/): wat ziet Sauce for Zwift van een ploeg?
//
// Laat Zwift op de Sauce-pc meekijken met een ploeglid tijdens een
// ploegentijdrit of groepsrit en draai dan:
//
//   node scripts/sauce-ttt-probe.mjs --url http://192.168.0.134:1080 --seconds 120 --ids 111,222,333
//
// Het script luistert op het `nearby`-kanaal, schrijft de ruwe berichten naar
// .tmp/ (staat in .gitignore: er zitten namen en vermogens van anderen in) en
// vat samen wat bot/src/sauce.ts moet weten: welke velden er zijn, hoeveel
// renners tegelijk in beeld zijn en of de ploeggenoten uit --ids erbij zitten.

import { mkdirSync, createWriteStream } from "node:fs";
import { join } from "node:path";

function arg(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

const base = arg("url", "http://localhost:1080");
const seconds = Number(arg("seconds", "60"));
const ids = String(arg("ids", "")).split(",").map((id) => id.trim()).filter(Boolean);
const SUB_ID = "zwb-ttt-probe";

const dir = join(import.meta.dirname, "..", ".tmp");
mkdirSync(dir, { recursive: true });
const file = join(dir, `sauce-ttt-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
const out = createWriteStream(file);

const stats = {
  messages: 0,
  other: new Map(),
  maxRiders: 0,
  entryKeys: new Set(),
  stateKeys: new Set(),
  seen: new Map(ids.map((id) => [id, 0])),
  gap: { min: Infinity, max: -Infinity },
};

const url = new URL("/api/ws/events", base);
url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
console.log(`Verbinden met ${url} voor ${seconds} s ...`);
const socket = new WebSocket(url);

socket.addEventListener("open", () => {
  socket.send(JSON.stringify({
    type: "request",
    uid: `${SUB_ID}-request`,
    data: { method: "subscribe", arg: { event: "nearby", subId: SUB_ID } },
  }));
  setTimeout(() => socket.close(), seconds * 1000);
});

socket.addEventListener("message", (message) => {
  out.write(`${message.data}\n`);
  let body;
  try {
    body = JSON.parse(String(message.data));
  } catch {
    return;
  }
  if (body.type !== "event" || !Array.isArray(body.data)) {
    // Antwoord op het verzoek, of een vorm die we niet kennen: laat hem zien.
    const key = JSON.stringify(body).slice(0, 200);
    stats.other.set(key, (stats.other.get(key) ?? 0) + 1);
    return;
  }
  stats.messages += 1;
  stats.maxRiders = Math.max(stats.maxRiders, body.data.length);
  for (const entry of body.data) {
    for (const key of Object.keys(entry ?? {})) stats.entryKeys.add(key);
    for (const key of Object.keys(entry?.state ?? {})) stats.stateKeys.add(key);
    const id = String(entry?.athleteId);
    if (stats.seen.has(id)) stats.seen.set(id, stats.seen.get(id) + 1);
    if (typeof entry?.gap === "number") {
      stats.gap.min = Math.min(stats.gap.min, entry.gap);
      stats.gap.max = Math.max(stats.gap.max, entry.gap);
    }
  }
});

socket.addEventListener("error", () => {
  console.error("Geen verbinding. Draait Sauce, en staat de webserver aan?");
});

socket.addEventListener("close", () => {
  out.end();
  console.log(`\nBerichten met renners: ${stats.messages}`);
  console.log(`Meeste renners in één bericht: ${stats.maxRiders}`);
  console.log(`Velden per renner: ${[...stats.entryKeys].join(", ") || "-"}`);
  console.log(`Velden in state: ${[...stats.stateKeys].join(", ") || "-"}`);
  if (stats.messages > 0) console.log(`Gat (gap): ${stats.gap.min} tot ${stats.gap.max}`);
  for (const [id, count] of stats.seen) {
    console.log(`Renner ${id}: in ${count} van ${stats.messages} berichten`);
  }
  for (const [text, count] of stats.other) console.log(`Ander bericht (${count}x): ${text}`);
  console.log(`\nRuwe berichten: ${file}`);
});
