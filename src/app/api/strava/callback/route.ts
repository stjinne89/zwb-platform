import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { athleteName, exchangeStravaCode } from "@/lib/strava/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const error = searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      new URL(`/achievements?strava_error=${encodeURIComponent(error)}`, request.url),
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("strava_oauth_state")?.value;

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(
      new URL(
        `/achievements?strava_error=${encodeURIComponent("Strava state controle mislukt.")}`,
        request.url,
      ),
    );
  }

  try {
    const token = await exchangeStravaCode(code);
    const athleteId = token.athlete?.id;
    if (!athleteId) throw new Error("Strava gaf geen athlete id terug.");

    const { error: upsertError } = await supabase.from("strava_connections").upsert(
      {
        profile_id: user.id,
        strava_athlete_id: athleteId,
        athlete_username: token.athlete?.username ?? null,
        athlete_name: athleteName(token),
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: token.expires_at,
        scope: token.scope ?? searchParams.get("scope"),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    );

    if (upsertError) throw new Error(upsertError.message);

    await supabase
      .from("profiles")
      .update({ strava_id: String(athleteId) })
      .eq("id", user.id);

    const response = NextResponse.redirect(
      new URL("/achievements?strava_connected=1", request.url),
    );
    response.cookies.delete("strava_oauth_state");
    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Strava koppeling kon niet worden opgeslagen.";
    return NextResponse.redirect(
      new URL(`/achievements?strava_error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
