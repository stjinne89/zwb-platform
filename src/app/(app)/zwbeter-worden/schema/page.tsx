import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { StravaAttribution } from "@/components/strava-brand";
import { intervalsWeekUrl } from "@/lib/intervals/links";
import {
  detectIntensityFromLoad,
  intensityLabel,
  normalizeWorkoutBlocks,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { currentPlanOf, groupByRoot } from "@/lib/training/plan-tree";
import { zrlUpcomingSpecificityWarning } from "@/lib/training/specificity";
import { AdaptationProposal } from "../_components/adaptation-proposal";
import { AvailabilityForm } from "../_components/availability-form";
import { workoutOutcome } from "../_components/completed-workouts";
import { EventChoice } from "../_components/event-choice";
import { FtpTestCard } from "../_components/ftp-test-card";
import { PlanCheckCard } from "../_components/plan-check-card";
import { PlanActions } from "../_components/plan-actions";
import { PlanRideForm } from "../_components/plan-ride-form";
import { CollapsibleCard, PlanBadge } from "../_components/ui";
import {
  WorkoutBlocks,
  WorkoutTitle,
  intervalsWorkoutUrl,
} from "../_components/workout-blocks";
import {
  MemberWorkoutCalendar,
  type MemberCalendarItem,
} from "../_components/member-calendar";
import { byWorkout, formatDayMonth, paramString } from "../_components/format";
import { PlanUpdateForm } from "../_components/plan-update-form";
import { ZrlContextNotice } from "../_components/zrl-context-notice";
import type { GoalRow, SearchParamsProp, WorkoutReportRow } from "../_components/types";
import {
  activePlan,
  externalIntervalsEvents,
  loadAvailabilityOptions,
  loadConnection,
  loadFtpTestState,
  loadIgnoredStreak,
  loadIntervalsSnapshot,
  loadMemberWorkouts,
  loadPlanFamilies,
  loadProfile,
  loadScheduleEventChoices,
  loadUnplannedRides,
  loadZrlTeamMembership,
  planUpdateDefaults,
  requireViewer,
  todayKeyAmsterdam,
  upcomingIntervalsEvents,
} from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export default async function ZwbeterWordenSchemaPage({ searchParams }: SearchParamsProp) {
  const params = (await searchParams) ?? {};
  // Maand is de ingang: daar zie je in één blik je week én kun je een training
  // aanklikken. De lijst blijft als alternatief bestaan.
  const workoutView = paramString(params.view) === "lijst" ? "lijst" : "maand";
  const viewer = await requireViewer();

  const [profile, conn] = await Promise.all([loadProfile(viewer), loadConnection(viewer)]);
  const [
    snapshot,
    plans,
    { data: reportRows },
    { data: goalRows },
    availabilityOptions,
    ftpTestState,
    ignoredStreak,
    zrlTeamMember,
  ] =
    await Promise.all([
      loadIntervalsSnapshot(viewer, conn, { eventDays: 14 }),
      loadPlanFamilies(viewer),
      viewer.supabase
        .from("training_workout_reports")
        .select("*")
        .eq("profile_id", viewer.user.id)
        .order("updated_at", { ascending: false }),
      viewer.supabase
        .from("training_goals")
        .select("*")
        .eq("profile_id", viewer.user.id)
        .order("created_at", { ascending: false }),
      loadAvailabilityOptions(viewer),
      loadFtpTestState(viewer),
      loadIgnoredStreak(viewer),
      loadZrlTeamMembership(viewer),
    ]);

  const memberWorkouts = await loadMemberWorkouts(viewer, snapshot.events);
  const todayKey = todayKeyAmsterdam();
  const reports = (reportRows ?? []) as WorkoutReportRow[];
  const reportsByWorkout = byWorkout(reports);

  // Ritten waar geen training voor stond: een extra herstelrondje, een groepsrit,
  // of de tweede helft van een rit die onderweg in tweeën is geknipt. Zonder
  // deze regel verdween die belasting uit het schema terwijl hij in de benen
  // wel degelijk meetelde.
  const extraRides = await loadUnplannedRides(
    viewer,
    memberWorkouts,
    reports,
    profile?.ftp_watts == null ? null : Number(profile.ftp_watts),
  );

  // Een aanpassing is een afgeleid plan, maar hoort in het schema waar hij op
  // ingrijpt. Vandaar de groepering per familie in plaats van per plan.
  const families = groupByRoot(plans);

  // Alleen wat het lid buiten ZWB om heeft gepland; onze eigen gepubliceerde
  // workouts staan al in de lijst hierboven.
  const otherEvents = externalIntervalsEvents(snapshot.events, memberWorkouts);
  const upcomingEvents = upcomingIntervalsEvents(otherEvents, 5);
  const upcomingWorkouts = memberWorkouts
    .filter((workout) => String(workout.scheduled_at).slice(0, 10) >= todayKey)
    .slice(0, 8);

  const canSelfManagePlans = viewer.access.has("training.create_plans");
  const canSelfPublishPlans = viewer.access.has("training.publish_plans");
  const runningPlan = activePlan(plans);
  const eventChoices = await loadScheduleEventChoices(viewer, runningPlan);
  const runningGoal = runningPlan?.goal_id
    ? ((goalRows ?? []) as GoalRow[]).find((goal) => goal.id === runningPlan.goal_id) ?? null
    : null;
  const zrlMessages: string[] = [];
  if (zrlTeamMember && runningPlan && runningGoal?.goal_type !== "zrl") {
    zrlMessages.push(
      "Je rijdt in een ZRL-team, maar je lopende schema is niet aan een ZRL-doel gekoppeld. Daardoor stuurt de planner niet bewust op ZRL-prikkels.",
    );
  }
  if (runningGoal?.goal_type === "zrl") {
    const zrlEvents = eventChoices.filter((event) => event.type === "zrl");
    if (zrlEvents.length === 0) {
      zrlMessages.push("Er staan geen ZRL-races binnen de looptijd van dit schema.");
    } else if (!zrlEvents.some((event) => event.rsvp === "yes" || event.inSchedule)) {
      zrlMessages.push("Geef bij de ZRL-races aan welke je rijdt, zodat ze als kwaliteitsprikkel meetellen.");
    }
    const specificityWarning = zrlUpcomingSpecificityWarning(
      runningGoal.goal_type,
      memberWorkouts,
      todayKey,
    );
    if (specificityWarning) zrlMessages.push(specificityWarning);
  }
  // Bijwerken is voor wie zijn eigen schema beheert; heeft het lid een trainer,
  // dan doet die het vanuit de trainer-pagina.
  const updateDefaults = canSelfManagePlans
    ? planUpdateDefaults(activePlan(plans), (goalRows ?? []) as GoalRow[])
    : null;

  // Maandweergave toont de hele maand, dus ook wat al geweest is. Elke
  // ZWB-workout draagt zijn eigen detail mee, zodat een klik meteen laat zien
  // hoe de training eruitziet of hoe hij ging.
  const calendarItems: MemberCalendarItem[] = [
    ...memberWorkouts.map((workout) => {
      const report = reportsByWorkout.get(workout.id);
      const published = workout.publish_status === "published" && workout.intervals_event_id;
      return {
        id: workout.id,
        dateKey: String(workout.scheduled_at).slice(0, 10),
        title: workout.title,
        durationMinutes: workout.duration_minutes,
        intensity: workout.intensity,
        source: "zwb" as const,
        skipped: workout.status === "skipped",
        detail: {
          outcome: workoutOutcome(workout, report, todayKey),
          description: workout.description,
          blocks: normalizeWorkoutBlocks(
            workout.structure_json,
            workout.intensity as WorkoutIntensity,
          ),
          intervalsUrl: workout.intervals_event_id
            ? intervalsWorkoutUrl(conn?.athlete_id, workout)
            : null,
          fitUrl: published ? `/api/training/workouts/${workout.id}/fit` : null,
          rpe: report?.athlete_rpe ?? null,
          feel: report?.athlete_feel ?? null,
          report: report?.athlete_report ?? null,
          trainerFeedback: report?.trainer_feedback ?? null,
          metrics: report?.metrics_json ?? null,
        },
      };
    }),
    ...otherEvents.map((event) => ({
      id: `intervals-${event.id}`,
      dateKey: String(event.start_date_local).slice(0, 10),
      title: event.name ?? "Workout",
      durationMinutes: event.moving_time ? Math.round(event.moving_time / 60) : null,
      intensity: null,
      source: "intervals" as const,
      skipped: false,
    })),
    ...extraRides.map((ride) => ({
      id: `rit-${ride.id}`,
      dateKey: ride.dateKey,
      title: ride.name,
      durationMinutes: ride.metrics.movingMinutes,
      // De zone volgt uit de gereden belasting; zonder vermogensmeter blijft hij
      // leeg en kleurt de kalender de rit neutraal.
      intensity: detectIntensityFromLoad(ride.metrics.tss, ride.metrics.movingMinutes),
      source: "rit" as const,
      skipped: false,
      ride: {
        stravaId: ride.id,
        distanceKm: ride.distanceKm,
        metrics: ride.metrics,
      },
    })),
  ];

  return (
    <div className="space-y-4">
      {conn?.athlete_id ? (
        <a
          href={intervalsWeekUrl(conn.athlete_id, todayKey)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 transition hover:border-primary/40"
        >
          <h2 className="font-semibold">Bekijk schema in intervals.icu</h2>
          <ExternalLink className="size-5 shrink-0 text-muted-foreground" />
        </a>
      ) : null}

      <ZrlContextNotice messages={zrlMessages} />

      <CollapsibleCard
        title="Mijn trainingen"
        subtitle="Uit ZWB-schema's, intervals.icu en je gereden ritten"
        defaultOpen
      >
        <div className="flex justify-end border-b p-2">
          <div className="flex rounded-md border bg-background p-0.5 text-xs">
            {(
              [
                { value: "lijst", label: "Lijst" },
                { value: "maand", label: "Maand" },
              ] as const
            ).map((option) => (
              <Link
                key={option.value}
                href={`/zwbeter-worden/schema?view=${option.value}`}
                scroll={false}
                className={`rounded px-2 py-1 font-medium ${
                  workoutView === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
        {workoutView === "maand" ? (
          <MemberWorkoutCalendar
            items={calendarItems}
            todayKey={todayKey}
            ftpWatts={profile?.ftp_watts}
          />
        ) : upcomingEvents.length === 0 && upcomingWorkouts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Geen geplande workouts.</p>
        ) : (
          <ul className="divide-y">
            {upcomingWorkouts.map((workout) => (
              <li key={workout.id} className="p-4">
                <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                  <span className="text-sm text-muted-foreground">
                    {formatDayMonth(workout.scheduled_at)}
                  </span>
                  <div className="min-w-0">
                    <WorkoutTitle workout={workout} athleteId={conn?.athlete_id} />
                    <p className="text-xs text-muted-foreground">
                      ZWB-schema - {workout.duration_minutes} min -{" "}
                      {intensityLabel(workout.intensity)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {workout.status === "skipped" ? "Rustdag" : workout.publish_status}
                  </span>
                </div>
                <WorkoutBlocks
                  blocks={normalizeWorkoutBlocks(
                    workout.structure_json,
                    workout.intensity as WorkoutIntensity,
                  )}
                  ftpWatts={profile?.ftp_watts}
                />
                {workout.publish_status === "published" && workout.intervals_event_id ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`/api/training/workouts/${workout.id}/fit`}
                      className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      <Download className="size-3" />
                      Download FIT
                    </a>
                  </div>
                ) : workout.origin === "member" ? null : (
                  <p className="mt-2 text-xs text-muted-foreground">FIT nog niet beschikbaar.</p>
                )}
              </li>
            ))}
            {upcomingEvents.map((event) => (
              <li
                key={String(event.id)}
                className="grid gap-2 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center"
              >
                <span className="text-sm text-muted-foreground">
                  {formatDayMonth(event.start_date_local)}
                </span>
                <p className="truncate font-medium">{event.name ?? "Workout"}</p>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {event.icu_training_load ? `${Math.round(event.icu_training_load)} TSS` : "-"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleCard>

      {/* Vier ongereden trainingen op rij: dan herzien we niet meer vanzelf en
          vragen we het gewoon. Zie plan-check-card.tsx. */}
      {ignoredStreak ? <PlanCheckCard missedCount={ignoredStreak} /> : null}

      <AvailabilityForm options={availabilityOptions} />

      <EventChoice events={eventChoices} />

      {runningPlan ? <PlanRideForm todayKey={todayKey} /> : null}

      {/* Inplannen doet de trainer; hier vult het lid alleen zijn uitslag in.
          Zonder test in zicht en zonder historie valt er niets te tonen. */}
      {ftpTestState.awaitingResult || ftpTestState.upcoming || ftpTestState.lastTest ? (
        <FtpTestCard
          upcoming={ftpTestState.upcoming}
          awaitingResult={ftpTestState.awaitingResult}
          lastTest={ftpTestState.lastTest}
        />
      ) : null}

      {updateDefaults ? <PlanUpdateForm defaults={updateDefaults} /> : null}

      <CollapsibleCard title="Mijn ZWB-schema's" defaultOpen>
        {families.length === 0 ? (
          <EmptyState>Geen ZWB-trainingsschema&apos;s.</EmptyState>
        ) : (
          <div className="divide-y">
            {families.map(({ root, derived }) => {
              // Openstaande bijstellingen tonen we als voorstel binnen het
              // schema; de overige aanpassingen zitten al in de workoutlijst.
              const proposals = derived.filter(
                (plan) => plan.status === "draft" && plan.adaptation_kind === "daily",
              );
              // De omschrijving van het schema zoals het nu loopt. Het basisplan
              // draagt nog de tekst van de eerste generatie, met uitgangspunten
              // die sindsdien zijn bijgesteld.
              const current = currentPlanOf({ root, derived });
              return (
                <article key={root.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div>
                      <h3 className="font-semibold">{root.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDayMonth(root.start_date, false)} -{" "}
                        {formatDayMonth(root.end_date, false)}
                      </p>
                    </div>
                    <PlanBadge status={root.status} />
                  </div>
                  {proposals.map((proposal) => (
                    <AdaptationProposal key={proposal.id} proposal={proposal} />
                  ))}
                  {canSelfManagePlans || canSelfPublishPlans ? (
                    <div className="border-y p-3">
                      <PlanActions
                        planId={root.id}
                        status={root.status}
                        mayApprove={canSelfManagePlans}
                        mayPublish={canSelfPublishPlans}
                      />
                    </div>
                  ) : null}
                  {current.summary && (
                    <p className="px-4 pb-3 text-sm text-muted-foreground whitespace-pre-line">
                      {current.summary}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </CollapsibleCard>

      {/* De kalender toont nu ritdata uit Strava; de brand guidelines vragen het
          merk op elk scherm waar die data staat. */}
      {extraRides.length > 0 ? <StravaAttribution /> : null}
    </div>
  );
}
