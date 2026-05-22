"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { heartbeat } from "../_actions";

// Movement threshold: alleen schrijven als positie >5m verschoven OF >15s ouder.
const MIN_MOVE_M = 5;
const MIN_INTERVAL_MS = 15_000;
const HEARTBEAT_MS = 30_000;

// Haversine afstand in meters.
function distM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Onzichtbare component die GPS-positie streamt naar Supabase tijdens een
 * actieve outdoor-sessie. Houdt scherm aan via Wake Lock API.
 */
export function PositionTracker({
  sessionId,
  profileId,
}: {
  sessionId: string;
  profileId: string;
}) {
  const lastWriteRef = useRef<{ at: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let watchId: number | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let wakeLock: any = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    // Probeer scherm aan te houden (Chrome/Edge/Safari iOS 16.4+).
    const acquireWakeLock = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigator as any;
        if (nav.wakeLock?.request) {
          wakeLock = await nav.wakeLock.request("screen");
        }
      } catch {
        // negeer; veel browsers staan dit niet toe in background
      }
    };

    const writePosition = async (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const now = Date.now();
      const last = lastWriteRef.current;
      if (last) {
        const moved = distM(last, { lat, lng });
        const elapsed = now - last.at;
        if (moved < MIN_MOVE_M && elapsed < MIN_INTERVAL_MS) return;
      }
      lastWriteRef.current = { at: now, lat, lng };
      await supabase.from("live_positions").insert({
        session_id: sessionId,
        profile_id: profileId,
        lat,
        lng,
        altitude: pos.coords.altitude ?? null,
        speed_kmh:
          pos.coords.speed !== null && pos.coords.speed !== undefined
            ? pos.coords.speed * 3.6
            : null,
      });
      // Heartbeat hieronder houdt last_seen_at actueel, ook als de rider stilstaat.
    };

    if ("geolocation" in navigator) {
      acquireWakeLock();
      watchId = navigator.geolocation.watchPosition(
        writePosition,
        () => {
          // Stille negering: de browser toont zelf de permissieprompt.
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 30_000 },
      );
    }

    // Heartbeat zodat last_seen_at ook update als gebruiker stilstaat.
    heartbeatTimer = setInterval(() => {
      heartbeat(sessionId).catch(() => null);
    }, HEARTBEAT_MS);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      try {
        wakeLock?.release?.();
      } catch {
        // niets te doen
      }
    };
  }, [sessionId, profileId]);

  return null;
}
