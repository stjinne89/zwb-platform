// Koppeling met het eigen YouTube-kanaal van een lid (livestreams, fase 1).
//
// Google OAuth 2.0 voor webservers. De scope `youtube` is nodig om op het kanaal
// van het lid een uitzending en een vaste stream aan te maken. Google rekent die
// tot de gevoelige scopes: zolang het toestemmingsscherm op "Testing" staat,
// verloopt een koppeling na 7 dagen (zie docs/livestream-youtube.md).

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const TIMEOUT_MS = 10_000;

/** Waar de koppeling op het profiel staat, en waar het lid standaard terugkomt. */
export const PROFILE_YOUTUBE_PATH = "/profiel?weergave=bewerken#youtube";

export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube";

export type YouTubeOAuthConfig = { clientId: string; clientSecret: string };

/** De OAuth-client uit de omgeving, of null als livestreams niet ingericht zijn. */
export function youtubeOAuthConfig(): YouTubeOAuthConfig | null {
  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function youtubeLiveConfigured(): boolean {
  return youtubeOAuthConfig() !== null;
}

/**
 * De callback-URL. Zoals bij Strava telt NEXT_PUBLIC_SITE_URL: op Netlify bevat
 * request.url niet altijd het publieke domein, en Google eist een exacte match.
 */
export function youtubeRedirectUri(requestUrl: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base = siteUrl && /^https?:\/\//i.test(siteUrl) ? siteUrl : requestUrl;
  return new URL("/api/youtube/callback", base).toString();
}

export function youtubeAuthorizeUrl(
  config: YouTubeOAuthConfig,
  redirectUri: string,
  state: string,
): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_SCOPE);
  // Offline + consent: alleen zo geeft Google (opnieuw) een refresh-token.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export type YouTubeTokens = {
  accessToken: string;
  /** Alleen bij de eerste uitwisseling (en na prompt=consent). */
  refreshToken: string | null;
  expiresAt: Date;
  scope: string;
};

/** Google weigert de refresh-token: ingetrokken, of verlopen in de testfase. */
export class YouTubeGrantRevokedError extends Error {
  constructor(message = "De YouTube-koppeling is verlopen of ingetrokken.") {
    super(message);
    this.name = "YouTubeGrantRevokedError";
  }
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function postToken(body: URLSearchParams, now: Date): Promise<YouTubeTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token) {
    if (data.error === "invalid_grant") throw new YouTubeGrantRevokedError();
    throw new Error(
      `Google gaf geen token (${res.status}): ${data.error_description ?? data.error ?? "onbekend"}`,
    );
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(now.getTime() + Math.max(0, (data.expires_in ?? 3600) - 60) * 1000),
    scope: data.scope ?? "",
  };
}

export function exchangeYouTubeCode(
  config: YouTubeOAuthConfig,
  code: string,
  redirectUri: string,
  now = new Date(),
): Promise<YouTubeTokens> {
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  return postToken(body, now);
}

export function refreshYouTubeToken(
  config: YouTubeOAuthConfig,
  refreshToken: string,
  now = new Date(),
): Promise<YouTubeTokens> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
  });
  return postToken(body, now);
}

export function hasYouTubeScope(scope: string | null | undefined): boolean {
  return (scope ?? "").split(/\s+/).includes(YOUTUBE_SCOPE);
}

/**
 * Trekt de toestemming in bij Google. Een 400 betekent dat de token al niet meer
 * geldig was; dat telt als geslaagd, zoals bij Strava.
 */
export async function revokeYouTubeToken(token: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok || res.status === 400) return { ok: true };
    return { ok: false, error: `Google revoke faalde (${res.status}).` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Google revoke faalde." };
  }
}

/**
 * Wat er na het koppelen mis kan gaan. De callback zet alleen de code in de URL;
 * het profiel toont de vaste tekst, zodat een link geen eigen tekst kan tonen.
 */
export const YOUTUBE_CONNECT_ERRORS = {
  geweigerd: "Je hebt YouTube geen toestemming gegeven.",
  verlopen: "De koppeling is verlopen. Probeer het opnieuw.",
  "niet-ingericht": "YouTube is niet ingericht.",
  "geen-recht": "Zonder toegang tot je kanaal kan de app geen stream klaarzetten.",
  "geen-kanaal": "Dit Google-account heeft geen YouTube-kanaal.",
  "live-uit": "Livestreamen staat nog niet aan op je YouTube-kanaal.",
  youtube: "YouTube gaf een fout. Probeer het zo opnieuw.",
} as const;

export type YouTubeConnectError = keyof typeof YOUTUBE_CONNECT_ERRORS;

export function youtubeConnectErrorText(code: string | null | undefined): string | null {
  // Object.hasOwn: met `in` zou "toString" ook een code zijn.
  return code && Object.hasOwn(YOUTUBE_CONNECT_ERRORS, code)
    ? YOUTUBE_CONNECT_ERRORS[code as YouTubeConnectError]
    : null;
}

/** Alleen een pad binnen de app: geen schema, geen `//`, geen backslash. */
export function safeReturnPath(value: string | null | undefined, fallback: string): string {
  const path = (value ?? "").trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  if (path.length > 300) return fallback;
  return path;
}
