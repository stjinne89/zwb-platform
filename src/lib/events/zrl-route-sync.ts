// Zet ZRL-teamevents op de route van hun eigen subgroep.
//
// Een Zwift-event geeft bij de ZRL de route van C/D op, ook als A/B een andere
// rijden (2026-10-06: event Urumaze, A en B Makuri 40). "Ophalen" in het
// eventformulier kiest sinds die dag de eigen groep; dit zet events recht die
// eerder zijn opgehaald, of waarvan WTRL de route achteraf wijzigt. Draait mee
// met de uurlijkse Zwift-eventspiegel en leest alleen de publieke event-API.

import {
  eventForSubgroup,
  eventRouteTotals,
  fetchZwiftPublicEvent,
  pickOwnSubgroup,
  routeFromZwiftId,
  zrlCategoryFromTeamName,
  type ZwiftEventInfo,
} from "@/lib/events/zwift-route";

/** Zo ver vooruit: de raceweek die eraan komt. */
const HORIZON_MS = 3 * 24 * 60 * 60 * 1000;

type SupabaseClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

type StoredRoute = {
  zwift_route_id: number | string | null;
  gpx_path: string | null;
};

export type ZrlRouteUpdate = {
  zwift_route_id: number;
  laps: number;
  distance_km?: number;
  elevation_m?: number;
};

/**
 * Wat er aan een teamevent moet veranderen, of null als het al klopt. Puur.
 * Zonder eigen subgroep of zonder bekende route blijft het event zoals het is.
 */
export function zrlRouteUpdate(
  stored: StoredRoute,
  info: ZwiftEventInfo,
  category: string | null,
): ZrlRouteUpdate | null {
  const own = pickOwnSubgroup(info.subgroups, category);
  if (!own) return null;
  const event = eventForSubgroup(info, own);
  const totals = eventRouteTotals(event);
  if (!event.route || !totals) return null;
  if (Number(stored.zwift_route_id) === event.route.routeId) return null;
  return {
    zwift_route_id: event.route.routeId,
    laps: totals.laps,
    // Een geüploade GPX gaat voor, net als in het eventformulier.
    ...(stored.gpx_path ? {} : { distance_km: totals.distanceKm, elevation_m: totals.elevationM }),
  };
}

export type ZrlRouteSyncResult = {
  checked: number;
  updated: string[];
  notes: string[];
};

export async function syncZrlSubgroupRoutes(
  admin: SupabaseClient,
  options: { now?: Date; deadline?: number } = {},
): Promise<ZrlRouteSyncResult> {
  const now = options.now ?? new Date();
  const result: ZrlRouteSyncResult = { checked: 0, updated: [], notes: [] };

  const { data: events, error } = await admin
    .from("events")
    .select("id, title, team_id, zwift_event_id, zwift_route_id, gpx_path")
    .eq("type", "zrl")
    .not("team_id", "is", null)
    .not("zwift_event_id", "is", null)
    .gte("start_at", now.toISOString())
    .lte("start_at", new Date(now.getTime() + HORIZON_MS).toISOString());
  if (error) {
    result.notes.push(error.message);
    return result;
  }
  type EventRow = StoredRoute & {
    id: string;
    title: string;
    team_id: string;
    zwift_event_id: number | string;
  };
  const rows = (events ?? []) as EventRow[];
  if (rows.length === 0) return result;

  // De categorieletter staat in de teamnaam, of in die van het hoofdteam.
  type TeamRow = { id: string; name: string | null; parent_team_id: string | null };
  const { data: teams } = await admin
    .from("teams")
    .select("id, name, parent_team_id")
    .in("id", [...new Set(rows.map((row) => row.team_id))]);
  const teamRows = (teams ?? []) as TeamRow[];
  const parentIds = [...new Set(teamRows.flatMap((team) => (team.parent_team_id ? [team.parent_team_id] : [])))];
  const { data: parents } = parentIds.length
    ? await admin.from("teams").select("id, name").in("id", parentIds)
    : { data: [] };
  const parentName = new Map(((parents ?? []) as TeamRow[]).map((team) => [team.id, team.name]));
  const categoryByTeam = new Map(
    teamRows.map((team) => [
      team.id,
      zrlCategoryFromTeamName(team.name) ??
        zrlCategoryFromTeamName(team.parent_team_id ? parentName.get(team.parent_team_id) : null),
    ]),
  );

  const infoByZwiftEvent = new Map<number, ZwiftEventInfo | null>();
  for (const row of rows) {
    const zwiftEventId = Number(row.zwift_event_id);
    if (!infoByZwiftEvent.has(zwiftEventId)) {
      if (options.deadline && Date.now() >= options.deadline) {
        result.notes.push("Tijdsbudget op; de rest volgt de volgende run.");
        break;
      }
      const fetched = await fetchZwiftPublicEvent(zwiftEventId);
      infoByZwiftEvent.set(zwiftEventId, fetched.ok ? fetched.event : null);
      if (!fetched.ok) result.notes.push(`${zwiftEventId}: ${fetched.error}`);
    }
    const info = infoByZwiftEvent.get(zwiftEventId);
    if (!info) continue;
    result.checked += 1;

    const update = zrlRouteUpdate(row, info, categoryByTeam.get(row.team_id) ?? null);
    if (!update) continue;
    const route = routeFromZwiftId(update.zwift_route_id);
    if (route) {
      // Alleen de identificatie, zodat de foreign key van events.zwift_route_id houdt.
      await admin.from("zwift_routes").upsert(
        {
          route_id: route.routeId,
          slug: route.slug,
          name: route.name,
          world: route.world,
          strava_segment_id: route.stravaSegmentId,
        },
        { onConflict: "route_id", ignoreDuplicates: true },
      );
    }
    const { error: updateError } = await admin.from("events").update(update).eq("id", row.id);
    if (updateError) result.notes.push(`${row.title}: ${updateError.message}`);
    else result.updated.push(`${row.title} → ${route?.name ?? update.zwift_route_id}`);
  }
  return result;
}
