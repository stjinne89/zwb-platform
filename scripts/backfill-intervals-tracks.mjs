// Haalt in één keer de sporen op van intervals-ritten die er nooit een kregen.
//
// De cron doet dat sinds 2026-11-10 zelf (backfillOlderTracks in
// src/lib/intervals/ride-sync.ts), maar met 20 per lid per run. Dit script werkt
// de achterstand van toen (ruim 2.000 ritten) in één keer weg: spoor ophalen,
// eigen segment- en coltijden opslaan, en per lid ZWBlokken buiten en in Zwift
// opnieuw doorrekenen.
//
// intervals.icu noemt een grens van 10 verzoeken per seconde per IP; dit script
// blijft rond de 3 en wacht een minuut bij een 429. Een 404 telt als "geen
// spoor", net als in de cron. Idempotent: een rit met track_checked_at wordt
// overgeslagen.
//
// Draaien vanuit de hoofdmap (daar staat .env.local):
//   node .claude/worktrees/<worktree>/scripts/backfill-intervals-tracks.mjs            (droogloop)
//   node .claude/worktrees/<worktree>/scripts/backfill-intervals-tracks.mjs --apply [--limit 5]

import { createDecipheriv } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createJiti } from "jiti";

const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;
const BASE = "https://intervals.icu";
const PREFIX = "enc:v1:";
const PAUSE_MS = 350;
/** Zelfde grens als INTERVALS_RIDE_ID_CEILING in src/lib/intervals/ride-id.ts. */
const INTERVALS_RIDE_ID_CEILING = -1_000_000_000_000;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(root, "src") } });
const { encodeTrackPolyline } = await jiti.import(path.join(root, "src/lib/track-polyline.ts"));
const { latLngFromStreams, timedTrackFromStreams } = await jiti.import(path.join(root, "src/lib/intervals/rides.ts"));
const { storeGpsEfforts } = await jiti.import(path.join(root, "src/lib/segments/gps-sync.ts"));
const { syncBlocksForUser } = await jiti.import(path.join(root, "src/lib/zwblokken/sync.ts"));
const { syncZwiftBlocksForUser } = await jiti.import(path.join(root, "src/lib/zwblokken/zwift-sync.ts"));

function readEnv() {
  const file = fs.readFileSync(".env.local", "utf8");
  return Object.fromEntries(
    file
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

/** Spiegelt decryptSecret uit src/lib/crypto/secrets.ts; plaintext blijft heel. */
function decryptSecret(stored, keyBase64) {
  if (!stored || !stored.startsWith(PREFIX)) return stored;
  const key = Buffer.from(keyBase64 ?? "", "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY ontbreekt of is geen 32 bytes.");
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchStreams(apiKey, intervalsId) {
  const credentials = Buffer.from(`API_KEY:${apiKey}`).toString("base64");
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(
      `${BASE}/api/v1/activity/${encodeURIComponent(intervalsId)}/streams.json?types=latlng,time`,
      {
        headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (res.status === 404) return null;
    if (res.status === 429) {
      console.log("  429, een minuut wachten");
      await sleep(60_000);
      continue;
    }
    if (!res.ok) throw new Error(`intervals.icu ${res.status}: ${(await res.text()).slice(0, 160)}`);
    return res.json();
  }
  throw new Error("intervals.icu bleef 429 geven");
}

/** Per lid, met de profiel-index; over de hele tabel loopt de query tegen de timeout. */
async function pendingRides(db, profileId) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from("strava_activities")
      .select("id, profile_id, start_date, raw")
      .eq("profile_id", profileId)
      .lte("id", INTERVALS_RIDE_ID_CEILING)
      .eq("raw->>import_source", "intervals")
      .is("raw->>track_checked_at", null)
      .is("raw->map->>summary_polyline", null)
      .order("start_date", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 500) break;
  }
  return rows;
}

async function main() {
  const env = readEnv();
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: connections, error } = await db
    .from("intervals_connections")
    .select("profile_id, api_key")
    .not("api_key", "is", null);
  if (error) throw new Error(error.message);
  const keyOf = new Map((connections ?? []).map((row) => [row.profile_id, row.api_key]));
  const byProfile = new Map();
  let total = 0;
  for (const profileId of keyOf.keys()) {
    const list = await pendingRides(db, profileId);
    if (list.length === 0) continue;
    byProfile.set(profileId, list);
    total += list.length;
  }

  console.log(`${total} ritten zonder spoor bij ${byProfile.size} leden${APPLY ? "" : " (droogloop)"}`);
  for (const [profileId, list] of byProfile) {
    console.log(`  ${profileId.slice(0, 8)}: ${list.length}`);
  }
  if (!APPLY) return;

  let budget = LIMIT;
  const totals = { checked: 0, withTrack: 0, notFound: 0, efforts: 0, failed: 0 };
  for (const [profileId, list] of byProfile) {
    const stored = keyOf.get(profileId);
    if (!stored || budget <= 0) continue;
    const apiKey = decryptSecret(stored, env.TOKEN_ENCRYPTION_KEY);
    let withTrack = 0;
    console.log(`\n${profileId.slice(0, 8)}: ${list.length} ritten`);

    for (const ride of list) {
      if (budget <= 0) break;
      budget -= 1;
      const raw = ride.raw ?? {};
      if (!raw.intervals_id) continue;
      let body;
      try {
        body = await fetchStreams(apiKey, String(raw.intervals_id));
      } catch (err) {
        console.log(`  stop bij dit lid: ${err.message}`);
        totals.failed += 1;
        break;
      }
      await sleep(PAUSE_MS);
      totals.checked += 1;
      if (body === null) totals.notFound += 1;
      const encoded = body ? encodeTrackPolyline(latLngFromStreams(body)) : null;
      const timed = body ? timedTrackFromStreams(body, Date.parse(ride.start_date)) : [];
      const map = raw.map && typeof raw.map === "object" ? raw.map : {};
      const update = {
        raw: { ...raw, map: { ...map, summary_polyline: encoded }, track_checked_at: new Date().toISOString() },
        ...(encoded ? { blocks_processed_at: null, zwift_blocks_processed_at: null } : {}),
      };
      const { error: updateError } = await db.from("strava_activities").update(update).eq("id", ride.id);
      if (updateError) throw new Error(updateError.message);
      if (!encoded) continue;
      withTrack += 1;
      totals.withTrack += 1;
      if (timed.length >= 2) {
        try {
          await storeGpsEfforts(db, profileId, ride.id, timed);
          totals.efforts += 1;
        } catch (err) {
          console.log(`  eigen tijden voor ${ride.id} faalden: ${err.message}`);
        }
      }
    }

    if (withTrack > 0) {
      const outdoor = await syncBlocksForUser(db, profileId, { maxActivities: 5000 });
      const zwift = await syncZwiftBlocksForUser(db, profileId, { maxActivities: 5000 });
      console.log(
        `  ${withTrack} sporen; blokken buiten +${outdoor.newBlocks} (${outdoor.scanned} ritten), Zwift +${zwift.newBlocks} (${zwift.scanned} ritten)`,
      );
    } else {
      console.log("  geen nieuwe sporen");
    }
  }
  console.log("\nKlaar:", totals);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
