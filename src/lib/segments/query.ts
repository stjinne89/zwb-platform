import "server-only";
import { decode } from "@mapbox/polyline";
import { createClient } from "@/lib/supabase/server";
import { fetchIntervalsPowerCurve } from "@/lib/intervals/client";
import { fetchWindForecast } from "@/lib/weather";
import { privacyConsentIsCurrent } from "@/lib/privacy";
import { normalizePowerCurvePoints } from "@/lib/intervals/power-curve";
import { createAdminClient } from "@/lib/supabase/admin";
import { accessTokenFor, type StravaConnection } from "@/lib/strava/client";
import { assessSegment, leaderboard, segmentTarget, type SegmentDetail, type SegmentTarget, type TrackPoint } from "./explorer";
import { fetchSegmentGeometry } from "./geometry-sync";

export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };
export async function segmentSession(requireConsent = true) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: profile } = await db.from("profiles").select("is_approved,weight_kg,privacy_accepted_version").eq("id", user.id).maybeSingle();
  if (!profile?.is_approved || (requireConsent && !privacyConsentIsCurrent(profile.privacy_accepted_version))) return null;
  return { db, user, weight: profile.weight_kg == null ? null : Number(profile.weight_kg) };
}
export type SegmentSession = NonNullable<Awaited<ReturnType<typeof segmentSession>>>;
export type ClubRow = {
  id: string; name: string; distance_m: number | null; average_grade: number | null;
  start_lat: number | null; start_lon: number | null; polyline: string | null; track: TrackPoint[];
  hazardous: boolean; updated_at: string | null; leaderboard: Array<{ profileId: string; name: string; seconds: number }>;
};

export async function ownPower(session: SegmentSession) {
  const stored = await session.db.from("rider_power_profiles").select("curve_points,period,synced_at,sync_status").eq("profile_id", session.user.id).maybeSingle();
  if (stored.data?.period === "90d" && ["ok","partial"].includes(stored.data.sync_status) &&
    Date.now() - Date.parse(stored.data.synced_at) < 86400000 && Array.isArray(stored.data.curve_points)) {
    const points = normalizePowerCurvePoints(stored.data.curve_points);
    if (points.length >= 2) return points;
  }
  const { data } = await session.db.from("intervals_connections").select("api_key,athlete_id").eq("profile_id", session.user.id).maybeSingle();
  if (!data) return [];
  try { return (await fetchIntervalsPowerCurve(data.api_key, data.athlete_id, "90d")).points; }
  catch { return []; }
}

// A per-request map only: never cache forecasts or results together with another user's profile.
export function segmentPresenter(session: SegmentSession, curve: Awaited<ReturnType<typeof ownPower>>, when: Date, target: SegmentTarget) {
  const forecasts = new Map<string, ReturnType<typeof fetchWindForecast>>();
  return async (row: ClubRow): Promise<SegmentDetail> => {
    const board = leaderboard(row.leaderboard), me = board.find((r) => r.profileId === session.user.id);
    const goal = segmentTarget(board, session.user.id, target), threshold = goal?.seconds ?? null;
    let wind = null;
    if (row.start_lat != null && row.start_lon != null && curve.length >= 2 && session.weight && row.track?.length >= 2 && threshold && !row.hazardous) {
      const lat = Math.round(row.start_lat * 10) / 10, lon = Math.round(row.start_lon * 10) / 10;
      const key = `${lat},${lon}`;
      if (!forecasts.has(key)) forecasts.set(key, fetchWindForecast(lat, lon, when));
      const forecast = await forecasts.get(key);
      if (forecast) wind = { speedKmh: forecast.windSpeedKmh, directionFrom: forecast.windDirectionFrom };
    }
    let line: [number, number][] = [];
    try { if (row.polyline) line = decode(row.polyline); } catch { /* start marker remains */ }
    return {
      id: row.id, name: row.name, distance: row.distance_m, grade: row.average_grade,
      start: row.start_lat != null && row.start_lon != null ? [row.start_lat, row.start_lon] : null,
      line, riders: board.length, mine: me?.seconds ?? null, rank: me?.rank ?? null,
      record: board[0]?.seconds ?? null, updatedAt: row.updated_at, leaderboard: board, hazardous: row.hazardous,
      assessment: assessSegment({ targetSeconds: threshold, targetKind: goal?.kind, track: row.track ?? [], curve, weight: session.weight, wind, hazardous: row.hazardous }),
    };
  };
}

/**
 * Hoogteprofiel ophalen zodra een lid een segment opent (twee Strava-calls met de eigen
 * koppeling), in plaats van te wachten op de achtergrondtaak. Het gewone interactieve
 * budget geldt; een fout wordt pas na een uur opnieuw geprobeerd.
 * Geeft true als er een nieuw profiel in de registry staat.
 */
export async function ensureSegmentGeometry(session: SegmentSession, id: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data: map } = await admin.from("zwb_segment_maps").select("geometry_status,geometry_checked_at").eq("id", id).maybeSingle();
    if (!map) return false;
    const retryError = map.geometry_status === "error" && Date.now() - Date.parse(map.geometry_checked_at ?? "") > 3600000;
    if (map.geometry_status !== "pending" && !retryError) return false;
    const { data: connection } = await admin.from("strava_connections")
      .select("profile_id,strava_athlete_id,access_token,refresh_token,expires_at").eq("profile_id", session.user.id).is("revoked_at", null).maybeSingle();
    if (!connection) return false;
    const token = await accessTokenFor(admin, connection as StravaConnection);
    return ["ready", "unavailable", "private"].includes(await fetchSegmentGeometry(admin, token, id));
  } catch {
    return false;
  }
}

export function segmentRequest(params: URLSearchParams) {
  const target = params.get("target") ?? "record";
  if (target !== "record" && target !== "podium") throw new Error("Ongeldig doel");
  const when = params.has("when") ? new Date(params.get("when")!) : new Date();
  if (!Number.isFinite(when.getTime()) || when.getTime() < Date.now() - 3600000 || when.getTime() > Date.now() + 16 * 86400000) throw new Error("Kies een tijdstip binnen 16 dagen");
  return { when, target: target as SegmentTarget };
}
