// Meet wat MyWhoosh tijdens een Sunday Race Club laat zien, vóór we een live
// stand bouwen (fase 5, zie PLAN.md). Alleen lezen, openbare API, geen database.
//
//   node scripts/src-live-probe.mjs                 wacht op de eerstvolgende live SRC
//   node scripts/src-live-probe.mjs --minutes=110   hoe lang meten (standaard 110)
//   node scripts/src-live-probe.mjs --every=20      seconden tussen metingen (standaard 20)
//   node scripts/src-live-probe.mjs --event=<uuid>  een bekende race meten
//
// Start het een paar minuten voor de race (dames 07:25 GMT, heren 09:45 GMT).
// Per meting schrijft het een samenvatting naar de terminal, en drie
// geanonimiseerde momentopnamen (begin, midden, eind) naar
// tests/fixtures/src/live/. Namen, gebruikers-id's, teams, gewicht, vermogen,
// hartslag en prijzengeld gaan eruit; tijden, plaatsen, categorieën, ronden en
// de vorm van de data blijven.
//
// De vragen:
//   1. Springt isLive aan in event/{uuid} en in live-events-list?
//   2. Staan renners in getEventResults vóór ze finishen, en met welke velden
//      (afstand, positie, tussentijd)? Of alleen wie binnen is?
//   3. Hoe snel verschijnt een finisher?

import fs from "node:fs";
import path from "node:path";

const API = "https://service14.mywhoosh.com/v2/v3/public";
const arg = (name, fallback) => {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const MINUTES = Number(arg("minutes", 110));
const EVERY_S = Number(arg("every", 20));
const FIXED_EVENT = arg("event", null);
const OUT_DIR = path.join("tests", "fixtures", "src", "live");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function post(endpoint, body) {
  const response = await fetch(`${API}/${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  try {
    return { status: response.status, json: JSON.parse(text) };
  } catch {
    return { status: response.status, json: null, text: text.slice(0, 200) };
  }
}

async function get(endpoint) {
  const response = await fetch(`${API}/${endpoint}`, { headers: { accept: "application/json" } });
  return { status: response.status, json: await response.json().catch(() => null) };
}

/** Vervangt alles wat een persoon of team aanwijst door een vaste alias. */
function anonymizer() {
  const users = new Map();
  const teams = new Map();
  const alias = (map, key, prefix) => {
    if (!key) return key;
    if (!map.has(key)) map.set(key, `${prefix}-${map.size + 1}`);
    return map.get(key);
  };
  return (row) => {
    const out = { ...row };
    for (const key of Object.keys(out)) {
      if (/name/i.test(key) && typeof out[key] === "string" && !/^individual$/i.test(out[key])) {
        out[key] = key.toLowerCase().includes("team") ? alias(teams, out[key], "team") : "Renner";
      }
      if (/(^|_)?(user|player)id$/i.test(key) || key === "id") out[key] = alias(users, out[key], "user");
      if (/teamid$/i.test(key) && out[key]) out[key] = alias(teams, out[key], "teamid");
      if (key === "age" || /weight|prize|flag|jersey|image|country|watt|power|heart|rpm/i.test(key)) {
        delete out[key];
      }
    }
    return out;
  };
}

async function findLiveEvent() {
  if (FIXED_EVENT) return FIXED_EVENT;
  const live = await post("live-events-list", {});
  const events = live.json?.data?.data ?? [];
  const src = events.find((event) => /^(src|sunday race club)/i.test(event.event_name ?? ""));
  if (src) {
    console.log(`Live: ${src.event_name} (${src.event_id})`);
    return src.event_id;
  }
  console.log(`Geen live SRC (${events.length} live events: ${events.map((e) => e.event_name).join(", ") || "geen"}).`);
  return null;
}

async function main() {
  const until = Date.now() + MINUTES * 60_000;
  let eventId = null;
  while (!eventId && Date.now() < until) {
    eventId = await findLiveEvent();
    if (!eventId) await sleep(60_000);
  }
  if (!eventId) return console.log("Geen live SRC gevonden binnen de meettijd.");

  const anonymize = anonymizer();
  const snapshots = [];
  let firstFinisher = null;
  while (Date.now() < until) {
    const at = new Date().toISOString();
    const event = await get(`event/${eventId}`);
    const data = event.json?.data ?? {};
    const dayId = data.ListOfDays?.[0]?.DayId;
    const result = dayId
      ? await post("getEventResults", { eventId, dayId, leaderboardType: "individual" })
      : { status: 0, json: null };
    const rows = result.json?.data?.resultData ?? [];
    const finished = rows.filter((row) => Number(row.finishedTime) > 0);
    if (finished.length > 0 && !firstFinisher) firstFinisher = at;
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
    console.log(
      `${at} isLive(event)=${data.isLive} isLive(results)=${result.json?.data?.isLive} ` +
        `rijen=${rows.length} gefinisht=${finished.length} status=${result.status}`,
    );
    if (rows.length > 0 && snapshots.length === 0) console.log(`Velden: ${keys.join(", ")}`);
    snapshots.push({
      at,
      eventIsLive: data.isLive ?? null,
      resultsIsLive: result.json?.data?.isLive ?? null,
      status: result.status,
      rows: rows.slice(0, 40).map(anonymize),
      rowCount: rows.length,
      finishedCount: finished.length,
    });
    // Klaar als de race niet meer live is en er finishers zijn.
    if (data.isLive === false && finished.length > 0 && snapshots.length > 3) break;
    await sleep(EVERY_S * 1000);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pick = [0, Math.floor(snapshots.length / 2), snapshots.length - 1];
  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(OUT_DIR, `${day}-${eventId.slice(0, 8)}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        _note: "Meting met scripts/src-live-probe.mjs; geanonimiseerd.",
        eventId,
        firstFinisher,
        measurements: snapshots.map(({ at, eventIsLive, resultsIsLive, rowCount, finishedCount }) => ({
          at,
          eventIsLive,
          resultsIsLive,
          rowCount,
          finishedCount,
        })),
        snapshots: [...new Set(pick)].map((index) => snapshots[index]),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Geschreven: ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
