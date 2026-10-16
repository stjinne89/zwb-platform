"use client";

import { useState, useTransition } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { finalizeAchievementAwards } from "../_actions";

type State =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function FinalizeAwardsButton() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<State>({ kind: "idle" });

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setState({ kind: "idle" });
          startTransition(async () => {
            const res = await finalizeAchievementAwards();
            if (!res.ok) {
              setState({ kind: "error", message: res.error });
              return;
            }
            setState({
              kind: "success",
              message: `${res.awarded} badges vastgelegd.`,
            });
          });
        }}
      >
        <Trophy
          data-icon="inline-start"
          className={pending ? "animate-pulse" : undefined}
        />
        Weekbadges vastleggen
      </Button>
      {state.kind !== "idle" && (
        <p
          className={
            state.kind === "success"
              ? "text-xs text-muted-foreground"
              : "text-xs text-destructive"
          }
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
