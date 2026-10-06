"use client";

// Bij een geplande race een warming-up uit de bibliotheek klaarzetten; zie
// planRaceWarmup().

import { useState, useTransition } from "react";
import type { WarmupOption } from "@/lib/training/race-warmup";
import { planRaceWarmup } from "../_actions";
import { RemoveWorkoutButton } from "./remove-workout-button";

export type RaceWarmupView = {
  options: WarmupOption[];
  /** De voorkeuze die bij deze race past. */
  suggestedId: string | null;
  /** De warming-up die er al staat. */
  current: { id: string; title: string } | null;
};

export function RaceWarmupControl({
  raceWorkoutId,
  warmup,
}: {
  raceWorkoutId: string;
  warmup: RaceWarmupView;
}) {
  const [templateId, setTemplateId] = useState(warmup.suggestedId ?? warmup.options[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (warmup.current) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">{warmup.current.title} staat klaar</span>
        <RemoveWorkoutButton workoutId={warmup.current.id} title={warmup.current.title} />
      </div>
    );
  }
  if (warmup.options.length === 0) return null;

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("race_workout_id", raceWorkoutId);
      formData.set("template_id", templateId);
      const outcome = await planRaceWarmup(formData);
      if (!outcome.ok) setError(outcome.error);
    });
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Warming-up"
        value={templateId}
        onChange={(event) => setTemplateId(event.target.value)}
        className="rounded-md border bg-background px-2 py-1.5 text-xs"
      >
        {warmup.options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.title} - {option.durationMinutes} min
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || !templateId}
        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
      >
        {pending ? "Bezig…" : "Zet klaar"}
      </button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </form>
  );
}
