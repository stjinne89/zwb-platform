#!/usr/bin/env node
// Literatuurtoets: legt de schema's van AI en regelmotor langs drie maatstaven
// uit onderzoek (intensiteitsverdeling, taper, onderbreking). Leest alleen; de
// invoer komt uit scripts/engine-export.mjs (.tmp/engine-replay/generations.jsonl).
//
//   node scripts/engine-literature.mjs [--in <jsonl>] [--since YYYY-MM-DD] [--report <md>]
//
// Alleen nieuwe schema's en bijwerkingen: een dagaanpassing wijzigt een paar
// dagen en heeft geen eigen verdeling of taper. Het rapport bevat alleen
// tellingen, geen ledendata.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(root, "src") } });
const { checkLiterature, TID_SUPPORT, MAX_GAP_DAYS } = await jiti.import(
  path.join(root, "src/lib/training/literature-check.ts"),
);
const { generateEnginePlan } = await jiti.import(path.join(root, "src/lib/training/engine/index.ts"));

function arg(name, fallback) {
  const at = process.argv.indexOf(name);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

const IN = arg("--in", path.join(root, ".tmp", "engine-replay", "generations.jsonl"));
const SINCE = arg("--since", "2026-09-17");
const REPORT = arg("--report", path.join(root, "docs", "regelmotor-literatuurtoets.md"));
if (!existsSync(IN)) throw new Error(`${IN} ontbreekt: draai eerst scripts/engine-export.mjs.`);

const KINDS = { nieuw_schema: "nieuw schema", bijwerking: "bijwerking", plan_update: "bijwerking" };
const TIDS = ["gepolariseerd", "piramidaal", "drempel", "hoog", "basis", "overig", "leeg"];
const SUPPORTS = ["gesteund", "minder", "fase"];

function emptySide() {
  return {
    tid: Object.fromEntries(TIDS.map((kind) => [kind, 0])),
    shares: [],
    taper: { n: 0, volume: 0, intensity: 0, frequency: 0, reductions: [] },
    gapTooLong: 0,
    gaps: [],
    endsEarly: 0,
  };
}
function emptyTally() {
  return { n: 0, crashes: 0, ai: emptySide(), engine: emptySide(), paired: {}, pairedTaper: { both: 0, aiOnly: 0, engineOnly: 0, neither: 0 } };
}

function score(side, result) {
  side.tid[result.tid] += 1;
  const total = result.zones.z1 + result.zones.z2 + result.zones.z3;
  if (total > 0) side.shares.push([result.zones.z1 / total, result.zones.z2 / total, result.zones.z3 / total]);
  if (result.taper) {
    side.taper.n += 1;
    if (result.taper.volumeOk) side.taper.volume += 1;
    if (result.taper.intensityKept) side.taper.intensity += 1;
    if (result.taper.frequencyKept) side.taper.frequency += 1;
    side.taper.reductions.push(result.taper.reduction);
  }
  if (result.gapTooLong) side.gapTooLong += 1;
  if (result.endsEarly) side.endsEarly += 1;
  side.gaps.push(result.longestGap);
}

const tallies = { alle: new Map(), recent: new Map() };
const tallyFor = (scope, kind) => {
  if (!tallies[scope].has(kind)) tallies[scope].set(kind, emptyTally());
  return tallies[scope].get(kind);
};

const lines = readFileSync(IN, "utf8").split(/\r?\n/).filter(Boolean);
let used = 0;
for (const line of lines) {
  const row = JSON.parse(line);
  const kind = KINDS[row.kind];
  if (!kind) continue;
  used += 1;
  const aiWorkouts = Array.isArray(row.ai.workouts) ? row.ai.workouts : [];
  const aiWindow = { from: row.ai.startDate, to: row.ai.endDate };
  const ai = checkLiterature(row.input, aiWorkouts, aiWindow);

  let engine = null;
  try {
    const plan = generateEnginePlan(row.input, aiWindow);
    engine = checkLiterature(row.input, plan.workouts, { from: plan.startDate, to: plan.endDate });
  } catch {
    engine = null;
  }

  const scopes = row.createdAt >= SINCE ? ["alle", "recent"] : ["alle"];
  for (const scope of scopes) {
    const tally = tallyFor(scope, kind);
    tally.n += 1;
    score(tally.ai, ai);
    if (!engine) {
      tally.crashes += 1;
      continue;
    }
    score(tally.engine, engine);
    const key = `${TID_SUPPORT[ai.tid]}|${TID_SUPPORT[engine.tid]}`;
    tally.paired[key] = (tally.paired[key] ?? 0) + 1;
    if (ai.taper && engine.taper) {
      const a = ai.taper.volumeOk && ai.taper.intensityKept && ai.taper.frequencyKept;
      const e = engine.taper.volumeOk && engine.taper.intensityKept && engine.taper.frequencyKept;
      tally.pairedTaper[a && e ? "both" : a ? "aiOnly" : e ? "engineOnly" : "neither"] += 1;
    }
  }
}

// ── Rapport ─────────────────────────────────────────────────────────────────
const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");
const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const medianPct = (values) => {
  const value = median(values);
  return value == null ? "–" : `${Math.round(value * 100)}%`;
};

function section(title, map) {
  const out = [`## ${title}`, ""];
  const kinds = [...map.keys()].sort((a, b) => map.get(b).n - map.get(a).n);
  for (const kind of kinds) {
    const t = map.get(kind);
    const ran = t.n - t.crashes;
    out.push(`### ${kind} (${t.n}${t.crashes ? `, motor faalde ${t.crashes}` : ""})`, "");

    out.push("**Intensiteitsverdeling.** Aandeel schema's per soort verdeling.", "");
    out.push("| Verdeling | Literatuur | AI | Motor |", "|---|---|---:|---:|");
    for (const tid of TIDS) {
      if (!t.ai.tid[tid] && !t.engine.tid[tid]) continue;
      out.push(`| ${tid} | ${TID_SUPPORT[tid]} | ${pct(t.ai.tid[tid], t.n)} | ${pct(t.engine.tid[tid], ran)} |`);
    }
    out.push("");
    const zones = (side) =>
      [0, 1, 2].map((index) => medianPct(side.shares.map((share) => share[index]))).join(" / ");
    out.push(`Mediaan zone 1 / 2 / 3: AI ${zones(t.ai)}, motor ${zones(t.engine)}.`, "");

    out.push("Per generatie naast elkaar (rij AI, kolom motor):", "");
    out.push(`| AI \\ motor | ${SUPPORTS.join(" | ")} |`, `|---|${SUPPORTS.map(() => "---:").join("|")}|`);
    for (const a of SUPPORTS) {
      out.push(`| ${a} | ${SUPPORTS.map((e) => t.paired[`${a}|${e}`] ?? 0).join(" | ")} |`);
    }
    out.push("");

    out.push("**Taper** (alleen schema's met een piekmoment én drie weken ervoor binnen de periode).", "");
    out.push("| | AI | Motor |", "|---|---:|---:|");
    out.push(`| te beoordelen | ${t.ai.taper.n} | ${t.engine.taper.n} |`);
    out.push(`| volume 41-60% omlaag | ${pct(t.ai.taper.volume, t.ai.taper.n)} | ${pct(t.engine.taper.volume, t.engine.taper.n)} |`);
    out.push(`| intensiteit behouden | ${pct(t.ai.taper.intensity, t.ai.taper.n)} | ${pct(t.engine.taper.intensity, t.engine.taper.n)} |`);
    out.push(`| frequentie behouden | ${pct(t.ai.taper.frequency, t.ai.taper.n)} | ${pct(t.engine.taper.frequency, t.engine.taper.n)} |`);
    out.push(`| mediane volumedaling | ${medianPct(t.ai.taper.reductions)} | ${medianPct(t.engine.taper.reductions)} |`);
    const pt = t.pairedTaper;
    if (pt.both + pt.aiOnly + pt.engineOnly + pt.neither > 0) {
      out.push("", `Alle drie gehaald, per generatie: beide ${pt.both}, alleen AI ${pt.aiOnly}, alleen motor ${pt.engineOnly}, geen van beide ${pt.neither}.`);
    }
    out.push("");

    out.push(`**Onderbreking.** Meer dan ${MAX_GAP_DAYS} dagen zonder training (rustperiodes uit het jaarplan niet meegeteld).`, "");
    out.push("| | AI | Motor |", "|---|---:|---:|");
    out.push(`| langer dan ${MAX_GAP_DAYS} dagen | ${pct(t.ai.gapTooLong, t.n)} | ${pct(t.engine.gapTooLong, ran)} |`);
    out.push(`| mediane langste reeks | ${median(t.ai.gaps) ?? "–"} d | ${median(t.engine.gaps) ?? "–"} d |`);
    out.push(`| stopt > ${MAX_GAP_DAYS} dagen vóór het einde (geen literatuurregel) | ${pct(t.ai.endsEarly, t.n)} | ${pct(t.engine.endsEarly, ran)} |`);
    out.push("");
  }
  return out.join("\n");
}

// Het rapport heeft een met de hand geschreven kop (methode, bronnen, conclusie);
// alleen wat na de markering staat, schrijft dit script opnieuw.
const MARKER = "<!-- tellingen: alles hieronder schrijft scripts/engine-literature.mjs -->";
const head = existsSync(REPORT) && readFileSync(REPORT, "utf8").includes(MARKER)
  ? readFileSync(REPORT, "utf8").split(MARKER)[0].trimEnd()
  : "# Regelmotor: literatuurtoets";
const report = [
  head,
  "",
  MARKER,
  "",
  `Gegenereerd door \`scripts/engine-literature.mjs\` op ${used} nieuwe schema's en bijwerkingen`,
  `(van ${lines.length} geëxporteerde generaties). Alleen tellingen, geen ledendata.`,
  "",
  section(`Vanaf ${SINCE}`, tallies.recent),
  "",
  section("Alle generaties", tallies.alle),
  "",
].join("\n");
writeFileSync(REPORT, report);
console.log(`Rapport: ${path.relative(root, REPORT)} (${used} generaties)`);
