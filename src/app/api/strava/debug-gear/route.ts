// TIJDELIJK diagnose-endpoint voor de onderhoudsfeature.
// Open ingelogd in de browser: /api/strava/debug-gear
// Laat zien wat Strava's /athlete teruggeeft (bikes + top-level keys) en wat
// er in strava_bikes staat. Verwijderen zodra gear-sync werkt.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { accessTokenFor, type StravaConnection } from "@/lib/strava/client";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const { data: conn } = await supabase
    .from("strava_connections")
    .select("profile_id, strava_athlete_id, access_token, refresh_token, expires_at, scope")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!conn) {
    return NextResponse.json({ error: "Geen Strava-koppeling." }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await accessTokenFor(supabase, conn as unknown as StravaConnection);
  } catch (err) {
    return NextResponse.json(
      { error: "Token ophalen faalde", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  const res = await fetch("https://www.strava.com/api/v3/athlete", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const status = res.status;
  const rateLimit = {
    limit15min_daily: res.headers.get("x-ratelimit-limit"),
    usage15min_daily: res.headers.get("x-ratelimit-usage"),
    readLimit15min_daily: res.headers.get("x-readratelimit-limit"),
    readUsage15min_daily: res.headers.get("x-readratelimit-usage"),
  };
  let athlete: Record<string, unknown> | null = null;
  let parseError: string | null = null;
  try {
    athlete = (await res.json()) as Record<string, unknown>;
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err);
  }

  const { data: storedBikes } = await supabase
    .from("strava_bikes")
    .select("id, name, distance_m, is_primary, retired, synced_at")
    .eq("profile_id", user.id);

  return NextResponse.json(
    {
      scope: (conn as { scope?: string }).scope ?? null,
      athleteFetchStatus: status,
      rateLimit,
      parseError,
      athleteTopLevelKeys: athlete ? Object.keys(athlete) : null,
      bikes: athlete?.bikes ?? null,
      shoes: athlete?.shoes ?? null,
      storedBikesCount: storedBikes?.length ?? 0,
      storedBikes: storedBikes ?? [],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
