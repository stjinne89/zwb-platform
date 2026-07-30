// Lijst met workouts binnen een schema. `editable` schakelt tussen de
// trainer-weergave (inline formulier per workout) en de lees-weergave voor het
// lid.

import Link from "next/link";
import { CircleHelp, Download, FileText, MessageSquare } from "lucide-react";
import {
  INTENSITY_LABELS,
  intensityLabel,
  normalizeWorkoutBlocks,
  WORKOUT_INTENSITIES,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { targetHint } from "@/lib/training/targets";
import { saveTrainerFeedback, saveWorkoutReport, updateWorkout } from "../_actions";
import { dateValue, formAction, formatDayMonth, timeValue } from "./format";
import type { WorkoutReportRow, WorkoutRow } from "./types";
import { WorkoutBlocks, WorkoutTitle } from "./workout-blocks";

function ReportPanel({
  workout,
  report,
  editable,
}: {
  workout: WorkoutRow;
  report?: WorkoutReportRow;
  editable: boolean;
}) {
  return (
    <details className="mt-3 rounded-md border bg-background/60 p-3">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <MessageSquare className="size-4" />
        Rapportage en feedback
      </summary>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <form action={formAction(saveWorkoutReport)} className="space-y-2">
          <input type="hidden" name="workout_id" value={workout.id} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              RPE
              <input
                name="athlete_rpe"
                type="number"
                min="1"
                max="10"
                defaultValue={report?.athlete_rpe ?? ""}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Gevoel
              <select
                name="athlete_feel"
                defaultValue={report?.athlete_feel ?? ""}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
              >
                <option value="">-</option>
                <option value="goed">Goed</option>
                <option value="neutraal">Neutraal</option>
                <option value="zwaar">Zwaar</option>
                <option value="slecht">Slecht</option>
              </select>
            </label>
          </div>
          <textarea
            name="athlete_report"
            rows={3}
            defaultValue={report?.athlete_report ?? ""}
            placeholder="Hoe ging deze workout?"
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
          {!editable ? (
            <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
              Rapportage opslaan
            </button>
          ) : null}
        </form>
        <form action={formAction(saveTrainerFeedback)} className="space-y-2">
          <input type="hidden" name="workout_id" value={workout.id} />
          <textarea
            name="trainer_feedback"
            rows={5}
            defaultValue={report?.trainer_feedback ?? ""}
            placeholder="Feedback van de trainer"
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
          {editable ? (
            <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
              Feedback opslaan
            </button>
          ) : null}
        </form>
      </div>
    </details>
  );
}

export function WorkoutList({
  workouts,
  editable,
  ftpWatts,
  reports,
  intervalsAthleteId,
}: {
  workouts: WorkoutRow[];
  editable: boolean;
  ftpWatts?: number | null;
  reports?: Map<string, WorkoutReportRow>;
  intervalsAthleteId?: string;
}) {
  if (workouts.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Nog geen workouts in dit schema.</p>;
  }

  return (
    <ul className="divide-y">
      {workouts.map((workout) => {
        const blocks = normalizeWorkoutBlocks(
          workout.structure_json,
          workout.intensity as WorkoutIntensity,
        );
        const report = reports?.get(workout.id);
        return (
          <li key={workout.id} className="p-4">
            {editable ? (
              <form
                action={formAction(updateWorkout)}
                className="grid gap-3 lg:grid-cols-[120px_90px_1fr_90px_120px_auto] lg:items-end"
              >
                <input type="hidden" name="workout_id" value={workout.id} />
                <label className="text-xs text-muted-foreground">
                  Datum
                  <input
                    name="date"
                    type="date"
                    defaultValue={dateValue(workout.scheduled_at)}
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Tijd
                  <input
                    name="time"
                    type="time"
                    defaultValue={timeValue(workout.scheduled_at)}
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Titel
                  <input
                    name="title"
                    defaultValue={workout.title}
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Minuten
                  <input
                    name="duration_minutes"
                    type="number"
                    min="1"
                    max="480"
                    defaultValue={workout.duration_minutes}
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Intensiteit
                  <select
                    name="intensity"
                    defaultValue={workout.intensity}
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                  >
                    {Object.entries(INTENSITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <input type="hidden" name="target_type" value={workout.target_type} />
                <button className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
                  Opslaan
                </button>
                <label className="lg:col-span-6 text-xs text-muted-foreground">
                  Instructie
                  <textarea
                    name="description"
                    defaultValue={workout.description ?? ""}
                    rows={2}
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                  />
                </label>
                <div className="lg:col-span-6 rounded-md border bg-background/60 p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <FileText className="size-3" />
                    Intervalblokken
                  </p>
                  <div className="space-y-2">
                    {[
                      ...blocks,
                      {
                        label: "",
                        durationMinutes: 5,
                        target: "",
                        notes: "",
                        intensity: workout.intensity as WorkoutIntensity,
                      },
                    ].map((block, idx) => (
                      <div
                        key={idx}
                        className="grid gap-2 rounded-md border p-2 lg:grid-cols-[1fr_80px_1fr_1fr_130px_90px]"
                      >
                        <input
                          name="block_label"
                          defaultValue={block.label}
                          placeholder="Blok"
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                        />
                        <input
                          name="block_duration"
                          type="number"
                          min="0"
                          max="480"
                          defaultValue={block.durationMinutes || ""}
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                        />
                        <input
                          name="block_target"
                          defaultValue={block.target}
                          placeholder="Doel"
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                        />
                        <input
                          name="block_notes"
                          defaultValue={block.notes}
                          placeholder="Notitie"
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                        />
                        <select
                          name="block_intensity"
                          defaultValue={block.intensity}
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                        >
                          {WORKOUT_INTENSITIES.map((value) => (
                            <option key={value} value={value}>
                              {INTENSITY_LABELS[value]}
                            </option>
                          ))}
                        </select>
                        <select
                          name="block_delete"
                          defaultValue="0"
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                        >
                          <option value="0">Bewaar</option>
                          <option value="1">Verwijder</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            ) : (
              <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                <span className="text-sm text-muted-foreground">
                  {formatDayMonth(workout.scheduled_at)}
                </span>
                <div className="min-w-0">
                  <WorkoutTitle workout={workout} athleteId={intervalsAthleteId} />
                  <p className="text-xs text-muted-foreground">
                    {workout.duration_minutes} min - {intensityLabel(workout.intensity)}
                    {workout.publish_status === "failed"
                      ? ` - publicatiefout: ${workout.publish_error}`
                      : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{workout.publish_status}</span>
              </div>
            )}
            <WorkoutBlocks blocks={blocks} ftpWatts={ftpWatts} />
            {workout.structure_json && workout.structure_json.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {blocks.slice(0, 5).map((step, idx) => {
                  const hint = targetHint({
                    ftpWatts,
                    intensity: step.intensity,
                    target: step.target,
                    notes: step.notes,
                  });
                  return (
                    <span
                      key={idx}
                      className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {step.label ?? "Blok"} {step.durationMinutes ? `${step.durationMinutes}m` : ""}{" "}
                      {step.target ?? ""}
                      {hint ? ` - ${hint}` : ""}
                    </span>
                  );
                })}
              </div>
            )}
            {workout.publish_status === "published" && workout.intervals_event_id ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`/api/training/workouts/${workout.id}/fit`}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <Download className="size-3" />
                  Download FIT
                </a>
                <Link
                  href="/hulp#fit-export"
                  title="Hulp bij workout op je fietscomputer"
                  aria-label="Hulp bij workout op je fietscomputer"
                  className="inline-flex items-center rounded-md border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <CircleHelp className="size-3.5" />
                </Link>
              </div>
            ) : null}
            <ReportPanel workout={workout} report={report} editable={editable} />
          </li>
        );
      })}
    </ul>
  );
}
