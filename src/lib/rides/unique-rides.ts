// Dezelfde rit één keer tellen bij het lezen van strava_activities.
//
// De ingest houdt een tweede kopie meestal tegen (dedupeRides in
// intervals/rides.ts), maar niet als het lid de rit zelf twee keer opnam en
// beide naar Strava zette, of hem twee keer importeerde. Die staan bij Strava ook
// dubbel, dus ZWB wist ze niet; de lezers tellen ze één keer. Zie
// docs/dubbele-ritten-2026-10-18.md.
//
// Puur.

import { isSameRide, SAME_START_MS } from "@/lib/rides/same-ride";

/** Wat uniqueRides van een rij nodig heeft; de rest gaat ongemoeid mee. */
export type UniqueRideRow = {
  id?: number | string | null;
  profile_id?: string | null;
  start_date: string;
  distance_m?: number | string | null;
  raw?: unknown;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function hasTrack(row: UniqueRideRow): boolean {
  const map = record(record(row.raw).map);
  const own = row as Record<string, unknown>;
  return [map.summary_polyline, map.polyline, own.summary_polyline, own.polyline].some(
    (value) => typeof value === "string" && value.length > 0,
  );
}

function hasPower(row: UniqueRideRow): boolean {
  const raw = record(row.raw);
  return raw.device_watts === true && Number(raw.average_watts) > 0;
}

/** Vermogen telt zwaarder dan een spoor, net als bij de ingest. */
export function powerFirst(row: UniqueRideRow): number {
  return (hasPower(row) ? 2 : 0) + (hasTrack(row) ? 1 : 0);
}

/** Voor de col-detector: zonder spoor geen col. */
export function trackFirst(row: UniqueRideRow): number {
  return (hasTrack(row) ? 2 : 0) + (hasPower(row) ? 1 : 0);
}

/**
 * De rijen zonder tweede kopie van dezelfde rit, in de volgorde van de invoer.
 * Alleen ritten van hetzelfde lid kunnen dezelfde zijn (`profile_id`; zonder die
 * kolom geldt alles als één lid). Van twee kopieën blijft de rijkste; bij gelijke
 * stand de Strava-rit (positief id), dan de eerste.
 */
export function uniqueRides<T extends UniqueRideRow>(
  rows: T[],
  score: (row: T) => number = powerFirst,
): T[] {
  const starts = rows.map((row) => Date.parse(row.start_date));
  const order = rows
    .map((_, index) => index)
    .filter((index) => Number.isFinite(starts[index]))
    .sort(
      (a, b) =>
        String(rows[a].profile_id ?? "").localeCompare(String(rows[b].profile_id ?? "")) ||
        starts[a] - starts[b] ||
        a - b,
    );

  const better = (a: number, b: number) => {
    const diff = score(rows[a]) - score(rows[b]);
    if (diff !== 0) return diff > 0;
    const stravaA = Number(rows[a].id) > 0;
    const stravaB = Number(rows[b].id) > 0;
    if (stravaA !== stravaB) return stravaA;
    return a < b;
  };

  const dropped = new Set<number>();
  const kept: number[] = [];
  for (const index of order) {
    const row = rows[index];
    let twin = -1;
    for (let k = kept.length - 1; k >= 0; k -= 1) {
      const other = rows[kept[k]];
      if ((other.profile_id ?? "") !== (row.profile_id ?? "")) break;
      if (starts[index] - starts[kept[k]] > SAME_START_MS) break;
      if (isSameRide(fingerprint(other), fingerprint(row))) {
        twin = k;
        break;
      }
    }
    if (twin < 0) {
      kept.push(index);
    } else if (better(index, kept[twin])) {
      dropped.add(kept[twin]);
      kept[twin] = index;
    } else {
      dropped.add(index);
    }
  }
  return rows.filter((_, index) => !dropped.has(index));
}

function fingerprint(row: UniqueRideRow) {
  return { id: row.id ?? 0, start_date: row.start_date, distance_m: row.distance_m ?? null };
}
