"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteTrainingPlan } from "../_actions";

export function DeleteTrainingPlanButton({
  planId,
  title,
}: {
  planId: string;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="xs"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              `Schema "${title}" verwijderen? Dit verwijdert het schema en de workouts uit ZWB. Eventuele gepubliceerde workouts in intervals.icu blijven daar staan.`,
            )
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await deleteTrainingPlan(planId);
            if (result.ok) {
              router.refresh();
              return;
            }
            setError(result.error ?? "Schema verwijderen faalde.");
          });
        }}
      >
        <Trash2 className="size-3" />
        {pending ? "Verwijderen..." : "Verwijderen"}
      </Button>
      {error ? <span className="max-w-64 text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
