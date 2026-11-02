"use client";

// RPE bij een rit zonder training. Een rapportage hangt aan een training, dus
// hier alleen de RPE, op de rit zelf (saveRideRpeAction).

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveRideRpeAction } from "../_actions";

export function RideRpeForm({ activityId, rpe }: { activityId: string; rpe: number | null }) {
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setDirty(false);
    setMessage(null);
    startTransition(async () => {
      const result = await saveRideRpeAction(formData);
      if (!result.ok) {
        setMessage({ error: true, text: result.error });
        return;
      }
      setMessage({ error: false, text: "Opgeslagen" });
      router.refresh();
    });
  }

  const status = pending ? "Opslaan…" : dirty ? "Niet opgeslagen" : (message?.text ?? "");

  return (
    <form
      onSubmit={onSubmit}
      onChange={() => setDirty(true)}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="activity_id" value={activityId} />
      <label className="text-xs text-muted-foreground">
        RPE
        <input
          name="athlete_rpe"
          type="number"
          min="1"
          max="10"
          defaultValue={rpe ?? ""}
          className="mt-1 block w-20 rounded-md border bg-background px-2 py-1.5 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Opslaan…" : "Opslaan"}
      </button>
      <p
        aria-live="polite"
        className={`text-xs ${
          dirty
            ? "text-amber-700 dark:text-amber-300"
            : message?.error
              ? "text-destructive"
              : "text-muted-foreground"
        }`}
      >
        {status}
      </p>
    </form>
  );
}
