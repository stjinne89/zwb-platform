// Leeskant van de Zwift-blokken (migratie 0165). Zelfde vorm als query.ts, maar
// alles per wereld: een blok in Zwift-London hoort bij London, niet bij de club-
// dekking of de titels buiten.

import { blockKey, blocksForPolyline } from "./grid";
import type { PackedBlocks, PackedClubBlocks } from "./query";
import { addBlock, type RegionStandings, type StandingRow } from "./titles";
import { ZWIFT_BLOCK_ZOOM, zwiftRegionCode } from "./zwift";

const PAGE = 1000;

export type ZwiftOwn = {
  /** wereld → blokken van dit lid. */
  blocks: Record<string, PackedBlocks>;
  /** wereld → aantal blokken. */
  counts: Record<string, number>;
};

export type ZwiftClub = {
  blocks: Record<string, PackedClubBlocks>;
  counts: Record<string, number>;
  maxRiders: Record<string, number>;
};

export async function fetchOwnZwiftBlocks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
): Promise<ZwiftOwn> {
  const out: ZwiftOwn = { blocks: {}, counts: {} };
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("profile_zwift_blocks")
      .select("world, x, y")
      .eq("profile_id", profileId)
      .eq("z", ZWIFT_BLOCK_ZOOM)
      .order("x", { ascending: true })
      .order("y", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data as { world: string; x: number; y: number }[]) {
      ((out.blocks[row.world] ??= {})[row.x] ??= []).push(row.y);
      out.counts[row.world] = (out.counts[row.world] ?? 0) + 1;
    }
    if (data.length < PAGE) break;
  }
  return out;
}

export async function fetchClubZwiftBlocks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<ZwiftClub> {
  const out: ZwiftClub = { blocks: {}, counts: {}, maxRiders: {} };
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("club_zwift_blocks")
      .select("world, x, y, rider_count")
      .eq("z", ZWIFT_BLOCK_ZOOM)
      .order("x", { ascending: true })
      .order("y", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data as { world: string; x: number; y: number; rider_count: number }[]) {
      ((out.blocks[row.world] ??= {})[row.x] ??= []).push([row.y, row.rider_count]);
      out.counts[row.world] = (out.counts[row.world] ?? 0) + 1;
      out.maxRiders[row.world] = Math.max(out.maxRiders[row.world] ?? 1, row.rider_count);
    }
    if (data.length < PAGE) break;
  }
  return out;
}

/**
 * Blokken per lid per wereld (voor de ranglijst) en de stand voor de titels, uit
 * één scan. De regiocode is `zwift:<wereld>`, zodat addBlock en pickRulers uit
 * titles.ts ongewijzigd werken.
 */
export async function fetchZwiftStandings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<{ counts: Map<string, Map<string, number>>; standings: RegionStandings }> {
  const counts = new Map<string, Map<string, number>>();
  const standings: RegionStandings = new Map();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("profile_zwift_blocks")
      .select("profile_id, world, first_seen_at")
      .eq("z", ZWIFT_BLOCK_ZOOM)
      .order("profile_id", { ascending: true })
      .order("x", { ascending: true })
      .order("y", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data as { profile_id: string; world: string; first_seen_at: string }[]) {
      const perWorld = counts.get(row.world) ?? new Map<string, number>();
      perWorld.set(row.profile_id, (perWorld.get(row.profile_id) ?? 0) + 1);
      counts.set(row.world, perWorld);
      const standing: StandingRow = {
        profile_id: row.profile_id,
        country: zwiftRegionCode(row.world),
        province: null,
        first_seen_at: row.first_seen_at,
      };
      addBlock(standings, standing);
    }
    if (data.length < PAGE) break;
  }
  return { counts, standings };
}

/**
 * Meters per lid per wereld (view zwift_world_distances, migratie 0166). Leeg
 * zonder die migratie; de titels vallen dan terug op wie het eerst had.
 */
export async function fetchZwiftDistances(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<Map<string, Map<string, number>>> {
  const out = new Map<string, Map<string, number>>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("zwift_world_distances")
      .select("profile_id, world, distance_m")
      .order("world", { ascending: true })
      .order("profile_id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data as { profile_id: string; world: string; distance_m: number | string }[]) {
      const perMember = out.get(row.world) ?? new Map<string, number>();
      perMember.set(row.profile_id, Number(row.distance_m));
      out.set(row.world, perMember);
    }
    if (data.length < PAGE) break;
  }
  return out;
}

type RouteShape = { world: string | null; shape: { lat?: number[]; lon?: number[] } | null };

/** Blokken die de routevormen uit zwift_routes raken, per wereld. Puur, voor de test. */
export function roadBlocksFromShapes(routes: RouteShape[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const route of routes) {
    const lat = route.shape?.lat;
    const lon = route.shape?.lon;
    if (!route.world || !lat || !lon || lat.length < 2) continue;
    const points = lat.map((value, i) => ({ lat: value, lon: lon[i] }));
    const set = out.get(route.world) ?? new Set<string>();
    for (const key of blocksForPolyline(points, ZWIFT_BLOCK_ZOOM)) set.add(key);
    out.set(route.world, set);
  }
  return out;
}

/**
 * Hoeveel wegblokken kent een wereld? De routevormen dekken niet elke weg (in
 * Watopia maar de helft van wat de club reed), dus de noemer is routevormen plus
 * alles wat een lid ooit reed. Een nieuw ontdekte weg laat het percentage dus
 * zakken; dat staat op /hulp. Puur, voor de test.
 */
export function knownRoadCounts(
  roads: Map<string, Set<string>>,
  club: Record<string, PackedClubBlocks>,
): Record<string, number> {
  const worlds = new Set([...roads.keys(), ...Object.keys(club)]);
  const out: Record<string, number> = {};
  for (const world of worlds) {
    const keys = new Set(roads.get(world) ?? []);
    for (const [x, entries] of Object.entries(club[world] ?? {})) {
      for (const [y] of entries) keys.add(blockKey(Number(x), y));
    }
    out[world] = keys.size;
  }
  return out;
}

// De routebibliotheek verandert zelden; per serverinstantie een uur onthouden.
let roadCache: { at: number; roads: Map<string, Set<string>> } | null = null;
const ROAD_CACHE_MS = 60 * 60_000;

export async function fetchRoadBlocks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<Map<string, Set<string>>> {
  if (roadCache && Date.now() - roadCache.at < ROAD_CACHE_MS) return roadCache.roads;
  const { data, error } = await supabase.from("zwift_routes").select("world, shape");
  if (error) return new Map();
  const roads = roadBlocksFromShapes((data ?? []) as RouteShape[]);
  roadCache = { at: Date.now(), roads };
  return roads;
}

/** Routevormen van één wereld voor de kaart, gedund tot elk derde punt (~300 m). */
export async function fetchRouteLines(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  world: string,
): Promise<[number, number][][]> {
  const { data, error } = await supabase
    .from("zwift_routes")
    .select("world, shape")
    .eq("world", world);
  if (error) return [];
  const lines: [number, number][][] = [];
  for (const route of (data ?? []) as RouteShape[]) {
    const lat = route.shape?.lat;
    const lon = route.shape?.lon;
    if (!lat || !lon || lat.length < 2) continue;
    const line: [number, number][] = [];
    for (let i = 0; i < lat.length; i += 3) line.push([round(lat[i]), round(lon[i])]);
    line.push([round(lat[lat.length - 1]), round(lon[lon.length - 1])]);
    lines.push(line);
  }
  return lines;
}

const round = (n: number) => Math.round(n * 1e5) / 1e5;
