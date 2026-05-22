import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  athleteName,
  exchangeStravaCode,
  pickAthleteAvatarUrl,
} from "@/lib/strava/client";

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

    // Update profiel-velden vanuit Strava: athlete-id altijd, avatar alleen
    // als de gebruiker een echte foto heeft (Strava's default-egg slaan
    // we niet op) én er nog geen avatar-url stond.
    const avatarFromStrava = pickAthleteAvatarUrl(token);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileUpdate: Record<string, any> = { strava_id: String(athleteId) };
    if (avatarFromStrava) {
      // Lees huidige avatar — overschrijf alleen als hij leeg is of zelf
      // afkomstig is van Strava (cdn-domein), zodat een handmatige upload
      // niet wordt vervangen door Strava's foto.
      const { data: current } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      const existing = current?.avatar_url as string | null | undefined;
      const isStravaCdn =
        !existing || /strava|cloudfront\.net\/avatar/i.test(existing);
      if (isStravaCdn) {
        profileUpdate.avatar_url = avatarFromStrava;
      }
    }
    await supabase.from("profiles").update(profileUpdate).eq("id", user.id);

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
