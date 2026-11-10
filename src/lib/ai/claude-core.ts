// Claude-aanroepen als achtergrondopdracht.
//
// De bestaande AI-code werkt met OpenAI's background-modus: start, bewaar het
// response-id, haal later op. Claude kent die modus niet en doet minuten over een
// schema, terwijl een gewone Netlify-functie na zo'n 30 seconden stopt. Daarom:
// - createClaudeJob zet de vraag in ai_jobs (migratie 0275_ai_jobs) en stoot de
//   Netlify-achtergrondfunctie aan (netlify/functions/ai-job-background.mts),
//   die tot 15 minuten mag draaien. Lokaal (next dev) draait de opdracht in
//   hetzelfde proces.
// - processClaudeJob doet de eigenlijke aanroep en schrijft het antwoord terug.
// - readClaudeJob geeft dezelfde statussen terug als OpenAI, zodat de ophaal-code
//   van elke functie gelijk blijft.
// - runClaude schrijft na elke aanroep een regel in ai_usage (0316, usage.ts):
//   van wie, wie hem startte, de tokens en de kosten.
// Het id dat de functies bewaren is "aij_" + het id in ai_jobs; een id van
// OpenAI begint met "resp_". Zo worden opdrachten die nog bij OpenAI liepen na
// de overstap gewoon daar opgehaald.
//
// Dit is de kern die de achtergrondfunctie laadt. De rest van de app gebruikt
// claude.ts, die eerst de clubwoorden ({club}, {kort}) in de prompt invult en
// dan deze functies aanroept; hier komt de prompt dus al ingevuld binnen.
//
// Alleen relatieve imports en niets dat alleen binnen Next laadt (server-only,
// next/*, react, lib/club): de achtergrondfunctie wordt door Netlify buiten Next
// gebundeld. Van 9 tot 10 november 2026 crashte hij daardoor bij het laden en
// bleef elke opdracht in de rij staan. tests/unit/ai-job-bundle.test.ts bewaakt dit.

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "../supabase/admin";
import type { AiEffort } from "./settings";
import { costUsd, tokensFromUsage, type AiMeter } from "./usage";

export const CLAUDE_JOB_PREFIX = "aij_";

export type ClaudeFeature = "training" | "coach" | "pacing" | "nutrition" | "app_updates";

export type ClaudeRequest = {
  model: string;
  effort: AiEffort;
  system: string;
  user: string;
  /** JSON-schema voor het antwoord; zonder schema is het antwoord platte tekst. */
  schema?: Record<string, unknown> | null;
  /** De systeemprompt cachen; alleen zinvol als die tussen aanroepen gelijk blijft. */
  cacheSystem?: boolean;
  /**
   * Van wie de aanroep is en wie hem startte, voor ai_usage (0316). Verplicht,
   * zodat geen nieuwe aanroep ongemeten blijft. Een opdracht die nog van vóór
   * deze regel in de rij stond, heeft hem niet; die wordt niet geteld.
   */
  meter: AiMeter;
};

export type ClaudeJobState =
  | { status: "queued" | "in_progress" }
  | { status: "completed"; text: string }
  | { status: "failed"; error: string };

/** Hoe lang een achtergrondfunctie hooguit draait, plus wat speling. */
const RUNNING_TIMEOUT_MS = 16 * 60_000;
/** Na zoveel wachten in de rij wordt de achtergrondfunctie opnieuw aangestoten. */
const REKICK_AFTER_MS = 60_000;
/** Zo lang mag een opdracht in de rij staan voordat hij als mislukt telt. */
const QUEUED_TIMEOUT_MS = 10 * 60_000;
const NOT_STARTED = "Claude-opdracht is niet gestart.";
const KEEP_DAYS = 7;
/** ai_usage bewaart dertien maanden: genoeg om een heel jaar te vergelijken. */
const USAGE_KEEP_DAYS = 396;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isClaudeJobId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(CLAUDE_JOB_PREFIX);
}

/**
 * De datum van vandaag als eerste regel van de vraag. GPT-5.5 krijgt die van
 * OpenAI zelf mee, Claude niet; zonder ankerdatum in de invoer plande Claude
 * in de verkeerde maand (docs/claude-naspelen.md).
 */
export function todayLine(now = new Date()): string {
  const date = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const weekday = now.toLocaleDateString("nl-NL", { weekday: "long", timeZone: "Europe/Amsterdam" });
  return `Vandaag is ${weekday} ${date}.`;
}

/**
 * Claude's structured outputs kennen geen getal- en tekstgrenzen en geen
 * minItems boven 1 of maxItems. Die gaan eruit; de code die het antwoord
 * gebruikt, controleert zelf.
 */
export function claudeSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(claudeSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "maxItems"].includes(key)) {
      continue;
    }
    if (key === "minItems") {
      if (typeof value === "number" && value <= 1) out[key] = value;
      continue;
    }
    out[key] = claudeSchema(value);
  }
  return out;
}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ontbreekt. Zet deze in Netlify env om Claude te gebruiken.");
  return new Anthropic({ apiKey, maxRetries: 3, timeout: 14 * 60_000 });
}

/**
 * Eén regel in ai_usage. Mag de aanroep zelf nooit laten mislukken: zonder
 * tabel (migratie 0316 nog niet toegepast) of bij een fout telt hij gewoon niet.
 */
async function recordUsage(
  feature: ClaudeFeature,
  meter: AiMeter | undefined,
  model: string,
  usage: unknown,
  stopReason: string | null,
): Promise<void> {
  if (!meter) return;
  try {
    const tokens = tokensFromUsage(usage);
    await createAdminClient()
      .from("ai_usage")
      .insert({
        profile_id: meter.profileId,
        feature,
        kind: meter.kind ?? feature,
        trigger: meter.trigger,
        model,
        stop_reason: stopReason,
        input_tokens: tokens.input,
        output_tokens: tokens.output,
        cache_write_tokens: tokens.cacheWrite,
        cache_read_tokens: tokens.cacheRead,
        cost_usd: costUsd(model, tokens),
      });
  } catch {
    // Meten is bijzaak.
  }
}

/**
 * Eén aanroep, synchroon, met een al ingevulde prompt. Gooit bij een weigering,
 * een afgekapt of leeg antwoord.
 */
export async function runClaude(
  request: ClaudeRequest,
  feature: ClaudeFeature,
): Promise<{ text: string; usage: unknown; model: string }> {
  const system = request.system;
  const stream = client().beta.messages.stream({
    model: request.model,
    max_tokens: 64_000,
    // Weigert het model, dan neemt de API zelf een ander model om het af te
    // maken, in dezelfde aanroep.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: request.effort,
      ...(request.schema ? { format: { type: "json_schema", schema: claudeSchema(request.schema) as Record<string, unknown> } } : {}),
    },
    system: request.cacheSystem
      ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
      : system,
    messages: [{ role: "user", content: request.user }],
  });
  const message = await stream.finalMessage();
  // Ook een geweigerd of afgekapt antwoord kost tokens, dus eerst tellen.
  // Met een fallback rekent dit met het model dat het antwoord afmaakte.
  await recordUsage(feature, request.meter, message.model, message.usage, message.stop_reason ?? null);
  if (message.stop_reason === "refusal") throw new Error("Claude weigerde deze vraag.");
  if (message.stop_reason === "max_tokens") throw new Error("Het antwoord van Claude werd afgekapt.");
  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  if (!text) throw new Error("Claude gaf een leeg antwoord.");
  return { text, usage: message.usage, model: message.model };
}

function siteUrl(): string | null {
  return process.env.URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || null;
}

/** "netlify" op productie, "inline" lokaal; AI_JOB_RUNNER kan dat overschrijven. */
function jobRunner(): "netlify" | "inline" {
  const forced = process.env.AI_JOB_RUNNER?.trim();
  if (forced === "netlify" || forced === "inline") return forced;
  return process.env.NODE_ENV === "production" && siteUrl() ? "netlify" : "inline";
}

async function triggerJob(id: string): Promise<void> {
  if (jobRunner() === "inline") {
    void processClaudeJob(id).catch(() => undefined);
    return;
  }
  let res: Response;
  try {
    res = await fetch(`${siteUrl()}/.netlify/functions/ai-job-background`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(8_000),
      // Een doorverwijzing (bijvoorbeeld naar /login) niet volgen: dan zou de
      // inlogpagina als geslaagde aanroep tellen en draaide de opdracht nooit.
      redirect: "manual",
    });
  } catch {
    // Netwerkfout: de eerstvolgende keer ophalen stoot hem opnieuw aan.
    return;
  }
  // Een achtergrondfunctie antwoordt altijd 202.
  if (res.status !== 202) throw new Error(`De achtergrondfunctie voor Claude gaf ${res.status}.`);
}

export async function createClaudeJob(feature: ClaudeFeature, request: ClaudeRequest): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_jobs")
    .insert({ feature, model: request.model, status: "queued", request })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "AI-opdracht aanmaken faalde.");
  const id = data.id as string;
  try {
    await triggerJob(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Achtergrondfunctie niet bereikbaar.";
    await admin.from("ai_jobs").update({ status: "failed", error: message, request: null }).eq("id", id);
    throw err;
  }
  return `${CLAUDE_JOB_PREFIX}${id}`;
}

/** Wat de achtergrondfunctie doet. Alleen een opdracht die nog in de rij staat. */
export async function processClaudeJob(id: string): Promise<void> {
  if (!UUID.test(id)) return;
  const admin = createAdminClient();
  // Eerst claimen: een tweede aanroep (Netlify probeert na een fout opnieuw, of
  // het ophalen stootte hem nog eens aan) vindt dan niets meer in de rij.
  const { data: job } = await admin
    .from("ai_jobs")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "queued")
    .select("request, feature")
    .maybeSingle();
  if (!job?.request) return;

  try {
    const result = await runClaude(job.request as ClaudeRequest, job.feature as ClaudeFeature);
    await admin
      .from("ai_jobs")
      .update({
        status: "completed",
        output_text: result.text,
        usage: result.usage,
        model: result.model,
        request: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);
  } catch (err) {
    await admin
      .from("ai_jobs")
      .update({
        status: "failed",
        error: (err instanceof Error ? err.message : String(err)).slice(0, 500),
        request: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  await admin
    .from("ai_jobs")
    .delete()
    .lt("created_at", new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString());
  // Zonder tabel (0316) geeft dit een fout terug in plaats van te gooien.
  await admin
    .from("ai_usage")
    .delete()
    .lt("created_at", new Date(Date.now() - USAGE_KEEP_DAYS * 86_400_000).toISOString());
}

export async function readClaudeJob(jobId: string): Promise<ClaudeJobState> {
  const id = jobId.slice(CLAUDE_JOB_PREFIX.length);
  if (!UUID.test(id)) return { status: "failed", error: "Onbekende AI-opdracht." };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_jobs")
    .select("status, output_text, error, created_at, started_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { status: "failed", error: "AI-opdracht niet gevonden." };

  if (data.status === "completed") return { status: "completed", text: (data.output_text as string) ?? "" };
  if (data.status === "failed") return { status: "failed", error: (data.error as string) ?? "Claude-opdracht mislukt." };
  if (data.status === "queued") {
    const waiting = Date.now() - Date.parse(data.created_at as string);
    // Start hij na tien minuten aanstoten nog steeds niet, dan komt hij ook niet
    // meer: liever een fout die het lid ziet dan een opdracht die eeuwig wacht.
    if (waiting > QUEUED_TIMEOUT_MS) {
      await admin
        .from("ai_jobs")
        .update({ status: "failed", error: NOT_STARTED, request: null })
        .eq("id", id)
        .eq("status", "queued");
      return { status: "failed", error: NOT_STARTED };
    }
    if (waiting > REKICK_AFTER_MS) await triggerJob(id).catch(() => undefined);
    return { status: "queued" };
  }
  const started = data.started_at ? Date.parse(data.started_at as string) : Date.parse(data.created_at as string);
  if (Date.now() - started > RUNNING_TIMEOUT_MS) {
    await admin
      .from("ai_jobs")
      .update({ status: "failed", error: "Claude kwam niet op tijd terug.", request: null })
      .eq("id", id)
      .eq("status", "in_progress");
    return { status: "failed", error: "Claude kwam niet op tijd terug." };
  }
  return { status: "in_progress" };
}
