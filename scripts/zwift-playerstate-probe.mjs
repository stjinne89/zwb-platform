// Meting voor ZWB DS (docs/zwb-ds-spike.md): geeft Zwift de spelersstatus van
// een renner (`/relay/worlds/1/players/{id}`) aan een gewoon account, hoe vers
// is die, en hoe vaak mag je hem vragen?
//
// Alleen lezen. Zet in .env.local:
//   ZWIFT_USERNAME / ZWIFT_PASSWORD         het serviceaccount, of
//   ZWIFT_DS_USERNAME / ZWIFT_DS_PASSWORD   een apart account (heeft voorrang)
//
// Draai het terwijl de renners rijden, liefst in een race:
//
//   node scripts/zwift-playerstate-probe.mjs --ids 111,222 --minutes 10
//   node scripts/zwift-playerstate-probe.mjs --ids 111 --subgroup auto --minutes 10
//   node scripts/zwift-playerstate-probe.mjs --ids 111 --minutes 1 --burst 20
//
// --ids       eigen renners (Zwift-ID's); alleen van hen wordt de hartslag bewaard
// --subgroup  Zwift-subgroep: ook het hele veld uit de inschrijvingen meten;
//             "auto" neemt de subgroep uit de status van de eerste --ids-renner
// --minutes   duur van de meting (standaard 5)
// --interval  seconden tussen het begin van twee rondes (standaard 3; Sauce
//             vraagt dit endpoint niet vaker dan om de 3 s)
// --gap       ms tussen twee verzoeken in een ronde (standaard 500: de limiet op
//             /race-results/entries is twee per seconde per account)
// --burst     na de meting N verzoeken direct achter elkaar voor de eerste
//             renner, om de limiet te zien
//
// Het serviceaccount deelt zijn limiet met het platform. Een --burst of een kleine
// --gap met dat account kan tijdens een race de live ZRL-stand een 429 bezorgen;
// gebruik daarvoor ZWIFT_DS_*.
//
// Uitvoer: een samenvatting in de terminal en per verzoek een regel in .tmp/
// (staat in .gitignore). Geen namen. De leeftijd van een status is gemeten tegen
// de klok van deze pc.

import fs from "node:fs";
import { join } from "node:path";

const TOKEN_URL = "https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token";
const HOST = "https://us-or-rly101.zwift.com";
// Dezelfde app-identiteit als src/lib/events/zwift-club.ts.
const HEADERS = {
  Platform: "OSX",
  Source: "Game Client",
  "User-Agent": "CNL/3.30.8 (macOS 13 Ventura; Darwin Kernel 22.4.0) zwift/1.0.110983 curl/7.78.0",
};
/** Zwift-wereldtijd telt in ms vanaf dit moment (Unix-ms); zie segment-results-pb.ts. */
const WORLD_TIME_EPOCH_MS = 1_414_016_074_400;
const BACKOFF_MS = 30_000;

// ---------------------------------------------------------------------------
// Protobuf: PlayerState zonder dependency. Veldnummers uit `PlayerState` in
// Sauce' src/zwift.proto (main, gelezen 2026-10-17); omrekeningen uit
// `processPlayerStateMessage` in Sauce' src/zwift.mjs.

const FIELDS = {
  1: ["athleteId", "int"],
  2: ["worldTime", "uint"],
  3: ["distance", "int"],
  4: ["roadTime", "int"],
  5: ["laps", "int"],
  6: ["_speed", "int"],
  8: ["roadPosition", "int"],
  9: ["_cadence", "int"],
  10: ["draft", "int"],
  11: ["heartrate", "int"],
  12: ["power", "int"],
  13: ["_heading", "int"],
  15: ["climbing", "int"],
  16: ["time", "int"],
  19: ["_flags1", "uint"],
  20: ["_flags2", "uint"],
  21: ["_progress", "uint"],
  23: ["justWatching", "bool"],
  24: ["_mwHours", "int"],
  25: ["x", "float"],
  26: ["z", "float"],
  27: ["y", "float"],
  28: ["watchingAthleteId", "int"],
  29: ["eventSubgroupId", "int"],
  31: ["sport", "int"],
  33: ["timeGap", "int"],
  34: ["_eventDistance", "float"],
  35: ["courseId", "int"],
  39: ["routeId", "uint"],
};

function readVarint(buf, pos) {
  let result = 0n;
  let shift = 0n;
  for (;;) {
    if (pos >= buf.length) throw new Error("Protobuf: varint loopt over het einde.");
    const byte = buf[pos++];
    result |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return [result, pos];
    shift += 7n;
    if (shift > 70n) throw new Error("Protobuf: varint te lang.");
  }
}

export function parseMessage(buf) {
  const fields = new Map();
  let pos = 0;
  while (pos < buf.length) {
    const [key, afterKey] = readVarint(buf, pos);
    pos = afterKey;
    const no = Number(key >> 3n);
    const wire = Number(key & 7n);
    let field;
    if (wire === 0) {
      const [value, next] = readVarint(buf, pos);
      pos = next;
      field = { wire, varint: value };
    } else if (wire === 2) {
      const [len, next] = readVarint(buf, pos);
      const end = next + Number(len);
      if (end > buf.length) throw new Error("Protobuf: veld loopt over het einde.");
      field = { wire, bytes: buf.subarray(next, end) };
      pos = end;
    } else if (wire === 1 || wire === 5) {
      const size = wire === 1 ? 8 : 4;
      if (pos + size > buf.length) throw new Error("Protobuf: veld loopt over het einde.");
      field = { wire, bytes: buf.subarray(pos, pos + size) };
      pos += size;
    } else {
      throw new Error(`Protobuf: onbekend wiretype ${wire}.`);
    }
    if (!fields.has(no)) fields.set(no, []);
    fields.get(no).push(field);
  }
  return fields;
}

function fieldValue(field, type) {
  if (type === "float") {
    if (field.wire !== 5) return null;
    return new DataView(field.bytes.buffer, field.bytes.byteOffset, 4).getFloat32(0, true);
  }
  if (field.wire !== 0) return null;
  if (type === "int") return Number(BigInt.asIntN(32, field.varint));
  if (type === "bool") return field.varint !== 0n;
  return Number(field.varint);
}

/** Ruwe PlayerState: bekende velden op naam, plus de nummers die we niet kennen. */
export function decodePlayerState(buf) {
  const raw = {};
  const unknown = [];
  for (const [no, list] of parseMessage(buf)) {
    const known = FIELDS[no];
    if (!known) {
      unknown.push(no);
      continue;
    }
    const value = fieldValue(list[list.length - 1], known[1]);
    if (value !== null) raw[known[0]] = value;
  }
  return { raw, unknown: unknown.sort((a, b) => a - b) };
}

/** Omgerekend naar wat DS zou tonen. */
export function toReading(raw) {
  const ts = raw.worldTime ? raw.worldTime + WORLD_TIME_EPOCH_MS : null;
  return {
    athleteId: raw.athleteId ?? null,
    ts,
    power: raw.power ?? null,
    heartrate: raw.heartrate ?? null,
    cadence: raw._cadence ? Math.round(raw._cadence * 6e-5) : 0,
    speedKmh: raw._speed != null ? Math.round(raw._speed / 1e4) / 100 : null,
    draft: raw.draft ?? null,
    distanceM: raw.distance ?? null,
    eventDistanceM: raw._eventDistance != null ? Math.round(raw._eventDistance) / 100 : null,
    climbingM: raw.climbing ?? null,
    timeS: raw.time ?? null,
    laps: raw.laps ?? null,
    kj: raw._mwHours != null ? Math.round(raw._mwHours * 0.0036) : null,
    eventSubgroupId: raw.eventSubgroupId ?? null,
    routeId: raw.routeId ?? null,
    courseId: raw.courseId ?? null,
    timeGap: raw.timeGap ?? null,
    justWatching: raw.justWatching ?? false,
    watchingAthleteId: raw.watchingAthleteId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Zwift

function readEnv() {
  let file = "";
  try {
    file = fs.readFileSync(".env.local", "utf8");
  } catch {
    // Geen .env.local: dan alleen de omgeving.
  }
  const fromFile = Object.fromEntries(
    file
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
  return { ...fromFile, ...process.env };
}

function credentials(env) {
  if (env.ZWIFT_DS_USERNAME && env.ZWIFT_DS_PASSWORD) {
    return { username: env.ZWIFT_DS_USERNAME, password: env.ZWIFT_DS_PASSWORD, account: "ZWIFT_DS_*" };
  }
  if (env.ZWIFT_USERNAME && env.ZWIFT_PASSWORD) {
    return { username: env.ZWIFT_USERNAME, password: env.ZWIFT_PASSWORD, account: "ZWIFT_* (serviceaccount)" };
  }
  return null;
}

let token = null;

async function login({ username, password }) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { ...HEADERS, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: "Zwift_Mobile_Link", grant_type: "password", username, password }),
  });
  if (!response.ok) throw new Error(`Zwift-login mislukt (status ${response.status}).`);
  const json = await response.json();
  if (!json.access_token) throw new Error("Zwift-login leverde geen token op.");
  token = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
}

async function authHeader(creds) {
  if (!token || token.expiresAt < Date.now() + 60_000) await login(creds);
  return `Bearer ${token.value}`;
}

async function fetchState(creds, id) {
  const authorization = await authHeader(creds);
  const started = performance.now();
  const response = await fetch(`${HOST}/relay/worlds/1/players/${id}`, {
    headers: { ...HEADERS, accept: "application/x-protobuf-lite", authorization },
  });
  const ms = Math.round(performance.now() - started);
  if (!response.ok) {
    await response.arrayBuffer().catch(() => null);
    return { status: response.status, ms, retryAfter: response.headers.get("retry-after") };
  }
  const buf = new Uint8Array(await response.arrayBuffer());
  if (buf.length === 0) return { status: response.status, ms, bytes: 0 };
  return { status: response.status, ms, bytes: buf.length, ...decodePlayerState(buf) };
}

async function fetchEntrantIds(creds, subgroupId, gap) {
  const ids = new Set();
  const page = async (start) => {
    const url = `${HOST}/api/events/subgroups/entrants/${encodeURIComponent(subgroupId)}` +
      `?type=all&participation=signed_up&limit=100&start=${start}`;
    const response = await fetch(url, {
      headers: { ...HEADERS, accept: "application/json", "Zwift-Api-Version": "2.7", authorization: await authHeader(creds) },
    });
    if (!response.ok) throw new Error(`Inschrijvingen gaven status ${response.status}.`);
    const json = await response.json();
    const rows = Array.isArray(json) ? json : Array.isArray(json?.entrants) ? json.entrants : [];
    for (const row of rows) {
      const id = String(row.profileId ?? row.id ?? "").trim();
      if (/^\d+$/.test(id)) ids.add(id);
    }
    return rows.length;
  };
  // Zwift slaat bij doorbladeren renners over; overlappende pagina's per 20, zoals
  // fetchAllEntrantRows in zwift-club.ts.
  let start = 0;
  while ((await page(start)) === 100 && start < 1000) {
    start += 20;
    await sleep(gap);
  }
  return [...ids];
}

// ---------------------------------------------------------------------------
// Meting

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function arg(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

function quantile(values, q) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

function spread(values, unit) {
  if (values.length === 0) return "geen";
  return `mediaan ${quantile(values, 0.5)}${unit}, p95 ${quantile(values, 0.95)}${unit}, max ${Math.max(...values)}${unit}`;
}

function describeRaw(raw, unknown, own) {
  const shown = { ...raw };
  if (!own) delete shown.heartrate;
  const parts = Object.entries(shown).map(([key, value]) =>
    `${key}=${typeof value === "number" && !Number.isInteger(value) ? value.toFixed(2) : value}`);
  if (unknown.length) parts.push(`onbekende velden: ${unknown.join(",")}`);
  return parts.join("  ");
}

async function main() {
  const own = String(arg("ids", "")).split(",").map((id) => id.trim()).filter((id) => /^\d+$/.test(id));
  let subgroup = arg("subgroup", null);
  const minutes = Number(arg("minutes", "5"));
  const interval = Number(arg("interval", "3"));
  const gap = Number(arg("gap", "500"));
  const burst = Number(arg("burst", "0"));

  if (own.length === 0) {
    console.error("Geef minstens één Zwift-ID met --ids.");
    process.exit(1);
  }
  const creds = credentials(readEnv());
  if (!creds) {
    console.error("Zet ZWIFT_DS_USERNAME/ZWIFT_DS_PASSWORD of ZWIFT_USERNAME/ZWIFT_PASSWORD in .env.local.");
    process.exit(1);
  }

  await login(creds);
  console.log(`Ingelogd met ${creds.account}.`);

  if (subgroup === "auto") {
    const first = await fetchState(creds, own[0]);
    subgroup = first.raw?.eventSubgroupId ? String(first.raw.eventSubgroupId) : null;
    console.log(subgroup
      ? `Subgroep uit de status van ${own[0]}: ${subgroup}.`
      : `${own[0]} rijdt geen event (status ${first.status}); alleen de eigen renners worden gemeten.`);
    await sleep(gap);
  }

  const ownSet = new Set(own);
  let field = [];
  if (subgroup) {
    field = (await fetchEntrantIds(creds, subgroup, gap)).filter((id) => !ownSet.has(id));
  }
  const ids = [...own, ...field];
  if (subgroup) console.log(`Subgroep ${subgroup}: ${field.length} ingeschreven renners naast de eigen.`);

  const dir = join(import.meta.dirname, "..", ".tmp");
  fs.mkdirSync(dir, { recursive: true });
  const file = join(dir, `zwift-playerstate-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
  const out = fs.createWriteStream(file);

  const stats = {
    requests: 0,
    statuses: new Map(),
    latency: [],
    age: [],
    rounds: [],
    fieldsSeen: new Set(),
    unknownSeen: new Set(),
    described: new Set(),
    first429: null,
    perRider: new Map(ids.map((id) => [id, { ok: 0, fresh: 0, lastWorldTime: null, lastFreshAt: null, freshGaps: [], inEvent: 0, empty: 0 }])),
  };
  const startedAt = Date.now();
  const deadline = startedAt + minutes * 60_000;

  console.log(`Meten tot ${new Date(deadline).toLocaleTimeString("nl-NL")}: ${ids.length} renners, ronde elke ${interval} s, ${gap} ms tussen verzoeken.`);

  while (Date.now() < deadline) {
    const roundStart = Date.now();
    for (const id of ids) {
      if (Date.now() >= deadline) break;
      const result = await fetchState(creds, id);
      const at = Date.now();
      stats.requests++;
      stats.statuses.set(result.status, (stats.statuses.get(result.status) ?? 0) + 1);
      stats.latency.push(result.ms);
      const rider = stats.perRider.get(id);
      const isOwn = ownSet.has(id);
      const line = { at, id, own: isOwn, status: result.status, ms: result.ms };

      if (result.raw) {
        rider.ok++;
        for (const key of Object.keys(result.raw)) stats.fieldsSeen.add(key);
        for (const no of result.unknown) stats.unknownSeen.add(no);
        const reading = toReading(result.raw);
        const { heartrate, ...rest } = reading;
        Object.assign(line, rest, isOwn ? { heartrate } : { hasHeartrate: Boolean(heartrate) });
        if (reading.ts) {
          line.ageMs = at - reading.ts;
          stats.age.push(line.ageMs);
        }
        if (result.raw.worldTime !== rider.lastWorldTime) {
          line.fresh = true;
          rider.fresh++;
          if (rider.lastFreshAt) rider.freshGaps.push(at - rider.lastFreshAt);
          rider.lastFreshAt = at;
          rider.lastWorldTime = result.raw.worldTime;
        }
        if (subgroup && String(reading.eventSubgroupId) === String(subgroup)) rider.inEvent++;
        // Ruwe velden van elke eigen renner en van één renner uit het veld.
        if (isOwn ? !stats.described.has(id) : !stats.described.has("veld")) {
          stats.described.add(isOwn ? id : "veld");
          console.log(`\nEerste antwoord ${id} (${result.bytes} bytes): ${describeRaw(result.raw, result.unknown, isOwn)}`);
        }
      } else if (result.status === 200) {
        rider.empty++;
      }
      out.write(`${JSON.stringify(line)}\n`);

      if (result.status === 429) {
        stats.first429 ??= { afterRequests: stats.requests, afterSeconds: Math.round((at - startedAt) / 1000) };
        console.log(`\n429 na ${stats.requests} verzoeken (retry-after: ${result.retryAfter ?? "geen"}); ${BACKOFF_MS / 1000} s pauze.`);
        await sleep(BACKOFF_MS);
      } else {
        await sleep(gap);
      }
    }
    stats.rounds.push(Date.now() - roundStart);
    process.stdout.write(`\rRondes: ${stats.rounds.length}, verzoeken: ${stats.requests}`);
    const wait = interval * 1000 - (Date.now() - roundStart);
    if (wait > 0) await sleep(wait);
  }

  let burstResult = null;
  if (burst > 0) {
    const statuses = [];
    const started = Date.now();
    for (let i = 0; i < burst; i++) statuses.push((await fetchState(creds, own[0])).status);
    const seconds = (Date.now() - started) / 1000;
    burstResult = { statuses, seconds, perSecond: Math.round((burst / seconds) * 10) / 10 };
    out.write(`${JSON.stringify({ burst: burstResult })}\n`);
  }
  out.end();

  const riders = [...stats.perRider.entries()];
  const withData = riders.filter(([, r]) => r.ok > 0);
  console.log("\n\n=== Samenvatting ===");
  console.log(`Verzoeken: ${stats.requests} in ${Math.round((Date.now() - startedAt) / 1000)} s; statussen: ${[...stats.statuses].map(([s, n]) => `${s}×${n}`).join(", ")}`);
  console.log(`Antwoordtijd: ${spread(stats.latency, " ms")}`);
  console.log(`Leeftijd van de status: ${spread(stats.age.map((ms) => Math.round(ms / 100) / 10), " s")}`);
  console.log(`Duur van een ronde: ${spread(stats.rounds.map((ms) => Math.round(ms / 100) / 10), " s")}`);
  console.log(`Renners met data: ${withData.length} van ${riders.length}; lege antwoorden: ${riders.reduce((n, [, r]) => n + r.empty, 0)}`);
  if (subgroup) console.log(`Renners met deze subgroep in hun status: ${riders.filter(([, r]) => r.inEvent > 0).length}`);
  console.log(`Velden gezien: ${[...stats.fieldsSeen].sort().join(", ") || "geen"}`);
  if (stats.unknownSeen.size) console.log(`Onbekende veldnummers: ${[...stats.unknownSeen].sort((a, b) => a - b).join(", ")}`);
  console.log(stats.first429 ? `Eerste 429: na ${stats.first429.afterRequests} verzoeken, ${stats.first429.afterSeconds} s.` : "Geen 429 tijdens de meting.");
  console.log("\nEigen renners: nieuwe status / antwoorden, tijd tussen twee nieuwe statussen");
  for (const id of own) {
    const r = stats.perRider.get(id);
    console.log(`  ${id}: ${r.fresh}/${r.ok}, ${spread(r.freshGaps.map((ms) => Math.round(ms / 100) / 10), " s")}`);
  }
  if (burstResult) {
    const counts = burstResult.statuses.reduce((m, s) => m.set(s, (m.get(s) ?? 0) + 1), new Map());
    console.log(`\nBurst: ${burst} verzoeken in ${burstResult.seconds.toFixed(1)} s (${burstResult.perSecond}/s): ${[...counts].map(([s, n]) => `${s}×${n}`).join(", ")}; eerste 429 bij verzoek ${burstResult.statuses.indexOf(429) + 1 || "geen"}.`);
  }
  console.log(`\nPer verzoek: ${file}`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`\n${error instanceof Error ? error.message : error}`);
    process.exit(1);
  });
}
