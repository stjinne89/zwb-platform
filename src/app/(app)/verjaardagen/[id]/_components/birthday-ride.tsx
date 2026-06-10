"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  Download,
  Loader2,
  MapPin,
  Pencil,
  Route,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateKey } from "@/lib/birthdays";
import { parseGpx, type GpxSummary } from "@/lib/gpx";
import { createClient } from "@/lib/supabase/client";
import { deleteBirthdayRide, saveBirthdayRide } from "../_actions";

const FIELD_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const MAX_GPX_SIZE = 10 * 1024 * 1024;

export type BirthdayRide = {
  rideDate: string;
  rideTime: string;
  location: string;
  invitation: string;
  gpxPath: string | null;
  gpxUrl: string | null;
  distanceKm: number | null;
  elevationM: number | null;
};

export function BirthdayRideCard({
  birthdayProfileId,
  celebrationYear,
  birthdayName,
  defaultDate,
  isOwner,
  ride,
}: {
  birthdayProfileId: string;
  celebrationYear: number;
  birthdayName: string;
  defaultDate: string;
  isOwner: boolean;
  ride: BirthdayRide | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [gpxSummary, setGpxSummary] = useState<GpxSummary | null>(null);
  const [removeGpx, setRemoveGpx] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectGpx(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX_GPX_SIZE) {
      setGpxFile(null);
      setGpxSummary(null);
      setError("De GPX is te groot (maximaal 10 MB).");
      return;
    }

    try {
      const summary = parseGpx(await file.text());
      if (summary.points.length < 2) {
        throw new Error("Deze GPX bevat geen bruikbare route.");
      }
      setGpxFile(file);
      setGpxSummary(summary);
      setRemoveGpx(false);
    } catch (gpxError) {
      setGpxFile(null);
      setGpxSummary(null);
      setError(
        gpxError instanceof Error ? gpxError.message : "Kon GPX niet lezen.",
      );
    }
  }

  function cancelEditing() {
    setEditing(false);
    setGpxFile(null);
    setGpxSummary(null);
    setRemoveGpx(false);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      let uploadedPath: string | null = null;
      try {
        let gpxPath = removeGpx ? null : ride?.gpxPath ?? null;
        let distanceKm = removeGpx ? null : ride?.distanceKm ?? null;
        let elevationM = removeGpx ? null : ride?.elevationM ?? null;

        if (gpxFile && gpxSummary) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user || user.id !== birthdayProfileId) {
            setError("Sessie verlopen. Log opnieuw in.");
            return;
          }

          uploadedPath =
            `${birthdayProfileId}/${celebrationYear}/` +
            `${crypto.randomUUID()}.gpx`;
          const { error: uploadError } = await supabase.storage
            .from("birthday-gpx")
            .upload(uploadedPath, gpxFile, {
              contentType: "application/gpx+xml",
              upsert: false,
            });
          if (uploadError) {
            setError(`Upload mislukt: ${uploadError.message}`);
            return;
          }
          gpxPath = uploadedPath;
          distanceKm = gpxSummary.distance_km;
          elevationM = gpxSummary.elevation_m;
        }

        const result = await saveBirthdayRide(
          birthdayProfileId,
          celebrationYear,
          {
            rideDate: String(formData.get("ride_date") ?? ""),
            rideTime: String(formData.get("ride_time") ?? ""),
            location: String(formData.get("location") ?? ""),
            invitation: String(formData.get("invitation") ?? ""),
            gpxPath,
            distanceKm,
            elevationM,
          },
        );

        if (!result.ok) {
          if (uploadedPath) {
            await supabase.storage.from("birthday-gpx").remove([uploadedPath]);
          }
          setError(result.error);
          return;
        }

        cancelEditing();
        router.refresh();
      } catch (saveError) {
        if (uploadedPath) {
          await supabase.storage.from("birthday-gpx").remove([uploadedPath]);
        }
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Opslaan is niet gelukt.",
        );
      }
    });
  }

  function removeRide() {
    if (!confirm("Verjaardagsrondje verwijderen?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteBirthdayRide(
        birthdayProfileId,
        celebrationYear,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      cancelEditing();
      router.refresh();
    });
  }

  const showForm = isOwner && (editing || !ride);

  return (
    <section className="relative overflow-hidden rounded-xl border border-zwb-gold/40 bg-gradient-to-br from-zwb-gold/10 via-card to-card p-5 pl-6 shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-zwb-gold before:content-['']">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Route className="size-5 text-zwb-gold" />
            <h2 className="font-semibold">
              Waar en wanneer is het verjaardagsrondje?
            </h2>
          </div>
          {!ride && !showForm && (
            <p className="mt-2 text-sm text-muted-foreground">
              {birthdayName} heeft nog geen verjaardagsrondje gepland.
            </p>
          )}
        </div>
        {isOwner && ride && !showForm && (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            Bewerken
          </Button>
        )}
      </div>

      {ride && !showForm && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-2 rounded-lg border border-zwb-gold/20 bg-background/60 p-3">
              <CalendarDays className="mt-0.5 size-4 text-zwb-gold" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Datum</p>
                <p className="text-sm font-medium">
                  {formatDateKey(ride.rideDate, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-zwb-gold/20 bg-background/60 p-3">
              <Clock3 className="mt-0.5 size-4 text-zwb-gold" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Tijd</p>
                <p className="text-sm font-medium">{ride.rideTime.slice(0, 5)} uur</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-zwb-gold/20 bg-background/60 p-3">
              <MapPin className="mt-0.5 size-4 text-zwb-gold" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Waar</p>
                <p className="break-words text-sm font-medium">{ride.location}</p>
              </div>
            </div>
          </div>

          <p className="whitespace-pre-wrap text-sm leading-6">{ride.invitation}</p>

          {ride.gpxUrl && (
            <a
              href={ride.gpxUrl}
              download
              className="inline-flex items-center gap-2 rounded-lg border border-zwb-gold/35 bg-zwb-gold/10 px-3 py-2 text-sm font-medium hover:bg-zwb-gold/20"
            >
              <Download className="size-4" />
              GPX-route
              {ride.distanceKm !== null &&
                ` · ${ride.distanceKm.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km`}
              {ride.elevationM !== null && ` · ${ride.elevationM} hm`}
            </a>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {showForm && (
        <form action={save} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Datum</label>
              <input
                type="date"
                name="ride_date"
                required
                min={`${celebrationYear}-01-01`}
                max={`${celebrationYear}-12-31`}
                defaultValue={ride?.rideDate ?? defaultDate}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Tijd</label>
              <input
                type="time"
                name="ride_time"
                required
                defaultValue={ride?.rideTime.slice(0, 5) ?? ""}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Waar</label>
            <input
              name="location"
              required
              maxLength={160}
              defaultValue={ride?.location ?? ""}
              placeholder="Startlocatie"
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Uitnodiging</label>
            <textarea
              name="invitation"
              required
              maxLength={1000}
              rows={4}
              defaultValue={ride?.invitation ?? ""}
              placeholder="Vertel kort wat je van plan bent..."
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">GPX-route (optioneel)</label>
            {ride?.gpxPath && !gpxFile && !removeGpx && (
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background/60 p-3 text-sm">
                <span>GPX-route toegevoegd</span>
                <button
                  type="button"
                  onClick={() => setRemoveGpx(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
                >
                  <Trash2 className="size-3" />
                  Verwijderen
                </button>
              </div>
            )}
            {removeGpx && (
              <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                GPX wordt verwijderd.{" "}
                <button
                  type="button"
                  onClick={() => setRemoveGpx(false)}
                  className="font-medium text-primary hover:underline"
                >
                  Ongedaan maken
                </button>
              </div>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
            >
              <Upload className="size-4" />
              {gpxFile ? gpxFile.name : "GPX kiezen"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".gpx,application/gpx+xml,application/xml,text/xml"
              className="hidden"
              onChange={selectGpx}
            />
            {gpxSummary && (
              <p className="mt-2 text-xs text-muted-foreground">
                {gpxSummary.distance_km.toLocaleString("nl-NL", {
                  maximumFractionDigits: 1,
                })}{" "}
                km · {gpxSummary.elevation_m} hm
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {pending ? "Opslaan..." : "Opslaan"}
            </Button>
            {ride && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={cancelEditing}
                >
                  Annuleren
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  onClick={removeRide}
                >
                  <Trash2 className="size-4" />
                  Rondje verwijderen
                </Button>
              </>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
