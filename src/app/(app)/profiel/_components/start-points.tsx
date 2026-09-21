"use client";

// Waar vertrek je? Een punt op de kaart, geen adres.
//
// Dit is de meest privacygevoelige gegevens die ZWB bewaart, en dat bepaalt de
// vorm: het lid prikt zelf een punt, er wordt niets afgeleid uit ritten en er
// gaat geen adres naar een geocoder. De database rondt de coördinaat af op ~110 m
// (migratie 0173) en geen ander lid kan erbij. De uitleg daarover staat in de
// privacyverklaring, niet hier.

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { MapPin, Trash2 } from "lucide-react";
import { deleteStartPoint, saveStartPoint } from "../_actions/start-points";
import "leaflet/dist/leaflet.css";

// react-leaflet raakt window aan bij het initialiseren, dus client-only.
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), {
  ssr: false,
});
const MapClick = dynamic(() => import("@/components/map-click"), { ssr: false });

export type StartPointRow = { id: string; label: string; lat: number; lon: number };

/** Midden van Nederland, zodat de kaart ergens nuttigs opent. */
const DEFAULT_CENTER: [number, number] = [52.1, 5.3];

export function StartPoints({ points }: { points: StartPointRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lon: number } | null>(null);
  const [label, setLabel] = useState("");

  const center: [number, number] = points[0]
    ? [points[0].lat, points[0].lon]
    : DEFAULT_CENTER;

  function save() {
    if (!picked) {
      setError("Klik eerst op de kaart.");
      return;
    }
    if (!label.trim()) {
      setError("Geef het punt een naam.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("label", label.trim());
      formData.set("lat", String(picked.lat));
      formData.set("lon", String(picked.lon));
      const outcome = await saveStartPoint(formData);
      if (outcome.ok) {
        setPicked(null);
        setLabel("");
      } else {
        setError(outcome.error ?? "Bewaren faalde.");
      }
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("start_point_id", id);
      const outcome = await deleteStartPoint(formData);
      if (!outcome.ok) setError(outcome.error ?? "Verwijderen faalde.");
    });
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <MapPin className="size-4 text-primary" />
        Vertrekpunten
      </h2>

      {points.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {points.map((point) => (
            <li
              key={point.id}
              className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{point.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {point.lat.toFixed(3)}, {point.lon.toFixed(3)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(point.id)}
                disabled={pending}
                aria-label={`${point.label} verwijderen`}
                className="rounded-md border p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 h-64 overflow-hidden rounded-md border">
        <MapContainer center={center} zoom={points[0] ? 12 : 8} className="size-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClick onClick={(lat, lng) => setPicked({ lat, lon: lng })} />
          {points.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lon]}
              radius={7}
              pathOptions={{ color: "#1f6068", fillColor: "#1f6068", fillOpacity: 0.7 }}
            />
          ))}
          {picked ? (
            <CircleMarker
              center={[picked.lat, picked.lon]}
              radius={8}
              pathOptions={{ color: "#b8873d", fillColor: "#b8873d", fillOpacity: 0.8 }}
            />
          ) : null}
        </MapContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Thuis"
          maxLength={60}
          aria-label="Naam van het vertrekpunt"
          className="min-w-0 flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || !picked}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {pending ? "Bezig..." : "Bewaren"}
        </button>
      </div>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
