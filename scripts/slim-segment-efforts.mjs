#!/usr/bin/env node
// Eenmalig: de bestaande segmentpogingen inkorten tot de raw-velden die de
// database leest. Draai dit pas NA migratie 0209_slim_segment_efforts.sql; de
// trigger uit die migratie doet het eigenlijke inkorten (set raw = raw).
//
//   node scripts/slim-segment-efforts.mjs          # batches + gewone VACUUM
//   node scripts/slim-segment-efforts.mjs --full   # daarna: ruimte teruggeven
//
// Waarom in batches met een VACUUM ertussen: elke bijgewerkte rij is tijdelijk
// dubbel, en de disk stond op 2026-09-30 al op 83% (1,6 van 2 GB). Een gewone
// VACUUM maakt de oude versies en hun TOAST herbruikbaar voor de volgende batch.
// Pas VACUUM FULL (--full) geeft de ruimte terug aan de schijf en laat de
// databasegrootte dalen; die zet de tabel even op slot (lezen en schrijven wachten).
// Zie docs/prestatie-onderzoek-2026-09-30.md.

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BATCH = 20_000;
const full = process.argv.includes("--full");

function sql(query) {
  const file = join(tmpdir(), `zwb-slim-${process.pid}.sql`);
  writeFileSync(file, query);
  // De CLI kent drie uitvoervormen: een tabel in een terminal, een kale lijst met
  // -o json, en {rows: [...]} als hij merkt dat een agent hem aanroept. Met
  // -o json en --agent no is het de kale lijst; de andere JSON-vorm lezen we ook.
  const res = spawnSync(`supabase db query --linked -o json --agent no -f "${file}"`, {
    encoding: "utf8",
    shell: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  const out = (res.stdout ?? "").trim();
  try {
    if (res.status !== 0) throw new Error(`exit ${res.status}`);
    const start = out.search(/[[{]/);
    if (start === -1) return [];
    const parsed = JSON.parse(out.slice(start, Math.max(out.lastIndexOf("]"), out.lastIndexOf("}")) + 1));
    return Array.isArray(parsed) ? parsed : (parsed.rows ?? []);
  } catch {
    throw new Error(`Mislukt:\n${query}\n---\n${`${out}\n${res.stderr ?? ""}`.slice(0, 800)}`);
  }
}

const size = () =>
  sql(`select pg_size_pretty(pg_database_size(current_database())) as db,
    pg_size_pretty(pg_total_relation_size('public.strava_activity_segment_efforts')) as efforts`)[0];

const [trigger] = sql("select exists(select 1 from pg_trigger where tgname = 'slim_segment_effort_raw') as ok");
if (!trigger?.ok) {
  console.error("Migratie 0209_slim_segment_efforts.sql is nog niet toegepast; eerst die.");
  process.exit(1);
}

console.log("Voor:", size());

if (!full) {
  for (let round = 1; ; round++) {
    const [row] = sql(`
      with batch as (
        select effort_uid from public.strava_activity_segment_efforts where raw ? 'id' limit ${BATCH}
      ), done as (
        update public.strava_activity_segment_efforts e set raw = e.raw
        from batch b where e.effort_uid = b.effort_uid
        returning 1
      )
      select count(*)::int as n from done`);
    const n = Number(row?.n ?? 0);
    console.log(`Batch ${round}: ${n} rijen ingekort`);
    try {
      sql("vacuum public.strava_activity_segment_efforts");
    } catch (err) {
      console.error("VACUUM via de CLI lukte niet; draai 'vacuum public.strava_activity_segment_efforts;' in de SQL-editor en start dit script opnieuw.");
      console.error(String(err).slice(0, 400));
      process.exit(1);
    }
    if (n < BATCH) break;
  }
  console.log("Na inkorten:", size());
  console.log("Klaar. De databasegrootte daalt pas na: node scripts/slim-segment-efforts.mjs --full");
} else {
  const [left] = sql("select count(*)::int as n from public.strava_activity_segment_efforts where raw ? 'id'");
  if (Number(left?.n) > 0) {
    console.error(`Nog ${left.n} rijen niet ingekort; draai eerst het script zonder --full.`);
    process.exit(1);
  }
  console.log("VACUUM FULL: de tabel staat even op slot (meestal minder dan een minuut).");
  sql("vacuum full public.strava_activity_segment_efforts");
  console.log("Na VACUUM FULL:", size());
}
