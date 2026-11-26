import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isVideoId } from "@/lib/youtube-live/broadcast";
import { overlayStyle, type OverlayStyle } from "./overlay-styles";
import { overlaySize, type OverlaySize } from "./overlay-size";
import { overlayMode, type OverlayMode } from "./overlay-theme";

// Streams bij races (migratie 0338): lezen voor de speler, en of een lid bij
// een race mag streamen (ingeschreven of opgesteld; besluit eigenaar 2026-11-18;
// sinds 2026-11-25 ook de captain of co-captain van het team van de race).

export type EventStream = {
  id: string;
  eventId: string;
  profileId: string;
  videoId: string;
  name: string;
  channelTitle: string | null;
  createdAt: string;
  /** Bijgehouden door de cron (0339); zonder cron blijft hij op gepland. */
  status: "gepland" | "live" | "afgelopen";
  /** De live stand in de overlay (0341); zonder die kolom aan. */
  overlayStand: boolean;
  /** Donker of licht, voor overlay en thumbnail (0345). */
  overlayTheme: OverlayMode;
  /** De stijl van overlay en thumbnail (0346). */
  overlayStyle: OverlayStyle;
  /** De resolutie van de overlay (0348). */
  overlaySize: OverlaySize;
  /** Ruimte voor de webcam in de overlay (0373); zonder die kolom uit. */
  overlayWebcam: boolean;
  /**
   * Gekoppeld met een link (0360): geen thumbnail van ZWB. Extra (0370): door
   * een lid toegevoegd, maar niet van hem; de naam is dan de kanaalnaam.
   * Zonder kolom ZWB.
   */
  source: "zwb" | "eigen" | "extra";
};

type StreamRow = {
  id: string;
  event_id: string;
  profile_id: string;
  youtube_video_id: string;
  channel_title: string | null;
  created_at: string;
  status: string;
  overlay_stand?: boolean | null;
  overlay_theme?: string | null;
  overlay_style?: string | null;
  overlay_size?: string | null;
  overlay_webcam?: boolean | null;
  source?: string | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
};

/** De streams van deze races, oudste eerst: wie als eerste klaarzette, staat voorop. */
export async function loadEventStreams(
  supabase: SupabaseClient,
  eventIds: string[],
): Promise<EventStream[]> {
  if (eventIds.length === 0) return [];
  const { data, error } = await supabase
    .from("event_streams")
    // Alle kolommen: zo werkt dit ook als de code live staat vóór 0341.
    .select("*, profiles(display_name)")
    .in("event_id", eventIds)
    .order("created_at");
  if (error) throw new Error(error.message);
  return ((data ?? []) as StreamRow[])
    // "weg": YouTube kent de video niet meer, of hij staat op privé (0339).
    .filter((row) => isVideoId(row.youtube_video_id) && row.status !== "weg")
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const extra = row.source === "extra";
      return {
        id: row.id,
        eventId: row.event_id,
        profileId: row.profile_id,
        videoId: row.youtube_video_id,
        // Een extra stream is niet van wie hem toevoegde: de kanaalnaam.
        name: (extra ? row.channel_title?.trim() : profile?.display_name?.trim()) || row.channel_title || "Stream",
        channelTitle: row.channel_title,
        createdAt: row.created_at,
        status: row.status === "live" || row.status === "afgelopen" ? row.status : "gepland",
        overlayStand: row.overlay_stand !== false,
        overlayTheme: overlayMode(row.overlay_theme),
        overlayStyle: overlayStyle(row.overlay_style),
        overlaySize: overlaySize(row.overlay_size),
        overlayWebcam: row.overlay_webcam === true,
        source: row.source === "eigen" || row.source === "extra" ? row.source : "zwb",
      };
    });
}

/**
 * Mag dit lid bij deze race een eigen stream klaarzetten of koppelen? Als hij
 * meerijdt, of als hij captain of co-captain is van het team van de race, ook
 * als hij zelf niet rijdt (besluit eigenaar 2026-11-25).
 */
export async function mayStreamInEvent(
  supabase: SupabaseClient,
  profileId: string,
  event: { id: string; team_id: string | null; parent_event_id: string | null },
): Promise<boolean> {
  const [rides, captain] = await Promise.all([
    ridesInEvent(supabase, profileId, event),
    event.team_id
      ? supabase
          .from("team_members")
          .select("team_id")
          .eq("profile_id", profileId)
          .eq("team_id", event.team_id)
          .in("role", ["captain", "co-captain"])
          .limit(1)
          .then(({ data }) => (data ?? []).length > 0)
      : Promise.resolve(false),
  ]);
  return rides || captain;
}

/**
 * Rijdt dit lid deze race? Ja op de race, of in de opstelling van het team van
 * de race (op de race zelf of op de raceweek erboven).
 */
export async function ridesInEvent(
  supabase: SupabaseClient,
  profileId: string,
  event: { id: string; team_id: string | null; parent_event_id: string | null },
): Promise<boolean> {
  const [{ data: rsvp }, lineup] = await Promise.all([
    supabase
      .from("event_rsvps")
      .select("status")
      .eq("event_id", event.id)
      .eq("profile_id", profileId)
      .maybeSingle(),
    event.team_id
      ? supabase
          .from("team_event_lineups")
          .select("id")
          .eq("profile_id", profileId)
          .eq("team_id", event.team_id)
          .in("event_id", [event.id, event.parent_event_id].filter(Boolean) as string[])
          .limit(1)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  if ((rsvp as { status?: string } | null)?.status === "yes") return true;
  return (lineup.data ?? []).length > 0;
}
