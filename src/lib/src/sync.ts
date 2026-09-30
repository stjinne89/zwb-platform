// Houdt de Sunday Race Club in de kalender bij (migr. 0200) en haalt de
// uitslagen van gereden races op (migr. 0202). Gedeeld door de cron
// (/api/src/sync) en de knop op /beheer/src.

import type { SupabaseClient } from "@supabase/supabase-js";
import { groupSrcFeed, type SrcFeedRow, type SrcSunday } from "@/lib/src/feed";
import { fetchSrcFeed, importSrcSundays } from "@/lib/src/import";
import { nextSrcMonth, srcMonthKey, srcMonthSundays } from "@/lib/src/month";
import { rsvpNewSrcRaces } from "@/lib/src/availability";
import { syncSrcResults, type SrcPost, type SrcResultsSyncResult } from "@/lib/src/results-sync";

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
  /** Antwoorden op nieuwe races, uit de beschikbaarheid op de zondag. */
  rsvps: number;
  racesInFeed: number;
  warnings: string[];
  error: string | null;
  /** Uitslagen; een fout daar laat de agenda gewoon doorgaan. */
  results: SrcResultsSyncResult | null;
  resultsError: string | null;
};

export async function loadSrcSyncState(admin: SupabaseClient): Promise<SrcSyncState | null> {
  const { data } = await admin
    .from("src_sync_state")
    .select("created_by, synced_at, sync_error, races_in_feed")
    .eq("id", true)
    .maybeSingle();
  return (data as SrcSyncState | null) ?? null;
}

/**
 * De zondagen van deze en volgende maand, met de races die de feed al kent. Een
 * zondag uit de feed gaat voor de berekende (ronde en titel).
 */
export function srcSundaysToImport(feed: SrcSunday[], now: Date): SrcSunday[] {
  const month = srcMonthKey(now);
  const bySunday = new Map<string, SrcSunday>();
  for (const slot of [...srcMonthSundays(month), ...srcMonthSundays(nextSrcMonth(month))]) {
    bySunday.set(slot.sunday, { ...slot, races: [] });
  }
  for (const sunday of feed) bySunday.set(sunday.sunday, sunday);
  const today = now.toISOString().slice(0, 10);
  return [...bySunday.values()]
    .filter((sunday) => sunday.races.length > 0 || sunday.sunday >= today)
    .sort((a, b) => a.sunday.localeCompare(b.sunday));
}

export async function syncSrcCalendar(
  admin: SupabaseClient,
  options: {
    createdBy?: string | null;
    rows?: SrcFeedRow[];
    now?: Date;
    /** Uitslagen-API, voor tests. */
    post?: SrcPost;
    /** Uitslagen ophalen ook als de vorige keer nog geen drie uur geleden is. */
    forceResults?: boolean;
  } = {},
): Promise<SrcSyncResult> {
  const result: SrcSyncResult = {
    sundaysCreated: 0,
    racesCreated: 0,
    updated: 0,
    rsvps: 0,
    racesInFeed: 0,
    warnings: [],
    error: null,
    results: null,
    resultsError: null,
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
    const sundays = srcSundaysToImport(feed.sundays, options.now ?? new Date());
    const imported = await importSrcSundays(admin, sundays, createdBy);
    result.sundaysCreated = imported.sundaysCreated;
    result.racesCreated = imported.racesCreated;
    result.updated = imported.updated;
    result.rsvps = await rsvpNewSrcRaces(admin, imported.created);
  } catch (err) {
    result.error = err instanceof Error ? err.message : "SRC-sync mislukt.";
  }

  try {
    result.results = await syncSrcResults(admin, {
      now: options.now,
      post: options.post,
      force: options.forceResults,
    });
  } catch (err) {
    result.resultsError = err instanceof Error ? err.message : "Uitslagen ophalen mislukt.";
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
