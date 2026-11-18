import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";
import {
  refreshYouTubeToken,
  revokeYouTubeToken,
  YouTubeGrantRevokedError,
  youtubeOAuthConfig,
  type YouTubeTokens,
} from "@/lib/youtube-live/oauth";

// De opgeslagen koppeling met het YouTube-kanaal van een lid (migratie 0338).
// Tokens staan versleuteld (lib/crypto/secrets) en zijn alleen via de
// service-role te lezen; het lid zelf ziet alleen kanaalnaam en status.

export type YouTubeConnectionRow = {
  profile_id: string;
  channel_id: string;
  channel_title: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  stream_id: string | null;
  needs_reconnect: boolean;
};

const COLUMNS =
  "profile_id, channel_id, channel_title, access_token, refresh_token, expires_at, stream_id, needs_reconnect";

export async function loadYouTubeConnection(
  admin: SupabaseClient,
  profileId: string,
): Promise<YouTubeConnectionRow | null> {
  const { data, error } = await admin
    .from("youtube_connections")
    .select(COLUMNS)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as YouTubeConnectionRow | null) ?? null;
}

/** Een bruikbare access-token; ververst hem zo nodig en bewaart de nieuwe. */
export async function youtubeAccessToken(
  admin: SupabaseClient,
  row: YouTubeConnectionRow,
  now = new Date(),
): Promise<string> {
  if (row.needs_reconnect) throw new YouTubeGrantRevokedError();
  const expires = row.expires_at ? Date.parse(row.expires_at) : 0;
  if (row.access_token && expires > now.getTime() + 60_000) return decryptSecret(row.access_token);

  const config = youtubeOAuthConfig();
  if (!config) throw new Error("YouTube is niet ingericht.");
  if (!row.refresh_token) throw new YouTubeGrantRevokedError();
  let tokens: YouTubeTokens;
  try {
    tokens = await refreshYouTubeToken(config, decryptSecret(row.refresh_token), now);
  } catch (err) {
    if (err instanceof YouTubeGrantRevokedError) {
      await admin
        .from("youtube_connections")
        .update({ needs_reconnect: true, access_token: null, updated_at: now.toISOString() })
        .eq("profile_id", row.profile_id);
    }
    throw err;
  }
  await admin
    .from("youtube_connections")
    .update({
      access_token: encryptSecret(tokens.accessToken),
      expires_at: tokens.expiresAt.toISOString(),
      // Google geeft bij verversen meestal geen nieuwe refresh-token.
      ...(tokens.refreshToken ? { refresh_token: encryptSecret(tokens.refreshToken) } : {}),
      updated_at: now.toISOString(),
    })
    .eq("profile_id", row.profile_id);
  return tokens.accessToken;
}

/**
 * Ontkoppelen: toestemming bij Google intrekken en de rij weg. Best-effort aan
 * Googles kant; de rij gaat altijd weg. Streams die al bij races staan, blijven:
 * dat zijn openbare video's op het kanaal van het lid.
 */
export async function removeYouTubeConnection(
  admin: SupabaseClient,
  profileId: string,
): Promise<void> {
  const row = await loadYouTubeConnection(admin, profileId).catch(() => null);
  const token = row?.refresh_token ?? row?.access_token ?? null;
  if (token) {
    try {
      await revokeYouTubeToken(decryptSecret(token));
    } catch {
      // niet kritiek
    }
  }
  const { error } = await admin.from("youtube_connections").delete().eq("profile_id", profileId);
  if (error) throw new Error(error.message);
}
