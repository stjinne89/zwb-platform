"use client";

import { useState, useTransition } from "react";
import { syncYouTubeChannel } from "../_actions";
import { Button } from "@/components/ui/button";

export function SyncYouTubeButton() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "ok"; total: number; inserted: number; updated: number }
    | { kind: "error"; msg: string }
  >({ kind: "idle" });

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
            const res = await syncYouTubeChannel();
            if (!res.ok) {
              setStatus({ kind: "error", msg: res.error });
            } else {
              setStatus({
                kind: "ok",
                total: res.total,
                inserted: res.inserted,
                updated: res.updated,
              });
            }
          });
        }}
      >
        {pending ? "Bezig met syncen…" : "📺 Sync YouTube"}
      </Button>
      {status.kind === "ok" && (
        <span className="text-sm text-muted-foreground">
          {status.inserted} nieuw, {status.updated} bijgewerkt (totaal{" "}
          {status.total}).
        </span>
      )}
      {status.kind === "error" && (
        <span className="text-sm text-destructive">{status.msg}</span>
      )}
    </div>
  );
}
