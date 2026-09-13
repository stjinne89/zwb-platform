"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import {
  saveWorkoutReportWithState,
  type WorkoutReportActionState,
} from "../_actions";

const INITIAL_STATE: WorkoutReportActionState = { status: "idle", message: "" };
const FIELD = "mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm";

export function WorkoutReportForm({
  workoutId,
  rpe,
  feel,
  report,
}: {
  workoutId: string;
  rpe: number | null;
  feel: string | null;
  report: string | null;
}) {
  const [state, action, pending] = useActionState(
    saveWorkoutReportWithState,
    INITIAL_STATE,
  );
  const [dirty, setDirty] = useState(false);

  const status = pending
    ? "Opslaan…"
    : dirty
      ? "Niet opgeslagen"
      : state.status === "error"
        ? state.message
        : state.status === "success"
          ? state.message
          : "";

  // Zelf versturen in plaats van <form action>. Na een form action zet React
  // het formulier terug op zijn beginwaarden, en een <select> onthoudt daarbij
  // de keuze van de eerste render: het gevoel sprong na opslaan terug naar "-"
  // terwijl het wel in de database stond. Een volgende keer opslaan wiste het
  // dan echt. Zo blijft staan wat het lid koos, ook als opslaan faalt.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setDirty(false);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2" onChange={() => setDirty(true)}>
      <input type="hidden" name="workout_id" value={workoutId} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          RPE
          <input
            name="athlete_rpe"
            type="number"
            min="1"
            max="10"
            defaultValue={rpe ?? ""}
            className={FIELD}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Gevoel
          {/* key: komt er van buitenaf een ander opgeslagen gevoel binnen (het
              bevestigscherm), dan opnieuw opbouwen; een select neemt een
              gewijzigde defaultValue anders niet over. */}
          <select
            key={feel ?? ""}
            name="athlete_feel"
            defaultValue={feel ?? ""}
            className={FIELD}
          >
            <option value="">-</option>
            <option value="goed">Goed</option>
            <option value="neutraal">Neutraal</option>
            <option value="zwaar">Zwaar</option>
            <option value="slecht">Slecht</option>
          </select>
        </label>
      </div>
      <textarea
        name="athlete_report"
        rows={3}
        defaultValue={report ?? ""}
        placeholder="Hoe ging deze training?"
        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Opslaan…" : "Rapportage opslaan"}
        </button>
        <p
          aria-live="polite"
          className={`text-xs ${
            dirty
              ? "text-amber-700 dark:text-amber-300"
              : state.status === "error"
                ? "text-destructive"
                : "text-muted-foreground"
          }`}
        >
          {status}
        </p>
      </div>
    </form>
  );
}
