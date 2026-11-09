// Houdt de database van een installatie bij (fase 7, docs/installatie.md §2).
//
//   node --env-file=.env.<club> scripts/migrate-installation.mjs [--init] [--dry-run]
//
// Het env-bestand zet DATABASE_URL: de verbinding van het Supabase-project
// (Session pooler, met het databasewachtwoord). Het bestand blijft buiten git
// (.gitignore: .env*). Per installatie één bestand en één keer draaien.
//
// - Een lege database krijgt met --init de baseline en de seed
//   (supabase/baseline/), daarna alle migraties na de baseline.
// - Een database die al zo is opgezet, krijgt alleen de migraties die er nog
//   niet staan. Welke dat zijn, staat in installation.applied_migrations.
// - ZWB gebruikt dit script niet: daar gaan migraties via de Supabase-connector
//   en zijn de versies tijdstempels. Een database met clubtabellen maar zonder
//   de tabel van dit script wordt daarom geweigerd.
//
// Elk bestand loopt in een eigen transactie: faalt het, dan staat er niets van.

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { BASELINE_DIR, BASELINE_VERSION, MIGRATIONS_DIR, migrationFiles } from "./baseline/stub.mjs";

const args = new Set(process.argv.slice(2));
const init = args.has("--init");
const dryRun = args.has("--dry-run");
for (const arg of args) {
  if (arg !== "--init" && arg !== "--dry-run") throw new Error(`Onbekende optie: ${arg}`);
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL ontbreekt. Draai met --env-file=.env.<club>.");

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = postgres(url, { ssl: local ? false : "require", max: 1, onnotice: () => {}, connect_timeout: 30 });
const version = String(BASELINE_VERSION).padStart(4, "0");
const baselineFiles = [`${version}_baseline.sql`, `${version}_seed.sql`];

async function exists(regclass) {
  const [row] = await sql`select to_regclass(${regclass}) is not null as present`;
  return row.present;
}

/** Een bestand in één transactie, en meteen vastleggen dat het er staat. */
async function apply(dir, file, number) {
  // Op Windows checkt git de bestanden uit met CRLF; in git en op productie is het LF.
  const text = fs.readFileSync(path.join(dir, file), "utf8").replace(/\r\n/g, "\n");
  const started = Date.now();
  await sql.begin(async (tx) => {
    await tx.unsafe(text);
    // pg_dump zet het zoekpad leeg; de volgende migratie noemt tabellen zonder schema.
    await tx.unsafe(`set search_path to "$user", public, extensions`);
    await tx`insert into installation.applied_migrations (file, number) values (${file}, ${number})`;
  });
  console.log(`  ${file} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
}

try {
  const tracked = await exists("installation.applied_migrations");
  const hasClub = await exists("public.club_settings");

  if (!tracked && hasClub) {
    throw new Error(
      "Deze database heeft al clubtabellen maar geen installation.applied_migrations. " +
        "Dat is ZWB of een installatie die met de hand is opgezet; dit script raakt hem niet aan.",
    );
  }
  const done = tracked
    ? new Set((await sql`select file from installation.applied_migrations`).map((row) => row.file))
    : new Set();
  // Ook na een --init die halverwege faalde: dan staat de tabel er, maar de baseline niet.
  const pendingBaseline = baselineFiles.filter((file) => !done.has(file));
  if (pendingBaseline.length && !init) {
    throw new Error("De baseline staat er nog niet. Draai met --init om de baseline en de seed te zetten.");
  }
  if (!pendingBaseline.length && init) throw new Error("De baseline staat er al; --init kan alleen op een lege database.");
  const pending = migrationFiles({ after: BASELINE_VERSION }).filter((file) => !done.has(file));

  console.log(`Te doen: ${[...pendingBaseline, ...pending].join(", ") || "niets"}`);
  if (!dryRun && (pendingBaseline.length || pending.length)) {
    if (!tracked) {
      await sql.unsafe(`
        create schema if not exists installation;
        revoke all on schema installation from public;
        create table if not exists installation.applied_migrations (
          file text primary key,
          number integer not null,
          applied_at timestamptz not null default now()
        );
        revoke all on installation.applied_migrations from public;
      `);
    }
    for (const file of pendingBaseline) await apply(BASELINE_DIR, file, BASELINE_VERSION);
    for (const file of pending) await apply(MIGRATIONS_DIR, file, Number(file.slice(0, 4)));
    await sql`notify pgrst, 'reload schema'`;
    console.log("Klaar.");
  }
} finally {
  await sql.end({ timeout: 5 });
}
