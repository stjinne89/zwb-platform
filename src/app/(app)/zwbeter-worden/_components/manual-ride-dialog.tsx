"use client";

// Een training gereden, maar de opname mislukte: de rit zelf invoeren, meteen
// aan deze training. Zie saveManualRide in _actions/manual-ride.ts.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteManualRide, saveManualRide } from "@/app/(app)/_actions/manual-ride";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";
const SMALL_BUTTON =
  "rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50";

function durationText(minutes: number | null) {
  if (!minutes) return "";
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

export function ManualRideDialog({
  workoutId,
  title,
  dateKey,
  maxDateKey,
  durationMinutes,
}: {
  workoutId: string;
  title: string;
  /** De dag van de training; de rit kan niet eerder zijn. */
  dateKey: string;
  maxDateKey: string;
  durationMinutes: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    const text = (key: string) => String(formData.get(key) ?? "");
    setError(null);
    startTransition(async () => {
      const res = await saveManualRide(workoutId, {
        name: text("name"),
        date: text("date"),
        time: text("time"),
        duration: text("duration"),
        distanceKm: text("distanceKm"),
        elevationM: text("elevationM"),
        indoor: formData.get("indoor") === "on",
        averageWatts: text("averageWatts"),
        normalizedWatts: text("normalizedWatts"),
        averageHr: text("averageHr"),
      }).catch(() => null);
      if (!res?.ok) {
        setError(res?.error ?? "Opslaan mislukt.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        className={SMALL_BUTTON}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Rit invoeren
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rit invoeren</DialogTitle>
          </DialogHeader>
          <form action={submit} className="grid grid-cols-2 gap-3">
            <label className="col-span-2">
              <span className={LABEL}>Naam</span>
              <input name="name" maxLength={120} defaultValue={title} className={FIELD} />
            </label>
            <label>
              <span className={LABEL}>Datum</span>
              <input
                name="date"
                type="date"
                required
                defaultValue={dateKey}
                min={dateKey}
                max={maxDateKey}
                className={FIELD}
              />
            </label>
            <label>
              <span className={LABEL}>Starttijd</span>
              <input name="time" type="time" required className={FIELD} />
            </label>
            <label>
              <span className={LABEL}>Duur</span>
              <input
                name="duration"
                required
                defaultValue={durationText(durationMinutes)}
                placeholder="1:30"
                inputMode="numeric"
                pattern="\d{1,2}[:.uh]\d{2}|\d{1,4}"
                className={FIELD}
              />
            </label>
            <label>
              <span className={LABEL}>Afstand (km)</span>
              <input name="distanceKm" inputMode="decimal" className={FIELD} />
            </label>
            <label>
              <span className={LABEL}>Hoogtemeters</span>
              <input name="elevationM" inputMode="numeric" className={FIELD} />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium">
              <input name="indoor" type="checkbox" className="size-4" />
              Binnen
            </label>
            <label>
              <span className={LABEL}>Gem. vermogen (W)</span>
              <input name="averageWatts" inputMode="numeric" className={FIELD} />
            </label>
            <label>
              <span className={LABEL}>NP (W)</span>
              <input name="normalizedWatts" inputMode="numeric" className={FIELD} />
            </label>
            <label>
              <span className={LABEL}>Gem. hartslag</span>
              <input name="averageHr" inputMode="numeric" className={FIELD} />
            </label>
            {error ? <p className="col-span-2 text-sm text-destructive">{error}</p> : null}
            <DialogFooter className="col-span-2 mt-1">
              <Button type="submit" disabled={pending}>
                {pending ? "Opslaan..." : "Opslaan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Een zelf ingevoerde rit weer weghalen; de training staat daarna weer open. */
export function DeleteManualRideButton({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!confirm("Ingevoerde rit verwijderen?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteManualRide(Number(activityId)).catch(() => null);
      if (!res?.ok) {
        setError(res?.error ?? "Verwijderen mislukt.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={remove} disabled={pending} className={SMALL_BUTTON}>
        {pending ? "Bezig…" : "Ingevoerde rit verwijderen"}
      </button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
