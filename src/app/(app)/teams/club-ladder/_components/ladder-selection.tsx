"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setLadderSelection, type LineupRider } from "../../[id]/_actions";

export type SelectionOption = LineupRider & { name: string };

const keyOf = (rider: LineupRider) => `${rider.kind}:${rider.id}`;

/** Captain kiest wie er in deze ladderwedstrijd rijdt. */
export function LadderSelection({
  teamId,
  eventId,
  options,
  selected,
}: {
  teamId: string;
  eventId: string;
  options: SelectionOption[];
  selected: LineupRider[];
}) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(selected.map(keyOf)));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(key: string) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function save() {
    setError(null);
    const riders = options.filter((option) => chosen.has(keyOf(option))).map(({ kind, id }) => ({ kind, id }));
    startTransition(async () => {
      const res = await setLadderSelection(teamId, eventId, riders);
      if (res.ok) setOpen(false);
      else setError(res.error);
    });
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => setOpen(true)}>
        Selectie
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-2">
      <ul className="grid gap-1 sm:grid-cols-2">
        {options.map((option) => {
          const key = keyOf(option);
          return (
            <li key={key}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={chosen.has(key)} onChange={() => toggle(key)} disabled={pending} />
                <span className="truncate">{option.name}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          Opslaan
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setChosen(new Set(selected.map(keyOf)));
            setOpen(false);
          }}
        >
          Annuleren
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">{chosen.size} gekozen</span>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
