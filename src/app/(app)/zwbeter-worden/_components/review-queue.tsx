// Bevestigde workouts die de trainer nog niet heeft beoordeeld. Eén regel per
// training met de cijfers en de naleving, zodat je in één oogopslag ziet hoe het
// ging voordat je feedback geeft of het schema bijstelt.

import { ClipboardCheck } from "lucide-react";
import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
import { COMPLIANCE_LABELS, type ComplianceVerdict } from "@/lib/training/compliance";
import { reviewWorkoutAsTrainer } from "../_actions";
import { formAction, formatDayMonth, formatNumber } from "./format";

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

const VERDICT_CLASS: Record<ComplianceVerdict, string> = {
  niet_gereden: "bg-muted text-muted-foreground",
  te_licht: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  volgens_plan: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  te_zwaar: "bg-destructive/15 text-destructive",
};

const FEEL_LABELS: Record<string, string> = {
  goed: "Goed",
  neutraal: "Neutraal",
  zwaar: "Zwaar",
  slecht: "Slecht",
};

function Fact({ label, value }: { label: string; value: string }) {
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
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDayMonth(item.scheduledAt)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_CLASS[metrics.verdict]}`}
                >
                  {COMPLIANCE_LABELS[metrics.verdict]}
                  {metrics.loadPct != null ? ` · ${metrics.loadPct}%` : ""}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Fact label="TSS" value={formatNumber(metrics.tss ?? undefined)} />
                <Fact
                  label="Duur"
                  value={metrics.movingMinutes == null ? "-" : `${metrics.movingMinutes} min`}
                />
                <Fact label="IF" value={formatNumber(metrics.intensityFactor ?? undefined, 2)} />
                <Fact
                  label="NP"
                  value={
                    metrics.normalizedWatts == null
                      ? "-"
                      : `${formatNumber(metrics.normalizedWatts)}w`
                  }
                />
                <Fact
                  label="Gem. HR"
                  value={metrics.averageHr == null ? "-" : `${formatNumber(metrics.averageHr)}`}
                />
                <Fact label="RPE" value={item.athleteRpe == null ? "-" : `${item.athleteRpe}`} />
                <Fact
                  label="Gevoel"
                  value={item.athleteFeel ? FEEL_LABELS[item.athleteFeel] ?? item.athleteFeel : "-"}
                />
                <Fact
                  label="Gepland"
                  value={
                    metrics.plannedLoad == null
                      ? `${metrics.plannedMinutes ?? "-"} min`
                      : `${metrics.plannedLoad} TSS`
                  }
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
