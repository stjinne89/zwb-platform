#!/usr/bin/env node
// Eenmalig: de bestaande segmentpogingen inkorten tot de raw-velden die de
// database leest. Draai dit pas NA migratie 0209_slim_segment_efforts.sql; de
// trigger uit die migratie doet het eigenlijke inkorten (set raw = raw).
//
//   node scripts/slim-segment-efforts.mjs            # inkorten, traag en bewaakt
//   node scripts/slim-segment-efforts.mjs --status   # alleen de stand tonen
//   node scripts/slim-segment-efforts.mjs --full     # VACUUM FULL, als het past
//
// LES VAN 2026-10-01. De eerste versie deed batches van 20.000 rijen direct achter
// elkaar. Na 220.000 rijen stond de database op slot (alleen-lezen): niet de
// tabel was gegroeid, maar de WAL, van 128 naar 432 MB, en daarmee kwam de disk
// (2 GB) op 95%. Twee dingen waren verkeerd ingeschat:
//   * de WAL mag hier tot max_wal_size (1 GB) groeien en krimpt alleen bij een
//     checkpoint, die Postgres om de 5 minuten doet en die wij niet kunnen afdwingen
//     (de rol heeft geen pg_checkpoint);
//   * raw staat in de tabel zelf, niet in TOAST. Een gewone VACUUM maakt de ruimte
//     herbruikbaar maar geeft niets terug aan de schijf.
// Daarom nu: kleine batches met een pauze ertussen, zodat er per checkpoint weinig
// WAL bijkomt, en vóór elke batch een controle op het diskgebruik. Het script
// wacht als het krap wordt en stopt ruim voor de grens.
// Zie docs/prestatie-onderzoek-2026-09-30.md.

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";

const MB = 1024 ** 2;
const BATCH = 5_000;
const PAUSE_MS = 45_000; // ~7 MB WAL per batch; zo blijft het onder ~50 MB per checkpoint
const VACUUM_EVERY = 4;
// Supabase zet de database op slot bij 95% van de disk. Het dashboard telt database
// + WAL + "system" (171-190 MB gemeten); wij zien alleen de eerste twee.
const DISK_BYTES = Number(process.env.DISK_GB ?? 2) * 1024 ** 3;
const SYSTEM_BYTES = 190 * MB;
const WAIT_ABOVE = 0.85;
const STOP_ABOVE = 0.9;
const MAX_WAIT_MS = 30 * 60_000;

const mode = process.argv.includes("--full") ? "full" : process.argv.includes("--status") ? "status" : "slim";

function sql(query) {
  const file = join(tmpdir(), `zwb-slim-${process.pid}.sql`);
  writeFileSync(file, query);
  // De CLI kent drie uitvoervormen: een tabel in een terminal, een kale lijst met
  // -o json, en {rows: [...]} als hij merkt dat een agent hem aanroept. Met
  // -o json en --agent no is het de kale lijst; de andere JSON-vorm lezen we ook.
  const res = spawnSync(`supabase db query --linked -o json --agent no -f "${file}"`, {
    encoding: "utf8",
    shell: true,
    maxBuffer: 16 * MB,
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

function disk() {
  const [row] = sql(`select pg_database_size(current_database())::bigint as db,
    (select sum(size) from pg_ls_waldir())::bigint as wal,
    current_setting('default_transaction_read_only') as read_only`);
  const db = Number(row.db);
  const wal = Number(row.wal);
  return { db, wal, used: (db + wal + SYSTEM_BYTES) / DISK_BYTES, readOnly: row.read_only === "on" };
}

const show = (d) => `database ${(d.db / MB).toFixed(0)} MB, WAL ${(d.wal / MB).toFixed(0)} MB, disk ~${(d.used * 100).toFixed(1)}%`;

/** Wacht tot er ruimte is; false = stoppen. */
async function roomToWrite() {
  const started = Date.now();
  for (;;) {
    const d = disk();
    if (d.readOnly) {
      console.error(`De database staat op alleen-lezen (${show(d)}). Gestopt.`);
      return false;
    }
    if (d.used >= STOP_ABOVE) {
      console.error(`Disk te vol om door te gaan (${show(d)}). Gestopt; probeer later opnieuw.`);
      return false;
    }
    if (d.used < WAIT_ABOVE) return true;
    if (Date.now() - started > MAX_WAIT_MS) {
      console.error(`Na een half uur wachten nog steeds krap (${show(d)}). Gestopt; probeer later opnieuw.`);
      return false;
    }
    console.log(`  wachten op een checkpoint: ${show(d)}`);
    await sleep(60_000);
  }
}

const [trigger] = sql("select exists(select 1 from pg_trigger where tgname = 'slim_segment_effort_raw') as ok");
if (!trigger?.ok) {
  console.error("Migratie 0209_slim_segment_efforts.sql is nog niet toegepast; eerst die.");
  process.exit(1);
}

// Schatting uit een steekproef van 2%: een volledige telling leest de hele tabel.
const remaining = () =>
  Number(sql("select count(*) * 50 as n from public.strava_activity_segment_efforts tablesample system (2) where raw ? 'id'")[0].n);

console.log(`Stand: ${show(disk())}; nog ~${remaining()} rijen met de volledige raw.`);

if (mode === "status") process.exit(0);

if (mode === "slim") {
  for (let round = 1; ; round++) {
    if (!(await roomToWrite())) process.exit(1);
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
    if (round % VACUUM_EVERY === 0 || n < BATCH) sql("vacuum public.strava_activity_segment_efforts");
    console.log(`Batch ${round}: ${n} rijen ingekort; ${show(disk())}`);
    if (n < BATCH) break;
    await sleep(PAUSE_MS);
  }
  console.log("Klaar met inkorten. De vrijgekomen ruimte wordt hergebruikt door nieuwe pogingen;");
  console.log("de databasegrootte zelf daalt pas na een VACUUM FULL (--full), als daar ruimte voor is.");
}

if (mode === "full") {
  // VACUUM FULL schrijft een volledige kopie van tabel en indexen, en nog eens
  // dezelfde hoeveelheid WAL, voordat de oude bestanden verdwijnen.
  const [est] = sql(`
    select (select reltuples from pg_class where oid = 'public.strava_activity_segment_efforts'::regclass)::bigint as rows,
      (select avg(pg_column_size(e.*)) from public.strava_activity_segment_efforts e tablesample system (2))::int as row_bytes,
      pg_indexes_size('public.strava_activity_segment_efforts')::bigint as idx`);
  const copy = Number(est.rows) * (Number(est.row_bytes) + 30) + Number(est.idx);
  const d = disk();
  const peak = d.used + (2 * copy) / DISK_BYTES;
  console.log(`Kopie ~${(copy / MB).toFixed(0)} MB plus evenveel WAL; piek ~${(peak * 100).toFixed(0)}% van de disk.`);
  if (peak >= STOP_ABOVE && !process.argv.includes("--force")) {
    console.error("Dat past niet veilig op deze disk (de database gaat bij 95% op slot). Niet uitgevoerd.");
    console.error("Zie docs/prestatie-onderzoek-2026-09-30.md, 'Ruimte teruggeven'.");
    process.exit(1);
  }
  console.log("VACUUM FULL: de tabel staat even op slot.");
  sql("vacuum full public.strava_activity_segment_efforts");
  console.log(`Na VACUUM FULL: ${show(disk())}`);
}
