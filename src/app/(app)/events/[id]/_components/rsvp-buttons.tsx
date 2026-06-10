"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { setRsvp } from "../_actions";

type Status = "yes" | "maybe" | "no";
type Entry = { name: string; zrl: string | null };

const COLUMNS: { value: Status; label: string }[] = [
  { value: "yes", label: "Ja" },
  { value: "maybe", label: "Misschien" },
  { value: "no", label: "Nee" },
];

export function RsvpPicker({
  eventId,
  current,
  groups,
}: {
  eventId: string;
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
      const res = await setRsvp(eventId, s);
      if (!res.ok) {
        setActive(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                "rounded-lg border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60",
                isActive
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
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
                  <span className="ml-auto text-xs font-medium text-primary">
                    Jouw keuze
                  </span>
                )}
              </h3>
              {groups[col.value].length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {groups[col.value].map((entry, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-1.5">
                      <span>{entry.name}</span>
                      {entry.zrl && (
                        <span
                          className="rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
                          title={`ZRL-categorie ${entry.zrl}`}
                        >
                          {entry.zrl}
                        </span>
                      )}
                    </li>
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
