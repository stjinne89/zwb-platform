"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { ActiveSession } from "../types";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((m) => m.Tooltip),
  { ssr: false },
);

type PositionRow = {
  session_id: string;
  profile_id: string;
  lat: number | string;
  lng: number | string;
  recorded_at: string;
};

type Marker = {
  sessionId: string;
  profileId: string;
  name: string;
  lat: number;
  lng: number;
  updatedAt: string;
};

const DEFAULT_CENTER: [number, number] = [51.55, 5.05]; // ZW-Brabant
const DEFAULT_ZOOM = 8;

export function LiveMap({
  outdoorSessions,
  initialPositions,
}: {
  outdoorSessions: ActiveSession[];
  initialPositions: PositionRow[];
}) {
  // markers per session_id
  const initialMarkers = useMemo(() => {
    const byId = new Map<string, Marker>();
    const sessionNameById = new Map(
      outdoorSessions.map((s) => [s.id, s.profileName]),
    );
    // initialPositions zit gesorteerd op recorded_at desc, dus eerste is laatste
    for (const p of initialPositions) {
      if (byId.has(p.session_id)) continue;
      byId.set(p.session_id, {
        sessionId: p.session_id,
        profileId: p.profile_id,
        name: sessionNameById.get(p.session_id) ?? "ZWB'er",
        lat: Number(p.lat),
        lng: Number(p.lng),
        updatedAt: p.recorded_at,
      });
    }
    return byId;
  }, [outdoorSessions, initialPositions]);

  const [markers, setMarkers] = useState<Map<string, Marker>>(initialMarkers);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("live-positions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_positions" },
        (payload) => {
          const row = payload.new as PositionRow;
          setMarkers((prev) => {
            const next = new Map(prev);
            const existing = next.get(row.session_id);
            const name = existing?.name ?? "ZWB'er";
            next.set(row.session_id, {
              sessionId: row.session_id,
              profileId: row.profile_id,
              name,
              lat: Number(row.lat),
              lng: Number(row.lng),
              updatedAt: row.recorded_at,
            });
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_sessions" },
        (payload) => {
          const row = payload.new as { id: string; ended_at: string | null };
          // Verwijder marker als sessie is beeindigd.
          if (row.ended_at) {
            setMarkers((prev) => {
              if (!prev.has(row.id)) return prev;
              const next = new Map(prev);
              next.delete(row.id);
              return next;
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter markers waarvan sessie nog actief is
  const activeIds = useMemo(
    () => new Set(outdoorSessions.map((s) => s.id)),
    [outdoorSessions],
  );
  const visibleMarkers = Array.from(markers.values()).filter((m) =>
    activeIds.has(m.sessionId),
  );

  // Bepaal center: avg van markers, of default
  const center: [number, number] =
    visibleMarkers.length > 0
      ? [
          visibleMarkers.reduce((s, m) => s + m.lat, 0) / visibleMarkers.length,
          visibleMarkers.reduce((s, m) => s + m.lng, 0) / visibleMarkers.length,
        ]
      : DEFAULT_CENTER;

  return (
    <div className="h-96 overflow-hidden rounded-lg border">
      <MapContainer
        center={center}
        zoom={visibleMarkers.length > 0 ? 11 : DEFAULT_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {visibleMarkers.map((m) => (
          <CircleMarker
            key={m.sessionId}
            center={[m.lat, m.lng]}
            radius={9}
            pathOptions={{
              color: "#b89968",
              weight: 3,
              fillColor: "#1f3a47",
              fillOpacity: 0.9,
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]} className="!bg-card !text-foreground">
              <strong>{m.name}</strong>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
