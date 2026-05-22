// intervals.icu API helpers — Basic Auth met username=API_KEY, password=API_KEY.
// Documentatie: https://intervals.icu/api-docs.html

const BASE = "https://intervals.icu";

function authHeader(apiKey: string): string {
  const credentials = `API_KEY:${apiKey}`;
  // Buffer is beschikbaar in Node runtime (Next.js server). Geen client-side use.
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

async function intervalsFetch<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: authHeader(apiKey),
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(
        "intervals.icu API-key wordt afgewezen. Controleer of je de juiste key gebruikt vanaf https://intervals.icu/settings#api",
      );
    }
    const text = await res.text();
    throw new Error(`intervals.icu ${res.status}: ${text.slice(0, 160)}`);
  }
  return (await res.json()) as T;
}

export type IntervalsAthlete = {
  id: string; // "i12345"
  name?: string;
  email?: string;
  ftp?: number;
};

export type IntervalsActivity = {
  id: string;
  name?: string;
  start_date_local?: string;
  type?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  total_elevation_gain?: number;
  icu_training_load?: number; // TSS
  icu_ftp?: number;
  icu_intensity?: number;
  average_watts?: number;
  weighted_average_watts?: number;
};

export type IntervalsWellness = {
  id: string; // date "YYYY-MM-DD"
  ctl?: number; // chronic load = fitness
  atl?: number; // acute load = fatigue
  ramp_rate?: number;
  ctl_load?: number;
  atl_load?: number;
  weight?: number;
  eftp?: number;
};

export type IntervalsEvent = {
  id: number | string;
  start_date_local: string;
  name?: string;
  description?: string;
  type?: string;
  category?: string;
  workout_doc?: { duration?: number; tss?: number };
  icu_training_load?: number;
  load_target?: number;
  moving_time?: number;
};

/** Haalt athlete-info voor de eigenaar van de API-key. */
export async function fetchIntervalsAthlete(apiKey: string): Promise<IntervalsAthlete> {
  // "0" is een magic value: betekent "de athlete bij wie deze API-key hoort"
  return intervalsFetch<IntervalsAthlete>(apiKey, "/api/v1/athlete/0");
}

/** Wellness-records (CTL/ATL/eFTP) over de laatste N dagen. */
export async function fetchIntervalsWellness(
  apiKey: string,
  athleteId: string,
  days = 90,
): Promise<IntervalsWellness[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const oldest = start.toISOString().slice(0, 10);
  const newest = end.toISOString().slice(0, 10);
  return intervalsFetch<IntervalsWellness[]>(
    apiKey,
    `/api/v1/athlete/${athleteId}/wellness?oldest=${oldest}&newest=${newest}`,
  );
}

/** Activiteiten van de laatste N dagen, oldest first. */
export async function fetchIntervalsActivities(
  apiKey: string,
  athleteId: string,
  days = 14,
): Promise<IntervalsActivity[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const oldest = start.toISOString().slice(0, 10);
  const newest = end.toISOString().slice(0, 10);
  return intervalsFetch<IntervalsActivity[]>(
    apiKey,
    `/api/v1/athlete/${athleteId}/activities?oldest=${oldest}&newest=${newest}`,
  );
}

/** Geplande events (workouts/races) voor de komende N dagen. */
export async function fetchIntervalsEvents(
  apiKey: string,
  athleteId: string,
  daysAhead = 14,
): Promise<IntervalsEvent[]> {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);
  const oldest = start.toISOString().slice(0, 10);
  const newest = end.toISOString().slice(0, 10);
  return intervalsFetch<IntervalsEvent[]>(
    apiKey,
    `/api/v1/athlete/${athleteId}/events?oldest=${oldest}&newest=${newest}`,
  );
}
