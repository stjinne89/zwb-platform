"use client";

import { useState, useTransition } from "react";
import { setRsvp } from "../_actions";
import { Button } from "@/components/ui/button";

type Status = "yes" | "maybe" | "no";

const OPTIONS: { value: Status; label: string }[] = [
  { value: "yes", label: "Ja" },
  { value: "maybe", label: "Misschien" },
  { value: "no", label: "Nee" },
];

export function RsvpButtons({
  eventId,
  current,
}: {
  eventId: string;
  current: Status | null;
}) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<Status | null>(current);
  const [error, setError] = useState<string | null>(null);

  function choose(s: Status) {
    setError(null);
    const prev = active;
    setActive(s);
    startTransition(async () => {
      const res = await setRsvp(eventId, s);
      if (!res.ok) {
        setActive(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {OPTIONS.map((o) => (
          <Button
            key={o.value}
            type="button"
            variant={active === o.value ? "default" : "outline"}
            size="sm"
            disabled={pending}
            onClick={() => choose(o.value)}
          >
            {o.label}
          </Button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
