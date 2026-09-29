"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { refreshFrrTour, saveFrrTour } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

type SyncResult = {
  stagesCreated: number;
  slotsCreated: number;
  updated: number;
  slotsSynced: number;
  entrants: number;
  notes: string[];
};

function summary(result: SyncResult) {
  const parts = [
    `${result.stagesCreated} etappes en ${result.slotsCreated} tijdsloten toegevoegd`,
    result.updated > 0 ? `${result.updated} bijgewerkt` : null,
    result.slotsSynced > 0
      ? `${result.entrants} inschrijvingen in ${result.slotsSynced} slots`
      : null,
  ].filter(Boolean);
  return [parts.join(", ") + ".", ...result.notes].join(" ");
}

export function TourForm({
  initial,
}: {
  initial?: { name: string; tag: string; gcCode: string | null };
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [gcCode, setGcCode] = useState(initial?.gcCode ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await saveFrrTour({ name, tag, gcCode });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(summary(res.result));
      if (!initial) {
        setName("");
        setTag("");
        setGcCode("");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={LABEL} htmlFor={`frr-name-${initial?.tag ?? "nieuw"}`}>
            Naam
          </label>
          <input
            id={`frr-name-${initial?.tag ?? "nieuw"}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tour Ignite"
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`frr-tag-${initial?.tag ?? "nieuw"}`}>
            Zwift-tag
          </label>
          <input
            id={`frr-tag-${initial?.tag ?? "nieuw"}`}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="frrignite"
            readOnly={Boolean(initial)}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`frr-gc-${initial?.tag ?? "nieuw"}`}>
            GC-code
          </label>
          <input
            id={`frr-gc-${initial?.tag ?? "nieuw"}`}
            value={gcCode}
            onChange={(e) => setGcCode(e.target.value)}
            placeholder="FTQ.5"
            className={FIELD}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={submit} disabled={pending}>
          {pending ? "Bezig…" : initial ? "Opslaan" : "Tour toevoegen"}
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

export function RefreshButton({ tourId }: { tourId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            setMessage(null);
            const res = await refreshFrrTour(tourId);
            if (!res.ok) setError(res.error);
            else setMessage(summary(res.result));
            router.refresh();
          })
        }
      >
        {pending ? "Bezig…" : "Nu verversen"}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
