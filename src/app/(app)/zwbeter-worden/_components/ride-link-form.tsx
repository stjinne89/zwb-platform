"use client";

// Het lid kiest zelf bij welke training een rit hoort: de automatische koppeling
// gaat op kalenderdag en zit er dus soms naast. Zie relinkRide in completion.ts.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { relinkRideAction } from "../_actions";
import { NO_WORKOUT, type RideLink } from "./ride-link";

export function RideLinkForm({ link, currentLabel }: { link: RideLink; currentLabel?: string }) {
  const current = link.workoutId ?? NO_WORKOUT;
  const [choice, setChoice] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Een ongeplande rit zonder training in die week valt niets te kiezen.
  if (!link.workoutId && link.options.length === 0) return null;

  function save() {
    if (choice === current) return;
    // Loskoppelen neemt RPE, gevoel en opmerking mee; verhuizen niet.
    if (link.workoutId && choice === NO_WORKOUT && !confirm("Rit loskoppelen van deze training?")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("activity_id", link.activityId);
      formData.set("workout_id", choice);
      const result = await relinkRideAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      {link.workoutId ? (
        <p className="text-xs text-muted-foreground">Rit: {link.rideLabel}</p>
      ) : null}
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-sm">
          Hoort bij
          <select
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
            disabled={pending}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {link.workoutId ? (
              <option value={link.workoutId}>{currentLabel ?? "Deze training"}</option>
            ) : null}
            {link.options.map((option) => (
              <option key={option.workoutId} value={option.workoutId}>
                {option.label}
              </option>
            ))}
            <option value={NO_WORKOUT}>Geen training</option>
          </select>
        </label>
        <button
          type="button"
          onClick={save}
          disabled={pending || choice === current}
          className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          {pending ? "Bezig…" : "Opslaan"}
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
