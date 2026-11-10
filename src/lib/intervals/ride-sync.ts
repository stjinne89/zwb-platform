// Ritten ophalen bij intervals.icu voor leden zonder Strava-koppeling, en voor
// leden die met Strava gekoppeld toch hun ritten via intervals.icu willen
// (ride-preference.ts).
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
import { dropDismissedRides } from "@/lib/rides/dismissed";
import {
  carryOverFromImport,
  dedupeRides,
  importRidesToReplace,
  encodeTrackPolyline,
  INTERVALS_IMPORT_SOURCE,
  INTERVALS_RIDE_ID_CEILING,
  intervalsActivityToRideRow,
  intervalsRideId,
  latLngFromStreams,
  rideCompareFrom,
  rideRowChanged,
  timedTrackFromStreams,
  rideSourceFor,
  type IntervalsRideInput,
  type IntervalsRideRow,
  type RideFingerprint,
} from "@/lib/intervals/rides";
import {
  loadRidesViaIntervalsProfiles,
  ridesComeViaIntervals,
} from "@/lib/intervals/ride-preference";
import { visitPushDue } from "@/lib/intervals/visit-reminder";
import { sendNotificationToMembers } from "@/lib/push/send";
import { runPostSyncForProfile } from "@/lib/strava/post-sync";
import type { TimedPoint } from "@/lib/segments/gps-efforts";
import { storeGpsEfforts } from "@/lib/segments/gps-sync";
import { getClub } from "@/lib/club";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

/** De eerste run haalt een jaar op; daarna kijkt elke run 30 dagen terug. */
export const FIRST_SYNC_DAYS = 365;
export const SYNC_WINDOW_DAYS = 30;
/** Sporen per lid per run; de volgende run haalt de rest in. */
export const MAX_TRACKS_PER_RUN = 5;
/**
 * Sporen van oudere ritten, buiten het venster van deze run. Zonder deze
 * inhaalslag kregen ritten die bij de eerste run (een jaar, maar vijf sporen)
 * geen spoor kregen er nooit een: daarna kijkt elke run nog maar 30 dagen terug.
 * Op 2026-11-10 wachtten zo ruim 2.000 ritten van 11 leden, en telden ze niet
 * mee voor ZWBlokken en de coltijden.
 */
export const OLD_TRACKS_PER_RUN = 20;
/** De cron heeft 30 seconden voor vijf leden; de inhaalslag krijgt per lid dit. */
export const OLD_TRACKS_BUDGET_MS = 4_000;

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
 * geen Strava-koppeling (ook geen ingetrokken die nog op opruiming wacht), of de
 * eigen keuze voor intervals.icu. Gesorteerd op wie het langst niet aan de beurt
 * was.
 */
export async function loadIntervalsRideConnections(
  admin: Admin,
): Promise<IntervalsRideConnection[]> {
  const [connections, strava, viaIntervals] = await Promise.all([
    admin
      .from("intervals_connections")
      .select(
        "profile_id, athlete_id, api_key, rides_backfilled_at, last_synced_at, created_at, visit_confirmed_at, visit_reminded_at",
      )
      .not("athlete_id", "is", null)
      .order("last_synced_at", { ascending: true, nullsFirst: true }),
    admin.from("strava_connections").select("profile_id"),
    loadRidesViaIntervalsProfiles(admin),
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
        ridesViaIntervals: viaIntervals.has(row.profile_id),
      }) === "intervals",
  );
}

/** Of dit lid nu zijn ritten via intervals.icu krijgt. */
export async function intervalsRideSourceFor(
  admin: Admin,
  profileId: string,
): Promise<IntervalsRideConnection | null> {
  const [connection, strava, viaIntervals] = await Promise.all([
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
    ridesComeViaIntervals(admin, profileId),
  ]);
  const row = connection.data as IntervalsRideConnection | null;
  if (!row?.athlete_id) return null;
  return rideSourceFor({
    hasStravaConnection: Boolean(strava.data),
    hasIntervals: true,
    ridesViaIntervals: viaIntervals,
  }) === "intervals"
    ? row
    : null;
}

export async function syncIntervalsRidesForProfile(
  admin: Admin,
  connection: IntervalsRideConnection,
  opts: {
    now?: Date;
    maxTracks?: number;
    /** Sporen van ritten buiten het venster; zie OLD_TRACKS_PER_RUN. */
    maxOldTracks?: number;
    oldTracksBudgetMs?: number;
    /** Venster in dagen in plaats van het standaardvenster; bij het aanzetten van de keuze. */
    days?: number;
  } = {},
): Promise<RideSyncResult> {
  const now = opts.now ?? new Date();
  const profileId = connection.profile_id;
  const firstRun = !connection.rides_backfilled_at;
  const days = opts.days ?? (firstRun ? FIRST_SYNC_DAYS : SYNC_WINDOW_DAYS);
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
    // verwijderregel hieronder. Ontdubbelen gebeurt wel over de hele lijst
    // (rideCompareFrom), anders komt de rand er als tweede rij bij.
    const removeFrom = new Date(now.getTime() - (days - 1) * 86400_000);
    const { data: existingData, error: existingError } = await admin
      .from("strava_activities")
      .select(EXISTING_COLUMNS)
      .eq("profile_id", profileId)
      .gte("start_date", rideCompareFrom(removeFrom, list).toISOString());
    if (existingError) throw new Error(existingError.message);
    const existing = (existingData ?? []) as ExistingRow[];
    const existingById = new Map(existing.map((row) => [Number(row.id), row]));

    const built = list.flatMap((activity) => {
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
    // Door het lid weggehaalde dubbele opnames (0310) niet terugzetten.
    const candidates = await dropDismissedRides(admin, profileId, built);

    // Een eigen upload zonder vermogen maakt plaats voor dezelfde rit met
    // vermogen; spoor en eigen segmenttijden gaan mee.
    const replace = importRidesToReplace(candidates, existing);
    for (const row of candidates) {
      const old = replace.get(String(row.id));
      if (old) carryOverFromImport(row, old, now);
    }
    const replaceable = new Set([...replace.values()].map((row) => String(row.id)));
    const { keep, skipped } = dedupeRides<IntervalsRideRow>(
      candidates,
      existing.filter((row) => !replaceable.has(String(row.id))),
    );
    result.duplicates = skipped.length;
    // Alleen weg als de vervanger echt wordt opgeslagen.
    const replacedIds = keep.flatMap((row) => {
      const old = replace.get(String(row.id));
      return old ? [Number(old.id)] : [];
    });

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

    // Na de upsert: de vervanger staat er, dus de rit telt nooit even niet mee.
    if (replacedIds.length > 0) {
      // Eerst de gekoppelde trainingen naar de vervanger; anders laat het nawerk
      // ze los en hangt de detectie alleen die van de laatste week terug.
      const moves = new Map(
        keep.flatMap((row) => {
          const old = replace.get(String(row.id));
          return old ? [[String(old.id), String(row.id)] as const] : [];
        }),
      );
      try {
        const { moveRidePartLinks } = await import("@/lib/training/ride-parts");
        await moveRidePartLinks(admin, profileId, moves);
        const { moveReplacedRidePairings } = await import("@/lib/training/completion");
        await moveReplacedRidePairings(admin, profileId, moves);
      } catch {
        // Niet kritiek: dan laat het nawerk de training los, zoals voorheen.
      }
      const { error } = await admin
        .from("strava_activities")
        .delete()
        .eq("profile_id", profileId)
        .in("id", replacedIds);
      if (error) throw new Error(error.message);
    }

    // Oudere ritten zonder spoor, na de upsert zodat het venster voorgaat.
    const older = await backfillOlderTracks(admin, connection, {
      before: removeFrom,
      skip: new Set(keep.map((row) => row.id)),
      max: opts.maxOldTracks ?? OLD_TRACKS_PER_RUN,
      budgetMs: opts.oldTracksBudgetMs ?? OLD_TRACKS_BUDGET_MS,
      now,
    });
    result.tracks += older.checked;
    withNewTrack.push(...older.withTrack);
    timedTracks.push(...older.timedTracks);

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
        if (Date.parse(row.start_date) < removeFrom.getTime()) continue;
        if (!current.has(Number(row.id))) removedIds.push(Number(row.id));
      }
      if (removedIds.length > 0) {
        const { error } = await admin.from("strava_activities").delete().in("id", removedIds);
        if (error) throw new Error(error.message);
      }
    }
    result.removed = removedIds.length + replacedIds.length;
    // Ook de vervangen uploads: hun coltijden moeten naar de vervanger, en een
    // training die niet verhuisde, komt zo alsnog vrij.
    removedIds.push(...replacedIds);

    if (result.stored > 0 || result.removed > 0 || older.withTrack.length > 0) {
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

    // Strava nog gekoppeld: de samenvatting in de Strava-beschrijving. Ook zonder
    // nieuwe rit, want Strava kan de rit later krijgen dan intervals.icu; zonder
    // open rit kost dit alleen een databasevraag.
    await writeStravaSummaries(admin, profileId);

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

type OlderTracks = {
  checked: number;
  withTrack: number[];
  timedTracks: Array<{ id: number; points: TimedPoint[] }>;
};

/**
 * Haalt het spoor op van opgeslagen intervals-ritten van vóór het venster die
 * er nog nooit om gevraagd zijn, de nieuwste eerst. Begrensd in aantal en tijd;
 * de volgende run gaat verder.
 *
 * Een 404 telt als "geen spoor", anders vraagt elke run dezelfde rit opnieuw en
 * komt de rest nooit aan de beurt. Bij elke andere fout (rate limit, sleutel)
 * stopt de inhaalslag voor deze run.
 */
async function backfillOlderTracks(
  admin: Admin,
  connection: IntervalsRideConnection,
  opts: { before: Date; skip: Set<number>; max: number; budgetMs: number; now: Date },
): Promise<OlderTracks> {
  const out: OlderTracks = { checked: 0, withTrack: [], timedTracks: [] };
  if (opts.max <= 0) return out;
  const { data, error } = await admin
    .from("strava_activities")
    .select("id, start_date, raw")
    .eq("profile_id", connection.profile_id)
    .eq("raw->>import_source", INTERVALS_IMPORT_SOURCE)
    .is("raw->>track_checked_at", null)
    .is("raw->map->>summary_polyline", null)
    .lt("start_date", opts.before.toISOString())
    .order("start_date", { ascending: false })
    .limit(opts.max);
  if (error) throw new Error(error.message);

  const started = Date.now();
  const rows = (data ?? []) as Array<{ id: number | string; start_date: string; raw: Record<string, unknown> | null }>;
  for (const row of rows) {
    if (Date.now() - started > opts.budgetMs) break;
    const id = Number(row.id);
    const raw = row.raw ?? {};
    if (opts.skip.has(id) || !raw.intervals_id) continue;

    let body: unknown;
    try {
      body = await fetchIntervalsActivityTrack(connection.api_key, String(raw.intervals_id));
    } catch (err) {
      if (!/intervals\.icu 404\b/.test(err instanceof Error ? err.message : "")) break;
      body = null;
    }
    out.checked += 1;
    const encoded = body ? encodeTrackPolyline(latLngFromStreams(body)) : null;
    const map = (raw.map && typeof raw.map === "object" ? raw.map : {}) as Record<string, unknown>;
    const { error: updateError } = await admin
      .from("strava_activities")
      .update({
        raw: { ...raw, map: { ...map, summary_polyline: encoded }, track_checked_at: opts.now.toISOString() },
      })
      .eq("id", id);
    if (updateError) throw new Error(updateError.message);
    if (!encoded) continue;
    out.withTrack.push(id);
    const points = timedTrackFromStreams(body, Date.parse(row.start_date));
    if (points.length >= 2) out.timedTracks.push({ id, points });
  }
  return out;
}

async function writeStravaSummaries(admin: Admin, profileId: string): Promise<void> {
  try {
    const { data } = await admin
      .from("strava_connections")
      .select(
        "profile_id, strava_athlete_id, access_token, refresh_token, expires_at, scope, revoked_at",
      )
      .eq("profile_id", profileId)
      .maybeSingle();
    if (!data || data.revoked_at) return;
    const { hasActivityWriteScope } = await import("@/lib/strava/scope");
    if (!hasActivityWriteScope(data.scope)) return;
    const { accessTokenFor } = await import("@/lib/strava/client");
    const { writeZwbSummariesForUser } = await import("@/lib/strava/summary-writer");
    const token = await accessTokenFor(admin, data);
    await writeZwbSummariesForUser(admin, profileId, token, { maxWrites: 1 });
  } catch {
    // Niet kritiek: de Strava-sync probeert het ook.
  }
}

/**
 * Haalt de intervals-ritten van een lid weg, zodat Strava weer de ritbron is.
 * Strava levert dezelfde ritten opnieuw; met intervals-rijen in de tabel zou de
 * eerste Strava-sync denken dat hij al gedraaid heeft en maar 30 dagen ophalen
 * (lib/strava/client.ts). Kiest het lid later weer intervals.icu, dan haalt de
 * intervals-sync weer een jaar op.
 */
export async function dropIntervalsRides(admin: Admin, profileId: string): Promise<void> {
  await admin
    .from("strava_activities")
    .delete()
    .eq("profile_id", profileId)
    .lte("id", INTERVALS_RIDE_ID_CEILING);
  await admin
    .from("intervals_connections")
    .update({ rides_backfilled_at: null })
    .eq("profile_id", profileId);
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
  const clubTexts = (await getClub()).texts;
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
      body: `Dan blijven je ritten in ${clubTexts.shortName} binnenkomen.`,
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
