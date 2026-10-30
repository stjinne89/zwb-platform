// De app-update van deze week, vanzelf uit PLAN.md (wens eigenaar, 2026-10-30:
// "Ik wil dit nooit zelf schrijven").
//
// Een cron roept dit elk uur aan (POST /api/app-updates/weekly). Vanaf donderdag
// 14:00 doet het per aanroep één stap:
// 1. Staat de update van deze week er al, dan niets. Een update die het bestuur
//    zelf schreef of aanpaste, blijft dus staan.
// 2. Anders de rondes uit PLAN.md van vrijdag tot en met donderdag, en een
//    Claude-opdracht die daar een update voor leden van maakt (ai_jobs, 0294).
// 3. Een volgende aanroep haalt het antwoord op en zet de update neer, met
//    publish_at donderdag 17:00. Zo staat hij om 17:00 klaar; komt hij later,
//    dan verschijnt hij meteen.
// Leest PLAN.md van de versie die live staat (next.config: outputFileTracingIncludes),
// dus alleen wat ook echt in de app zit.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClaudeJob, CLAUDE_JOB_PREFIX, readClaudeJob, todayLine } from "@/lib/ai/claude";
import { claudeSettings } from "@/lib/ai/settings";
import { amsterdamDateKey, amsterdamWallTimeToIso } from "@/lib/birthdays";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays } from "@/lib/weekly-review/period";
import { loadLatestUpdate } from "./queries";
import { roundsBetween, type PlanRound } from "./plan-rounds";
import {
  ITEM_MAX,
  ITEMS_MAX,
  PUBLISH_WEEKDAY,
  SUMMARY_MAX,
  SUMMARY_MIN,
  publishAtFor,
  weekStartOf,
} from "./schedule";

/** Vanaf dit uur op donderdag begint het maken, ruim voor 17:00. */
export const AUTO_FROM_TIME = "14:00";
/** Zoveel pogingen per week; daarna wacht het op het bestuur. */
export const MAX_ATTEMPTS = 3;
/** Zoveel tekens PLAN.md gaan hooguit mee naar Claude. */
export const INPUT_MAX = 200_000;

export type AutoResult = {
  weekStart: string;
  status: "te_vroeg" | "bestaat" | "geen_rondes" | "gestart" | "bezig" | "geplaatst" | "niets_voor_leden" | "mislukt";
  detail?: string;
};

export type DraftUpdate = { summary: string; changes: string[]; fixes: string[] };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "changes", "fixes"],
  properties: {
    summary: { type: "string" },
    changes: { type: "array", items: { type: "string" } },
    fixes: { type: "array", items: { type: "string" } },
  },
};

const SYSTEM = `Je schrijft de wekelijkse app-update voor de leden van ZWB, een wielerclub met een eigen app (ZWBasis). Leden lezen hem op donderdag in een pop-up en op de pagina App-updates.

Je krijgt de rondes uit het projectplan van de afgelopen week. Dat plan is geschreven voor ontwikkelaars. Maak er een korte update voor leden van.

Regels:
- Alleen wat een lid in de app merkt. Laat weg: beheerwerk dat alleen het bestuur ziet, databasewerk, migraties, tests, deploys, onderzoek, metingen, ideeën en wat bewust niet gebouwd is.
- Wat in het plan staat, staat live. Een ronde die is teruggedraaid, telt niet.
- "changes": nieuwe dingen en merkbare verbeteringen. "fixes": fouten die verholpen zijn, zo geschreven dat een lid snapt wat er mis was of wat nu weer werkt.
- Eén punt per onderdeel. Voeg rondes over hetzelfde onderdeel samen. Hooguit 14 nieuw en 10 opgelost; kies wat leden het meest merken.
- "summary": één of twee zinnen met het belangrijkste van de week, hooguit 300 tekens.
- Elk punt hooguit 160 tekens, één zin of twee korte.
- Nederlands, spreek het lid aan met "je". Gewone woorden, geen vakjargon of code. Namen van onderdelen zoals in de app (ZWBeter Worden, ZWBriljant, Stats, Club Ladder).
- Noem geen namen van leden.
- Geen uitroeptekens, geen reclametaal, geen emoji.
- Is er niets wat leden merken, geef dan een lege summary en lege lijsten.

Antwoord alleen met JSON volgens het schema.`;

function planPath(): string {
  return path.join(process.cwd(), "PLAN.md");
}

/** De ronde-tekst voor Claude, ingekort tot INPUT_MAX tekens over alle rondes samen. */
export function roundsInput(rounds: PlanRound[]): string {
  const total = rounds.reduce((sum, round) => sum + round.text.length, 0);
  const each = total > INPUT_MAX ? Math.floor(INPUT_MAX / rounds.length) : Infinity;
  return rounds.map((round) => `--- ${round.date}\n${round.text.slice(0, each)}`).join("\n\n");
}

/** Het antwoord van Claude, ingekort en opgeschoond tot wat de tabel toestaat. Null als er niets is. */
export function parseDraft(text: string): DraftUpdate | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const value = raw as Partial<Record<keyof DraftUpdate, unknown>>;
  const clean = (item: unknown) => (typeof item === "string" ? item.trim().slice(0, ITEM_MAX) : "");
  const list = (items: unknown) => (Array.isArray(items) ? items.map(clean).filter(Boolean) : []);
  const summary = typeof value.summary === "string" ? value.summary.trim().slice(0, SUMMARY_MAX) : "";
  const changes = list(value.changes).slice(0, ITEMS_MAX);
  const fixes = list(value.fixes).slice(0, ITEMS_MAX - changes.length);
  if (summary.length < SUMMARY_MIN || changes.length + fixes.length === 0) return null;
  return { summary, changes, fixes };
}

export function buildRequest(weekStart: string, rounds: PlanRound[], example: DraftUpdate | null) {
  const { model, effort } = claudeSettings("app_updates");
  const thursday = addDays(weekStart, PUBLISH_WEEKDAY - 1);
  const style = example
    ? `\n\nZo zag de vorige update eruit; houd dezelfde toon en lengte:\n${JSON.stringify(example, null, 2)}`
    : "";
  return {
    model,
    effort,
    system: SYSTEM,
    cacheSystem: true,
    schema: SCHEMA,
    user: `${todayLine()}\n\nDe update verschijnt donderdag ${thursday} om 17:00 en gaat over ${addDays(thursday, -6)} tot en met ${thursday}.${style}\n\nDe rondes uit het projectplan:\n\n${roundsInput(rounds)}`,
  };
}

export async function runWeeklyUpdate(now: Date = new Date()): Promise<AutoResult> {
  const weekStart = weekStartOf(amsterdamDateKey(now));
  const thursday = addDays(weekStart, PUBLISH_WEEKDAY - 1);
  const startAt = amsterdamWallTimeToIso(thursday, AUTO_FROM_TIME);
  if (!startAt || now.getTime() < Date.parse(startAt)) return { weekStart, status: "te_vroeg" };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("app_updates").select("id").eq("week_start", weekStart).maybeSingle();
  if (existing) return { weekStart, status: "bestaat" };

  const rounds = roundsBetween(await readFile(planPath(), "utf8"), addDays(thursday, -6), thursday);
  if (rounds.length === 0) return { weekStart, status: "geen_rondes" };

  // De opdrachten van deze week; de nieuwste telt.
  const { data: jobs } = await admin
    .from("ai_jobs")
    .select("id")
    .eq("feature", "app_updates")
    .gte("created_at", startAt)
    .order("created_at", { ascending: false });
  const latest = (jobs ?? [])[0] as { id: string } | undefined;

  if (latest) {
    const state = await readClaudeJob(`${CLAUDE_JOB_PREFIX}${latest.id}`);
    if (state.status === "queued" || state.status === "in_progress") return { weekStart, status: "bezig" };
    if (state.status === "completed") {
      const draft = parseDraft(state.text);
      if (!draft) return { weekStart, status: "niets_voor_leden" };
      const { error } = await admin.from("app_updates").upsert(
        { week_start: weekStart, publish_at: publishAtFor(weekStart), ...draft },
        { onConflict: "week_start", ignoreDuplicates: true },
      );
      if (error) return { weekStart, status: "mislukt", detail: error.message };
      return { weekStart, status: "geplaatst" };
    }
    if (state.status === "failed" && (jobs ?? []).length >= MAX_ATTEMPTS) {
      return { weekStart, status: "mislukt", detail: state.error };
    }
  }

  const previous = await loadLatestUpdate(admin);
  const example = previous ? { summary: previous.summary, changes: previous.changes, fixes: previous.fixes } : null;
  await createClaudeJob("app_updates", buildRequest(weekStart, rounds, example));
  return { weekStart, status: "gestart", detail: `${rounds.length} rondes` };
}
