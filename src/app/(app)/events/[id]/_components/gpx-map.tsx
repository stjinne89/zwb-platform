"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Maximize2, X } from "lucide-react";
import type { GpxPoint } from "@/lib/gpx";
import {
  CLIMB_CATEGORY_HEX,
  type Climb,
} from "@/lib/gpx-climbs";
import { climbLength } from "./climb-overlay";
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
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false },
);
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

const fmt = (n: number, digits = 1) =>
  n.toLocaleString("nl-NL", { maximumFractionDigits: digits });

type LatLng = [number, number];

type MapData = {
  bounds: [LatLng, LatLng];
  positions: LatLng[];
  climbs: Climb[];
  activeClimb: number | null;
  onActiveClimb: (index: number | null) => void;
};

export function GpxMap({
  points,
  climbs,
  activeClimb,
  onActiveClimb,
}: {
  points: GpxPoint[];
  climbs: Climb[];
  activeClimb: number | null;
  onActiveClimb: (index: number | null) => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  if (points.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
        Route laden…
      </div>
    );
  }

  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const bounds: [LatLng, LatLng] = [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];
  const positions = points.map((p) => [p.lat, p.lon] as LatLng);
  const data: MapData = { bounds, positions, climbs, activeClimb, onActiveClimb };

  return (
    <>
      <div className="relative h-80 overflow-hidden rounded-lg border">
        <MapContainer bounds={bounds} className="h-full w-full" scrollWheelZoom>
          <MapLayers {...data} />
        </MapContainer>
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          aria-label="Kaart vergroten"
          className="absolute right-2 top-2 z-[1000] rounded-md bg-card/80 p-1 text-muted-foreground shadow-sm backdrop-blur transition hover:text-foreground"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>

      {fullscreen && (
        <FullscreenMap data={data} onClose={() => setFullscreen(false)} />
      )}
    </>
  );
}

function FullscreenMap({
  data,
  onClose,
}: {
  data: MapData;
  onClose: () => void;
}) {
  // Body-scroll vergrendelen + Escape sluit. Geen rotatie — een kaart vult elk
  // formaat prima, dus ook op desktop gewoon groot (niet liggend).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-card">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b p-3">
        <span className="text-sm font-medium">Route</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="rounded-md border bg-background p-1.5 text-muted-foreground transition hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="relative flex-1">
        <MapContainer bounds={data.bounds} className="h-full w-full" scrollWheelZoom>
          <MapLayers {...data} />
        </MapContainer>
      </div>
    </div>
  );
}

function MapLayers({ positions, climbs, activeClimb, onActiveClimb }: MapData) {
  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={positions} pathOptions={{ color: "#475569", weight: 4 }} />

      {climbs.map((climb, i) => {
        const segment = positions.slice(climb.startIdx, climb.endIdx + 1);
        if (segment.length < 2) return null;
        const color = CLIMB_CATEGORY_HEX[climb.category];
        const active = activeClimb === i;
        return (
          <Polyline
            key={i}
            positions={segment}
            pathOptions={{ color, weight: active ? 8 : 6, opacity: 0.95 }}
            eventHandlers={{ click: () => onActiveClimb(active ? null : i) }}
          >
            <Tooltip direction="top" className="!bg-card !text-foreground">
              <strong>{climb.name ?? `Klim (${climb.category})`}</strong>
            </Tooltip>
            <Popup>
              <ClimbPopup climb={climb} />
            </Popup>
          </Polyline>
        );
      })}

      {climbs.map((climb, i) => {
        const foot = positions[climb.startIdx];
        if (!foot) return null;
        return (
          <CircleMarker
            key={`m-${i}`}
            center={foot}
            radius={6}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: CLIMB_CATEGORY_HEX[climb.category],
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onActiveClimb(activeClimb === i ? null : i) }}
          >
            <Tooltip direction="top" offset={[0, -6]} className="!bg-card !text-foreground">
              <strong>{climb.name ?? `Klim (${climb.category})`}</strong>
            </Tooltip>
            <Popup>
              <ClimbPopup climb={climb} />
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

function ClimbPopup({ climb }: { climb: Climb }) {
  return (
    <div className="min-w-40 space-y-1 text-sm">
      <p className="font-semibold">{climb.name ?? "Klim"}</p>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {climb.category} categorie
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums">
        <dt className="text-muted-foreground">Lengte</dt>
        <dd>{climbLength(climb)}</dd>
        <dt className="text-muted-foreground">Gem.</dt>
        <dd>{fmt(climb.avgGradient)}%</dd>
        <dt className="text-muted-foreground">Max.</dt>
        <dd>{fmt(climb.maxGradient)}%</dd>
        <dt className="text-muted-foreground">Stijging</dt>
        <dd>{Math.round(climb.gainM)} hm</dd>
      </dl>
    </div>
  );
}
