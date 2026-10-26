// Haalt de afgeronde AI-generaties op voor het naspelen van de regelmotor:
// per generatie de volledige invoer (prompt_summary) en het schema van de AI
// (response_json). Alleen lezen.
//
// De uitvoer is ledendata en blijft buiten git: standaard in .tmp/, dat in
// .gitignore staat. Alleen de getallen per regel uit het naspelen gaan naar docs/.
//
//   node scripts/engine-export.mjs [--env <pad naar .env.local>] [--out <bestand>]

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const envFile = arg("--env", ".env.local");
const out = arg("--out", path.join(".tmp", "engine-replay", "generations.jsonl"));
const env = readEnv(envFile);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error(`Supabase-URL of service-key ontbreekt in ${envFile}.`);

const supabase = createClient(url, key, { auth: { persistSession: false } });
const PAGE = 50;
const rows = [];
for (let from = 0; ; from += PAGE) {
  const { data, error } = await supabase
    .from("training_ai_generations")
    .select("id, model, adaptation_kind, parent_plan_id, prompt_summary, response_json, created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: true })
    .range(from, from + PAGE - 1);
  if (error) throw new Error(error.message);
  rows.push(...data);
  if (data.length < PAGE) break;
}

let written = 0;
fs.mkdirSync(path.dirname(out), { recursive: true });
const stream = fs.createWriteStream(out);
for (const row of rows) {
  let input;
  try {
    input = JSON.parse(row.prompt_summary ?? "");
  } catch {
    continue; // Oude rijen met een korte samenvatting in plaats van de invoer.
  }
  if (!input?.goal || !row.response_json) continue;
  const kind = row.adaptation_kind ?? (row.parent_plan_id ? "bijwerking" : "nieuw_schema");
  stream.write(`${JSON.stringify({ id: row.id, model: row.model, kind, createdAt: row.created_at, input, ai: row.response_json })}\n`);
  written += 1;
}
stream.end();
console.log(`${written} van ${rows.length} generaties naar ${out}`);
