"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
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
import { NO_WORKOUT } from "./ride-link";

export type PendingReview = {
  workoutId: string;
  title: string;
  dateLabel: string;
  description: string | null;
  metrics: WorkoutMetricsSnapshot;
  athleteRpe: number | null;
  athleteFeel: string | null;
  athleteReport: string | null;
  /** De rit die werkelijk gereden is. */
  ride: {
    name: string;
    dateLabel: string;
    movingMinutes: number | null;
    distanceKm: number | null;
  } | null;
  /** Andere trainingen waar deze rit bij kan horen, nieuwste eerst. */
  candidates: Array<{ workoutId: string; label: string }>;
  /** Geopend via de link uit de pushmelding: dan altijd tonen. */
  requested: boolean;
};

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

/**
 * "Later" onthouden we per training voor de rest van de sessie. Anders sprong het
 * scherm bij elke navigatie naar Vandaag, en bij elke verversing, meteen weer
 * open. Een nieuwe app-sessie vraagt het opnieuw.
 */
const LATER_KEY = "zwb-review-later";

function laterIds(): string[] {
  try {
    const raw = window.sessionStorage.getItem(LATER_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function rememberLater(workoutId: string) {
  try {
    const ids = new Set(laterIds());
    ids.add(workoutId);
    window.sessionStorage.setItem(LATER_KEY, JSON.stringify([...ids]));
  } catch {
    // Geen opslag (privévenster): dan vraagt de volgende pagina het opnieuw.
  }
}

export function WorkoutReviewDialog({ review }: { review: PendingReview }) {
  // Dicht beginnen en pas na het lezen van "Later" openen: de server weet niet
  // wat het lid in deze sessie al heeft uitgesteld.
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { metrics, ride } = review;

  useEffect(() => {
    if (review.requested || !laterIds().includes(review.workoutId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
    }
  }, [review.requested, review.workoutId]);

  function later() {
    rememberLater(review.workoutId);
    setOpen(false);
  }

  // Zelf versturen in plaats van <form action>: React zet een formulier na een
  // action terug op de beginwaarden, en bij een fout was het lid dan zijn RPE,
  // gevoel en opmerking kwijt.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await confirmWorkoutReview(formData);
      if (!result.ok) {
        setError(result.error ?? "Bevestigen faalde.");
        return;
      }
      setError(null);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : later())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{ride ? ride.name : review.title}</DialogTitle>
          <DialogDescription>
            {ride
              ? [
                  ride.dateLabel,
                  ride.movingMinutes ? `${ride.movingMinutes} min` : null,
                  ride.distanceKm ? `${ride.distanceKm.toLocaleString("nl-NL")} km` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : review.dateLabel}
          </DialogDescription>
        </DialogHeader>

        <WorkoutMetricsPanel metrics={metrics} description={review.description} />

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input type="hidden" name="workout_id" value={review.workoutId} />
          <label className="block text-sm">
            Training
            <select
              name="ridden_workout_id"
              defaultValue={review.workoutId}
              className={`mt-1 ${FIELD}`}
            >
              <option value={review.workoutId}>
                {review.title} · {review.dateLabel}
              </option>
              {review.candidates.map((candidate) => (
                <option key={candidate.workoutId} value={candidate.workoutId}>
                  {candidate.label}
                </option>
              ))}
              <option value={NO_WORKOUT}>Geen training</option>
            </select>
          </label>
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
              onClick={later}
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
