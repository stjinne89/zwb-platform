"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MAX_CLIMBS, formatEur, type ChallengeEntry } from "@/lib/uitdaging";
import { deleteChallengeEntry, saveChallengeEntry } from "../_actions";

const INPUT = "w-full rounded-md border bg-background px-2 py-2 text-sm";
const LABEL = "mb-1 block text-xs font-medium text-muted-foreground";

export function EntryForm({
  eventId,
  entry,
  eventStarted,
}: {
  eventId: string;
  entry: ChallengeEntry | null;
  eventStarted: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await saveChallengeEntry(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function onLeave() {
    setError(null);
    startTransition(async () => {
      const res = await deleteChallengeEntry(eventId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/50 p-3">
        {entry ? (
          <p className="text-sm">
            <span className="font-medium">Jij: {entry.targetClimbs}× omhoog</span>
            {entry.climbsDone !== null && <span>, {entry.climbsDone}× gehaald</span>}
            {entry.raisedEur !== null && <span> · {formatEur(entry.raisedEur)} opgehaald</span>}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Je doet nog niet mee.</p>
        )}
        <Button type="button" size="sm" variant={entry ? "outline" : "default"} onClick={() => setOpen(true)}>
          {entry ? "Wijzigen" : "Doe mee"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border bg-background/60 p-3">
      <input type="hidden" name="event_id" value={eventId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Keer omhoog</span>
          <input
            name="target_climbs"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_CLIMBS}
            required
            defaultValue={entry?.targetClimbs ?? 1}
            className={INPUT}
          />
        </label>
        {eventStarted && (
          <label className="block">
            <span className={LABEL}>Gehaald</span>
            <input
              name="climbs_done"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_CLIMBS}
              defaultValue={entry?.climbsDone ?? ""}
              className={INPUT}
            />
          </label>
        )}
        <label className="block">
          <span className={LABEL}>Sponsordoel (€)</span>
          <input
            name="fundraising_target_eur"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={entry?.fundraisingTargetEur ?? ""}
            className={INPUT}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Opgehaald (€)</span>
          <input
            name="raised_eur"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={entry?.raisedEur ?? ""}
            className={INPUT}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={LABEL}>Actiepagina</span>
          <input
            name="fundraising_url"
            type="url"
            inputMode="url"
            placeholder="https://"
            maxLength={500}
            defaultValue={entry?.fundraisingUrl ?? ""}
            className={INPUT}
          />
        </label>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap justify-between gap-2">
        {entry ? (
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onLeave}>
            Afmelden
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Annuleer
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Opslaan…" : "Opslaan"}
          </Button>
        </div>
      </div>
    </form>
  );
}
