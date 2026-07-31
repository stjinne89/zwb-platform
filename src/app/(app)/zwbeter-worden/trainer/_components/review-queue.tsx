// Bevestigde workouts die de trainer nog niet heeft beoordeeld. Toont exact
// dezelfde cijfers als het lid in zijn bevestigscherm zag (WorkoutMetricsPanel),
// aangevuld met wat het lid zelf invulde, zodat trainer en renner het over
// dezelfde weergave hebben.

import { ClipboardCheck } from "lucide-react";
import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
import { WorkoutMetricsPanel } from "../../_components/workout-metrics-panel";
import { reviewWorkoutAsTrainer } from "../../_actions";
import { formAction, formatDayMonth } from "../../_components/format";

export type ReviewQueueItem = {
  workoutId: string;
  title: string;
  scheduledAt: string;
  metrics: WorkoutMetricsSnapshot;
  athleteRpe: number | null;
  athleteFeel: string | null;
  athleteReport: string | null;
  confirmedAt: string;
};

const FEEL_LABELS: Record<string, string> = {
  goed: "Goed",
  neutraal: "Neutraal",
  zwaar: "Zwaar",
  slecht: "Slecht",
};

/** Wat het lid zelf invulde. Staat los van de cijfers uit de rit. */
function AthleteInput({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md bg-muted/60 px-2 py-1 text-xs">
      {label} <strong className="tabular-nums">{value}</strong>
    </span>
  );
}

export function ReviewQueue({ items }: { items: ReviewQueueItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <ClipboardCheck className="size-5 text-primary" />
          Te beoordelen
        </h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {items.length}
        </span>
      </div>
      <ul className="divide-y">
        {items.map((item) => {
          const { metrics } = item;
          return (
            <li key={item.workoutId} className="space-y-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDayMonth(item.scheduledAt)}
                </p>
              </div>

              <WorkoutMetricsPanel metrics={metrics} />

              <div className="flex flex-wrap gap-1.5">
                <AthleteInput
                  label="RPE"
                  value={item.athleteRpe == null ? "-" : `${item.athleteRpe}`}
                />
                <AthleteInput
                  label="Gevoel"
                  value={item.athleteFeel ? FEEL_LABELS[item.athleteFeel] ?? item.athleteFeel : "-"}
                />
              </div>

              {item.athleteReport ? (
                <p className="rounded-md bg-muted/40 p-3 text-sm whitespace-pre-line">
                  {item.athleteReport}
                </p>
              ) : null}

              <form action={formAction(reviewWorkoutAsTrainer)} className="space-y-2">
                <input type="hidden" name="workout_id" value={item.workoutId} />
                <textarea
                  name="trainer_feedback"
                  rows={2}
                  placeholder="Feedback voor het lid"
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    name="trainer_status"
                    value="approved"
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                  >
                    Goedkeuren
                  </button>
                  <button
                    name="trainer_status"
                    value="adjusted"
                    className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    Afhandelen en schema bijwerken
                  </button>
                </div>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
