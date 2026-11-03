import { normalizeCommunityRoles } from "@/lib/community-roles";
import { syncEventWorkout } from "@/lib/training/events";
import { requestReplan } from "@/lib/training/replan";
import {
  activeLadderTeamIds,
  ladderEventFields,
  ladderFixtureMatches,
  ladderLineup,
  type LadderEventFields,
  type LadderFixtureMatch,
} from "./fixture-events";
import { normalizeTeamName } from "@/lib/ladder";
import { fetchLadderFixturePage, LadderLoginError, type LadderFixturePage } from "./fixture-page";
import { storeLadderResults } from "./store";
import type { ClubLadderSummary } from "./summary";
import { fetchLadderTeamResults, recentRacedResults } from "./team-history";

// Shared by the cron (service role) and tests; structurally typed like sync.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export type LadderFixtureSyncResult = {
  created: number;
  updated: number;
  removed: number;
  reactivated: string[];
  archived: string[];
  lineupRiders: number;
  lineupError: string | null;
  /** Eerdere wedstrijden van beide ploegen, aangeboden voor de matchup (bekende blijven staan). */
  historyMatches: number;
  warnings: string[];
};

type EventRow = LadderEventFields & { id: string; club_ladder_fixture_id: number; team_id: string };

const EVENT_COLUMNS =
  "id, club_ladder_fixture_id, team_id, title, start_at, location, description, external_url, zwift_route_id, zwift_event_id, laps, distance_km, elevation_m, club_ladder_opponent";

/** Zo weinig teams in de stand betekent een onbekende opmaak: dan niets archiveren of weghalen. */
const MIN_STANDINGS = 20;

const NUMERIC = new Set<keyof LadderEventFields>(["zwift_route_id", "zwift_event_id", "laps", "distance_km", "elevation_m"]);

function changed(row: EventRow, fields: LadderEventFields) {
  const value = (key: keyof LadderEventFields, raw: unknown) => {
    if (raw == null) return null;
    if (key === "start_at") return Date.parse(String(raw));
    return NUMERIC.has(key) ? Number(raw) : raw;
  };
  return (Object.keys(fields) as Array<keyof LadderEventFields>).some((key) => value(key, row[key]) !== value(key, fields[key]));
}

/** Maker van het event: captain, dan co-captain van het team, dan iemand met de rol teamcaptain. */
async function eventCreators(admin: Admin, teamIds: string[]) {
  const { data: members } = await admin
    .from("team_members")
    .select("team_id, profile_id, role")
    .in("team_id", teamIds)
    .in("role", ["captain", "co-captain"]);
  const byTeam = new Map<string, string>();
  for (const role of ["captain", "co-captain"]) {
    for (const row of (members ?? []) as Array<{ team_id: string; profile_id: string; role: string }>) {
      if (row.role === role && !byTeam.has(row.team_id)) byTeam.set(row.team_id, row.profile_id);
    }
  }
  let fallback: string | null = (members ?? [])[0]?.profile_id ?? null;
  if (!fallback) {
    const { data: profiles } = await admin.from("profiles").select("id, community_roles").not("community_roles", "is", null);
    fallback =
      ((profiles ?? []) as Array<{ id: string; community_roles: string[] | null }>).find((profile) =>
        normalizeCommunityRoles(profile.community_roles).includes("team_captain"),
      )?.id ?? null;
  }
  return (teamId: string) => byTeam.get(teamId) ?? fallback;
}

/** Opstelling van de ladder naar team_event_lineups, met een ja-RSVP voor wie een account heeft. */
async function syncLineup(admin: Admin, eventId: string, teamId: string, page: LadderFixturePage, side: "home" | "away") {
  const riders = ladderLineup(page, side);
  const zwiftIds = riders.map((rider) => String(rider.zwiftId));
  const [{ data: profiles }, { data: roster }] = await Promise.all([
    zwiftIds.length
      ? admin.from("profiles").select("id, zwift_id").in("zwift_id", zwiftIds)
      : Promise.resolve({ data: [] }),
    zwiftIds.length
      ? admin.from("roster_entries").select("id, zwift_id, team_id").in("zwift_id", zwiftIds)
      : Promise.resolve({ data: [] }),
  ]);
  const profileBy = new Map(((profiles ?? []) as Array<{ id: string; zwift_id: string }>).map((row) => [String(row.zwift_id), row.id]));
  const rosterBy = new Map<string, string>();
  for (const row of (roster ?? []) as Array<{ id: string; zwift_id: string; team_id: string | null }>) {
    if (!rosterBy.has(String(row.zwift_id)) || row.team_id === teamId) rosterBy.set(String(row.zwift_id), row.id);
  }

  type Wanted = { key: string; profile_id: string | null; roster_entry_id: string | null; slot: number | null };
  const wanted = riders.flatMap((rider): Wanted[] => {
    const key = String(rider.zwiftId);
    const profileId = profileBy.get(key);
    if (profileId) return [{ key: `p:${profileId}`, profile_id: profileId, roster_entry_id: null, slot: rider.position }];
    const rosterId = rosterBy.get(key);
    return rosterId ? [{ key: `r:${rosterId}`, profile_id: null, roster_entry_id: rosterId, slot: rider.position }] : [];
  });

  const { data: existingRows, error } = await admin
    .from("team_event_lineups")
    .select("id, profile_id, roster_entry_id, slot, selected_by")
    .eq("event_id", eventId)
    .eq("team_id", teamId);
  if (error) throw new Error(error.message);
  const existing = (existingRows ?? []) as Array<{
    id: string;
    profile_id: string | null;
    roster_entry_id: string | null;
    slot: number | null;
    selected_by: string | null;
  }>;
  const keyOf = (row: { profile_id: string | null; roster_entry_id: string | null }) =>
    row.profile_id ? `p:${row.profile_id}` : `r:${row.roster_entry_id}`;
  const wantedKeys = new Set(wanted.map((row) => row.key));
  const existingByKey = new Map(existing.map((row) => [keyOf(row), row]));

  // Zonder opstelling op de ladder blijft de selectie van de captain staan; met een gaat de ladder voor.
  const removed = existing.filter((row) => !wantedKeys.has(keyOf(row)) && (riders.length > 0 || row.selected_by == null));
  if (removed.length > 0) {
    const { error: deleteError } = await admin.from("team_event_lineups").delete().in("id", removed.map((row) => row.id));
    if (deleteError) throw new Error(deleteError.message);
  }
  const now = new Date().toISOString();
  const added: string[] = [];
  for (const row of wanted) {
    const current = existingByKey.get(row.key);
    if (current) {
      if (current.slot !== row.slot) await admin.from("team_event_lineups").update({ slot: row.slot, updated_at: now }).eq("id", current.id);
      continue;
    }
    const { error: insertError } = await admin.from("team_event_lineups").insert({
      event_id: eventId,
      parent_team_id: teamId,
      team_id: teamId,
      profile_id: row.profile_id,
      roster_entry_id: row.roster_entry_id,
      slot: row.slot,
      selected_by: null,
      updated_at: now,
    });
    if (insertError) throw new Error(insertError.message);
    if (row.profile_id) added.push(row.profile_id);
  }

  // Zoals een opstelling bij ZRL: opgesteld is toegezegd, en het schema rekent ermee.
  for (const profileId of added) {
    await admin
      .from("event_rsvps")
      .upsert({ event_id: eventId, profile_id: profileId, status: "yes", updated_at: now }, { onConflict: "event_id,profile_id" });
    const result = await syncEventWorkout(admin, profileId, eventId, "yes").catch(() => null);
    if (result?.inserted) await requestReplan(admin, profileId, "Opgesteld voor een ladderrace.").catch(() => null);
  }
  for (const row of removed) {
    if (!row.profile_id) continue;
    await admin.from("event_rsvps").delete().eq("event_id", eventId).eq("profile_id", row.profile_id);
    const result = await syncEventWorkout(admin, row.profile_id, eventId, "no").catch(() => null);
    if (result?.removed) await requestReplan(admin, row.profile_id, "Niet meer opgesteld voor een ladderrace.").catch(() => null);
  }
  return wanted.length;
}

/** Aanmeldingen van beide ploegen voor de matchup op de eventpagina (0302). */
async function syncSignups(admin: Admin, match: LadderFixtureMatch, page: LadderFixturePage) {
  const fixtureId = match.fixture.fixtureId;
  const now = new Date().toISOString();
  const rows = (["home", "away"] as const).flatMap((side) =>
    page[side].map((rider) => ({
      fixture_id: fixtureId,
      zwift_id: rider.zwiftId,
      team: match.fixture[side],
      name: rider.name,
      position: rider.position,
      updated_at: now,
    })),
  );
  const { error: deleteError } = await admin.from("club_ladder_fixture_signups").delete().eq("fixture_id", fixtureId);
  if (deleteError) throw new Error(deleteError.message);
  if (rows.length === 0) return;
  const { error } = await admin.from("club_ladder_fixture_signups").insert(rows);
  if (error) throw new Error(error.message);
}

/**
 * Wedstrijden van de ladder als event in de kalender, met de opstelling van de
 * wedstrijdpagina als er een ladder-sessie (`LADDER_COOKIE`) is. Zet ook het
 * kerkhof van de ladderteams gelijk met de ladder.
 */
export async function syncLadderFixtures(
  admin: Admin,
  summary: ClubLadderSummary,
  options: {
    cookie?: string | null;
    now?: Date;
    fetchPage?: typeof fetchLadderFixturePage;
    fetchTeamResults?: typeof fetchLadderTeamResults;
  } = {},
): Promise<LadderFixtureSyncResult> {
  const result: LadderFixtureSyncResult = {
    created: 0,
    updated: 0,
    removed: 0,
    reactivated: [],
    archived: [],
    lineupRiders: 0,
    lineupError: null,
    historyMatches: 0,
    warnings: [],
  };
  if (summary.standings.length < MIN_STANDINGS) {
    result.warnings.push("Ladderstand niet gelezen; wedstrijden overgeslagen.");
    return result;
  }
  const now = options.now ?? new Date();
  const fetchPage = options.fetchPage ?? fetchLadderFixturePage;

  const { data: teamRows, error: teamError } = await admin.from("teams").select("id, name, is_graveyard").eq("type", "ladder");
  if (teamError) throw new Error(teamError.message);
  const teams = (teamRows ?? []) as Array<{ id: string; name: string; is_graveyard: boolean | null }>;

  // 1. Kerkhof: de ladder is de bron, ook zonder cookie.
  const active = activeLadderTeamIds(teams, summary.standings, summary.fixtures);
  for (const team of teams) {
    const graveyard = !active.has(team.id);
    if (Boolean(team.is_graveyard) === graveyard) continue;
    const { error } = await admin.from("teams").update({ is_graveyard: graveyard }).eq("id", team.id);
    if (error) result.warnings.push(`${team.name}: ${error.message}`);
    else (graveyard ? result.archived : result.reactivated).push(team.name);
  }

  // 2. Events.
  const matches = ladderFixtureMatches(summary.fixtures, teams);
  const { data: eventRows, error: eventError } = await admin
    .from("events")
    .select(EVENT_COLUMNS)
    .not("club_ladder_fixture_id", "is", null)
    .gte("start_at", new Date(now.getTime() - 24 * 3600_000).toISOString());
  if (eventError) throw new Error(eventError.message);
  const existing = new Map(
    ((eventRows ?? []) as EventRow[]).map((row) => [`${row.club_ladder_fixture_id}:${row.team_id}`, row]),
  );
  const creatorFor = matches.length > 0 ? await eventCreators(admin, teams.map((team) => team.id)) : () => null;

  const pages = new Map<number, LadderFixturePage | null>();
  let cookie = options.cookie ?? null;
  async function pageFor(match: LadderFixtureMatch) {
    const id = match.fixture.fixtureId;
    if (pages.has(id)) return pages.get(id) ?? null;
    let page: LadderFixturePage | null = null;
    if (cookie && Date.parse(match.fixture.startsAt) > now.getTime()) {
      try {
        page = await fetchPage(id, cookie);
      } catch (err) {
        result.lineupError = err instanceof Error ? err.message : "Wedstrijdpagina niet gelezen.";
        if (err instanceof LadderLoginError) cookie = null;
      }
    }
    pages.set(id, page);
    return page;
  }

  // Alleen routes die in de routebibliotheek staan (foreign key).
  const routeIds = [...new Set(matches.map((match) => ladderEventFields(match, null).zwift_route_id).filter((id): id is number => id !== null))];
  const { data: knownRoutes } = routeIds.length
    ? await admin.from("zwift_routes").select("route_id").in("route_id", routeIds)
    : { data: [] };
  const known = new Set(((knownRoutes ?? []) as Array<{ route_id: number }>).map((row) => Number(row.route_id)));

  const seen = new Set<string>();
  const signupsSaved = new Set<number>();
  for (const match of matches) {
    const key = `${match.fixture.fixtureId}:${match.team.id}`;
    seen.add(key);
    const page = await pageFor(match);
    if (page && !signupsSaved.has(match.fixture.fixtureId)) {
      signupsSaved.add(match.fixture.fixtureId);
      try {
        await syncSignups(admin, match, page);
      } catch (err) {
        result.warnings.push(`Aanmeldingen ${match.fixture.fixtureId}: ${err instanceof Error ? err.message : "niet opgeslagen"}`);
      }
    }
    const fields = ladderEventFields(match, page);
    if (fields.zwift_route_id !== null && !known.has(fields.zwift_route_id)) fields.zwift_route_id = null;

    let row = existing.get(key);
    // Zonder wedstrijdpagina (geen of verlopen cookie) blijven rondes en afstand
    // van een eerdere lezing staan, zolang de route dezelfde is.
    if (!page && row && Number(row.zwift_route_id) === fields.zwift_route_id) {
      delete (fields as Partial<LadderEventFields>).laps;
      delete (fields as Partial<LadderEventFields>).distance_km;
      delete (fields as Partial<LadderEventFields>).elevation_m;
    }
    if (!row) {
      const createdBy = creatorFor(match.team.id);
      if (!createdBy) {
        result.warnings.push(`${match.team.name}: geen captain om het event op te zetten.`);
        continue;
      }
      const { data, error } = await admin
        .from("events")
        .insert({ ...fields, type: "ladder", team_id: match.team.id, club_ladder_fixture_id: match.fixture.fixtureId, created_by: createdBy })
        .select(EVENT_COLUMNS)
        .single();
      if (error) {
        result.warnings.push(`${fields.title}: ${error.message}`);
        continue;
      }
      row = data as EventRow;
      result.created += 1;
    } else if (changed(row, fields)) {
      const { error } = await admin.from("events").update(fields).eq("id", row.id);
      if (error) result.warnings.push(`${fields.title}: ${error.message}`);
      else result.updated += 1;
    }

    if (page && row) {
      try {
        result.lineupRiders += await syncLineup(admin, row.id, match.team.id, page, match.side);
      } catch (err) {
        result.lineupError = err instanceof Error ? err.message : "Opstelling niet opgeslagen.";
      }
    }
  }

  // 3. Geschiedenis voor de matchup: de summary toont maar een week, dus van
  // beide ploegen van een komende wedstrijd hun laatste gereden wedstrijden.
  // Eén pagina per team; renners en vermogen haalt de eventpagina op.
  const fetchTeamResults = options.fetchTeamResults ?? fetchLadderTeamResults;
  const upcoming = matches.filter((match) => Date.parse(match.fixture.startsAt) > now.getTime());
  const historyTeams = new Map<string, string>();
  for (const match of upcoming) {
    for (const name of [match.fixture.home, match.fixture.away]) historyTeams.set(normalizeTeamName(name), name);
  }
  for (const name of historyTeams.values()) {
    if (!cookie) break;
    try {
      result.historyMatches += await storeLadderResults(admin, recentRacedResults(await fetchTeamResults(name, cookie)));
    } catch (err) {
      if (err instanceof LadderLoginError) {
        result.lineupError = err.message;
        cookie = null;
      } else {
        result.warnings.push(`Uitslagen ${name}: ${err instanceof Error ? err.message : "niet gelezen"}`);
      }
    }
  }

  // 4. Een wedstrijd die nog moest beginnen en van de ladder verdween, is afgezegd.
  if (summary.fixtures.length > 0) {
    const gone = [...existing.entries()]
      .filter(([key, row]) => !seen.has(key) && Date.parse(row.start_at) > now.getTime())
      .map(([, row]) => row.id);
    if (gone.length > 0) {
      const { error } = await admin.from("events").delete().in("id", gone);
      if (error) result.warnings.push(error.message);
      else result.removed = gone.length;
    }
  }

  return result;
}
