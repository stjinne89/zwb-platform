// Welke AI-aanbieder de app gebruikt, en per soort aanroep welk Claude-model en
// hoeveel denkwerk.
//
// AI_PROVIDER kiest tussen OpenAI (standaard) en Anthropic. Zo kan de code al
// live staan voordat de overstap gebeurt, en kan hij terug zonder deploy van
// nieuwe code: alleen de env-waarde en een redeploy.
//
// De standaardwaarden komen uit het naspelen van 2026-10-24 (docs/claude-naspelen.md):
// Opus 5.5 overal, bijwerkingen op effort `low` (even weinig regelfouten als
// `medium`, een kwart goedkoper en sneller). Per soort over te schrijven met
// ANTHROPIC_MODEL_<SOORT> en ANTHROPIC_EFFORT_<SOORT>, bijvoorbeeld
// ANTHROPIC_MODEL_PLAN_UPDATE=claude-sonnet-5-5 als het tegoed opraakt.

export type AiProvider = "openai" | "anthropic";

export type AiEffort = "low" | "medium" | "high";

/** De soorten aanroep die een eigen model of effort kunnen krijgen. */
export type AiKind =
  | "nieuw_schema"
  | "plan_update"
  | "daily"
  | "day"
  | "coach"
  | "weekly"
  | "pacing"
  | "nutrition";

const DEFAULT_MODEL = "claude-opus-5-5";

// Gelijk aan wat de app per soort aan OpenAI vraagt, behalve de bijwerking.
const DEFAULT_EFFORT: Record<AiKind, AiEffort> = {
  nieuw_schema: "medium",
  plan_update: "low",
  daily: "low",
  day: "low",
  coach: "low",
  weekly: "low",
  pacing: "medium",
  nutrition: "low",
};

export function aiProvider(): AiProvider {
  return process.env.AI_PROVIDER?.trim().toLowerCase() === "anthropic" ? "anthropic" : "openai";
}

export function usesClaude(): boolean {
  return aiProvider() === "anthropic";
}

/** Staat de sleutel van de gekozen aanbieder er? */
export function aiConfigured(): boolean {
  return Boolean(usesClaude() ? process.env.ANTHROPIC_API_KEY?.trim() : process.env.OPENAI_API_KEY?.trim());
}

function isEffort(value: string | undefined): value is AiEffort {
  return value === "low" || value === "medium" || value === "high";
}

export function claudeSettings(kind: AiKind): { model: string; effort: AiEffort } {
  const suffix = kind.toUpperCase();
  const model =
    process.env[`ANTHROPIC_MODEL_${suffix}`]?.trim() || process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const effort = process.env[`ANTHROPIC_EFFORT_${suffix}`]?.trim().toLowerCase();
  return { model, effort: isEffort(effort) ? effort : DEFAULT_EFFORT[kind] };
}

/** De soort van een trainingsgeneratie, uit de adaptation_kind van de rij. */
export function trainingKind(adaptationKind: string | null | undefined): AiKind {
  if (adaptationKind === "daily" || adaptationKind === "day" || adaptationKind === "plan_update") {
    return adaptationKind;
  }
  return adaptationKind ? "plan_update" : "nieuw_schema";
}
