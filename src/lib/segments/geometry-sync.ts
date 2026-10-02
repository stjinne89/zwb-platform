// Segmentlijnen voor de GPS-meting (gps-sync.ts).
//
// zwb_segment_maps bewaart per uitgekozen segment en per col met een
// Strava-segment de lijn van Strava. Langs die lijn meet ZWB de tijd van leden
// zonder Strava. Tot oktober 2026 was dit het register van álle gereden
// Strava-segmenten, met hoogteprofiel, voor de verkenner; die is verwijderd
// (migratie 0212). Nu één Strava-call per segment, alleen voor de lijn.

import { decode } from "@mapbox/polyline";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadRateLimitUsage, recordRateLimitUsage, shouldPauseForRateLimit } from "@/lib/strava/rate-limit-budget";
import { curatedSegmentIds } from "./gps-sync";

export type RateBudget = Parameters<typeof shouldPauseForRateLimit>[1];
export type GeometryOutcome = "ready" | "unavailable" | "private" | "error" | "rate_limited";

const RETRY_ERROR_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** De lijn van één segment ophalen en in het register zetten. De rij moet al bestaan. */
export async function fetchSegmentGeometry(
  admin: SupabaseClient,
  token: string,
  id: string | number,
  budget?: RateBudget,
): Promise<GeometryOutcome> {
  if (shouldPauseForRateLimit(await loadRateLimitUsage(admin), budget).pause) return "rate_limited";
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(`https://www.strava.com/api/v3/segments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    await recordRateLimitUsage(admin, response.headers);
    if (response.status === 429) return "rate_limited";
    if (!response.ok) throw new Error(`Segment ophalen: ${response.status}`);
    const detail = await response.json();
    if (detail.private) {
      await admin
        .from("zwb_segment_maps")
        .update({ private: true, geometry_status: "unavailable", geometry_checked_at: checkedAt })
        .eq("id", id);
      return "private";
    }
    const polyline = typeof detail.map?.polyline === "string" ? detail.map.polyline : null;
    const line = polyline ? (decode(polyline) as number[][]) : [];
    const { error: writeError } = await admin
      .from("zwb_segment_maps")
      .update({
        name: detail.name,
        distance_m: detail.distance,
        average_grade: detail.average_grade,
        start_lat: detail.start_latlng?.[0] ?? null,
        start_lon: detail.start_latlng?.[1] ?? null,
        south: line.length ? Math.min(...line.map((p) => p[0])) : null,
        north: line.length ? Math.max(...line.map((p) => p[0])) : null,
        west: line.length ? Math.min(...line.map((p) => p[1])) : null,
        east: line.length ? Math.max(...line.map((p) => p[1])) : null,
        polyline,
        private: false,
        geometry_status: line.length >= 2 ? "ready" : "unavailable",
        geometry_error: line.length >= 2 ? null : "Geen lijn beschikbaar",
        geometry_checked_at: checkedAt,
        updated_at: checkedAt,
      })
      .eq("id", id);
    if (writeError) throw new Error(writeError.message);
    return line.length >= 2 ? "ready" : "unavailable";
  } catch (error) {
    await admin
      .from("zwb_segment_maps")
      .update({
        geometry_status: "error",
        geometry_checked_at: checkedAt,
        geometry_error: error instanceof Error ? error.message.slice(0, 180) : "Ophalen mislukt",
      })
      .eq("id", id);
    return "error";
  }
}

/**
 * Haalt hooguit `limit` ontbrekende lijnen op van uitgekozen segmenten en cols.
 * Een segment dat nog niet in het register staat, krijgt eerst een rij.
 */
export async function syncSegmentGeometry(admin: SupabaseClient, token: string, limit = 3, budget?: RateBudget) {
  const ids = await curatedSegmentIds(admin);
  if (ids.length === 0 || limit <= 0) return { fetched: 0, failed: 0, rateLimited: false };

  const { data, error } = await admin
    .from("zwb_segment_maps")
    .select("id, geometry_status, geometry_checked_at")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const known = new Map(
    ((data ?? []) as Array<{ id: number | string; geometry_status: string; geometry_checked_at: string | null }>).map(
      (row) => [Number(row.id), row],
    ),
  );

  const now = Date.now();
  const candidates = ids
    .filter((id) => {
      const row = known.get(id);
      if (!row || row.geometry_status === "pending") return true;
      return row.geometry_status === "error" && now - Date.parse(row.geometry_checked_at ?? "") > RETRY_ERROR_AFTER_MS;
    })
    .slice(0, limit);

  let fetched = 0;
  let failed = 0;
  let rateLimited = false;
  for (const id of candidates) {
    if (!known.has(id)) {
      const { error: insertError } = await admin.from("zwb_segment_maps").insert({ id, name: `Segment ${id}` });
      if (insertError) {
        failed++;
        continue;
      }
    }
    const outcome = await fetchSegmentGeometry(admin, token, id, budget);
    if (outcome === "rate_limited") {
      rateLimited = true;
      break;
    }
    if (outcome === "error") failed++;
    else if (outcome !== "private") fetched++;
  }
  return { fetched, failed, rateLimited };
}
