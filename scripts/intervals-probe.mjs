// Bekijkt hoe intervals.icu je laatste ritten teruggeeft, vóór we ze als ritbron
// gebruiken (zie docs/zonder-strava-onderzoek.md, spike sectie 8).
//
// Alleen lezen. Gebruikt je eigen API-sleutel (intervals.icu → Settings →
// Developer Settings), niet de database.
//
//   INTERVALS_API_KEY=... node scripts/intervals-probe.mjs
//   INTERVALS_API_KEY=... node scripts/intervals-probe.mjs --fixture
//
// Met --fixture schrijft het de laatste ritten, zonder namen, beschrijvingen of
// posities, naar tests/fixtures/intervals/probe-activities.json. Die kan de
// verwachte fixture in de unit-tests vervangen.

import fs from "node:fs";

const BASE = "https://intervals.icu";
const API_KEY = process.env.INTERVALS_API_KEY?.trim();
const ATHLETE_ID = process.env.ATHLETE_ID?.trim() || "0";
const DAYS = Number(process.env.DAYS ?? 60);
const WRITE_FIXTURE = process.argv.includes("--fixture");

const FIELDS = [
  "id",
  "source",
  "type",
  "trainer",
  "device_name",
  "start_date",
  "start_date_local",
  "timezone",
  "distance",
  "moving_time",
  "elapsed_time",
  "total_elevation_gain",
  "average_watts",
  "icu_average_watts",
  "weighted_average_watts",
  "icu_weighted_avg_watts",
  "device_watts",
  "max_watts",
  "icu_pm_max_watts",
  "average_heartrate",
  "max_heartrate",
  "average_cadence",
  "icu_joules",
  "kilojoules",
  "external_id",
  "gear",
];

// Wat nooit in een fixture mag: herleidbaar tot een persoon of een plek.
const REDACT = /name|description|latlng|lat$|lng$|polyline|athlete|email|notes|file|strava_id/i;

async function get(path) {
  const credentials = Buffer.from(`API_KEY:${API_KEY}`).toString("base64");
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${res.status} op ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function describeStreams(body) {
  if (Array.isArray(body)) {
    return body.map((stream) => {
      const data = Array.isArray(stream?.data) ? stream.data : [];
      const first = data.find((value) => value != null);
      const shape = Array.isArray(first)
        ? `paren [${first.length}]`
        : typeof first;
      return `${stream?.type}: ${data.length} waarden, ${shape}` +
        (Array.isArray(stream?.data2) ? `, data2 ${stream.data2.length}` : "");
    });
  }
  if (body && typeof body === "object") {
    return Object.entries(body).map(([key, value]) =>
      `${key}: ${Array.isArray(value) ? `${value.length} waarden` : typeof value}`,
    );
  }
  return [String(body)];
}

function redact(activity) {
  return Object.fromEntries(
    Object.entries(activity).filter(([key]) => !REDACT.test(key)),
  );
}

async function main() {
  if (!API_KEY) {
    console.error("Zet INTERVALS_API_KEY (intervals.icu → Settings → Developer Settings).");
    process.exit(1);
  }
  const newest = new Date().toISOString().slice(0, 10);
  const oldest = new Date(Date.now() - DAYS * 86400_000).toISOString().slice(0, 10);
  const activities = await get(
    `/api/v1/athlete/${ATHLETE_ID}/activities?oldest=${oldest}&newest=${newest}`,
  );
  const rides = activities.slice(0, 10);
  console.log(`${activities.length} activiteiten in ${DAYS} dagen, de laatste ${rides.length}:\n`);

  for (const activity of rides) {
    console.log("—".repeat(60));
    for (const field of FIELDS) {
      if (activity[field] !== undefined) console.log(`  ${field}: ${JSON.stringify(activity[field])}`);
    }
    const unknown = Object.keys(activity).filter((key) => !FIELDS.includes(key));
    console.log(`  (+${unknown.length} andere velden)`);
    if (activity.source === "STRAVA" || activity._note) {
      console.log("  STRAVA-stub: geen data via de API");
      continue;
    }
    try {
      const streams = await get(
        `/api/v1/activity/${encodeURIComponent(activity.id)}/streams.json?types=latlng,time`,
      );
      for (const line of describeStreams(streams)) console.log(`  stream ${line}`);
    } catch (err) {
      console.log(`  streams: ${err.message}`);
    }
  }

  if (WRITE_FIXTURE) {
    const out = "tests/fixtures/intervals/probe-activities.json";
    fs.mkdirSync("tests/fixtures/intervals", { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(rides.map(redact), null, 2)}\n`);
    console.log(`\nFixture geschreven: ${out}. Kijk hem na vóór je hem commit.`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
