import "server-only";

import { after } from "next/server";
import type { ClubLadderFixture } from "@/lib/club-ladder/summary";
import {
  buildLadderRiders,
  type LadderRider,
  type LadderRiderMembership,
  type LadderRiderPower,
  type LadderRiderProfile,
} from "@/lib/club-ladder/riders";
import {
  buildPuzzleRiders,
  parseLadderBand,
  type LadderPuzzleTeam,
  type LadderRosterRow,
} from "@/lib/club-ladder/puzzle";
import { ladderVeloByZwiftId, type LegacyVeloRow } from "@/lib/club-ladder/legacy-velo";
import { normalizeTeamName } from "@/lib/ladder";
import { loadRiderMetrics, refreshRiderMetrics } from "@/lib/race-briefing/metrics";
import { zwiftRacingConfigured } from "@/lib/zwiftracing/client";
import type { CaptainTeam } from "../_components/ladder-captains";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Zelfde budget als de racebriefing voor ZRS/vELO die ontbreken of verlopen zijn. */
const METRICS_REFRESH_BUDGET_MS = 20_000;

/**
 * Waar de scorekolom van de ladder uit komt: legacy vELO (0301) zodra die tabel
 * er is, anders ZRS of vELO 2 uit de cache van de racebriefing. Eén bron voor de
 * hele kolom, nooit per renner: de schalen verschillen.
 */
export type LadderScoreSource = "legacy" | "velo2" | "zrs";

export const LADDER_SCORE_LABELS: Record<LadderScoreSource, string> = {
  legacy: "vELO1",
  velo2: "vELO 2",
  zrs: "ZRS",
};

/** Ladder-vELO per Zwift-ID; null zolang 0301 niet is toegepast. */
export async function loadLegacyVelo(
  admin: ReturnType<typeof createAdminClient>,
  zwiftIds: number[],
): Promise<Map<number, number> | null> {
  if (zwiftIds.length === 0) {
    const { error } = await admin.from("zwift_legacy_velo").select("zwift_id").limit(1);
    return error ? null : new Map();
  }
  const { data, error } = await admin
    .from("zwift_legacy_velo")
    .select("zwift_id, velo_live, velo_max30, velo_max90")
    .in("zwift_id", zwiftIds);
  if (error) return null;
  return ladderVeloByZwiftId((data ?? []) as LegacyVeloRow[]);
}

/** Score per Zwift-ID uit de gekozen bron; ZRS en vELO 2 vullen de cache achteraf aan. */
async function loadScores(
  admin: ReturnType<typeof createAdminClient>,
  zwiftIds: number[],
  source: LadderScoreSource,
): Promise<Map<number, number | null>> {
  if (source === "legacy") return (await loadLegacyVelo(admin, zwiftIds)) ?? new Map();
  const metrics = await loadRiderMetrics(zwiftIds);
  // Wat ontbreekt of ouder is dan een dag, komt na het antwoord binnen.
  after(() => refreshRiderMetrics(zwiftIds, metrics, { budgetMs: METRICS_REFRESH_BUDGET_MS }));
  return new Map(
    Array.from(metrics, ([id, row]) => [id, source === "velo2" ? row.velo : row.racingScore] as const),
  );
}

/** Renner in het teamprofiel: een lid, of een rosternaam zonder account (0290). */
export type TeamProfileRider = LadderRider & { rosterEntryId: string | null };

export type TeamRow = {
  id: string;
  name: string;
  division: string | null;
  description: string | null;
  is_graveyard: boolean | null;
  discord_url: string | null;
};

export type SourceRow = {
  team_id: string;
  match_name: string;
  source_url: string;
};

export type ResultRow = {
  team_id: string;
  position: number | null;
  points: number | string | null;
  total_teams: number | null;
  synced_at: string | null;
  metadata: unknown;
};

function num(value: number | string | null | undefined) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) ? n : null;
}

function avg(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value != null);
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function n(value: number | string | null | undefined, digits = 0) {
  const number = num(value);
  if (number == null) return "-";
  return number.toLocaleString("nl-NL", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function latestResultFor(teamId: string, results: ResultRow[]) {
  return results.find((result) => result.team_id === teamId) ?? null;
}

export function fixtureMatches(fixture: ClubLadderFixture, aliases: string[]) {
  const teams = [fixture.home, fixture.away].map(normalizeTeamName);
  return aliases.some((alias) => teams.includes(normalizeTeamName(alias)));
}

export function fixtureWhen(fixture: ClubLadderFixture) {
  if (!fixture.startsAt) return `${fixture.time} UTC`;
  return new Date(fixture.startsAt).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function teamAliases(team: TeamRow, source: SourceRow | null) {
  return Array.from(
    new Set([team.name, source?.match_name].filter((value): value is string => Boolean(value))),
  );
}

export function strengthFor(riders: LadderRider[]) {
  return {
    riders: riders.length,
    avgScore: avg(riders.map((rider) => rider.score)),
    avgFtp: avg(riders.map((rider) => rider.ftpWatts)),
    avgWkg: avg(riders.map((rider) => rider.ftpWkg)),
    avg5m: avg(riders.map((rider) => rider.wkg5m)),
  };
}

/** Ladderteams, hun club_ladder-bron en de laatst gesyncte positie. */
export async function loadLadderTeams(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [{ data: teams }, { data: sources }, { data: results }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, division, description, is_graveyard, discord_url")
      .eq("type", "ladder")
      .order("is_graveyard")
      .order("name"),
    supabase
      .from("team_result_sources")
      .select("team_id, match_name, source_url")
      .eq("provider", "club_ladder"),
    supabase
      .from("team_results")
      .select("team_id, position, points, total_teams, synced_at, metadata")
      .eq("competition", "Club Ladder")
      .order("synced_at", { ascending: false, nullsFirst: false }),
  ]);
  return {
    teams: (teams ?? []) as TeamRow[],
    sourcesByTeam: new Map(((sources ?? []) as SourceRow[]).map((source) => [source.team_id, source])),
    results: (results ?? []) as ResultRow[],
  };
}

/** Teams met een band staan in de puzzel (0290); de rest kan erbij. Null zonder 0290. */
export async function loadLadderPuzzle(
  ladderTeams: TeamRow[],
  members: LadderRider[],
  admin: ReturnType<typeof createAdminClient>,
) {
  // Leeg zolang 0290 niet is toegepast: dan geven de queries een fout en geen rijen.
  // De band daarom apart, zodat de rest van de pagina blijft werken.
  const [{ data: bandRows, error: bandError }, { data: rosterRows }] = await Promise.all([
    admin.from("teams").select("id, ladder_rank_min, ladder_rank_max").eq("type", "ladder"),
    admin
      .from("ladder_roster_riders")
      .select("roster_entry_id, team_id, sex, roster_entries(name, zwift_id, claimed_by)"),
  ]);
  if (bandError) return null;
  const bands = new Map(
    ((bandRows ?? []) as Array<{ id: string; ladder_rank_min: number | null; ladder_rank_max: number | null }>).map(
      (row) => [row.id, parseLadderBand(row.ladder_rank_min, row.ladder_rank_max)],
    ),
  );
  const teams: LadderPuzzleTeam[] = [];
  const otherTeams: Array<{ id: string; name: string }> = [];
  for (const team of ladderTeams) {
    const band = bands.get(team.id);
    if (band) teams.push({ id: team.id, name: team.name, archived: Boolean(team.is_graveyard), band });
    else otherTeams.push({ id: team.id, name: team.name });
  }
  // Sterkste team links: op de hoogste rank van de band, dan de laagste.
  teams.sort(
    (a, b) => a.band[0] - b.band[0] || a.band[1] - b.band[1] || a.name.localeCompare(b.name, "nl"),
  );
  const roster: LadderRosterRow[] = (
    (rosterRows ?? []) as unknown as Array<{
      roster_entry_id: string;
      team_id: string | null;
      sex: string | null;
      roster_entries: { name: string; zwift_id: string | null; claimed_by: string | null } | null;
    }>
  )
    .filter((row) => row.roster_entries && !row.roster_entries.claimed_by)
    .map((row) => ({
      roster_entry_id: row.roster_entry_id,
      team_id: row.team_id,
      sex: row.sex,
      name: row.roster_entries!.name,
      zwift_id: row.roster_entries!.zwift_id,
    }));

  const zwiftIds = Array.from(
    new Set(
      [
        ...members.map((member) => (member.zwiftId == null ? null : String(member.zwiftId))),
        ...roster.map((row) => row.zwift_id?.trim() || null),
      ].filter((id): id is string => Boolean(id)),
    ),
  );
  const { data: rankRows } = zwiftIds.length
    ? await admin.from("ladder_ranks").select("zwift_id, rank").in("zwift_id", zwiftIds)
    : { data: [] };
  const ranks = new Map(
    ((rankRows ?? []) as Array<{ zwift_id: string; rank: number }>).map((row) => [row.zwift_id, row.rank]),
  );
  const velos =
    (await loadLegacyVelo(
      admin,
      zwiftIds.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0),
    )) ?? new Map<number, number>();

  return {
    teams,
    otherTeams,
    roster,
    riders: buildPuzzleRiders(members, roster, ranks, new Set(teams.map((team) => team.id)), velos),
  };
}

function zwiftIdOf(value: string | null) {
  const id = Number(value?.trim());
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Rosternamen zonder account in dit team, zoals in de puzzel: een rosternaam
 * met het Zwift-ID van een lid valt weg. De score komt via het Zwift-ID; FTP en
 * W/kg komen uit een ZWB-profiel en ontbreken dus.
 */
export async function loadTeamRosterRiders(
  teamId: string,
  roster: LadderRosterRow[],
  members: LadderRider[],
  admin: ReturnType<typeof createAdminClient>,
  source: LadderScoreSource,
): Promise<TeamProfileRider[]> {
  const memberZwiftIds = new Set(members.map((member) => member.zwiftId));
  const rows = roster
    .filter((row) => row.team_id === teamId)
    .map((row) => ({ row, zwiftId: zwiftIdOf(row.zwift_id) }))
    .filter(({ zwiftId }) => zwiftId == null || !memberZwiftIds.has(zwiftId));
  if (rows.length === 0) return [];

  const zwiftIds = rows.map(({ zwiftId }) => zwiftId).filter((id): id is number => id != null);
  const scores = await loadScores(admin, zwiftIds, source);
  return rows.map(({ row, zwiftId }) => {
    const score = zwiftId == null ? null : scores.get(zwiftId);
    return {
      id: row.roster_entry_id,
      rosterEntryId: row.roster_entry_id,
      name: row.name.trim() || "Onbekend",
      sex: row.sex === "man" || row.sex === "vrouw" ? row.sex : null,
      zwiftId,
      score: score != null && score > 0 ? score : null,
      teams: [],
      teamIds: [teamId],
      interested: false,
      inPool: false,
      category: null,
      riderType: null,
      ftpWatts: null,
      ftpWkg: null,
      wkg1m: null,
      wkg5m: null,
      wkg20m: null,
    };
  });
}

export type LadderAddOption = { id: string; name: string };

/**
 * Keuzes om een renner aan de ladder toe te voegen: goedgekeurde leden en
 * rosternamen zonder account. Een rosternaam met het Zwift-ID van een lid valt
 * weg, zoals in de puzzel: dat is dezelfde renner.
 */
export async function loadLadderAddOptions(
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ members: LadderAddOption[]; roster: LadderAddOption[] }> {
  const [{ data: profileRows }, { data: rosterRows }] = await Promise.all([
    admin.from("profiles").select("id, display_name, zwift_id").eq("is_approved", true).order("display_name"),
    admin.from("roster_entries").select("id, name, zwift_id").is("claimed_by", null).order("name"),
  ]);
  const profiles = (profileRows ?? []) as Array<{ id: string; display_name: string | null; zwift_id: string | null }>;
  const memberZwiftIds = new Set(profiles.map((row) => row.zwift_id?.trim()).filter(Boolean));
  return {
    members: profiles
      .filter((row) => row.display_name?.trim())
      .map((row) => ({ id: row.id, name: row.display_name!.trim() })),
    roster: ((rosterRows ?? []) as Array<{ id: string; name: string | null; zwift_id: string | null }>)
      .filter((row) => row.name?.trim() && !memberZwiftIds.has(row.zwift_id?.trim()))
      .map((row) => ({ id: row.id, name: row.name!.trim() })),
  };
}

export async function loadLadderCaptains(
  ladderTeams: TeamRow[],
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ teams: CaptainTeam[]; members: Array<{ id: string; name: string }> }> {
  const [{ data: captainRows }, { data: memberRows }] = await Promise.all([
    ladderTeams.length > 0
      ? admin
          .from("team_members")
          .select("team_id, profile_id, role, profiles(display_name)")
          .in(
            "team_id",
            ladderTeams.map((team) => team.id),
          )
          .in("role", ["captain", "co-captain"])
      : Promise.resolve({ data: [] }),
    admin
      .from("profiles")
      .select("id, display_name")
      .eq("is_approved", true)
      .order("display_name"),
  ]);
  const captains = (captainRows ?? []) as unknown as Array<{
    team_id: string;
    profile_id: string;
    role: "captain" | "co-captain";
    profiles?: { display_name?: string | null } | null;
  }>;
  return {
    teams: ladderTeams.map((team) => ({
      id: team.id,
      name: team.name,
      archived: Boolean(team.is_graveyard),
      captains: captains
        .filter((row) => row.team_id === team.id)
        .map((row) => ({
          id: row.profile_id,
          name: row.profiles?.display_name?.trim() || "Onbekend",
          role: row.role,
        }))
        .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name, "nl") : a.role === "captain" ? -1 : 1)),
    })),
    members: ((memberRows ?? []) as Array<{ id: string; display_name: string | null }>)
      .filter((row) => row.display_name?.trim())
      .map((row) => ({ id: row.id, name: row.display_name!.trim() })),
  };
}

export async function loadLadderRiders(
  ladderTeams: TeamRow[],
  admin: ReturnType<typeof createAdminClient>,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ riders: LadderRider[]; withdrawn: Set<string>; scoreSource: LadderScoreSource }> {
  // Ook teams in het archief: een captain kan er al renners in zetten voordat het
  // team op de ladder terugkeert.
  const teamNames = new Map(ladderTeams.map((team) => [team.id, team.name]));
  const [{ data: memberRows }, { data: poolRows }, { data: withdrawnRows }, legacyProbe] = await Promise.all([
    ladderTeams.length > 0
      ? admin
          .from("team_members")
          .select("team_id, profile_id")
          .in("team_id", Array.from(teamNames.keys()))
      : Promise.resolve({ data: [] }),
    // Leeg zolang 0285 niet is toegepast: dan geeft de query een fout en geen rijen.
    admin.from("ladder_pool").select("profile_id"),
    // Uit de ladder gehaald (0291); leeg zolang die niet is toegepast.
    admin.from("ladder_withdrawn").select("profile_id"),
    loadLegacyVelo(admin, []),
  ]);
  // De ladder rekent sinds het Race Book van 2026-10-23 met legacy vELO; ZRS was tijdelijk.
  const scoreSource: LadderScoreSource = legacyProbe ? "legacy" : zwiftRacingConfigured() ? "velo2" : "zrs";
  const withdrawn = new Set(
    ((withdrawnRows ?? []) as Array<{ profile_id: string }>).map((row) => row.profile_id),
  );
  const memberships: LadderRiderMembership[] = (
    (memberRows ?? []) as Array<{ team_id: string; profile_id: string }>
  ).map((row) => ({
    profile_id: row.profile_id,
    team_id: row.team_id,
    team_name: teamNames.get(row.team_id) ?? "",
  }));
  const poolIds = new Set(((poolRows ?? []) as Array<{ profile_id: string }>).map((row) => row.profile_id));
  const memberIds = Array.from(
    new Set([...memberships.map((row) => row.profile_id), ...poolIds]),
  );

  const ladderFilter = ["event_type_interests.cs.{ladder}"];
  if (memberIds.length > 0) ladderFilter.push(`id.in.(${memberIds.join(",")})`);
  const { data: profileRows } = await admin
    .from("profiles")
    .select("id, display_name, sex, zwift_id, event_type_interests, zrl_category, ftp_watts, weight_kg")
    .eq("is_approved", true)
    .or(ladderFilter.join(","));
  // Ook wie uit de ladder is gehaald, maar alleen als lid van een ladderteam.
  const teamMemberIds = new Set(memberships.map((row) => row.profile_id));
  const profiles = ((profileRows ?? []) as LadderRiderProfile[]).filter(
    (profile) => !withdrawn.has(profile.id) || teamMemberIds.has(profile.id),
  );
  if (profiles.length === 0) return { riders: [], withdrawn, scoreSource };

  const zwiftIds = Array.from(
    new Set(
      profiles
        .map((profile) => Number(profile.zwift_id?.trim()))
        .filter((id) => Number.isSafeInteger(id) && id > 0),
    ),
  );
  const [{ data: powerRows }, scores] = await Promise.all([
    supabase
      .from("rider_power_profiles")
      .select("profile_id, ftp_watts, ftp_wkg, wkg_1m, wkg_5m, wkg_20m, rider_type")
      .in(
        "profile_id",
        profiles.map((profile) => profile.id),
      ),
    loadScores(admin, zwiftIds, scoreSource),
  ]);
  return {
    riders: buildLadderRiders(
      profiles,
      (powerRows ?? []) as LadderRiderPower[],
      memberships,
      scores,
      poolIds,
    ),
    withdrawn,
    scoreSource,
  };
}
