type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
  athlete?: {
    id?: number;
    username?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    // Strava's DetailedAthlete bevat ook profielfotos:
    // - profile: large (1024px)
    // - profile_medium: medium (~256px), ideaal voor avatar
    profile?: string | null;
    profile_medium?: string | null;
  };
};

export type StravaConnection = {
  profile_id: string;
  strava_athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

type StravaActivity = {
  id: number;
  name?: string;
  sport_type?: string;
  type?: string;
  start_date?: string;
  distance?: number;
  total_elevation_gain?: number;
  kudos_count?: number;
  moving_time?: number;
  elapsed_time?: number;
  trainer?: boolean;
  commute?: boolean;
};

function stravaEnv() {
  // .trim() vangt onzichtbare whitespace/newlines vanuit .env af.
  const clientId = process.env.STRAVA_CLIENT_ID?.trim();
  const clientSecret = process.env.STRAVA_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("STRAVA_CLIENT_ID en STRAVA_CLIENT_SECRET zijn nodig.");
  }

  // Strava client_id is altijd een numerieke string (meestal 5-6 cijfers).
  // Als die test faalt is er bijna zeker iets misgegaan met copy-paste.
  if (!/^\d+$/.test(clientId)) {
    throw new Error(
      `STRAVA_CLIENT_ID ziet er ongebruikelijk uit ("${clientId.slice(0, 20)}…"). Het hoort een puur numerieke string te zijn (5-6 cijfers). Controleer https://www.strava.com/settings/api → het bovenste veld "Client ID".`,
    );
  }

  return { clientId, clientSecret };
}

function formBody(values: Record<string, string>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) body.set(key, value);
  return body;
}

async function postToken(values: Record<string, string>) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody(values),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 && /Application/i.test(text) && /invalid/i.test(text)) {
      throw new Error(
        `Strava: STRAVA_CLIENT_ID/SECRET worden afgewezen. Check 3 dingen op https://www.strava.com/settings/api: (1) client_id is het bovenste veld en numeriek; (2) client_secret is met "Show" zichtbaar te maken; (3) "Authorization Callback Domain" matcht (alleen hostname, geen pad/https). Daarna .env.local + Netlify env opnieuw zetten en herstarten/redeployen.`,
      );
    }
    throw new Error(`Strava token request faalde (${res.status}): ${text.slice(0, 160)}`);
  }

  return (await res.json()) as StravaTokenResponse;
}

export function stravaAuthorizeUrl(redirectUri: string, state: string) {
  const { clientId } = stravaEnv();
  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", "read,activity:read_all");
  url.searchParams.set("state", state);
  return url;
}

/**
 * Strava's standaard ei-avatar wordt door /athlete teruggegeven als een
 * gebruiker geen foto heeft. We slaan die niet op — dan toont onze app
 * de initials-fallback.
 */
const STRAVA_DEFAULT_AVATAR_PATTERN = /avatar\/athlete\/(large|medium|small)\.(png|gif|jpg|jpeg)/i;

export function pickAthleteAvatarUrl(
  token: Pick<StravaTokenResponse, "athlete">,
): string | null {
  const url = token.athlete?.profile_medium ?? token.athlete?.profile ?? null;
  if (!url) return null;
  if (STRAVA_DEFAULT_AVATAR_PATTERN.test(url)) return null;
  return url;
}

export async function exchangeStravaCode(code: string) {
  const { clientId, clientSecret } = stravaEnv();
  return await postToken({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });
}

// Helper voor connect-route: bepaal de publieke base-URL voor redirect_uri.
// Netlify routet via interne URLs waardoor request.url niet betrouwbaar is.
export function publicBaseUrl(requestUrl: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl && /^https?:\/\//i.test(siteUrl)) return siteUrl;
  return requestUrl;
}

async function refreshStravaToken(refreshToken: string) {
  const { clientId, clientSecret } = stravaEnv();
  return await postToken({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
}

function isCyclingActivity(activity: StravaActivity) {
  const type = activity.sport_type ?? activity.type ?? "";
  return /ride|cycling|bike/i.test(type);
}

export function weekStartDate(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function currentAchievementWeek() {
  return dateOnly(weekStartDate());
}

export async function accessTokenFor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  connection: StravaConnection,
) {
  const now = Math.floor(Date.now() / 1000);
  if (connection.expires_at > now + 600) return connection.access_token;

  const refreshed = await refreshStravaToken(connection.refresh_token);
  const { error } = await supabase
    .from("strava_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", connection.profile_id);

  if (error) throw new Error(error.message);
  return refreshed.access_token;
}

/**
 * Haal de actuele athlete-info op (foto, naam, FTP, etc.) en update
 * profiles.avatar_url als de gebruiker een echte Strava-foto heeft en
 * er nog geen handmatige avatar staat.
 */
export async function refreshStravaAthleteInfo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  accessToken: string,
): Promise<{ avatarUrl: string | null }> {
  try {
    const res = await fetch("https://www.strava.com/api/v3/athlete", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { avatarUrl: null };
    const athlete = (await res.json()) as {
      username?: string | null;
      profile?: string | null;
      profile_medium?: string | null;
    };

    const avatar = pickAthleteAvatarUrl({ athlete });

    // strava_connections.athlete_username updaten zodat /profiel-header
    // de handle kan tonen na een sync zonder reconnect.
    if (athlete.username) {
      await supabase
        .from("strava_connections")
        .update({ athlete_username: athlete.username })
        .eq("profile_id", profileId);
    }

    if (!avatar) return { avatarUrl: null };

    // Overschrijf alleen als er nog geen avatar is OF de bestaande is van
    // Strava's CDN (zodat een handmatige upload niet wordt vervangen).
    const { data: current } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", profileId)
      .single();
    const existing = current?.avatar_url as string | null | undefined;
    const isStravaCdn =
      !existing ||
      /strava|cloudfront\.net\/(avatar|pictures)/i.test(existing);
    if (isStravaCdn) {
      await supabase
        .from("profiles")
        .update({ avatar_url: avatar })
        .eq("id", profileId);
    }

    return { avatarUrl: avatar };
  } catch {
    return { avatarUrl: null };
  }
}

export async function syncStravaActivitiesForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
) {
  const { data: connection, error } = await supabase
    .from("strava_connections")
    .select("profile_id, strava_athlete_id, access_token, refresh_token, expires_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!connection) {
    return { ok: false as const, error: "Koppel eerst Strava." };
  }

  const accessToken = await accessTokenFor(supabase, connection as StravaConnection);

  // Best-effort: refresh avatar + username (faalt stil als API onbereikbaar).
  await refreshStravaAthleteInfo(supabase, profileId, accessToken);
  const after = Math.floor(weekStartDate(new Date(Date.now() - 21 * 86400_000)).getTime() / 1000);
  const url = new URL("https://www.strava.com/api/v3/athlete/activities");
  url.searchParams.set("after", String(after));
  url.searchParams.set("per_page", "100");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava activiteiten ophalen faalde (${res.status}): ${text.slice(0, 160)}`);
  }

  const activities = ((await res.json()) as StravaActivity[]).filter(isCyclingActivity);
  let upserted = 0;

  for (const activity of activities) {
    if (!activity.id || !activity.start_date) continue;
    const startDate = new Date(activity.start_date);
    const row = {
      id: activity.id,
      profile_id: profileId,
      strava_athlete_id: Number((connection as StravaConnection).strava_athlete_id),
      name: activity.name ?? "Strava activiteit",
      sport_type: activity.sport_type ?? activity.type ?? null,
      start_date: startDate.toISOString(),
      achievement_week: dateOnly(weekStartDate(startDate)),
      distance_m: activity.distance ?? 0,
      total_elevation_gain_m: activity.total_elevation_gain ?? 0,
      kudos_count: activity.kudos_count ?? 0,
      moving_time_seconds: activity.moving_time ?? 0,
      elapsed_time_seconds: activity.elapsed_time ?? 0,
      trainer: Boolean(activity.trainer),
      commute: Boolean(activity.commute),
      raw: activity,
      synced_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("strava_activities")
      .upsert(row, { onConflict: "id" });
    if (upsertError) throw new Error(upsertError.message);
    upserted += 1;
  }

  // Evaluate milestone-badges (best-effort, errors zijn niet kritiek).
  let milestoneAwards = 0;
  try {
    const { evaluateMilestonesForUser } = await import(
      "@/lib/achievements/milestone-evaluators"
    );
    const result = await evaluateMilestonesForUser(supabase, profileId);
    milestoneAwards = result.awarded;
  } catch {
    // negeer; sync zelf is geslaagd
  }

  return { ok: true as const, upserted, milestoneAwards };
}

export function athleteName(token: StravaTokenResponse) {
  const athlete = token.athlete;
  const name = [athlete?.firstname, athlete?.lastname].filter(Boolean).join(" ");
  return name || athlete?.username || null;
}
