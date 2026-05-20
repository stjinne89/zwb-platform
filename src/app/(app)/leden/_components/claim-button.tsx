"use client";

import { useState, useTransition } from "react";
import { claimRosterEntry, unclaimRosterEntry } from "../_actions";
import { Button } from "@/components/ui/button";

export function ClaimButton({
  entryId,
  variant,
}: {
  entryId: string;
  variant: "claim" | "suggested" | "unclaim";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const fn = variant === "unclaim" ? unclaimRosterEntry : claimRosterEntry;
      const res = await fn(entryId);
      if (!res.ok) setError(res.error);
    });
  };

  if (variant === "unclaim") {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={onClick}
      >
        Ontkoppelen
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={variant === "suggested" ? "default" : "outline"}
        disabled={pending}
        onClick={onClick}
      >
        {variant === "suggested" ? "Dit ben ik ✓" : "Claim →"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
