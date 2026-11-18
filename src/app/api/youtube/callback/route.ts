import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/crypto/secrets";
import {
  ensureReusableStream,
  getMyChannel,
  YouTubeApiError,
} from "@/lib/youtube-live/api";
import {
  exchangeYouTubeCode,
  hasYouTubeScope,
  PROFILE_YOUTUBE_PATH,
  safeReturnPath,
  youtubeOAuthConfig,
  youtubeRedirectUri,
  type YouTubeConnectError,
} from "@/lib/youtube-live/oauth";

// Terug van Google: tokens ophalen, het kanaal en de vaste stream vastleggen.

function connectErrorCode(err: unknown): YouTubeConnectError {
  if (
    err instanceof YouTubeApiError &&
    ["liveStreamingNotEnabled", "livePermissionBlocked", "insufficientLivePermissions"].includes(err.reason ?? "")
  ) {
    return "live-uit";
  }
  return "youtube";
}

function finish(request: NextRequest, back: string, param: string, value: string) {
  // Een fout altijd op het profiel: daar staat de melding, en opnieuw koppelen.
  const target = new URL(param === "youtube_fout" ? PROFILE_YOUTUBE_PATH : back, request.url);
  target.searchParams.set(param, value);
  const response = NextResponse.redirect(target);
  response.cookies.delete("youtube_oauth_state");
  response.cookies.delete("youtube_oauth_back");
  return response;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const back = safeReturnPath(request.cookies.get("youtube_oauth_back")?.value, PROFILE_YOUTUBE_PATH);
  const params = request.nextUrl.searchParams;
  if (params.get("error")) {
    return finish(request, back, "youtube_fout", "geweigerd");
  }
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || state !== request.cookies.get("youtube_oauth_state")?.value) {
    return finish(request, back, "youtube_fout", "verlopen");
  }
  const config = youtubeOAuthConfig();
  if (!config) return finish(request, back, "youtube_fout", "niet-ingericht");

  try {
    const tokens = await exchangeYouTubeCode(config, code, youtubeRedirectUri(request.url));
    if (!hasYouTubeScope(tokens.scope)) {
      return finish(request, back, "youtube_fout", "geen-recht");
    }
    const channel = await getMyChannel(tokens.accessToken);
    if (!channel) {
      return finish(request, back, "youtube_fout", "geen-kanaal");
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("youtube_connections")
      .select("channel_id, stream_id, refresh_token")
      .eq("profile_id", user.id)
      .maybeSingle();
    const previous = existing as { channel_id: string; stream_id: string | null; refresh_token: string | null } | null;
    // Hetzelfde kanaal: dezelfde vaste stream, dus dezelfde sleutel in OBS.
    const knownStream = previous?.channel_id === channel.id ? previous.stream_id : null;
    const streamId = await ensureReusableStream(tokens.accessToken, knownStream);

    const refreshToken = tokens.refreshToken
      ? encryptSecret(tokens.refreshToken)
      : previous?.channel_id === channel.id
        ? previous.refresh_token
        : null;
    const now = new Date().toISOString();
    const { error } = await admin.from("youtube_connections").upsert(
      {
        profile_id: user.id,
        channel_id: channel.id,
        channel_title: channel.title.slice(0, 200) || null,
        access_token: encryptSecret(tokens.accessToken),
        refresh_token: refreshToken,
        expires_at: tokens.expiresAt.toISOString(),
        scope: tokens.scope,
        stream_id: streamId,
        needs_reconnect: false,
        updated_at: now,
      },
      { onConflict: "profile_id" },
    );
    if (error) throw new Error(error.message);
    return finish(request, back, "youtube", "gekoppeld");
  } catch (err) {
    console.error("[youtube/callback]", err);
    return finish(request, back, "youtube_fout", connectErrorCode(err));
  }
}
