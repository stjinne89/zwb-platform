// Uitslagen van leden voor het dashboard (wens eigenaar, 2026-11-10): per
// bevroren race uit de kalender hoeveel ZWB'ers er reden en de beste ZWB-plek
// per categorie. De bron is zrl_race_snapshots (de freeze-cron bewaart daar ZRL-
// en andere Zwift-races uit de kalender, migr. 0197). Races buiten de kalender
// (zwift_race_scores) hebben geen plek en staan er dus niet in.

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type ClubRaceRider = {
  profileId: string;
  name: string;
  rank: number;
  /** De categorie of startgroep, zoals Zwift hem noemt ("A", "B", ...). */
  label: string;
};

export type ClubRaceResult = {
  key: string;
  href: string;
  title: string;
  startAt: string;
  /** Hoeveel ZWB'ers een plek in de uitslag hebben. */
  riders: number;
  /** De beste ZWB'er per categorie, op categorie. */
  best: ClubRaceRider[];
};

type SnapshotRow = {
  zwift_event_id: string | number;
  name: string | null;
  type: string | null;
  subgroups: Array<{
    label?: string;
    startAt?: number;
    results?: Array<{ profileId: number | string; rank: number }>;
  }> | null;
};

type CalendarRow = {
  id: string;
  title: string;
  start_at: string;
  zwift_event_id: string | number | null;
  parent_event_id: string | null;
};

type Member = { id: string; name: string };

/** Groepsritten hebben een volgorde maar geen uitslag. */
const NOT_A_RACE = new Set(["GROUP_RIDE", "GROUP_WORKOUT"]);

export function clubRaceResults(
  snapshots: SnapshotRow[],
  calendar: CalendarRow[],
  members: ReadonlyMap<string, Member>,
  sinceMs: number,
): ClubRaceResult[] {
  // Per Zwift-event het kalenderevent: het eerste, en bij een teamevent de
  // raceweek erboven (migr. 0178), met alle teams van die ronde.
  const byZwift = new Map<string, CalendarRow>();
  for (const row of [...calendar].sort((a, b) => a.start_at.localeCompare(b.start_at))) {
    const key = String(row.zwift_event_id ?? "");
    if (key && !byZwift.has(key)) byZwift.set(key, row);
  }

  const out: ClubRaceResult[] = [];
  for (const snapshot of snapshots) {
    if (snapshot.type && NOT_A_RACE.has(snapshot.type)) continue;
    const event = byZwift.get(String(snapshot.zwift_event_id));
    if (!event) continue;
    const subgroups = snapshot.subgroups ?? [];
    const starts = subgroups.map((group) => group.startAt).filter((at): at is number => Number.isFinite(at));
    const startMs = starts.length > 0 ? Math.min(...starts) : Date.parse(event.start_at);
    if (!(startMs >= sinceMs)) continue;

    const seen = new Set<string>();
    const best: ClubRaceRider[] = [];
    for (const group of subgroups) {
      let top: ClubRaceRider | null = null;
      for (const result of group.results ?? []) {
        const member = members.get(String(result.profileId));
        if (!member || !(result.rank > 0)) continue;
        seen.add(member.id);
        if (!top || result.rank < top.rank) {
          top = { profileId: member.id, name: member.name, rank: result.rank, label: group.label ?? "" };
        }
      }
      if (top) best.push(top);
    }
    if (seen.size === 0) continue;

    out.push({
      key: String(snapshot.zwift_event_id),
      href: `/events/${event.parent_event_id ?? event.id}`,
      title: event.title || snapshot.name || "Race",
      startAt: new Date(startMs).toISOString(),
      riders: seen.size,
      best: best.sort((a, b) => a.label.localeCompare(b.label, "nl")),
    });
  }
  return out.sort((a, b) => b.startAt.localeCompare(a.startAt));
}

/**
 * De races van de afgelopen 7 dagen, voor de hele club gelijk en daarom 10
 * minuten gedeeld gecachet. Leest met de admin-client: de uitslag is van alle
 * renners in het event, en alleen goedgekeurde leden komen erin terug.
 */
export const loadClubRaceResults = unstable_cache(
  async (): Promise<ClubRaceResult[]> => {
    const admin = createAdminClient();
    const sinceMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const { data: snaps, error } = await admin
      .from("zrl_race_snapshots")
      .select("zwift_event_id, name:data->>eventName, type:data->>eventType, subgroups:data->subgroups")
      .gte("frozen_at", new Date(sinceMs).toISOString());
    if (error || !snaps || snaps.length === 0) return [];
    const ids = [...new Set((snaps as unknown as SnapshotRow[]).map((row) => String(row.zwift_event_id)))];
    const [{ data: events }, { data: profiles }] = await Promise.all([
      admin
        .from("events")
        .select("id, title, start_at, zwift_event_id, parent_event_id")
        .in("zwift_event_id", ids),
      admin
        .from("profiles")
        .select("id, display_name, zwift_id")
        .eq("is_approved", true)
        .not("zwift_id", "is", null),
    ]);
    const members = new Map<string, Member>();
    for (const row of (profiles ?? []) as Array<{ id: string; display_name: string | null; zwift_id: string | null }>) {
      const zwiftId = (row.zwift_id ?? "").trim();
      if (zwiftId) members.set(zwiftId, { id: row.id, name: row.display_name ?? "ZWB'er" });
    }
    return clubRaceResults(
      snaps as unknown as SnapshotRow[],
      (events ?? []) as CalendarRow[],
      members,
      sinceMs,
    );
  },
  ["dashboard-club-race-results"],
  { revalidate: 600 },
);
