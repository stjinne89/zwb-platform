"use client";

// Knoppen voor leden die hun ritten via intervals.icu krijgen: zelf ophalen en
// de herinnering "open intervals.icu even" afvinken. Uitleg staat op
// /hulp#ritten-via-intervals, niet hier.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  confirmIntervalsVisit,
  syncMyIntervalsRides,
} from "@/app/(app)/_actions/intervals-rides";
import { Button } from "@/components/ui/button";

export function IntervalsRideSyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  return (
    <div className="flex w-full flex-col items-start gap-2 sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Ritten via intervals.icu</span>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const res = await syncMyIntervalsRides();
              if (!res.ok) {
                setMessage({ error: true, text: res.error });
                return;
              }
              setMessage({
                error: false,
                text:
                  res.stored > 0
                    ? `${res.stored} rit${res.stored === 1 ? "" : "ten"} bijgewerkt.`
                    : "Geen nieuwe ritten.",
              });
              router.refresh();
            });
          }}
        >
          <RefreshCw data-icon="inline-start" className={pending ? "animate-spin" : undefined} />
          Ritten ophalen
        </Button>
      </div>
      {message ? (
        <p className={message.error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

export function IntervalsVisitReminder() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="mb-3 flex flex-wrap items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        Open{" "}
        <a
          href="https://intervals.icu"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-2"
        >
          intervals.icu
        </a>{" "}
        even, dan blijven je ritten binnenkomen.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await confirmIntervalsVisit();
            router.refresh();
          })
        }
      >
        Gedaan
      </Button>
    </div>
  );
}
