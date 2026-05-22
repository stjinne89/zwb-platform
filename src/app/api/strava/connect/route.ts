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
    // Op Netlify routet de request via een interne URL, waardoor request.url
    // niet altijd het publieke domein bevat. Gebruik NEXT_PUBLIC_SITE_URL als
    // bron-of-truth zodat de redirect_uri overeenkomt met het Strava callback-
    // domain. Fallback naar request.url voor lokaal development.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const base = siteUrl && /^https?:\/\//i.test(siteUrl) ? siteUrl : request.url;
    const redirectUri = new URL("/api/strava/callback", base).toString();
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
