import type { SupabaseClient } from "@supabase/supabase-js";

export type AppUpdate = {
  id: string;
  weekStart: string;
  publishAt: string;
  summary: string;
  changes: string[];
  fixes: string[];
};

const COLUMNS = "id, week_start, publish_at, summary, changes, fixes";

type Row = {
  id: string;
  week_start: string;
  publish_at: string;
  summary: string;
  changes: string[] | null;
  fixes: string[] | null;
};

function toUpdate(row: Row): AppUpdate {
  return {
    id: row.id,
    weekStart: row.week_start,
    publishAt: row.publish_at,
    summary: row.summary,
    changes: row.changes ?? [],
    fixes: row.fixes ?? [],
  };
}

/**
 * Verschenen updates, nieuwste eerst. Expliciet op publish_at gefilterd: wie
 * updates schrijft, mag via RLS ook de klaargezette zien, maar die horen hier
 * niet.
 */
export async function loadPublishedUpdates(supabase: SupabaseClient, limit = 52): Promise<AppUpdate[]> {
  const { data } = await supabase
    .from("app_updates")
    .select(COLUMNS)
    .lte("publish_at", new Date().toISOString())
    .order("publish_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Row[]).map(toUpdate);
}

/** De laatst verschenen update, voor de pop-up. */
export async function loadLatestUpdate(supabase: SupabaseClient): Promise<AppUpdate | null> {
  const [latest] = await loadPublishedUpdates(supabase, 1);
  return latest ?? null;
}

/** Alles, ook wat nog klaarstaat; voor het beheer. */
export async function loadAllUpdates(supabase: SupabaseClient): Promise<AppUpdate[]> {
  const { data } = await supabase
    .from("app_updates")
    .select(COLUMNS)
    .order("week_start", { ascending: false })
    .limit(104);
  return ((data ?? []) as Row[]).map(toUpdate);
}
