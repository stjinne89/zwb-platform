import { loadSubjectiveRecovery } from "@/lib/training/subjective-recovery";
import { Calendar, Mountain } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/app-ui";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request";
import { Power } from "@/components/power-unit";
import { StravaAttribution } from "@/components/strava-brand";
import { normalizeWorkoutBlocks, type WorkoutIntensity } from "@/lib/training/workouts";
import { amsterdamDayKey, eftpTrend } from "@/lib/training/zwbeterworden";
import { toTrainingLoadPoints } from "@/lib/training/load-points";
import { hasRecoveryValues } from "@/lib/training/wellness";
import { PROJECTION_DAYS, scheduleProjection } from "@/lib/training/load-projection";
import { shiftDays } from "@/lib/training/season";
import {
  suggestSegmentsForBlock,
  type SegmentCandidate,
} from "@/lib/training/segment-suggestions";
import {
  hasRideToday,
  hasTrainingAhead,
  showsTirePressure,
  vandaagDay,
  vandaagSections,
  type VandaagSection,
} from "@/lib/training/vandaag-day";
import { CoreTodayCard } from "./core/_components/core-today-card";
import { ProtocolTodayCard } from "./_components/protocols/protocol-today-card";
import { NutritionTodayCard } from "./voeding/_components/nutrition-today-card";
import { BandendrukTodayCard } from "./materiaal/_components/bandendruk-today-card";
import { plannedSessions, ridesOnDay } from "@/lib/nutrition/recipes";
import { ConnectIntervalsForm } from "./_components/connect-form";
import { RecoveryCard } from "./_components/recovery-card";
import { TodayCard, type TodayHub } from "./_components/today-card";
import { TodayStand } from "./_components/today-stand";
import { MetricCard } from "./_components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUpcomingRace, loadWarmupOptions, raceWarmupView } from "@/lib/training/race-warmup";
import {
  eFTPDeltaLabel,
  formatHours,
  formatKm,
  formatMeters,
  loadSummary,
} from "./_components/format";
import { WorkoutReviewDialog, type PendingReview } from "./_components/workout-review-dialog";
import { paramString } from "./_components/format";
import type { SearchParamsProp, SegmentRow, StravaActivityRow } from "./_components/types";
import {
  externalIntervalsEvents,
  lastWellnessDayOf,
  loadConnection,
  loadIntervalsSnapshot,
  loadMemberWorkouts,
  loadOutdoorSuggestionViews,
  loadPendingReview,
  loadPlannedLoads,
  loadZwiftSuggestionViews,
  loadPlanSummaries,
  planCautionsFromSummary,
  loadProfile,
  requireViewer,
  todayKeyAmsterdam,
  upcomingIntervalsEvents,
  zwbStatusFor,
} from "./_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

async function PendingReviewDialog({ review }: { review: Promise<PendingReview | null> }) {
  const pendingReview = await review;
  return pendingReview ? (
    <WorkoutReviewDialog key={pendingReview.workoutId} review={pendingReview} />
  ) : null;
}

export default async function ZwbeterWordenTodayPage({ searchParams }: SearchParamsProp) {
  const params = (await searchParams) ?? {};
  // Wie het is weten we zonder de database (JWT); profiel en koppeling vertrekken
  // daarom tegelijk met de rechten in plaats van erna.
  const [supabase, user] = await Promise.all([createClient(), getRequestUser()]);
  if (!user) redirect("/login");
  const identity = { supabase, user };
  const [viewer, profile, conn] = await Promise.all([
    requireViewer(),
    loadProfile(identity),
    loadConnection(identity),
  ]);
  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);
  const todayKey = todayKeyAmsterdam();

  const [snapshot, { data: stravaRows }, { data: segmentRows }, plannedLoads] = await Promise.all([
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
    loadPlannedLoads(
      viewer,
      todayKey,
      shiftDays(todayKey, PROJECTION_DAYS),
      profile?.ftp_watts == null ? null : Number(profile.ftp_watts),
    ).catch(() => []),
  ]);

  // Na de intervals-sync hierboven, zodat een net gereden rit meteen als
  // afgeronde workout wordt herkend.
  // Het bevestigscherm van een gereden training (PendingReview, onderaan) wacht
  // hier niet meer op mee: het herkennen van afgeronde workouts kostte 1,0-1,7 s
  // van de 2,1 s die deze pagina nodig had (gemeten 2026-10-01), en voedt alleen
  // dat scherm. Het start hier wel, direct na de sync van de ritten.
  const pendingReviewPromise = loadPendingReview(viewer, paramString(params.review)).catch(
    () => null,
  );
  const [memberWorkouts, planSummaries, warmupOptions, subjective] = await Promise.all([
    loadMemberWorkouts(viewer, snapshot.events),
    loadPlanSummaries(viewer),
    loadWarmupOptions(createAdminClient()).catch(() => []),
    loadSubjectiveRecovery(viewer.supabase, viewer.user.id, { includeSymptoms: true }).catch(
      () => null,
    ),
  ]);
  const activities = (stravaRows ?? []) as StravaActivityRow[];
  const totals7 = loadSummary(activities);

  const zwbStatus = zwbStatusFor(snapshot.wellness, conn, profile, subjective);
  const loadPoints = toTrainingLoadPoints(snapshot.wellness);
  const advice = zwbStatus.advice;
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

  const ftpWatts = profile?.ftp_watts == null ? null : Number(profile.ftp_watts);

  // Zonder deze filter concurreert een gepubliceerde ZWB-workout met zijn eigen
  // intervals.icu-event om de plek van "eerstvolgende workout".
  const nextIntervalsEvent =
    upcomingIntervalsEvents(externalIntervalsEvents(snapshot.events, memberWorkouts), 1)[0] ??
    null;
  // Wat voor dag het is bepaalt de hele indeling hieronder (2026-11-23).
  const day = vandaagDay(
    memberWorkouts,
    todayKey,
    nextIntervalsEvent ? String(nextIntervalsEvent.start_date_local).slice(0, 10) : null,
  );
  const nextZwbWorkout = day.open ?? day.next;
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
  // De training waar de kaart helemaal over gaat. Is de dag klaar, dan staat de
  // volgende alleen als rij en horen er geen routes of segmenten bij.
  const cardWorkout =
    hasTrainingAhead(day.state) && nextWorkout?.kind === "zwb" ? nextWorkout.workout : null;

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
  const hardestBlock = cardWorkout
    ? normalizeWorkoutBlocks(cardWorkout.structure_json, cardWorkout.intensity as WorkoutIntensity)
        .filter((block) => block.intensity !== "rest" && block.intensity !== "recovery")
        .sort((a, b) => b.durationMinutes - a.durationMinutes)[0]
    : null;
  const segmentSuggestions = hardestBlock
    ? suggestSegmentsForBlock(hardestBlock, riddenSegments)
    : [];

  // Waarom staat er vandaag negentig minuten terwijl er twee uur beschikbaar is?
  // Dat antwoord stond alleen in de samenvatting van het schema, waar niemand
  // kijkt. Zie plan-cautions.tsx: bedoeld om mee te kijken zolang we leren hoe
  // streng de opbouwregels uitpakken.
  const planCautions = cardWorkout?.plan_id
    ? planCautionsFromSummary(planSummaries.get(cardWorkout.plan_id))
    : [];

  // Vandaag is de hub van de dag. De Zwift-events en buitenrondjes bij de
  // eerstvolgende training staan daarom hier in plaats van in het schema
  // (besluit eigenaar, 2026-10-12).
  const [hubZwift, hubOutdoor] = cardWorkout
    ? await Promise.all([
        loadZwiftSuggestionViews(viewer, [cardWorkout]),
        loadOutdoorSuggestionViews(viewer, [cardWorkout]),
      ])
    : [null, null];
  const cardIsRace = cardWorkout?.intensity === "race";
  const hub: TodayHub | null =
    cardWorkout && hubZwift && hubOutdoor
      ? {
          workoutId: cardWorkout.id,
          // Een race rijd je niet als Zwift-event uit de voorstellen; een eerder
          // gekozen event blijft wel staan.
          zwiftMatches: cardIsRace ? [] : (hubZwift.suggestions.get(cardWorkout.id) ?? []),
          zwiftChosen: hubZwift.chosen.get(cardWorkout.id) ?? null,
          routes: hubOutdoor.routes.get(cardWorkout.id) ?? [],
          startPoints: hubOutdoor.startPoints,
          outdoor: !cardIsRace,
        }
      : null;

  // Het advies staat bij de training die eraan komt; is de dag klaar, dan bij je
  // herstel. Alleen voor wie herstel-data deelt, zoals op de herstelkaart.
  const cardAdvice =
    hasTrainingAhead(day.state) &&
    conn?.wellness_opt_in &&
    zwbStatus.recoverySummary &&
    advice.level > 0
      ? advice
      : null;
  const adjustOpen = paramString(params.aanpassen) === "1";

  const tires = showsTirePressure(day.state) ? <BandendrukTodayCard viewer={viewer} /> : null;
  const core = (
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
  );
  const protocols = <ProtocolTodayCard viewer={viewer} today={todayKey} />;
  const nutrition = (
    <NutritionTodayCard
      viewer={viewer}
      today={todayKey}
      day={{
        ...plannedSessions(memberWorkouts, todayKey),
        ridesToday: ridesOnDay(activities, todayKey),
        readinessState: zwbStatus.readiness.state,
        wellnessState: zwbStatus.recoverySummary?.state ?? null,
      }}
    />
  );

  const sections: Record<VandaagSection, ReactNode> = {
    rit: (
      <TodayGroup key="rit" title="Klaar voor de rit">
        {nutrition}
        {tires}
        {core}
      </TodayGroup>
    ),
    ook: (
      <TodayGroup key="ook" title="Ook vandaag">
        {hasRideToday(day.state) ? (
          protocols
        ) : (
          <>
            {nutrition}
            {tires}
            {core}
            {protocols}
          </>
        )}
      </TodayGroup>
    ),
    stand: (
      <TodayGroup key="stand" title="Hoe je ervoor staat">
        {!conn ? <ConnectIntervalsForm /> : null}
        <TodayStand
          points={loadPoints}
          ctl={zwbStatus.ctl}
          tsb={zwbStatus.tsb}
          today={todayKey}
          projection={scheduleProjection({ today: todayKey, points: loadPoints, planned: plannedLoads })}
          readiness={zwbStatus.readiness.score}
          adviceTitle={advice.title}
          recoveryNeedsAttention={
            Boolean(conn?.wellness_opt_in) && !hasRecoveryValues(zwbStatus.recoverySummary)
          }
          recovery={
            conn ? (
              <RecoveryCard
                optIn={Boolean(conn.wellness_opt_in)}
                summary={zwbStatus.recoverySummary}
                advice={cardAdvice ? null : advice}
                lastWellnessDay={lastWellnessDayOf(snapshot.wellness)}
              />
            ) : null
          }
          eftp={
            <MetricCard
              icon={Mountain}
              iconClassName="max-lg:hidden"
              label="eFTP"
              value={
                <span className="block text-[1.75rem] leading-[1.1] lg:text-[2.5rem]">
                  {eftpValue ? <Power watts={eftpValue} /> : "-"}
                </span>
              }
              hint={eftpHint}
            />
          }
          week={
            <MetricCard
              icon={Calendar}
              iconClassName="max-lg:hidden"
              label="7 dagen totaal"
              value={
                <span className="block text-[1.75rem] leading-[1.1] lg:text-[2.5rem]">
                  {formatKm(totals7.distance)}
                </span>
              }
              hint={
                activities.length > 0
                  ? `${activities.length} ritten - ${formatHours(totals7.time)} - ${formatMeters(totals7.elevation)}`
                  : "Nog geen recente Strava-ritten"
              }
            />
          }
        />
      </TodayGroup>
    ),
    dag: (
      <TodayCard
        key="dag"
        state={day.state}
        upcoming={nextWorkout}
        closed={day.closed}
        today={todayKey}
        ftpWatts={ftpWatts}
        athleteId={conn?.athlete_id}
        advice={cardAdvice}
        cautions={planCautions}
        hub={hub}
        warmup={
          cardWorkout && isUpcomingRace(cardWorkout, todayKey)
            ? raceWarmupView(cardWorkout, memberWorkouts, warmupOptions)
            : null
        }
        segments={segmentSuggestions}
        adjust={{
          show: hasTrainingAhead(day.state) || adjustOpen,
          initialOpen: adjustOpen,
          canRest: day.open != null,
        }}
      />
    ),
  };

  return (
    <div className="space-y-7">
      {snapshot.fetchError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {snapshot.fetchError}
        </p>
      )}

      {vandaagSections(day.state).map((section) => sections[section])}

      <Suspense fallback={null}>
        <PendingReviewDialog review={pendingReviewPromise} />
      </Suspense>

      <StravaAttribution />
    </div>
  );
}

// De kaarten bepalen zelf of ze iets te tonen hebben; blijft de groep leeg, dan
// verdwijnt ook de kop.
function TodayGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="has-[>div:empty]:hidden">
      <SectionHeader title={title} />
      <div className="space-y-3">{children}</div>
    </section>
  );
}
