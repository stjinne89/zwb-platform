import { notFound } from "next/navigation";
import { after } from "next/server";
import { Activity, RefreshCw, Star, Swords, Trophy, Users } from "lucide-react";
import { BackLink, EmptyState, PageHeader } from "@/components/app-ui";
import { buildLadderAdvice, DURATION_LABELS, type LadderAdvice, type RouteAdvice } from "@/lib/club-ladder/advice";
import { canAssignLadderRiders, canEditLadderPuzzle } from "@/lib/club-ladder/access";
import { ensureMatchRiders, loadStoredMatches, loadTeamMatches } from "@/lib/club-ladder/matches";
import { parseLadderRiderSort, sortLadderRiders } from "@/lib/club-ladder/riders";
import { ladderRouteOptions, ROUTE_CLASS_LABELS, worldLabel } from "@/lib/club-ladder/routes";
import { CHALLENGE_RANGE, challengeableTeams } from "@/lib/club-ladder/rules";
import { storeLadderResults } from "@/lib/club-ladder/store";
import {
  fetchClubLadderSummary,
  findStandingWindow,
  type ClubLadderFixture,
  type ClubLadderResult,
  type ClubLadderStanding,
} from "@/lib/club-ladder/summary";
import { DURATIONS, teamPowerFromMatches, topFiveAverage, type TeamPower } from "@/lib/club-ladder/team-power";
import { normalizeTeamName } from "@/lib/ladder";
import { getRequestAccess } from "@/lib/auth/request";
import { zwiftRacingConfigured } from "@/lib/zwiftracing/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { LadderRoutes, type LadderRouteRow } from "../_components/ladder-routes";
import { Metric, StandingsTable, TeamRidersTable } from "../_components/team-tables";
import {
  fixtureMatches,
  fixtureWhen,
  latestResultFor,
  loadLadderPuzzle,
  loadLadderRiders,
  loadLadderTeams,
  loadTeamRosterRiders,
  n,
  strengthFor,
  teamAliases,
  type TeamProfileRider,
} from "../_lib/load";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Tijd om ontbrekende renners van wedstrijden op te halen voordat de pagina antwoordt. */
const ANALYSIS_BUDGET_MS = 12_000;

/** Ranking rondom het team: tot zeven plekken erboven (uit te dagen) en drie eronder. */
function challengeWindow(standings: ClubLadderStanding[], match: ClubLadderStanding) {
  return standings.filter(
    (row) => row.region === match.region && row.position >= match.position - CHALLENGE_RANGE && row.position <= match.position + 3,
  );
}

export default async function ClubLadderTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ sort?: string; tegen?: string }>;
}) {
  const [{ teamId }, { sort: sortParam, tegen }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) notFound();
  const riderSort = parseLadderRiderSort(sortParam);
  const supabase = await createClient();
  const admin = createAdminClient();

  const [access, { teams: teamRows, sourcesByTeam, results: resultRows }] = await Promise.all([
    getRequestAccess(),
    loadLadderTeams(supabase),
  ]);
  const team = teamRows.find((row) => row.id === teamId);
  if (!team) notFound();

  const useVelo = zwiftRacingConfigured();
  const scoreLabel = useVelo ? "vELO 2" : "ZRS";
  const [{ riders: loadedRiders, withdrawn }, canAssign, canEditRoutes, { data: favoriteRows }] = await Promise.all([
    loadLadderRiders(teamRows, admin, supabase, useVelo),
    canAssignLadderRiders(access),
    canEditLadderPuzzle(access),
    // Leeg zolang 0298 niet is toegepast.
    admin.from("club_ladder_favorite_routes").select("route_slug").eq("team_id", team.id),
  ]);
  const allLadderRiders = loadedRiders.filter((rider) => !withdrawn.has(rider.id));
  const puzzle = await loadLadderPuzzle(teamRows, allLadderRiders, admin);
  const teamRiders: TeamProfileRider[] = sortLadderRiders(
    [
      ...loadedRiders
        .filter((rider) => rider.teamIds.includes(team.id))
        .map((rider) => ({ ...rider, rosterEntryId: null })),
      ...(await loadTeamRosterRiders(team.id, puzzle?.roster ?? [], loadedRiders, useVelo)),
    ],
    riderSort,
  );
  const strength = strengthFor(teamRiders);

  let standings: ClubLadderStanding[] = [];
  let fixtures: ClubLadderFixture[] = [];
  let ladderResults: ClubLadderResult[] = [];
  let liveError: string | null = null;
  let fetchedAt: string | null = null;
  try {
    const summary = await fetchClubLadderSummary();
    standings = summary.standings;
    fixtures = summary.fixtures;
    ladderResults = summary.results;
    fetchedAt = summary.fetchedAt;
  } catch (err) {
    liveError = err instanceof Error ? err.message : "Club Ladder summary niet opgehaald.";
  }

  const source = sourcesByTeam.get(team.id) ?? null;
  const syncResult = latestResultFor(team.id, resultRows);
  const aliases = teamAliases(team, source);
  const { match, window } = findStandingWindow(standings, aliases, syncResult?.position ?? null);
  const rankingRows = match ? challengeWindow(standings, match) : window;
  const challengeable = match ? challengeableTeams(standings, match) : [];
  const teamFixtures = fixtures.filter((fixture) => fixtureMatches(fixture, aliases)).slice(0, 6);
  const planned = teamFixtures.flatMap((fixture) => [fixture.home, fixture.away]);
  const opponent = tegen ? standings.find((row) => normalizeTeamName(row.name) === normalizeTeamName(tegen)) ?? null : null;

  const options = ladderRouteOptions();
  const favorites = new Set(((favoriteRows ?? []) as Array<{ route_slug: string }>).map((row) => row.route_slug));
  const routeRows: LadderRouteRow[] = options.map((option) => ({
    slug: option.slug,
    name: option.name,
    world: option.world,
    worldLabel: worldLabel(option.world),
    eventOnly: option.eventOnly,
    zwiftInsiderUrl: option.zwiftInsiderUrl,
    classLabel: ROUTE_CLASS_LABELS[option.routeClass],
    laps: option.laps,
  }));

  let advice: LadderAdvice | null = null;
  if (opponent) {
    // Eerst de verse uitslagen bewaren, dan de renners van beide teams aanvullen.
    await storeLadderResults(admin, ladderResults);
    const ourNames = [...aliases, ...(match ? [match.name] : [])];
    const [ours, theirs] = await Promise.all([loadTeamMatches(admin, ourNames), loadTeamMatches(admin, [opponent.name])]);
    const all = [...new Map([...ours, ...theirs].map((row) => [row.result_id, row])).values()];
    await ensureMatchRiders(admin, all, ANALYSIS_BUDGET_MS);
    const stored = await loadStoredMatches(admin, all);
    advice = buildLadderAdvice({
      options,
      favorites,
      ourNames,
      ourPower: teamPowerFromMatches(ourNames, stored) ?? profilePower(teamRiders),
      theirName: opponent.name,
      theirPower: teamPowerFromMatches([opponent.name], stored),
      matches: stored,
    });
  } else if (ladderResults.length > 0) {
    after(() => storeLadderResults(admin, ladderResults));
  }

  const opponentHref = (row: ClubLadderStanding) =>
    `/teams/club-ladder/${team.id}?tegen=${encodeURIComponent(row.name)}${sortParam ? `&sort=${sortParam}` : ""}#advies`;

  return (
    <div className="space-y-6">
      <BackLink href="/teams/club-ladder" label="Club Ladder" />
      <PageHeader eyebrow="Club Ladder" title={team.name} />

      {liveError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{liveError}</p>
      )}

      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Metric icon={<Trophy className="size-4" />} label="Positie" value={match?.position ?? syncResult?.position ?? "-"} />
        <Metric icon={<Swords className="size-4" />} label="Uit te dagen" value={challengeable.length} />
        <Metric icon={<Activity className="size-4" />} label="Regio" value={match?.region ?? "-"} />
        <Metric
          icon={<RefreshCw className="size-4" />}
          label="Live opgehaald"
          value={fetchedAt ? new Date(fetchedAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "-"}
        />
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Ranking</h2>
        {!match && <p className="text-sm text-muted-foreground">Niet in de live stand gevonden.</p>}
        <StandingsTable
          rows={rankingRows}
          selectedAliases={aliases}
          challengeable={challengeable.map((row) => row.name)}
          planned={planned}
          opponentHref={opponentHref}
          activeOpponent={opponent?.name ?? null}
        />
      </section>

      {opponent && (
        <section id="advies" className="scroll-mt-20 rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Advies tegen {opponent.name}</h2>
          <AdviceView advice={advice} opponent={opponent.name} options={routeRows} />
        </section>
      )}

      <section className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Favoriete parcoursen</h2>
        <LadderRoutes teamId={team.id} routes={routeRows} favorites={[...favorites]} canEdit={canEditRoutes} />
      </section>

      <section id="teamprofiel" className="scroll-mt-20 rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Teamprofiel</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <Metric icon={<Users className="size-4" />} label="Riders" value={strength.riders} />
          <Metric icon={<Activity className="size-4" />} label={`${scoreLabel} gem.`} value={n(strength.avgScore)} />
          <Metric icon={<Activity className="size-4" />} label="FTP gem." value={`${n(strength.avgFtp)}w`} />
          <Metric icon={<Activity className="size-4" />} label="W/kg gem." value={n(strength.avgWkg, 2)} />
          <Metric icon={<Activity className="size-4" />} label="5m W/kg gem." value={n(strength.avg5m, 2)} />
        </div>
        <TeamRidersTable
          riders={teamRiders}
          sort={riderSort}
          teamId={team.id}
          teamName={team.name}
          scoreLabel={scoreLabel}
          canRemove={canAssign && !puzzle?.teams.some((row) => row.id === team.id)}
          opponent={opponent?.name ?? null}
        />
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Komende matchups</h2>
        {teamFixtures.length === 0 ? (
          <EmptyState className="mt-3">Geen openbare wedstrijd gevonden.</EmptyState>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {teamFixtures.map((fixture) => (
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
    </div>
  );
}

/** Zonder eigen ladderraces: de vijf besten uit de 90-dagenprofielen (geen 15 s). */
function profilePower(riders: TeamProfileRider[]): TeamPower | null {
  const rows = riders
    .filter((rider) => rider.wkg1m || rider.wkg5m || rider.wkg20m)
    .map((rider) => ({ s15: null, m1: rider.wkg1m, m5: rider.wkg5m, m20: rider.wkg20m }));
  if (rows.length === 0) return null;
  return { wkg: topFiveAverage(rows), riders: rows.length, races: 0 };
}

function AdviceView({ advice, opponent, options }: { advice: LadderAdvice | null; opponent: string; options: LadderRouteRow[] }) {
  if (!advice) return <EmptyState className="mt-3">Nog geen wedstrijden van {opponent} bewaard.</EmptyState>;
  const bySlug = new Map(options.map((option) => [option.slug, option]));
  const extraFavorite =
    advice.bestFavorite && !advice.routes.some((route) => route.slug === advice.bestFavorite!.slug) ? advice.bestFavorite : null;
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-1.5 text-xs">
        {DURATIONS.map((d) => {
          const value = advice.edge[d];
          return (
            <span
              key={d}
              className={cn(
                "rounded-md border px-2 py-1 tabular-nums",
                value == null ? "text-muted-foreground" : value >= 0 ? "border-primary/30 bg-primary/10 text-primary" : "bg-muted",
              )}
            >
              {DURATION_LABELS[d]} {value == null ? "–" : `${value > 0 ? "+" : ""}${value}%`}
            </span>
          );
        })}
        <span className="px-1 py-1 text-muted-foreground">
          {advice.ourRaces} / {advice.theirRaces} races
        </span>
      </div>
      <ol className="grid gap-2 lg:grid-cols-3">
        {advice.routes.map((route, index) => (
          <AdviceCard key={route.slug} route={route} rank={index + 1} option={bySlug.get(route.slug)} />
        ))}
      </ol>
      {extraFavorite && (
        <ol className="grid gap-2 lg:grid-cols-3">
          <AdviceCard route={extraFavorite} rank={null} option={bySlug.get(extraFavorite.slug)} />
        </ol>
      )}
    </div>
  );
}

function AdviceCard({ route, rank, option }: { route: RouteAdvice; rank: number | null; option?: LadderRouteRow }) {
  return (
    <li className="rounded-md border bg-background p-3 text-sm">
      <p className="flex items-center gap-1.5 font-medium">
        {rank != null && <span className="tabular-nums text-muted-foreground">{rank}.</span>}
        {route.favorite && <Star aria-label="Favoriet" className="size-3.5 fill-primary text-primary" />}
        {route.name}
      </p>
      <p className="text-xs text-muted-foreground">
        {worldLabel(route.world)} · {ROUTE_CLASS_LABELS[route.routeClass]}
        {option ? ` · ${option.laps.map((lap) => `${lap.laps}×`).join("/")}` : ""}
      </p>
      {route.reasons.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs">
          {route.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

