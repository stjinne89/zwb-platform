import Link from "next/link";
import { after } from "next/server";
import { Activity, ArrowRight, RefreshCw, Swords, Trophy, Users } from "lucide-react";
import { BackLink, EmptyState, PageHeader } from "@/components/app-ui";
import { MemberLink } from "@/components/member-link";
import { buttonVariants } from "@/components/ui/button";
import {
  CLUB_LADDER_SUMMARY_URL,
  fetchClubLadderSummary,
  findStandingWindow,
  type ClubLadderFixture,
  type ClubLadderStanding,
} from "@/lib/club-ladder/summary";
import {
  buildLadderRiders,
  parseLadderRiderSort,
  sortLadderRiders,
  type LadderRider,
  type LadderRiderMembership,
  type LadderRiderPower,
  type LadderRiderProfile,
  type LadderRiderSort,
} from "@/lib/club-ladder/riders";
import { normalizeTeamName } from "@/lib/ladder";
import { loadRiderMetrics, refreshRiderMetrics } from "@/lib/race-briefing/metrics";
import { riderTypeLabel } from "@/lib/teams/power-profile";
import { zwiftRacingConfigured } from "@/lib/zwiftracing/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { SyncResultsButton } from "../_components/sync-results-button";
import { LadderCaptains, type CaptainTeam } from "./_components/ladder-captains";
import { LadderPoolAdd } from "./_components/ladder-pool-add";
import { LadderPuzzle } from "./_components/ladder-puzzle";
import {
  buildPuzzleRiders,
  parseLadderBand,
  type LadderPuzzleTeam,
  type LadderRosterRow,
} from "@/lib/club-ladder/puzzle";
import { canAssignLadderRiders, canEditLadderPuzzle } from "@/lib/club-ladder/access";
import { getRequestAccess } from "@/lib/auth/request";

export const dynamic = "force-dynamic";

/** Zelfde budget als de racebriefing voor ZRS/vELO die ontbreken of verlopen zijn. */
const METRICS_REFRESH_BUDGET_MS = 20_000;

export const revalidate = 0;

type Search = {
  team?: string;
  sort?: string;
};

type TeamRow = {
  id: string;
  name: string;
  division: string | null;
  description: string | null;
  is_graveyard: boolean | null;
};

type SourceRow = {
  team_id: string;
  match_name: string;
  source_url: string;
};

type ResultRow = {
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

function n(value: number | string | null | undefined, digits = 0) {
  const number = num(value);
  if (number == null) return "-";
  return number.toLocaleString("nl-NL", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function latestResultFor(teamId: string, results: ResultRow[]) {
  return results.find((result) => result.team_id === teamId) ?? null;
}

function fixtureMatches(fixture: ClubLadderFixture, aliases: string[]) {
  const teams = [fixture.home, fixture.away].map(normalizeTeamName);
  return aliases.some((alias) => teams.includes(normalizeTeamName(alias)));
}

function fixtureWhen(fixture: ClubLadderFixture) {
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

function teamAliases(team: TeamRow, source: SourceRow | null) {
  return Array.from(
    new Set([team.name, source?.match_name].filter((value): value is string => Boolean(value))),
  );
}

function strengthFor(riders: LadderRider[]) {
  return {
    riders: riders.length,
    avgScore: avg(riders.map((rider) => rider.score)),
    avgFtp: avg(riders.map((rider) => rider.ftpWatts)),
    avgWkg: avg(riders.map((rider) => rider.ftpWkg)),
    avg5m: avg(riders.map((rider) => rider.wkg5m)),
  };
}

export default async function ClubLadderPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { team: selectedTeamId, sort: sortParam } = await searchParams;
  const riderSort = parseLadderRiderSort(sortParam);
  const supabase = await createClient();
  const admin = createAdminClient();

  const [
    access,
    { data: teams },
    { data: sources },
    { data: results },
  ] = await Promise.all([
    getRequestAccess(),
    supabase
      .from("teams")
      .select("id, name, division, description, is_graveyard")
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

  const teamRows = (teams ?? []) as TeamRow[];
  const selectedTeam =
    teamRows.find((team) => team.id === selectedTeamId) ??
    teamRows.find((team) => !team.is_graveyard) ??
    teamRows[0] ??
    null;
  const sourcesByTeam = new Map(
    ((sources ?? []) as SourceRow[]).map((source) => [source.team_id, source]),
  );
  const resultRows = (results ?? []) as ResultRow[];

  // ZRS is tijdelijk: met een ZwiftRacing-sleutel vervangt vELO 2 hem.
  const useVelo = zwiftRacingConfigured();
  const scoreLabel = useVelo ? "vELO 2" : "ZRS";
  const [{ riders: loadedRiders, withdrawn }, canAssign, canPuzzle] = await Promise.all([
    loadLadderRiders(teamRows, admin, supabase, useVelo),
    canAssignLadderRiders(access),
    canEditLadderPuzzle(access),
  ]);
  // Wie uit de ladder is gehaald, valt uit de puzzel, maar blijft in het
  // teamprofiel van een team buiten de puzzel waar hij nog lid van is.
  const allLadderRiders = loadedRiders.filter((rider) => !withdrawn.has(rider.id));
  const teamRiders = selectedTeam
    ? sortLadderRiders(
        loadedRiders.filter((rider) => rider.teamIds.includes(selectedTeam.id)),
        riderSort,
      )
    : [];
  const selectedStrength = strengthFor(teamRiders);
  const puzzle = await loadLadderPuzzle(teamRows, allLadderRiders, admin);
  const captainData = canAssign ? await loadLadderCaptains(teamRows, admin) : null;

  let liveStandings: ClubLadderStanding[] = [];
  let liveFixtures: ClubLadderFixture[] = [];
  let liveError: string | null = null;
  let fetchedAt: string | null = null;
  try {
    const summary = await fetchClubLadderSummary();
    liveStandings = summary.standings;
    liveFixtures = summary.fixtures;
    fetchedAt = summary.fetchedAt;
  } catch (err) {
    liveError = err instanceof Error ? err.message : "Club Ladder summary niet opgehaald.";
  }

  const selectedSource = selectedTeam ? sourcesByTeam.get(selectedTeam.id) ?? null : null;
  const selectedResult = selectedTeam
    ? latestResultFor(selectedTeam.id, resultRows)
    : null;
  const aliases = selectedTeam ? teamAliases(selectedTeam, selectedSource) : [];
  const { match, window } = findStandingWindow(
    liveStandings,
    aliases,
    selectedResult?.position ?? null,
  );
  const fixtures = liveFixtures.filter((fixture) => fixtureMatches(fixture, aliases)).slice(0, 6);
  // Zelfde recht als syncResultsNow; met alleen manage_results faalde de knop.
  const canSync = access.has("teams.sync_sources");

  return (
    <div className="space-y-6">
      <BackLink href="/teams" label="Teams" />
      <PageHeader
        eyebrow="Club"
        title="Club Ladder"
        actions={
          <div className="flex flex-col gap-2 sm:items-end">
            {canSync && <SyncResultsButton />}
            <Link
              href={CLUB_LADDER_SUMMARY_URL}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              target="_blank"
            >
              Ladder summary <ArrowRight className="size-4" />
            </Link>
          </div>
        }
      />

      {teamRows.length === 0 || !selectedTeam ? (
        <EmptyState>Geen Club Ladder-teams gevonden.</EmptyState>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[18rem_1fr]">
            <aside className="rounded-lg border bg-card p-4">
              <h2 className="font-semibold">ZWB teams</h2>
              <div className="mt-3 space-y-2">
                {teamRows.map((team) => {
                  const result = latestResultFor(team.id, resultRows);
                  const source = sourcesByTeam.get(team.id) ?? null;
                  const active = team.id === selectedTeam.id;
                  return (
                    <Link
                      key={team.id}
                      href={`/teams/club-ladder?team=${team.id}`}
                      className={cn(
                        "block rounded-md border bg-background p-3 text-sm hover:bg-muted",
                        active && "border-primary bg-primary/10",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">{team.name}</span>
                        {team.is_graveyard && (
                          <span className="text-xs text-muted-foreground">archief</span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {source?.match_name ?? "Geen Ladder-bron"} - positie{" "}
                        {result?.position ?? "-"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </aside>

            <div className="space-y-4">
              {liveError && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {liveError}
                </p>
              )}

              <section className="grid gap-3 md:grid-cols-4">
                <Metric icon={<Trophy className="size-4" />} label="ZWB sync positie" value={selectedResult?.position ?? "-"} />
                <Metric icon={<Swords className="size-4" />} label="Live match" value={match?.position ?? "-"} />
                <Metric icon={<Activity className="size-4" />} label="Publieke rows" value={liveStandings.length} />
                <Metric
                  icon={<RefreshCw className="size-4" />}
                  label="Live opgehaald"
                  value={fetchedAt ? new Date(fetchedAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "-"}
                />
              </section>

              <section className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Ranking rondom {selectedTeam.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {match
                        ? `Live match gevonden als ${match.name} in ${match.region}.`
                        : "Geen exacte live match; fallback op bovenkant of laatst gesyncte positie."}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Teamnaam bij bron: {aliases.join(", ")}
                  </p>
                </div>
                <StandingsTable rows={window} selectedAliases={aliases} />
              </section>
            </div>
          </section>

          <section className="space-y-4">
            <section id="teamprofiel" className="scroll-mt-20 rounded-lg border bg-card p-4">
              <h2 className="font-semibold">ZWB teamprofiel</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                <Metric icon={<Users className="size-4" />} label="Riders" value={selectedStrength.riders} />
                <Metric icon={<Activity className="size-4" />} label={`${scoreLabel} gem.`} value={n(selectedStrength.avgScore)} />
                <Metric icon={<Activity className="size-4" />} label="FTP gem." value={`${n(selectedStrength.avgFtp)}w`} />
                <Metric icon={<Activity className="size-4" />} label="W/kg gem." value={n(selectedStrength.avgWkg, 2)} />
                <Metric icon={<Activity className="size-4" />} label="5m W/kg gem." value={n(selectedStrength.avg5m, 2)} />
              </div>
              <TeamRidersTable
                riders={teamRiders}
                sort={riderSort}
                teamId={selectedTeam.id}
                scoreLabel={scoreLabel}
              />
            </section>

            <section className="rounded-lg border bg-card p-4">
              <h2 className="font-semibold">Komende matchups</h2>
              {fixtures.length === 0 ? (
                <EmptyState className="mt-3">
                  Geen openbare wedstrijd gevonden.
                </EmptyState>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {fixtures.map((fixture) => (
                    <li key={`${fixture.date}-${fixture.time}-${fixture.home}-${fixture.away}`} className="rounded-md border bg-background p-3 text-sm">
                      <p className="font-medium">{fixtureWhen(fixture)}</p>
                      <p className="mt-1">
                        {fixture.home} – {fixture.away}
                      </p>
                      {(fixture.route || fixture.powerups.length > 0) && (
                        <p className="mt-1 text-muted-foreground">
                          {[fixture.route, fixture.powerups.join(", ")].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </section>

          {puzzle && (
            <LadderPuzzle
              teams={puzzle.teams}
              riders={puzzle.riders}
              otherTeams={puzzle.otherTeams}
              canEdit={canPuzzle}
            />
          )}

          {captainData && (
            <LadderPoolAdd
              members={captainData.members.filter(
                (member) => !allLadderRiders.some((rider) => rider.id === member.id),
              )}
            />
          )}

          {captainData && (
            <LadderCaptains
              teams={captainData.teams}
              members={captainData.members}
              initialTeamId={selectedTeam.id}
            />
          )}
        </>
      )}
    </div>
  );
}

/** Teams met een band staan in de puzzel (0290); de rest kan erbij. Null zonder 0290. */
async function loadLadderPuzzle(
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

  return {
    teams,
    otherTeams,
    riders: buildPuzzleRiders(members, roster, ranks, new Set(teams.map((team) => team.id))),
  };
}

async function loadLadderCaptains(
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

async function loadLadderRiders(
  ladderTeams: TeamRow[],
  admin: ReturnType<typeof createAdminClient>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  useVelo: boolean,
): Promise<{ riders: LadderRider[]; withdrawn: Set<string> }> {
  // Ook teams in het archief: een captain kan er al renners in zetten voordat het
  // team op de ladder terugkeert.
  const teamNames = new Map(ladderTeams.map((team) => [team.id, team.name]));
  const [{ data: memberRows }, { data: poolRows }, { data: withdrawnRows }] = await Promise.all([
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
  ]);
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
  if (profiles.length === 0) return { riders: [], withdrawn };

  const zwiftIds = Array.from(
    new Set(
      profiles
        .map((profile) => Number(profile.zwift_id?.trim()))
        .filter((id) => Number.isSafeInteger(id) && id > 0),
    ),
  );
  const [{ data: powerRows }, metrics] = await Promise.all([
    supabase
      .from("rider_power_profiles")
      .select("profile_id, ftp_watts, ftp_wkg, wkg_1m, wkg_5m, wkg_20m, rider_type")
      .in(
        "profile_id",
        profiles.map((profile) => profile.id),
      ),
    loadRiderMetrics(zwiftIds),
  ]);
  // Wat ontbreekt of ouder is dan een dag, komt na het antwoord binnen.
  after(() => refreshRiderMetrics(zwiftIds, metrics, { budgetMs: METRICS_REFRESH_BUDGET_MS }));
  const scores = new Map(
    Array.from(metrics, ([id, row]) => [id, useVelo ? row.velo : row.racingScore] as const),
  );
  return {
    riders: buildLadderRiders(
      profiles,
      (powerRows ?? []) as LadderRiderPower[],
      memberships,
      scores,
      poolIds,
    ),
    withdrawn,
  };
}

function TeamRidersTable({
  riders,
  sort,
  teamId,
  scoreLabel,
}: {
  riders: LadderRider[];
  sort: LadderRiderSort;
  teamId: string;
  scoreLabel: string;
}) {
  const sortHref = (key: LadderRiderSort) =>
    `/teams/club-ladder?team=${teamId}&sort=${key}#teamprofiel`;
  // Op telefoonbreedte is de kop het label in de kaart; sorteren gaat daar via de knoppen.
  const header = (key: LadderRiderSort, label: string) => (
    <>
      <span className="sm:hidden">{label}</span>
      <Link
        href={sortHref(key)}
        scroll={false}
        aria-current={sort === key ? "true" : undefined}
        className={cn(
          "max-sm:hidden hover:text-foreground",
          sort === key && "text-foreground underline underline-offset-4",
        )}
      >
        {label}
      </Link>
    </>
  );
  const wkg = (value: number | null) => n(value, 2);
  const mobileSorts: Array<[LadderRiderSort, string]> = [
    ["wkg", "W/kg"],
    ["score", scoreLabel],
    ["ftp", "FTP"],
    ["w1m", "1m"],
    ["w5m", "5m"],
    ["w20m", "20m"],
    ["cat", "Cat"],
    ["name", "Naam"],
  ];

  return (
    <>
      <nav aria-label="Sorteren" className="mt-4 flex flex-wrap gap-1.5 sm:hidden">
        {mobileSorts.map(([key, label]) => (
          <Link
            key={key}
            href={sortHref(key)}
            scroll={false}
            aria-current={sort === key ? "true" : undefined}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs",
              sort === key ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <ResponsiveTable
        className="mt-3 sm:mt-4"
        rows={riders}
        rowKey={(rider) => rider.id}
        minWidth={760}
        columns={[
          {
            key: "rider",
            header: header("name", "Renner"),
            primary: true,
            cell: (rider) => <MemberLink id={rider.id}>{rider.name}</MemberLink>,
            cellClassName: "font-medium",
          },
          {
            key: "cat",
            header: header("cat", "Cat"),
            cell: (rider) => rider.category ?? "-",
          },
          {
            key: "score",
            header: header("score", scoreLabel),
            align: "right",
            cell: (rider) => n(rider.score),
            cellClassName: "tabular-nums",
          },
          {
            key: "type",
            header: "Type",
            cell: (rider) => (rider.riderType ? riderTypeLabel(rider.riderType) : "-"),
          },
          {
            key: "ftp",
            header: header("ftp", "FTP"),
            align: "right",
            cell: (rider) => (rider.ftpWatts == null ? "-" : `${n(rider.ftpWatts)}w`),
            cellClassName: "tabular-nums",
          },
          {
            key: "wkg",
            header: header("wkg", "W/kg"),
            align: "right",
            cell: (rider) => wkg(rider.ftpWkg),
            cellClassName: "tabular-nums font-medium",
          },
          {
            key: "w1m",
            header: header("w1m", "1m W/kg"),
            align: "right",
            cell: (rider) => wkg(rider.wkg1m),
            cellClassName: "tabular-nums",
          },
          {
            key: "w5m",
            header: header("w5m", "5m W/kg"),
            align: "right",
            cell: (rider) => wkg(rider.wkg5m),
            cellClassName: "tabular-nums",
          },
          {
            key: "w20m",
            header: header("w20m", "20m W/kg"),
            align: "right",
            cell: (rider) => wkg(rider.wkg20m),
            cellClassName: "tabular-nums",
          },
        ]}
      />
    </>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between gap-3 text-muted-foreground">
        <p className="text-xs uppercase tracking-wide">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function StandingsTable({
  rows,
  selectedAliases,
}: {
  rows: ClubLadderStanding[];
  selectedAliases: string[];
}) {
  if (rows.length === 0) {
    return <EmptyState className="mt-4">Geen publieke rankingrows gevonden.</EmptyState>;
  }

  const normalizedAliases = selectedAliases.map(normalizeTeamName);
  const isSelected = (row: (typeof rows)[number]) =>
    normalizedAliases.includes(normalizeTeamName(row.name));
  return (
    <div>
      <ResponsiveTable
        className="mt-4"
        rows={rows}
        rowKey={(row) => `${row.region}-${row.position}-${row.name}`}
        minWidth={680}
        rowClassName={(row) => (isSelected(row) ? "bg-primary/10" : undefined)}
        columns={[
          {
            key: "team",
            header: "Team",
            primary: true,
            cell: (row) => row.name,
            cellClassName: "font-medium",
          },
          {
            key: "region",
            header: "Regio",
            secondary: true,
            cell: (row) => row.region,
          },
          {
            key: "position",
            header: "Pos",
            cell: (row) => row.position,
            cellClassName: "tabular-nums",
          },
          {
            key: "form",
            header: "Vorm",
            cell: (row) => (
              <span className="flex gap-1">
                {row.form.length > 0
                  ? row.form.map((result, index) => (
                      <span
                        key={`${result}-${index}`}
                        className={cn(
                          "inline-flex size-6 items-center justify-center rounded-md border text-xs font-semibold",
                          result === "W"
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-muted bg-muted text-muted-foreground",
                        )}
                      >
                        {result}
                      </span>
                    ))
                  : "-"}
              </span>
            ),
          },
          {
            key: "move",
            header: "Move",
            align: "right",
            cell: (row) => row.move ?? "-",
          },
        ]}
      />
    </div>
  );
}
