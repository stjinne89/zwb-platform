#!/usr/bin/env node
// Speelt de opgeslagen AI-generaties na met de regelmotor en legt beide schema's
// langs dezelfde meetlat. Leest alleen; de invoer komt uit
// scripts/engine-export.mjs (.tmp/engine-replay/generations.jsonl).
//
//   node scripts/engine-replay.mjs [--in <jsonl>] [--since YYYY-MM-DD] [--report <md>]
//
// Het rapport bevat alleen tellingen. Per generatie schrijft het script een
// regel naar .tmp/engine-replay/details.jsonl om zelf in te kunnen duiken; daar
// staat geen invoer in, alleen ids, regels en minuten.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(root, "src") } });
const { checkTrainingPlan, SCHEMA_RULES } = await jiti.import(path.join(root, "src/lib/training/schema-check.ts"));
const { generateEnginePlan } = await jiti.import(path.join(root, "src/lib/training/engine/index.ts"));

function arg(name, fallback) {
  const at = process.argv.indexOf(name);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

const IN = arg("--in", path.join(root, ".tmp", "engine-replay", "generations.jsonl"));
const SINCE = arg("--since", "2026-09-17");
const REPORT = arg("--report", path.join(root, "docs", "regelmotor-naspelen.md"));
const DETAILS = path.join(root, ".tmp", "engine-replay", "details.jsonl");
if (!existsSync(IN)) throw new Error(`${IN} ontbreekt: draai eerst scripts/engine-export.mjs.`);

const KINDS = {
  nieuw_schema: "nieuw schema",
  bijwerking: "bijwerking (oud)",
  plan_update: "bijwerking",
  day: "dag-aanpassing (lid)",
  daily: "dagelijkse aanpassing",
};
const RULES = Object.keys(SCHEMA_RULES);

function emptyTally() {
  return {
    n: 0,
    crashes: 0,
    ai: { withError: 0, rules: Object.fromEntries(RULES.map((rule) => [rule, 0])), changed: 0, minutes: 0 },
    engine: { withError: 0, rules: Object.fromEntries(RULES.map((rule) => [rule, 0])), changed: 0, minutes: 0 },
  };
}

function score(side, findings, workouts) {
  const errors = findings.filter((finding) => finding.ernst === "fout");
  if (errors.length > 0) side.withError += 1;
  for (const regel of new Set(findings.map((finding) => finding.regel))) side.rules[regel] += 1;
  if (workouts.length > 0) side.changed += 1;
  side.minutes += workouts.reduce((sum, workout) => sum + (Number(workout.durationMinutes) || 0), 0);
}

const tallies = { alle: new Map(), recent: new Map() };
const tallyFor = (scope, kind) => {
  if (!tallies[scope].has(kind)) tallies[scope].set(kind, emptyTally());
  return tallies[scope].get(kind);
};
const crashMessages = new Map();
const details = [];

const lines = readFileSync(IN, "utf8").split(/\r?\n/).filter(Boolean);
for (const line of lines) {
  const row = JSON.parse(line);
  const kind = row.kind;
  const scopes = row.createdAt >= SINCE ? ["alle", "recent"] : ["alle"];
  const aiWorkouts = Array.isArray(row.ai.workouts) ? row.ai.workouts : [];
  const window = { from: row.ai.startDate, to: row.ai.endDate };
  const aiFindings = checkTrainingPlan(row.input, aiWorkouts, window);

  let engine = null;
  let engineFindings = [];
  try {
    engine = generateEnginePlan(row.input, window);
    engineFindings = checkTrainingPlan(row.input, engine.workouts, { from: engine.startDate, to: engine.endDate });
  } catch (err) {
    const message = String(err?.message ?? err).slice(0, 120);
    crashMessages.set(message, (crashMessages.get(message) ?? 0) + 1);
  }

  for (const scope of scopes) {
    const tally = tallyFor(scope, kind);
    tally.n += 1;
    score(tally.ai, aiFindings, aiWorkouts);
    if (engine) score(tally.engine, engineFindings, engine.workouts);
    else tally.crashes += 1;
  }
  details.push({
    id: row.id,
    kind,
    createdAt: row.createdAt,
    ai: { workouts: aiWorkouts.length, minutes: aiWorkouts.reduce((s, w) => s + (Number(w.durationMinutes) || 0), 0), rules: aiFindings.map((f) => f.regel) },
    engine: engine
      ? { workouts: engine.workouts.length, minutes: engine.workouts.reduce((s, w) => s + w.durationMinutes, 0), rules: engineFindings.map((f) => f.regel) }
      : null,
  });
}

mkdirSync(path.dirname(DETAILS), { recursive: true });
writeFileSync(DETAILS, details.map((row) => JSON.stringify(row)).join("\n"));

// ── Rapport ─────────────────────────────────────────────────────────────────
const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");

function section(title, map) {
  const out = [`## ${title}`, ""];
  const kinds = [...map.keys()].sort((a, b) => map.get(b).n - map.get(a).n);
  out.push("| Soort | Aantal | Motor faalde | Met fout: AI | Met fout: motor | Iets gewijzigd: AI | Iets gewijzigd: motor |");
  out.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const kind of kinds) {
    const t = map.get(kind);
    const ran = t.n - t.crashes;
    out.push(
      `| ${KINDS[kind] ?? kind} | ${t.n} | ${t.crashes} | ${pct(t.ai.withError, t.n)} | ${pct(t.engine.withError, ran)} | ${pct(t.ai.changed, t.n)} | ${pct(t.engine.changed, ran)} |`,
    );
  }
  out.push("", "Per regel: het aandeel generaties met minstens één bevinding.", "");
  out.push(`| Regel | Ernst | ${kinds.map((kind) => `${KINDS[kind] ?? kind}: AI / motor`).join(" | ")} |`);
  out.push(`|---|---|${kinds.map(() => "---:").join("|")}|`);
  for (const rule of RULES) {
    const cells = kinds.map((kind) => {
      const t = map.get(kind);
      return `${pct(t.ai.rules[rule], t.n)} / ${pct(t.engine.rules[rule], t.n - t.crashes)}`;
    });
    out.push(`| ${rule} | ${SCHEMA_RULES[rule].ernst} | ${cells.join(" | ")} |`);
  }
  return out.join("\n");
}

const report = [
  "# Regelmotor naspelen",
  "",
  `Gegenereerd door \`scripts/engine-replay.mjs\` op ${lines.length} opgeslagen generaties.`,
  "Elke generatie draait opnieuw door de motor, op precies de invoer die de AI kreeg;",
  "beide schema's gaan langs dezelfde meetlat (`checkTrainingPlan`). Alleen tellingen,",
  "geen ledendata. Ontwerp: [eigen-regelmotor](eigen-regelmotor.md); meetlat:",
  "[schema-meetlat](schema-meetlat.md).",
  "",
  "Let op: oude generaties zijn gemaakt met een prompt waarin nog niet alle regels",
  "stonden. De AI-cijfers over alle generaties zijn daardoor strenger dan eerlijk;",
  `de tabel vanaf ${SINCE} is de zuivere vergelijking.`,
  "",
  section(`Vanaf ${SINCE}`, tallies.recent),
  "",
  section("Alle generaties", tallies.alle),
  "",
  crashMessages.size
    ? ["## Waar de motor faalde", "", ...[...crashMessages].map(([message, count]) => `- ${count}x: ${message}`)].join("\n")
    : "## Waar de motor faalde\n\nNergens.",
  "",
].join("\n");

writeFileSync(REPORT, report);
console.log(report);
