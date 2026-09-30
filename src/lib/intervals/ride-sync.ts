// Ritten ophalen bij intervals.icu voor leden zonder Strava-koppeling.
//
// Draait per lid vanuit de uurlijkse cron (/api/intervals/rides/sync) of de knop
// "Ritten ophalen". Eén lijst-call vult zowel intervals_activities (belasting,
// zoals altijd) als strava_activities (badges, stats, cols, ZWBlokken,
// naleving); zie lib/intervals/rides.ts voor de vorm van die rijen.
//
// Het nawerk is dat van het Strava-pad, minus alles wat Strava belt: dezelfde
// runPostSyncForProfile, zonder token.

import { awardCompletedAchievementWeeks } from "@/lib/achievements/awards";
import { syncIntervalsActivities } from "@/lib/intervals/activities";
import { fetchIntervalsActivityTrack } from "@/lib/intervals/client";
import {
  dedupeRides,
  encodeTrackPolyline,
  INTERVALS_IMPORT_SOURCE,
  intervalsActivityToRideRow,
  intervalsRideId,
  latLngFromStreams,
  rideRowChanged,
  timedTrackFromStreams,
  rideSourceFor,
  type IntervalsRideInput,
  type IntervalsRideRow,
  type RideFingerprint,
} from "@/lib/intervals/rides";
import { visitPushDue } from "@/lib/intervals/visit-reminder";
import { sendNotificationToMembers } from "@/lib/push/send";
import { runPostSyncForProfile } from "@/lib/strava/post-sync";
import type { TimedPoint } from "@/lib/segments/gps-efforts";
import { storeGpsEfforts } from "@/lib/segments/gps-sync";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

/** De eerste run haalt een jaar op; daarna kijkt elke run 30 dagen terug. */
export const FIRST_SYNC_DAYS = 365;
export const SYNC_WINDOW_DAYS = 30;
/** Sporen per lid per run; de volgende run haalt de rest in. */
export const MAX_TRACKS_PER_RUN = 5;

export type IntervalsRideConnection = {
  profile_id: string;
  athlete_id: string;
  api_key: string;
  rides_backfilled_at: string | null;
  created_at?: string | null;
  visit_confirmed_at?: string | null;
  visit_reminded_at?: string | null;
};

export type RideSyncResult = {
  profileId: string;
  fetched: number;
  stored: number;
  duplicates: number;
  removed: number;
  tracks: number;
  error?: string;
};

type ExistingRow = RideFingerprint & {
  raw: Record<string, unknown> | null;
  name: string | null;
  sport_type: string | null;
  total_elevation_gain_m: number | string | null;
  moving_time_seconds: number | null;
  trainer: boolean | null;
  commute: boolean | null;
};

const EXISTING_COLUMNS =
  "id, name, sport_type, start_date, distance_m, total_elevation_gain_m, moving_time_seconds, trainer, commute, raw";

function existingTrack(row: ExistingRow | undefined): {
  polyline: string | null;
  checked: boolean;
} {
  const raw = row?.raw ?? {};
  const map = (raw.map && typeof raw.map === "object" ? raw.map : {}) as Record<string, unknown>;
  const polyline = typeof map.summary_polyline === "string" ? map.summary_polyline : null;
  return { polyline, checked: Boolean(polyline) || Boolean(raw.track_checked_at) };
}

/**
 * Welke leden hun ritten via intervals.icu krijgen: een intervals-koppeling en
 * geen Strava-koppeling (ook geen ingetrokken die nog op opruiming wacht). Gesorteerd op wie het langst niet aan de beurt
 * was.
 */
export async function loadIntervalsRideConnections(
  admin: Admin,
): Promise<IntervalsRideConnection[]> {
  const [connections, strava] = await Promise.all([
    admin
      .from("intervals_connections")
      .select(
        "profile_id, athlete_id, api_key, rides_backfilled_at, last_synced_at, created_at, visit_confirmed_at, visit_reminded_at",
      )
      .not("athlete_id", "is", null)
      .order("last_synced_at", { ascending: true, nullsFirst: true }),
    admin.from("strava_connections").select("profile_id"),
  ]);
  if (connections.error) throw new Error(connections.error.message);
  if (strava.error) throw new Error(strava.error.message);
  const withStrava = new Set(
    ((strava.data ?? []) as { profile_id: string }[]).map((row) => row.profile_id),
  );
  return ((connections.data ?? []) as IntervalsRideConnection[]).filter(
    (row) =>
      rideSourceFor({
        hasStravaConnection: withStrava.has(row.profile_id),
        hasIntervals: true,
      }) === "intervals",
  );
}

/** Of dit lid nu zijn ritten via intervals.icu krijgt. */
export async function intervalsRideSourceFor(
  admin: Admin,
  profileId: string,
): Promise<IntervalsRideConnection | null> {
  const [connection, strava] = await Promise.all([
    admin
      .from("intervals_connections")
      .select("profile_id, athlete_id, api_key, rides_backfilled_at")
      .eq("profile_id", profileId)
      .maybeSingle(),
    admin
      .from("strava_connections")
      .select("profile_id")
      .eq("profile_id", profileId)
      .maybeSingle(),
  ]);
  const row = connection.data as IntervalsRideConnection | null;
  if (!row?.athlete_id) return null;
  return rideSourceFor({ hasStravaConnection: Boolean(strava.data), hasIntervals: true }) ===
    "intervals"
    ? row
    : null;
}

export async function syncIntervalsRidesForProfile(
  admin: Admin,
  connection: IntervalsRideConnection,
  opts: { now?: Date; maxTracks?: number } = {},
): Promise<RideSyncResult> {
  const now = opts.now ?? new Date();
  const profileId = connection.profile_id;
  const firstRun = !connection.rides_backfilled_at;
  const days = firstRun ? FIRST_SYNC_DAYS : SYNC_WINDOW_DAYS;
  const result: RideSyncResult = {
    profileId,
    fetched: 0,
    stored: 0,
    duplicates: 0,
    removed: 0,
    tracks: 0,
  };

  try {
    const { activities } = await syncIntervalsActivities(admin, connection, days);
    const list = (activities ?? []) as IntervalsRideInput[];
    result.fetched = list.length;

    // intervals.icu filtert op datum; een dag marge houdt de randen buiten de
    // verwijderregel hieronder.
    const windowStart = new Date(now.getTime() - (days - 1) * 86400_000).toISOString();
    const { data: existingData, error: existingError } = await admin
      .from("strava_activities")
      .select(EXISTING_COLUMNS)
      .eq("profile_id", profileId)
      .gte("start_date", windowStart);
    if (existingError) throw new Error(existingError.message);
    const existing = (existingData ?? []) as ExistingRow[];
    const existingById = new Map(existing.map((row) => [Number(row.id), row]));

    const candidates = list.flatMap((activity) => {
      const known = existingById.get(intervalsRideId(activity.id) ?? 0);
      const track = existingTrack(known);
      const row = intervalsActivityToRideRow(profileId, activity, {
        summaryPolyline: track.polyline,
        now,
      });
      if (!row) return [];
      if (track.checked) row.raw.track_checked_at = known?.raw?.track_checked_at ?? now.toISOString();
      // Eigen coltijden zonder segment (gps-sync.ts) staan in raw; de rij wordt
      // hier opnieuw opgebouwd, dus meenemen.
      if (known?.raw?.gps_col_times) row.raw.gps_col_times = known.raw.gps_col_times;
      return [row];
    });

    const { keep, skipped } = dedupeRides<IntervalsRideRow>(candidates, existing);
    result.duplicates = skipped.length;

    // Spoor ophalen voor ritten die er nog geen hebben. Een trainerrit zonder
    // GPS heeft er nooit een; track_checked_at voorkomt dat we elke run opnieuw
    // vragen.
    const withNewTrack: number[] = [];
    const timedTracks: Array<{ id: number; points: TimedPoint[] }> = [];
    const maxTracks = opts.maxTracks ?? MAX_TRACKS_PER_RUN;
    for (const row of keep) {
      if (result.tracks >= maxTracks) break;
      if (row.raw.track_checked_at) continue;
      result.tracks += 1;
      try {
        const body = await fetchIntervalsActivityTrack(
          connection.api_key,
          String(row.raw.intervals_id),
        );
        const encoded = encodeTrackPolyline(latLngFromStreams(body));
        row.raw.map = { summary_polyline: encoded };
        row.raw.track_checked_at = now.toISOString();
        if (encoded) withNewTrack.push(row.id);
        const points = timedTrackFromStreams(body, Date.parse(row.start_date));
        if (points.length >= 2) timedTracks.push({ id: row.id, points });
      } catch {
        // Volgende run opnieuw; de rit zelf telt al wel mee.
      }
    }

    // Alleen wat nieuw of anders is; een ongewijzigde rit kost geen schrijfactie
    // en geen nawerk.
    const changed = keep.filter((row) => rideRowChanged(row, existingById.get(row.id)));
    for (let index = 0; index < changed.length; index += 200) {
      const { error } = await admin
        .from("strava_activities")
        .upsert(changed.slice(index, index + 200), { onConflict: "id" });
      if (error) throw new Error(error.message);
    }
    result.stored = changed.length;

    // Eigen segment- en coltijden uit het spoor met tijden. Na de upsert, want
    // een poging verwijst naar de rit.
    for (const track of timedTracks) {
      try {
        await storeGpsEfforts(admin, profileId, track.id, track.points);
      } catch {
        // Niet kritiek: de rit telt al mee; de tijden ontbreken dan.
      }
    }

    // Een spoor dat later binnenkomt moet opnieuw door ZWBlokken; die werken
    // incrementeel op blocks_processed_at. De col-detector scant altijd alles.
    if (withNewTrack.length > 0) {
      await admin
        .from("strava_activities")
        .update({ blocks_processed_at: null, zwift_blocks_processed_at: null })
        .in("id", withNewTrack);
    }

    // Ritten die intervals.icu niet meer kent (verwijderd, of geen fietsrit
    // meer). Een lege lijst is geen bewijs dat alles weg is.
    const removedIds: number[] = [];
    if (list.length > 0) {
      const current = new Set(candidates.map((row) => row.id));
      for (const row of existing) {
        if (row.raw?.import_source !== INTERVALS_IMPORT_SOURCE) continue;
        if (!current.has(Number(row.id))) removedIds.push(Number(row.id));
      }
      if (removedIds.length > 0) {
        const { error } = await admin.from("strava_activities").delete().in("id", removedIds);
        if (error) throw new Error(error.message);
      }
    }
    result.removed = removedIds.length;

    if (result.stored > 0 || result.removed > 0) {
      await runPostSyncForProfile(admin, profileId, null, {
        workoutCompletion: true,
        colsDetector: true,
        zwblokken: true,
        // Puur database: col-passages spiegelen naar de ZWB-segmenten.
        recomputeSegments: true,
        milestones: true,
        removedActivityIds: removedIds,
      });
      await awardCompletedAchievementWeeks(admin).catch(() => null);
    }

    await admin
      .from("intervals_connections")
      .update({
        last_synced_at: now.toISOString(),
        last_ride_sync_error: null,
        ...(firstRun ? { rides_backfilled_at: now.toISOString() } : {}),
      })
      .eq("profile_id", profileId);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ritten ophalen bij intervals.icu faalde.";
    result.error = message;
    // last_synced_at schuift ook bij een fout op, anders blokkeert één lid met
    // een ingetrokken sleutel elke run de rij.
    await admin
      .from("intervals_connections")
      .update({ last_synced_at: now.toISOString(), last_ride_sync_error: message.slice(0, 500) })
      .eq("profile_id", profileId)
      .then(
        () => null,
        () => null,
      );
    return result;
  }
}

/**
 * Eén push "open intervals.icu even" per ronde van 60 dagen (visit-reminder.ts).
 * De balk op het dashboard is de hoofdroute; push bereikt maar een paar leden.
 * visit_reminded_at wordt ook gezet als het lid push uit heeft, zodat de cron
 * niet elk uur opnieuw probeert.
 */
export async function sendDueVisitReminders(
  admin: Admin,
  connections: IntervalsRideConnection[],
  now = new Date(),
): Promise<number> {
  const due = connections.filter((row) =>
    visitPushDue(
      {
        created_at: row.created_at ?? null,
        visit_confirmed_at: row.visit_confirmed_at ?? null,
        visit_reminded_at: row.visit_reminded_at ?? null,
      },
      now,
    ),
  );
  if (due.length === 0) return 0;
  const profileIds = due.map((row) => row.profile_id);
  await sendNotificationToMembers(
    "on_intervals_visit_reminder",
    {
      title: "Open intervals.icu even",
      body: "Dan blijven je ritten in ZWB binnenkomen.",
      url: "/dashboard#strava-sync",
      tag: "intervals-visit-reminder",
    },
    { profileIds },
  ).catch(() => null);
  await admin
    .from("intervals_connections")
    .update({ visit_reminded_at: now.toISOString() })
    .in("profile_id", profileIds);
  return due.length;
}
