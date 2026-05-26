// Server-side helper: haal de actuele live-snapshot voor een event op.
//
// Wordt aangeroepen vanuit zowel /live/[id]/page.tsx als
// /api/live/event/[id]/route.ts (polling), beide publiek bereikbaar.
// Gebruikt de service-role admin-client zodat anon-bezoekers de data
// kunnen zien zonder RLS-policy-uitbreiding.

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  EventLiveSession,
  EventLivePosition,
} from "@/app/(app)/events/[id]/_components/event-live-ticker";

const STALE_AFTER_MIN = 15;

function getActiveCutoffIso(): string {
  return new Date(Date.now() - STALE_AFTER_MIN * 60 * 1000).toISOString();
}

function amsterdamDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export type PublicEventInfo = {
  id: string;
  title: string;
  start_at: string;
  location: string | null;
  start_lat: number | null;
  start_lon: number | null;
  gpxUrl: string | null;
  isToday: boolean;
};

export type EventLiveSnapshot = {
  event: PublicEventInfo | null;
  sessions: EventLiveSession[];
  positions: EventLivePosition[];
};

// React.cache() dedupliceert binnen één request: generateMetadata + page
// triggeren samen nu maar 1 keer de DB-queries.
export const fetchEventLiveSnapshot = cache(
  async (eventId: string): Promise<EventLiveSnapshot> => {
    return _fetchEventLiveSnapshot(eventId);
  },
);

async function _fetchEventLiveSnapshot(
  eventId: string,
): Promise<EventLiveSnapshot> {
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, title, start_at, location, start_lat, start_lon, gpx_path")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    return { event: null, sessions: [], positions: [] };
  }

  const isToday =
    amsterdamDateKey(new Date(event.start_at)) ===
    amsterdamDateKey(new Date());

  let gpxUrl: string | null = null;
  if (event.gpx_path) {
    const { data } = await admin.storage
      .from("event-gpx")
      .createSignedUrl(event.gpx_path, 3600);
    gpxUrl = data?.signedUrl ?? null;
  }

  const publicEvent: PublicEventInfo = {
    id: event.id,
    title: event.title,
    start_at: event.start_at,
    location: event.location,
    start_lat: event.start_lat != null ? Number(event.start_lat) : null,
    start_lon: event.start_lon != null ? Number(event.start_lon) : null,
    gpxUrl,
    isToday,
  };

  if (!isToday) {
    return { event: publicEvent, sessions: [], positions: [] };
  }

  // Profielen die yes/maybe RSVP'den zijn kandidaten voor live sessies.
  const { data: rsvps } = await admin
    .from("event_rsvps")
    .select("profile_id, status")
    .eq("event_id", eventId)
    .in("status", ["yes", "maybe"]);

  const participantIds = Array.from(
    new Set((rsvps ?? []).map((r) => r.profile_id)),
  );

  if (participantIds.length === 0) {
    return { event: publicEvent, sessions: [], positions: [] };
  }

  const cutoff = getActiveCutoffIso();
  const { data: sessionRows } = await admin
    .from("live_sessions")
    .select("id, profile_id, source, started_at, last_seen_at, profiles(display_name)")
    .in("profile_id", participantIds)
    .eq("mode", "outdoor")
    .is("ended_at", null)
    .gte("last_seen_at", cutoff)
    .order("started_at", { ascending: false });

  const sessions: EventLiveSession[] = (sessionRows ?? []).map((s) => ({
    id: s.id,
    profileId: s.profile_id,
    profileName:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((s.profiles as any)?.display_name as string) ?? "ZWB'er",
    source: (s.source ?? "manual") as EventLiveSession["source"],
    startedAt: s.started_at,
    lastSeenAt: s.last_seen_at,
  }));

  let positions: EventLivePosition[] = [];
  if (sessions.length > 0) {
    const { data: positionRows } = await admin
      .from("live_positions")
      .select(
        "session_id, profile_id, lat, lng, altitude, speed_kmh, recorded_at",
      )
      .in(
        "session_id",
        sessions.map((s) => s.id),
      )
      .order("recorded_at", { ascending: false })
      .limit(Math.max(500, sessions.length * 80));
    positions = (positionRows ?? []) as unknown as EventLivePosition[];
  }

  return { event: publicEvent, sessions, positions };
}
