// Koppelt een gereden rit aan de geplande workout van die dag, zet de workout op
// 'completed' en legt een momentopname van de cijfers vast. Dat is de basis onder
// het bevestigscherm van het lid en de beoordelingsrij van de trainer.
//
// De cijfers komen uit strava_activities, niet uit intervals.icu: dat laatste
// geeft via de API niets terug voor activiteiten die daar via Strava zijn
// binnengekomen (zie ride-metrics.ts). CTL en de gereedscore komen wél uit
// intervals — die zitten in de wellness-reeks, en die is niet geblokkeerd.
//
// Bewust los van strava_activity_summaries: die tabel wordt alleen gevuld als
// STRAVA_ZWB_SUMMARY_SINCE is gezet én het lid Strava activity:write heeft gegeven.

import type { createAdminClient } from "@/lib/supabase/admin";
import { fetchIntervalsWellness, type IntervalsWellness } from "@/lib/intervals/client";
import { sendNotificationToMembers } from "@/lib/push/send";
import {
  complianceVerdict,
  loadPercentage,
  pickRideForWorkout,
  type ComplianceVerdict,
} from "@/lib/training/compliance";
import {
  EMPTY_RIDE_METRICS,
  rideMetricsFromStrava,
  STRAVA_RIDE_COLUMNS,
  type RideMetrics,
  type StravaRideRow,
} from "@/lib/training/ride-metrics";
import { targetHint } from "@/lib/training/targets";
import type { WellnessDevice } from "@/lib/training/wellness";
import {
  estimateTrainingLoad,
  intensityLabel,
  normalizeWorkoutBlocks,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { amsterdamDayKey, computeZwbStatus } from "@/lib/training/zwbeterworden";

type Admin = ReturnType<typeof createAdminClient>;

/** Hoe ver terug we workouts nog aan een rit proberen te koppelen. */
export const COMPLETION_WINDOW_DAYS = 7;

/**
 * Momentopname bij een afgeronde workout. CTL en de gereedscore worden nergens
 * bewaard en komen per request live uit intervals.icu; zonder snapshot zou het
 * bevestigscherm elke keer andere getallen tonen dan op de dag van de rit.
 */
export type WorkoutMetricsSnapshot = {
  tss: number | null;
  intensityFactor: number | null;
  normalizedWatts: number | null;
  averageWatts: number | null;
  averageHr: number | null;
  maxHr: number | null;
  averageCadence: number | null;
  movingMinutes: number | null;
  /** Zonder vermogensmeter blijven TSS en IF leeg; dit legt uit waarom. */
  hasPowerMeter: boolean;
  plannedMinutes: number | null;
  plannedLoad: number | null;
  plannedTitle: string;
  plannedIntensity: string;
  /** Leesbare samenvatting van het doel: zone/% en, indien bekend, wattage. */
  targetSummary: string;
  targetType: string;
  ctlBefore: number | null;
  ctlAfter: number | null;
  readinessScore: number | null;
  readinessLevel: number | null;
  readinessTitle: string | null;
  loadPct: number | null;
  verdict: ComplianceVerdict;
};

export type PlannedWorkoutRow = {
  id: string;
  profile_id: string;
  trainer_id: string | null;
  scheduled_at: string;
  title: string;
  duration_minutes: number | null;
  intensity: string;
  target_type: string;
  structure_json: unknown;
  intervals_event_id: string | null;
};

/**
 * Beschrijft het doel van de workout in één regel: het type doel plus de band
 * van het zwaarste blok, en het wattage daarbij als de FTP bekend is.
 */
export function targetSummaryFor(
  workout: Pick<PlannedWorkoutRow, "intensity" | "structure_json" | "target_type">,
  ftpWatts: number | null,
): string {
  const blocks = normalizeWorkoutBlocks(
    workout.structure_json,
    workout.intensity as WorkoutIntensity,
  );
  const key = blocks
    .filter((block) => block.intensity !== "rest" && block.intensity !== "recovery")
    .sort((a, b) => b.durationMinutes - a.durationMinutes)[0];
  if (!key) return intensityLabel(workout.intensity);

  const hint = targetHint({
    ftpWatts,
    intensity: key.intensity,
    target: key.target,
    notes: key.notes,
  });
  return [intensityLabel(key.intensity), key.target || null, hint]
    .filter(Boolean)
    .join(" · ");
}

/** CTL van de dag ervoor en van de dag zelf, uit de wellness-reeks. */
export function ctlAround(
  wellness: IntervalsWellness[],
  dayKey: string,
): { before: number | null; after: number | null } {
  const sorted = [...wellness].sort((a, b) => a.id.localeCompare(b.id));
  const onOrBefore = (key: string) =>
    [...sorted].reverse().find((row) => row.id <= key && row.ctl != null)?.ctl ?? null;
  const previousDay = new Date(`${dayKey}T12:00:00Z`);
  previousDay.setUTCDate(previousDay.getUTCDate() - 1);
  return {
    before: onOrBefore(previousDay.toISOString().slice(0, 10)),
    after: onOrBefore(dayKey),
  };
}

export function buildMetricsSnapshot({
  workout,
  ride,
  ftpWatts,
  ctl,
  readiness,
}: {
  workout: PlannedWorkoutRow;
  ride: StravaRideRow | null;
  ftpWatts: number | null;
  ctl: { before: number | null; after: number | null };
  readiness: { score: number | null; level: number | null; title: string | null };
}): WorkoutMetricsSnapshot {
  const blocks = normalizeWorkoutBlocks(
    workout.structure_json,
    workout.intensity as WorkoutIntensity,
  );
  const plannedLoad = blocks.length > 0 ? estimateTrainingLoad(blocks) : null;
  const metrics: RideMetrics = ride
    ? rideMetricsFromStrava(ride.raw, ride.moving_time_seconds, ftpWatts)
    : EMPTY_RIDE_METRICS;
  const loadPct = loadPercentage(metrics.tss, plannedLoad);

  return {
    tss: metrics.tss,
    intensityFactor: metrics.intensityFactor,
    normalizedWatts: metrics.normalizedWatts,
    averageWatts: metrics.averageWatts,
    averageHr: metrics.averageHr,
    maxHr: metrics.maxHr,
    averageCadence: metrics.averageCadence,
    movingMinutes: metrics.movingMinutes,
    hasPowerMeter: metrics.hasPowerMeter,
    plannedMinutes: workout.duration_minutes ?? null,
    plannedLoad,
    plannedTitle: workout.title,
    plannedIntensity: workout.intensity,
    targetSummary: targetSummaryFor(workout, ftpWatts),
    targetType: workout.target_type,
    ctlBefore: ctl.before,
    ctlAfter: ctl.after,
    readinessScore: readiness.score,
    readinessLevel: readiness.level,
    readinessTitle: readiness.title,
    loadPct,
    verdict: complianceVerdict(loadPct, Boolean(ride)),
  };
}

export type CompletionResult = {
  completed: number;
  refreshed: number;
  notified: number;
  /** Ten onrechte afgeronde workouts die weer op 'gepland' staan. */
  reverted: number;
};

/**
 * Zet een workout terug op 'gepland' en gooit de lege rapportage weg. Alleen als
 * het lid er zelf nog niets in heeft gezet: RPE, gevoel of een opmerking maken
 * de rapportage van het lid, en die blijft.
 */
async function revertEmptyCompletion(
  admin: Admin,
  workoutId: string,
  profileId: string,
): Promise<boolean> {
  const { data: deleted } = await admin
    .from("training_workout_reports")
    .delete()
    .eq("workout_id", workoutId)
    .eq("profile_id", profileId)
    .is("athlete_confirmed_at", null)
    .is("athlete_rpe", null)
    .is("athlete_feel", null)
    .is("athlete_report", null)
    .is("trainer_feedback", null)
    .select("id");
  if ((deleted ?? []).length === 0) return false;

  await admin
    .from("training_workouts")
    .update({ status: "planned" })
    .eq("id", workoutId)
    .eq("status", "completed");
  return true;
}

type ExistingReport = {
  workout_id: string;
  athlete_confirmed_at: string | null;
  metrics_json: Partial<WorkoutMetricsSnapshot> | null;
};

/**
 * Zoekt workouts uit de afgelopen week waar een rit bij hoort, markeert die als
 * gereden en zet de cijfers klaar voor het bevestigscherm.
 *
 * Neemt ook al afgeronde workouts mee waarvan de momentopname leeg is en het lid
 * nog niet heeft bevestigd. Zo repareren die zichzelf; nodig omdat de cijfers
 * eerst uit intervals.icu kwamen, en dat blijkt voor Strava-ritten niets terug te
 * geven. Zodra het lid bevestigt raken we de momentopname niet meer aan.
 */
export async function detectCompletedWorkouts(
  admin: Admin,
  profileId: string,
): Promise<CompletionResult> {
  const empty: CompletionResult = { completed: 0, refreshed: 0, notified: 0, reverted: 0 };
  const now = Date.now();
  const fromIso = new Date(now - COMPLETION_WINDOW_DAYS * 86400_000).toISOString();

  const { data: workoutRows } = await admin
    .from("training_workouts")
    .select(
      "id, profile_id, trainer_id, scheduled_at, title, duration_minutes, intensity, target_type, structure_json, intervals_event_id, status",
    )
    .eq("profile_id", profileId)
    .in("status", ["planned", "completed"])
    .is("superseded_at", null)
    .neq("intensity", "rest")
    .gte("scheduled_at", fromIso)
    .lte("scheduled_at", new Date(now).toISOString())
    .order("scheduled_at", { ascending: true });

  const workouts = (workoutRows ?? []) as Array<PlannedWorkoutRow & { status: string }>;
  if (workouts.length === 0) return empty;

  const { data: reportRows } = await admin
    .from("training_workout_reports")
    .select("workout_id, athlete_confirmed_at, metrics_json")
    .in(
      "workout_id",
      workouts.map((workout) => workout.id),
    );
  const reports = new Map(
    ((reportRows ?? []) as ExistingReport[]).map((row) => [row.workout_id, row]),
  );

  const { data: rideRows } = await admin
    .from("strava_activities")
    .select(STRAVA_RIDE_COLUMNS)
    .eq("profile_id", profileId)
    // Een dag extra marge: een rit die 's avonds laat begon valt in Amsterdam-tijd
    // nog op de vorige dag.
    .gte("start_date", new Date(now - (COMPLETION_WINDOW_DAYS + 1) * 86400_000).toISOString());
  const rides = (rideRows ?? []) as StravaRideRow[];
  if (rides.length === 0) return empty;

  const [{ data: profile }, { data: conn }] = await Promise.all([
    admin
      .from("profiles")
      .select("ftp_watts, zrl_division, wellness_device")
      .eq("id", profileId)
      .maybeSingle(),
    admin
      .from("intervals_connections")
      .select("api_key, athlete_id, wellness_opt_in")
      .eq("profile_id", profileId)
      .maybeSingle(),
  ]);

  const wellness =
    conn?.api_key && conn.athlete_id
      ? await fetchIntervalsWellness(conn.api_key, conn.athlete_id, 120).catch(() => [])
      : [];
  const status = computeZwbStatus(wellness, {
    wellnessOptIn: Boolean(conn?.wellness_opt_in),
    zrlDivision: profile?.zrl_division ?? null,
    wellnessDevice: (profile?.wellness_device ?? null) as WellnessDevice | null,
  });
  const ftpWatts = profile?.ftp_watts == null ? null : Number(profile.ftp_watts);

  const used = new Set<number>();
  const result: CompletionResult = { completed: 0, refreshed: 0, notified: 0, reverted: 0 };

  for (const workout of workouts) {
    const available = rides.filter((row) => !used.has(row.id));
    const match = pickRideForWorkout(
      available,
      workout.scheduled_at,
      workout.duration_minutes ?? null,
    );
    const report = reports.get(workout.id);
    const isNew = workout.status === "planned";
    // Al afgerond, maar de momentopname is leeg gebleven en het lid heeft nog
    // niet bevestigd: opnieuw berekenen met de huidige bron.
    const isEmptySnapshot =
      !isNew &&
      Boolean(report) &&
      !report?.athlete_confirmed_at &&
      (report?.metrics_json?.tss ?? null) === null;

    if (!match) {
      // Afgerond op een koppeling die niet blijkt te bestaan — bijvoorbeeld aan
      // een activiteit die geen fietsrit was. Terugdraaien, anders blijft het
      // lid een leeg bevestigscherm zien voor een training die niet is gereden.
      if (isEmptySnapshot && (await revertEmptyCompletion(admin, workout.id, profileId))) {
        result.reverted++;
      }
      continue;
    }
    // De rit hoort nu bij deze workout; anders zou een volgende workout op
    // dezelfde dag hem alsnog opeisen.
    used.add(match.id);

    if (!isNew && !isEmptySnapshot) continue;

    const dayKey = amsterdamDayKey(new Date(workout.scheduled_at));
    const metrics = buildMetricsSnapshot({
      workout,
      ride: match,
      ftpWatts,
      ctl: ctlAround(wellness, dayKey),
      readiness: {
        score: status.readiness.score ?? null,
        level: status.advice.level || null,
        title: status.advice.title || null,
      },
    });

    if (!isNew) {
      // Alleen de cijfers bijwerken; RPE, gevoel en opmerking blijven staan.
      const { error } = await admin
        .from("training_workout_reports")
        .update({
          paired_activity_id: String(match.id),
          metrics_json: metrics,
          updated_by: profileId,
        })
        .eq("workout_id", workout.id)
        .eq("profile_id", profileId)
        .is("athlete_confirmed_at", null);
      if (!error) result.refreshed++;
      continue;
    }

    // Alleen afronden zolang de workout nog op 'planned' staat: zo kan een
    // tweede sync (of de fallback bij het renderen) niets overschrijven wat het
    // lid intussen zelf heeft ingevuld.
    const { data: claimed } = await admin
      .from("training_workouts")
      .update({ status: "completed" })
      .eq("id", workout.id)
      .eq("status", "planned")
      .select("id");
    if ((claimed ?? []).length === 0) continue;

    const { error } = await admin.from("training_workout_reports").upsert(
      {
        workout_id: workout.id,
        profile_id: profileId,
        trainer_id: workout.trainer_id,
        paired_activity_id: String(match.id),
        intervals_event_id: workout.intervals_event_id,
        metrics_json: metrics,
        created_by: profileId,
        updated_by: profileId,
      },
      { onConflict: "workout_id,profile_id" },
    );
    if (error) continue;
    result.completed++;

    const push = await sendNotificationToMembers(
      "on_workout_review",
      {
        title: "Bevestig je training",
        body: `${workout.title} staat klaar met je cijfers. Vul RPE en gevoel in.`,
        url: `/zwbeter-worden?review=${workout.id}`,
        tag: `workout-review-${workout.id}`,
      },
      { profileIds: [profileId] },
    ).catch(() => null);
    if (push?.sent) result.notified++;
  }

  return result;
}
