// Ruimt weesevents op in intervals.icu: workouts die ZWB heeft vervangen maar
// die tóch nog een intervals_event_id dragen.
//
// Zo'n rij hoort niet te bestaan. Vervangen betekent dat het event bij
// intervals.icu is gewist en de kolom leeg is; staat er nog een id, dan is het
// event daar blijven staan zonder dat een actieve workout hem nog kent. De
// schemakalender ziet hem dan als vreemd event en tekent hem als tweede blok
// naast de training die hem heeft vervangen — het lid ziet dubbele trainingen.
//
// Op 24 augustus 2026 gold dat voor 85 workouts van drie leden. Oorzaak was een
// race tussen twee publicaties die tegelijk liepen: de nieuwste vervangde de
// workouts van de oudste terwijl die nog stond te pushen, waarna die push zijn
// event-id terugschreef op een al vervangen rij. publish.ts sluit dat gat sinds
// dezelfde ronde; dit script haalt weg wat er toen is achtergebleven.
//
// Idempotent: het raakt alleen rijen aan die aan beide voorwaarden voldoen, en
// een event dat al weg is geeft 404 — voor ons hetzelfde als geslaagd.
//
//   node scripts/cleanup-orphan-intervals-events.mjs           (droogloop)
//   node scripts/cleanup-orphan-intervals-events.mjs --apply   (echt wissen)

import { createDecipheriv } from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const PREFIX = "enc:v1:";
const BASE = "https://intervals.icu";

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

async function deleteEvent(apiKey, athleteId, eventId) {
  const credentials = Buffer.from(`API_KEY:${apiKey}`).toString("base64");
  const res = await fetch(`${BASE}/api/v1/athlete/${athleteId}/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`intervals.icu ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
  return res.status === 404 ? "was al weg" : "gewist";
}

async function main() {
  const env = readEnv();
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: orphans, error } = await db
    .from("training_workouts")
    .select("id, profile_id, scheduled_at, title, intervals_event_id, superseded_at")
    .not("superseded_at", "is", null)
    .not("intervals_event_id", "is", null)
    .order("scheduled_at", { ascending: true });
  if (error) throw new Error(error.message);
  if ((orphans ?? []).length === 0) {
    console.log("Geen weesevents gevonden.");
    return;
  }

  const [{ data: profiles }, { data: connections }] = await Promise.all([
    db.from("profiles").select("id, display_name"),
    db.from("intervals_connections").select("profile_id, api_key, athlete_id"),
  ]);
  const nameOf = new Map((profiles ?? []).map((row) => [row.id, row.display_name]));
  const connOf = new Map((connections ?? []).map((row) => [row.profile_id, row]));

  console.log(`${orphans.length} weesevents${APPLY ? "" : " (droogloop — niets wordt gewist)"}\n`);

  let done = 0;
  let failed = 0;
  let unlinked = 0;

  for (const row of orphans) {
    const who = nameOf.get(row.profile_id) ?? row.profile_id;
    const day = String(row.scheduled_at).slice(0, 10);
    const conn = connOf.get(row.profile_id);
    if (!conn) {
      console.log(`  ${who} ${day} event ${row.intervals_event_id} — geen koppeling, overgeslagen`);
      unlinked++;
      continue;
    }
    if (!APPLY) {
      console.log(`  ${who} ${day} event ${row.intervals_event_id} — ${row.title}`);
      continue;
    }
    try {
      const what = await deleteEvent(
        decryptSecret(conn.api_key, env.TOKEN_ENCRYPTION_KEY),
        conn.athlete_id,
        row.intervals_event_id,
      );
      // Pas de kolom leegmaken als het event echt weg is, zodat een mislukking
      // vindbaar blijft voor een volgende run.
      const { error: updateError } = await db
        .from("training_workouts")
        .update({ intervals_event_id: null })
        .eq("id", row.id);
      if (updateError) throw new Error(updateError.message);
      console.log(`  ${who} ${day} event ${row.intervals_event_id} — ${what}`);
      done++;
    } catch (err) {
      console.log(`  ${who} ${day} event ${row.intervals_event_id} — MISLUKT: ${err.message}`);
      failed++;
    }
  }

  console.log(
    APPLY
      ? `\nKlaar: ${done} opgeruimd, ${failed} mislukt, ${unlinked} zonder koppeling.`
      : `\nDroogloop: ${orphans.length - unlinked} zouden worden gewist. Draai met --apply.`,
  );
}

await main();
