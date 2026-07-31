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
import { WorkoutMetricsPanel } from "./workout-metrics-panel";
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
          <DialogDescription>{review.dateLabel}</DialogDescription>
        </DialogHeader>

        <WorkoutMetricsPanel metrics={metrics} description={review.description} />

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
