"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setTeamAvailability } from "../_actions";

type Status = "available" | "maybe" | "unavailable";

const OPTIONS: Array<{ value: Status; label: string }> = [
  { value: "available", label: "Beschikbaar" },
  { value: "maybe", label: "Misschien" },
  { value: "unavailable", label: "Niet" },
];

export function TeamAvailabilityButtons({
  teamId,
  eventId,
  current,
}: {
  teamId: string;
  eventId: string;
  current: Status | null;
}) {
  const [active, setActive] = useState<Status | null>(current);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function choose(status: Status) {
    const previous = active;
    setActive(status);
    setError(null);
    startTransition(async () => {
      const res = await setTeamAvailability(teamId, eventId, status);
      if (!res.ok) {
        setActive(previous);
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={active === option.value ? "default" : "outline"}
            disabled={pending}
            onClick={() => choose(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
