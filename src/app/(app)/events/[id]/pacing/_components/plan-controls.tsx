"use client";

// De knoppen naast het plan: verversen bij veroudering, delen aan- of uitzetten,
// en het plan van een clubgenoot overnemen.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  adoptClubmatePlan,
  recomputePacingPlan,
  setPacingPlanShared,
} from "../_actions";

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
