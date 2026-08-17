import { Calendar, ClipboardList, Mountain, ShieldCheck } from "lucide-react";
import {
  intensityLabel,
  normalizeWorkoutBlocks,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { amsterdamDayKey, eftpTrend, zwbeterWordenAdvice } from "@/lib/training/zwbeterworden";
import { toTrainingLoadPoints } from "@/lib/training/load-points";
import {
  suggestSegmentsForBlock,
  type SegmentCandidate,
} from "@/lib/training/segment-suggestions";
import { AdjustTodayForm } from "./_components/adjust-today-form";
import { CoreTodayCard } from "./core/_components/core-today-card";
import { ConnectIntervalsForm } from "./_components/connect-form";
import { RecoveryCard } from "./_components/recovery-card";
import { TrainingLoadMetrics } from "./_components/training-load-chart";
import { MetricCard } from "./_components/ui";
import { WorkoutBlocks, WorkoutTitle, eventWorkoutBlocks } from "./_components/workout-blocks";
import {
  eFTPDeltaLabel,
  formatDayMonth,
  formatHours,
  formatKm,
  formatMeters,
  formatSegmentTime,
  loadSummary,
} from "./_components/format";
import { WorkoutReviewDialog } from "./_components/workout-review-dialog";
import { paramString } from "./_components/format";
import type { SearchParamsProp, SegmentRow, StravaActivityRow } from "./_components/types";
import {
  externalIntervalsEvents,
  lastWellnessDayOf,
  loadConnection,
  loadIntervalsSnapshot,
  loadMemberWorkouts,
  loadPendingReview,
  loadProfile,
  requireViewer,
  todayKeyAmsterdam,
  upcomingIntervalsEvents,
  zwbStatusFor,
} from "./_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export default async function ZwbeterWordenTodayPage({ searchParams }: SearchParamsProp) {
  const params = (await searchParams) ?? {};
  const viewer = await requireViewer();
  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);

  const [profile, conn] = await Promise.all([loadProfile(viewer), loadConnection(viewer)]);

  const [snapshot, { data: stravaRows }, { data: segmentRows }] = await Promise.all([
    loadIntervalsSnapshot(viewer, conn, {
      wellnessDays: 730,
      eventDays: 14,
      withAthleteFtp: true,
      syncActivities: true,
    }),
    viewer.supabase
      .from("strava_activities")
      .select(
        "id, profile_id, name, sport_type, start_date, distance_m, total_elevation_gain_m, kudos_count, moving_time_seconds, trainer",
      )
      .eq("profile_id", viewer.user.id)
      .gte("start_date", since7.toISOString())
      .order("start_date", { ascending: false })
      .limit(40),
    viewer.supabase
      .from("profile_completed_segments")
      .select(
        "segment_slug, best_time_seconds, zwb_segments(name, distance_m, elevation_gain_m, virtual)",
      )
      .eq("profile_id", viewer.user.id)
      .not("best_time_seconds", "is", null)
      .limit(300),
  ]);

  // Na de intervals-sync hierboven, zodat een net gereden rit meteen als
  // afgeronde workout wordt herkend.
  const [memberWorkouts, pendingReview] = await Promise.all([
    loadMemberWorkouts(viewer, snapshot.events),
    loadPendingReview(viewer, paramString(params.review)),
  ]);
  const todayKey = todayKeyAmsterdam();
  const activities = (stravaRows ?? []) as StravaActivityRow[];
  const totals7 = loadSummary(activities);

  const zwbStatus = zwbStatusFor(snapshot.wellness, conn, profile);
  const advice = zwbeterWordenAdvice(zwbStatus.readiness, profile?.zrl_division);
  const { latest: eftpLatest, delta: eftpDelta } = eftpTrend(snapshot.wellness, 90);
  const eftpValue = eftpLatest ?? snapshot.intervalsFtp ?? profile?.ftp_watts ?? null;
  const eftpHint = eftpLatest
    ? eftpDelta !== null
      ? `${eFTPDeltaLabel(eftpDelta)} over 90 dagen`
      : "eFTP uit intervals.icu"
    : snapshot.intervalsFtp
      ? "FTP uit intervals.icu"
      : profile?.ftp_watts
        ? "FTP uit je profiel"
        : "Nog geen eFTP bekend";

  // Toon workouts van VANDAAG of later. Vergelijk op datum (Amsterdam), niet op
  // exact tijdstip — anders verdwijnt de training van vandaag zodra de klok het
  // geplande uur voorbij is.
  const upcomingWorkouts = memberWorkouts.filter(
    (workout) => String(workout.scheduled_at).slice(0, 10) >= todayKey,
  );
  // Een rustdag telt niet als eerstvolgende workout.
  const nextZwbWorkout = upcomingWorkouts.find((workout) => workout.status !== "skipped") ?? null;
  // Zonder deze filter concurreert een gepubliceerde ZWB-workout met zijn eigen
  // intervals.icu-event om de plek van "eerstvolgende workout".
  const nextIntervalsEvent =
    upcomingIntervalsEvents(externalIntervalsEvents(snapshot.events, memberWorkouts), 1)[0] ??
    null;
  const nextWorkout =
    nextZwbWorkout && nextIntervalsEvent
      ? new Date(nextZwbWorkout.scheduled_at).getTime() <=
        new Date(nextIntervalsEvent.start_date_local).getTime()
        ? { kind: "zwb" as const, workout: nextZwbWorkout }
        : { kind: "intervals" as const, event: nextIntervalsEvent }
      : nextZwbWorkout
        ? { kind: "zwb" as const, workout: nextZwbWorkout }
        : nextIntervalsEvent
          ? { kind: "intervals" as const, event: nextIntervalsEvent }
          : null;

  // Segmenten die bij het zwaarste blok van de eerstvolgende workout passen.
  const riddenSegments: SegmentCandidate[] = ((segmentRows ?? []) as SegmentRow[]).flatMap(
    (row) => {
      const segment = Array.isArray(row.zwb_segments) ? row.zwb_segments[0] : row.zwb_segments;
      if (!segment) return [];
      return [
        {
          slug: row.segment_slug,
          name: segment.name,
          distanceM: segment.distance_m == null ? null : Number(segment.distance_m),
          elevationGainM:
            segment.elevation_gain_m == null ? null : Number(segment.elevation_gain_m),
          virtual: Boolean(segment.virtual),
          bestTimeSeconds: row.best_time_seconds,
        },
      ];
    },
  );
  const hardestBlock =
    nextWorkout?.kind === "zwb"
      ? normalizeWorkoutBlocks(
          nextWorkout.workout.structure_json,
          nextWorkout.workout.intensity as WorkoutIntensity,
        )
          .filter((block) => block.intensity !== "rest" && block.intensity !== "recovery")
          .sort((a, b) => b.durationMinutes - a.durationMinutes)[0]
      : null;
  const segmentSuggestions = hardestBlock
    ? suggestSegmentsForBlock(hardestBlock, riddenSegments)
    : [];

  return (
    <div className="space-y-6">
      {snapshot.fetchError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {snapshot.fetchError}
        </p>
      )}

      {!conn && <ConnectIntervalsForm />}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <TrainingLoadMetrics
          points={toTrainingLoadPoints(snapshot.wellness)}
          ctl={zwbStatus.ctl}
          tsb={zwbStatus.tsb}
          today={todayKey}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Trainingsruimte"
          value={zwbStatus.readiness.score != null ? `${zwbStatus.readiness.score}` : "-"}
          hint={advice.title}
        />
        <MetricCard
          icon={Mountain}
          label="eFTP"
          value={eftpValue ? `${Math.round(eftpValue)}w` : "-"}
          hint={eftpHint}
        />
        <MetricCard
          icon={Calendar}
          label="7 dagen totaal"
          value={formatKm(totals7.distance)}
          hint={
            activities.length > 0
              ? `${activities.length} ritten - ${formatHours(totals7.time)} - ${formatMeters(totals7.elevation)}`
              : "Nog geen recente Strava-ritten"
          }
        />
      </section>

      {conn && (
        <RecoveryCard
          optIn={Boolean(conn.wellness_opt_in)}
          summary={zwbStatus.recoverySummary}
          advice={advice}
          lastWellnessDay={lastWellnessDayOf(snapshot.wellness)}
        />
      )}

      {nextWorkout && (
        <section className="rounded-lg border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <ClipboardList className="size-5 text-primary" />
            Eerstvolgende workout
          </h2>
          {nextWorkout.kind === "zwb" ? (
            <div className="mt-4">
              <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                <span className="text-sm text-muted-foreground">
                  {formatDayMonth(nextWorkout.workout.scheduled_at)}
                </span>
                <div className="min-w-0">
                  <WorkoutTitle workout={nextWorkout.workout} athleteId={conn?.athlete_id} />
                  <p className="text-xs text-muted-foreground">
                    ZWB-schema - {nextWorkout.workout.duration_minutes} min -{" "}
                    {intensityLabel(nextWorkout.workout.intensity)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {nextWorkout.workout.publish_status}
                </span>
              </div>
              <WorkoutBlocks
                blocks={normalizeWorkoutBlocks(
                  nextWorkout.workout.structure_json,
                  nextWorkout.workout.intensity as WorkoutIntensity,
                )}
                ftpWatts={profile?.ftp_watts}
                variant="preview"
              />
              {segmentSuggestions.length > 0 ? (
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Segmenten voor het zware blok
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {segmentSuggestions.map((segment) => (
                      <span key={segment.slug} className="rounded-full border px-3 py-1 text-xs">
                        {segment.name}
                        <span className="ml-1.5 text-muted-foreground tabular-nums">
                          {formatSegmentTime(segment.estimatedSeconds)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                <span className="text-sm text-muted-foreground">
                  {formatDayMonth(nextWorkout.event.start_date_local)}
                </span>
                <p className="truncate font-medium">{nextWorkout.event.name ?? "Workout"}</p>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {nextWorkout.event.icu_training_load
                    ? `${Math.round(nextWorkout.event.icu_training_load)} TSS`
                    : "intervals.icu"}
                </span>
              </div>
              <WorkoutBlocks
                blocks={eventWorkoutBlocks(nextWorkout.event)}
                ftpWatts={profile?.ftp_watts}
                variant="preview"
              />
            </div>
          )}
        </section>
      )}

      <CoreTodayCard
        viewer={viewer}
        today={todayKey}
        context={{
          hasPlannedWorkoutToday: memberWorkouts.some(
            (workout) =>
              String(workout.scheduled_at).slice(0, 10) === todayKey &&
              workout.status !== "skipped",
          ),
          rodeToday: activities.some(
            (activity) => amsterdamDayKey(new Date(activity.start_date)) === todayKey,
          ),
        }}
      />

      <AdjustTodayForm />

      {pendingReview ? <WorkoutReviewDialog review={pendingReview} /> : null}
    </div>
  );
}
