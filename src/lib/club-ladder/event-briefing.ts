import "server-only";

// Laden voor het racebriefje van een ladderrace (/events/[id]/briefing). Zelfde
// briefje en opslag (race_briefings) als de ZRL; het veld zijn de vijf van de
// tegenstander uit de matchup, de telling is die van de ladder (briefing.ts).
// Geen WTRL, geen divisiegrenzen, geen punten onderweg.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurrentUserAccess } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPacingRoute } from "@/lib/pacing/route-loader";
import { archPowerups, powerupChances, startingPowerup } from "@/lib/zwift/powerups";
import { archPowerupList, powerupOddsWithArches, type PowerupOdds } from "@/lib/race-briefing/arches";
import { routeKeyPoints } from "@/lib/race-briefing/route";
import { powerupsFromTags } from "@/lib/race-briefing/rules";
import { defaultSheet, effectiveSheet, sanitizeOverride } from "@/lib/race-briefing/sheet";
import {
  bikeAdviceFor,
  cachedZwiftEvent,
  canEditBriefing,
  type BriefingOutcome,
  type BriefingWarning,
  type OwnBriefingRider,
} from "@/lib/race-briefing/load";
import { zwiftRacingConfigured } from "@/lib/zwiftracing/client";
import {
  keyDuration,
  ladderCheatRules,
  ladderMoments,
  ladderPowerupOdds,
  ladderPowerups,
  ladderRiders,
  ladderRoles,
  type LadderRole,
  ladderWatch,
  LADDER_TEAM_SIZE,
  matchupWeights,
  projectLadder,
} from "./briefing";
import { loadLadderEventMatchup } from "./event-matchup";
import { ladderChallengerFromTitle, ladderOpponentFromTitle } from "./fixture-events";

type Access = Pick<CurrentUserAccess, "has">;

/** zFTP uit de 20 minuten, voor het fietsadvies (gangbare vuistregel). */
const FTP_FROM_20_MIN = 0.95;

type EventRow = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  description: string | null;
  team_id: string | null;
  zwift_event_id: number | null;
  zwift_route_id: number | null;
  laps: number | null;
  gpx_path: string | null;
  distance_km: number | null;
  elevation_m: number | null;
  teams: { name?: string } | null;
};

const NO_LIMITS = { zftpShare: null, zmapShare: null, status: "ok" as const };

export async function loadLadderBriefing(
  eventId: string,
  user: { id: string },
  access: Access,
  supabase: SupabaseClient,
): Promise<BriefingOutcome> {
  const admin = createAdminClient();
  const { data: eventData } = await admin
    .from("events")
    .select("id, title, type, start_at, description, team_id, zwift_event_id, zwift_route_id, laps, gpx_path, distance_km, elevation_m, teams(name)")
    .eq("id", eventId)
    .maybeSingle();
  const event = eventData as unknown as EventRow | null;
  if (!event || event.type !== "ladder" || !event.team_id) return { status: "not-found" };
  const teamName = event.teams?.name ?? null;
  const zwiftEventId = event.zwift_event_id ? String(event.zwift_event_id) : null;

  const [matchupResult, zwiftEvent, routeResult, planRow, canEdit] = await Promise.all([
    loadLadderEventMatchup(admin, event.id, event).catch(() => null),
    zwiftEventId ? cachedZwiftEvent(zwiftEventId).catch(() => null) : Promise.resolve(null),
    loadPacingRoute(supabase, event),
    admin.from("race_briefings").select("plan, roles, sheet, updated_at").eq("event_id", event.id).maybeSingle(),
    canEditBriefing(user.id, access, event.team_id),
  ]);

  const matchup = matchupResult?.matchup ?? null;
  const opponent = matchup?.theirs.name ?? (teamName ? ladderOpponentFromTitle(event.title, teamName) : null) ?? "de tegenstander";
  const challenger = teamName ? ladderChallengerFromTitle(event.title, teamName) : null;
  const weights = matchupWeights(matchup);

  const riders = matchup ? ladderRiders(matchup, weights) : [];
  const projection = riders.length > 0 ? projectLadder(riders, challenger === true) : null;
  const placeOf = new Map(projection?.order.filter((row) => row.rating !== null).map((row) => [row.zwiftId, row.place]) ?? []);

  const loadedRoute = routeResult.ok ? routeResult.loaded : null;
  const keyPoints = loadedRoute
    ? routeKeyPoints({
        segments: loadedRoute.route.segments,
        accents: loadedRoute.route.accents,
        totalKm: loadedRoute.route.totalKm,
        laps: event.laps ?? 1,
        lapSegments: loadedRoute.lapSegments,
      })
    : null;

  const ourRiders = riders.filter((rider) => rider.own);
  const savedRoles = (planRow.data?.roles ?? {}) as Record<string, unknown>;
  const roles = projection ? ladderRoles(projection) : new Map<number, LadderRole>();
  const own: OwnBriefingRider[] = ourRiders.map((rider) => {
    const saved = savedRoles[String(rider.zwiftId)];
    return {
      zwiftId: rider.zwiftId,
      name: rider.name,
      inPen: true,
      inLineup: matchup?.ours.lineup ?? false,
      role: roles.get(rider.zwiftId)?.role ?? "aanhaken",
      captainRole: typeof saved === "string" ? saved.trim() || null : null,
      zftpWkg: null,
      zmapWkg: null,
      limits: NO_LIMITS,
      limitWatts: null,
      metrics: null,
      history: [],
      expectedPlace: placeOf.get(rider.zwiftId) ?? null,
      targets: { ahead: roles.get(rider.zwiftId)?.ahead ?? null, behind: roles.get(rider.zwiftId)?.behind ?? null },
    };
  });

  const warnings: BriefingWarning[] = [];
  if (matchup) {
    const count = matchup.ours.riders.length;
    if (!matchup.ours.lineup) warnings.push({ kind: "lineup", text: count > 0 ? `Nog geen opstelling op de ladder; ${count} ${matchup.ours.selection ? "in de selectie" : "aangemeld"}.` : "Nog niemand aangemeld op de ladder." });
    else if (count < LADDER_TEAM_SIZE) warnings.push({ kind: "starters", text: `${count} van de ${LADDER_TEAM_SIZE} startplekken ingevuld.` });
  }

  const tagPowerups = powerupsFromTags(zwiftEvent?.tags);
  const powerups = tagPowerups.length > 0 ? tagPowerups : ladderPowerups(event.description);
  const subgroupTags = zwiftEvent?.subgroups?.find((g) => archPowerups(g.tags) !== null)?.tags ?? zwiftEvent?.subgroups?.[0]?.tags ?? null;
  const chances: PowerupOdds[] = powerupChances(subgroupTags) ?? powerupChances(zwiftEvent?.tags) ?? ladderPowerupOdds(event.description);
  const arches = archPowerups(subgroupTags);
  const archList = keyPoints
    ? archPowerupList({
        segments: keyPoints.segments,
        totalKm: keyPoints.totalKm,
        arches,
        start: startingPowerup(subgroupTags),
        random: chances.length > 0,
      })
    : [];
  const powerupOdds = powerupOddsWithArches(chances, arches, archList);

  const ownFtp = ourRiders.map((rider) => rider.wkg?.m20).filter((v): v is number => v != null && v > 0).map((v) => v * FTP_FROM_20_MIN);
  const bikes = loadedRoute?.route.source === "zwift" ? await bikeAdviceFor(event.id, loadedRoute.route, "scratch", ownFtp, user.id) : null;

  const proposal = defaultSheet({
    format: "scratch",
    category: null,
    route: keyPoints,
    powerups,
    own: own.map((r) => ({ zwiftId: r.zwiftId, name: r.name, role: r.role, limits: r.limits })),
    watch: [],
    warnings: warnings.map((w) => w.text),
  });
  const sheetDefaults = {
    ...proposal,
    moments: ladderMoments({ route: keyPoints, powerups, own }),
    rules: ladderCheatRules({ challenger, opponent, projection }),
    watch: projection ? ladderWatch(projection, weights) : [],
  };
  const sheet = effectiveSheet(sheetDefaults, planRow.data ? sanitizeOverride((planRow.data as { sheet?: unknown }).sheet) : null);

  return {
    status: "ok",
    view: {
      kind: "ladder",
      ladder: {
        opponent,
        challenger,
        lineup: matchup?.ours.lineup ?? false,
        projection,
        keyDuration: keyDuration(weights),
        routeLabel: matchupResult?.routeLabel ?? null,
      },
      event: { id: event.id, title: event.title, startAt: event.start_at, teamId: event.team_id, teamName, zwiftEventId },
      sheet,
      sheetDefaults,
      format: "scratch",
      formatRules: [],
      division: null,
      subgroupLabel: null,
      route: loadedRoute && keyPoints ? { loaded: loadedRoute, keyPoints } : null,
      bikes,
      segmentRecords: [],
      powerups,
      archPowerups: archList,
      powerupOdds,
      historyLabels: [],
      field: [],
      projection: null,
      teamLabels: {},
      watch: [],
      own,
      warnings,
      tips: [],
      plan: planRow.data ? { text: (planRow.data.plan as string | null) ?? null, updatedAt: (planRow.data.updated_at as string | null) ?? null } : null,
      canEdit,
      zwiftRacing: zwiftRacingConfigured(),
      fieldMissing: matchup && riders.length > 0 ? null : "no-entrants",
    },
  };
}
