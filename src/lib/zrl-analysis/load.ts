import "server-only";

// Laden voor ZWBeter racen: welke races een lid mag zien, de analyse van de
// ploeg uit Zwift, en de eigen rit uit intervals.icu.
//
// Wie mag kijken: leden van het team van het event, wie in de opstelling stond,
// wie met de eigen Zwift-ID in de race van het team reed, en wie uitslagen of
// rosters beheert. De ploeganalyse toont alleen Zwift-data. De eigen rit leest
// met de sleutel van het lid zelf en is alleen voor dat lid.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentUserAccess } from "@/lib/auth/permissions";
import {
  fetchIntervalsActivities,
  fetchIntervalsActivityStreams,
  fetchIntervalsPowerCurve,
} from "@/lib/intervals/client";
import { loadZrlLive, loadZrlRaceData, type RaceData } from "@/lib/zrl-live/snapshot";
import { analyseRace, segmentKind, type RaceAnalysis } from "@/lib/zrl-analysis/race";
import { analyseRide, type RideAnalysis, type RideAnchor } from "@/lib/zrl-analysis/ride";
import { routeSegments } from "@/lib/zwift/route-segments";
import { activityStartMs, pickRaceActivity, type ActivityWithStart } from "@/lib/zrl-analysis/activity";

type Access = Pick<CurrentUserAccess, "has">;

const BOARD_PERMISSIONS = ["teams.manage_results", "teams.manage_roster"] as const;
/** Zo ver terug toont de lijst races. */
const LIST_DAYS = 120;

export type ZrlRaceListItem = {
  id: string;
  title: string;
  startAt: string;
  teamName: string | null;
  ttt: boolean;
};

function isBoard(access: Access) {
  return BOARD_PERMISSIONS.some((permission) => access.has(permission));
}

/** Gereden ZRL-races van de eigen teams; bestuur en ploegleiding zien alle teams. */
export async function listZrlRaces(userId: string, access: Access): Promise<ZrlRaceListItem[]> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - LIST_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let query = admin
    .from("events")
    .select("id, title, start_at, zwift_event_type, team_id, teams(name)")
    .eq("type", "zrl")
    .not("team_id", "is", null)
    .not("zwift_event_id", "is", null)
    .gte("start_at", since)
    .lte("start_at", new Date().toISOString())
    .order("start_at", { ascending: false })
    .limit(60);
  if (!isBoard(access)) {
    const [{ data: memberships }, { data: lineups }] = await Promise.all([
      admin.from("team_members").select("team_id").eq("profile_id", userId),
      admin.from("team_event_lineups").select("team_id").eq("profile_id", userId),
    ]);
    const teamIds = [...new Set([...(memberships ?? []), ...(lineups ?? [])].map((row) => row.team_id as string))];
    if (teamIds.length === 0) return [];
    query = query.in("team_id", teamIds);
  }
  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    startAt: row.start_at as string,
    teamName: ((row.teams as { name?: string } | null)?.name ?? null) as string | null,
    ttt: row.zwift_event_type === "TEAM_TIME_TRIAL",
  }));
}

export type RideOutcome =
  | { status: "ok"; analysis: RideAnalysis; ftp: number | null; activityName: string | null }
  | { status: "not-riding" }
  | { status: "no-intervals" }
  | { status: "no-ride" }
  | { status: "strava-only" }
  | { status: "error" };

export type RaceAnalysisOutcome =
  | {
      status: "ok";
      event: { id: string; title: string; startAt: string; teamName: string | null };
      analysis: RaceAnalysis;
      /** Lijn in de rennerstabel die het lid zelf is. */
      ownAthleteId: number | null;
      ride: RideOutcome;
    }
  | { status: "not-found" }
  | { status: "no-access" }
  | { status: "no-data" };

async function mayView(eventRow: { id: string; team_id: string | null; parent_event_id: string | null }, userId: string, access: Access) {
  if (isBoard(access)) return true;
  if (!eventRow.team_id) return false;
  const admin = createAdminClient();
  const [{ count: members }, { count: lineup }] = await Promise.all([
    admin.from("team_members").select("profile_id", { count: "exact", head: true }).eq("team_id", eventRow.team_id).eq("profile_id", userId),
    admin
      .from("team_event_lineups")
      .select("profile_id", { count: "exact", head: true })
      .in("event_id", [eventRow.id, eventRow.parent_event_id].filter((id): id is string => Boolean(id)))
      .eq("team_id", eventRow.team_id)
      .eq("profile_id", userId),
  ]);
  return Boolean(members) || Boolean(lineup);
}

export async function loadRaceAnalysis(
  eventId: string,
  user: { id: string },
  access: Access,
  supabase: SupabaseClient,
): Promise<RaceAnalysisOutcome> {
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return { status: "not-found" };
  const admin = createAdminClient();
  const [{ data: eventRow }, { data: profile }] = await Promise.all([
    admin
      .from("events")
      .select("id, title, type, start_at, team_id, parent_event_id, zwift_event_id, teams(name)")
      .eq("id", eventId)
      .maybeSingle(),
    supabase.from("profiles").select("zwift_id, ftp_watts").eq("id", user.id).maybeSingle(),
  ]);
  if (!eventRow || eventRow.type !== "zrl" || !eventRow.zwift_event_id) return { status: "not-found" };

  const ownZwiftId = Number(profile?.zwift_id) || null;
  const allowed = await mayView(eventRow as { id: string; team_id: string | null; parent_event_id: string | null }, user.id, access);
  // Zonder band met het team kan alleen een renner van de race nog kijken.
  if (!allowed && ownZwiftId === null) return { status: "no-access" };
  if (Date.parse(eventRow.start_at as string) > Date.now()) return { status: "no-data" };

  const live = await loadZrlLive(eventId);
  if (live.status !== "ok") return { status: "no-data" };
  const view = live.view;
  const rode = ownZwiftId !== null && view.ownRiders.includes(ownZwiftId);
  if (!allowed && !rode) return { status: "no-access" };

  const data = await loadZrlRaceData(view.event.zwiftEventId);
  const subgroup = data?.subgroups.find((s) => s.startAt === view.startAt && s.label === view.subgroupLabel);
  const analysis = analyseRace(view, subgroup?.results ?? [], data?.passages ?? []);

  const ride = rode && data && subgroup
    ? await loadOwnRide({ data, subgroup, zwiftId: ownZwiftId as number, ftp: Number(profile?.ftp_watts) || null, userId: user.id, supabase })
    : ({ status: "not-riding" } as const);

  return {
    status: "ok",
    event: {
      id: eventRow.id as string,
      title: eventRow.title as string,
      startAt: eventRow.start_at as string,
      teamName: ((eventRow.teams as { name?: string } | null)?.name ?? null) as string | null,
    },
    analysis,
    ownAthleteId: rode ? ownZwiftId : null,
    ride,
  };
}

async function loadOwnRide({
  data,
  subgroup,
  zwiftId,
  ftp,
  userId,
  supabase,
}: {
  data: RaceData;
  subgroup: RaceData["subgroups"][number];
  zwiftId: number;
  ftp: number | null;
  userId: string;
  supabase: SupabaseClient;
}): Promise<RideOutcome> {
  const result = subgroup.results.find((r) => r.profileId === zwiftId);
  if (!result?.durationMs) return { status: "not-riding" };
  const { data: connection } = await supabase
    .from("intervals_connections")
    .select("athlete_id, api_key")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!connection?.api_key || !connection.athlete_id) return { status: "no-intervals" };

  const ownStart = result.finishedAt ? result.finishedAt - result.durationMs : subgroup.startAt;
  try {
    const days = Math.min(LIST_DAYS, Math.ceil((Date.now() - ownStart) / (24 * 60 * 60 * 1000)) + 1);
    const activities = (await fetchIntervalsActivities(connection.api_key, connection.athlete_id, days)) as ActivityWithStart[];
    const activity = pickRaceActivity(activities, ownStart);
    if (!activity) return { status: "no-ride" };
    // Een rit die via Strava binnenkwam, heeft bij intervals.icu geen streams.
    if (!String(activity.id).startsWith("i") || activity.source === "STRAVA") return { status: "strava-only" };
    const fileStart = activityStartMs(activity) as number;

    const [streams, curve] = await Promise.all([
      fetchIntervalsActivityStreams(connection.api_key, String(activity.id), ["time", "watts", "heartrate", "cadence"]),
      fetchIntervalsPowerCurve(connection.api_key, connection.athlete_id, "90d").catch(() => null),
    ]);
    const byType = new Map(streams.map((s) => [s.type, s.data]));
    const time = (byType.get("time") ?? []).map((t) => Number(t));
    const watts = byType.get("watts") ?? [];
    if (time.length === 0 || watts.length === 0) return { status: "no-ride" };

    const anchors: RideAnchor[] = data.passages
      .filter((p) => p.athleteId === zwiftId && p.ts >= ownStart && p.ts <= ownStart + result.durationMs! + 10_000)
      .sort((a, b) => a.ts - b.ts)
      .flatMap((p) => {
        const name = routeName(subgroup, p.segmentId);
        return [{ name, end: (p.ts - ownStart) / 1000, elapsed: p.elapsed, avgPower: p.avgPower ?? null, climb: segmentKind(name) === "klim" }];
      });

    const analysis = analyseRide({
      streams: { time, watts, heartrate: byType.get("heartrate"), cadence: byType.get("cadence") },
      startOffset: (fileStart - ownStart) / 1000,
      finish: result.durationMs / 1000,
      anchors,
      ftp,
      curve: (curve?.points ?? []).map((p) => ({ seconds: p.seconds, watts: p.watts })),
    });
    return { status: "ok", analysis, ftp, activityName: activity.name ?? null };
  } catch {
    return { status: "error" };
  }
}

/** Naam van een segment op de route van deze subgroep. */
function routeName(subgroup: RaceData["subgroups"][number], segmentId: string): string {
  const refs = subgroup.routeId ? routeSegments(subgroup.routeId, subgroup.laps) : null;
  return refs?.find((ref) => ref.segmentId === segmentId)?.name ?? segmentId;
}
