"use client";

// De knoppen naast het plan: verversen bij veroudering, delen aan- of uitzetten,
// en het plan van een clubgenoot overnemen.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  adoptClubmatePlan,
  planForTargetTime,
  recomputePacingPlan,
  setPacingPlanShared,
} from "../_actions";

function hmm(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Een gewenste eindtijd opgeven. Bij een plan met eigen doelen eerst bevestigen:
 * die verschuiven mee.
 */
export function TargetTimeForm({
  eventId,
  current,
  manual,
}: {
  eventId: string;
  current: { seconds: number } | null;
  manual: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(current ? hmm(current.seconds) : "");
  const [message, setMessage] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (manual && !confirm("Je eigen doelen schuiven mee naar deze tijd. Doorgaan?")) return;
    setMessage(null);
    start(async () => {
      const result = await planForTargetTime(eventId, value);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(
        result.reachable
          ? null
          : `Niet haalbaar; het snelste plan komt uit op ${hmm(result.fastestSeconds)}.`,
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <label htmlFor="target-time" className="text-sm font-medium">
        Gewenste eindtijd
      </label>
      <input
        id="target-time"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="u:mm"
        inputMode="numeric"
        className="h-9 w-24 rounded-md border border-input bg-background px-2 tabular-nums"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending || !value.trim()}>
        {pending ? "Bezig..." : "Plan voor deze tijd"}
      </Button>
      {message ? <p className="w-full text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}

export function RecomputeButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await recomputePacingPlan(eventId);
          router.refresh();
        })
      }
    >
      {pending ? "Bezig..." : "Herbereken met mijn huidige data"}
    </Button>
  );
}

export function ShareToggle({
  eventId,
  shared,
}: {
  eventId: string;
  shared: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={shared}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.checked;
          start(async () => {
            await setPacingPlanShared(eventId, next);
            router.refresh();
          });
        }}
        className="size-4 accent-[var(--color-zwb-teal)]"
      />
      Delen met de club
    </label>
  );
}

export function AdoptButton({
  eventId,
  planId,
  ownerName,
}: {
  eventId: string;
  planId: string;
  ownerName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await adoptClubmatePlan(eventId, planId);
          router.refresh();
        })
      }
      aria-label={`Neem het plan van ${ownerName} als vertrekpunt`}
    >
      {pending ? "Bezig..." : "Als vertrekpunt nemen"}
    </Button>
  );
}
