// Vult profile_zwift_blocks vanuit de routelijnen van Zwift-ritten.
//
// Het spiegelbeeld van syncBlocksForUser (sync.ts), met een eigen cursor
// (strava_activities.zwift_blocks_processed_at, migratie 0165): buiten en Zwift
// rekenen elk hun eigen ritten door, en een herberekening van het een raakt het
// ander niet. Puur database, geen Strava-calls.

import { parseBlockKey } from "./grid";
import { decodePolyline, writeBlocks } from "./sync";
import { ZWIFT_BLOCK_ZOOM, zwiftBlocksForRide } from "./zwift";

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

const DEFAULT_MAX_ACTIVITIES = 500;
const PAGE = 250;

export type ZwiftBlockSyncResult = {
  scanned: number;
  newBlocks: number;
  remaining: boolean;
};

export async function syncZwiftBlocksForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  options: { maxActivities?: number } = {},
): Promise<ZwiftBlockSyncResult> {
  const maxActivities = Math.max(1, options.maxActivities ?? DEFAULT_MAX_ACTIVITIES);
  let scanned = 0;
  let newBlocks = 0;
  let remaining = false;

  while (scanned < maxActivities) {
    const limit = Math.min(PAGE, maxActivities - scanned);
    const { data, error } = await supabase
      .from("strava_activities")
      .select(SELECT_COLUMNS)
      .eq("profile_id", profileId)
      .eq("sport_type", "VirtualRide")
      .is("zwift_blocks_processed_at", null)
      // Oplopend, zodat first_seen_at bij gewone volgorde meteen klopt.
      .order("start_date", { ascending: true })
      .limit(limit + 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as ActivityRow[];
    if (rows.length === 0) break;

    remaining = rows.length > limit;
    const batch = rows.slice(0, limit);
    newBlocks += await processBatch(supabase, profileId, batch);
    scanned += batch.length;
    if (!remaining) break;
  }

  return { scanned, newBlocks, remaining };
}

/** Ritten per wereld (null = geen Zwift-rit), voor één update per groep. Puur. */
export function groupByWorld(worldOf: Map<number, string | null>): Map<string | null, number[]> {
  const out = new Map<string | null, number[]>();
  for (const [id, world] of worldOf) {
    const ids = out.get(world) ?? [];
    ids.push(id);
    out.set(world, ids);
  }
  return out;
}

async function processBatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  activities: ActivityRow[],
): Promise<number> {
  const firstSeen = new Map<string, { world: string; activityId: number; startDate: string }>();
  // Wereld per rit, voor de kilometers per wereld (migratie 0166). null = geen Zwift-rit.
  const worldOf = new Map<number, string | null>();

  for (const activity of activities) {
    worldOf.set(activity.id, null);
    const points = decodePolyline(activity.encoded_polyline);
    if (!points) continue;
    const ride = zwiftBlocksForRide({
      points,
      name: activity.name,
      deviceName: activity.device_name,
      externalId: activity.external_id,
    });
    if (!ride) continue;
    worldOf.set(activity.id, ride.world.slug);
    for (const key of ride.blocks) {
      if (!firstSeen.has(key)) {
        firstSeen.set(key, {
          world: ride.world.slug,
          activityId: activity.id,
          startDate: activity.start_date,
        });
      }
    }
  }

  const rows = [...firstSeen].map(([key, seen]) => {
    const { x, y } = parseBlockKey(key);
    return {
      profile_id: profileId,
      world: seen.world,
      z: ZWIFT_BLOCK_ZOOM,
      x,
      y,
      first_activity_id: seen.activityId,
      first_seen_at: seen.startDate,
    };
  });
  const inserted = await writeBlocks(supabase, "profile_zwift_blocks", ZWIFT_BLOCK_ZOOM, profileId, rows);

  // Ook ritten zonder Zwift-herkenning of routelijn afvinken; anders komen ze
  // elke run terug. Eén update per wereld, zodat de wereld meteen meekomt.
  const processedAt = new Date().toISOString();
  for (const [world, ids] of groupByWorld(worldOf)) {
    const { error } = await supabase
      .from("strava_activities")
      .update({ zwift_blocks_processed_at: processedAt, zwift_world: world })
      .in("id", ids);
    if (error) throw new Error(error.message);
  }

  return inserted;
}
