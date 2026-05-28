"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshEventResults } from "../_actions";

export function RefreshResultsButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function onClick() {
    setMsg(null);
    setIsError(false);
    startTransition(async () => {
      const res = await refreshEventResults(eventId);
      if (res.ok) {
        setIsError(false);
        setMsg(
          res.count === 0
            ? "Geen ZWB'ers gevonden in de uitslag."
            : `${res.count} ZWB'er${res.count === 1 ? "" : "s"} gevonden.`,
        );
      } else {
        setIsError(true);
        setMsg(res.error ?? "Ophalen faalde.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onClick}
        disabled={pending}
      >
        <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Bezig…" : "Uitslag ophalen"}
      </Button>
      {msg && (
        <span
          className={`text-xs ${
            isError ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {msg}
        </span>
      )}
    </div>
  );
}
