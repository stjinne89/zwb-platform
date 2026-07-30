"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
import { COMPLIANCE_LABELS } from "@/lib/training/compliance";
import { confirmWorkoutReview } from "../_actions";

export type PendingReview = {
  workoutId: string;
  title: string;
  dateLabel: string;
  description: string | null;
  metrics: WorkoutMetricsSnapshot;
  athleteRpe: number | null;
  athleteFeel: string | null;
  athleteReport: string | null;
};

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

function nl(value: number | null | undefined, digits = 0) {
  if (value == null) return "-";
  return value.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-3 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm tabular-nums">{value}</span>
    </div>
  );
}

/** "26 · niveau 2 – RICHT OP HERSTEL", zodat de score zichzelf duidt. */
function readinessLabel(metrics: WorkoutMetricsSnapshot) {
  if (metrics.readinessScore == null) return "-";
  if (!metrics.readinessLevel) return `${metrics.readinessScore}`;
  const suffix = metrics.readinessTitle
    ? `niveau ${metrics.readinessLevel} – ${metrics.readinessTitle}`
    : `niveau ${metrics.readinessLevel}`;
  return `${metrics.readinessScore} · ${suffix}`;
}

function ctlLabel(metrics: WorkoutMetricsSnapshot) {
  const { ctlBefore, ctlAfter } = metrics;
  if (ctlBefore == null && ctlAfter == null) return "-";
  if (ctlBefore == null || ctlAfter == null) return nl(ctlAfter ?? ctlBefore, 1);
  const delta = ctlAfter - ctlBefore;
  const sign = delta > 0 ? "+" : "";
  return `${nl(ctlBefore, 1)} → ${nl(ctlAfter, 1)} (${sign}${nl(delta, 1)})`;
}

function complianceLabel(metrics: WorkoutMetricsSnapshot) {
  const verdict = COMPLIANCE_LABELS[metrics.verdict];
  if (metrics.loadPct == null) return verdict;
  return `${verdict} · ${metrics.loadPct}% van gepland`;
}

/** TSS en IF leunen op genormaliseerd vermogen; zonder meter blijven ze leeg. */
function powerNote(metrics: WorkoutMetricsSnapshot) {
  if (metrics.hasPowerMeter || metrics.movingMinutes == null) return null;
  return "Zonder vermogensmeter zijn TSS en IF niet te bepalen.";
}

export function WorkoutReviewDialog({ review }: { review: PendingReview }) {
  const [open, setOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { metrics } = review;

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await confirmWorkoutReview(formData);
      if (!result.ok) {
        setError(result.error ?? "Bevestigen faalde.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{review.title}</DialogTitle>
          <DialogDescription>
            {review.dateLabel} · {complianceLabel(metrics)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="TSS" value={nl(metrics.tss)} />
          <Stat
            label="Duur"
            value={metrics.movingMinutes == null ? "-" : `${metrics.movingMinutes} min`}
          />
          <Stat label="IF" value={nl(metrics.intensityFactor, 2)} />
          <Stat
            label="Gem. HR"
            value={metrics.averageHr == null ? "-" : `${nl(metrics.averageHr)} bpm`}
          />
          <Stat
            label="Gem. vermogen"
            value={metrics.averageWatts == null ? "-" : `${nl(metrics.averageWatts)}w`}
          />
          <Stat
            label="NP"
            value={metrics.normalizedWatts == null ? "-" : `${nl(metrics.normalizedWatts)}w`}
          />
        </div>
        {powerNote(metrics) ? (
          <p className="mt-2 text-xs text-muted-foreground">{powerNote(metrics)}</p>
        ) : null}

        <form action={onSubmit} className="mt-4 space-y-3">
          <input type="hidden" name="workout_id" value={review.workoutId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              RPE
              <input
                name="athlete_rpe"
                type="number"
                min="1"
                max="10"
                defaultValue={review.athleteRpe ?? ""}
                className={`mt-1 ${FIELD}`}
              />
            </label>
            <label className="text-sm">
              Gevoel
              <select
                name="athlete_feel"
                defaultValue={review.athleteFeel ?? ""}
                className={`mt-1 ${FIELD}`}
              >
                <option value="">-</option>
                <option value="goed">Goed</option>
                <option value="neutraal">Neutraal</option>
                <option value="zwaar">Zwaar</option>
                <option value="slecht">Slecht</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            Opmerking
            <textarea
              name="athlete_report"
              rows={3}
              defaultValue={review.athleteReport ?? ""}
              className={`mt-1 ${FIELD}`}
            />
          </label>

          <details className="rounded-md border bg-background/60 p-3">
            <summary className="cursor-pointer text-sm font-medium">Meer details</summary>
            <div className="mt-2 divide-y">
              {review.description ? (
                <DetailRow label="Doel" value={review.description} />
              ) : null}
              <DetailRow label="Target" value={metrics.targetSummary || "-"} />
              <DetailRow
                label="Gepland"
                value={
                  [
                    metrics.plannedMinutes ? `${metrics.plannedMinutes} min` : null,
                    metrics.plannedLoad ? `${metrics.plannedLoad} TSS` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "-"
                }
              />
              <DetailRow
                label="Gem. cadans"
                value={
                  metrics.averageCadence == null ? "-" : `${nl(metrics.averageCadence)} rpm`
                }
              />
              <DetailRow
                label="Max. HR"
                value={metrics.maxHr == null ? "-" : `${nl(metrics.maxHr)} bpm`}
              />
              <DetailRow label="CTL" value={ctlLabel(metrics)} />
              <DetailRow label="Gereedscore" value={readinessLabel(metrics)} />
            </div>
          </details>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Later
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {pending ? "Bezig…" : "Bevestigen"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
