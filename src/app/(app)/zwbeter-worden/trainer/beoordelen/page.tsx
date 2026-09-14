// Beoordelen-tab: workouts die een renner heeft bevestigd en die nog op een
// oordeel van de trainer wachten.
//
// Deze pagina ging tot 2026-08-20 over één renner tegelijk, net als de andere
// trainerstabs. Dat bleek de reden dat er 55 bevestigde beoordelingen lagen met
// twee reacties: je moest elk lid apart aanklikken om te ontdekken dat er iets
// wachtte. Nu staat alles op één stapel, oudste eerst, met de naam van het lid
// erbij — het beoordeelformulier zelf is ongewijzigd.

import { EmptyState } from "@/components/app-ui";
import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
import { normalizeWorkoutBlocks, type WorkoutIntensity } from "@/lib/training/workouts";
import { ReviewQueue, type ReviewQueueItem } from "../_components/review-queue";
import { loadAssignments, trainerViewer } from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReportRow = {
  workout_id: string;
  profile_id: string;
  metrics_json: WorkoutMetricsSnapshot | null;
  athlete_rpe: number | null;
  athlete_feel: string | null;
  athlete_report: string | null;
  athlete_confirmed_at: string;
};

export default async function TrainerReviewPage() {
  const viewer = await trainerViewer();
  if (!viewer.access.has("training.view_assigned")) {
    return <EmptyState>Je hebt geen trainer-rechten.</EmptyState>;
  }

  const assignments = await loadAssignments(viewer);
  const athleteIds = assignments.map((assignment) => assignment.athlete_id);
  if (athleteIds.length === 0) return <EmptyState>Geen toegewezen leden.</EmptyState>;

  const { data: reportRows } = await viewer.supabase
    .from("training_workout_reports")
    .select(
      "workout_id, profile_id, metrics_json, athlete_rpe, athlete_feel, athlete_report, athlete_confirmed_at",
    )
    .in("profile_id", athleteIds)
    .not("athlete_confirmed_at", "is", null)
    .is("trainer_reviewed_at", null)
    // Oudste eerst: wat het langst ligt, wacht het langst op antwoord.
    .order("athlete_confirmed_at", { ascending: true })
    .limit(25);

  // Zonder momentopname valt er niets te beoordelen; dat is een rapportage uit
  // het oude paneel, die staat al bij de workout zelf.
  const reports = ((reportRows ?? []) as ReportRow[]).filter(
    (report) => report.metrics_json?.plannedTitle,
  );

  const [{ data: workoutRows }, { data: profileRows }] = await Promise.all([
    reports.length
      ? viewer.supabase
          .from("training_workouts")
          .select("id, title, scheduled_at, intensity, structure_json")
          .in(
            "id",
            reports.map((report) => report.workout_id),
          )
      : Promise.resolve({ data: [] }),
    viewer.supabase
      .from("profiles")
      .select("id, display_name, ftp_watts, weight_kg")
      .in("id", athleteIds),
  ]);

  const workouts = new Map(
    (
      (workoutRows ?? []) as Array<{
        id: string;
        title: string;
        scheduled_at: string;
        intensity: string;
        structure_json: unknown;
      }>
    ).map((workout) => [workout.id, workout]),
  );
  const profielen = new Map(
    (
      (profileRows ?? []) as Array<{
        id: string;
        display_name: string | null;
        ftp_watts: number | null;
        weight_kg: number | null;
      }>
    ).map((row) => [row.id, row]),
  );

  const items: ReviewQueueItem[] = reports.flatMap((report) => {
    const workout = workouts.get(report.workout_id);
    const metrics = report.metrics_json;
    if (!workout || !metrics) return [];
    const profiel = profielen.get(report.profile_id);
    return [
      {
        workoutId: report.workout_id,
        title: workout.title,
        athleteName: profiel?.display_name ?? "ZWB-lid",
        scheduledAt: workout.scheduled_at,
        metrics,
        blocks: normalizeWorkoutBlocks(
          workout.structure_json,
          workout.intensity as WorkoutIntensity,
        ),
        ftpWatts: profiel?.ftp_watts == null ? null : Number(profiel.ftp_watts),
        weightKg: profiel?.weight_kg == null ? null : Number(profiel.weight_kg),
        athleteRpe: report.athlete_rpe,
        athleteFeel: report.athlete_feel,
        athleteReport: report.athlete_report,
        confirmedAt: report.athlete_confirmed_at,
      },
    ];
  });

  if (items.length === 0) {
    return <EmptyState>Niets te beoordelen.</EmptyState>;
  }

  return <ReviewQueue items={items} />;
}
