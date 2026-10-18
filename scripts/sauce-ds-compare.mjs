// Vergelijking ZWB DS met Sauce for Zwift: wat ziet Sauce tijdens dezelfde rit?
//
// Draai dit terwijl je rijdt (of meekijkt) met Sauce aan, en houd ZWB DS open op
// je telefoon of in de browser:
//
//   node scripts/sauce-ds-compare.mjs --url http://192.168.0.134:1080 --minutes 10
//
// --url      de webserver van Sauce: http://localhost:1080 op de Sauce-pc zelf,
//            of http://<ip van die pc>:1080 vanaf een andere computer
// --minutes  hoe lang (standaard 10)
//
// Het script luistert naar Sauce' kanalen `nearby` (renners rond wie je volgt) en
// `groups` (Sauce' groepsindeling). Elke 30 s zet het een regel in de terminal
// met de groepen zoals Sauce ze ziet, zodat je die naast ZWB DS kunt leggen.
// Per seconde bewaart het in .tmp/ (staat in .gitignore) alleen Zwift-ID's en
// getallen: afstand in het event, gat, vermogen, snelheid, draft en helling.
// Geen namen. Met de tijden in UTC legt Claude dat naast wat ZWB DS op dat moment
// had.

import { mkdirSync, createWriteStream } from "node:fs";
import { join } from "node:path";

function arg(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

const base = arg("url", "http://localhost:1080");
const minutes = Number(arg("minutes", "10"));

const dir = join(import.meta.dirname, "..", ".tmp");
mkdirSync(dir, { recursive: true });
const file = join(dir, `sauce-ds-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
const out = createWriteStream(file);

const num = (value) => (typeof value === "number" && Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined);
const clock = (ms) => new Date(ms).toISOString().slice(11, 19);
const gapText = (s) => (typeof s === "number" ? `${s < 0 ? "-" : "+"}${Math.floor(Math.abs(s) / 60)}:${String(Math.round(Math.abs(s)) % 60).padStart(2, "0")}` : "?");

function rider(entry) {
  return {
    id: entry?.athleteId,
    gap: num(entry?.gap),
    gapDistance: num(entry?.gapDistance),
    eventDistance: num(entry?.state?.eventDistance),
    power: num(entry?.state?.power),
    speed: num(entry?.state?.speed),
    draft: num(entry?.state?.draft),
    grade: num(entry?.state?.grade),
    subgroup: entry?.state?.eventSubgroupId,
    watching: entry?.watching || undefined,
  };
}

const stats = {
  started: Date.now(),
  nearby: 0,
  groups: 0,
  maxNearby: 0,
  ids: new Set(),
  watching: new Set(),
  nearbyKeys: new Set(),
  stateKeys: new Set(),
  groupKeys: new Set(),
  lastWritten: { nearby: 0, groups: 0 },
  lastGroups: null,
  other: new Map(),
};

const url = new URL("/api/ws/events", base);
url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
console.log(`Verbinden met ${url} voor ${minutes} min (start ${clock(Date.now())} UTC) ...`);
const socket = new WebSocket(url);

let opened = false;
socket.addEventListener("open", () => {
  opened = true;
  for (const event of ["nearby", "groups"]) {
    socket.send(JSON.stringify({
      type: "request",
      uid: `zwb-ds-${event}-request`,
      data: { method: "subscribe", arg: { event, subId: `zwb-ds-${event}` } },
    }));
  }
  setTimeout(() => socket.close(), minutes * 60 * 1000);
});

const report = setInterval(() => {
  const groups = stats.lastGroups;
  if (!groups) {
    console.log(`${clock(Date.now())} UTC  nog geen groepen van Sauce`);
    return;
  }
  const text = groups
    .slice(0, 8)
    .map((g) => `${g.size}${g.isTarget ? "*" : ""} ${gapText(g.gap)}`)
    .join("  |  ");
  console.log(`${clock(Date.now())} UTC  ${stats.maxNearby} in beeld · groepen (* = jij): ${text}`);
}, 30_000);

socket.addEventListener("message", (message) => {
  let body;
  try {
    body = JSON.parse(String(message.data));
  } catch {
    return;
  }
  if (body.type !== "event" || !Array.isArray(body.data)) {
    const key = JSON.stringify(body).slice(0, 160);
    stats.other.set(key, (stats.other.get(key) ?? 0) + 1);
    return;
  }
  const now = Date.now();
  if (body.uid === "zwb-ds-nearby") {
    stats.nearby++;
    stats.maxNearby = Math.max(stats.maxNearby, body.data.length);
    for (const entry of body.data) {
      for (const key of Object.keys(entry ?? {})) stats.nearbyKeys.add(key);
      for (const key of Object.keys(entry?.state ?? {})) stats.stateKeys.add(key);
      if (entry?.athleteId != null) stats.ids.add(entry.athleteId);
      if (entry?.watching) stats.watching.add(entry.athleteId);
    }
    if (now - stats.lastWritten.nearby >= 1000) {
      stats.lastWritten.nearby = now;
      out.write(`${JSON.stringify({ at: now, kind: "nearby", riders: body.data.map(rider) })}\n`);
    }
  } else if (body.uid === "zwb-ds-groups") {
    stats.groups++;
    const groups = body.data.map((group) => {
      for (const key of Object.keys(group ?? {})) stats.groupKeys.add(key);
      const athletes = Array.isArray(group?.athletes) ? group.athletes : [];
      return {
        size: athletes.length,
        gap: num(group?.gap),
        innerGap: num(group?.innerGap),
        isTarget: group?.isTarget || undefined,
        power: num(group?.power),
        speed: num(group?.speed),
        ids: athletes.map((a) => a?.athleteId),
      };
    });
    stats.lastGroups = groups;
    if (now - stats.lastWritten.groups >= 1000) {
      stats.lastWritten.groups = now;
      out.write(`${JSON.stringify({ at: now, kind: "groups", groups })}\n`);
    }
  }
});

socket.addEventListener("error", () => {
  if (!opened) console.error("Geen verbinding. Draait Sauce, staat de webserver aan, en klopt --url?");
});

socket.addEventListener("close", () => {
  clearInterval(report);
  out.end();
  console.log("\n=== Samenvatting Sauce ===");
  console.log(`Van ${clock(stats.started)} tot ${clock(Date.now())} UTC`);
  console.log(`Berichten: nearby ${stats.nearby}, groups ${stats.groups}`);
  console.log(`Meeste renners tegelijk in beeld: ${stats.maxNearby}; verschillende renners gezien: ${stats.ids.size}`);
  console.log(`Gevolgde renner(s): ${[...stats.watching].join(", ") || "-"}`);
  console.log(`Velden per renner: ${[...stats.nearbyKeys].join(", ") || "-"}`);
  console.log(`Velden in state: ${[...stats.stateKeys].join(", ") || "-"}`);
  console.log(`Velden per groep: ${[...stats.groupKeys].join(", ") || "-"}`);
  for (const [text, count] of stats.other) console.log(`Ander bericht (${count}x): ${text}`);
  console.log(`\nPer seconde: ${file}`);
});
