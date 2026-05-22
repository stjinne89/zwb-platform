"use client";

import { useState, useTransition } from "react";
import { disconnectIntervals } from "../_actions";
import { Button } from "@/components/ui/button";

export function DisconnectIntervalsButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!confirm("intervals.icu ontkoppelen? Je API-key wordt verwijderd.")) return;
          setError(null);
          startTransition(async () => {
            const res = await disconnectIntervals();
            if (!res.ok) setError(res.error);
          });
        }}
      >
        {pending ? "Ontkoppelen…" : "Ontkoppel intervals.icu"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
