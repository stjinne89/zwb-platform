// intervals.icu API helpers — Basic Auth met username=API_KEY, password=API_KEY.
// Documentatie: https://intervals.icu/api-docs.html

import { decryptSecret } from "@/lib/crypto/secrets";
import {
  normalizePowerCurvePoints,
  type IntervalsPowerCurvePoint,
} from "@/lib/intervals/power-curve";

export type { IntervalsPowerCurvePoint } from "@/lib/intervals/power-curve";

const BASE = "https://intervals.icu";

function authHeader(apiKey: string): string {
  // De api_key kan versleuteld uit de DB komen; hier centraal ontsleutelen zodat
  // álle intervals-aanroepen gedekt zijn ongeacht waar de key is opgehaald.
  const credentials = `API_KEY:${decryptSecret(apiKey)}`;
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

async function intervalsFetchFirst<T>(
  apiKey: string,
  paths: string[],
): Promise<T> {
  const errors: string[] = [];
  for (const path of paths) {
    try {
      return await intervalsFetch<T>(apiKey, path);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Onbekende Intervals-fout.");
    }
  }
  throw new Error(errors[errors.length - 1] ?? "intervals.icu gaf geen bruikbaar antwoord.");
}

export type IntervalsAthlete = {
  id: string; // "i12345"
  name?: string;
  email?: string;
  ftp?: number;
  weight?: number;
  sportSettings?: Array<{
    ftp?: number;
    indoor_ftp?: number;
    weight?: number;
    types?: string[];
    mmp_model?: {
      ftp?: number;
      p_max?: number;
    };
  }>;
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
  workout_doc?: Record<string, unknown> & { duration?: number; tss?: number };
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

export type IntervalsPowerCurve = {
  period: string;
  points: IntervalsPowerCurvePoint[];
  ftpWatts?: number | null;
  debug?: string;
};

type PowerCurveActivityMeta = {
  id?: string;
  start_date_local?: string;
  icu_weight?: number;
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

function numericField(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function stringField(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function collectPowerCurveActivities(value: unknown) {
  const out = new Map<string, PowerCurveActivityMeta>();
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  const activities = (value as Record<string, unknown>).activities;
  if (!activities || typeof activities !== "object" || Array.isArray(activities)) return out;

  for (const [key, activity] of Object.entries(activities)) {
    if (!activity || typeof activity !== "object" || Array.isArray(activity)) continue;
    const row = activity as Record<string, unknown>;
    const id = stringField(row.id) ?? key;
    out.set(id, {
      id,
      start_date_local: stringField(row.start_date_local) ?? undefined,
      icu_weight: numericField(row, ["icu_weight", "weight"]) ?? undefined,
    });
  }
  return out;
}

function activityMeta(
  activities: Map<string, PowerCurveActivityMeta>,
  id: string | null,
) {
  return id ? activities.get(id) ?? null : null;
}

function collectPowerCurvePoints(
  value: unknown,
  out: IntervalsPowerCurvePoint[],
  activities: Map<string, PowerCurveActivityMeta>,
  depth = 0,
) {
  if (depth > 8) return;
  if (Array.isArray(value)) {
    if (
      value.length === 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number" &&
      value[0] > 0 &&
      value[1] > 0
    ) {
      out.push({ seconds: Math.round(value[0]), watts: Math.round(value[1]) });
      return;
    }
    for (const item of value) collectPowerCurvePoints(item, out, activities, depth + 1);
    return;
  }

  if (!value || typeof value !== "object") return;
  const row = value as Record<string, unknown>;
  const secondsArray = row.seconds ?? row.secs ?? row.duration ?? row.x;
  const wattsArray = row.watts ?? row.power ?? row.y ?? row.values;
  const wkgArray = row.watts_per_kg ?? row.wkg ?? row.power_per_kg;
  const activityIds = row.activity_id ?? row.activity_ids;
  const wkgActivityIds = row.wkg_activity_id ?? row.wkg_activity_ids;
  const consumedArrays = new Set<unknown>();
  if (Array.isArray(secondsArray) && Array.isArray(wattsArray)) {
    consumedArrays.add(secondsArray);
    consumedArrays.add(wattsArray);
    if (Array.isArray(wkgArray)) consumedArrays.add(wkgArray);
    if (Array.isArray(activityIds)) consumedArrays.add(activityIds);
    if (Array.isArray(wkgActivityIds)) consumedArrays.add(wkgActivityIds);
    const count = Math.min(secondsArray.length, wattsArray.length);
    for (let i = 0; i < count; i += 1) {
      const seconds = Number(secondsArray[i]);
      const watts = Number(wattsArray[i]);
      if (Number.isFinite(seconds) && seconds > 0 && Number.isFinite(watts) && watts > 0) {
        const activityId = Array.isArray(activityIds) ? stringField(activityIds[i]) : null;
        const wkgActivityId = Array.isArray(wkgActivityIds)
          ? stringField(wkgActivityIds[i])
          : null;
        const powerActivity = activityMeta(activities, activityId);
        const wkgActivity = activityMeta(activities, wkgActivityId);
        out.push({
          seconds: Math.round(seconds),
          watts: Math.round(watts),
          wattsPerKg: Array.isArray(wkgArray) ? Number(wkgArray[i]) : null,
          activityId,
          activityDate: powerActivity?.start_date_local ?? null,
          weightKg: powerActivity?.icu_weight ?? null,
          wkgActivityId,
          wkgActivityDate: wkgActivity?.start_date_local ?? null,
          wkgWeightKg: wkgActivity?.icu_weight ?? null,
        });
      }
    }
  }

  const seconds = numericField(row, [
    "seconds",
    "secs",
    "duration",
    "duration_secs",
    "duration_seconds",
    "time",
    "x",
  ]);
  const watts = numericField(row, [
    "watts",
    "power",
    "mmp",
    "value",
    "y",
    "avg_watts",
    "average_watts",
  ]);
  const wattsPerKg = numericField(row, [
    "watts_per_kg",
    "wkg",
    "power_per_kg",
  ]);

  if (seconds && watts) {
    out.push({
      seconds: Math.round(seconds),
      watts: Math.round(watts),
      wattsPerKg,
    });
  }

  for (const nested of Object.values(row)) {
    if (consumedArrays.has(nested)) continue;
    if (nested && (Array.isArray(nested) || typeof nested === "object")) {
      collectPowerCurvePoints(nested, out, activities, depth + 1);
    }
  }
}

function nearestPower(points: IntervalsPowerCurvePoint[], seconds: number) {
  let best: IntervalsPowerCurvePoint | null = null;
  for (const point of points) {
    if (!best || Math.abs(point.seconds - seconds) < Math.abs(best.seconds - seconds)) {
      best = point;
    }
  }
  return best && Math.abs(best.seconds - seconds) <= Math.max(3, seconds * 0.12)
    ? best.watts
    : null;
}

/** Power-duration curve voor race-roosters. Standaard: laatste 90 dagen Ride. */
export async function fetchIntervalsPowerCurve(
  apiKey: string,
  athleteId: string,
  period = "90d",
): Promise<IntervalsPowerCurve> {
  const now = new Date().toISOString().slice(0, 10);
  const query = new URLSearchParams({
    curves: period,
    type: "Ride",
    includeRanks: "false",
    now,
  });
  const payload = await intervalsFetchFirst<unknown>(
    apiKey,
    [
      `/api/v1/athlete/0/power-curves?${query.toString()}`,
      `/api/athlete/0/power-curves?${query.toString()}`,
      `/api/v1/athlete/${athleteId}/power-curves?${query.toString()}`,
      `/api/athlete/${athleteId}/power-curves?${query.toString()}`,
    ],
  );
  const points: IntervalsPowerCurvePoint[] = [];
  collectPowerCurvePoints(payload, points, collectPowerCurveActivities(payload));

  const deduped = normalizePowerCurvePoints(points);

  const maybe = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const debug = Array.isArray(payload)
    ? `array(${payload.length})`
    : payload && typeof payload === "object"
      ? `object keys: ${Object.keys(payload as Record<string, unknown>).slice(0, 12).join(", ")}`
      : typeof payload;
  const ftpWatts =
    numericField(maybe, ["ftp", "eftp", "icu_ftp"]) ??
    nearestPower(deduped, 1200);

  return { period, points: deduped, ftpWatts, debug };
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
