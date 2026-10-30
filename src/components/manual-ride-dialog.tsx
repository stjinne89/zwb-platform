"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteManualRide,
  listMyManualRides,
  saveManualRide,
  type ManualRide,
} from "@/app/(app)/_actions/manual-ride";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

function todayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

function rideLabel(ride: ManualRide) {
  const when = new Date(ride.start_date).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
  const minutes = Math.round(ride.moving_time_seconds / 60);
  const duration = `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
  const km = ride.distance_m > 0 ? ` · ${(ride.distance_m / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km` : "";
  return `${when} · ${duration}${km}`;
}

/** Een gereden rit zelf invullen als het bestand ontbreekt. */
export function ManualRideDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rides, setRides] = useState<ManualRide[]>([]);
  const [pending, startTransition] = useTransition();

  function loadRides() {
    listMyManualRides()
      .then((res) => setRides(res.ok ? res.rides : []))
      .catch(() => setRides([]));
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setError(null);
    setDate((current) => current || todayKey());
    loadRides();
  }

  function submit(formData: FormData) {
    const text = (key: string) => String(formData.get(key) ?? "");
    setError(null);
    startTransition(async () => {
      const res = await saveManualRide({
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
      setDate("");
      router.refresh();
    });
  }

  function remove(id: number) {
    setError(null);
    startTransition(async () => {
      const res = await deleteManualRide(id).catch(() => null);
      if (!res?.ok) {
        setError(res?.error ?? "Verwijderen mislukt.");
        return;
      }
      setRides((current) => current.filter((ride) => ride.id !== id));
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => onOpenChange(true)}
      >
        <PencilLine data-icon="inline-start" />
        Rit invoeren
      </Button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rit invoeren</DialogTitle>
          </DialogHeader>
          <form action={submit} className="grid grid-cols-2 gap-3">
            <label className="col-span-2">
              <span className={LABEL}>Naam</span>
              <input name="name" maxLength={120} placeholder="Fietsrit" className={FIELD} />
            </label>
            <label>
              <span className={LABEL}>Datum</span>
              <input
                name="date"
                type="date"
                required
                value={date}
                max={todayKey()}
                onChange={(event) => setDate(event.target.value)}
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
          {rides.length > 0 ? (
            <div className="mt-5 border-t pt-4">
              <p className="mb-2 text-sm font-medium">Ingevoerd</p>
              <ul className="divide-y rounded-md border">
                {rides.map((ride) => (
                  <li key={ride.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{ride.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {rideLabel(ride)}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${ride.name} verwijderen`}
                      disabled={pending}
                      onClick={() => remove(ride.id)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
