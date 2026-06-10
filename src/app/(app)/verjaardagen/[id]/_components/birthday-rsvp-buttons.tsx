"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { setBirthdayRideRsvp } from "../_actions";

type Status = "yes" | "maybe" | "no";
type Entry = { profileId: string; name: string };

const COLUMNS: { value: Status; label: string }[] = [
  { value: "yes", label: "Rijdt mee" },
  { value: "maybe", label: "Misschien" },
  { value: "no", label: "Niet" },
];

export function BirthdayRsvpPicker({
  birthdayProfileId,
  celebrationYear,
  current,
  groups,
}: {
  birthdayProfileId: string;
  celebrationYear: number;
  current: Status | null;
  groups: Record<Status, Entry[]>;
}) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<Status | null>(current);
  const [error, setError] = useState<string | null>(null);

  function choose(s: Status) {
    if (s === active) return;
    setError(null);
    const prev = active;
    setActive(s);
    startTransition(async () => {
      const res = await setBirthdayRideRsvp(birthdayProfileId, celebrationYear, s);
      if (!res.ok) {
        setActive(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {COLUMNS.map((col) => {
          const isActive = active === col.value;
          return (
            <button
              key={col.value}
              type="button"
              aria-pressed={isActive}
              disabled={pending}
              onClick={() => choose(col.value)}
              className={cn(
                "rounded-lg border bg-background/60 p-3 text-left transition hover:border-zwb-gold/60 hover:bg-zwb-gold/5 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60",
                isActive
                  ? "border-zwb-gold bg-zwb-gold/10 ring-1 ring-zwb-gold/40"
                  : "border-border",
              )}
            >
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                {col.label}{" "}
                <span className="text-muted-foreground">
                  ({groups[col.value].length})
                </span>
                {isActive && pending && (
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                )}
                {isActive && !pending && (
                  <span className="ml-auto text-xs font-medium text-zwb-gold">
                    Jouw keuze
                  </span>
                )}
              </h3>
              {groups[col.value].length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {groups[col.value].map((entry) => (
                    <li key={entry.profileId}>{entry.name}</li>
                  ))}
                </ul>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
