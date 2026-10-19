// Het weekoverzicht van één lid: aanmaken bij de eerste opening, de coachtekst
// in de achtergrond laten schrijven en ophalen, en onthouden dat het gezien is.
//
// Geen cron: het overzicht wordt pas gemaakt als het lid de app opent. Zo kost
// een lid dat die week niet kijkt niets, en hoeft er op zondagavond geen job
// voor de hele club te draaien.

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  retrieveCoachAnswerBackground,
  startCoachAnswerBackground,
} from "@/lib/training/ai";
import { coachInput, fallbackCoachText, WEEK_COACH_PROMPT } from "@/lib/weekly-review/coach-text";
import { buildNextWeekFor, buildWeekSummary, usesTraining } from "@/lib/weekly-review/load";
import type { NextWeek, WeekSummary } from "@/lib/weekly-review/summary";
import { hasContent, SUMMARY_VERSION } from "@/lib/weekly-review/summary";

type Admin = ReturnType<typeof createAdminClient>;

/** Langer dan dit wachten we niet op OpenAI; dan blijft de tekst uit regels staan. */
const COACH_TIMEOUT_MS = 5 * 60_000;

export type CoachState = "rules" | "pending" | "done" | "failed";

export type WeekReview = {
  weekStart: string;
  summary: WeekSummary;
  coachText: string;
  coachState: CoachState;
  seen: boolean;
  next: NextWeek;
};

type Row = {
  week_start: string;
  summary: WeekSummary;
  coach_text: string | null;
  coach_status: CoachState;
  coach_response_id: string | null;
  coach_started_at: string | null;
  seen_at: string | null;
};

const COLUMNS = "week_start, summary, coach_text, coach_status, coach_response_id, coach_started_at, seen_at";

async function readRow(admin: Admin, profileId: string, weekStart: string): Promise<Row | null> {
  const { data, error } = await admin
    .from("weekly_reviews")
    .select(COLUMNS)
    .eq("profile_id", profileId)
    .eq("week_start", weekStart)
    .maybeSingle();
  // Zonder migratie 0251 bestaat de tabel niet: dan geen weekoverzicht.
  if (error) throw new Error(error.message);
  return (data as Row | null) ?? null;
}

async function createRow(admin: Admin, profileId: string, weekStart: string, next: NextWeek): Promise<Row | null> {
  const summary = await buildWeekSummary(admin, profileId, weekStart);
  if (!hasContent(summary)) return null;

  const rules = fallbackCoachText(summary, next);
  let coach: Pick<Row, "coach_status" | "coach_response_id" | "coach_started_at"> & { coach_model: string | null } = {
    coach_status: "rules",
    coach_response_id: null,
    coach_started_at: null,
    coach_model: null,
  };
  if (process.env.OPENAI_API_KEY && (await usesTraining(admin, profileId))) {
    const started = await startCoachAnswerBackground(WEEK_COACH_PROMPT, coachInput(summary, next)).catch(() => null);
    if (started) {
      coach = {
        coach_status: "pending",
        coach_response_id: started.responseId,
        coach_started_at: new Date().toISOString(),
        coach_model: started.model,
      };
    }
  }

  const { data, error } = await admin
    .from("weekly_reviews")
    // Twee tabbladen tegelijk: de eerste wint, de tweede leest diens rij.
    .upsert(
      { profile_id: profileId, week_start: weekStart, summary, coach_text: rules, ...coach },
      { onConflict: "profile_id,week_start", ignoreDuplicates: true },
    )
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Row | null) ?? (await readRow(admin, profileId, weekStart));
}

/** Haalt een lopende coachtekst op; laat de rij ongemoeid zolang OpenAI nog denkt. */
async function settleCoach(admin: Admin, profileId: string, row: Row): Promise<Row> {
  if (row.coach_status !== "pending" || !row.coach_response_id) return row;
  const started = row.coach_started_at ? Date.parse(row.coach_started_at) : 0;
  const result = await retrieveCoachAnswerBackground(row.coach_response_id).catch(() => null);
  let update: Partial<Row> | null = null;
  if (result?.status === "completed") update = { coach_status: "done", coach_text: result.text.trim() };
  else if (result && result.status !== "queued" && result.status !== "in_progress") update = { coach_status: "failed" };
  else if (Date.now() - started > COACH_TIMEOUT_MS) update = { coach_status: "failed" };
  if (!update) return row;

  await admin
    .from("weekly_reviews")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("week_start", row.week_start);
  return { ...row, ...update };
}

/**
 * Het overzicht van deze week, aangemaakt als het er nog niet is. null als het
 * lid die week niets deed: dan is er niets om op terug te blikken.
 */
export async function loadWeekReview(
  admin: Admin,
  profileId: string,
  weekStart: string,
  nextWeekStart: string,
  { create, onlyUnseen = false }: { create: boolean; onlyUnseen?: boolean },
): Promise<WeekReview | null> {
  let row = await readRow(admin, profileId, weekStart);
  // De pop-up vraagt alleen naar een overzicht dat nog niet gezien is; dan ook
  // de vooruitblik niet lezen.
  if (onlyUnseen && row?.seen_at) return null;
  const next = await buildNextWeekFor(admin, profileId, nextWeekStart);
  // Een samenvatting van een oudere vorm opnieuw opbouwen: anders mist de pop-up
  // velden die de weergave verwacht, of blijft een inmiddels herstelde fout
  // staan. Gezien en de coachtekst blijven: de rij weggooien liet de pop-up
  // opnieuw verschijnen bij wie hem al had weggeklikt.
  if (row && row.summary?.version !== SUMMARY_VERSION) {
    const summary = await buildWeekSummary(admin, profileId, weekStart);
    await admin
      .from("weekly_reviews")
      .update({ summary, updated_at: new Date().toISOString() })
      .eq("profile_id", profileId)
      .eq("week_start", weekStart);
    row = { ...row, summary };
  }
  if (!row && create) row = await createRow(admin, profileId, weekStart, next);
  if (!row) return null;
  row = await settleCoach(admin, profileId, row);
  return {
    weekStart: row.week_start,
    summary: row.summary,
    coachText: row.coach_text ?? fallbackCoachText(row.summary, next),
    coachState: row.coach_status,
    seen: Boolean(row.seen_at),
    next,
  };
}

export async function markWeekReviewSeen(admin: Admin, profileId: string, weekStart: string) {
  await admin
    .from("weekly_reviews")
    .update({ seen_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("week_start", weekStart)
    .is("seen_at", null);
}
