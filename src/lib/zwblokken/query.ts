// Leeskant van ZWBlokken: haalt blokken uit de database en pakt ze in de
// compacte vorm die naar de client gaat.
//
// Supabase capt selects op 1000 rijen, dus alles hier is gepagineerd — een
// actief lid heeft al gauw een paar duizend blokken.

import { BLOCK_ZOOM } from "./grid";

/** x → lijst van y's. */
export type PackedBlocks = Record<string, number[]>;
/** x → lijst van [y, aantal leden]. */
export type PackedClubBlocks = Record<string, [number, number][]>;

const PAGE = 1000;

/** Aantal blokken per regiocode; de sleutels zijn codes uit regions.json. */
export type RegionCounts = Map<string, number>;

function tally(counts: RegionCounts, row: RegionRow) {
  if (row.country) counts.set(row.country, (counts.get(row.country) ?? 0) + 1);
  if (row.province)
    counts.set(row.province, (counts.get(row.province) ?? 0) + 1);
}

type RegionRow = { country: string | null; province: string | null };

export async function fetchOwnBlocks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
): Promise<{ packed: PackedBlocks; regions: RegionCounts; total: number }> {
  const packed: PackedBlocks = {};
  const regions: RegionCounts = new Map();
  let total = 0;

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("profile_blocks")
      .select("x, y, country, province")
      .eq("profile_id", profileId)
      .eq("z", BLOCK_ZOOM)
      .order("x", { ascending: true })
      .order("y", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data as ({ x: number; y: number } & RegionRow)[]) {
      (packed[row.x] ??= []).push(row.y);
      tally(regions, row);
      total++;
    }
    if (data.length < PAGE) break;
  }
  return { packed, regions, total };
}

export async function fetchClubBlocks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<{
  packed: PackedClubBlocks;
  total: number;
  maxRiders: number;
  regions: RegionCounts;
}> {
  const packed: PackedClubBlocks = {};
  const regions: RegionCounts = new Map();
  let total = 0;
  let maxRiders = 1;

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("club_blocks")
      .select("x, y, rider_count, country, province")
      .eq("z", BLOCK_ZOOM)
      .order("x", { ascending: true })
      .order("y", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data as ({
      x: number;
      y: number;
      rider_count: number;
    } & RegionRow)[]) {
      (packed[row.x] ??= []).push([row.y, row.rider_count]);
      tally(regions, row);
      total++;
      if (row.rider_count > maxRiders) maxRiders = row.rider_count;
    }
    if (data.length < PAGE) break;
  }

  return { packed, total, maxRiders, regions };
}

/** Aantal blokken per lid, voor de kiezer en de ranglijst. */
export async function fetchBlockCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("profile_blocks")
      .select("profile_id")
      .eq("z", BLOCK_ZOOM)
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data as { profile_id: string }[]) {
      counts.set(row.profile_id, (counts.get(row.profile_id) ?? 0) + 1);
    }
    if (data.length < PAGE) break;
  }
  return counts;
}

/** Hoeveel blokken heeft dit lid dit kalenderjaar voor het eerst aangedaan? */
export async function countNewThisYear(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
): Promise<number> {
  const startOfYear = new Date(
    Date.UTC(new Date().getUTCFullYear(), 0, 1),
  ).toISOString();
  const { count } = await supabase
    .from("profile_blocks")
    .select("x", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("z", BLOCK_ZOOM)
    .gte("first_seen_at", startOfYear);
  return count ?? 0;
}
