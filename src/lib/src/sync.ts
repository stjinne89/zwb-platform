// Houdt de Sunday Race Club in de kalender bij (migr. 0200). Gedeeld door de
// cron (/api/src/sync) en de knop op /beheer/src.

import type { SupabaseClient } from "@supabase/supabase-js";
import { groupSrcFeed, type SrcFeedRow } from "@/lib/src/feed";
import { fetchSrcFeed, importSrcSundays } from "@/lib/src/import";

export type SrcSyncState = {
  created_by: string | null;
  synced_at: string | null;
  sync_error: string | null;
  races_in_feed: number | null;
};

export type SrcSyncResult = {
  sundaysCreated: number;
  racesCreated: number;
  updated: number;
  racesInFeed: number;
  warnings: string[];
  error: string | null;
};

export async function loadSrcSyncState(admin: SupabaseClient): Promise<SrcSyncState | null> {
  const { data } = await admin
    .from("src_sync_state")
    .select("created_by, synced_at, sync_error, races_in_feed")
    .eq("id", true)
    .maybeSingle();
  return (data as SrcSyncState | null) ?? null;
}

export async function syncSrcCalendar(
  admin: SupabaseClient,
  options: { createdBy?: string | null; rows?: SrcFeedRow[] } = {},
): Promise<SrcSyncResult> {
  const result: SrcSyncResult = {
    sundaysCreated: 0,
    racesCreated: 0,
    updated: 0,
    racesInFeed: 0,
    warnings: [],
    error: null,
  };
  const state = await loadSrcSyncState(admin);
  // Een event heeft altijd een maker; bij de cron is dat de beheerder die de
  // agenda de eerste keer ophaalde.
  const createdBy = options.createdBy ?? state?.created_by ?? null;

  try {
    if (!createdBy) throw new Error("Haal de agenda eerst één keer op via /beheer/src.");
    const rows = options.rows ?? (await fetchSrcFeed());
    const feed = groupSrcFeed(rows);
    result.warnings = feed.warnings;
    result.racesInFeed = feed.sundays.reduce((sum, sunday) => sum + sunday.races.length, 0);
    Object.assign(result, await importSrcSundays(admin, feed.sundays, createdBy));
  } catch (err) {
    result.error = err instanceof Error ? err.message : "SRC-sync mislukt.";
  }

  await admin.from("src_sync_state").upsert(
    {
      id: true,
      created_by: state?.created_by ?? createdBy,
      ...(result.error
        ? { sync_error: result.error }
        : {
            synced_at: new Date().toISOString(),
            sync_error: null,
            races_in_feed: result.racesInFeed,
          }),
    },
    { onConflict: "id" },
  );
  return result;
}
