// Beoordelen-tab: workouts die de renner heeft bevestigd en die nog op een
// oordeel van de trainer wachten.

import { EmptyState } from "@/components/app-ui";
import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
import type { SearchParamsProp } from "../../_components/types";
import { ReviewQueue, type ReviewQueueItem } from "../_components/review-queue";
import { trainerContext } from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReportRow = {
  workout_id: string;
  metrics_json: WorkoutMetricsSnapshot | null;
  athlete_rpe: number | null;
  athlete_feel: string | null;
  athlete_report: string | null;
  athlete_confirmed_at: string;
};

export default async function TrainerReviewPage({ searchParams }: SearchParamsProp) {
  const context = await trainerContext(searchParams);
  if (!context.ok) {
    return (
      <EmptyState>
        {context.reason === "no-permission"
          ? "Je hebt geen trainer-rechten."
          : "Geen toegewezen leden."}
      </EmptyState>
    );
  }
  const { viewer, athleteId } = context;

  const { data: reportRows } = await viewer.supabase
    .from("training_workout_reports")
    .select("workout_id, metrics_json, athlete_rpe, athlete_feel, athlete_report, athlete_confirmed_at")
    .eq("profile_id", athleteId)
    .not("athlete_confirmed_at", "is", null)
    .is("trainer_reviewed_at", null)
    .order("athlete_confirmed_at", { ascending: false })
    .limit(10);

  // Zonder momentopname valt er niets te beoordelen; dat is een rapportage uit
  // het oude paneel, die staat al bij de workout zelf.
  const reports = ((reportRows ?? []) as ReportRow[]).filter(
    (report) => report.metrics_json?.plannedTitle,
  );

  const { data: workoutRows } = reports.length
    ? await viewer.supabase
        .from("training_workouts")
        .select("id, title, scheduled_at")
        .in(
          "id",
          reports.map((report) => report.workout_id),
        )
    : { data: [] };

  const workouts = new Map(
    ((workoutRows ?? []) as Array<{ id: string; title: string; scheduled_at: string }>).map(
      (workout) => [workout.id, workout],
    ),
  );

  const items: ReviewQueueItem[] = reports.flatMap((report) => {
    const workout = workouts.get(report.workout_id);
    const metrics = report.metrics_json;
    if (!workout || !metrics) return [];
    return [
      {
        workoutId: report.workout_id,
        title: workout.title,
        scheduledAt: workout.scheduled_at,
        metrics,
        athleteRpe: report.athlete_rpe,
        athleteFeel: report.athlete_feel,
        athleteReport: report.athlete_report,
        confirmedAt: report.athlete_confirmed_at,
      },
    ];
  });

  if (items.length === 0) {
    return <EmptyState>Niets te beoordelen voor dit lid.</EmptyState>;
  }

  return <ReviewQueue items={items} />;
}
