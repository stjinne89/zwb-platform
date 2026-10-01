// Wat een CSV-, GPX- of FIT-import doet met ritten die er al zijn.
//
// Een rit die al onder een ander id bestaat (via Strava, intervals.icu of een
// eerdere import) wordt niet nog eens opgeslagen. Eén uitzondering: een GPX of
// FIT met spoor bij een rit uit activities.csv vult het spoor van die CSV-rit
// aan. Zo kun je eerst je hele historie via de CSV binnenhalen en daarna de
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
};

export type TrackAttachment = {
  id: number | string;
  summaryPolyline: string;
  /**
   * Alleen bij een FIT van Zwift. De CSV-rit kent geen toestel, en een
   * hernoemde Zwift-rit is zonder dit niet als Zwift te herkennen.
   */
  deviceName?: string;
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
    if (track && match.import_source === "strava_csv" && !match.has_track) {
      const deviceName = row.raw.device_name;
      plan.attach.push({
        id: match.id,
        summaryPolyline: track,
        ...(typeof deviceName === "string" && deviceName ? { deviceName } : {}),
      });
      continue;
    }
    plan.duplicates += 1;
  }
  return plan;
}
