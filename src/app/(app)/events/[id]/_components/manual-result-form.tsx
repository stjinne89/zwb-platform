"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addManualEventResult } from "../_actions";

const FIELD =
  "rounded-md border border-input bg-background px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function ManualResultForm({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [timeText, setTimeText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Naam is verplicht.");
      return;
    }
    startTransition(async () => {
      const res = await addManualEventResult(eventId, {
        name,
        position,
        timeText,
      });
      if (res.ok) {
        setName("");
        setPosition("");
        setTimeText("");
        setOpen(false);
      } else {
        setError(res.error ?? "Toevoegen faalde.");
      }
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" />
        Handmatig toevoegen
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Naam
          <input
            className={`${FIELD} w-48`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Voornaam Achternaam"
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Positie
          <input
            className={`${FIELD} w-20`}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="bv. 42"
            inputMode="numeric"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Tijd
          <input
            className={`${FIELD} w-28`}
            value={timeText}
            onChange={(e) => setTimeText(e.target.value)}
            placeholder="bv. 6:27:03"
          />
        </label>
        <Button type="button" size="sm" onClick={submit} disabled={pending}>
          {pending ? "Bezig…" : "Toevoegen"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
        >
          Annuleer
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
