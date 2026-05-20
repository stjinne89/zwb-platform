import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stravaAuthorizeUrl } from "@/lib/strava/client";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const state = randomUUID();
    const redirectUri = new URL("/api/strava/callback", request.url).toString();
    const response = NextResponse.redirect(stravaAuthorizeUrl(redirectUri, state));

    response.cookies.set("strava_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 10 * 60,
    });

    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Strava koppeling kon niet starten.";
    return NextResponse.redirect(
      new URL(`/achievements?strava_error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
