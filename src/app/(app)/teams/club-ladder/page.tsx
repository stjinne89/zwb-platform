import Link from "next/link";
import { Activity, ArrowRight, RefreshCw, Swords, Trophy, Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  CLUB_LADDER_SUMMARY_URL,
  fetchClubLadderSummary,
  findStandingWindow,
  type ClubLadderFixture,
  type ClubLadderStanding,
} from "@/lib/club-ladder/summary";
import { normalizeTeamName } from "@/lib/ladder";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { SyncResultsButton } from "../_components/sync-results-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Search = {
  team?: string;
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
  const text = normalizeTeamName(fixture.raw);
  return aliases.some((alias) => text.includes(normalizeTeamName(alias)));
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
  const { team: selectedTeamId } = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();

  const [
    access,
    { data: teams },
    { data: sources },
    { data: results },
  ] = await Promise.all([
    getCurrentUserAccess(supabase),
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
  const canSync = access.has("teams.sync_sources") || access.has("teams.manage_results");

  return (
    <div className="space-y-6">
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
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3">Rider</th>
                      <th className="py-2 pr-3">FTP</th>
                      <th className="py-2 pr-3">W/kg</th>
                      <th className="py-2 pr-3">5m</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {members.map((member) => {
                      const power = powerByProfile.get(member.profile_id);
                      const ftp = power?.ftp_watts ?? member.profiles?.ftp_watts ?? null;
                      const weight = num(member.profiles?.weight_kg);
                      const wkg = num(power?.ftp_wkg) ?? (ftp && weight ? ftp / weight : null);
                      return (
                        <tr key={member.profile_id}>
                          <td className="py-2 pr-3 font-medium">
                            {member.profiles?.display_name ?? "Onbekend"}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">{n(ftp)}w</td>
                          <td className="py-2 pr-3 tabular-nums">{n(wkg, 2)}</td>
                          <td className="py-2 pr-3 tabular-nums">{n(power?.watts_5m)}w</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                    <li key={`${fixture.date}-${fixture.time}-${fixture.raw}`} className="rounded-md border bg-background p-3 text-sm">
                      <p className="font-medium">
                        {fixture.date ?? "Datum onbekend"} - {fixture.time} UTC
                      </p>
                      <p className="mt-1 text-muted-foreground">{fixture.raw}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </section>
        </>
      )}
    </div>
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
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-2 pr-3">Pos</th>
            <th className="py-2 pr-3">Team</th>
            <th className="py-2 pr-3">Regio</th>
            <th className="py-2 pr-3">Vorm</th>
            <th className="py-2 pr-3">Move</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => {
            const selected = normalizedAliases.includes(normalizeTeamName(row.name));
            return (
              <tr key={`${row.region}-${row.position}-${row.name}`} className={selected ? "bg-primary/10" : undefined}>
                <td className="py-2 pr-3 tabular-nums">{row.position}</td>
                <td className="py-2 pr-3 font-medium">{row.name}</td>
                <td className="py-2 pr-3">{row.region}</td>
                <td className="py-2 pr-3">
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
                </td>
                <td className="py-2 pr-3">{row.move ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
