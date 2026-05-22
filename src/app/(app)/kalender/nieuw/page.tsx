"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseGpx, type GpxSummary } from "@/lib/gpx";
import { createEvent } from "./actions";
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

export default function NewEventPage() {
  const [pending, startTransition] = useTransition();
  const [gpx, setGpx] = useState<GpxSummary | null>(null);
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGpx(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const summary = parseGpx(text);
      setGpx(summary);
      setGpxFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kon GPX niet lezen.");
      setGpx(null);
      setGpxFile(null);
    }
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      let gpx_path: string | null = null;

      if (gpxFile) {
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
      }

      const res = await createEvent({
        title: String(formData.get("title") ?? ""),
        type: String(formData.get("type") ?? ""),
        start_at: new Date(String(formData.get("start_at") ?? "")).toISOString(),
        end_at: formData.get("end_at")
          ? new Date(String(formData.get("end_at"))).toISOString()
          : null,
        location: String(formData.get("location") ?? "") || null,
        description: String(formData.get("description") ?? "") || null,
        external_url: String(formData.get("external_url") ?? "") || null,
        gpx_path,
        distance_km: gpx?.distance_km ?? null,
        elevation_m: gpx?.elevation_m ?? null,
        start_lat: gpx?.start?.lat ?? null,
        start_lon: gpx?.start?.lon ?? null,
      });
      // createEvent redirects on success — only error case returns.
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Nieuw event</h1>
        <p className="mt-1 text-muted-foreground">
          Plan een rit, race of social. GPX is optioneel — als je er één toevoegt,
          rekenen we afstand en hoogtemeters automatisch uit.
        </p>
      </header>

      <form action={submit} className="space-y-4 rounded-2xl border bg-card p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Titel</label>
          <input name="title" required className={FIELD_CLASS} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Type</label>
          <select name="type" required defaultValue="outdoor" className={FIELD_CLASS}>
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
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Einde (optioneel)</label>
            <input type="datetime-local" name="end_at" className={FIELD_CLASS} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Locatie</label>
          <input
            name="location"
            placeholder="Bv. Tankstation Tilburg-Zuid"
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
            className={FIELD_CLASS}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Strava-route, Komoot tour, RideWithGPS — wordt op de event-pagina
            getoond als &quot;Open op X&quot;-knop met platform-icoon.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">GPX-route (optioneel)</label>
          <input
            type="file"
            accept=".gpx,application/gpx+xml,application/xml,text/xml"
            onChange={handleGpx}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
          />
          {gpx && (
            <p className="mt-2 text-xs text-muted-foreground">
              {gpx.points.length} punten · {gpx.distance_km} km ·{" "}
              {gpx.elevation_m} hm
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Bezig…" : "Aanmaken"}
          </Button>
        </div>
      </form>
    </div>
  );
}
