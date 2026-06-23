"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Maximize2, X } from "lucide-react";
import type { DivIcon, LeafletEvent } from "leaflet";
import type { GpxPoint } from "@/lib/gpx";
import {
  CLIMB_CATEGORY_HEX,
  type Climb,
} from "@/lib/gpx-climbs";
import { climbLength } from "./climb-overlay";
import { POI_TYPES, type EventPoi, type PoiType } from "./poi";
import "leaflet/dist/leaflet.css";

const MapClick = dynamic(() => import("./map-click"), { ssr: false });

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
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), {
  ssr: false,
});
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

const fmt = (n: number, digits = 1) =>
  n.toLocaleString("nl-NL", { maximumFractionDigits: digits });

type LatLng = [number, number];

// Google Street View deep-link: opent een panorama bij de coördinaat (in Google
// Maps, dus géén API-key nodig). Daar kun je verder "lopen".
function streetViewUrl(p: LatLng): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${p[0]},${p[1]}`;
}

// Dichtstbijzijnde route-punt (snap), zodat de marker op het parcours blijft.
function nearestOnRoute(positions: LatLng[], lat: number, lng: number): LatLng {
  let best = positions[0];
  let bd = Infinity;
  for (const p of positions) {
    const d = (p[0] - lat) ** 2 + (p[1] - lng) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

type MapData = {
  bounds: [LatLng, LatLng];
  positions: LatLng[];
  climbs: Climb[];
  activeClimb: number | null;
  onActiveClimb: (index: number | null) => void;
  svPoint: LatLng | null;
  onSvDrag: (lat: number, lng: number) => void;
  pin: DivIcon | null;
  pois: EventPoi[];
  poiIcons: Record<PoiType, DivIcon> | null;
  placing: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onDeletePoi?: (id: string) => void;
  currentUserId?: string | null;
  canModerate?: boolean;
};

function poiIconHtml(type: PoiType): string {
  const { emoji, color } = POI_TYPES[type];
  return `<div style="width:24px;height:24px;border-radius:9999px 9999px 9999px 2px;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;">${emoji}</div>`;
}

export function GpxMap({
  points,
  climbs,
  activeClimb,
  onActiveClimb,
  pois = [],
  placing = false,
  onMapClick,
  onDeletePoi,
  currentUserId = null,
  canModerate = false,
}: {
  points: GpxPoint[];
  climbs: Climb[];
  activeClimb: number | null;
  onActiveClimb: (index: number | null) => void;
  pois?: EventPoi[];
  placing?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onDeletePoi?: (id: string) => void;
  currentUserId?: string | null;
  canModerate?: boolean;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [svPoint, setSvPoint] = useState<LatLng | null>(null);
  const [pin, setPin] = useState<DivIcon | null>(null);
  const [poiIcons, setPoiIcons] = useState<Record<PoiType, DivIcon> | null>(null);

  // Marker-iconen: divIcon (HTML, geen image-asset → geen broken-icon).
  useEffect(() => {
    let active = true;
    import("leaflet").then((m) => {
      if (!active) return;
      const L = m.default;
      setPin(
        L.divIcon({
          className: "",
          html:
            '<div style="width:24px;height:24px;border-radius:9999px;background:#b8873d;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;">🚶</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      );
      const icons = {} as Record<PoiType, DivIcon>;
      (Object.keys(POI_TYPES) as PoiType[]).forEach((t) => {
        icons[t] = L.divIcon({
          className: "",
          html: poiIconHtml(t),
          iconSize: [24, 24],
          iconAnchor: [12, 24],
          popupAnchor: [0, -22],
        });
      });
      setPoiIcons(icons);
    });
    return () => {
      active = false;
    };
  }, []);

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
  const data: MapData = {
    bounds,
    positions,
    climbs,
    activeClimb,
    onActiveClimb,
    // Default op het startpunt zolang er niet gesleept is.
    svPoint: svPoint ?? positions[0],
    onSvDrag: (lat, lng) => setSvPoint(nearestOnRoute(positions, lat, lng)),
    pin,
    pois,
    poiIcons,
    placing,
    onMapClick,
    onDeletePoi,
    currentUserId,
    canModerate,
  };

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

function MapLayers({
  positions,
  climbs,
  activeClimb,
  onActiveClimb,
  svPoint,
  onSvDrag,
  pin,
  pois,
  poiIcons,
  placing,
  onMapClick,
  onDeletePoi,
  currentUserId,
  canModerate,
}: MapData) {
  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {placing && onMapClick && <MapClick onClick={onMapClick} />}
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

      {pin && svPoint && (
        <Marker
          position={svPoint}
          draggable
          icon={pin}
          eventHandlers={{
            dragend: (e: LeafletEvent) => {
              const ll = (
                e.target as { getLatLng: () => { lat: number; lng: number } }
              ).getLatLng();
              onSvDrag(ll.lat, ll.lng);
            },
          }}
        >
          <Tooltip direction="top" offset={[0, -12]} className="!bg-card !text-foreground">
            Street View
          </Tooltip>
          <Popup>
            <div className="space-y-1 text-sm">
              <a
                href={streetViewUrl(svPoint)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Street View hier openen ↗
              </a>
              <p className="text-xs text-muted-foreground">
                Sleep de marker langs de route.
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {poiIcons &&
        pois.map((poi) => {
          const meta = POI_TYPES[poi.type];
          const canDelete =
            !!onDeletePoi &&
            poi.id !== "__draft__" &&
            (canModerate || (currentUserId != null && poi.createdBy === currentUserId));
          return (
            <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={poiIcons[poi.type]}>
              <Popup>
                <div className="min-w-32 space-y-1 text-sm">
                  <p className="font-semibold">
                    {meta.emoji} {poi.label?.trim() || meta.label}
                  </p>
                  {poi.label?.trim() && (
                    <p className="text-xs text-muted-foreground">{meta.label}</p>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDeletePoi?.(poi.id)}
                      className="text-xs font-medium text-destructive hover:underline"
                    >
                      Verwijderen
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
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
