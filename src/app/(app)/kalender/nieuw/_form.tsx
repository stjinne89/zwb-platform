"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseGpx, type GpxSummary } from "@/lib/gpx";
import { createEvent, updateEvent } from "./actions";
import { Button } from "@/components/ui/button";

const TYPES: { value: string; label: string }[] = [
  { value: "outdoor", label: "Outdoor rit" },
  { value: "zrl", label: "ZRL race" },
  { value: "ladder", label: "Ladder race" },
  { value: "flamme_rouge", label: "Flamme Rouge" },
  { value: "social", label: "Social" },
  { value: "training", label: "Training" },
];

const FIELD_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export type EventInitial = {
  id: string;
  title: string;
  type: string;
  start_at: string | null; // ISO
  end_at: string | null; // ISO
  location: string | null;
  description: string | null;
  external_url: string | null;
  results_url: string | null;
  gpx_path: string | null;
  distance_km: number | string | null;
  elevation_m: number | string | null;
};

/** Converteer ISO-datum naar "YYYY-MM-DDTHH:MM" in local timezone. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({ initial }: { initial?: EventInitial }) {
  const isEdit = !!initial;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [gpx, setGpx] = useState<GpxSummary | null>(null);
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [removeExistingGpx, setRemoveExistingGpx] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasExistingGpx = Boolean(initial?.gpx_path);

  async function handleGpx(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const summary = parseGpx(text);
      setGpx(summary);
      setGpxFile(file);
      // Als gebruiker een nieuwe GPX kiest, geen "verwijder" meer hoeven aan te vinken.
      setRemoveExistingGpx(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kon GPX niet lezen.");
      setGpx(null);
      setGpxFile(null);
    }
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      let gpx_path: string | null | undefined = undefined; // undefined = niet wijzigen
      let distance_km: number | null | undefined = undefined;
      let elevation_m: number | null | undefined = undefined;
      let start_lat: number | null | undefined = undefined;
      let start_lon: number | null | undefined = undefined;

      if (gpxFile) {
        // Nieuwe GPX uploaden
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Sessie verlopen — log opnieuw in.");
          return;
        }
        const ext = gpxFile.name.split(".").pop() ?? "gpx";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("event-gpx")
          .upload(path, gpxFile, { contentType: "application/gpx+xml" });
        if (upErr) {
          setError("Upload GPX mislukt: " + upErr.message);
          return;
        }
        gpx_path = path;
        distance_km = gpx?.distance_km ?? null;
        elevation_m = gpx?.elevation_m ?? null;
        start_lat = gpx?.start?.lat ?? null;
        start_lon = gpx?.start?.lon ?? null;
      } else if (isEdit && removeExistingGpx) {
        gpx_path = null;
        distance_km = null;
        elevation_m = null;
        start_lat = null;
        start_lon = null;
      } else if (!isEdit) {
        // Bij nieuw event zonder GPX
        gpx_path = null;
      }

      const payload = {
        title: String(formData.get("title") ?? ""),
        type: String(formData.get("type") ?? ""),
        start_at: new Date(String(formData.get("start_at") ?? "")).toISOString(),
        end_at: formData.get("end_at")
          ? new Date(String(formData.get("end_at"))).toISOString()
          : null,
        location: String(formData.get("location") ?? "") || null,
        description: String(formData.get("description") ?? "") || null,
        external_url: String(formData.get("external_url") ?? "") || null,
        results_url: String(formData.get("results_url") ?? "") || null,
        gpx_path,
        distance_km,
        elevation_m,
        start_lat,
        start_lon,
      };

      const res = isEdit
        ? await updateEvent(initial!.id, payload)
        : await createEvent(payload);

      // createEvent / updateEvent redirecten bij succes — fout-pad komt hier.
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form action={submit} className="space-y-4 rounded-2xl border bg-card p-6">
      <div>
        <label className="mb-1 block text-sm font-medium">Titel</label>
        <input
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          className={FIELD_CLASS}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Type</label>
        <select
          name="type"
          required
          defaultValue={initial?.type ?? "outdoor"}
          className={FIELD_CLASS}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Start</label>
          <input
            type="datetime-local"
            name="start_at"
            required
            defaultValue={isoToLocalInput(initial?.start_at ?? null)}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Einde (optioneel)</label>
          <input
            type="datetime-local"
            name="end_at"
            defaultValue={isoToLocalInput(initial?.end_at ?? null)}
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Locatie</label>
        <input
          name="location"
          placeholder="Bv. Tankstation Tilburg-Zuid"
          defaultValue={initial?.location ?? ""}
          className={FIELD_CLASS}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Beschrijving</label>
        <textarea
          name="description"
          rows={3}
          className={FIELD_CLASS}
          placeholder="Tempo, koffie-stop, kit, regels…"
          defaultValue={initial?.description ?? ""}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Externe link (optioneel)
        </label>
        <input
          type="url"
          name="external_url"
          placeholder="https://www.strava.com/routes/… of Komoot, RideWithGPS, Garmin"
          defaultValue={initial?.external_url ?? ""}
          className={FIELD_CLASS}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Strava-route, Komoot tour, RideWithGPS — wordt op de event-pagina
          getoond als &quot;Open op X&quot;-knop met platform-icoon.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Uitslag-URL (optioneel)
        </label>
        <input
          type="url"
          name="results_url"
          placeholder="https://… (Ultratiming, ACN Timing, datasport, uitslagenpagina)"
          defaultValue={initial?.results_url ?? ""}
          className={FIELD_CLASS}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Link naar de uitslag op de timing-site. Een admin kan dan op de
          event-pagina &quot;Uitslag ophalen&quot; klikken — we tonen alleen de
          ZWB&apos;ers met hun klassering en tijd.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">GPX-route (optioneel)</label>

        {hasExistingGpx && !gpxFile && !removeExistingGpx && (
          <div className="mb-2 rounded-md border bg-muted/40 p-3 text-sm">
            <p>
              Huidige GPX geüpload
              {initial?.distance_km
                ? ` — ${Number(initial.distance_km).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km`
                : ""}
              {initial?.elevation_m ? ` · ${initial.elevation_m} hm` : ""}.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload hieronder een nieuwe GPX om hem te vervangen, of klik
              &quot;Verwijder&quot; om de route weg te halen.
            </p>
            <button
              type="button"
              onClick={() => setRemoveExistingGpx(true)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
            >
              <Trash2 className="size-3" />
              Verwijder huidige GPX
            </button>
          </div>
        )}

        {removeExistingGpx && (
          <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p>
              Huidige GPX wordt verwijderd bij opslaan.{" "}
              <button
                type="button"
                onClick={() => setRemoveExistingGpx(false)}
                className="font-medium text-primary hover:underline"
              >
                Annuleer
              </button>
            </p>
          </div>
        )}

        <input
          type="file"
          accept=".gpx,application/gpx+xml,application/xml,text/xml"
          onChange={handleGpx}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
        />
        {gpx && (
          <p className="mt-2 text-xs text-muted-foreground">
            Nieuwe GPX gelezen: {gpx.points.length} punten · {gpx.distance_km} km ·{" "}
            {gpx.elevation_m} hm
          </p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? isEdit
              ? "Opslaan…"
              : "Bezig…"
            : isEdit
              ? "Opslaan"
              : "Aanmaken"}
        </Button>
        {isEdit && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => router.push(`/events/${initial!.id}`)}
          >
            Annuleer
          </Button>
        )}
      </div>
    </form>
  );
}
