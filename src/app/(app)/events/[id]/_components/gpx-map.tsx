"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { parseGpx, type GpxPoint } from "@/lib/gpx";
import "leaflet/dist/leaflet.css";

// react-leaflet hits window during init — must be client-only.
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false },
);

export function GpxMap({ gpxUrl }: { gpxUrl: string }) {
  const [points, setPoints] = useState<GpxPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(gpxUrl);
        if (!res.ok) throw new Error(`Kon GPX niet ophalen (${res.status})`);
        const text = await res.text();
        const summary = parseGpx(text);
        if (!cancelled) setPoints(summary.points);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Onbekende fout");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gpxUrl]);

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (points.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
        Route laden…
      </div>
    );
  }

  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];
  const positions = points.map((p) => [p.lat, p.lon] as [number, number]);

  return (
    <div className="h-80 overflow-hidden rounded-lg border">
      <MapContainer bounds={bounds} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={positions} pathOptions={{ color: "#ef4444", weight: 4 }} />
      </MapContainer>
    </div>
  );
}
