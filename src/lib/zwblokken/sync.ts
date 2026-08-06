// Vult profile_blocks vanuit de opgeslagen Strava-polylines.
//
// Incrementeel via strava_activities.blocks_processed_at: alleen ritten die
// nog niet verwerkt zijn worden opgepakt, en na verwerking gemarkeerd. Dat
// maakt de stap idempotent en herstelbaar (blocks_processed_at op null zetten
// = opnieuw berekenen), en houdt hem klein genoeg voor de Netlify-timeout.
//
// Anders dan de col-detector lezen we niet de hele `raw`-blob maar alleen de
// polyline eruit, via PostgREST' JSON-padselectie. Scheelt het grootste deel
// van het dataverkeer.

import polyline from "@mapbox/polyline";
import type { GpxPoint } from "@/lib/gpx";
import { OUTDOOR_CYCLING_SPORTS, looksVirtual } from "@/lib/strava/sports";
import { BLOCK_ZOOM, blocksForActivity, parseBlockKey } from "./grid";

type ActivityRow = {
  id: number;
  start_date: string;
  name: string | null;
  device_name: string | null;
  external_id: string | null;
  encoded_polyline: string | null;
};

const SELECT_COLUMNS =
  "id, start_date, name, device_name:raw->>device_name, external_id:raw->>external_id, encoded_polyline:raw->map->>summary_polyline";

export type BlockSyncResult = {
  scanned: number;
  newBlocks: number;
  remaining: boolean;
};

/** Hoeveel activiteiten we per aanroep verwerken. */
const DEFAULT_MAX_ACTIVITIES = 500;
const PAGE = 250;

export async function syncBlocksForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  options: { maxActivities?: number } = {},
): Promise<BlockSyncResult> {
  const maxActivities = Math.max(
    1,
    options.maxActivities ?? DEFAULT_MAX_ACTIVITIES,
  );

  let scanned = 0;
  let newBlocks = 0;
  let remaining = false;

  while (scanned < maxActivities) {
    const limit = Math.min(PAGE, maxActivities - scanned);
    const { data, error } = await supabase
      .from("strava_activities")
      .select(SELECT_COLUMNS)
      .eq("profile_id", profileId)
      .is("blocks_processed_at", null)
      .in("sport_type", OUTDOOR_CYCLING_SPORTS)
      .not("trainer", "is", true)
      // Oplopend, zodat het oudste blok het eerste is dat blijft staan en
      // first_seen_at klopt (de upsert hieronder laat bestaande rijen staan).
      .order("start_date", { ascending: true })
      .limit(limit + 1);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as ActivityRow[];
    if (rows.length === 0) break;

    // Eén rij extra opgevraagd om te weten of er nog werk ligt.
    remaining = rows.length > limit;
    const batch = rows.slice(0, limit);

    newBlocks += await processBatch(supabase, profileId, batch);
    scanned += batch.length;

    if (!remaining) break;
  }

  return { scanned, newBlocks, remaining };
}

async function processBatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  activities: ActivityRow[],
): Promise<number> {
  // Per blok de vroegste rit onthouden. Binnen één INSERT kan Postgres niet
  // twee keer dezelfde conflictrij verwerken, dus dedupliceren we hier al.
  const firstSeen = new Map<
    string,
    { activityId: number; startDate: string }
  >();

  for (const activity of activities) {
    // Zwift-ritten die Strava als gewone Ride heeft opgeslagen (bv. via een
    // FIT-upload) glippen door de sport_type-filter heen; hun naam verraadt ze.
    // blocksForActivity vangt Watopia daarnaast nog geografisch af.
    if (
      looksVirtual({
        name: activity.name,
        deviceName: activity.device_name,
        externalId: activity.external_id,
      })
    ) {
      continue;
    }

    const points = decodePolyline(activity.encoded_polyline);
    if (!points) continue;
    for (const key of blocksForActivity(points)) {
      if (!firstSeen.has(key)) {
        firstSeen.set(key, {
          activityId: activity.id,
          startDate: activity.start_date,
        });
      }
    }
  }

  let inserted = 0;
  if (firstSeen.size > 0) {
    const rows = [...firstSeen].map(([key, seen]) => {
      const { x, y } = parseBlockKey(key);
      return {
        profile_id: profileId,
        z: BLOCK_ZOOM,
        x,
        y,
        first_activity_id: seen.activityId,
        first_seen_at: seen.startDate,
      };
    });

    // ignoreDuplicates: een blok dat al bestaat houdt zijn oorspronkelijke
    // first_seen_at — dat is precies wat we willen.
    const { data, error } = await supabase
      .from("profile_blocks")
      .upsert(rows, {
        onConflict: "profile_id,z,x,y",
        ignoreDuplicates: true,
      })
      .select("x");
    if (error) throw new Error(error.message);
    inserted = (data ?? []).length;
  }

  const { error: markError } = await supabase
    .from("strava_activities")
    .update({ blocks_processed_at: new Date().toISOString() })
    .in(
      "id",
      activities.map((a) => a.id),
    );
  if (markError) throw new Error(markError.message);

  return inserted;
}

function decodePolyline(encoded: string | null): GpxPoint[] | null {
  if (!encoded) return null;
  try {
    const decoded = polyline.decode(encoded) as [number, number][];
    if (decoded.length < 2) return null;
    return decoded.map(([lat, lon]) => ({ lat, lon }));
  } catch {
    return null;
  }
}

/**
 * Markeer alle ritten van een profiel als onverwerkt en gooi de blokken weg.
 * Voor als de berekening verandert of een rider zijn historie opnieuw wil
 * laten doorrekenen.
 */
export async function resetBlocksForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
): Promise<void> {
  await supabase.from("profile_blocks").delete().eq("profile_id", profileId);
  await supabase
    .from("strava_activities")
    .update({ blocks_processed_at: null })
    .eq("profile_id", profileId);
}
