import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type LadderSelectionRider = {
  lineupId: string;
  kind: "profile" | "roster";
  /** Profiel- of rosterregel-id, zoals de opstelling van de ZRL. */
  id: string;
  name: string;
  zwiftId: number | null;
};

export type LadderSelection = {
  riders: LadderSelectionRider[];
  /** Gezet door de ladder-sync (de opstelling op de ladder zelf), niet door een captain. */
  fromLadder: boolean;
};

const positiveId = (value: unknown) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/**
 * Wie er voor dit team in de ladderrace rijdt: de opstelling van de ladder of de
 * selectie van een captain, beide in team_event_lineups. Per event-id.
 */
export async function loadLadderSelections(admin: Admin, teamId: string, eventIds: string[]) {
  const out = new Map<string, LadderSelection>();
  if (eventIds.length === 0) return out;
  const { data } = await admin
    .from("team_event_lineups")
    .select("id, event_id, profile_id, roster_entry_id, selected_by, profiles!team_event_lineups_profile_id_fkey(display_name, zwift_id), roster_entries(name, zwift_id)")
    .eq("team_id", teamId)
    .in("event_id", eventIds);
  type Joined<T> = T | T[] | null;
  const one = <T>(value: Joined<T>) => (Array.isArray(value) ? value[0] ?? null : value);
  for (const row of (data ?? []) as Array<{
    id: string;
    event_id: string;
    profile_id: string | null;
    roster_entry_id: string | null;
    selected_by: string | null;
    profiles: Joined<{ display_name: string | null; zwift_id: string | number | null }>;
    roster_entries: Joined<{ name: string | null; zwift_id: string | number | null }>;
  }>) {
    const profile = one(row.profiles);
    const roster = one(row.roster_entries);
    const selection = out.get(row.event_id) ?? { riders: [], fromLadder: false };
    if (row.selected_by == null) selection.fromLadder = true;
    selection.riders.push(
      row.profile_id
        ? { lineupId: row.id, kind: "profile", id: row.profile_id, name: profile?.display_name ?? "Lid", zwiftId: positiveId(profile?.zwift_id) }
        : { lineupId: row.id, kind: "roster", id: row.roster_entry_id ?? "", name: roster?.name ?? "Renner", zwiftId: positiveId(roster?.zwift_id) },
    );
    out.set(row.event_id, selection);
  }
  for (const selection of out.values()) selection.riders.sort((a, b) => a.name.localeCompare(b.name, "nl"));
  return out;
}
