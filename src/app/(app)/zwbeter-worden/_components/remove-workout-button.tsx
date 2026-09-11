"use client";

// Een geplande training uit je schema halen. Met een bevestiging: een
// voorgestelde training komt niet vanzelf terug, de planner laat die dag vrij.

import { useState, useTransition } from "react";
import { removePlannedWorkout } from "../_actions";

export function RemoveWorkoutButton({ workoutId, title }: { workoutId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!confirm(`${title} uit je schema halen?`)) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("workout_id", workoutId);
      const outcome = await removePlannedWorkout(formData);
      if (!outcome.ok) setError(outcome.error);
    });
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
      >
        {pending ? "Bezig…" : "Verwijder"}
      </button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
