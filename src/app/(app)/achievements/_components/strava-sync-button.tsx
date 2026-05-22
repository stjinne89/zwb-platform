"use client";

import { useState, useTransition } from "react";
import { History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncMyStravaActivities } from "../_actions";

type State =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function StravaSyncButton() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<State>({ kind: "idle" });

  function runSync(fullBackfill: boolean) {
    setState({ kind: "idle" });
    startTransition(async () => {
      const res = await syncMyStravaActivities({ fullBackfill });
      if (!res.ok) {
        setState({ kind: "error", message: res.error });
        return;
      }
      const parts: string[] = [];
      parts.push(`${res.upserted} ritten gesynchroniseerd`);
      if (res.milestoneAwards > 0) {
        parts.push(`${res.milestoneAwards} nieuwe badge${res.milestoneAwards === 1 ? "" : "s"}`);
      }
      if (fullBackfill) {
        parts.push("(volledige 5-jaar historie)");
      } else if (res.isFirstSync) {
        parts.push("(eerste sync)");
      }
      setState({ kind: "success", message: parts.join(" · ") + "." });
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => runSync(false)}
        >
          <RefreshCw
            data-icon="inline-start"
            className={pending ? "animate-spin" : undefined}
          />
          Strava syncen
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (
              !confirm(
                "Volledige 5-jaar historie ophalen? Kan ~30 seconden duren bij actieve riders. Bestaande ritten worden netjes upsert (geen duplicaten).",
              )
            )
              return;
            runSync(true);
          }}
        >
          <History data-icon="inline-start" />
          Sync hele historie
        </Button>
      </div>
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
