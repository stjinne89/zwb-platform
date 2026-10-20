"use client";

// Een opgeslagen doel bewerken of verwijderen. Zelfde opbouw als het
// doelformulier: verzenden via onSubmit en useActionState, zodat een geweigerde
// wijziging een melding geeft en het formulier blijft staan.

import { startTransition, useActionState, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteTrainingGoal, updateTrainingGoal } from "../../_actions";
import { GOAL_LABELS } from "../../_components/format";
import { INTENSITY_OPTIONS, LEVEL_OPTIONS, MODE_OPTIONS } from "./goal-options";

const FIELD = "mt-1 w-full rounded-md border bg-background px-3 py-2";

export type EditableGoal = {
  id: string;
  title: string;
  goal_type: string;
  target_date: string | null;
  max_hours_per_week: number | string | null;
  preferred_mode: string;
  experience_level: string;
  desired_intensity: string;
  risk_notes: string | null;
};

export function GoalEdit({ goal }: { goal: EditableGoal }) {
  const [open, setOpen] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [state, dispatch, pending] = useActionState<{ error: string | null }, FormData>(
    async (_previous, formData) => {
      const result = await updateTrainingGoal(formData);
      if (!result.ok) return { error: result.error };
      setOpen(false);
      return { error: null };
    },
    { error: null },
  );

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-sm font-medium"
        >
          <Pencil className="size-3.5" />
          {open ? "Annuleren" : "Bewerken"}
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            if (!window.confirm(`Doel "${goal.title}" verwijderen?`)) return;
            setDeleteError(null);
            const formData = new FormData();
            formData.set("goal_id", goal.id);
            startDelete(async () => {
              const result = await deleteTrainingGoal(formData);
              if (!result.ok) setDeleteError(result.error);
            });
          }}
          className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-3 py-1 text-sm font-medium text-destructive disabled:opacity-60"
        >
          <Trash2 className="size-3.5" />
          {deleting ? "Bezig…" : "Verwijderen"}
        </button>
      </div>
      {deleteError ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {deleteError}
        </p>
      ) : null}

      {open ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(() => dispatch(formData));
          }}
          className="mt-3 grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-2"
        >
          <input type="hidden" name="goal_id" value={goal.id} />
          <label className="text-sm sm:col-span-2">
            Titel
            <input name="title" required defaultValue={goal.title} className={FIELD} />
          </label>
          <label className="text-sm">
            Doeltype
            <select name="goal_type" defaultValue={goal.goal_type} className={FIELD}>
              {Object.entries(GOAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Targetdatum
            <input
              name="target_date"
              type="date"
              defaultValue={goal.target_date ? goal.target_date.slice(0, 10) : undefined}
              className={FIELD}
            />
          </label>
          <label className="text-sm">
            Max. trainingsuren per week
            <input
              name="max_hours_per_week"
              type="number"
              min="1"
              max="30"
              step="0.5"
              defaultValue={goal.max_hours_per_week ?? undefined}
              className={FIELD}
            />
          </label>
          <label className="text-sm">
            Voorkeur
            <select name="preferred_mode" defaultValue={goal.preferred_mode} className={FIELD}>
              {MODE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Ervaring
            <select name="experience_level" defaultValue={goal.experience_level} className={FIELD}>
              {LEVEL_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Belasting
            <select
              name="desired_intensity"
              defaultValue={goal.desired_intensity}
              className={FIELD}
            >
              {INTENSITY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            Blessures, risico&apos;s of aandachtspunten
            <textarea
              name="risk_notes"
              rows={3}
              defaultValue={goal.risk_notes ?? ""}
              className={FIELD}
            />
          </label>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">
              {state.error}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {pending ? "Bezig…" : "Wijzigingen opslaan"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
