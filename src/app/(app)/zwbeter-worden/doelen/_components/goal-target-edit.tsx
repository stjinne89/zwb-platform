"use client";

// Doeltijd of groep aanpassen. Via useActionState, zoals het doelformulier: een
// geweigerde tijd hoort een melding te geven, niet stil te verdwijnen.

import { startTransition, useActionState } from "react";
import { updateGoalTargetTime } from "../../_actions";

function clock(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

export function GoalTargetEdit({
  goalId,
  targetSeconds,
  riding,
}: {
  goalId: string;
  targetSeconds: number;
  riding: string | null;
}) {
  const [state, dispatch, pending] = useActionState<{ error: string | null }, FormData>(
    async (_previous, formData) => {
      const result = await updateGoalTargetTime(formData);
      return { error: result.ok ? null : result.error };
    },
    { error: null },
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => dispatch(formData));
      }}
      className="flex flex-wrap items-end gap-2 pt-1"
    >
      <input type="hidden" name="goal_id" value={goalId} />
      <label className="text-xs">
        Doeltijd
        <input
          name="target_time"
          defaultValue={clock(targetSeconds)}
          inputMode="numeric"
          autoComplete="off"
          className="mt-1 block w-24 rounded-md border bg-background px-2 py-1 text-sm"
        />
      </label>
      <label className="text-xs">
        Rijden
        <select
          name="target_riding"
          defaultValue={riding === "group" ? "group" : "alone"}
          className="mt-1 block rounded-md border bg-background px-2 py-1 text-sm"
        >
          <option value="alone">Alleen</option>
          <option value="group">In een groep</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border px-3 py-1 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Bijwerken"}
      </button>
      {state.error ? (
        <p role="alert" className="w-full text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
