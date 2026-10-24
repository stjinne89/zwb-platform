#!/usr/bin/env node
// Speelt opgeslagen OpenAI-generaties na met Claude, voor de vraag of de app van
// AI-aanbieder kan wisselen. Per generatie gaat precies dezelfde prompt
// (prompt_text) en invoer (prompt_summary) naar Claude, met hetzelfde
// JSON-schema als de app aan OpenAI geeft. Beide schema's gaan daarna langs de
// meetlat (checkTrainingPlan), en compare.html zet ze blind naast elkaar om zelf
// te beoordelen.
//
//   node scripts/claude-replay.mjs --profile <uuid> [--per-kind 5] [--model claude-opus-5-5]
//                                  [--effort low|medium|high] [--kinds daily,plan_update,nieuw_schema,day]
//                                  [--concurrency 2] [--env .env.local] [--out .tmp/claude-replay]
//
// --profile is verplicht: de prompts bevatten trainings- en gezondheidsgegevens,
// en Anthropic staat (nog) niet als verwerker in de privacyverklaring. Draai dit
// dus alleen op een profiel van iemand die daarmee instemt.
//
// Alles wat het script schrijft is ledendata en blijft in .tmp/ (in .gitignore).
// Draait het opnieuw, dan slaat het generaties over die al in results.jsonl staan.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { createJiti } from "jiti";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(root, "src") } });
const { checkTrainingPlan } = await jiti.import(path.join(root, "src/lib/training/schema-check.ts"));
const { planSchema } = await jiti.import(path.join(root, "src/lib/training/ai.ts"));

function arg(name, fallback) {
  const at = process.argv.indexOf(name);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

function readEnv(file) {
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

const PROFILE = arg("--profile", null);
const PER_KIND = Number(arg("--per-kind", "5"));
const MODEL = arg("--model", "claude-opus-5-5");
const CONCURRENCY = Number(arg("--concurrency", "2"));
const EFFORT = arg("--effort", null); // overschrijft de effort per soort
const ONLY = arg("--kinds", null)?.split(",") ?? null;
const OUT = arg("--out", path.join(root, ".tmp", "claude-replay"));
const env = readEnv(arg("--env", path.join(root, ".env.local")));
if (!PROFILE) throw new Error("--profile <uuid> ontbreekt (zie de kop van dit script).");
if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY ontbreekt in .env.local.");
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase-URL of service-key ontbreekt.");

// Dezelfde instellingen als de app per soort meegeeft (draft.ts en
// api/training/adaptations/daily). OpenAI-effort low/medium valt één-op-één
// samen met die van Claude.
const KINDS = {
  daily: { label: "dagelijkse aanpassing", effort: "low", minWorkouts: 0 },
  plan_update: { label: "bijwerking", effort: "medium", minWorkouts: 3 },
  nieuw_schema: { label: "nieuw schema", effort: "medium", minWorkouts: 3 },
  day: { label: "dag-aanpassing (lid)", effort: "low", minWorkouts: 1 },
};
const MAX_WORKOUTS = planSchema(0).properties.workouts.maxItems;

// Claude's structured outputs kennen geen minItems boven 1 of maxItems; de SDK
// zou ze ook weghalen. Hier expliciet, en achteraf zelf geteld. minItems 1 blijft
// staan: zonder kwam de dag-aanpassing van een lid met een lege lijst terug.
function claudeSchema(minWorkouts) {
  const schema = structuredClone(planSchema(Math.min(minWorkouts, 1)));
  if (minWorkouts === 0) delete schema.properties.workouts.minItems;
  delete schema.properties.workouts.maxItems;
  return schema;
}

// Per miljoen tokens. Cache schrijven 1,25x invoer, lezen $0,20.
const PRICE = MODEL.startsWith("claude-sonnet")
  ? { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 }
  : { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 };
const costOf = (usage) =>
  ((usage.input_tokens ?? 0) * PRICE.input +
    (usage.output_tokens ?? 0) * PRICE.output +
    (usage.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite +
    (usage.cache_read_input_tokens ?? 0) * PRICE.cacheRead) /
  1e6;

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { data: rows, error } = await supabase
  .from("training_ai_generations")
  .select("id, adaptation_kind, parent_plan_id, model, prompt_text, prompt_summary, response_json, created_at")
  .eq("profile_id", PROFILE)
  .eq("status", "completed")
  .not("response_json", "is", null)
  .not("prompt_text", "is", null)
  .order("created_at", { ascending: false })
  .limit(400);
if (error) throw new Error(error.message);

const picked = [];
const perKind = new Map();
for (const row of rows) {
  const kind = row.adaptation_kind ?? (row.parent_plan_id ? "bijwerking" : "nieuw_schema");
  if (!KINDS[kind]) continue; // "bijwerking" is de oude flow van voor plan_update.
  if (ONLY && !ONLY.includes(kind)) continue;
  if ((perKind.get(kind) ?? 0) >= PER_KIND) continue;
  let input;
  try {
    input = JSON.parse(row.prompt_summary ?? "");
  } catch {
    continue;
  }
  perKind.set(kind, (perKind.get(kind) ?? 0) + 1);
  picked.push({ ...row, kind, input });
}

fs.mkdirSync(OUT, { recursive: true });
const RESULTS = path.join(OUT, "results.jsonl");
const done = new Set(
  fs.existsSync(RESULTS)
    ? fs
        .readFileSync(RESULTS, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line).id)
    : [],
);
const todo = picked.filter((row) => !done.has(row.id));
console.log(`${picked.length} generaties gekozen (${[...perKind].map(([k, n]) => `${k} ${n}`).join(", ")}); ${todo.length} nog te doen.`);

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 4 });


function summarize(plan, input) {
  const workouts = Array.isArray(plan?.workouts) ? plan.workouts : [];
  const findings = checkTrainingPlan(input, workouts, { from: plan?.startDate, to: plan?.endDate });
  return {
    workouts: workouts.length,
    minutes: workouts.reduce((sum, w) => sum + (Number(w.durationMinutes) || 0), 0),
    errors: findings.filter((f) => f.ernst === "fout").length,
    warnings: findings.filter((f) => f.ernst === "waarschuwing").length,
    findings,
  };
}

async function replay(row) {
  const cfg = KINDS[row.kind];
  const started = Date.now();
  const result = { id: row.id, kind: row.kind, createdAt: row.created_at, openaiModel: row.model, claudeModel: MODEL, effort: EFFORT ?? cfg.effort };
  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      output_config: { effort: EFFORT ?? cfg.effort, format: { type: "json_schema", schema: claudeSchema(cfg.minWorkouts) } },
      // Geen cache_control: de systeemprompt verschilt per generatie, dus een
      // cache werd alleen geschreven (25% duurder) en nooit gelezen.
      system: row.prompt_text,
      messages: [
        {
          role: "user",
          content: `Maak een trainingsplan-concept op basis van deze intake en recente data:\n${row.prompt_summary}`,
        },
      ],
    });
    const message = await stream.finalMessage();
    result.seconds = Math.round((Date.now() - started) / 100) / 10;
    result.stopReason = message.stop_reason;
    result.usage = message.usage;
    result.costUsd = Math.round(costOf(message.usage) * 10000) / 10000;
    if (message.stop_reason === "refusal") throw new Error(`geweigerd (${message.stop_details?.category ?? "?"})`);
    if (message.stop_reason === "max_tokens") throw new Error("afgekapt op max_tokens");
    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    result.claude = JSON.parse(text);
  } catch (err) {
    result.seconds ??= Math.round((Date.now() - started) / 100) / 10;
    result.error = String(err?.message ?? err).slice(0, 300);
  }
  result.openai = row.response_json;
  result.input = row.input;
  result.check = {
    openai: summarize(row.response_json, row.input),
    claude: result.claude ? summarize(result.claude, row.input) : null,
  };
  const count = result.check.claude?.workouts;
  result.schemaOk = count == null ? false : count >= cfg.minWorkouts && count <= MAX_WORKOUTS;
  fs.appendFileSync(RESULTS, `${JSON.stringify(result)}\n`);
  const c = result.check.claude;
  console.log(
    `${row.kind.padEnd(12)} ${row.created_at.slice(0, 10)} ${result.error ? `FOUT ${result.error}` : `${result.seconds}s $${result.costUsd} | fouten OpenAI ${result.check.openai.errors} / Claude ${c.errors}`}`,
  );
}

const queue = [...todo];
await Promise.all(
  Array.from({ length: Math.max(1, CONCURRENCY) }, async () => {
    while (queue.length) await replay(queue.shift());
  }),
);

// ── Rapport en vergelijkingspagina ──────────────────────────────────────────
function writeReport(results) {
  const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");
  const lines = [
    "# Claude naspelen",
    "",
    `${results.length} generaties, Claude-model ${MODEL}${EFFORT ? `, effort ${EFFORT}` : ""}. Zelfde prompt, invoer en schema als OpenAI kreeg.`,
    "",
    "| Soort | Aantal | Claude mislukt | Met fout: OpenAI | Met fout: Claude | Gem. sec Claude | Kosten Claude |",
    "|---|---:|---:|---:|---:|---:|---:|",
  ];
  const kinds = [...new Set(results.map((r) => r.kind))];
  for (const kind of kinds) {
    const rs = results.filter((r) => r.kind === kind);
    const ok = rs.filter((r) => r.check.claude);
    const secs = ok.reduce((s, r) => s + r.seconds, 0) / (ok.length || 1);
    const cost = rs.reduce((s, r) => s + (r.costUsd ?? 0), 0);
    lines.push(
      `| ${KINDS[kind].label} | ${rs.length} | ${rs.length - ok.length} | ${pct(rs.filter((r) => r.check.openai.errors > 0).length, rs.length)} | ${pct(ok.filter((r) => r.check.claude.errors > 0).length, ok.length)} | ${Math.round(secs)} | $${cost.toFixed(2)} |`,
    );
  }
  const failures = results.filter((r) => r.error);
  if (failures.length) lines.push("", "Mislukt:", ...failures.map((r) => `- ${r.kind} ${r.createdAt.slice(0, 10)}: ${r.error}`));
  fs.writeFileSync(path.join(OUT, "report.md"), `${lines.join("\n")}\n`);
}

function writeCompare(results) {
  // Per paar een vaste maar willekeurig ogende kant, zodat herladen dezelfde
  // A/B geeft en de beoordeling in localStorage blijft kloppen.
  const pairs = results
    .filter((r) => r.claude)
    .map((r) => {
      const claudeIsA = createHash("sha256").update(r.id).digest()[0] % 2 === 0;
      const side = (plan, check) => ({ plan, findings: check.findings.map((f) => `${f.ernst}: ${f.regel} (${f.datum}) ${f.toelichting}`) });
      const openai = side(r.openai, r.check.openai);
      const claude = side(r.claude, r.check.claude);
      return {
        id: r.id,
        kind: KINDS[r.kind].label,
        date: r.createdAt.slice(0, 10),
        input: r.input,
        a: claudeIsA ? claude : openai,
        b: claudeIsA ? openai : claude,
        key: Buffer.from(claudeIsA ? "A" : "B").toString("base64"),
      };
    });
  const data = JSON.stringify(pairs).replace(/</g, "\\u003c");
  fs.writeFileSync(path.join(OUT, "compare.html"), COMPARE_HTML.replace("__DATA__", data));
}

const COMPARE_HTML = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blinde vergelijking</title>
<style>
:root{--bg:#fafaf9;--fg:#1c1917;--muted:#78716c;--line:#e7e5e4;--card:#fff;--accent:#c2410c;--bad:#b91c1c;--warn:#a16207}
@media (prefers-color-scheme:dark){:root{--bg:#1c1917;--fg:#f5f5f4;--muted:#a8a29e;--line:#44403c;--card:#292524;--accent:#fb923c;--bad:#f87171;--warn:#facc15}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}
header{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;z-index:1}
header h1{font-size:17px;margin:0 auto 0 0}button{font:inherit;padding:6px 12px;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:6px;cursor:pointer}
button.on{border-color:var(--accent);color:var(--accent);font-weight:600}main{max-width:1400px;margin:0 auto;padding:16px}
section{border:1px solid var(--line);border-radius:10px;background:var(--card);margin:0 0 24px;padding:16px}
.meta{color:var(--muted);font-size:13px}.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}
@media (max-width:800px){.cols{grid-template-columns:1fr}}.side h3{margin:0 0 6px}.side p{margin:4px 0}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}td,th{border-top:1px solid var(--line);padding:5px 4px;text-align:left;vertical-align:top}
.struct{color:var(--muted);font-size:12px;margin-top:3px}.find{font-size:12px}.find .fout{color:var(--bad)}.find .waarschuwing{color:var(--warn)}
.vote{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center}textarea{width:100%;font:inherit;margin-top:8px;padding:6px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg)}
pre{white-space:pre-wrap;font-size:12px;max-height:400px;overflow:auto}.reveal{font-weight:600;color:var(--accent)}#tally{font-weight:600}
</style></head><body>
<header><h1>Blinde vergelijking</h1><span id="tally"></span><button id="show">Toon uitslag</button><button id="dl">Download oordelen</button></header>
<main id="list"></main>
<script>
const PAIRS = __DATA__;
const KEY = "claude-replay-votes";
let votes = {}; try { votes = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch {}
let revealed = false;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(votes)); } catch {} };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function side(label, s) {
  const p = s.plan || {}; const ws = Array.isArray(p.workouts) ? p.workouts : [];
  const rows = ws.map((w) => '<tr><td>' + esc(w.date) + '</td><td><b>' + esc(w.title) + '</b> <span class="meta">' + esc(w.intensity) + ', ' + esc(w.durationMinutes) + ' min</span><div>' + esc(w.description) + '</div><div class="struct">' +
    (w.structure || []).map((b) => esc(b.label) + ' ' + esc(b.durationMinutes) + 'm ' + esc(b.target)).join(' · ') + '</div></td></tr>').join("");
  const find = s.findings.length ? s.findings.map((f) => '<div class="' + f.split(":")[0] + '">' + esc(f) + '</div>').join("") : "geen bevindingen";
  return '<div class="side"><h3>' + label + '</h3><p><b>' + esc(p.title) + '</b></p><p>' + esc(p.summary) + '</p>' +
    (p.cautions && p.cautions.length ? '<p class="meta">Let op: ' + p.cautions.map(esc).join(" · ") + '</p>' : "") +
    '<table><tr><th>Datum</th><th>Training (' + ws.length + ')</th></tr>' + (rows || '<tr><td colspan="2" class="meta">geen workouts</td></tr>') + '</table>' +
    '<details class="find"><summary>Meetlat</summary>' + find + '</details></div>';
}
function render() {
  document.getElementById("list").innerHTML = PAIRS.map((p, i) => {
    const v = votes[p.id] || {}; const claude = atob(p.key);
    const btn = (val, txt) => '<button data-id="' + p.id + '" data-v="' + val + '" class="' + (v.choice === val ? "on" : "") + '">' + txt + '</button>';
    return '<section><div class="meta">' + (i + 1) + '/' + PAIRS.length + ' · ' + esc(p.kind) + ' · ' + esc(p.date) + '</div>' +
      '<details><summary class="meta">Invoer</summary><pre>' + esc(JSON.stringify(p.input, null, 2)) + '</pre></details>' +
      '<div class="cols">' + side("A" + (revealed ? (claude === "A" ? " — Claude" : " — OpenAI") : ""), p.a) + side("B" + (revealed ? (claude === "B" ? " — Claude" : " — OpenAI") : ""), p.b) + '</div>' +
      '<div class="vote">' + btn("A", "A beter") + btn("=", "Gelijk") + btn("B", "B beter") + '</div>' +
      '<textarea data-note="' + p.id + '" rows="2" placeholder="Waarom?">' + esc(v.note) + '</textarea></section>';
  }).join("");
  tally();
}
function tally() {
  const n = Object.values(votes).filter((v) => v.choice).length;
  let txt = n + "/" + PAIRS.length + " beoordeeld";
  if (revealed) {
    let c = 0, o = 0, g = 0;
    for (const p of PAIRS) { const v = votes[p.id]; if (!v || !v.choice) continue; if (v.choice === "=") g++; else if (v.choice === atob(p.key)) c++; else o++; }
    txt += " · Claude beter " + c + " · OpenAI beter " + o + " · gelijk " + g;
  }
  document.getElementById("tally").textContent = txt;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-id]"); if (!b) return;
  votes[b.dataset.id] = { ...(votes[b.dataset.id] || {}), choice: b.dataset.v }; save(); render();
});
document.addEventListener("input", (e) => {
  const id = e.target.dataset.note; if (!id) return;
  votes[id] = { ...(votes[id] || {}), note: e.target.value }; save(); tally();
});
document.getElementById("show").onclick = () => { if (revealed || confirm("Uitslag tonen? Daarna is de vergelijking niet meer blind.")) { revealed = true; render(); } };
document.getElementById("dl").onclick = () => {
  const out = PAIRS.map((p) => ({ id: p.id, kind: p.kind, claudeSide: atob(p.key), ...(votes[p.id] || {}) }));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
  a.download = "claude-replay-oordelen.json"; a.click();
};
render();
</script></body></html>
`;

const all = fs
  .readFileSync(RESULTS, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));
writeReport(all);
writeCompare(all);
console.log(`Klaar: ${path.join(OUT, "report.md")} en ${path.join(OUT, "compare.html")}`);
