"use client";

import { useState, useTransition } from "react";
import { toggleGraveyard } from "../_actions";
import { Button } from "@/components/ui/button";

export function GraveyardToggle({
  teamId,
  isGraveyard,
}: {
  teamId: string;
  isGraveyard: boolean;
}) {
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
          setError(null);
          startTransition(async () => {
            const res = await toggleGraveyard(teamId, !isGraveyard);
            if (!res.ok) setError(res.error);
          });
        }}
      >
        {pending
          ? "Bezig…"
          : isGraveyard
            ? "Activeer team"
            : "🪦 Naar graveyard"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
