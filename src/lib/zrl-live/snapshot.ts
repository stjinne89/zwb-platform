// Live ZRL-stand voor één ZWB-teamevent: Zwift-data ophalen en doorrekenen.
//
// Niets wordt opgeslagen. De Zwift-kant is 15 s gecachet per Zwift-event, dus de
// belasting op Zwift is gelijk bij één of duizend kijkers (hetzelfde patroon als
// src/lib/live/external-timing.ts). Zie docs/live-zrl-dashboard.md.

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchEntrants,
  fetchSegmentResults,
  fetchSubgroupResults,
  fetchZwiftEvent,
  type SubgroupResult,
} from "@/lib/events/zwift-club";
import { routeSegments } from "@/lib/zwift/route-segments";
import { scoreRace, type Passage, type Rider, type ScoreResult } from "@/lib/zrl-live/scoring";
import { extractTeamTag, teamKey, zrlLeagueKey } from "@/lib/zrl-live/team-tags";

/** Geen nieuwe passage of uitslag meer: dan noemen we de stand definitief. */
const QUIET_BEFORE_FINAL_MS = 15 * 60 * 1000;

type ZwiftSubgroup = {
  id: string;
  label: string;
  startAt: number;
  routeId: string | null;
  laps: number;
};

type RaceData = {
  fetchedAt: number;
  eventName: string;
  subgroups: Array<
    ZwiftSubgroup & {
      entrants: Array<{ zwiftId: string; name: string }>;
      results: SubgroupResult[];
    }
  >;
  passages: Passage[];
};

function toMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseSubgroups(event: unknown): ZwiftSubgroup[] {
  const rows = ((event as { eventSubgroups?: unknown[] })?.eventSubgroups ?? []) as Array<Record<string, unknown>>;
  return rows.flatMap((row) => {
    const startAt = toMs(row.eventSubgroupStart);
    if (row.id == null || startAt == null) return [];
    return [{
      id: String(row.id),
      label: String(row.subgroupLabel ?? ""),
      startAt,
      routeId: row.routeId == null ? null : String(row.routeId),
      laps: Number(row.laps) || 1,
    }];
  });
}

async function fetchRaceData(zwiftEventId: string): Promise<RaceData> {
  const zwiftEvent = await fetchZwiftEvent(zwiftEventId);
  const subgroups = parseSubgroups(zwiftEvent);
  const withRiders = await Promise.all(
    subgroups.map(async (subgroup) => {
      const [entrants, results] = await Promise.all([
        fetchEntrants([subgroup.id]),
        fetchSubgroupResults(subgroup.id).catch(() => []),
      ]);
      return { ...subgroup, entrants: entrants.map(({ zwiftId, name }) => ({ zwiftId, name })), results };
    }),
  );

  const occupied = withRiders.filter((subgroup) => subgroup.entrants.length > 0);
  const entrantIds = new Set(occupied.flatMap((s) => s.entrants.map((e) => Number(e.zwiftId))));
  const segmentIds = new Set<string>();
  for (const subgroup of occupied) {
    for (const ref of (subgroup.routeId && routeSegments(subgroup.routeId, subgroup.laps)) || []) {
      segmentIds.add(ref.segmentId);
    }
  }
  const from = Math.min(...occupied.map((s) => s.startAt));
  const passages: Passage[] = [];
  if (Number.isFinite(from) && Date.now() > from) {
    const settled = await Promise.allSettled(
      [...segmentIds].map((segmentId) => fetchSegmentResults(segmentId, { from })),
    );
    // Eén haperend segment mag de stand niet breken; allemaal wel een fout.
    const failed = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed && settled.every((r) => r.status === "rejected")) throw failed.reason;
    const perSegment = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    for (const result of perSegment.flat()) {
      if (!entrantIds.has(result.athleteId)) continue;
      passages.push({
        id: result.id,
        athleteId: result.athleteId,
        segmentId: result.segmentId,
        ts: result.ts,
        elapsed: result.elapsed,
      });
    }
  }
  const eventName = String((zwiftEvent as { name?: unknown })?.name ?? "");
  return { fetchedAt: Date.now(), eventName, subgroups: withRiders, passages };
}

const fetchCachedRaceData = unstable_cache(fetchRaceData, ["zrl-live-race"], { revalidate: 15 });

export type ZrlLiveView = {
  event: { id: string; title: string; teamName: string | null; zwiftEventId: string };
  subgroupLabel: string;
  startAt: number;
  fetchedAt: number;
  /** Onze team-sleutel in `score.teams`. */
  ownTeam: string | null;
  ownRiders: number[];
  /** Waaronder een teambijstelling bewaard wordt. */
  leagueKey: string;
  /** Alle inschrijvers van onze subgroep, ook zonder punten. */
  entrants: Rider[];
  /** Teamsleutel → weergavenaam (eigen teamnaam, anders de eerste tag zoals getypt). */
  teamLabels: Record<string, string>;
  score: ScoreResult;
};

export type ZrlLiveOutcome =
  | { status: "ok"; view: ZrlLiveView }
  | { status: "not-found" | "no-zwift-event" | "no-route" | "error"; message?: string };

async function ownZwiftIds(teamId: string | null): Promise<Set<number>> {
  if (!teamId) return new Set();
  const admin = createAdminClient();
  const ids = new Set<number>();
  const { data: wtrl } = await admin.from("wtrl_teams").select("trc_ref").eq("team_id", teamId);
  const refs = (wtrl ?? []).map((row) => row.trc_ref as string);
  if (refs.length) {
    const { data } = await admin.from("wtrl_team_riders").select("zwift_id").in("trc_ref", refs);
    for (const row of data ?? []) ids.add(Number(row.zwift_id));
  }
  const { data: members } = await admin
    .from("team_members")
    .select("profiles(zwift_id)")
    .eq("team_id", teamId);
  for (const row of (members ?? []) as unknown as Array<{ profiles: unknown }>) {
    // Supabase typeert een to-one-join soms als lijst.
    const profiles = Array.isArray(row.profiles) ? row.profiles : [row.profiles];
    for (const profile of profiles as Array<{ zwift_id?: string | null } | null>) {
      const id = Number(profile?.zwift_id);
      if (id) ids.add(id);
    }
  }
  return ids;
}

export async function loadZrlLive(eventId: string): Promise<ZrlLiveOutcome> {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, title, type, team_id, zwift_event_id, teams(name)")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || event.type !== "zrl") return { status: "not-found" };
  if (!event.zwift_event_id) return { status: "no-zwift-event" };
  const teamName = (event.teams as { name?: string } | null)?.name ?? null;

  let data: RaceData;
  try {
    data = await fetchCachedRaceData(String(event.zwift_event_id));
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : undefined };
  }

  // Onze subgroep: waar de meeste van onze renners in staan.
  const own = await ownZwiftIds(event.team_id as string | null);
  const occupied = data.subgroups.filter((s) => s.entrants.length > 0);
  const subgroup = [...occupied].sort(
    (a, b) =>
      b.entrants.filter((e) => own.has(Number(e.zwiftId))).length -
      a.entrants.filter((e) => own.has(Number(e.zwiftId))).length,
  )[0];
  if (!subgroup) return { status: "no-route" };
  const route = subgroup.routeId ? routeSegments(subgroup.routeId, subgroup.laps) : null;
  if (!route) return { status: "no-route" };

  const leagueKey = zrlLeagueKey(data.eventName, subgroup.label, String(event.zwift_event_id));
  const { data: assignmentRows } = await admin
    .from("zrl_team_assignments")
    .select("zwift_id, team_label")
    .eq("league_key", leagueKey);
  const assignments = new Map(
    (assignmentRows ?? []).map((row) => [Number(row.zwift_id), String(row.team_label)]),
  );

  const ownTeam = teamName ? teamKey(teamName) : null;
  const teamLabels: Record<string, string> = ownTeam && teamName ? { [ownTeam]: teamName } : {};
  const riders: Rider[] = subgroup.entrants.map((entrant) => {
    const id = Number(entrant.zwiftId);
    // Eigen renners kennen we; daarna gaat de bijstelling van de ploegleider voor de tag.
    const label = assignments.get(id) ?? extractTeamTag(entrant.name);
    const team = own.has(id) && ownTeam ? ownTeam : label ? teamKey(label) || null : null;
    if (team && label && !teamLabels[team]) teamLabels[team] = label;
    return { athleteId: id, name: entrant.name, team };
  });

  const riderIds = new Set(riders.map((r) => r.athleteId));
  const lastActivity = Math.max(
    subgroup.startAt,
    ...data.passages.filter((p) => riderIds.has(p.athleteId)).map((p) => p.ts),
    ...subgroup.results.map((r) => subgroup.startAt + (r.durationMs ?? 0)),
  );
  const final =
    subgroup.results.length > 0 && data.fetchedAt - lastActivity > QUIET_BEFORE_FINAL_MS;

  const score = scoreRace({
    route: route.map(({ segmentId, name }) => ({ segmentId, name })),
    riders,
    passages: data.passages,
    startAt: subgroup.startAt,
    finishedAt: new Map(
      subgroup.results
        .filter((r) => r.durationMs != null)
        .map((r) => [r.profileId, subgroup.startAt + (r.durationMs as number) + 1000]),
    ),
    finish: { finishers: subgroup.results.map((r) => r.profileId), final },
  });

  return {
    status: "ok",
    view: {
      event: { id: event.id as string, title: event.title as string, teamName, zwiftEventId: String(event.zwift_event_id) },
      subgroupLabel: subgroup.label,
      startAt: subgroup.startAt,
      fetchedAt: data.fetchedAt,
      ownTeam,
      ownRiders: riders.filter((r) => own.has(r.athleteId)).map((r) => r.athleteId),
      leagueKey,
      entrants: riders,
      teamLabels,
      score,
    },
  };
}
