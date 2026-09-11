"use client";

// De duur van een geplande training zelf aanpassen, bijvoorbeeld van anderhalf
// naar twee uur. De kern van de training blijft; zie setWorkoutDuration().

import { useState, useTransition } from "react";
import { setWorkoutDuration } from "../_actions";

export function WorkoutDurationControl({
  workoutId,
  minutes,
}: {
  workoutId: string;
  minutes: number;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(minutes));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("workout_id", workoutId);
      formData.set("duration_minutes", value);
      const outcome = await setWorkoutDuration(formData);
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(minutes));
          setOpen(true);
        }}
        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        Duur aanpassen
      </button>
    );
  }

  return (
    <form onSubmit={save} className="inline-flex flex-wrap items-center gap-2">
      <input
        type="number"
        min={15}
        max={480}
        step={15}
        required
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Duur in minuten"
        className="w-20 rounded-md border border-input bg-background px-2 py-1 text-xs"
      />
      <span className="text-xs text-muted-foreground">min</span>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Bezig…" : "Opslaan"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        disabled={pending}
        className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        Annuleren
      </button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </form>
  );
}
