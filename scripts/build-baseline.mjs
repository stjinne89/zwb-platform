// Bouwt de baseline voor een nieuwe installatie (fase 5, docs/multi-club-ontwerp.md §7):
//
//   supabase/baseline/0320_baseline.sql   het schema na migratie 0320
//   supabase/baseline/0320_seed.sql       de generieke startinhoud
//
// Werkwijze: alle migraties tot en met BASELINE_VERSION op een lege PGlite met de
// Supabase-stub (scripts/baseline/stub.mjs), dan pg_dump van het schema public.
// Wat pg_dump met --schema=public niet meeneemt, schrijft dit script er zelf bij:
// de rechten, de storage-buckets en -policies, de triggers op auth.users en de
// realtimepublicatie. Daarna gaat de ZWB-data eruit en is de rest de seed.
//
//   node scripts/build-baseline.mjs
//
// Alleen opnieuw draaien als de baseline zelf naar een later nummer moet; nieuwe
// migraties gelden gewoon voor beide sporen (docs/installatie.md).

import fs from "node:fs";
import path from "node:path";
import { pgDump } from "@electric-sql/pglite-tools/pg_dump";
import {
  BASELINE_DIR,
  BASELINE_VERSION,
  applySqlFiles,
  createSupabasePglite,
  migrationFiles,
  migrationNumber,
} from "./baseline/stub.mjs";

const version = String(BASELINE_VERSION).padStart(4, "0");
const files = migrationFiles().filter((file) => migrationNumber(file) <= BASELINE_VERSION);
if (migrationNumber(files.at(-1)) !== BASELINE_VERSION) {
  throw new Error(`Migratie ${version} ontbreekt; de baseline hoort precies tot daar te lopen.`);
}

const db = await createSupabasePglite();
await applySqlFiles(db, files);
console.log(`${files.length} migraties afgespeeld tot en met ${files.at(-1)}`);

const rows = async (sql) => (await db.query(sql)).rows;
const ident = (name) => `"${String(name).replaceAll('"', '""')}"`;
const literal = (value) => (value === null ? "null" : `'${String(value).replaceAll("'", "''")}'`);

async function dump(args) {
  const file = await pgDump({ pg: db, args });
  return (await file.text())
    .split("\n")
    // De versieregels van pg_dump veranderen per release; ze zeggen niets over het schema.
    .filter((line) => !/^-- Dumped (from|by) /.test(line))
    // Supabase heeft het schema public al; CREATE SCHEMA zou falen.
    .filter((line) => !/^CREATE SCHEMA public;$/.test(line) && !/^COMMENT ON SCHEMA public IS /.test(line))
    .join("\n");
}

// ------------------------------------------------------- ZWB-data eruit
// Wat van ZWB is, gaat eruit (keuze eigenaar 2026-11-09): het ledenroster met
// namen en Zwift-ID's, de teams en hun bronnen, de sponsors, de releasenotes en
// het auditlog. De clubrij wordt neutraal en de modules krijgen geen eigen naam.
await db.exec(`
  delete from public.roster_entries;
  delete from public.team_result_sources;
  delete from public.teams;
  delete from public.sponsors;
  delete from public.app_updates;
  delete from public.audit_log;
  update public.club_settings set
    name = 'Club', short_name = 'Club', member_noun = null, member_noun_plural = null,
    contact_email = null, website_url = null, instagram_handle = null, youtube_handle = null,
    setup_completed_at = null, updated_at = now(), updated_by = null,
    color_primary = null, color_secondary = null, color_neutral = null, color_accent = null, color_ink = null,
    font = null, logo_url = null, mark_url = null,
    app_name = null, advice_name = null, currency_noun = null, currency_noun_plural = null, cup_noun = null, better_word = null,
    event_markers = null, team_tag = null;
  update public.club_modules set label = null;
  update public.achievement_badges set description = replace(description, 'in een ZWB-week', 'in een week')
    where description like '%in een ZWB-week%';
`);

const leftover = await rows(`
  select table_name from information_schema.tables t
  where table_schema = 'public' and table_type = 'BASE TABLE'
    and exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = t.table_name)
  order by 1`);
const zwbRows = [];
for (const { table_name } of leftover) {
  const [{ n }] = await rows(`select count(*)::int as n from public.${ident(table_name)} x where x::text ~ 'ZWB|zwbcycling'`);
  if (n > 0) zwbRows.push(`${table_name}=${n}`);
}
// Sleutels als zwbgame.manage en tabelnamen met zwb zijn intern; tekst met "ZWB"
// of een link naar zwbcycling.nl hoort niet in de seed.
if (zwbRows.length) throw new Error(`Nog ZWB in de seed: ${zwbRows.join(", ")}`);

// ---------------------------------------------------------------- schema
const schema = await dump(["--schema-only", "--schema=public", "--no-owner", "--no-privileges", "--no-publications", "--no-subscriptions"]);

// Rechten. Supabase geeft anon, authenticated en service_role automatisch alles
// op een nieuw object in public; de migraties nemen dat hier en daar terug. Daarom
// eerst alles intrekken en dan precies de rechten van na 0320 teruggeven.
const grants = [];
const roles = "public, anon, authenticated, service_role";
for (const r of await rows(`
  select c.relname, c.relkind,
    coalesce(array_agg(a.grantee::regrole::text || ':' || a.privilege_type order by 1) filter (where a.grantee <> 0 and a.grantee::regrole::text in ('anon', 'authenticated', 'service_role')), '{}') as acl
  from pg_class c left join lateral aclexplode(c.relacl) a on true
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'm', 'S', 'p')
  group by 1, 2 order by 1`)) {
  const kind = r.relkind === "S" ? "sequence" : "table";
  grants.push(`revoke all on ${kind} public.${ident(r.relname)} from ${roles};`);
  const byRole = new Map();
  for (const entry of r.acl) {
    const [role, privilege] = entry.split(":");
    byRole.set(role, [...(byRole.get(role) ?? []), privilege.toLowerCase()]);
  }
  for (const [role, privileges] of byRole) grants.push(`grant ${privileges.join(", ")} on ${kind} public.${ident(r.relname)} to ${role};`);
}
for (const r of await rows(`
  select p.oid::regprocedure::text as signature,
    coalesce(array_agg(case when a.grantee = 0 then 'public' else a.grantee::regrole::text end order by 1)
      filter (where a.privilege_type = 'EXECUTE' and (a.grantee = 0 or a.grantee::regrole::text in ('anon', 'authenticated', 'service_role'))), '{}') as roles
  from pg_proc p left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a on true
  where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')
  group by 1 order by 1`)) {
  grants.push(`revoke all on function ${r.signature} from ${roles};`);
  if (r.roles.length) grants.push(`grant execute on function ${r.signature} to ${r.roles.join(", ")};`);
}

// Storage: buckets en de policies op storage.objects en storage.buckets.
const storage = [];
for (const b of await rows(`select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by id`)) {
  const mime = b.allowed_mime_types ? `array[${b.allowed_mime_types.map(literal).join(", ")}]` : "null";
  storage.push(
    `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (${literal(b.id)}, ${literal(b.name)}, ${b.public}, ${b.file_size_limit ?? "null"}, ${mime}) on conflict (id) do nothing;`,
  );
}
for (const p of await rows(`
  select pol.polname, c.relname, pol.polpermissive, pol.polcmd,
    coalesce((select array_agg(case when r = 0 then 'public' else r::regrole::text end) from unnest(pol.polroles) r), '{}') as roles,
    pg_get_expr(pol.polqual, pol.polrelid) as qual, pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check
  from pg_policy pol join pg_class c on c.oid = pol.polrelid
  where c.relnamespace = 'storage'::regnamespace
  order by 2, 1`)) {
  const cmd = { r: "select", a: "insert", w: "update", d: "delete", "*": "all" }[p.polcmd];
  storage.push(
    [
      `drop policy if exists ${ident(p.polname)} on storage.${ident(p.relname)};`,
      `create policy ${ident(p.polname)} on storage.${ident(p.relname)}`,
      `  as ${p.polpermissive ? "permissive" : "restrictive"} for ${cmd} to ${p.roles.join(", ")}`,
      p.qual ? `  using (${p.qual})` : null,
      p.with_check ? `  with check (${p.with_check})` : null,
    ]
      .filter(Boolean)
      .join("\n") + ";",
  );
}

// Triggers op tabellen buiten public (auth.users: een profiel bij een nieuwe aanmelding).
const triggers = [];
for (const t of await rows(`
  select tgname, tgrelid::regclass::text as tbl, pg_get_triggerdef(oid) as def
  from pg_trigger
  where not tgisinternal and tgrelid::regclass::text not like 'public.%' and tgrelid::regclass::text !~ '^[a-z_]+$'
  order by 2, 1`)) {
  triggers.push(`drop trigger if exists ${ident(t.tgname)} on ${t.tbl};`, `${t.def};`);
}

// Realtime: welke tabellen in de publicatie staan.
const publication = (await rows(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' order by 1`)).map(
  (t) => `alter publication supabase_realtime add table public.${ident(t.tablename)};`,
);

const baseline = [
  `-- Baseline voor een nieuwe installatie: het schema na migratie ${version}.`,
  "-- Gemaakt door scripts/build-baseline.mjs; niet met de hand aanpassen.",
  "--",
  "-- Alleen voor een leeg Supabase-project. Daarna de seed (" + `${version}_seed.sql` + ") en dan",
  `-- elke migratie na ${version} op volgorde (docs/installatie.md). ZWB zelf gebruikt`,
  "-- dit bestand niet: daar staan de migraties al.",
  "",
  'create extension if not exists "uuid-ossp" with schema extensions;',
  "",
  schema.trim(),
  "",
  "-- pg_dump zette het zoekpad leeg; wat hieronder komt, noemt functies zonder schema.",
  "select pg_catalog.set_config('search_path', 'public, extensions', false);",
  "",
  "-- Rechten -------------------------------------------------------------------",
  "",
  ...grants,
  "",
  "-- Storage -------------------------------------------------------------------",
  "",
  ...storage,
  "",
  "-- Triggers buiten public ----------------------------------------------------",
  "",
  ...triggers,
  "",
  "-- Realtime ------------------------------------------------------------------",
  "",
  ...publication,
  "",
  "notify pgrst, 'reload schema';",
  "",
].join("\n");

// ------------------------------------------------------------------ seed
const seed = await dump(["--data-only", "--schema=public", "--inserts", "--rows-per-insert=200", "--no-owner"]);
const seedFile = [
  `-- Generieke startinhoud voor een nieuwe installatie, na ${version}_baseline.sql.`,
  "-- Gemaakt door scripts/build-baseline.mjs; niet met de hand aanpassen.",
  "--",
  "-- Rollen en rechten, cols, workouts, mobiliteit, voeding en recepten,",
  "-- onderhoudstips, kennis- en racetips, segmenten, ladderroutes en badges. Zonder",
  "-- ledenroster, teams, sponsors en releasenotes; de clubrij is neutraal.",
  "",
  seed.trim(),
  "",
  "-- Het invullen van de rechten schreef regels in het auditlog; die horen niet bij de start.",
  "delete from public.audit_log;",
  "",
].join("\n");

fs.mkdirSync(BASELINE_DIR, { recursive: true });
fs.writeFileSync(path.join(BASELINE_DIR, `${version}_baseline.sql`), baseline);
fs.writeFileSync(path.join(BASELINE_DIR, `${version}_seed.sql`), seedFile);
console.log(`baseline: ${(baseline.length / 1024).toFixed(0)} kB, seed: ${(seedFile.length / 1024).toFixed(0)} kB`);
