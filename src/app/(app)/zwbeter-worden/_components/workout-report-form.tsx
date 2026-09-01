"use client";

import { useActionState, useState } from "react";
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

  return (
    <form
      action={action}
      className="space-y-2"
      onChange={() => setDirty(true)}
      onSubmit={() => setDirty(false)}
    >
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
          <select name="athlete_feel" defaultValue={feel ?? ""} className={FIELD}>
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
