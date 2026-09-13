import { decode } from "@mapbox/polyline";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadRateLimitUsage, recordRateLimitUsage, shouldPauseForRateLimit } from "@/lib/strava/rate-limit-budget";
import { validTrack, type TrackPoint } from "./explorer";

export function trackFromStreams(streams: Record<string, { data?: unknown[] }>): TrackPoint[] {
  const latlng = streams.latlng?.data ?? [], distance = streams.distance?.data ?? [], altitude = streams.altitude?.data ?? [];
  if (latlng.length !== distance.length || distance.length !== altitude.length) return [];
  const track = latlng.map((position, i) => ({ lat: Number((position as number[])?.[0]), lon: Number((position as number[])?.[1]), distance: Number(distance[i]), altitude: Number(altitude[i]) }));
  // Stationary samples are safe to drop; missing/non-numeric altitude is not.
  if (distance.some((v) => typeof v !== "number") || altitude.some((v) => typeof v !== "number")) return [];
  const increasing = track.filter((p, i) => i === 0 || p.distance > track[i - 1].distance);
  if (!validTrack(increasing)) return [];
  const stride = Math.max(1, Math.ceil(increasing.length / 200));
  return increasing.filter((_, i) => i % stride === 0 || i === increasing.length - 1);
}

export type RateBudget = Parameters<typeof shouldPauseForRateLimit>[1];
export type GeometryOutcome = "ready" | "unavailable" | "private" | "error" | "rate_limited";

/** Detail + streams for one segment (two Strava calls), written to the shared registry. */
export async function fetchSegmentGeometry(admin: SupabaseClient, token: string, id: string | number, budget?: RateBudget): Promise<GeometryOutcome> {
  const paused = async () => shouldPauseForRateLimit(await loadRateLimitUsage(admin), budget).pause;
  if (await paused()) return "rate_limited";
  const get = async (path: string) => {
    const response = await fetch(`https://www.strava.com/api/v3/segments/${id}${path}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    await recordRateLimitUsage(admin, response.headers);
    return response;
  };
  try {
    const response = await get("");
    if (response.status === 429) return "rate_limited";
    if (!response.ok) throw new Error(`Segment ophalen: ${response.status}`);
    const detail = await response.json();
    if (detail.private) {
      await admin.from("zwb_segment_maps").update({ private: true, geometry_status: "unavailable", geometry_checked_at: new Date().toISOString() }).eq("id", id);
      return "private";
    }
    const polyline = typeof detail.map?.polyline === "string" ? detail.map.polyline : null;
    const line = polyline ? decode(polyline) : [];
    const coordinates = line.length ? line : Array.isArray(detail.start_latlng) ? [detail.start_latlng] : [];
    let track: TrackPoint[] = [];
    if (await paused()) return "rate_limited";
    const streams = await get("/streams?keys=latlng,distance,altitude&key_by_type=true");
    if (streams.status === 429) return "rate_limited";
    if (streams.ok) track = trackFromStreams(await streams.json());
    const { error: writeError } = await admin.from("zwb_segment_maps").update({
      name: detail.name, distance_m: detail.distance, average_grade: detail.average_grade,
      start_lat: detail.start_latlng?.[0] ?? null, start_lon: detail.start_latlng?.[1] ?? null,
      south: coordinates.length ? Math.min(...coordinates.map((p: number[]) => p[0])) : null,
      north: coordinates.length ? Math.max(...coordinates.map((p: number[]) => p[0])) : null,
      west: coordinates.length ? Math.min(...coordinates.map((p: number[]) => p[1])) : null,
      east: coordinates.length ? Math.max(...coordinates.map((p: number[]) => p[1])) : null,
      polyline, track, private: false, hazardous: detail.hazardous === true,
      geometry_status: track.length ? "ready" : "unavailable", geometry_error: track.length ? null : "Hoogteprofiel niet beschikbaar",
      geometry_checked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (writeError) throw new Error(writeError.message);
    return track.length ? "ready" : "unavailable";
  } catch (error) {
    await admin.from("zwb_segment_maps").update({ geometry_status: "error", geometry_checked_at: new Date().toISOString(), geometry_error: error instanceof Error ? error.message.slice(0, 180) : "Ophalen mislukt" }).eq("id", id);
    return "error";
  }
}

/** Bounded shared geometry job. Membership in this user's efforts grants the candidate set. */
export async function syncSegmentGeometry(admin: SupabaseClient, token: string, profileId: string, limit = 3, budget?: RateBudget) {
  const candidates = await admin.rpc("segment_geometry_candidates", { p_profile: profileId, p_limit: Math.min(10, Math.max(0, limit)) });
  if (candidates.error) throw new Error(candidates.error.message);
  let fetched = 0, failed = 0, rateLimited = false;
  for (const row of candidates.data ?? []) {
    const outcome = await fetchSegmentGeometry(admin, token, row.id, budget);
    if (outcome === "rate_limited") { rateLimited = true; break; }
    if (outcome === "error") failed++;
    else if (outcome !== "private") fetched++;
  }
  return { fetched, failed, rateLimited };
}
