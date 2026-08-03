"use client";

// Eigen serie samenstellen uit de bibliotheek. Dosering komt uit de oefening
// zelf, zodat dit een keuzelijst blijft en geen formulier vol getallen.

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MobilityExercise } from "@/lib/training/mobility";

type ActionResult = { ok: true } | { ok: false; error: string };

const TIMINGS = [
  { value: "rustdag", label: "Rustdag" },
  { value: "pre_ride", label: "Voor de rit" },
  { value: "post_ride", label: "Na de rit" },
];

const GOALS = [
  { value: "stabiliteit", label: "Stabiliteit" },
  { value: "mobiliteit", label: "Mobiliteit" },
  { value: "houding", label: "Houding" },
];

export function SeriesBuilder({
  exercises,
  saveAction,
}: {
  exercises: MobilityExercise[];
  saveAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [state, submit, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => {
      const result = await saveAction(formData);
      if (result.ok) setChosen([]);
      return result;
    },
    null,
  );

  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= chosen.length) return;
    const next = [...chosen];
    [next[index], next[target]] = [next[target], next[index]];
    setChosen(next);
  }

  return (
    <details className="group rounded-lg border bg-card">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 p-4 font-semibold [&::-webkit-details-marker]:hidden">
        <Plus className="size-5 text-primary" />
        Eigen serie samenstellen
      </summary>

      <form action={submit} className="space-y-4 border-t p-4">
        <input type="hidden" name="exercise_ids" value={chosen.join(",")} />

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Naam</span>
            <input
              name="title"
              required
              maxLength={80}
              className="min-h-[44px] w-full rounded-md border bg-background px-3"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Wanneer</span>
            <select
              name="timing"
              className="min-h-[44px] w-full rounded-md border bg-background px-3"
            >
              {TIMINGS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Doel</span>
            <select
              name="goal"
              className="min-h-[44px] w-full rounded-md border bg-background px-3"
            >
              {GOALS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {chosen.length > 0 && (
          <ol className="divide-y rounded-md border">
            {chosen.map((id, index) => (
              <li key={id} className="flex items-center gap-2 p-2">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {index + 1}. {byId.get(id)?.title ?? "Onbekend"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Omhoog"
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Omlaag"
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Verwijderen"
                  onClick={() => setChosen(chosen.filter((value) => value !== id))}
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ol>
        )}

        <div className="flex flex-wrap gap-2">
          {exercises
            .filter((exercise) => !chosen.includes(exercise.id))
            .map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => setChosen([...chosen, exercise.id])}
                className="min-h-[36px] rounded-full border px-3 text-sm hover:border-primary"
              >
                {exercise.title}
              </button>
            ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" className="min-h-[44px]" disabled={pending || chosen.length === 0}>
            {pending ? "Bezig…" : "Serie bewaren"}
          </Button>
          {state && !state.ok && (
            <span className="text-sm text-destructive">{state.error}</span>
          )}
        </div>
      </form>
    </details>
  );
}
