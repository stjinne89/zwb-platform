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
  groupLadderRidersBySex,
  parseLadderRiderSort,
  sortLadderRiders,
  type LadderRider,
  type LadderRiderMembership,
  type LadderRiderPower,
  type LadderRiderProfile,
  type LadderRiderSort,
  type LadderSex,
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
import {
  LadderAssignButton,
  LadderAssignProvider,
  LadderTeamPicker,
  type AssignTeam,
} from "./_components/ladder-assign";
import { LadderCaptains, type CaptainTeam } from "./_components/ladder-captains";
import { canAssignLadderRiders } from "@/lib/club-ladder/access";
import { getRequestAccess } from "@/lib/auth/request";

export const dynamic = "force-dynamic";

/** Zelfde budget als de racebriefing voor ZRS/vELO die ontbreken of verlopen zijn. */
const METRICS_REFRESH_BUDGET_MS = 20_000;

const SEX_LABEL: Record<Exclude<LadderSex, null>, string> = { man: "Mannen", vrouw: "Vrouwen" };
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

type MemberRow = {
  team_id: string;
  profile_id: string;
  profiles?: {
    display_name?: string | null;
    ftp_watts?: number | null;
    weight_kg?: number | string | null;
  } | null;
};

type PowerRow = {
  profile_id: string;
  ftp_watts: number | null;
  ftp_wkg: number | string | null;
  watts_5m: number | null;
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

function strengthFor(
  teamId: string,
  members: MemberRow[],
  powerByProfile: Map<string, PowerRow>,
) {
  const teamMembers = members.filter((member) => member.team_id === teamId);
  const ftpValues = teamMembers.map((member) => {
    const power = powerByProfile.get(member.profile_id);
    return power?.ftp_watts ?? member.profiles?.ftp_watts ?? null;
  });
  const wkgValues = teamMembers.map((member) => {
    const power = powerByProfile.get(member.profile_id);
    const ftp = power?.ftp_watts ?? member.profiles?.ftp_watts ?? null;
    const weight = num(member.profiles?.weight_kg);
    return num(power?.ftp_wkg) ?? (ftp && weight ? ftp / weight : null);
  });
  const fiveMinuteValues = teamMembers.map(
    (member) => powerByProfile.get(member.profile_id)?.watts_5m ?? null,
  );

  return {
    riders: teamMembers.length,
    avgFtp: avg(ftpValues),
    avgWkg: avg(wkgValues),
    avg5m: avg(fiveMinuteValues),
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

  const profileIds = selectedTeam
    ? Array.from(
        new Set(
          (
            await admin
              .from("team_members")
              .select("team_id, profile_id, profiles(display_name, ftp_watts, weight_kg)")
              .eq("team_id", selectedTeam.id)
          ).data?.map((row) => row.profile_id) ?? [],
        ),
      )
    : [];
  const [{ data: memberRows }, { data: powerRows }] = selectedTeam
    ? await Promise.all([
        admin
          .from("team_members")
          .select("team_id, profile_id, profiles(display_name, ftp_watts, weight_kg)")
          .eq("team_id", selectedTeam.id),
        profileIds.length > 0
          ? supabase
              .from("rider_power_profiles")
              .select("profile_id, ftp_watts, ftp_wkg, watts_5m")
              .in("profile_id", profileIds)
          : Promise.resolve({ data: [] }),
      ])
    : [{ data: [] }, { data: [] }];

  const members = (memberRows ?? []) as unknown as MemberRow[];
  const powerByProfile = new Map(
    ((powerRows ?? []) as PowerRow[]).map((row) => [row.profile_id, row]),
  );
  const selectedStrength = selectedTeam
    ? strengthFor(selectedTeam.id, members, powerByProfile)
    : null;

  // ZRS is tijdelijk: met een ZwiftRacing-sleutel vervangt vELO 2 hem.
  const useVelo = zwiftRacingConfigured();
  const [allLadderRiders, canAssign] = await Promise.all([
    loadLadderRiders(teamRows, admin, supabase, useVelo),
    canAssignLadderRiders(access),
  ]);
  const ladderGroups = groupLadderRidersBySex(sortLadderRiders(allLadderRiders, riderSort));
  const captainData = canAssign ? await loadLadderCaptains(teamRows, admin) : null;
  const assignTeams: AssignTeam[] = teamRows.map((team) => ({
    id: team.id,
    name: team.name,
    archived: Boolean(team.is_graveyard),
    riders: allLadderRiders
      .filter((rider) => rider.teamIds.includes(team.id))
      .map((rider) => ({ id: rider.id, name: rider.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "nl")),
  }));

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

          <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-lg border bg-card p-4">
              <h2 className="font-semibold">ZWB teamprofiel</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <Metric icon={<Users className="size-4" />} label="Riders" value={selectedStrength?.riders ?? 0} />
                <Metric icon={<Activity className="size-4" />} label="FTP gem." value={`${n(selectedStrength?.avgFtp)}w`} />
                <Metric icon={<Activity className="size-4" />} label="W/kg gem." value={n(selectedStrength?.avgWkg, 2)} />
                <Metric icon={<Activity className="size-4" />} label="5m gem." value={`${n(selectedStrength?.avg5m)}w`} />
              </div>
              <ResponsiveTable
                className="mt-4"
                rows={members}
                rowKey={(member) => member.profile_id}
                minWidth={520}
                columns={[
                  {
                    key: "rider",
                    header: "Rider",
                    primary: true,
                    cell: (member) => (
                      <MemberLink id={member.profile_id}>
                        {member.profiles?.display_name ?? "Onbekend"}
                      </MemberLink>
                    ),
                    cellClassName: "font-medium",
                  },
                  {
                    key: "ftp",
                    header: "FTP",
                    align: "right",
                    cell: (member) =>
                      `${n(powerByProfile.get(member.profile_id)?.ftp_watts ?? member.profiles?.ftp_watts ?? null)}w`,
                  },
                  {
                    key: "wkg",
                    header: "W/kg",
                    align: "right",
                    cell: (member) => {
                      const power = powerByProfile.get(member.profile_id);
                      const ftp = power?.ftp_watts ?? member.profiles?.ftp_watts ?? null;
                      const weight = num(member.profiles?.weight_kg);
                      return n(num(power?.ftp_wkg) ?? (ftp && weight ? ftp / weight : null), 2);
                    },
                  },
                  {
                    key: "w5m",
                    header: "5m",
                    align: "right",
                    cell: (member) => `${n(powerByProfile.get(member.profile_id)?.watts_5m)}w`,
                  },
                ]}
              />
            </section>

            <section className="rounded-lg border bg-card p-4">
              <h2 className="font-semibold">Komende matchups</h2>
              {fixtures.length === 0 ? (
                <EmptyState className="mt-3">
                  Geen openbare wedstrijd gevonden.
                </EmptyState>
              ) : (
                <ul className="mt-3 space-y-2">
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

          <LadderAssignProvider initialTeamId={selectedTeam.id}>
            <section id="ladderrenners" className="scroll-mt-20 space-y-6 rounded-lg border bg-card p-4">
              {canAssign && <LadderTeamPicker teams={assignTeams} />}
              {ladderGroups.length === 0 ? (
                <>
                  <h2 className="font-semibold">Ladderrenners</h2>
                  <EmptyState>Nog geen ladderrenners.</EmptyState>
                </>
              ) : (
                ladderGroups.map((group) => (
                  <div key={group.sex ?? "onbekend"}>
                    <h2 className="font-semibold">
                      Ladderrenners · {group.sex ? SEX_LABEL[group.sex] : "Geslacht onbekend"} (
                      {group.riders.length})
                    </h2>
                    <LadderRidersTable
                      riders={group.riders}
                      sort={riderSort}
                      teamId={selectedTeam.id}
                      scoreLabel={useVelo ? "vELO 2" : "ZRS"}
                      canAssign={canAssign}
                    />
                  </div>
                ))
              )}
            </section>
          </LadderAssignProvider>

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
): Promise<LadderRider[]> {
  // Ook teams in het archief: een captain kan er al renners in zetten voordat het
  // team op de ladder terugkeert.
  const teamNames = new Map(ladderTeams.map((team) => [team.id, team.name]));
  const { data: memberRows } =
    ladderTeams.length > 0
      ? await admin
          .from("team_members")
          .select("team_id, profile_id")
          .in("team_id", Array.from(teamNames.keys()))
      : { data: [] };
  const memberships: LadderRiderMembership[] = (
    (memberRows ?? []) as Array<{ team_id: string; profile_id: string }>
  ).map((row) => ({
    profile_id: row.profile_id,
    team_id: row.team_id,
    team_name: teamNames.get(row.team_id) ?? "",
  }));
  const memberIds = Array.from(new Set(memberships.map((row) => row.profile_id)));

  const ladderFilter = ["event_type_interests.cs.{ladder}"];
  if (memberIds.length > 0) ladderFilter.push(`id.in.(${memberIds.join(",")})`);
  const { data: profileRows } = await admin
    .from("profiles")
    .select("id, display_name, sex, zwift_id, zrl_category, ftp_watts, weight_kg")
    .eq("is_approved", true)
    .or(ladderFilter.join(","));
  const profiles = (profileRows ?? []) as LadderRiderProfile[];
  if (profiles.length === 0) return [];

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
  return buildLadderRiders(profiles, (powerRows ?? []) as LadderRiderPower[], memberships, scores);
}

function LadderRidersTable({
  riders,
  sort,
  teamId,
  scoreLabel,
  canAssign,
}: {
  riders: LadderRider[];
  sort: LadderRiderSort;
  teamId: string;
  scoreLabel: string;
  canAssign: boolean;
}) {
  const header = (key: LadderRiderSort, label: string) => (
    <Link
      href={`/teams/club-ladder?team=${teamId}&sort=${key}#ladderrenners`}
      scroll={false}
      aria-current={sort === key ? "true" : undefined}
      className={cn("hover:text-foreground", sort === key && "text-foreground underline underline-offset-4")}
    >
      {label}
    </Link>
  );
  const wkg = (value: number | null) => n(value, 2);

  return (
    <ResponsiveTable
      className="mt-3"
      rows={riders}
      rowKey={(rider) => rider.id}
      minWidth={820}
      columns={[
        {
          key: "rider",
          header: header("name", "Renner"),
          primary: true,
          cell: (rider) => <MemberLink id={rider.id}>{rider.name}</MemberLink>,
          cellClassName: "font-medium",
        },
        {
          key: "team",
          header: header("team", "Team"),
          secondary: true,
          cell: (rider) => (rider.teams.length > 0 ? rider.teams.join(", ") : "-"),
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
        ...(canAssign
          ? [
              {
                key: "assign",
                header: <span className="sr-only">Toevoegen</span>,
                align: "right" as const,
                cell: (rider: LadderRider) => (
                  <LadderAssignButton
                    riderId={rider.id}
                    riderName={rider.name}
                    teamIds={rider.teamIds}
                  />
                ),
              },
            ]
          : []),
      ]}
    />
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
