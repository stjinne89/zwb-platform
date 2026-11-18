import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PROFILE_YOUTUBE_PATH,
  safeReturnPath,
  youtubeAuthorizeUrl,
  youtubeOAuthConfig,
  youtubeRedirectUri,
} from "@/lib/youtube-live/oauth";

// Start de koppeling met het eigen YouTube-kanaal (livestreams, 0338).
// ?terug=<pad> brengt het lid na afloop terug, bijvoorbeeld naar de race.

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const back = safeReturnPath(request.nextUrl.searchParams.get("terug"), PROFILE_YOUTUBE_PATH);
  const config = youtubeOAuthConfig();
  if (!config) {
    const target = new URL(PROFILE_YOUTUBE_PATH, request.url);
    target.searchParams.set("youtube_fout", "niet-ingericht");
    return NextResponse.redirect(target);
  }

  const state = randomUUID();
  const response = NextResponse.redirect(
    youtubeAuthorizeUrl(config, youtubeRedirectUri(request.url), state),
  );
  const cookie = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 10 * 60,
  };
  response.cookies.set("youtube_oauth_state", state, cookie);
  response.cookies.set("youtube_oauth_back", back, cookie);
  return response;
}
