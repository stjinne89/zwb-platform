// Zet het ZWBeter Worden-blok in de Strava-beschrijving van net gereden ritten.
// Draait als laatste stap van de Strava-sync (src/lib/strava/client.ts), want
// daar zijn de activiteiten per definitie vers.
//
// Twee harde grenzen, bewust niet optioneel:
//  - STRAVA_ZWB_SUMMARY_SINCE: ritten van vóór die datum raken we nooit aan.
//    Ontbreekt de variabele, dan doet deze module niets. Zonder die grens zou
//    een fullBackfill-run jaren historie willen herschrijven.
//  - een venster van 48 uur, zodat we alleen recent gereden ritten oppakken.

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchStravaActivityDetail,
  nearRateLimit,
  updateStravaActivityDescription,
  type StravaRateLimitUsage,
} from "@/lib/strava/activity-api";
import {
  syncIntervalsActivities,
  type ActivityLoadRow,
} from "@/lib/intervals/activities";
import { fetchIntervalsWellness } from "@/lib/intervals/client";
import {
  buildZwbSummaryBlock,
  composeDescription,
  pickIntervalsActivity,
  pickPlannedWorkout,
  stripZwbSummary,
  summaryHash,
} from "@/lib/training/strava-summary";
import {
  ctlTrend,
  computeZwbStatus,
  eftpTrend,
  fitnessTrendFromDelta,
} from "@/lib/training/zwbeterworden";
import type { WellnessDevice } from "@/lib/training/wellness";
import {
  detectIntensityFromLoad,
  estimateTrainingLoad,
  normalizeWorkoutBlocks,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

type Admin = ReturnType<typeof createAdminClient>;

/** Hoe oud de opgeslagen intervals-belasting mag zijn voordat we bijsyncen. Los
 * van ACTIVITY_SYNC_MAX_AGE_MS (6u), waar de trainingspagina aan hangt. */
export const SUMMARY_INTERVALS_MAX_AGE_MS = 30 * 60 * 1000;

/** Strava kapt of weigert een te lange beschrijving; dan schrijven we niets. */
const MAX_DESCRIPTION_LENGTH = 8000;

/** Ritten korter dan dit geleden slaan we over: Strava is nog aan het verwerken. */
const MIN_ACTIVITY_AGE_MS = 15 * 60 * 1000;

/** Na zoveel pogingen laten we een rit los, zodat een rij niet blijft hangen. */
const MAX_ATTEMPTS = 4;
/** Tot zoveel pogingen wachten we op de belasting uit intervals.icu. */
const MAX_PENDING_ATTEMPTS = 3;

export type SummaryWriteResult = {
  written: number;
  skipped: number;
  /** Wacht op de belasting uit intervals.icu. */
  pending: number;
  rateLimited: boolean;
  errors: string[];
};

const EMPTY_RESULT: SummaryWriteResult = {
  written: 0,
  skipped: 0,
  pending: 0,
  rateLimited: false,
  errors: [],
};

type CandidateRow = {
  id: number;
  start_date: string;
  moving_time_seconds: number | null;
};

type SummaryRow = {
  activity_id: number;
  summary_text: string | null;
  summary_hash: string | null;
  written_at: string | null;
  attempts: number;
};

type PlannedWorkoutRow = {
  id: string;
  scheduled_at: string;
  title: string | null;
  duration_minutes: number | null;
  intensity: string;
  structure_json: unknown;
};

/** Ondergrens uit de omgeving. Ongeldig of leeg betekent: feature uit. */
export function summarySinceDate(
  raw = process.env.STRAVA_ZWB_SUMMARY_SINCE,
): Date | null {
  const value = raw?.trim();
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function writeZwbSummariesForUser(
  admin: Admin,
  profileId: string,
  accessToken: string,
  options: { maxWrites?: number; maxAgeHours?: number } = {},
): Promise<SummaryWriteResult> {
  const maxWrites = Math.max(0, options.maxWrites ?? 1);
  const since = summarySinceDate();
  if (maxWrites === 0 || !since) return EMPTY_RESULT;

  const now = Date.now();
  const maxAgeHours = Math.max(1, options.maxAgeHours ?? 48);
  const windowStart = new Date(
    Math.max(since.getTime(), now - maxAgeHours * 3600_000),
  );

  const { data: candidateRows } = await admin
    .from("strava_activities")
    .select("id, start_date, moving_time_seconds")
    .eq("profile_id", profileId)
    // Negatieve id's komen uit de CSV/GPX-import en bestaan niet bij Strava.
    .gt("id", 0)
    .gte("start_date", windowStart.toISOString())
    .lte("start_date", new Date(now - MIN_ACTIVITY_AGE_MS).toISOString())
    .order("start_date", { ascending: false })
    .limit(10);

  const candidates = (candidateRows ?? []) as CandidateRow[];
  if (candidates.length === 0) return EMPTY_RESULT;

  const { data: summaryRows } = await admin
    .from("strava_activity_summaries")
    .select("activity_id, summary_text, summary_hash, written_at, attempts")
    .in(
      "activity_id",
      candidates.map((c) => c.id),
    );
  const summaries = new Map(
    ((summaryRows ?? []) as SummaryRow[]).map((row) => [row.activity_id, row]),
  );

  const open = candidates.filter((candidate) => {
    const row = summaries.get(candidate.id);
    return !row || (!row.written_at && row.attempts < MAX_ATTEMPTS);
  });
  // Niets te doen: terug vóór elke netwerkcall. Dit houdt de meeste cron-runs
  // gratis, en dat is nodig — Strava's rate limit geldt per applicatie.
  if (open.length === 0) return EMPTY_RESULT;

  const [{ data: intervalsConn }, { data: profile }] = await Promise.all([
    admin
      .from("intervals_connections")
      .select("api_key, athlete_id, wellness_opt_in")
      .eq("profile_id", profileId)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("zrl_division, wellness_device")
      .eq("id", profileId)
      .maybeSingle(),
  ]);
  // Zonder intervals.icu zouden vijf van de acht regels "-" zijn. Zo'n blok
  // publiceren we niet onder de clubnaam.
  if (!intervalsConn?.api_key || !intervalsConn?.athlete_id) {
    return { ...EMPTY_RESULT, skipped: open.length };
  }

  const result: SummaryWriteResult = {
    written: 0,
    skipped: 0,
    pending: 0,
    rateLimited: false,
    errors: [],
  };

  // Belasting per rit vers genoeg? Zeven dagen is ruim voor het 48-uursvenster
  // en een fractie van de payload die de trainingspagina ophaalt.
  const { data: newestSync } = await admin
    .from("intervals_activities")
    .select("synced_at")
    .eq("profile_id", profileId)
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (
    !newestSync ||
    new Date(newestSync.synced_at).getTime() < now - SUMMARY_INTERVALS_MAX_AGE_MS
  ) {
    try {
      await syncIntervalsActivities(
        admin,
        {
          profile_id: profileId,
          athlete_id: intervalsConn.athlete_id,
          api_key: intervalsConn.api_key,
        },
        7,
      );
    } catch (err) {
      result.errors.push(
        err instanceof Error ? err.message : "intervals-belasting bijwerken faalde.",
      );
    }
  }

  const wellness = await fetchIntervalsWellness(
    intervalsConn.api_key,
    intervalsConn.athlete_id,
    120,
  ).catch(() => []);
  const zwbStatus = computeZwbStatus(wellness, {
    wellnessOptIn: Boolean(intervalsConn.wellness_opt_in),
    zrlDivision: profile?.zrl_division ?? null,
    wellnessDevice: (profile?.wellness_device ?? null) as WellnessDevice | null,
  });
  const fitnessTrend = fitnessTrendFromDelta(
    eftpTrend(wellness, 90).delta,
    ctlTrend(wellness, 42),
  );

  const oldestCandidate = open[open.length - 1];
  const [{ data: intervalsRows }, { data: workoutRows }] = await Promise.all([
    admin
      .from("intervals_activities")
      .select(
        "intervals_id, start_date_local, name, type, moving_time_seconds, training_load, intensity, normalized_watts, kilojoules, raw",
      )
      .eq("profile_id", profileId)
      .gte(
        "start_date_local",
        new Date(
          new Date(oldestCandidate.start_date).getTime() - 86400_000,
        )
          .toISOString()
          .slice(0, 10),
      ),
    admin
      .from("training_workouts")
      .select("id, scheduled_at, title, duration_minutes, intensity, structure_json")
      .is("superseded_at", null)
      .eq("profile_id", profileId)
      .gte(
        "scheduled_at",
        new Date(
          new Date(oldestCandidate.start_date).getTime() - 36 * 3600_000,
        ).toISOString(),
      ),
  ]);
  const intervalsActivities = (intervalsRows ?? []) as Array<
    ActivityLoadRow & { raw?: unknown }
  >;
  const plannedWorkouts = (workoutRows ?? []) as PlannedWorkoutRow[];

  let usage: StravaRateLimitUsage | null = null;
  for (const candidate of open) {
    if (result.written >= maxWrites) break;
    if (nearRateLimit(usage)) {
      result.rateLimited = true;
      break;
    }

    const existing = summaries.get(candidate.id);
    const attempts = existing?.attempts ?? 0;
    const activityStart = new Date(candidate.start_date);
    const activityMinutes = candidate.moving_time_seconds
      ? Math.round(candidate.moving_time_seconds / 60)
      : null;

    const matchedActivity = pickIntervalsActivity(
      intervalsActivities,
      candidate.id,
      activityStart,
      activityMinutes,
    );
    const actualLoad = matchedActivity?.training_load ?? null;
    const matchedWorkout = pickPlannedWorkout(
      plannedWorkouts,
      activityStart,
      activityMinutes,
    );

    // Nog geen belasting bekend: intervals.icu heeft de rit niet verwerkt. Even
    // laten liggen; na MAX_PENDING_ATTEMPTS schrijven we alsnog met "-".
    if (actualLoad == null && attempts < MAX_PENDING_ATTEMPTS) {
      await upsertSummary(admin, {
        activity_id: candidate.id,
        profile_id: profileId,
        workout_id: matchedWorkout?.id ?? null,
        intervals_id: matchedActivity?.intervals_id ?? null,
        attempts: attempts + 1,
        last_error: "Wacht op belasting uit intervals.icu.",
      });
      result.pending++;
      continue;
    }

    const plannedLoad = matchedWorkout
      ? estimateTrainingLoad(
          normalizeWorkoutBlocks(
            matchedWorkout.structure_json,
            // training_workouts.intensity is via een CHECK beperkt tot deze set.
            matchedWorkout.intensity as WorkoutIntensity,
          ),
        )
      : null;
    const block = buildZwbSummaryBlock({
      plannedTitle: matchedWorkout?.title ?? null,
      plannedIntensity: matchedWorkout?.intensity ?? null,
      plannedMinutes: matchedWorkout?.duration_minutes ?? null,
      plannedLoad,
      actualLoad: actualLoad == null ? null : Number(actualLoad),
      detectedIntensity: detectIntensityFromLoad(
        actualLoad == null ? null : Number(actualLoad),
        matchedActivity?.moving_time_seconds
          ? Math.round(matchedActivity.moving_time_seconds / 60)
          : activityMinutes,
      ),
      ctl: zwbStatus.ctl,
      readinessLevel: zwbStatus.advice.level,
      readinessTitle: zwbStatus.advice.title,
      readinessScore: zwbStatus.readiness.score,
      fitnessTrend,
    });

    // Claim de rij: written_at is het slot. Lukt dit niet, dan was een andere
    // run ons voor — de cron en een interactieve sync kunnen elkaar raken.
    const claimed = await claimSummary(admin, {
      activity_id: candidate.id,
      profile_id: profileId,
      workout_id: matchedWorkout?.id ?? null,
      intervals_id: matchedActivity?.intervals_id ?? null,
      attempts: attempts + 1,
    });
    if (!claimed) {
      result.skipped++;
      continue;
    }

    const detail = await fetchStravaActivityDetail(accessToken, candidate.id);
    usage = detail.usage ?? usage;
    if (!detail.ok) {
      await releaseSummary(admin, candidate.id, detail.error);
      result.errors.push(detail.error);
      if (detail.rateLimited) result.rateLimited = true;
      if (detail.rateLimited || detail.authFailed) break;
      continue;
    }

    const base = stripZwbSummary(detail.detail.description, existing?.summary_text);
    const next = composeDescription(base, block);
    if (next === (detail.detail.description ?? "")) {
      // Staat er al goed. Claim bevestigen zonder Strava-call.
      await finishSummary(admin, candidate.id, block);
      result.skipped++;
      continue;
    }
    if (next.length > MAX_DESCRIPTION_LENGTH) {
      const message = "Beschrijving te lang voor Strava.";
      await releaseSummary(admin, candidate.id, message);
      result.errors.push(message);
      continue;
    }

    const put = await updateStravaActivityDescription(
      accessToken,
      candidate.id,
      next,
    );
    usage = put.usage ?? usage;
    if (!put.ok) {
      await releaseSummary(admin, candidate.id, put.error);
      result.errors.push(put.error);
      if (put.rateLimited) result.rateLimited = true;
      if (put.rateLimited || put.authFailed) break;
      continue;
    }

    await finishSummary(admin, candidate.id, block);
    result.written++;
  }

  return result;
}

async function upsertSummary(
  admin: Admin,
  row: {
    activity_id: number;
    profile_id: string;
    workout_id: string | null;
    intervals_id: string | null;
    attempts: number;
    last_error: string | null;
  },
) {
  await admin
    .from("strava_activity_summaries")
    .upsert({ ...row, updated_at: new Date().toISOString() }, {
      onConflict: "activity_id",
    });
}

/**
 * Zet written_at, maar alleen als die nog leeg is. Nul rijen terug betekent dat
 * een andere run de rit al onder handen heeft.
 */
async function claimSummary(
  admin: Admin,
  row: {
    activity_id: number;
    profile_id: string;
    workout_id: string | null;
    intervals_id: string | null;
    attempts: number;
  },
): Promise<boolean> {
  await admin.from("strava_activity_summaries").upsert(
    {
      activity_id: row.activity_id,
      profile_id: row.profile_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "activity_id", ignoreDuplicates: true },
  );

  const { data } = await admin
    .from("strava_activity_summaries")
    .update({
      written_at: new Date().toISOString(),
      workout_id: row.workout_id,
      intervals_id: row.intervals_id,
      attempts: row.attempts,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("activity_id", row.activity_id)
    .is("written_at", null)
    .select("activity_id");
  return (data ?? []).length > 0;
}

/** Geeft de claim terug zodat een volgende run het opnieuw kan proberen. */
async function releaseSummary(admin: Admin, activityId: number, error: string) {
  await admin
    .from("strava_activity_summaries")
    .update({
      written_at: null,
      last_error: error.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("activity_id", activityId);
}

async function finishSummary(admin: Admin, activityId: number, block: string) {
  await admin
    .from("strava_activity_summaries")
    .update({
      summary_text: block,
      summary_hash: summaryHash(block),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("activity_id", activityId);
}
