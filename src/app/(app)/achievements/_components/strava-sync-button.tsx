"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncMyStravaActivities } from "../_actions";

type State =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function StravaSyncButton() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<State>({ kind: "idle" });

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setState({ kind: "idle" });
          startTransition(async () => {
            const res = await syncMyStravaActivities();
            if (!res.ok) {
              setState({ kind: "error", message: res.error });
              return;
            }
            const parts: string[] = [];
            parts.push(`${res.upserted} ritten gesynchroniseerd`);
            if (res.milestoneAwards > 0) {
              parts.push(`${res.milestoneAwards} nieuwe badge${res.milestoneAwards === 1 ? "" : "s"}`);
            }
            if (res.isFirstSync) {
              parts.push("(eerste sync, hele historie)");
            }
            setState({
              kind: "success",
              message: parts.join(" · ") + ".",
            });
          });
        }}
      >
        <RefreshCw
          data-icon="inline-start"
          className={pending ? "animate-spin" : undefined}
        />
        Strava syncen
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
