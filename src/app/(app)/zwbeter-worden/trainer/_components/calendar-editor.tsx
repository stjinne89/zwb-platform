"use client";

// Maandweergave voor de trainer: dezelfde kalender als het lid ziet, maar de
// blokjes zijn aanklikbaar. Onder de kalender staat dan de gekozen training,
// die de trainer daar meteen kan bijstellen of in zijn geheel kan vervangen
// door een workout uit de bibliotheek.

import { useState } from "react";
import { INTENSITY_LABELS, WORKOUT_INTENSITIES, type WorkoutBlock } from "@/lib/training/workouts";
import { replaceWorkoutFromTemplate, saveTrainerFeedback, updateWorkout } from "../../_actions";
import { BlockEditor } from "../../_components/block-editor";
import { FEEL_LABELS, formAction } from "../../_components/format";
import {
  WorkoutCalendar,
  type CalendarWorkout,
} from "../../_components/workout-calendar";

export type CalendarEditWorkout = {
  id: string;
  dateKey: string;
  /** "09:00", zoals het datum/tijd-veld van het bewerkformulier hem wil. */
  time: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  intensity: string;
  targetType: string;
  blocks: WorkoutBlock[];
  skipped: boolean;
  publishStatus: string;
};

export type CalendarTemplate = {
  id: string;
  title: string;
  durationMinutes: number;
  intensity: string;
};

/** Wat het lid over deze training invulde, plus de feedback die er al staat. */
export type CalendarReport = {
  workoutId: string;
  rpe: number | null;
  feel: string | null;
  report: string | null;
  trainerFeedback: string | null;
};

const FIELD = "mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm";

function intensityName(intensity: string) {
  return INTENSITY_LABELS[intensity as keyof typeof INTENSITY_LABELS] ?? intensity;
}

/** Het bewerkformulier van één training; zelfde velden als in de schemalijst. */
function WorkoutEditor({
  workout,
  templates,
  report,
  ftpWatts,
}: {
  workout: CalendarEditWorkout;
  templates: CalendarTemplate[];
  report?: CalendarReport;
  ftpWatts?: number | null;
}) {
  return (
    <div className="mt-4 space-y-4 rounded-md border bg-background/60 p-4">
      <form
        // key op de workout: anders houdt React de ingevulde waarden vast als de
        // trainer een andere training in de kalender aanklikt.
        key={workout.id}
        action={formAction(updateWorkout)}
        className="space-y-3"
      >
        <input type="hidden" name="workout_id" value={workout.id} />
        <input type="hidden" name="target_type" value={workout.targetType} />

        <div className="grid gap-2 lg:grid-cols-[140px_100px_1fr_90px_140px]">
          <label className="text-xs text-muted-foreground">
            Datum
            <input name="date" type="date" defaultValue={workout.dateKey} className={FIELD} />
          </label>
          <label className="text-xs text-muted-foreground">
            Tijd
            <input name="time" type="time" defaultValue={workout.time} className={FIELD} />
          </label>
          <label className="text-xs text-muted-foreground">
            Titel
            <input name="title" defaultValue={workout.title} className={FIELD} />
          </label>
          <label className="text-xs text-muted-foreground">
            Minuten
            <input
              name="duration_minutes"
              type="number"
              min="1"
              max="480"
              defaultValue={workout.durationMinutes}
              className={FIELD}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Intensiteit
            <select name="intensity" defaultValue={workout.intensity} className={FIELD}>
              {WORKOUT_INTENSITIES.map((value) => (
                <option key={value} value={value}>
                  {INTENSITY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-xs text-muted-foreground">
          Instructie
          <textarea
            name="description"
            rows={2}
            defaultValue={workout.description ?? ""}
            className={FIELD}
          />
        </label>

        <BlockEditor
          blocks={workout.blocks}
          fallbackIntensity={workout.intensity}
          ftpWatts={ftpWatts}
        />

        <button className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
          Opslaan
        </button>
      </form>

      <div className="space-y-2 border-t pt-3">
        {report && (report.rpe != null || report.feel || report.report) ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Het lid meldde</p>
            <p className="text-sm">
              {[
                report.rpe != null ? `RPE ${report.rpe}` : null,
                report.feel ? (FEEL_LABELS[report.feel] ?? report.feel) : null,
              ]
                .filter(Boolean)
                .join(" · ") || "-"}
            </p>
            {report.report ? (
              <p className="rounded-md bg-muted/40 p-2 text-sm whitespace-pre-line">
                {report.report}
              </p>
            ) : null}
          </div>
        ) : null}

        <form key={`feedback-${workout.id}`} action={formAction(saveTrainerFeedback)} className="space-y-2">
          <input type="hidden" name="workout_id" value={workout.id} />
          <label className="block text-xs text-muted-foreground">
            Feedback voor het lid
            <textarea
              name="trainer_feedback"
              rows={2}
              defaultValue={report?.trainerFeedback ?? ""}
              className={FIELD}
            />
          </label>
          <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
            Feedback opslaan
          </button>
        </form>
      </div>

      {templates.length > 0 ? (
        <form
          key={`replace-${workout.id}`}
          action={formAction(replaceWorkoutFromTemplate)}
          className="flex flex-wrap items-end gap-2 border-t pt-3"
        >
          <input type="hidden" name="workout_id" value={workout.id} />
          <label className="min-w-0 flex-1 text-xs text-muted-foreground">
            Vervang door bibliotheek-workout
            <select name="template_id" className={FIELD} defaultValue="">
              <option value="" disabled>
                Kies een workout
              </option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title} - {template.durationMinutes} min - {intensityName(template.intensity)}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
            Vervangen
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function TrainerWorkoutCalendar({
  workouts,
  templates,
  reports = [],
  todayKey,
  ftpWatts,
}: {
  workouts: CalendarEditWorkout[];
  templates: CalendarTemplate[];
  reports?: CalendarReport[];
  todayKey: string;
  /** Voor de vermogensbanden in de blokkenbalk. */
  ftpWatts?: number | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = workouts.find((workout) => workout.id === selectedId) ?? null;

  const cells: CalendarWorkout[] = workouts.map((workout) => ({
    id: workout.id,
    dateKey: workout.dateKey,
    title: workout.title,
    durationMinutes: workout.durationMinutes,
    intensity: workout.intensity,
    source: "zwb",
    skipped: workout.skipped,
  }));

  return (
    <div>
      <WorkoutCalendar
        workouts={cells}
        todayKey={todayKey}
        onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
        selectedId={selectedId}
      />
      <div className="px-4 pb-4">
        {selected ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{selected.title}</p>
              <p className="text-xs text-muted-foreground">
                {selected.dateKey} - {selected.durationMinutes} min -{" "}
                {intensityName(selected.intensity)} - {selected.publishStatus}
              </p>
            </div>
            <WorkoutEditor
              workout={selected}
              templates={templates}
              report={reports.find((row) => row.workoutId === selected.id)}
              ftpWatts={ftpWatts}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Klik een training in de kalender om hem aan te passen.
          </p>
        )}
      </div>
    </div>
  );
}
