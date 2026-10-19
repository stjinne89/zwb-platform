// Wat een CSV-, GPX- of FIT-import doet met ritten die er al zijn.
//
// Een rit die al onder een ander id bestaat (via Strava, intervals.icu of een
// eerdere import) wordt niet nog eens opgeslagen. Eén uitzondering: een GPX of
// FIT met spoor bij een rit uit activities.csv vult die CSV-rit aan: het spoor
// als de CSV-rit er nog geen heeft, en de tijd en hoogtemeters als de CSV daar 0
// gaf. Zo kun je eerst je hele historie via de CSV binnenhalen en daarna de
// bestanden van de ritten waar het spoor voor telt (cols, ZWB-segmenten,
// ZWBlokken).
//
// Puur: geen database. Los van import.ts, want intervals/rides.ts (isSameRide)
// importeert dat bestand al.

import { isSameRide, type RideFingerprint } from "@/lib/intervals/rides";
import type { ImportedStravaActivity } from "@/lib/strava/import";

export type ExistingImportRide = RideFingerprint & {
  import_source: string | null;
  has_track: boolean;
  /** Ontbreekt de kolom, dan geldt de tijd als bekend en blijft hij staan. */
  moving_time_seconds?: number | string | null;
  total_elevation_gain_m?: number | string | null;
};

export type TrackAttachment = {
  id: number | string;
  /** Alleen als de CSV-rit nog geen spoor had; een bestaand spoor blijft staan. */
  summaryPolyline?: string;
  /**
   * Alleen bij een FIT van Zwift. De CSV-rit kent geen toestel, en een
   * hernoemde Zwift-rit is zonder dit niet als Zwift te herkennen.
   */
  deviceName?: string;
  /** Uit het bestand, als de CSV-rit geen tijd had (een CSV zonder tijdkolommen). */
  movingTime?: number;
  elapsedTime?: number;
  /** Uit het bestand, als de CSV-rit 0 hoogtemeters had. */
  elevationGainM?: number;
};

export type ImportPlan = {
  upsert: ImportedStravaActivity[];
  attach: TrackAttachment[];
  duplicates: number;
};

function trackOf(row: ImportedStravaActivity): string | null {
  const map = row.raw.map;
  if (!map || typeof map !== "object") return null;
  const encoded = (map as Record<string, unknown>).summary_polyline;
  return typeof encoded === "string" && encoded.length > 0 ? encoded : null;
}

/** Een waarde die er is en 0 is; null of een ontbrekende kolom telt niet. */
function isZero(value: number | string | null | undefined): boolean {
  return value !== null && value !== undefined && value !== "" && Number(value) === 0;
}

function attachmentFor(
  row: ImportedStravaActivity,
  match: ExistingImportRide,
  track: string,
): TrackAttachment | null {
  const attachment: TrackAttachment = { id: match.id };
  if (!match.has_track) attachment.summaryPolyline = track;
  if (isZero(match.moving_time_seconds) && row.moving_time_seconds > 0) {
    attachment.movingTime = row.moving_time_seconds;
    attachment.elapsedTime = Math.max(row.elapsed_time_seconds, row.moving_time_seconds);
  }
  if (isZero(match.total_elevation_gain_m) && row.total_elevation_gain_m > 0) {
    attachment.elevationGainM = row.total_elevation_gain_m;
  }
  const fills =
    attachment.summaryPolyline !== undefined ||
    attachment.movingTime !== undefined ||
    attachment.elevationGainM !== undefined;
  if (!fills) return null;
  const deviceName = row.raw.device_name;
  if (typeof deviceName === "string" && deviceName) attachment.deviceName = deviceName;
  return attachment;
}

export function planRideImport(
  incoming: ImportedStravaActivity[],
  existing: ExistingImportRide[],
): ImportPlan {
  const plan: ImportPlan = { upsert: [], attach: [], duplicates: 0 };
  for (const row of incoming) {
    const match = existing.find(
      (ride) => String(ride.id) !== String(row.id) && isSameRide(ride, row),
    );
    if (!match) {
      plan.upsert.push(row);
      continue;
    }
    const track = trackOf(row);
    const attachment =
      track && match.import_source === "strava_csv" ? attachmentFor(row, match, track) : null;
    if (attachment) {
      plan.attach.push(attachment);
      continue;
    }
    plan.duplicates += 1;
  }
  return plan;
}
