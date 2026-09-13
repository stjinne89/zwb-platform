import type { SupabaseClient } from "@supabase/supabase-js";
import { accessTokenFor, type StravaConnection } from "@/lib/strava/client";
import { ingestStravaActivity } from "@/lib/strava/ingest-activity";
import { loadRateLimitUsage, shouldPauseForRateLimit } from "@/lib/strava/rate-limit-budget";
import { syncSegmentGeometry } from "./geometry-sync";

export async function backfillSegmentBatch(admin: SupabaseClient, profileId: string, maxActivities = 5) {
  const connection = await admin.from("strava_connections").select("*").eq("profile_id", profileId).is("revoked_at", null).maybeSingle();
  if (connection.error || !connection.data) throw new Error("Geen actieve Strava-koppeling");
  const profile = await admin.from("profiles").select("is_approved").eq("id", profileId).maybeSingle();
  if (!profile.data?.is_approved) throw new Error("Geen goedgekeurd lid");
  const token = await accessTokenFor(admin, connection.data as StravaConnection);
  const candidates = await admin.from("strava_activities").select("id").eq("profile_id", profileId)
    .eq("sport_type", "Ride").eq("trainer", false).is("efforts_fetched_at", null)
    .order("start_date", { ascending: false }).order("id").limit(Math.min(20, Math.max(0, maxActivities)));
  if (candidates.error) throw new Error(candidates.error.message);
  let fetched = 0, rateLimited = false;
  for (const activity of candidates.data ?? []) {
    if (shouldPauseForRateLimit(await loadRateLimitUsage(admin)).pause) { rateLimited = true; break; }
    const result = await ingestStravaActivity(admin, { profileId, stravaAthleteId: connection.data.strava_athlete_id }, activity.id, token);
    if (result.status === "rate_limited") { rateLimited = true; break; }
    if (result.status === "failed") throw new Error(result.error);
    if (result.status === "auth_failed") throw new Error("Strava-koppeling moet opnieuw worden verbonden");
    if (result.status === "stored" || result.status === "removed") fetched++;
  }
  const geometry = rateLimited ? { fetched: 0, failed: 0, rateLimited: true } : await syncSegmentGeometry(admin, token, profileId, 3);
  const remaining = await admin.from("strava_activities").select("id", { count: "exact", head: true })
    .eq("profile_id", profileId).eq("sport_type", "Ride").eq("trainer", false).is("efforts_fetched_at", null);
  if (remaining.error) throw new Error(remaining.error.message);
  return { fetched, remaining: remaining.count ?? 0, geometry, rateLimited: rateLimited || geometry.rateLimited };
}
