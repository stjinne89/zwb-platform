"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addExtraStream } from "@/app/(app)/_actions/livestream";
import { Button } from "@/components/ui/button";

// Een extra stream bij een race (0370): een link naar een stream die niet van
// jou is, van een ander lid of van een tegenstander. Op de racepagina bij één
// race; in het streamcenter met een keuze als er die avond meer races zijn.

export type ExtraStreamRace = { id: string; label: string };

export function AddExtraStreamForm({ races }: { races: ExtraStreamRace[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [raceId, setRaceId] = useState(races[0]?.id ?? "");
  if (races.length === 0) return null;

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await addExtraStream(raceId, link);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setLink("");
          router.refresh();
        });
      }}
    >
      {races.length > 1 && (
        <select
          aria-label="Race"
          value={raceId}
          disabled={pending}
          onChange={(event) => setRaceId(event.target.value)}
          className="h-8 max-w-full rounded-md border bg-background px-2 text-sm"
        >
          {races.map((race) => (
            <option key={race.id} value={race.id}>
              {race.label}
            </option>
          ))}
        </select>
      )}
      <input
        type="url"
        inputMode="url"
        aria-label="Link van een andere stream"
        placeholder="Link van een andere stream"
        value={link}
        disabled={pending}
        onChange={(event) => setLink(event.target.value)}
        className="h-8 min-w-0 flex-[1_1_14rem] rounded-md border bg-background px-2 text-sm"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending || !link.trim()}>
        <Plus className="size-3.5" />
        {pending ? "Bezig…" : "Stream toevoegen"}
      </Button>
      {error && <span className="basis-full text-sm text-destructive">{error}</span>}
    </form>
  );
}
