"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { openZwiftRace, type OpenRaceState } from "../_actions";

/** Een Zwift-race buiten de kalender openen met de link van het event. */
export function OpenRaceForm() {
  const [state, action, pending] = useActionState<OpenRaceState, FormData>(openZwiftRace, { error: null });
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="zwift-race-link" className="sr-only">
          Zwift-eventlink
        </label>
        <input
          id="zwift-race-link"
          name="link"
          type="text"
          inputMode="url"
          required
          placeholder="https://www.zwift.com/events/view/…"
          autoComplete="off"
          spellCheck={false}
          className="min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Ophalen…" : "Analyseren"}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
