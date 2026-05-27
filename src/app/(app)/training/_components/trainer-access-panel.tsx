"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { grantTrainerAccessState, revokeTrainerAccessState } from "../_actions";

type AssignmentOption = {
  id: string;
  trainerId: string;
  trainerName: string;
};

type TrainerOption = {
  id: string;
  label: string;
};

type ActionState = {
  ok: boolean;
  error?: string;
  message?: string;
} | null;

const initialState: ActionState = null;

export function TrainerAccessPanel({
  assignments,
  trainers,
}: {
  assignments: AssignmentOption[];
  trainers: TrainerOption[];
}) {
  const router = useRouter();
  const [grantState, grantAction, grantPending] = useActionState(grantTrainerAccessState, initialState);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeTrainerAccessState, initialState);

  useEffect(() => {
    if (grantState?.ok || revokeState?.ok) {
      router.refresh();
    }
  }, [grantState?.ok, revokeState?.ok, router]);

  const activeState = revokeState?.error ? revokeState : grantState;

  return (
    <>
      <div className="mt-4 space-y-2">
        {assignments.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Geen trainer gekoppeld.
          </p>
        ) : (
          assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 p-3"
            >
              <span className="text-sm font-medium">{assignment.trainerName}</span>
              <form action={revokeAction}>
                <input type="hidden" name="assignment_id" value={assignment.id} />
                <button
                  type="submit"
                  disabled={revokePending}
                  className="rounded-md border px-3 py-1 text-xs hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                >
                  {revokePending ? "Bezig..." : "Intrekken"}
                </button>
              </form>
            </div>
          ))
        )}
      </div>

      {trainers.length > 0 ? (
        <form action={grantAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <select name="trainer_id" className="rounded-md border bg-background px-3 py-2 text-sm">
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.label}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={grantPending}>
            <Plus className="size-4" />
            {grantPending ? "Bezig..." : "Trainer aanwijzen"}
          </Button>
        </form>
      ) : assignments.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Geen trainers beschikbaar.</p>
      ) : null}

      {activeState?.error ? (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {activeState.error}
        </p>
      ) : activeState?.message ? (
        <p className="mt-3 rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
          {activeState.message}
        </p>
      ) : null}
    </>
  );
}
