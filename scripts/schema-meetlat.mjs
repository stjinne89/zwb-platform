#!/usr/bin/env node
// De meetlat over de opgeslagen AI-schema's: haalt elke voltooide generatie uit
// training_ai_generations door checkTrainingPlan() en telt per regel hoe vaak
// de AI hem brak. Leest alleen.
//
//   node scripts/schema-meetlat.mjs            haalt op en rapporteert (markdown)
//   node scripts/schema-meetlat.mjs --cache    rapporteert op de vorige ophaling
//
// Vraagt een ingelogde Supabase CLI die aan het project gekoppeld is, net als
// scripts/db-health.mjs. De ruwe rijen bevatten namen en gezondheidsdata; ze
// blijven in .tmp/schema-meetlat/ (staat in .gitignore). Het rapport bevat
// alleen tellingen.
//
// De invoer van de planner staat in prompt_summary (JSON.stringify van
// TrainingAiInput); prompt_text is de prompt zelf. Daaruit lezen we alleen of
// een regel al in de prompt stond toen de generatie liep: een regel die er toen
// nog niet in stond, kon de AI ook niet breken.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(root, "src") } });
const { checkTrainingPlan, SCHEMA_RULES } = await jiti.import(path.join(root, "src/lib/training/schema-check.ts"));

const OUT_DIR = path.join(root, ".tmp", "schema-meetlat");
const CACHE = path.join(OUT_DIR, "generaties.json");
const PAGE = 40;

/**
 * Een zin waaraan je ziet dat de regel in de prompt stond. De groeiregel zei tot
 * 2026-10-16 "ongeveer 10%"; de meetlat toetst daar de ruimere grens van een
 * kwart, dus telt de oude zin mee.
 */
const MARKERS = {
  beschikbaarheid: "Respecteer beschikbaarheid",
  "vaste-afspraak": "Zijn er fixedWorkouts meegegeven",
  weekplafond: "max uren/week",
  piekweek: "minstens 85% van dat plafond",
  opbouwgroei: "per opbouwweek",
  herstelweek: "60-70% van de week ervoor",
  "onder-recente-belasting": "Plan een opbouwweek nooit onder recentLoad.hoursPerWeek",
  blokintensiteit: "De intensity van een blok is de zone",
  workoutintensiteit: "De intensity van de hele workout is die van het kernwerk",
  "drempelblok-lang": "Drempelblokken van 15 minuten of langer",
  "boven-ftp-lang": "Boven 100% FTP alleen in blokken van hooguit 8 minuten",
  "korte-herstelrit": "Plan geen losse hersteltraining korter dan",
  "rustdag-als-workout": "neem die dag niet op in je antwoord",
  "taper-zonder-piek": "Een taper hoort alleen bij een doel met één piekmoment",
  "sleutelsessies-aaneen": "verdeel sleutelsessies met voldoende herstel ertussen",
  "sleutelsessie-voor-race": "geen zware sleutelsessie vlak vóór een race",
};

const KIND_LABELS = { new: "nieuw schema", plan_update: "bijwerking", day: "dag-aanpassing (lid)", daily: "dagelijkse aanpassing" };

// ── Ophalen ──────────────────────────────────────────────────────────
function sql(query) {
  const file = path.join(tmpdir(), `zwb-schema-meetlat-${process.pid}.sql`);
  writeFileSync(file, query);
  const res = spawnSync(`supabase db query --linked -o json --agent no -f "${file}"`, {
    cwd: root,
    encoding: "utf8",
    shell: true,
    maxBuffer: 256 * 1024 ** 2,
  });
  const stdout = res.stdout ?? "";
  const start = stdout.search(/[[{]/);
  if (res.status !== 0 || start === -1) {
    throw new Error(`Query mislukt:\n${`${stdout}\n${res.stderr ?? ""}`.slice(0, 800)}`);
  }
  const parsed = JSON.parse(stdout.slice(start, Math.max(stdout.lastIndexOf("]"), stdout.lastIndexOf("}")) + 1));
  return Array.isArray(parsed) ? parsed : parsed.rows;
}

const quote = (text) => `'${text.replaceAll("'", "''")}'`;

function fetchGenerations() {
  const markerColumns = Object.entries(MARKERS)
    .map(([rule, marker]) => `position(${quote(marker)} in prompt_text) > 0 as "rule:${rule}"`)
    .join(",\n  ");
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = sql(`select id, created_at, coalesce(adaptation_kind, 'new') as kind, model, profile_id,
  prompt_summary, response_json,
  ${markerColumns}
from training_ai_generations
where status = 'completed' and response_json is not null and jsonb_typeof(response_json -> 'workouts') = 'array'
order by created_at, id
limit ${PAGE} offset ${offset}`);
    rows.push(...page);
    process.stderr.write(`\r${rows.length} generaties opgehaald`);
    if (page.length < PAGE) break;
  }
  process.stderr.write("\n");
  return rows;
}

// ── Toetsen ──────────────────────────────────────────────────────────
function parse(value) {
  return typeof value === "string" ? JSON.parse(value) : value;
}

/**
 * Tot migratie 0131 ging de beschikbaarheid als één week mee:
 * { source, weekStart, minutesByDay }. De AI paste die op elke week toe, dus de
 * meetlat leest hem als standaard.
 */
function normalizeInput(input) {
  const availability = input.availability;
  if (availability && availability.minutesByDay && !("weeks" in availability)) {
    return { ...input, availability: { default: availability.minutesByDay, weeks: [] } };
  }
  return input;
}

/** Stond de regel in de prompt van deze generatie? Zonder zin: altijd. */
function isInForce(row, rule) {
  if (!(rule in MARKERS)) return true;
  const value = row[`rule:${rule}`];
  return value === true || value === "t";
}

function evaluate(rows) {
  const rules = Object.keys(SCHEMA_RULES);
  const perRule = Object.fromEntries(
    rules.map((rule) => [rule, { findings: 0, generations: 0, inForce: 0, inForceGenerations: 0, inForceFindings: 0, byKind: {}, examples: [] }]),
  );
  const perKind = {};
  let workoutsTotal = 0;
  let errors = 0;

  for (const row of rows) {
    const kind = row.kind;
    perKind[kind] ??= { generations: 0, workouts: 0, clean: 0, cleanInForce: 0, members: new Set() };
    let findings;
    let response;
    try {
      const input = normalizeInput(parse(row.prompt_summary));
      response = parse(row.response_json);
      findings = checkTrainingPlan(input, response.workouts, { from: response.startDate, to: response.endDate });
    } catch (error) {
      errors += 1;
      process.stderr.write(`Generatie ${String(row.id).slice(0, 8)} niet te toetsen: ${error.message}\n`);
      continue;
    }
    perKind[kind].generations += 1;
    perKind[kind].workouts += response.workouts.length;
    perKind[kind].members.add(row.profile_id);
    if (findings.length === 0) perKind[kind].clean += 1;
    if (!findings.some((finding) => isInForce(row, finding.regel))) perKind[kind].cleanInForce += 1;
    workoutsTotal += response.workouts.length;

    for (const rule of rules) {
      const own = findings.filter((finding) => finding.regel === rule);
      const stat = perRule[rule];
      const inForce = isInForce(row, rule);
      stat.byKind[kind] ??= 0;
      stat.byKind[kind] += own.length;
      stat.findings += own.length;
      if (own.length > 0) stat.generations += 1;
      if (inForce) {
        stat.inForce += 1;
        stat.inForceFindings += own.length;
        if (own.length > 0) stat.inForceGenerations += 1;
      }
      if (own.length > 0 && stat.examples.length < 3 && inForce) {
        stat.examples.push(`${KIND_LABELS[kind] ?? kind}, ${own[0].datum}: ${own[0].toelichting}`);
      }
    }
  }
  return { perRule, perKind, workoutsTotal, errors, total: rows.length };
}

// ── Rapport ──────────────────────────────────────────────────────────
function percent(part, whole) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–";
}

function report({ perRule, perKind, workoutsTotal, errors, total }, rows) {
  const dates = rows.map((row) => String(row.created_at).slice(0, 10)).sort();
  const kinds = Object.keys(KIND_LABELS).filter((kind) => perKind[kind]);
  const lines = [];
  lines.push(`Gemeten op ${new Date().toISOString().slice(0, 10)}: ${total} voltooide generaties met workouts, van ${dates[0]} tot ${dates[dates.length - 1]}, samen ${workoutsTotal} workouts.${errors ? ` ${errors} niet te toetsen.` : ""}`);
  lines.push("");
  lines.push("| Soort | Generaties | Workouts | Leden | Zonder bevinding | Zonder bevinding op regels in de prompt |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const kind of kinds) {
    const stat = perKind[kind];
    lines.push(`| ${KIND_LABELS[kind]} | ${stat.generations} | ${stat.workouts} | ${stat.members.size} | ${stat.clean} (${percent(stat.clean, stat.generations)}) | ${stat.cleanInForce} (${percent(stat.cleanInForce, stat.generations)}) |`);
  }
  lines.push("");
  lines.push("Per regel. *In prompt* = generaties waarvan de prompt de regel al bevatte; daarover gaan de twee kolommen erna. *Alle* telt ook de generaties van vóór de regel.");
  lines.push("");
  lines.push(`| Regel | Ernst | In prompt | Gebroken in (in prompt) | Bevindingen (in prompt) | Bevindingen (alle) | ${kinds.map((kind) => KIND_LABELS[kind]).join(" | ")} |`);
  lines.push(`|---|---|---:|---:|---:|---:|${kinds.map(() => "---:").join("|")}|`);
  for (const [rule, stat] of Object.entries(perRule)) {
    lines.push(
      `| ${rule} | ${SCHEMA_RULES[rule].ernst} | ${stat.inForce} | ${stat.inForceGenerations} (${percent(stat.inForceGenerations, stat.inForce)}) | ${stat.inForceFindings} | ${stat.findings} | ${kinds.map((kind) => stat.byKind[kind] ?? 0).join(" | ")} |`,
    );
  }
  lines.push("");
  lines.push("Voorbeelden (eerste drie per regel, alleen generaties met de regel in de prompt):");
  lines.push("");
  for (const [rule, stat] of Object.entries(perRule)) {
    if (stat.examples.length === 0) continue;
    lines.push(`- **${rule}**: ${stat.examples.join("; ")}`);
  }
  return lines.join("\n");
}

const useCache = process.argv.includes("--cache");
mkdirSync(OUT_DIR, { recursive: true });
let rows;
if (useCache && existsSync(CACHE)) {
  rows = JSON.parse(readFileSync(CACHE, "utf8"));
} else {
  rows = fetchGenerations();
  writeFileSync(CACHE, JSON.stringify(rows));
}
const result = evaluate(rows);
let markdown = report(result, rows);

// Wat de regelmotor straks moet evenaren: de laatste dertig dagen, met de prompt
// van nu of daar dichtbij.
const last = rows.map((row) => String(row.created_at).slice(0, 10)).sort().at(-1);
const cutoff = new Date(`${last}T12:00:00Z`);
cutoff.setUTCDate(cutoff.getUTCDate() - 30);
const recentRows = rows.filter((row) => String(row.created_at).slice(0, 10) > cutoff.toISOString().slice(0, 10));
const recent = evaluate(recentRows);
markdown += [
  "",
  "",
  `Laatste 30 dagen (na ${cutoff.toISOString().slice(0, 10)}): ${recent.total} generaties, ${recent.workoutsTotal} workouts.`,
  "",
  "| Regel | In prompt | Gebroken in | Bevindingen |",
  "|---|---:|---:|---:|",
  ...Object.entries(recent.perRule).map(
    ([rule, stat]) => `| ${rule} | ${stat.inForce} | ${stat.inForceGenerations} (${percent(stat.inForceGenerations, stat.inForce)}) | ${stat.inForceFindings} |`,
  ),
].join("\n");
writeFileSync(path.join(OUT_DIR, "rapport.md"), `${markdown}\n`);
console.log(markdown);
