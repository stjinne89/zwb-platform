"use client";

// Het lid kiest zelf bij welke training een rit hoort: de automatische koppeling
// gaat op kalenderdag en zit er dus soms naast. Zie relinkRide in completion.ts.
// Een rit kan ook bij de rit van een gereden training komen; samen zijn ze dan
// één training (joinRide, migratie 0306).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinRideAction, relinkRideAction } from "../_actions";
import { JOIN_PREFIX, NO_WORKOUT, type RideLink } from "./ride-link";

export function RideLinkForm({ link, currentLabel }: { link: RideLink; currentLabel?: string }) {
  const current = link.workoutId ?? NO_WORKOUT;
  const [choice, setChoice] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const joinOptions = link.joinOptions ?? [];
  const parts = link.parts ?? [];

  // Een ongeplande rit zonder training in die week valt niets te kiezen.
  if (!link.workoutId && link.options.length === 0 && joinOptions.length === 0) return null;

  function run(
    action: () => Promise<
      { ok: true; reviewWorkoutId?: string | null } | { ok: false; error: string }
    >,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Hangt de rit nu aan een training die nog bevestigd moet worden, dan
      // meteen het bevestigscherm: RPE en gevoel horen bij de training.
      if (result.reviewWorkoutId) {
        router.push(`/zwbeter-worden?review=${encodeURIComponent(result.reviewWorkoutId)}`);
        return;
      }
      router.refresh();
    });
  }

  function save() {
    if (choice === current) return;
    // Loskoppelen neemt RPE, gevoel en opmerking mee; verhuizen niet.
    if (link.workoutId && choice === NO_WORKOUT && !confirm("Rit loskoppelen van deze training?")) {
      return;
    }
    const formData = new FormData();
    formData.set("activity_id", link.activityId);
    if (choice.startsWith(JOIN_PREFIX)) {
      formData.set("parent_id", choice.slice(JOIN_PREFIX.length));
      run(() => joinRideAction(formData));
      return;
    }
    formData.set("workout_id", choice);
    run(() => relinkRideAction(formData));
  }

  function split(activityId: string) {
    const formData = new FormData();
    formData.set("activity_id", activityId);
    run(() => joinRideAction(formData));
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      {link.workoutId ? (
        <p className="text-xs text-muted-foreground">Rit: {link.rideLabel}</p>
      ) : null}
      {parts.length > 0 ? (
        <ul className="space-y-1">
          {parts.map((part) => (
            <li key={part.activityId} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="min-w-0 truncate">+ {part.label}</span>
              <button
                type="button"
                onClick={() => split(part.activityId)}
                disabled={pending}
                className="shrink-0 rounded-md border px-2 py-1 font-medium hover:bg-accent disabled:opacity-50"
              >
                Losmaken
              </button>
            </li>
          ))}
        </ul>
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
            {joinOptions.length > 0 ? (
              <optgroup label="Samenvoegen met">
                {joinOptions.map((option) => (
                  <option key={option.parentId} value={`${JOIN_PREFIX}${option.parentId}`}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
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
