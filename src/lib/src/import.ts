// Zet de Sunday Race Club in de kalender (migr. 0200): per zondag een
// hoofdevent, met daaronder de herenrace en de damesrace. Gedeeld door de
// beheerknop en de cron, via sync.ts.
//
// Idempotent. Een zondag wordt herkend aan events.src_sunday, een race aan zondag
// en geslacht in src_races. Opnieuw draaien werkt tijden en gegevens bij; het
// verwijdert nooit iets, want een gereden race valt uit de feed.
//
// Een zondag zonder races maakt alleen het hoofdevent: zo staan alle zondagen van
// de maand al klaar voor de teamplanning (migr. 0201), ook al loopt de feed maar
// een week vooruit.

import type { SupabaseClient } from "@supabase/supabase-js";
import { safeFetch } from "@/lib/net/safe-fetch";
import {
  isGeneratedSrcTitle,
  SRC_EVENTS_FEED_URL,
  SRC_INFO_URL,
  srcRaceTitle,
  srcSundayTitle,
  type SrcFeedRow,
  type SrcRace,
  type SrcSunday,
} from "@/lib/src/feed";

/** De agenda-feed van MyWhoosh: alle open events, niet alleen de SRC. */
export async function fetchSrcFeed(): Promise<SrcFeedRow[]> {
  const response = await safeFetch(SRC_EVENTS_FEED_URL, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`MyWhoosh gaf status ${response.status}.`);
  const payload = (await response.json()) as { data?: unknown };
  if (!Array.isArray(payload?.data)) throw new Error("MyWhoosh-feed zonder eventlijst.");
  return payload.data as SrcFeedRow[];
}

export type SrcImportResult = {
  sundaysCreated: number;
  racesCreated: number;
  updated: number;
  /** De races die deze run nieuw aanmaakte, voor de RSVP's uit de planning. */
  created: Array<{ eventId: string; parentId: string; sunday: string; gender: SrcRace["gender"] }>;
};

/** Starttijd van een zondag zonder races: cat 6 van de dames. */
export const SRC_DEFAULT_START_UTC = "07:25:00.000Z";

type EventRow = {
  id: string;
  title: string;
  start_at: string;
  parent_event_id: string | null;
  src_sunday: string | null;
  distance_km: number | string | null;
  elevation_m: number | string | null;
  external_url: string | null;
};

const EVENT_COLUMNS =
  "id, title, start_at, parent_event_id, src_sunday, distance_km, elevation_m, external_url";

type RaceRow = { event_id: string; sunday: string; gender: string };

function sameInstant(a: string | null, b: string | null) {
  if (!a || !b) return a === b;
  return new Date(a).getTime() === new Date(b).getTime();
}

function raceColumns(race: SrcRace) {
  return {
    mywhoosh_event_id: race.mywhooshEventId,
    sunday: race.sunday,
    gender: race.gender,
    round: race.round,
    is_final: race.isFinal,
    category_starts: race.categoryStarts,
    registration_closes_at: race.registrationClosesAt,
    pre_weight_categories: race.preWeightCategories,
    pre_weight_opens_at: race.preWeightOpensAt,
    pre_weight_closes_at: race.preWeightClosesAt,
    course_url: race.courseUrl,
    participants: race.participants,
    synced_at: new Date().toISOString(),
  };
}

export async function importSrcSundays(
  admin: SupabaseClient,
  sundays: SrcSunday[],
  createdBy: string,
): Promise<SrcImportResult> {
  const result: SrcImportResult = { sundaysCreated: 0, racesCreated: 0, updated: 0, created: [] };
  if (sundays.length === 0) return result;

  const days = sundays.map((sunday) => sunday.sunday);
  const [{ data: parentRows, error: parentError }, { data: raceRows, error: raceError }] =
    await Promise.all([
      admin
        .from("events")
        .select(EVENT_COLUMNS)
        .in("src_sunday", days)
        .is("parent_event_id", null),
      admin.from("src_races").select("event_id, sunday, gender").in("sunday", days),
    ]);
  if (parentError) throw new Error(parentError.message);
  if (raceError) throw new Error(raceError.message);

  const races = (raceRows ?? []) as RaceRow[];
  const raceEventIds = races.map((row) => row.event_id);
  const { data: childRows, error: childError } =
    raceEventIds.length > 0
      ? await admin.from("events").select(EVENT_COLUMNS).in("id", raceEventIds)
      : { data: [], error: null };
  if (childError) throw new Error(childError.message);

  const parentBySunday = new Map(
    ((parentRows ?? []) as EventRow[]).map((row) => [row.src_sunday as string, row]),
  );
  const children = new Map(((childRows ?? []) as EventRow[]).map((row) => [row.id, row]));
  const childByRace = new Map<string, EventRow>();
  for (const row of races) {
    const child = children.get(row.event_id);
    if (child) childByRace.set(`${row.sunday}|${row.gender}`, child);
  }

  for (const sunday of sundays) {
    // Een race die niet meer in de feed staat, telt met zijn opgeslagen start.
    const inFeed = new Set(sunday.races.map((race) => `${sunday.sunday}|${race.gender}`));
    const known = [...childByRace.entries()]
      .filter(([key]) => key.startsWith(`${sunday.sunday}|`) && !inFeed.has(key))
      .map(([, row]) => new Date(row.start_at).toISOString());
    const start =
      [...sunday.races.map((race) => race.startAt), ...known].sort()[0] ??
      `${sunday.sunday}T${SRC_DEFAULT_START_UTC}`;
    const parentTitle = srcSundayTitle(sunday);

    // 1. De zondag: één regel in de kalender.
    let parent = parentBySunday.get(sunday.sunday);
    if (!parent) {
      const { data, error } = await admin
        .from("events")
        .insert({
          type: "src",
          title: parentTitle,
          start_at: start,
          location: "MyWhoosh",
          external_url: SRC_INFO_URL,
          src_sunday: sunday.sunday,
          created_by: createdBy,
        })
        .select(EVENT_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      parent = data as EventRow;
      result.sundaysCreated += 1;
    } else {
      const update: Record<string, unknown> = {};
      if (!sameInstant(parent.start_at, start)) update.start_at = start;
      if (parent.title !== parentTitle && isGeneratedSrcTitle(parent.title)) {
        update.title = parentTitle;
      }
      if (Object.keys(update).length > 0) {
        const { error } = await admin.from("events").update(update).eq("id", parent.id);
        if (error) throw new Error(error.message);
        result.updated += 1;
      }
    }

    // 2. De races eronder.
    for (const race of sunday.races) {
      const title = srcRaceTitle(sunday, race.gender);
      const fields = {
        start_at: race.startAt,
        distance_km: race.distanceKm,
        elevation_m: race.elevationM === null ? null : Math.round(race.elevationM),
        external_url: race.externalUrl,
      };
      let child = childByRace.get(`${race.sunday}|${race.gender}`);
      if (!child) {
        const { data, error } = await admin
          .from("events")
          .insert({
            type: "src",
            title,
            parent_event_id: parent.id,
            location: "MyWhoosh",
            created_by: createdBy,
            ...fields,
          })
          .select(EVENT_COLUMNS)
          .single();
        if (error) throw new Error(error.message);
        child = data as EventRow;
        result.racesCreated += 1;
        result.created.push({
          eventId: child.id,
          parentId: parent.id,
          sunday: sunday.sunday,
          gender: race.gender,
        });
      } else {
        const update: Record<string, unknown> = {};
        if (!sameInstant(child.start_at, fields.start_at)) update.start_at = fields.start_at;
        if (Number(child.distance_km ?? NaN) !== Number(fields.distance_km ?? NaN)) {
          if (fields.distance_km !== null) update.distance_km = fields.distance_km;
        }
        if (Number(child.elevation_m ?? NaN) !== Number(fields.elevation_m ?? NaN)) {
          if (fields.elevation_m !== null) update.elevation_m = fields.elevation_m;
        }
        if (child.external_url !== fields.external_url) update.external_url = fields.external_url;
        if (child.parent_event_id !== parent.id) update.parent_event_id = parent.id;
        if (child.title !== title && isGeneratedSrcTitle(child.title)) update.title = title;
        if (Object.keys(update).length > 0) {
          const { error } = await admin.from("events").update(update).eq("id", child.id);
          if (error) throw new Error(error.message);
          result.updated += 1;
        }
      }

      const { error } = await admin
        .from("src_races")
        .upsert({ event_id: child.id, ...raceColumns(race) }, { onConflict: "event_id" });
      if (error) throw new Error(error.message);
    }
  }

  return result;
}
