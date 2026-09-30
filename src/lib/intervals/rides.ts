// Ritten uit intervals.icu als ritbron voor leden zonder Strava-koppeling.
//
// Een rit landt in strava_activities, net als een GPX- of CSV-import: met een
// negatief id en raw.import_source, zodat alle bestaande lezers (badges, stats,
// naleving, cols, ZWBlokken) hem zonder wijziging meetellen. Waarom niet een
// eigen tabel: zie PLAN.md, ronde "Ritten via intervals.icu" (2026-09-30).
//
// Alles hier is puur: geen database, geen fetch.
//
// De veldnamen van intervals.icu zijn nog niet tegen een echte rit gecontroleerd
// (scripts/intervals-probe.mjs). Waar de naam onzeker is, proberen we de bekende
// varianten.

import polyline from "@mapbox/polyline";
import { kilojoulesFromActivity } from "@/lib/intervals/activities";
import type { IntervalsActivity } from "@/lib/intervals/client";
import { weekStartDate } from "@/lib/strava/client";
import { syntheticAthleteId } from "@/lib/strava/import";
import { CYCLING_SPORTS, isCyclingSportType } from "@/lib/strava/sports";

export const INTERVALS_IMPORT_SOURCE = "intervals";

/**
 * Ondergrens van de id-reeks. CSV- en GPX-imports krijgen een 32-bits hash
 * (tussen −(2³²−1) en 0), echte Strava-ritten een positief id.
 */
const INTERVALS_ID_OFFSET = 1_000_000_000_000;

/** Hoeveel punten het opgeslagen spoor hooguit heeft. */
export const TRACK_MAX_POINTS = 500;

/** Wat intervals.icu over een activiteit teruggeeft; ruimer dan IntervalsActivity. */
export type IntervalsRideInput = IntervalsActivity & {
  source?: string | null;
  _note?: string | null;
  start_date?: string | null;
  timezone?: string | null;
  trainer?: boolean | null;
  commute?: boolean | null;
  device_name?: string | null;
  external_id?: string | null;
  device_watts?: boolean | null;
  max_watts?: number | null;
  icu_average_watts?: number | null;
  icu_weighted_avg_watts?: number | null;
  icu_elevation_gain?: number | null;
};

export type RideSource = "strava" | "intervals" | "none";

/** Een lid met een actieve Strava-koppeling krijgt nooit intervals-ritten. */
export function rideSourceFor(opts: {
  hasActiveStrava: boolean;
  hasIntervals: boolean;
}): RideSource {
  if (opts.hasActiveStrava) return "strava";
  return opts.hasIntervals ? "intervals" : "none";
}

/** Negatief, omkeerbaar id; null als het intervals-id niet numeriek is. */
export function intervalsRideId(intervalsId: string | number | null | undefined): number | null {
  const match = String(intervalsId ?? "").trim().match(/^i?(\d{1,12})$/);
  if (!match) return null;
  return -(INTERVALS_ID_OFFSET + Number(match[1]));
}

export function isIntervalsRideId(id: number | string | null | undefined): boolean {
  const n = Number(id);
  return Number.isFinite(n) && n <= -INTERVALS_ID_OFFSET;
}

function positive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function firstPositive(...values: unknown[]): number | null {
  for (const value of values) {
    const n = positive(value);
    if (n != null) return n;
  }
  return null;
}

/** Een rit die intervals.icu via Strava kreeg, geeft via de API alleen een stub. */
export function isStravaStub(activity: IntervalsRideInput): boolean {
  return (
    String(activity.source ?? "").toUpperCase() === "STRAVA" ||
    Boolean(activity._note)
  );
}

export function isUsableIntervalsRide(activity: IntervalsRideInput): boolean {
  if (!activity?.id || isStravaStub(activity)) return false;
  if (!isCyclingSportType(activity.type)) return false;
  if (!activity.start_date_local && !activity.start_date) return false;
  return positive(activity.distance) != null || positive(activity.moving_time) != null;
}

/** Strava-naam voor het type; onbekende fietstypes tellen als Ride. */
function sportTypeFor(activity: IntervalsRideInput): string {
  const type = String(activity.type ?? "");
  if (CYCLING_SPORTS.includes(type)) return type;
  return /virtual/i.test(type) ? "VirtualRide" : "Ride";
}

/** "2026-09-28T08:03:12" → "2026-09-28T08:03:12", zonder offset of milliseconden. */
function naiveLocal(value: string): string | null {
  const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
  return match ? match[1] : null;
}

/** Hoeveel minuten `timeZone` op dat moment voor UTC ligt. */
function zoneOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - utcMs) / 60000);
}

/**
 * Starttijd in UTC. intervals.icu geeft `start_date` (UTC) naast
 * `start_date_local`; ontbreekt de eerste, dan rekenen we terug via de tijdzone
 * van de rit, en anders via die van de club.
 */
export function startInstant(activity: IntervalsRideInput): Date | null {
  if (activity.start_date) {
    const date = new Date(activity.start_date);
    if (Number.isFinite(date.getTime())) return date;
  }
  const local = naiveLocal(String(activity.start_date_local ?? ""));
  if (!local) return null;
  const asUtc = Date.parse(`${local}Z`);
  let zone = activity.timezone?.trim() || "Europe/Amsterdam";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
  } catch {
    zone = "Europe/Amsterdam";
  }
  const guess = asUtc - zoneOffsetMinutes(asUtc, zone) * 60000;
  return new Date(asUtc - zoneOffsetMinutes(guess, zone) * 60000);
}

/**
 * Lokale starttijd zoals Strava hem opslaat: de wandkloktijd met een `Z`
 * erachter. De badge-evaluators lezen het uur met getUTCHours
 * (achievements/milestone-evaluators.ts); zonder `Z` zou JavaScript de tijd als
 * lokale tijd van de server lezen.
 */
export function startLocalStravaStyle(activity: IntervalsRideInput, start: Date): string {
  const local = naiveLocal(String(activity.start_date_local ?? ""));
  if (local) return `${local}Z`;
  const zone = activity.timezone?.trim() || "Europe/Amsterdam";
  try {
    const shifted = new Date(start.getTime() + zoneOffsetMinutes(start.getTime(), zone) * 60000);
    return `${shifted.toISOString().slice(0, 19)}Z`;
  } catch {
    return `${start.toISOString().slice(0, 19)}Z`;
  }
}

export type LatLng = [number, number];

function validPoint(lat: unknown, lng: unknown): LatLng | null {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  if (a === 0 && b === 0) return null;
  return [a, b];
}

/**
 * Het spoor uit de streams-respons. Drie vormen komen voor of zijn denkbaar:
 * één `latlng`-stream met `data` (breedte) en `data2` (lengte); één stream met
 * paren; of losse `lat`- en `lng`-streams.
 */
export function latLngFromStreams(body: unknown): LatLng[] {
  const list: Array<Record<string, unknown>> = Array.isArray(body)
    ? (body as Array<Record<string, unknown>>)
    : body && typeof body === "object"
      ? Object.entries(body as Record<string, unknown>).map(([type, data]) => ({ type, data }))
      : [];
  const byType = new Map(list.map((stream) => [String(stream.type), stream]));

  const latlng = byType.get("latlng");
  if (latlng && Array.isArray(latlng.data)) {
    const data = latlng.data as unknown[];
    if (Array.isArray(latlng.data2)) {
      const data2 = latlng.data2 as unknown[];
      return data.flatMap((lat, i) => {
        const point = validPoint(lat, data2[i]);
        return point ? [point] : [];
      });
    }
    return data.flatMap((pair) => {
      const point = Array.isArray(pair) ? validPoint(pair[0], pair[1]) : null;
      return point ? [point] : [];
    });
  }

  const lat = byType.get("lat");
  const lng = byType.get("lng") ?? byType.get("lon");
  if (lat && lng && Array.isArray(lat.data) && Array.isArray(lng.data)) {
    const lngs = lng.data as unknown[];
    return (lat.data as unknown[]).flatMap((value, i) => {
      const point = validPoint(value, lngs[i]);
      return point ? [point] : [];
    });
  }
  return [];
}

/**
 * Uitgedund en gecodeerd, als Strava's summary_polyline. De col-detector meet de
 * afstand tot het lijnstuk tussen twee punten, dus uitdunnen mist geen top.
 */
export function encodeTrackPolyline(points: LatLng[], maxPoints = TRACK_MAX_POINTS): string | null {
  if (points.length < 2) return null;
  const stride = Math.max(1, Math.ceil(points.length / maxPoints));
  const kept = points.filter((_, i) => i % stride === 0);
  const last = points[points.length - 1];
  if (kept[kept.length - 1] !== last) kept.push(last);
  return polyline.encode(kept);
}

export type IntervalsRideRow = {
  id: number;
  profile_id: string;
  strava_athlete_id: number;
  name: string;
  sport_type: string;
  start_date: string;
  achievement_week: string;
  distance_m: number;
  total_elevation_gain_m: number;
  kudos_count: number;
  moving_time_seconds: number;
  elapsed_time_seconds: number;
  trainer: boolean;
  commute: boolean;
  raw: Record<string, unknown>;
  synced_at: string;
  efforts_fetched_at: string;
};

/**
 * Een intervals-activiteit als rij in strava_activities.
 *
 * `raw` is een allow-list met Strava-veldnamen. Iedereen die ingelogd is kan
 * `raw` lezen (RLS in 0010), dus FTP, gewicht en belasting (icu_*) komen hier
 * bewust niet in; die staan in intervals_activities, dat alleen het lid en zijn
 * trainer zien.
 *
 * `efforts_fetched_at` staat meteen gezet: anders pakt de segment-inhaalslag de
 * rij op, vraagt hem bij Strava op en verwijdert hem na de 404.
 */
export function intervalsActivityToRideRow(
  profileId: string,
  activity: IntervalsRideInput,
  opts: { summaryPolyline?: string | null; now?: Date } = {},
): IntervalsRideRow | null {
  if (!isUsableIntervalsRide(activity)) return null;
  const id = intervalsRideId(activity.id);
  const start = startInstant(activity);
  if (id == null || !start) return null;

  const now = (opts.now ?? new Date()).toISOString();
  const sportType = sportTypeFor(activity);
  const movingTime = Math.round(positive(activity.moving_time) ?? positive(activity.elapsed_time) ?? 0);
  const elapsedTime = Math.round(positive(activity.elapsed_time) ?? movingTime);
  const distance = Math.round(positive(activity.distance) ?? 0);
  const elevation = Math.round(
    firstPositive(activity.total_elevation_gain, activity.icu_elevation_gain) ?? 0,
  );
  const averageWatts = firstPositive(activity.average_watts, activity.icu_average_watts);
  const weightedWatts = firstPositive(
    activity.icu_weighted_avg_watts,
    activity.weighted_average_watts,
  );
  // Zonder vermogensmeter heeft een rit bij intervals.icu geen gemiddeld
  // vermogen. Pas als het veld expliciet false is, geloven we dat.
  const deviceWatts = activity.device_watts ?? averageWatts != null;
  const name = activity.name?.trim() || (sportType === "VirtualRide" ? "Virtuele rit" : "Rit");
  const trainer = Boolean(activity.trainer) || sportType === "VirtualRide";
  const startIso = start.toISOString();

  const raw: Record<string, unknown> = {
    import_source: INTERVALS_IMPORT_SOURCE,
    intervals_id: String(activity.id),
    source: activity.source ?? null,
    device_name: activity.device_name ?? null,
    external_id: activity.external_id ?? null,
    name,
    type: sportType,
    sport_type: sportType,
    start_date: startIso,
    start_date_local: startLocalStravaStyle(activity, start),
    timezone: activity.timezone ?? null,
    moving_time: movingTime,
    elapsed_time: elapsedTime,
    distance,
    total_elevation_gain: elevation,
    trainer,
    average_watts: averageWatts,
    weighted_average_watts: weightedWatts,
    device_watts: deviceWatts,
    max_watts: positive(activity.max_watts),
    kilojoules: kilojoulesFromActivity(activity),
    average_heartrate: positive(activity.average_heartrate),
    max_heartrate: positive(activity.max_heartrate),
    average_cadence: positive(activity.average_cadence),
    map: { summary_polyline: opts.summaryPolyline ?? null },
  };

  return {
    id,
    profile_id: profileId,
    strava_athlete_id: syntheticAthleteId(profileId),
    name,
    sport_type: sportType,
    start_date: startIso,
    achievement_week: weekStartDate(start).toISOString().slice(0, 10),
    distance_m: distance,
    total_elevation_gain_m: elevation,
    kudos_count: 0,
    moving_time_seconds: movingTime,
    elapsed_time_seconds: elapsedTime,
    trainer,
    commute: Boolean(activity.commute),
    raw,
    synced_at: now,
    efforts_fetched_at: now,
  };
}

/** Wat dedupeRides van een rit nodig heeft. */
export type RideFingerprint = {
  id: number;
  start_date: string;
  distance_m: number | string | null;
  raw?: unknown;
};

const SAME_START_MS = 120_000;
const SAME_DISTANCE = 0.05;
const SHORT_RIDE_M = 1_000;

export function isSameRide(a: RideFingerprint, b: RideFingerprint): boolean {
  const startA = Date.parse(a.start_date);
  const startB = Date.parse(b.start_date);
  if (!Number.isFinite(startA) || !Number.isFinite(startB)) return false;
  if (Math.abs(startA - startB) > SAME_START_MS) return false;
  const distA = Number(a.distance_m) || 0;
  const distB = Number(b.distance_m) || 0;
  if (distA < SHORT_RIDE_M && distB < SHORT_RIDE_M) return true;
  return Math.abs(distA - distB) / Math.max(distA, distB) <= SAME_DISTANCE;
}

/** Vermogen telt zwaarder dan een spoor: een Zwift-rit wint van het trainerbestand. */
function richness(ride: RideFingerprint): number {
  const raw = (ride.raw && typeof ride.raw === "object" ? ride.raw : {}) as Record<string, unknown>;
  const map = (raw.map && typeof raw.map === "object" ? raw.map : {}) as Record<string, unknown>;
  const hasPower = raw.device_watts === true && positive(raw.average_watts) != null;
  const hasTrack = typeof map.summary_polyline === "string" && map.summary_polyline.length > 0;
  return (hasPower ? 2 : 0) + (hasTrack ? 1 : 0);
}

/**
 * Welke binnenkomende ritten opgeslagen mogen worden.
 *
 * - Een rit met hetzelfde id als een bestaande rij blijft: dat is een update.
 * - Een rit die al onder een ander id bestaat (een CSV- of GPX-import, of
 *   dezelfde trainerrit van een tweede toestel) wordt overgeslagen.
 * - Twee binnenkomende ritten die dezelfde zijn: de rijkste blijft.
 */
export function dedupeRides<T extends RideFingerprint>(
  incoming: T[],
  existing: RideFingerprint[],
): { keep: T[]; skipped: T[] } {
  const keep: T[] = [];
  const skipped: T[] = [];
  const sorted = [...incoming].sort((a, b) => richness(b) - richness(a) || b.id - a.id);

  for (const ride of sorted) {
    const clash =
      existing.some((row) => row.id !== ride.id && isSameRide(row, ride)) ||
      keep.some((row) => isSameRide(row, ride));
    if (clash) skipped.push(ride);
    else keep.push(ride);
  }
  return { keep, skipped };
}
