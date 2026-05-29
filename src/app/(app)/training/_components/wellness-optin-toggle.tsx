"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setWellnessOptIn } from "../_actions";

export function WellnessOptInToggle({
  initialOptIn,
}: {
  initialOptIn: boolean;
}) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !optIn;
    setError(null);
    startTransition(async () => {
      const res = await setWellnessOptIn(next);
      if (res.ok) {
        setOptIn(next);
      } else {
        setError(res.error ?? "Wijzigen faalde.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={optIn ? "default" : "outline"}
        disabled={pending}
        onClick={toggle}
      >
        {pending
          ? "Bezig…"
          : optIn
            ? "Herstel-data delen: aan"
            : "Herstel-data delen: uit"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
