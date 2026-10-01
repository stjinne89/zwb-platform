#!/usr/bin/env node
// Wekelijkse gezondheidscheck van de productiedatabase. Leest alleen.
//
//   node scripts/db-health.mjs
//
// Vraagt een ingelogde Supabase CLI die aan het project gekoppeld is
// (supabase/.temp/project-ref). Bewaart per run een momentopname in
// .tmp/db-health/ en vergelijkt met de vorige, zodat "deze week" echt deze week
// is: pg_stat_statements telt op sinds de laatste reset (mei 2026).
//
// Waarom dit bestaat: in september 2026 groeide de database ongemerkt van ~0,3
// naar 1,3 GB (Free-plan: 0,5 GB) en at één achtergrondquery 40% van alle
// databasetijd. Zie docs/prestatie-onderzoek-2026-09-30.md. Dit script moet zoiets
// binnen een week zichtbaar maken.

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, ".tmp", "db-health");
const FREE_DB_LIMIT = 0.5 * 1024 ** 3;
const MB = 1024 ** 2;
// Supabase zet de database op alleen-lezen bij 95% van de disk (gebeurd op
// 2026-10-01). Het dashboard telt database + WAL + "system" (171-190 MB gemeten);
// via SQL zien we alleen de eerste twee.
const DISK_BYTES = Number(process.env.DISK_GB ?? 2) * 1024 ** 3;
const SYSTEM_BYTES = 190 * MB;
// Onder een minuut databasetijd zeggen verhoudingen niets (bijv. twee runs kort na elkaar).
const MIN_LOAD_MS = 60_000;

// ── Supabase CLI ──────────────────────────────────────────────────────
// Eén commandostring: de CLI is op Windows een .cmd-shim en vraagt dus een shell.
// De argumenten zijn vaste strings uit dit script.
function cli(args) {
  const res = spawnSync(`supabase ${args.join(" ")}`, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    maxBuffer: 64 * MB,
  });
  return { ok: res.status === 0, stdout: (res.stdout ?? "").trim(), stderr: res.stderr ?? "" };
}

// De CLI kent drie uitvoervormen: een tabel in een terminal, een kale lijst met
// -o json, en {rows: [...]} als hij merkt dat een agent hem aanroept. Met -o json
// en --agent no is het de kale lijst; de andere JSON-vorm lezen we ook.
function jsonList({ ok, stdout }) {
  const start = stdout.search(/[[{]/);
  if (!ok || start === -1) return null;
  try {
    const parsed = JSON.parse(stdout.slice(start, Math.max(stdout.lastIndexOf("]"), stdout.lastIndexOf("}")) + 1));
    if (Array.isArray(parsed)) return parsed;
    return Array.isArray(parsed.rows) ? parsed.rows : null;
  } catch {
    return null;
  }
}

function sql(query) {
  const file = join(tmpdir(), `zwb-db-health-${process.pid}.sql`);
  writeFileSync(file, query);
  const res = cli(["db", "query", "--linked", "-o", "json", "--agent", "no", "-f", `"${file}"`]);
  const rows = jsonList(res);
  if (rows) return rows;
  throw new Error(`Query mislukt:\n${query.slice(0, 200)}\n---\n${`${res.stdout}\n${res.stderr}`.slice(0, 800)}`);
}

function advisors() {
  return jsonList(cli(["db", "advisors", "--linked", "--type", "performance", "-o", "json", "--agent", "no"]));
}

// ── Momentopname ─────────────────────────────────────────────────────
function snapshot() {
  const [db] = sql(`select pg_database_size(current_database())::bigint as bytes,
    (select sum(size) from pg_ls_waldir())::bigint as wal_bytes,
    current_setting('default_transaction_read_only') as read_only`);
  const tables = sql(`
    select c.relname as name, pg_total_relation_size(c.oid)::bigint as bytes,
      greatest(c.reltuples, 0)::bigint as rows, coalesce(s.seq_scan, 0)::bigint as seq_scan,
      coalesce(s.seq_tup_read, 0)::bigint as seq_tup_read
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    left join pg_stat_user_tables s on s.relid = c.oid
    where c.relkind = 'r'`);
  const statements = sql(`
    select s.userid::text || ':' || s.queryid::text as key, r.rolname as role, s.calls::bigint as calls,
      round(s.total_exec_time)::bigint as total_ms, round(s.max_exec_time)::bigint as max_ms,
      left(regexp_replace(s.query, '\\s+', ' ', 'g'), 300) as query
    from pg_stat_statements s join pg_roles r on r.oid = s.userid
    where r.rolname in ('service_role', 'authenticated', 'anon', 'authenticator')`);
  const [queues] = sql(`
    select
      (select count(*) from zwb_segment_maps where kom_dirty) as kom_dirty,
      (select count(distinct k.segment_id) from zwb_segment_koms k join zwb_segment_maps m on m.id = k.segment_id
        where not m.private and m.geometry_status = 'pending') as kom_segments_without_line,
      (select count(*) from strava_activities where sport_type = 'Ride' and not trainer and efforts_fetched_at is null)
        as rides_without_efforts,
      -- Steekproef van 1%: zolang raw niet is ingekort, leest een volledige telling
      -- honderden MB aan TOAST. Dus een schatting, afgerond op honderdtallen.
      (select count(*) * 100 from strava_activity_segment_efforts tablesample system (1) where raw ? 'id')
        as unslimmed_efforts,
      (select count(*) from live_positions) as live_positions`);
  const [migrations] = sql(`
    select
      to_regclass('public.strava_activities_start_date') is not null as m0208,
      exists(select 1 from pg_trigger where tgname = 'slim_segment_effort_raw') as m0209`);
  const advisorList = advisors();
  const advisorCounts = {};
  for (const item of advisorList ?? []) advisorCounts[item.name] = (advisorCounts[item.name] ?? 0) + 1;

  return {
    takenAt: new Date().toISOString(),
    dbBytes: Number(db.bytes),
    walBytes: Number(db.wal_bytes),
    readOnly: db.read_only === "on",
    tables: Object.fromEntries(tables.map((t) => [t.name, {
      bytes: Number(t.bytes), rows: Number(t.rows), seqScan: Number(t.seq_scan), seqTupRead: Number(t.seq_tup_read),
    }])),
    statements: Object.fromEntries(statements.map((s) => [s.key, {
      role: s.role, calls: Number(s.calls), totalMs: Number(s.total_ms), maxMs: Number(s.max_ms), query: s.query,
    }])),
    queues: Object.fromEntries(Object.entries(queues).map(([k, v]) => [k, Number(v)])),
    migrations,
    advisors: advisorList ? advisorCounts : null,
  };
}

function previousSnapshot() {
  try {
    const files = readdirSync(OUT_DIR).filter((f) => /^snapshot-.*\.json$/.test(f)).sort();
    const last = files.at(-1);
    return last ? JSON.parse(readFileSync(join(OUT_DIR, last), "utf8")) : null;
  } catch {
    return null;
  }
}

// ── 1000-rijengrens: selects zonder filter of limiet ──────────────────
// Supabase geeft standaard hooguit 1000 rijen, zonder foutmelding. Een select op
// een hele tabel is prima zolang die klein is; dit zoekt ze op en legt ze naast
// het huidige aantal rijen.
function unboundedSelects() {
  const found = new Map();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name)) scan(path);
    }
  };
  const scan = (file) => {
    const src = readFileSync(file, "utf8");
    const re = /\.from\(\s*["'`]([a-z_0-9]+)["'`]\s*\)/g;
    let m;
    while ((m = re.exec(src))) {
      if (/storage\s*$/.test(src.slice(Math.max(0, m.index - 12), m.index))) continue;
      let i = m.index + m[0].length;
      let depth = 0;
      for (; i < src.length; i++) {
        const c = src[i];
        if ("([{".includes(c)) depth++;
        else if (")]}".includes(c)) { if (depth === 0) break; depth--; }
        else if ((c === "," || c === ";") && depth === 0) break;
      }
      const chain = src.slice(m.index, i);
      if (!/\.select\(/.test(chain) || /\.(insert|update|upsert|delete)\(/.test(chain)) continue;
      if (/head:\s*true/.test(chain)) continue;
      if (/\.(eq|in|limit|single|maybeSingle|range|gte|lte|gt|lt|match|is|neq|or|contains|overlaps|ilike|like|filter|not|textSearch)\(/.test(chain)) continue;
      const line = src.slice(0, m.index).split("\n").length;
      const list = found.get(m[1]) ?? [];
      list.push(`${relative(ROOT, file).replaceAll("\\", "/")}:${line}`);
      found.set(m[1], list);
    }
  };
  walk(join(ROOT, "src"));
  return found;
}

// PostgREST verpakt elke query in dezelfde WITH pgrst_source-kop; haal de functie
// of tabel eruit, anders zijn de zware queries in het rapport niet te herkennen.
function label(query) {
  const rpc = /LATERAL (?:\(SELECT )?"public"\."(\w+)"\(/.exec(query);
  if (rpc) return `rpc ${rpc[1]}`;
  const verb = /(SELECT|INSERT INTO|DELETE FROM|UPDATE) "public"\."(\w+)"/.exec(query);
  if (verb) return `${verb[1].split(" ")[0].toLowerCase()} ${verb[2]}`;
  return query.slice(0, 90);
}

// ── Rapport ──────────────────────────────────────────────────────────
const fmtMB = (bytes) => `${(bytes / MB).toFixed(0)} MB`;
const fmtS = (ms) => `${(ms / 1000).toFixed(0)} s`;

function report(now, prev) {
  const lines = [];
  const findings = [];
  const flag = (level, text) => findings.push({ level, text });
  const days = prev ? (Date.parse(now.takenAt) - Date.parse(prev.takenAt)) / 86400000 : null;
  const period = prev ? `sinds ${prev.takenAt.slice(0, 10)} (${days.toFixed(1)} dagen)` : "sinds de laatste statistiekenreset (geen vorige momentopname)";

  // 1. Grootte en disk
  const diskUsed = (now.dbBytes + (now.walBytes ?? 0) + SYSTEM_BYTES) / DISK_BYTES;
  if (now.readOnly) flag("ACTIE", "De database staat op alleen-lezen: de app kan niets wegschrijven.");
  if (diskUsed >= 0.88) flag("ACTIE", `Disk ~${Math.round(diskUsed * 100)}% vol (database ${fmtMB(now.dbBytes)}, WAL ${fmtMB(now.walBytes ?? 0)}); bij 95% gaat de database op slot.`);
  else if (diskUsed >= 0.8) flag("LET OP", `Disk ~${Math.round(diskUsed * 100)}% vol (database ${fmtMB(now.dbBytes)}, WAL ${fmtMB(now.walBytes ?? 0)}).`);
  const growth = prev ? now.dbBytes - prev.dbBytes : null;
  if (now.dbBytes > FREE_DB_LIMIT) flag("ACTIE", `Database ${fmtMB(now.dbBytes)}, boven de Free-limiet van 512 MB.`);
  else if (now.dbBytes > 0.8 * FREE_DB_LIMIT) flag("LET OP", `Database ${fmtMB(now.dbBytes)}, boven 80% van de Free-limiet.`);
  if (growth != null && growth > 25 * MB) flag("LET OP", `Database groeide ${fmtMB(growth)} ${period}.`);

  // 2. Migraties en eenmalige stappen uit het prestatieonderzoek
  if (!now.migrations.m0208) flag("ACTIE", "Migratie 0208_query_indexes.sql is nog niet toegepast.");
  if (!now.migrations.m0209) flag("ACTIE", "Migratie 0209_slim_segment_efforts.sql is nog niet toegepast.");
  if (now.queues.unslimmed_efforts > 0) {
    flag(now.migrations.m0209 ? "ACTIE" : "LET OP",
      `${now.queues.unslimmed_efforts} segmentpogingen (schatting) hebben nog de volledige Strava-raw (inkortstap uit docs/prestatie-onderzoek-2026-09-30.md).`);
  }
  if (now.advisors && (now.advisors.auth_rls_initplan ?? 0) > 0) {
    flag("LET OP", `${now.advisors.auth_rls_initplan} RLS-policies met een kale auth.uid() (0210_rls_initplan.sql, of een nieuwe policy zonder (select auth.uid())).`);
  }
  if (now.advisors && prev?.advisors) {
    for (const [name, count] of Object.entries(now.advisors)) {
      if (count > (prev.advisors[name] ?? 0)) flag("LET OP", `Advisor ${name}: ${prev.advisors[name] ?? 0} → ${count}.`);
    }
  }

  // 3. Databasetijd per rol en zwaarste queries
  const delta = [];
  const roleMs = {};
  for (const [key, s] of Object.entries(now.statements)) {
    const p = prev?.statements?.[key];
    const calls = p && p.calls <= s.calls ? s.calls - p.calls : s.calls;
    const totalMs = p && p.totalMs <= s.totalMs ? s.totalMs - p.totalMs : s.totalMs;
    if (calls <= 0) continue;
    roleMs[s.role] = (roleMs[s.role] ?? 0) + totalMs;
    delta.push({ ...s, calls, totalMs, meanMs: totalMs / calls });
  }
  delta.sort((a, b) => b.totalMs - a.totalMs);
  const service = roleMs.service_role ?? 0;
  const members = (roleMs.authenticated ?? 0) + (roleMs.anon ?? 0);
  if (service > MIN_LOAD_MS && members > 0 && service / members > 5) {
    flag("LET OP", `Achtergrondjobs gebruikten ${(service / members).toFixed(1)}× zoveel databasetijd als leden (${fmtS(service)} tegen ${fmtS(members)}).`);
  }
  const allMs = delta.reduce((sum, d) => sum + d.totalMs, 0);
  for (const d of delta.slice(0, 5)) {
    if (allMs > MIN_LOAD_MS && d.totalMs / allMs > 0.25) {
      flag("ACTIE", `Eén query nam ${Math.round((100 * d.totalMs) / allMs)}% van de databasetijd (${d.role}, gem. ${Math.round(d.meanMs)} ms): ${label(d.query)}`);
    }
  }
  for (const d of delta.filter((x) => x.calls >= 20 && x.meanMs >= 1000).slice(0, 5)) {
    flag(d.meanMs >= 3000 ? "ACTIE" : "LET OP", `Trage query (${d.role}, ${d.calls}×, gem. ${Math.round(d.meanMs)} ms): ${label(d.query)}`);
  }

  // 4. Volledige scans op grote tabellen
  const scans = Object.entries(now.tables)
    .map(([name, t]) => {
      const p = prev?.tables?.[name];
      return { name, rows: t.rows, read: p && p.seqTupRead <= t.seqTupRead ? t.seqTupRead - p.seqTupRead : t.seqTupRead };
    })
    .filter((t) => t.rows > 20000)
    .sort((a, b) => b.read - a.read);
  for (const t of scans.slice(0, 3)) {
    if (t.read > 100 * t.rows) flag("LET OP", `${t.name} (${t.rows} rijen) werd ${Math.round(t.read / t.rows)}× volledig gelezen; mist er een index?`);
  }

  // 5. 1000-rijengrens
  const unbounded = unboundedSelects();
  const risky = [];
  for (const [table, places] of unbounded) {
    const rows = now.tables[table]?.rows ?? 0;
    if (rows > 800) risky.push({ table, rows, places });
  }
  for (const r of risky) {
    flag(r.rows >= 1000 ? "ACTIE" : "LET OP",
      `${r.table} heeft ~${r.rows} rijen en wordt zonder filter opgehaald (${r.places.join(", ")}); boven 1000 kapt Supabase stilletjes af.`);
  }

  // 6. Werkvoorraad
  if (prev && now.queues.kom_dirty > 1000 && now.queues.kom_dirty >= prev.queues.kom_dirty) {
    flag("LET OP", `KOM-herberekening loopt niet leeg: ${prev.queues.kom_dirty} → ${now.queues.kom_dirty} segmenten.`);
  }

  // ── Opmaak
  const order = { ACTIE: 0, "LET OP": 1 };
  findings.sort((a, b) => order[a.level] - order[b.level]);
  const actions = findings.filter((f) => f.level === "ACTIE").length;
  const warnings = findings.length - actions;
  lines.push(`# Databasecheck ${now.takenAt.slice(0, 10)}`, "");
  lines.push(`**${actions} actie, ${warnings} let op.** Periode: ${period}.`, "");
  lines.push("## Bevindingen", "");
  if (findings.length === 0) lines.push("- OK: niets bijzonders.");
  for (const f of findings) lines.push(`- **${f.level}:** ${f.text}`);
  lines.push("", "## Cijfers", "");
  lines.push(`- Database: ${fmtMB(now.dbBytes)}${growth != null ? ` (${growth >= 0 ? "+" : ""}${fmtMB(growth)})` : ""}, Free-limiet 512 MB`);
  lines.push(`- Disk: ~${Math.round(diskUsed * 100)}% van ${(DISK_BYTES / 1024 ** 3).toFixed(0)} GB (WAL ${fmtMB(now.walBytes ?? 0)}); op slot bij 95%`);
  lines.push(`- Databasetijd: achtergrond ${fmtS(service)}, leden ${fmtS(members)}`);
  lines.push(`- Werkvoorraad: ${Object.entries(now.queues).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  lines.push(`- Advisors (performance): ${now.advisors ? Object.entries(now.advisors).map(([k, v]) => `${k} ${v}`).join(", ") || "geen" : "niet opgehaald"}`);
  lines.push("", "### Grootste tabellen", "", "| Tabel | Grootte | Groei | Rijen |", "|---|---|---|---|");
  for (const [name, t] of Object.entries(now.tables).sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 8)) {
    const p = prev?.tables?.[name];
    lines.push(`| ${name} | ${fmtMB(t.bytes)} | ${p ? fmtMB(t.bytes - p.bytes) : "-"} | ${t.rows} |`);
  }
  lines.push("", "### Zwaarste queries", "", "| Rol | Totaal | Aanroepen | Gem. | Query |", "|---|---|---|---|---|");
  for (const d of delta.slice(0, 8)) {
    lines.push(`| ${d.role} | ${fmtS(d.totalMs)} | ${d.calls} | ${Math.round(d.meanMs)} ms | ${label(d.query).replaceAll("|", "\\|")} |`);
  }
  lines.push("", "Niet via de CLI te zien, dus zelf nakijken: egress en quota op de Supabase-usagepagina, en de job-historie op cron-job.org.");
  return { text: lines.join("\n"), actions, warnings };
}

// ── Main ─────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
const prev = previousSnapshot();
const now = snapshot();
const stamp = now.takenAt.replace(/[:.]/g, "-");
writeFileSync(join(OUT_DIR, `snapshot-${stamp}.json`), JSON.stringify(now));
const { text, actions, warnings } = report(now, prev);
const reportPath = join(OUT_DIR, `rapport-${now.takenAt.slice(0, 10)}.md`);
writeFileSync(reportPath, text);
console.log(text);
console.log(`\nRapport: ${relative(ROOT, reportPath)} (${actions} actie, ${warnings} let op)`);
