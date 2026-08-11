// Clubevents in het trainingsschema.
//
// De planner kreeg tot nu toe elk aankomend event mee en zette het als sessie in
// het schema, ook bij een lid dat zich niet had opgegeven. Alleen een 'ja' in
// event_rsvps is een toezegging; de rest is hooguit een suggestie waar het lid
// zelf over gaat.

import type { createAdminClient } from "@/lib/supabase/admin";
import type { WorkoutIntensity } from "@/lib/training/workouts";

type Admin = ReturnType<typeof createAdminClient>;

export type ClubEventRow = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  end_at: string | null;
  distance_km: number | string | null;
  elevation_m: number | null;
};

/**
 * Wat een event in het schema wordt als het lid meedoet. De duur komt bij
 * voorkeur uit de eindtijd, dan uit de afstand, en pas daarna uit een
 * typegemiddelde — een clubrit van 80 km is nu eenmaal iets anders dan een ZRL
 * van drie kwartier.
 */
const EVENT_DEFAULTS: Record<string, { minutes: number; intensity: WorkoutIntensity }> = {
  zrl: { minutes: 60, intensity: "race" },
  ladder: { minutes: 60, intensity: "race" },
  flamme_rouge: { minutes: 60, intensity: "race" },
  outdoor: { minutes: 120, intensity: "endurance" },
  social: { minutes: 90, intensity: "endurance" },
  training: { minutes: 75, intensity: "tempo" },
};

/** Gemiddelde snelheid waarmee we een buitenrit naar minuten omrekenen. */
const OUTDOOR_KMH = 28;

export function eventWorkoutDefaults(event: ClubEventRow): {
  durationMinutes: number;
  intensity: WorkoutIntensity;
} {
  const fallback = EVENT_DEFAULTS[event.type] ?? EVENT_DEFAULTS.outdoor;

  const start = new Date(event.start_at).getTime();
  const end = event.end_at ? new Date(event.end_at).getTime() : null;
  const fromEnd =
    end != null && Number.isFinite(end) && end > start
      ? Math.round((end - start) / 60_000)
      : null;

  const km = event.distance_km == null ? null : Number(event.distance_km);
  const fromDistance =
    km != null && Number.isFinite(km) && km > 0 ? Math.round((km / OUTDOOR_KMH) * 60) : null;

  const minutes = fromEnd ?? fromDistance ?? fallback.minutes;
  return {
    durationMinutes: Math.min(480, Math.max(20, minutes)),
    intensity: fallback.intensity,
  };
}

export type ScheduleEvent = ClubEventRow & {
  /** 'yes' | 'maybe' | 'no' | null — null is nog niet beantwoord. */
  rsvp: string | null;
  /** Staat dit event al als blok in het schema? */
  inSchedule: boolean;
};

/**
 * De clubevents binnen de looptijd van een schema, met het antwoord van het lid
 * erbij. 'misschien' telt als onbeslist en blijft dus gewoon in de keuzelijst
 * staan; alleen 'ja' is een toezegging.
 */
export async function loadScheduleEvents(
  admin: Admin,
  profileId: string,
  from: string,
  to: string,
): Promise<ScheduleEvent[]> {
  const { data: events } = await admin
    .from("events")
    .select("id, title, type, start_at, end_at, distance_km, elevation_m")
    .gte("start_at", `${from}T00:00:00`)
    .lte("start_at", `${to}T23:59:59`)
    .order("start_at", { ascending: true })
    .limit(50);
  if (!events || events.length === 0) return [];

  const ids = events.map((event) => event.id as string);
  const [{ data: rsvps }, { data: workouts }] = await Promise.all([
    admin
      .from("event_rsvps")
      .select("event_id, status")
      .eq("profile_id", profileId)
      .in("event_id", ids),
    admin
      .from("training_workouts")
      .select("event_id")
      .eq("profile_id", profileId)
      .is("superseded_at", null)
      .in("event_id", ids),
  ]);

  const byEvent = new Map((rsvps ?? []).map((row) => [row.event_id as string, row.status as string]));
  const scheduled = new Set((workouts ?? []).map((row) => row.event_id as string));

  return (events as ClubEventRow[]).map((event) => ({
    ...event,
    rsvp: byEvent.get(event.id) ?? null,
    inSchedule: scheduled.has(event.id),
  }));
}

/**
 * De events waar het lid 'ja' op heeft gezegd, in de vorm die de AI-input
 * verwacht. Alleen dit gaat naar de planner: een event zonder toezegging hoort
 * het schema niet te sturen.
 */
export async function committedEventsForAi(
  admin: Admin,
  profileId: string,
  from: string,
  to: string,
) {
  const events = await loadScheduleEvents(admin, profileId, from, to).catch(() => []);
  return events
    .filter((event) => event.rsvp === "yes")
    .map((event) => ({
      title: event.title,
      type: event.type,
      date: String(event.start_at).slice(0, 10),
    }));
}
