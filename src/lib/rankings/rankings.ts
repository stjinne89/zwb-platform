// ZWB Rankings: de ranglijsten van een week en van de vier weken ervoor. Puur; de
// pagina levert ritten, aanmeldingen en live-ritten. Alles telt uit elke bron
// (Strava, intervals.icu, import), daarom geen kudos: die heeft alleen Strava.

import { weeklyScores, type ActivityRow, type WeekScore } from "@/lib/achievements/awards";
import { amsterdamDateKey } from "@/lib/birthdays";
import type { BriljantGrowth } from "@/lib/briljant/compare";
import { formatScore } from "@/lib/briljant/score";
import { uniqueRides } from "@/lib/rides/unique-rides";

/** Metronoom en Clubmens kijken naar de gekozen week en de drie ervoor. */
export const LONG_WEEKS = 4;
/** Een live-rit telt pas mee voor Clubmens vanaf zoveel minuten. */
export const LIVE_MIN_MINUTES = 20;

export type RankingIcon = "clock" | "route" | "mountain" | "refresh" | "timer" | "sun" | "home" | "calendar" | "users" | "gem";

export type RankingEntry = {
  profileId: string;
  /** Gelijke stand, gelijke plek: 1, 1, 3. */
  rank: number;
  value: number;
  label: string;
  detail?: string;
};

export type Ranking = {
  id: string;
  title: string;
  icon: RankingIcon;
  span: "week" | "4 weken";
  entries: RankingEntry[];
};

/** Hoger is beter; nul telt niet. `tie` beslist alleen de volgorde, niet de plek. */
export function rankBy<T extends { profileId: string }>(
  rows: T[],
  value: (row: T) => number,
  label: (row: T) => string,
  options: { detail?: (row: T) => string | undefined; tie?: (row: T) => number } = {},
): RankingEntry[] {
  const sorted = rows
    .map((row) => ({ row, value: value(row) }))
    .filter((item) => item.value > 0)
    .sort(
      (a, b) =>
        b.value - a.value ||
        (options.tie ? options.tie(b.row) - options.tie(a.row) : 0),
    );
  let rank = 0;
  return sorted.map((item, index) => {
    if (index === 0 || item.value !== sorted[index - 1].value) rank = index + 1;
    return {
      profileId: item.row.profileId,
      rank,
      value: item.value,
      label: label(item.row),
      detail: options.detail?.(item.row),
    };
  });
}

export function formatKm(meters: number) {
  return `${(meters / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km`;
}

export function formatMeters(meters: number) {
  return `${Math.round(meters).toLocaleString("nl-NL")} m`;
}

export function formatHours(seconds: number) {
  return `${(seconds / 3600).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} u`;
}

/** "4:05 u" voor één rit. */
export function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")} u`;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** De ranglijsten uit de ritten van één week. */
export function weekRankings(rows: ActivityRow[], week: string): Ranking[] {
  const scores = weeklyScores(rows).filter((score) => score.week === week);
  const rides = (score: WeekScore) => plural(score.activities, "rit", "ritten");
  const list = (
    id: string,
    title: string,
    icon: RankingIcon,
    value: (score: WeekScore) => number,
    label: (score: WeekScore) => string,
    detail: (score: WeekScore) => string = rides,
  ): Ranking => ({
    id,
    title,
    icon,
    span: "week",
    entries: rankBy(scores, value, label, { detail, tie: (score) => score.movingSeconds }),
  });

  return [
    list("zitvlees", "Zitvleeskampioen", "clock", (s) => s.movingSeconds, (s) => formatHours(s.movingSeconds)),
    list("kilometers", "Kilometervreter", "route", (s) => s.distanceM, (s) => formatKm(s.distanceM)),
    list("klimmer", "Klimmer van de week", "mountain", (s) => s.elevationM, (s) => formatMeters(s.elevationM)),
    list("actief", "Meest actief", "refresh", (s) => s.activities, rides, (s) => formatHours(s.movingSeconds)),
    list("lange-adem", "Lange adem", "timer", (s) => s.longestSeconds, (s) => formatDuration(s.longestSeconds)),
    list("buitenbeentje", "Buitenbeentje", "sun", (s) => s.outdoorM, (s) => formatKm(s.outdoorM)),
    list("binnenvetter", "Binnenvetter", "home", (s) => s.indoorSeconds, (s) => formatHours(s.indoorSeconds)),
  ];
}

/** Metronoom: op hoeveel dagen je fietste, in de vier weken. Bij gelijke stand de meeste uren. */
export function metronoom(rows: ActivityRow[]): Ranking {
  const byProfile = new Map<string, { profileId: string; days: Set<string>; seconds: number }>();
  for (const row of uniqueRides(rows)) {
    const start = new Date(row.start_date);
    if (!Number.isFinite(start.getTime())) continue;
    const item = byProfile.get(row.profile_id) ?? { profileId: row.profile_id, days: new Set<string>(), seconds: 0 };
    item.days.add(amsterdamDateKey(start));
    item.seconds += row.moving_time_seconds ?? 0;
    byProfile.set(row.profile_id, item);
  }
  return {
    id: "metronoom",
    title: "Metronoom",
    icon: "calendar",
    span: "4 weken",
    entries: rankBy(
      [...byProfile.values()],
      (item) => item.days.size,
      (item) => plural(item.days.size, "dag", "dagen"),
      { detail: (item) => formatHours(item.seconds), tie: (item) => item.seconds },
    ),
  };
}

export type ClubEventRsvp = { profile_id: string; event_id: string; start_at: string };
export type LiveRide = { profile_id: string; started_at: string; last_seen_at: string | null; ended_at: string | null };

/**
 * Clubmens: elk event waar je "ja" op zei en dat al begon, plus elke dag dat je
 * via Samen fietsen live reed. Een live-rit op de dag van een event waar je bij
 * was telt niet apart: dat is meestal hetzelfde event.
 */
export function clubmens(rsvps: ClubEventRsvp[], live: LiveRide[], now = new Date()): Ranking {
  type Item = { profileId: string; events: Set<string>; eventDays: Set<string>; liveDays: Set<string> };
  const byProfile = new Map<string, Item>();
  const item = (profileId: string) => {
    const current = byProfile.get(profileId) ?? { profileId, events: new Set(), eventDays: new Set(), liveDays: new Set() };
    byProfile.set(profileId, current);
    return current;
  };

  for (const rsvp of rsvps) {
    const start = new Date(rsvp.start_at);
    if (!Number.isFinite(start.getTime()) || start > now) continue;
    const entry = item(rsvp.profile_id);
    entry.events.add(rsvp.event_id);
    entry.eventDays.add(amsterdamDateKey(start));
  }
  for (const ride of live) {
    const start = Date.parse(ride.started_at);
    const end = Date.parse(ride.ended_at ?? ride.last_seen_at ?? ride.started_at);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (end - start < LIVE_MIN_MINUTES * 60_000) continue;
    item(ride.profile_id).liveDays.add(amsterdamDateKey(new Date(start)));
  }

  const rows = [...byProfile.values()].map((entry) => {
    const liveDays = [...entry.liveDays].filter((day) => !entry.eventDays.has(day)).length;
    return { profileId: entry.profileId, events: entry.events.size, live: liveDays };
  });
  return {
    id: "clubmens",
    title: "Clubmens",
    icon: "users",
    span: "4 weken",
    entries: rankBy(
      rows,
      (row) => row.events + row.live,
      (row) => plural(row.events + row.live, "keer", "keer"),
      {
        detail: (row) =>
          [row.events > 0 && plural(row.events, "event", "events"), row.live > 0 && `${row.live}× samen fietsen`]
            .filter(Boolean)
            .join(" · "),
        tie: (row) => row.events,
      },
    ),
  };
}

/** Groeibriljant: de meeste punten erbij op je ZWBriljant-steen in vier weken. */
export function groeibriljant(growth: BriljantGrowth[]): Ranking {
  return {
    id: "groeibriljant",
    title: "Groeibriljant",
    icon: "gem",
    span: "4 weken",
    entries: rankBy(
      growth,
      (row) => row.growth,
      (row) => `+${row.growth.toLocaleString("nl-NL")} punten`,
      { detail: (row) => `${formatScore(row.from)} → ${formatScore(row.to)}` },
    ),
  };
}
