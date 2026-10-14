// Inhoud van het agenda-abonnement (/api/agenda/<token>): wat een lid in de
// eigen Google Agenda, Outlook of Apple Agenda ziet.
//
// Keuze eigenaar (2026-10-14): alleen waar je zelf aan meedoet, en je eigen
// trainingen. Dus een 'ja' in event_rsvps, plus een plek in een teamopstelling
// (team_event_lineups): een ZRL-rijder meldt zich niet via de RSVP aan, maar
// wordt door de captain opgesteld. 'Misschien' en 'beschikbaar' tellen niet;
// verjaardagen en de rest van de clubkalender gaan niet mee.

import type { createAdminClient } from "@/lib/supabase/admin";
import { amsterdamDateKey } from "@/lib/birthdays";
import { eventLabel } from "@/lib/event-types";
import {
  eventWorkoutDefaults,
  withParentRoutes,
  type ClubEventRow,
} from "@/lib/training/events";
import { intensityLabel } from "@/lib/training/workouts";
import type { IcsItem } from "@/lib/calendar/ics";

type Admin = ReturnType<typeof createAdminClient>;

/** Hoe ver terug en vooruit de feed kijkt. */
const PAST_DAYS = 60;
const FUTURE_DAYS = 400;

const EVENT_COLUMNS =
  "id, title, type, kind, start_at, end_at, location, distance_km, elevation_m, gpx_path, zwift_route_id, laps, zwift_event_type, zwift_tags, parent_event_id";

export type FeedEvent = ClubEventRow & { kind?: string | null; location?: string | null };

export type FeedWorkout = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  intensity: string;
  event_id: string | null;
};

function joined<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatNumber(value: number | string | null | undefined, unit: string) {
  const n = value == null ? NaN : Number(value);
  return Number.isFinite(n) && n > 0 ? `${Math.round(n)} ${unit}` : null;
}

/** Zet events en trainingen om in agenda-items. Puur, zodat het te testen is. */
export function feedItems(
  events: FeedEvent[],
  workouts: FeedWorkout[],
  siteUrl: string,
): IcsItem[] {
  const site = siteUrl.replace(/\/+$/, "");
  const eventIds = new Set(events.map((event) => event.id));

  const eventItems: IcsItem[] = events.map((event) => {
    const start = new Date(event.start_at);
    const minutes = eventWorkoutDefaults(event).durationMinutes;
    const url = `${site}/events/${event.id}`;
    const facts = [
      eventLabel(event.type, event.kind),
      formatNumber(event.distance_km, "km"),
      formatNumber(event.elevation_m, "hm"),
    ].filter(Boolean);
    return {
      uid: `event-${event.id}@zwb`,
      summary: event.title,
      timing: { kind: "time", start, end: new Date(start.getTime() + minutes * 60_000) },
      location: event.location ?? null,
      description: `${facts.join(" · ")}\n${url}`,
      url,
    };
  });

  // Een training die bij een event hoort, staat er al als dat event; net als op
  // de kalender krijgt die geen eigen regel.
  const workoutItems: IcsItem[] = workouts
    .filter((workout) => !workout.event_id || !eventIds.has(workout.event_id))
    .map((workout) => {
      const url = `${site}/zwbeter-worden/schema`;
      const facts = [intensityLabel(workout.intensity), `${workout.duration_minutes} min`].filter(
        Boolean,
      );
      return {
        uid: `workout-${workout.id}@zwb`,
        summary: `Training: ${workout.title}`,
        // De begintijd van een training is een plaatshouder (09:00); alleen de
        // dag betekent iets.
        timing: { kind: "date", date: amsterdamDateKey(new Date(workout.scheduled_at)) },
        description: `${facts.join(" · ")}\n${url}`,
        url,
      };
    });

  return [...eventItems, ...workoutItems];
}

export async function loadCalendarFeed(
  admin: Admin,
  profileId: string,
  siteUrl: string,
  now = new Date(),
): Promise<IcsItem[]> {
  const from = new Date(now.getTime() - PAST_DAYS * 86_400_000).toISOString();
  const to = new Date(now.getTime() + FUTURE_DAYS * 86_400_000).toISOString();

  const [rsvps, lineups, workouts] = await Promise.all([
    admin
      .from("event_rsvps")
      .select(`events!inner(${EVENT_COLUMNS})`)
      .eq("profile_id", profileId)
      .eq("status", "yes")
      .gte("events.start_at", from)
      .lte("events.start_at", to),
    admin
      .from("team_event_lineups")
      .select(`events!inner(${EVENT_COLUMNS})`)
      .eq("profile_id", profileId)
      .gte("events.start_at", from)
      .lte("events.start_at", to),
    admin
      .from("training_workouts")
      .select("id, title, scheduled_at, duration_minutes, intensity, event_id")
      .eq("profile_id", profileId)
      .is("superseded_at", null)
      .neq("status", "skipped")
      .neq("intensity", "rest")
      .gte("scheduled_at", from)
      .lte("scheduled_at", to)
      .order("scheduled_at", { ascending: true }),
  ]);
  const failed = rsvps.error ?? lineups.error ?? workouts.error;
  if (failed) throw new Error(failed.message);

  const byId = new Map<string, FeedEvent>();
  for (const row of [...(rsvps.data ?? []), ...(lineups.data ?? [])] as Array<{
    events: FeedEvent | FeedEvent[] | null;
  }>) {
    for (const event of joined(row.events)) byId.set(event.id, event);
  }
  // Een ZRL-teamrace heeft zelf geen route; de duur volgt dan uit die van de
  // raceweek erboven.
  const events = (await withParentRoutes(admin, [...byId.values()])).sort((a, b) =>
    String(a.start_at).localeCompare(String(b.start_at)),
  );

  return feedItems(events, (workouts.data ?? []) as FeedWorkout[], siteUrl);
}
