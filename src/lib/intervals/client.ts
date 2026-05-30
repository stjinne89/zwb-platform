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
  // Herstel-velden (alleen gevuld als de athlete ze logt/synct in intervals.icu).
  restingHR?: number | null;
  hrv?: number | null; // rMSSD
  hrvSDNN?: number | null;
  sleepSecs?: number | null;
  sleepScore?: number | null;
  readiness?: number | null;
  fatigue?: number | null;
  stress?: number | null;
  soreness?: number | null;
  mood?: number | null;
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
  workout_filename?: string;
  workout_file_base64?: string;
  external_id?: string;
};

export type IntervalsWorkoutInput = {
  id?: string | null;
  externalId?: string | null;
  startDateLocal: string;
  name: string;
  description?: string | null;
  category?: string | null;
  type?: string | null;
  target?: string | null;
  trainingLoad?: number | null;
  durationMinutes?: number | null;
  workoutDoc?: Record<string, unknown> | null;
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

/** Maakt of wijzigt een gepland workout-event in intervals.icu. */
export async function upsertIntervalsWorkoutEvent(
  apiKey: string,
  athleteId: string,
  workout: IntervalsWorkoutInput,
): Promise<IntervalsEvent> {
  const payload = {
    start_date_local: workout.startDateLocal,
    name: workout.name,
    description: workout.description ?? undefined,
    category: workout.category ?? "WORKOUT",
    type: workout.type ?? "Ride",
    target: workout.target ?? "POWER",
    external_id: workout.externalId ?? undefined,
    icu_training_load: workout.trainingLoad ?? undefined,
    moving_time: workout.durationMinutes ? workout.durationMinutes * 60 : undefined,
    workout_doc: workout.workoutDoc ?? undefined,
  };
  if (!workout.id && workout.externalId) {
    const res = await fetch(`${BASE}/api/v1/athlete/${athleteId}/events/bulk?upsert=true`, {
      method: "POST",
      headers: {
        Authorization: authHeader(apiKey),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify([payload]),
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error("intervals.icu API-key wordt afgewezen.");
      const text = await res.text();
      throw new Error(`intervals.icu ${res.status}: ${text.slice(0, 160)}`);
    }
    const events = (await res.json()) as IntervalsEvent[];
    if (!events[0]) throw new Error("intervals.icu gaf geen workout terug.");
    return events[0];
  }

  const path = workout.id
    ? `/api/v1/athlete/${athleteId}/events/${workout.id}`
    : `/api/v1/athlete/${athleteId}/events`;
  const res = await fetch(`${BASE}${path}`, {
    method: workout.id ? "PUT" : "POST",
    headers: {
      Authorization: authHeader(apiKey),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("intervals.icu API-key wordt afgewezen.");
    }
    const text = await res.text();
    throw new Error(`intervals.icu ${res.status}: ${text.slice(0, 160)}`);
  }
  return (await res.json()) as IntervalsEvent;
}

export async function fetchIntervalsWorkoutFit(
  apiKey: string,
  athleteId: string,
  eventId: string,
  date: string,
): Promise<{ filename: string; bytes: Uint8Array }> {
  // De FIT komt alleen via de events-lijst met ext=fit (workout_file_base64).
  // `resolve=true` zet %FTP om naar watts; dat is de meest waarschijnlijke
  // oorzaak van de 500 (bv. geen FTP ingesteld). FIT ondersteunt relatieve
  // targets, dus we proberen eerst ZONDER resolve en pas daarna mét.
  async function attempt(resolve: boolean): Promise<IntervalsEvent | null> {
    const query = new URLSearchParams({
      oldest: date,
      newest: date,
      category: "WORKOUT",
      ext: "fit",
    });
    if (resolve) query.set("resolve", "true");
    let events: IntervalsEvent[];
    try {
      events = await intervalsFetch<IntervalsEvent[]>(
        apiKey,
        `/api/v1/athlete/${athleteId}/events?${query.toString()}`,
      );
    } catch {
      return null; // 5xx of netwerk → val terug op de andere modus
    }
    const event = events.find((row) => String(row.id) === String(eventId));
    return event?.workout_file_base64 ? event : null;
  }

  const event = (await attempt(false)) ?? (await attempt(true));
  if (!event?.workout_file_base64) {
    throw new Error(
      "intervals.icu gaf geen FIT-bestand terug. Controleer of de renner een FTP heeft ingesteld in intervals.icu, of open de workout daar direct.",
    );
  }
  return {
    filename: event.workout_filename ?? `${event.name ?? "zwb-workout"}.fit`,
    bytes: Uint8Array.from(Buffer.from(event.workout_file_base64, "base64")),
  };
}
