"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Map as LeafletMap } from "leaflet";
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

export type PositionRow = {
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
// Periodieke her-fetch zodat de actieve-sessie-set vers blijft, ook als een
// realtime-event gemist is. Korter dan de 15-min stale-grens.
const REFRESH_MS = 30_000;

// Een klik op een rider in de lijst zet dit doel; nonce dwingt een herhaalde
// klik op dezelfde rider af (effect re-runt ook als sessionId gelijk blijft).
export type MapFocus = { sessionId: string; nonce: number };

export function LiveMap({
  outdoorSessions,
  initialPositions,
  focus,
}: {
  outdoorSessions: ActiveSession[];
  initialPositions: PositionRow[];
  focus?: MapFocus | null;
}) {
  const router = useRouter();

  // Server-snapshot → markers per session. useMemo hangt aan de props, dus na
  // een router.refresh() (nieuwe props) wordt deze opnieuw berekend.
  const serverMarkers = useMemo(() => {
    const byId = new Map<string, Marker>();
    const nameById = new Map(outdoorSessions.map((s) => [s.id, s.profileName]));
    // initialPositions is gesorteerd op recorded_at desc → eerste = nieuwste.
    for (const p of initialPositions) {
      if (byId.has(p.session_id)) continue;
      byId.set(p.session_id, {
        sessionId: p.session_id,
        profileId: p.profile_id,
        name: nameById.get(p.session_id) ?? "ZWB'er",
        lat: Number(p.lat),
        lng: Number(p.lng),
        updatedAt: p.recorded_at,
      });
    }
    return byId;
  }, [outdoorSessions, initialPositions]);

  const activeIds = useMemo(
    () => new Set(outdoorSessions.map((s) => s.id)),
    [outdoorSessions],
  );
  const nameById = useMemo(
    () => new Map(outdoorSessions.map((s) => [s.id, s.profileName])),
    [outdoorSessions],
  );

  // Realtime-posities die ná de laatste snapshot binnenkwamen.
  const [liveMarkers, setLiveMarkers] = useState<Map<string, Marker>>(new Map());

  // Gedebouncede refresh — voorkomt een refresh-storm bij bursts van events.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      router.refresh();
    }, 1200);
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const channel = supabase
      .channel("live-positions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_positions" },
        (payload) => {
          const row = payload.new as PositionRow;
          setLiveMarkers((prev) => {
            const next = new Map(prev);
            const existing = next.get(row.session_id);
            next.set(row.session_id, {
              sessionId: row.session_id,
              profileId: row.profile_id,
              name: existing?.name ?? "ZWB'er",
              lat: Number(row.lat),
              lng: Number(row.lng),
              updatedAt: row.recorded_at,
            });
            return next;
          });
          // Onbekende sessie (nieuwe rider of na een herstart)? Haal de verse
          // actieve-sessie-set op zodat het bolletje meteen zichtbaar wordt.
          if (!activeIds.has(row.session_id)) scheduleRefresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions" },
        () => {
          // Elke sessie-wijziging (start/stop/stale-end) → snapshot verversen.
          scheduleRefresh();
        },
      )
      .subscribe((status) => {
        // Na (her)verbinden de gemiste periode inhalen via een refresh.
        if (status === "SUBSCRIBED" && !cancelled) scheduleRefresh();
      });

    // Periodieke fallback-refresh + her-fetch zodra de tab weer zichtbaar is.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [activeIds, scheduleRefresh, router]);

  // Zichtbare markers = server-snapshot, overschreven door nieuwere realtime-
  // posities, gefilterd op sessies die nog actief zijn.
  const visibleMarkers = useMemo(() => {
    const merged = new Map(serverMarkers);
    for (const [id, m] of liveMarkers) {
      const existing = merged.get(id);
      const withName: Marker = {
        ...m,
        name: nameById.get(id) ?? existing?.name ?? m.name,
      };
      if (!existing || m.updatedAt >= existing.updatedAt) merged.set(id, withName);
    }
    return Array.from(merged.values()).filter((m) => activeIds.has(m.sessionId));
  }, [serverMarkers, liveMarkers, activeIds, nameById]);

  // Vlieg naar een rider zodra de lijst er één aanwijst. Bewust alléén afhankelijk
  // van `focus` (de klik): markers veranderen elke paar seconden door realtime-
  // updates — daar mee re-runnen zou de kaart continu opnieuw laten inzoomen.
  // Daarom lezen we de actuele positie via een ref i.p.v. als dependency.
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef(visibleMarkers);
  useEffect(() => {
    markersRef.current = visibleMarkers;
  }, [visibleMarkers]);
  useEffect(() => {
    if (!focus) return;
    const target = markersRef.current.find((m) => m.sessionId === focus.sessionId);
    if (target) {
      mapRef.current?.flyTo([target.lat, target.lng], 14, { duration: 0.8 });
    }
  }, [focus]);

  // Center alleen bij mount (props-change herrendert niet de MapContainer-center).
  const center: [number, number] = useMemo(() => {
    if (visibleMarkers.length === 0) return DEFAULT_CENTER;
    return [
      visibleMarkers.reduce((s, m) => s + m.lat, 0) / visibleMarkers.length,
      visibleMarkers.reduce((s, m) => s + m.lng, 0) / visibleMarkers.length,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-96 overflow-hidden rounded-lg border">
      <MapContainer
        ref={mapRef}
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
