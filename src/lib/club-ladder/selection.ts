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

export type LadderSelectionOption = { kind: "profile" | "roster"; id: string; name: string };

/**
 * Wie een captain voor een ladderwedstrijd kan kiezen: de leden van het team en
 * de rosterrenners zonder eigen profiel in het team. Dezelfde set als
 * setLadderSelection toelaat.
 */
export async function loadLadderSelectionOptions(admin: Admin, teamId: string): Promise<LadderSelectionOption[]> {
  return (await loadLadderTeamRiders(admin, teamId)).map(({ kind, id, name }) => ({ kind, id, name }));
}

/** Dezelfde set als de keuzelijst van de selectie, met Zwift-ID: het parcoursadvies zonder selectie (2026-11-11). */
export async function loadLadderTeamRiders(
  admin: Admin,
  teamId: string,
): Promise<Array<LadderSelectionOption & { zwiftId: number | null }>> {
  const [{ data: memberRows }, { data: rosterRows }] = await Promise.all([
    admin.from("team_members").select("profile_id").eq("team_id", teamId),
    admin.from("ladder_roster_riders").select("roster_entry_id, roster_entries(name, zwift_id)").eq("team_id", teamId),
  ]);
  const memberIds = [...new Set(((memberRows ?? []) as Array<{ profile_id: string }>).map((row) => row.profile_id))];
  const { data: profileRows } = memberIds.length
    ? await admin.from("profiles").select("id, display_name, zwift_id").eq("is_approved", true).in("id", memberIds)
    : { data: [] };
  const profiles = (profileRows ?? []) as Array<{ id: string; display_name: string | null; zwift_id: string | number | null }>;
  const memberZwiftIds = new Set(profiles.map((row) => positiveId(row.zwift_id)).filter((id): id is number => id != null));
  type Joined<T> = T | T[] | null;
  const one = <T>(value: Joined<T>) => (Array.isArray(value) ? value[0] ?? null : value);
  const roster = ((rosterRows ?? []) as Array<{
    roster_entry_id: string;
    roster_entries: Joined<{ name: string | null; zwift_id: string | number | null }>;
  }>)
    .map((row) => ({ id: row.roster_entry_id, entry: one(row.roster_entries) }))
    .filter(({ entry }) => {
      const zwiftId = positiveId(entry?.zwift_id);
      return zwiftId == null || !memberZwiftIds.has(zwiftId);
    });
  return [
    ...profiles.map((row) => ({
      kind: "profile" as const,
      id: row.id,
      name: row.display_name?.trim() || "Lid",
      zwiftId: positiveId(row.zwift_id),
    })),
    ...roster.map(({ id, entry }) => ({
      kind: "roster" as const,
      id,
      name: entry?.name?.trim() || "Renner",
      zwiftId: positiveId(entry?.zwift_id),
    })),
  ].sort((a, b) => a.name.localeCompare(b.name, "nl"));
}
