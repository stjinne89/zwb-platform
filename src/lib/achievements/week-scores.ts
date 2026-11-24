// Weekstanden per lid uit de ritten: de basis van ZWB Rankings en van de
// weekbadges. Puur en los van awards.ts, zodat rankings.ts en de toekenning
// elkaar kunnen gebruiken zonder kringimport.

import { weekStartDate } from "@/lib/strava/client";
import { uniqueRides } from "@/lib/rides/unique-rides";

export type ActivityRow = {
  id: number;
  profile_id: string;
  start_date: string;
  distance_m: number | string | null;
  total_elevation_gain_m: number | string | null;
  moving_time_seconds: number | null;
  trainer?: boolean | null;
};

export type WeekScore = {
  profileId: string;
  week: string;
  activities: number;
  distanceM: number;
  elevationM: number;
  movingSeconds: number;
  /** De langste rit van de week, in tijd. */
  longestSeconds: number;
  outdoorM: number;
  outdoorSeconds: number;
  indoorM: number;
  indoorSeconds: number;
};

/** Maandag van de week van een tijdstip, zoals de ingest hem zet (UTC). */
export function weekOf(startDate: string): string | null {
  const start = new Date(startDate);
  if (!Number.isFinite(start.getTime())) return null;
  return weekStartDate(start).toISOString().slice(0, 10);
}

function toNumber(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Totalen per lid per week. Een rit die het lid twee keer opnam, telt één keer.
 * De week komt uit de starttijd, niet uit de kolom achievement_week: daar staat
 * bij 2.405 ritten uit juni–augustus 2026 een zondag (PLAN.md, 2026-10-18).
 */
export function weeklyScores(rows: ActivityRow[]) {
  const scores = new Map<string, WeekScore>();

  for (const row of uniqueRides(rows)) {
    const week = weekOf(row.start_date);
    if (!week) continue;
    const key = `${week}:${row.profile_id}`;
    const score =
      scores.get(key) ??
      {
        profileId: row.profile_id,
        week,
        activities: 0,
        distanceM: 0,
        elevationM: 0,
        movingSeconds: 0,
        longestSeconds: 0,
        outdoorM: 0,
        outdoorSeconds: 0,
        indoorM: 0,
        indoorSeconds: 0,
      };

    const distance = toNumber(row.distance_m);
    const seconds = row.moving_time_seconds ?? 0;
    score.activities += 1;
    score.distanceM += distance;
    score.elevationM += toNumber(row.total_elevation_gain_m);
    score.movingSeconds += seconds;
    score.longestSeconds = Math.max(score.longestSeconds, seconds);
    if (row.trainer) {
      score.indoorM += distance;
      score.indoorSeconds += seconds;
    } else {
      score.outdoorM += distance;
      score.outdoorSeconds += seconds;
    }
    scores.set(key, score);
  }

  return Array.from(scores.values());
}
