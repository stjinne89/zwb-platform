// Claude-aanroepen vanuit de app (Next). Vult de clubwoorden ({club}, {kort},
// lib/club-texts.ts) in de systeemprompt in en geeft de vraag door aan
// claude-core.ts, waar de aanroep, de achtergrondopdracht en de meting zitten.
//
// Het invullen gebeurt hier en niet in de kern: lib/club leunt op server-only en
// next/cache, die buiten Next niet laden, en de Netlify-achtergrondfunctie laadt
// alleen claude-core.ts. Een opdracht in ai_jobs bevat dus al de ingevulde prompt.

import { fillClub } from "@/lib/club";
import {
  createClaudeJob as createJob,
  runClaude as run,
  type ClaudeFeature,
  type ClaudeRequest,
} from "./claude-core";

export {
  CLAUDE_JOB_PREFIX,
  claudeSchema,
  isClaudeJobId,
  readClaudeJob,
  todayLine,
  type ClaudeFeature,
  type ClaudeJobState,
  type ClaudeRequest,
} from "./claude-core";

async function withClub(request: ClaudeRequest): Promise<ClaudeRequest> {
  return { ...request, system: await fillClub(request.system) };
}

/** Eén aanroep, synchroon. Gooit bij een weigering, een afgekapt of leeg antwoord. */
export async function runClaude(
  request: ClaudeRequest,
  feature: ClaudeFeature,
): Promise<{ text: string; usage: unknown; model: string }> {
  return run(await withClub(request), feature);
}

/** Zet de vraag in ai_jobs en stoot de achtergrondfunctie aan. */
export async function createClaudeJob(feature: ClaudeFeature, request: ClaudeRequest): Promise<string> {
  return createJob(feature, await withClub(request));
}
