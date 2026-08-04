"use client";

// De serie stap voor stap doorlopen, met een aftelling per hold en een korte
// wissel ertussen. Aan het eind één afvink-actie.
//
// Een eenzijdige oefening wordt twee stappen (links en rechts): dat is hoe je
// hem uitvoert, en het scheelt hoofdrekenen tijdens de sessie.
//
// De wissel gebruikt rest_seconds van de oefening die je net deed. Die stond al
// in het datamodel en telde al mee in seriesMinutes; hij werd alleen nog niet
// afgeteld. Tijdens de wissel staat de vólgende oefening al in beeld, want daar
// is die tijd voor: de nieuwe houding aannemen.

import { useActionState, useEffect, useMemo, useState } from "react";
import { Check, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import type { MobilitySeriesItem } from "@/lib/training/mobility";
import { ExerciseVisual } from "./exercise-visual";

type ActionResult = { ok: true } | { ok: false; error: string };

type Step = {
  key: string;
  item: MobilitySeriesItem;
  setIndex: number;
  setCount: number;
  side: "Links" | "Rechts" | null;
};

function buildSteps(items: MobilitySeriesItem[]): Step[] {
  const steps: Step[] = [];
  for (const item of items) {
    for (let set = 0; set < item.sets; set++) {
      const sides = item.exercise.is_unilateral
        ? ([("Links" as const), ("Rechts" as const)])
        : [null];
      for (const side of sides) {
        steps.push({
          key: `${item.id}-${set}-${side ?? "beide"}`,
          item,
          setIndex: set,
          setCount: item.sets,
          side,
        });
      }
    }
  }
  return steps;
}

function doseLabel(step: Step) {
  const parts: string[] = [];
  if (step.item.hold_seconds) parts.push(`${step.item.hold_seconds} sec vasthouden`);
  if (step.item.reps) parts.push(`${step.item.reps} herhalingen`);
  if (step.setCount > 1) parts.push(`set ${step.setIndex + 1} van ${step.setCount}`);
  if (step.side) parts.push(step.side.toLowerCase());
  return parts.join(" · ");
}

function stepTitle(step: Step) {
  return step.side ? `${step.item.exercise.title} — ${step.side.toLowerCase()}` : step.item.exercise.title;
}

export function SeriesRunner({
  seriesId,
  items,
  completeAction,
}: {
  seriesId: string;
  items: MobilitySeriesItem[];
  completeAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const steps = useMemo(() => buildSteps(items), [items]);
  const [phase, setPhase] = useState<"idle" | "running" | "resting" | "done">("idle");
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const step = steps[index] ?? null;
  const nextStep = steps[index + 1] ?? null;

  const [state, submit, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => completeAction(formData),
    null,
  );

  // De klok wordt gezet bij het wisselen van stap, niet in een effect: dat
  // scheelt een extra render en houdt "waar staat de teller" op één plek.
  function goTo(next: number) {
    setIndex(next);
    setSeconds(steps[next]?.item.hold_seconds ?? null);
    setPaused(false);
    setPhase("running");
  }

  function advance() {
    if (index + 1 >= steps.length) {
      setPhase("done");
      return;
    }
    const rest = step?.item.rest_seconds ?? 0;
    if (rest > 0) {
      setSeconds(rest);
      setPaused(false);
      setPhase("resting");
      return;
    }
    goTo(index + 1);
  }

  function restart() {
    goTo(0);
  }

  // Aftellen voor zowel de oefening als de wissel. Het doorschakelen gebeurt ín
  // de timeout, dus nooit synchroon tijdens het effect zelf.
  useEffect(() => {
    const counting = phase === "running" || phase === "resting";
    if (!counting || paused || seconds === null) return;
    const timer = window.setTimeout(() => {
      if (seconds > 1) {
        setSeconds(seconds - 1);
      } else if (phase === "resting") {
        goTo(index + 1);
      } else {
        advance();
      }
    }, 1000);
    return () => window.clearTimeout(timer);
    // goTo en advance lezen alleen index en steps; die staan in deze deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused, seconds, index, steps]);

  if (state?.ok) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm">
        <p className="font-medium">Afgevinkt.</p>
      </div>
    );
  }

  if (phase === "idle") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-[44px]" onClick={restart}>
          <Play className="size-4" />
          Start serie
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px]"
          onClick={() => setPhase("done")}
        >
          <Check className="size-4" />
          Direct afvinken
        </Button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <form action={submit} className="space-y-3 rounded-lg border bg-card p-4">
        <input type="hidden" name="series_id" value={seriesId} />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Hoe ging het?</legend>
          <div className="flex flex-wrap gap-2">
            {["goed", "neutraal", "zwaar"].map((feel) => (
              <label
                key={feel}
                className="flex min-h-[36px] cursor-pointer items-center gap-2 rounded-full border px-3 text-sm capitalize has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input type="radio" name="feel" value={feel} className="sr-only" />
                {feel}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="min-h-[44px]" disabled={pending}>
            <Check className="size-4" />
            {pending ? "Bezig…" : "Afvinken"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-[44px]"
            onClick={() => setPhase("idle")}
          >
            Terug
          </Button>
        </div>
        {state && !state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </form>
    );
  }

  if (!step) return null;

  if (phase === "resting" && nextStep) {
    return (
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-semibold text-muted-foreground">Wissel</h3>
          <span className="text-sm tabular-nums text-muted-foreground">
            {index + 2} / {steps.length}
          </span>
        </div>

        <p className="text-4xl font-semibold tabular-nums" aria-live="polite">
          {Math.max(0, seconds ?? 0)}
        </p>

        <p className="text-sm">
          Hierna: <span className="font-medium">{stepTitle(nextStep)}</span>
        </p>

        <ExerciseVisual exercise={nextStep.item.exercise} />

        <p className="text-sm text-muted-foreground">{doseLabel(nextStep)}</p>
        <Markdown source={nextStep.item.exercise.cue_md} />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {paused ? "Verder" : "Pauze"}
          </Button>
          <Button type="button" className="min-h-[44px]" onClick={() => goTo(index + 1)}>
            <SkipForward className="size-4" />
            Nu starten
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-[44px]"
            onClick={() => setPhase("idle")}
          >
            <RotateCcw className="size-4" />
            Stoppen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">{stepTitle(step)}</h3>
        <span className="text-sm tabular-nums text-muted-foreground">
          {index + 1} / {steps.length}
        </span>
      </div>

      <ExerciseVisual exercise={step.item.exercise} />

      <p className="text-sm text-muted-foreground">{doseLabel(step)}</p>

      {/* De uitvoering hoort hier te staan: zonder de tekst is de figuur alleen
          een geheugensteun en niet genoeg om de oefening goed te doen. */}
      <Markdown source={step.item.exercise.cue_md} />

      {seconds !== null && (
        <p className="text-4xl font-semibold tabular-nums" aria-live="polite">
          {Math.max(0, seconds)}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {seconds !== null && (
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {paused ? "Verder" : "Pauze"}
          </Button>
        )}
        <Button type="button" className="min-h-[44px]" onClick={advance}>
          {index + 1 >= steps.length ? "Klaar" : "Volgende"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-[44px]"
          onClick={() => setPhase("idle")}
        >
          <RotateCcw className="size-4" />
          Stoppen
        </Button>
      </div>
    </div>
  );
}
