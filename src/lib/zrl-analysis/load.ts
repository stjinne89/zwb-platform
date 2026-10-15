import "server-only";

// Laden voor ZWBeter racen: welke races een lid mag zien, de analyse van de
// ploeg uit Zwift, en de eigen rit uit intervals.icu.
//
// Wie wat ziet (eigenaar, 2026-10-15): een lid alleen zijn eigen races (in de
// opstelling, of met de eigen Zwift-ID in de uitslag van het team); een captain
// alle races van de teams waar hij captain of co-captain is, ook de subteams
// van een hoofdteam; wie uitslagen of rosters beheert alles. De ploeganalyse
// toont alleen Zwift-data. De eigen rit leest met de sleutel van het lid zelf en
// is alleen voor dat lid.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentUserAccess } from "@/lib/auth/permissions";
import {
  fetchIntervalsActivities,
  fetchIntervalsActivityStreams,
  fetchIntervalsPowerCurve,
} from "@/lib/intervals/client";
import { loadZrlLive, loadZwiftRaceData, type RaceData } from "@/lib/zrl-live/snapshot";
import { analysePersonalRace, raceKindOf, type PersonalRace, type RaceKind } from "@/lib/zrl-analysis/personal";
import { loadFrrStandingRows } from "@/lib/frr/zwb-standings";
import { analyseRace, segmentKind, type RaceAnalysis } from "@/lib/zrl-analysis/race";
import { analyseRide, type RideAnalysis, type RideAnchor } from "@/lib/zrl-analysis/ride";
import { ownAdvice, personalAdvice, riderRaceAdvice, teamAdvice, type Advice } from "@/lib/zrl-analysis/advice";
import { routeSegments } from "@/lib/zwift/route-segments";
import { activityStartMs, pickRaceActivity, type ActivityWithStart } from "@/lib/zrl-analysis/activity";

type Access = Pick<CurrentUserAccess, "has">;

const BOARD_PERMISSIONS = ["teams.manage_results", "teams.manage_roster"] as const;
const CAPTAIN_ROLES = ["captain", "co-captain"];
/** Zo ver terug toont de lijst races. */
const LIST_DAYS = 120;

/** Waarom iemand een race mag zien; bepaalt ook welke tips er bovenaan staan. */
export type ViewerRole = "rider" | "captain" | "board";

export type ZrlRaceListItem = {
  id: string;
  /** Waar de analyse staat: per kalenderevent, of per Zwift-event voor een geplakte link. */
  href: string;
  /** ZRL-teamrace, FRR-tijdslot of een andere Zwift-race. */
  kind: "zrl" | "frr" | "zwift";
  title: string;
  startAt: string;
  teamName: string | null;
  ttt: boolean;
  /** Gereden of in de opstelling. */
  own: boolean;
  /** Van een team waar dit lid captain is. */
  captain: boolean;
};

function isBoard(access: Access) {
  return BOARD_PERMISSIONS.some((permission) => access.has(permission));
}

/** Teams waar dit lid captain of co-captain is, met de subteams van een hoofdteam. */
async function captainTeamIds(userId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const [{ data: roles }, { data: led }] = await Promise.all([
    admin.from("team_members").select("team_id").eq("profile_id", userId).in("role", CAPTAIN_ROLES),
    admin.from("teams").select("id").eq("captain_id", userId),
  ]);
  const ids = new Set([...(roles ?? []).map((r) => r.team_id as string), ...(led ?? []).map((t) => t.id as string)]);
  if (ids.size === 0) return ids;
  const { data: children } = await admin.from("teams").select("id").in("parent_team_id", [...ids]);
  for (const child of children ?? []) ids.add(child.id as string);
  return ids;
}

type EventRow = {
  id: string;
  title: string;
  start_at: string;
  zwift_event_type: string | null;
  team_id: string;
  parent_event_id: string | null;
  zwift_event_id: number | null;
  teams: { name?: string } | null;
};

const EVENT_COLUMNS = "id, title, start_at, zwift_event_type, team_id, parent_event_id, zwift_event_id, teams(name)";

/**
 * Teamraces die dit lid zelf reed: de opstelling (op de race of op de
 * raceweek erboven) of de eigen Zwift-ID in de bevroren uitslag, bij een team
 * waar het lid in zit of in de opstelling stond.
 */
async function ownRaceIds(userId: string, since: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const [{ data: lineups }, { data: memberships }, { data: profile }] = await Promise.all([
    admin.from("team_event_lineups").select("event_id, team_id").eq("profile_id", userId),
    admin.from("team_members").select("team_id").eq("profile_id", userId),
    admin.from("profiles").select("zwift_id").eq("id", userId).maybeSingle(),
  ]);
  const ids = new Set<string>();
  const lineupKeys = new Set((lineups ?? []).map((l) => `${l.event_id}:${l.team_id}`));
  const lineupEvents = [...new Set((lineups ?? []).map((l) => l.event_id as string))];
  if (lineupEvents.length) {
    const { data } = await admin
      .from("events")
      .select("id, team_id, parent_event_id")
      .eq("type", "zrl")
      .gte("start_at", since)
      .or(`id.in.(${lineupEvents.join(",")}),parent_event_id.in.(${lineupEvents.join(",")})`);
    for (const e of data ?? []) {
      if (lineupKeys.has(`${e.id}:${e.team_id}`) || lineupKeys.has(`${e.parent_event_id}:${e.team_id}`)) ids.add(e.id as string);
    }
  }
  const zwiftId = Number(profile?.zwift_id);
  const teamIds = [...new Set([...(memberships ?? []).map((m) => m.team_id as string), ...(lineups ?? []).map((l) => l.team_id as string)])];
  if (zwiftId && teamIds.length) {
    const { data: snaps } = await admin
      .from("zrl_race_snapshots")
      .select("zwift_event_id")
      .contains("data", { subgroups: [{ results: [{ profileId: zwiftId }] }] });
    const zwiftEvents = (snaps ?? []).map((s) => String(s.zwift_event_id));
    if (zwiftEvents.length) {
      const { data } = await admin
        .from("events")
        .select("id")
        .eq("type", "zrl")
        .gte("start_at", since)
        .in("zwift_event_id", zwiftEvents)
        .in("team_id", teamIds);
      for (const e of data ?? []) ids.add(e.id as string);
    }
  }
  return ids;
}

/** Gereden ZRL-races die dit lid mag zien: de eigen, en als captain die van zijn teams. */
export async function listZrlRaces(userId: string, access: Access): Promise<ZrlRaceListItem[]> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - LIST_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const board = isBoard(access);
  const [own, captainOf] = await Promise.all([ownRaceIds(userId, since), captainTeamIds(userId)]);
  if (!board && own.size === 0 && captainOf.size === 0) return [];

  let query = admin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("type", "zrl")
    .not("team_id", "is", null)
    .not("zwift_event_id", "is", null)
    .gte("start_at", since)
    .lte("start_at", new Date().toISOString())
    .order("start_at", { ascending: false })
    .limit(80);
  if (!board) {
    const filters = [
      own.size ? `id.in.(${[...own].join(",")})` : null,
      captainOf.size ? `team_id.in.(${[...captainOf].join(",")})` : null,
    ].filter(Boolean);
    query = query.or(filters.join(","));
  }
  const { data } = await query;
  return ((data ?? []) as unknown as EventRow[]).map((row) => ({
    id: row.id,
    href: `/zwbeter-worden/racen/${row.id}`,
    kind: "zrl" as const,
    title: row.title,
    startAt: row.start_at,
    teamName: row.teams?.name ?? null,
    ttt: row.zwift_event_type === "TEAM_TIME_TRIAL",
    own: own.has(row.id),
    captain: captainOf.has(row.team_id),
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
      viewer: ViewerRole;
      /** Lijn in de rennerstabel die het lid zelf is. */
      ownAthleteId: number | null;
      ride: RideOutcome;
      /** Tips voor het lid zelf, als hij reed. */
      ownTips: Advice[];
      /** Voor captain en bestuur: tips voor de ploeg en per renner. */
      teamTips: Advice[];
      riderTips: Array<{ athleteId: number; name: string; tips: Advice[] }>;
    }
  | { status: "not-found" }
  | { status: "no-access" }
  | { status: "no-data" };

/** Captain, bestuur of iemand uit de opstelling; null als alleen de uitslag nog kan beslissen. */
async function roleBeforeRace(
  eventRow: { id: string; team_id: string | null; parent_event_id: string | null },
  userId: string,
  access: Access,
): Promise<ViewerRole | null> {
  if (!eventRow.team_id) return isBoard(access) ? "board" : null;
  const admin = createAdminClient();
  const [captainOf, { count: lineup }] = await Promise.all([
    captainTeamIds(userId),
    admin
      .from("team_event_lineups")
      .select("profile_id", { count: "exact", head: true })
      .in("event_id", [eventRow.id, eventRow.parent_event_id].filter((id): id is string => Boolean(id)))
      .eq("team_id", eventRow.team_id)
      .eq("profile_id", userId),
  ]);
  if (captainOf.has(eventRow.team_id)) return "captain";
  if (isBoard(access)) return "board";
  return lineup ? "rider" : null;
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
  const before = await roleBeforeRace(eventRow as { id: string; team_id: string | null; parent_event_id: string | null }, user.id, access);
  // Zonder rol kan alleen de uitslag nog zeggen dat dit lid meereed.
  if (!before && ownZwiftId === null) return { status: "no-access" };
  if (Date.parse(eventRow.start_at as string) > Date.now()) return { status: "no-data" };

  const live = await loadZrlLive(eventId);
  if (live.status !== "ok") return { status: "no-data" };
  const view = live.view;
  const rode = ownZwiftId !== null && view.ownRiders.includes(ownZwiftId);
  const viewer: ViewerRole | null = before ?? (rode ? "rider" : null);
  if (!viewer) return { status: "no-access" };

  const data = await loadZwiftRaceData(view.event.zwiftEventId);
  const subgroup = data?.subgroups.find((s) => s.startAt === view.startAt && s.label === view.subgroupLabel);
  const { data: members } = view.ownRiders.length
    ? await admin.from("profiles").select("zwift_id, display_name").in("zwift_id", view.ownRiders.map(String))
    : { data: [] };
  const names = new Map(
    (members ?? []).flatMap((m) => (m.display_name ? [[Number(m.zwift_id), String(m.display_name)] as const] : [])),
  );
  const analysis = analyseRace(view, subgroup?.results ?? [], data?.passages ?? [], names);
  const ftp = Number(profile?.ftp_watts) || null;

  const ride = rode && data && subgroup
    ? await loadOwnRide({ data, subgroup, zwiftId: ownZwiftId as number, ftp, userId: user.id, supabase })
    : ({ status: "not-riding" } as const);

  const ownRider = rode ? analysis.riders.find((r) => r.athleteId === ownZwiftId) ?? null : null;
  const leads = viewer === "captain" || viewer === "board";
  return {
    status: "ok",
    event: {
      id: eventRow.id as string,
      title: eventRow.title as string,
      startAt: eventRow.start_at as string,
      teamName: ((eventRow.teams as { name?: string } | null)?.name ?? null) as string | null,
    },
    analysis,
    viewer,
    ownAthleteId: rode ? ownZwiftId : null,
    ride,
    ownTips: rode ? ownAdvice(analysis, ownRider, ride.status === "ok" ? ride.analysis : null, ftp) : [],
    teamTips: leads ? teamAdvice(analysis) : [],
    riderTips: leads
      ? analysis.riders
          .filter((r) => r.athleteId !== ownZwiftId)
          .map((r) => ({ athleteId: r.athleteId, name: r.name, tips: riderRaceAdvice(analysis, r) }))
          .filter((r) => r.tips.length > 0)
      : [],
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

// ---------------------------------------------------------------------------
// Individuele Zwift-races: FRR-etappes, andere races uit de kalender en races
// waarvan een lid de Zwift-link plakte (eigenaar, 2026-10-15). Alleen voor wie
// meereed; andere ZWB'ers in de race staan er met plek en tijd bij, zoals FRR
// en Zwift die ook openbaar tonen.

/** Zwift-ID → naam van iedereen die bij ZWB hoort: profiel, anders het roster. */
export async function zwbRiderNames(): Promise<Map<number, string>> {
  const admin = createAdminClient();
  const [{ data: members }, { data: roster }] = await Promise.all([
    admin.from("profiles").select("display_name, zwift_id").not("zwift_id", "is", null),
    admin.from("roster_entries").select("name, zwift_id").not("zwift_id", "is", null),
  ]);
  const names = new Map<number, string>();
  for (const row of roster ?? []) {
    const id = Number(row.zwift_id);
    if (id && row.name) names.set(id, String(row.name));
  }
  for (const row of members ?? []) {
    const id = Number(row.zwift_id);
    if (id && row.display_name) names.set(id, String(row.display_name));
  }
  return names;
}

export type FrrContext = {
  stage: number;
  /** ZWB'ers in deze etappe, over alle tijdsloten. */
  peers: Array<{ zwiftId: number; name: string; pen: string | null; slot: string; timeS: number; own: boolean }>;
  /** Eigen plek in het klassement van FRR, na de laatst verwerkte etappe. */
  gc: { position: number; genderClass: string; egapS: number | null; afterStage: number } | null;
};

/** Laatste deel van de slottitel: "FRR Ignite · Etappe 8 · Koninginnenrit · 19:30" → "19:30". */
function slotLabel(title: string | null) {
  return (title ?? "").split("·").pop()?.trim() ?? "";
}

async function loadFrrContext(tourId: string, stage: number, zwiftId: number, names: Map<number, string>): Promise<FrrContext> {
  const admin = createAdminClient();
  const [{ data: results }, { data: slots }, gcRows] = await Promise.all([
    admin.from("frr_stage_results").select("slot_event_id, zwift_id, pen, time_s").eq("tour_id", tourId).eq("stage", stage).limit(5000),
    admin.from("events").select("id, title").eq("frr_tour_id", tourId).eq("frr_stage", stage),
    loadFrrStandingRows(admin, tourId, { zwiftIds: [String(zwiftId)] }),
  ]);
  const slotTitle = new Map((slots ?? []).map((e) => [e.id as string, slotLabel(e.title as string | null)]));
  const peers = (results ?? [])
    .filter((r) => names.has(Number(r.zwift_id)) || Number(r.zwift_id) === zwiftId)
    .map((r) => ({
      zwiftId: Number(r.zwift_id),
      name: names.get(Number(r.zwift_id)) ?? "Jij",
      pen: (r.pen as string | null) ?? null,
      slot: slotTitle.get(r.slot_event_id as string) ?? "",
      timeS: Number(r.time_s),
      own: Number(r.zwift_id) === zwiftId,
    }))
    .sort((a, b) => (a.pen ?? "").localeCompare(b.pen ?? "") || a.timeS - b.timeS);
  const gc = [...gcRows].sort((a, b) => b.after_stage - a.after_stage)[0];
  return {
    stage,
    peers,
    gc: gc
      ? {
          position: gc.position,
          genderClass: gc.gender_class,
          egapS: gc.egap_s === null || gc.egap_s === undefined ? null : Number(gc.egap_s),
          afterStage: gc.after_stage,
        }
      : null,
  };
}

export type PersonalRaceOutcome =
  | {
      status: "ok";
      title: string;
      startAt: number;
      kind: RaceKind;
      race: PersonalRace;
      ride: RideOutcome;
      tips: Advice[];
      frr: FrrContext | null;
      /** Het kalenderevent, voor de link naar de eventpagina; null bij een geplakte link. */
      calendarEventId: string | null;
    }
  | { status: "not-found" }
  | { status: "no-zwift-id" }
  | { status: "not-riding" }
  | { status: "no-data" };

type CalendarRace = { id: string; title: string; zwiftEventType: string | null; frrTourId: string | null; frrStage: number | null };

async function loadPersonal(
  zwiftEventId: string,
  user: { id: string },
  supabase: SupabaseClient,
  calendar: CalendarRace | null,
): Promise<PersonalRaceOutcome> {
  const { data: profile } = await supabase.from("profiles").select("zwift_id, ftp_watts").eq("id", user.id).maybeSingle();
  const zwiftId = Number(profile?.zwift_id) || null;
  if (!zwiftId) return { status: "no-zwift-id" };
  const names = await zwbRiderNames();
  const data = await loadZwiftRaceData(zwiftEventId, { keepDetailsOf: new Set([...names.keys(), zwiftId]), requireRider: zwiftId });
  if (!data) return { status: "not-riding" };
  const kind = raceKindOf(data.eventType ?? calendar?.zwiftEventType, calendar?.title ?? data.eventName);
  const race = analysePersonalRace(data, zwiftId, names, kind);
  if (!race) return { status: "not-riding" };
  const subgroup = data.subgroups.find((s) => s.results.some((r) => r.profileId === zwiftId));
  const ftp = Number(profile?.ftp_watts) || null;
  const [ride, frr] = await Promise.all([
    subgroup
      ? loadOwnRide({ data, subgroup, zwiftId, ftp, userId: user.id, supabase })
      : Promise.resolve<RideOutcome>({ status: "not-riding" }),
    calendar?.frrTourId && calendar.frrStage
      ? loadFrrContext(calendar.frrTourId, calendar.frrStage, zwiftId, names)
      : Promise.resolve(null),
  ]);
  return {
    status: "ok",
    title: calendar?.title ?? data.eventName,
    startAt: race.startAt,
    kind,
    race,
    ride,
    tips: personalAdvice(race, ride.status === "ok" ? ride.analysis : null, ftp),
    frr,
    calendarEventId: calendar?.id ?? null,
  };
}

/** Een Zwift-race uit de kalender die geen ZRL is: een FRR-tijdslot of een andere race. */
export async function loadCalendarPersonalRace(eventId: string, user: { id: string }, supabase: SupabaseClient): Promise<PersonalRaceOutcome> {
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return { status: "not-found" };
  const { data: event } = await createAdminClient()
    .from("events")
    .select("id, title, type, start_at, zwift_event_id, zwift_event_type, frr_tour_id, frr_stage")
    .eq("id", eventId)
    .maybeSingle();
  if (!event?.zwift_event_id || event.type === "zrl") return { status: "not-found" };
  if (Date.parse(event.start_at as string) > Date.now()) return { status: "no-data" };
  return loadPersonal(String(event.zwift_event_id), user, supabase, {
    id: event.id as string,
    title: event.title as string,
    zwiftEventType: (event.zwift_event_type as string | null) ?? null,
    frrTourId: (event.frr_tour_id as string | null) ?? null,
    frrStage: (event.frr_stage as number | null) ?? null,
  });
}

/** Het type van een kalenderevent, om te kiezen tussen de ZRL-pagina en de eigen race. */
export async function raceEventType(eventId: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return null;
  const { data } = await createAdminClient().from("events").select("type").eq("id", eventId).maybeSingle();
  return (data?.type as string | undefined) ?? null;
}

/** Het kalenderevent bij een Zwift-event, als dat er is: dan hoort de analyse daar. */
export async function calendarEventForZwift(zwiftEventId: string): Promise<string | null> {
  if (!/^\d+$/.test(zwiftEventId)) return null;
  const { data } = await createAdminClient()
    .from("events")
    .select("id, type, team_id")
    .eq("zwift_event_id", zwiftEventId)
    .order("start_at", { ascending: true })
    .limit(10);
  const rows = (data ?? []) as Array<{ id: string; type: string; team_id: string | null }>;
  // Een ZRL-race hoort bij het teamevent; de raceweek erboven heeft geen team.
  return rows.find((r) => r.type !== "zrl" || r.team_id)?.id ?? null;
}

/** Een Zwift-race buiten de kalender, via een geplakte link. Alleen als het lid meereed. */
export async function loadZwiftLinkRace(zwiftEventId: string, user: { id: string }, supabase: SupabaseClient): Promise<PersonalRaceOutcome> {
  if (!/^\d+$/.test(zwiftEventId)) return { status: "not-found" };
  return loadPersonal(zwiftEventId, user, supabase, null);
}

/**
 * Alle races van dit lid: ZRL (eigen en als captain), en individuele Zwift-races
 * die het reed: FRR-tijdsloten met een eigen finishtijd, en elke bewaarde race
 * met het eigen Zwift-ID in de uitslag (ook geplakte links).
 */
export async function listRaces(userId: string, access: Access): Promise<ZrlRaceListItem[]> {
  const admin = createAdminClient();
  const since = Date.now() - LIST_DAYS * 24 * 60 * 60 * 1000;
  const [zrl, { data: profile }] = await Promise.all([
    listZrlRaces(userId, access),
    admin.from("profiles").select("zwift_id").eq("id", userId).maybeSingle(),
  ]);
  const zwiftId = Number(profile?.zwift_id);
  if (!zwiftId) return zrl;

  const [{ data: frrRows }, { data: snaps }] = await Promise.all([
    admin.from("frr_stage_results").select("slot_event_id").eq("zwift_id", String(zwiftId)),
    admin
      .from("zrl_race_snapshots")
      .select("zwift_event_id, name:data->>eventName, start:data->subgroups->0->>startAt")
      .contains("data", { subgroups: [{ results: [{ profileId: zwiftId }] }] }),
  ]);
  const snapshots = (snaps ?? []) as unknown as Array<{ zwift_event_id: string | number; name: string | null; start: string | null }>;
  const slotIds = [...new Set((frrRows ?? []).map((r) => r.slot_event_id as string))];
  const zwiftIds = snapshots.map((s) => String(s.zwift_event_id));
  const columns = "id, title, type, start_at, zwift_event_id, zwift_event_type";
  const [bySlot, byZwift] = await Promise.all([
    slotIds.length ? admin.from("events").select(columns).in("id", slotIds) : Promise.resolve({ data: [] }),
    zwiftIds.length ? admin.from("events").select(columns).in("zwift_event_id", zwiftIds) : Promise.resolve({ data: [] }),
  ]);
  type Row = { id: string; title: string; type: string; start_at: string; zwift_event_id: number | string | null; zwift_event_type: string | null };
  const calendar = [...((bySlot.data ?? []) as Row[]), ...((byZwift.data ?? []) as Row[])];
  const inCalendar = new Set(calendar.map((e) => String(e.zwift_event_id)));
  const items = new Map<string, ZrlRaceListItem>();
  for (const e of calendar) {
    if (e.type === "zrl" || !e.zwift_event_id || Date.parse(e.start_at) < since || Date.parse(e.start_at) > Date.now()) continue;
    items.set(e.id, {
      id: e.id,
      href: `/zwbeter-worden/racen/${e.id}`,
      kind: e.type === "flamme_rouge" ? "frr" : "zwift",
      title: e.title,
      startAt: e.start_at,
      teamName: null,
      ttt: e.zwift_event_type === "TEAM_TIME_TRIAL",
      own: true,
      captain: false,
    });
  }
  for (const snap of snapshots) {
    const id = String(snap.zwift_event_id);
    const start = Number(snap.start);
    if (inCalendar.has(id) || !Number.isFinite(start) || start < since) continue;
    items.set(`zwift-${id}`, {
      id: `zwift-${id}`,
      href: `/zwbeter-worden/racen/zwift/${id}`,
      kind: "zwift",
      title: snap.name || `Zwift-race ${id}`,
      startAt: new Date(start).toISOString(),
      teamName: null,
      ttt: false,
      own: true,
      captain: false,
    });
  }
  return [...zrl, ...items.values()].sort((a, b) => b.startAt.localeCompare(a.startAt));
}
