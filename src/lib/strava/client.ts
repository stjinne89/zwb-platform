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
  };
};

type StravaConnection = {
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
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("STRAVA_CLIENT_ID en STRAVA_CLIENT_SECRET zijn nodig.");
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

export async function exchangeStravaCode(code: string) {
  const { clientId, clientSecret } = stravaEnv();
  return await postToken({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });
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

async function accessTokenFor(
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

  return { ok: true as const, upserted };
}

export function athleteName(token: StravaTokenResponse) {
  const athlete = token.athlete;
  const name = [athlete?.firstname, athlete?.lastname].filter(Boolean).join(" ");
  return name || athlete?.username || null;
}
