"use client";

import { useState, useTransition } from "react";
import { syncLadderGraveyard } from "../_actions";
import { Button } from "@/components/ui/button";

type Status =
  | { kind: "idle" }
  | {
      kind: "ok";
      foundOnLadder: number;
      matchedZwbTeams: string[];
      toGraveyard: number;
      toActive: number;
    }
  | { kind: "error"; msg: string };

export function SyncGraveyardButton() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setStatus({ kind: "idle" });
          startTransition(async () => {
            const res = await syncLadderGraveyard();
            if (!res.ok) {
              setStatus({ kind: "error", msg: res.error });
            } else {
              setStatus({
                kind: "ok",
                foundOnLadder: res.foundOnLadder,
                matchedZwbTeams: res.matchedZwbTeams,
                toGraveyard: res.toGraveyard,
                toActive: res.toActive,
              });
            }
          });
        }}
      >
        {pending ? "Bezig…" : "Teamarchief bijwerken"}
      </Button>
      {status.kind === "ok" && (
        <span className="text-xs text-muted-foreground">
          {status.foundOnLadder} teams gevonden ·{" "}
          {status.matchedZwbTeams.length} gekoppeld ·{" "}
          {status.toGraveyard} gearchiveerd, {status.toActive} terug actief.
        </span>
      )}
      {status.kind === "error" && (
        <span className="text-xs text-destructive">{status.msg}</span>
      )}
    </div>
  );
}
