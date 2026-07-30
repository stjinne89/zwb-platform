// Zet het ZWBeter Worden-blok in de Strava-beschrijving van net gereden ritten.
// Draait als laatste stap van de Strava-sync (src/lib/strava/client.ts), want
// daar zijn de activiteiten per definitie vers.
//
// De belasting per rit (Workout score) komt uit de Strava-activiteit zelf: TSS
// en IF worden berekend uit genormaliseerd vermogen en de FTP van het lid, zie
// lib/training/ride-metrics.ts. Eerder kwam die uit intervals.icu, maar dat
// geeft via de API niets terug voor activiteiten die daar via Strava
// binnenkwamen — precies de ritten waar dit blok over gaat. CTL, gereedscore en
// fitness-status komen wél uit intervals: die zitten in de wellness-reeks.
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
import { fetchIntervalsWellness } from "@/lib/intervals/client";
import { rideMetricsFromStrava } from "@/lib/training/ride-metrics";
import {
  buildZwbSummaryBlock,
  composeDescription,
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

/** Strava kapt of weigert een te lange beschrijving; dan schrijven we niets. */
const MAX_DESCRIPTION_LENGTH = 8000;

/** Ritten korter dan dit geleden slaan we over: Strava is nog aan het verwerken. */
const MIN_ACTIVITY_AGE_MS = 15 * 60 * 1000;

/** Na zoveel pogingen laten we een rit los, zodat een rij niet blijft hangen. */
const MAX_ATTEMPTS = 4;

export type SummaryWriteResult = {
  written: number;
  skipped: number;
  rateLimited: boolean;
  errors: string[];
};

const EMPTY_RESULT: SummaryWriteResult = {
  written: 0,
  skipped: 0,
  rateLimited: false,
  errors: [],
};

type CandidateRow = {
  id: number;
  start_date: string;
  moving_time_seconds: number | null;
  raw: unknown;
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
    .select("id, start_date, moving_time_seconds, raw")
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
      .select("zrl_division, wellness_device, ftp_watts")
      .eq("id", profileId)
      .maybeSingle(),
  ]);
  // CTL, gereedscore en fitness-status komen uit de wellness-reeks van
  // intervals.icu. Zonder die koppeling zou de halve blok "-" zijn, en zo'n blok
  // publiceren we niet onder de clubnaam. De belasting per rit komt wél uit
  // Strava: intervals geeft daar voor Strava-activiteiten niets voor terug.
  if (!intervalsConn?.api_key || !intervalsConn?.athlete_id) {
    return { ...EMPTY_RESULT, skipped: open.length };
  }

  const result: SummaryWriteResult = {
    written: 0,
    skipped: 0,
    rateLimited: false,
    errors: [],
  };
  const ftpWatts = profile?.ftp_watts == null ? null : Number(profile.ftp_watts);

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
  const { data: workoutRows } = await admin
    .from("training_workouts")
    .select("id, scheduled_at, title, duration_minutes, intensity, structure_json")
    .is("superseded_at", null)
    .eq("profile_id", profileId)
    .gte(
      "scheduled_at",
      new Date(
        new Date(oldestCandidate.start_date).getTime() - 36 * 3600_000,
      ).toISOString(),
    );
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
    // Belasting uit de rit zelf: TSS en IF uit genormaliseerd vermogen en de FTP
    // van het lid. Zonder vermogensmeter blijft de belasting leeg en toont het
    // blok "-" bij Workout score.
    const metrics = rideMetricsFromStrava(
      candidate.raw,
      candidate.moving_time_seconds,
      ftpWatts,
    );
    const activityMinutes = metrics.movingMinutes;
    const actualLoad = metrics.tss;
    const matchedWorkout = pickPlannedWorkout(
      plannedWorkouts,
      activityStart,
      activityMinutes,
    );

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
      actualLoad,
      detectedIntensity: detectIntensityFromLoad(actualLoad, activityMinutes),
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
