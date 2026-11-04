import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Activity, RefreshCw, Star, Swords, Trophy, Users } from "lucide-react";
import { BackLink, EmptyState, PageHeader } from "@/components/app-ui";
import { TeamChatLinks } from "@/components/team-chat-links";
import { buildLadderAdvice, DURATION_LABELS, recentMatches, type LadderAdvice, type RouteAdvice } from "@/lib/club-ladder/advice";
import { canAssignLadderRiders, canEditLadderPuzzle } from "@/lib/club-ladder/access";
import { riderRaces } from "@/lib/club-ladder/event-matchup";
import { loadRiderWeights } from "@/lib/club-ladder/rider-weights";
import { ensureMatchRiders, loadStoredMatches, loadTeamMatches } from "@/lib/club-ladder/matches";
import { opponentRiderIds, riderPowerFromMatches, squadPower } from "@/lib/club-ladder/matchup";
import { parseLadderRiderSort, sortLadderRiders } from "@/lib/club-ladder/riders";
import { loadLadderSelections } from "@/lib/club-ladder/selection";
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
import { DURATIONS, type PowerWkg } from "@/lib/club-ladder/team-power";
import { normalizeTeamName } from "@/lib/ladder";
import { loadRiderMetrics } from "@/lib/race-briefing/metrics";
import { getRequestAccess } from "@/lib/auth/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { DeleteResultButton, TeamChatLinksForm, TeamResultForm } from "../../[id]/_components/admin-panel";
import { TeamAvailabilityButtons } from "../../[id]/_components/team-availability-buttons";
import { LadderRoutes, type LadderRouteRow } from "../_components/ladder-routes";
import { LadderSelection, type SelectionOption } from "../_components/ladder-selection";
import { Metric, StandingsTable, TeamRidersTable } from "../_components/team-tables";
import {
  fixtureMatches,
  fixtureWhen,
  latestResultFor,
  loadLadderPuzzle,
  loadLadderRiders,
  loadLadderTeams,
  loadTeamRosterRiders,
  LADDER_SCORE_LABELS,
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

  const [{ riders: loadedRiders, withdrawn, scoreSource }, canAssign, canEditRoutes, { data: favoriteRows }] = await Promise.all([
    loadLadderRiders(teamRows, admin, supabase),
    canAssignLadderRiders(access),
    canEditLadderPuzzle(access),
    // Leeg zolang 0298 niet is toegepast.
    admin.from("club_ladder_favorite_routes").select("route_slug").eq("team_id", team.id),
  ]);
  const scoreLabel = LADDER_SCORE_LABELS[scoreSource];
  const allLadderRiders = loadedRiders.filter((rider) => !withdrawn.has(rider.id));
  const puzzle = await loadLadderPuzzle(teamRows, allLadderRiders, admin);
  const teamRiders: TeamProfileRider[] = sortLadderRiders(
    [
      ...loadedRiders
        .filter((rider) => rider.teamIds.includes(team.id))
        .map((rider) => ({ ...rider, rosterEntryId: null })),
      ...(await loadTeamRosterRiders(team.id, puzzle?.roster ?? [], loadedRiders, admin, scoreSource)),
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
  const challengeable = match ? challengeableTeams(standings, match) : [];
  const teamFixtures = fixtures.filter((fixture) => fixtureMatches(fixture, aliases)).slice(0, 6);
  // Nog geen plek in de stand: de hele ranking om door te scrollen, in de regio van de tegenstanders.
  const fixtureRegions = new Set(
    teamFixtures.flatMap((fixture) =>
      standings
        .filter((row) => [fixture.home, fixture.away].some((name) => normalizeTeamName(name) === normalizeTeamName(row.name)))
        .map((row) => row.region),
    ),
  );
  const unrankedRows = fixtureRegions.size > 0 ? standings.filter((row) => fixtureRegions.has(row.region)) : standings;
  const rankingRows = match ? challengeWindow(standings, match) : standings.length > 0 ? unrankedRows : window;
  const planned = teamFixtures.flatMap((fixture) => [fixture.home, fixture.away]);
  // Het event dat de sync per wedstrijd aanmaakt (migr. 0300).
  const fixtureIds = teamFixtures.map((fixture) => fixture.fixtureId).filter((id): id is number => id !== null);
  const { data: fixtureEvents } = fixtureIds.length
    ? await supabase.from("events").select("id, club_ladder_fixture_id").eq("team_id", team.id).in("club_ladder_fixture_id", fixtureIds)
    : { data: [] };
  const eventByFixture = new Map(
    ((fixtureEvents ?? []) as Array<{ id: string; club_ladder_fixture_id: number }>).map((row) => [row.club_ladder_fixture_id, row.id]),
  );
  const matchupEventIds = [...eventByFixture.values()];
  const userId = access.user?.id ?? null;

  // Wat de losse teampagina had: chatkanalen, beschikbaarheid per wedstrijd en teamresultaten.
  const [{ data: waGroups }, { data: availabilityRows }, { data: teamResults }, { data: captainRows }, selections] = await Promise.all([
    supabase
      .from("whatsapp_groups")
      .select("id, name, invite_url, description, kind")
      .eq("team_id", team.id)
      .order("display_order")
      .order("name"),
    matchupEventIds.length
      ? supabase
          .from("team_event_availability")
          .select("event_id, profile_id, status")
          .eq("team_id", team.id)
          .in("event_id", matchupEventIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("team_results")
      .select("id, competition, round_label, round_at, position, total_teams, points")
      .eq("team_id", team.id)
      .order("round_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    userId
      ? admin.from("team_members").select("role").eq("team_id", team.id).eq("profile_id", userId).in("role", ["captain", "co-captain"])
      : Promise.resolve({ data: [] }),
    loadLadderSelections(admin, team.id, matchupEventIds),
  ]);
  const isCaptain = (captainRows ?? []).length > 0;
  const canSelect = access.has("teams.manage_roster") || isCaptain;
  const canEditChat = access.has("teams.manage_roster") || isCaptain;
  const canEditResults = access.has("teams.manage_results") || isCaptain;
  type Availability = { event_id: string; profile_id: string; status: "available" | "maybe" | "unavailable" };
  const availability = (availabilityRows ?? []) as Availability[];
  const availabilityNames = new Map<string, string>();
  const availabilityIds = [...new Set(availability.map((row) => row.profile_id))];
  if (availabilityIds.length > 0) {
    const { data: people } = await admin.from("profiles").select("id, display_name").in("id", availabilityIds);
    for (const person of (people ?? []) as Array<{ id: string; display_name: string | null }>) {
      availabilityNames.set(person.id, person.display_name ?? "Lid");
    }
  }
  const availabilityFor = (eventId: string, status: Availability["status"]) =>
    availability
      .filter((row) => row.event_id === eventId && row.status === status)
      .map((row) => availabilityNames.get(row.profile_id) ?? "Lid")
      .sort((a, b) => a.localeCompare(b, "nl"));
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

  // Ook zonder eigen plek in de stand (een nieuwe ploeg) is de tegenstander van een matchup te analyseren.
  const ranked = new Set(standings.map((row) => normalizeTeamName(row.name)));
  const ourAliases = new Set(aliases.map(normalizeTeamName));
  const fixtureOpponent = (fixture: ClubLadderFixture) => {
    const name = ourAliases.has(normalizeTeamName(fixture.home)) ? fixture.away : fixture.home;
    return ranked.has(normalizeTeamName(name)) ? name : null;
  };
  const selectionFor = (fixture: ClubLadderFixture) => {
    const eventId = fixture.fixtureId ? eventByFixture.get(fixture.fixtureId) : undefined;
    return eventId ? selections.get(eventId) ?? null : null;
  };
  const selectionOptions: SelectionOption[] = teamRiders.map((rider) => ({
    kind: rider.rosterEntryId ? "roster" : "profile",
    id: rider.id,
    name: rider.name,
  }));

  let advice: LadderAdvice | null = null;
  // Zet een captain (of de ladder) een selectie op de matchup, dan rekent het advies met precies die renners.
  const opponentFixture = opponent
    ? teamFixtures.find((fixture) => normalizeTeamName(fixtureOpponent(fixture) ?? "") === normalizeTeamName(opponent.name))
    : undefined;
  const adviceSelection = opponentFixture ? selectionFor(opponentFixture) : null;
  const selectedIds = (adviceSelection?.riders ?? []).map((rider) => rider.zwiftId).filter((id): id is number => id != null);
  if (opponent) {
    // Eerst de verse uitslagen bewaren, dan de renners van beide teams aanvullen.
    await storeLadderResults(admin, ladderResults);
    const ourNames = [...aliases, ...(match ? [match.name] : [])];
    const [ours, theirs] = await Promise.all([loadTeamMatches(admin, ourNames), loadTeamMatches(admin, [opponent.name])]);
    const all = [...new Map([...ours, ...theirs].map((row) => [row.result_id, row])).values()];
    await ensureMatchRiders(admin, all, ANALYSIS_BUDGET_MS);
    const stored = await loadStoredMatches(admin, all);
    // De selectie, anders wie nu in de ploeg zit, tegen wie de laatste wedstrijden van de
    // tegenstander reed; niet de oude opstelling uit eerdere ladderraces (2026-11-03).
    const ourIds =
      selectedIds.length > 0
        ? [...new Set(selectedIds)]
        : [...new Set(teamRiders.map((rider) => rider.zwiftId).filter((id): id is number => id != null))];
    const theirIds = opponentRiderIds(stored, opponent.name);
    const [ourRaces, metrics, riderWeights] = await Promise.all([
      riderRaces(admin, ourIds),
      loadRiderMetrics([...ourIds, ...theirIds]),
      loadRiderWeights(admin, [...ourIds, ...theirIds]),
    ]);
    const known = new Set(stored.map((row) => row.resultId));
    const ladderPower = riderPowerFromMatches([...stored, ...ourRaces.filter((row) => !known.has(row.resultId))]);
    // 90 dagen van ZwiftRacing, zoals de matchup.
    const power90 = new Map<number, PowerWkg>();
    for (const [id, row] of metrics) {
      if (row.power) power90.set(id, { s15: row.power.s15, m1: row.power.m1, m5: row.power.m5, m20: row.power.m20 });
    }
    advice = buildLadderAdvice({
      options,
      favorites,
      ourNames,
      ourPower: squadPower(ourIds, ladderPower, power90, riderWeights),
      theirName: opponent.name,
      theirPower: squadPower(theirIds, ladderPower, power90, riderWeights),
      // Uitslagen per routetype en eigen routekeuzes: alleen de laatste 90 dagen, net als het vermogen.
      matches: recentMatches(stored),
    });
  } else if (ladderResults.length > 0) {
    after(() => storeLadderResults(admin, ladderResults));
  }

  const adviceHref = (name: string) =>
    `/teams/club-ladder/${team.id}?tegen=${encodeURIComponent(name)}${sortParam ? `&sort=${sortParam}` : ""}#advies`;
  const opponentHref = (row: ClubLadderStanding) => adviceHref(row.name);

  return (
    <div className="space-y-6">
      <BackLink href="/teams/club-ladder" label="Club Ladder" />
      <PageHeader
        eyebrow="Club Ladder"
        title={team.name}
        actions={<TeamChatLinks whatsappGroups={waGroups ?? []} discordUrl={team.discord_url} />}
      />

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
          scrollable={!match}
        />
      </section>

      {opponent && (
        <section id="advies" className="scroll-mt-20 rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Advies tegen {opponent.name}</h2>
          <AdviceView advice={advice} opponent={opponent.name} options={routeRows} selection={selectedIds.length > 0} />
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
            {teamFixtures.map((fixture) => {
              const eventId = fixture.fixtureId ? eventByFixture.get(fixture.fixtureId) : undefined;
              const body = (
                <>
                  <p className="font-medium">{fixtureWhen(fixture)}</p>
                  <p className="mt-1">
                    {fixture.home} – {fixture.away}
                  </p>
                  {(fixture.route || fixture.powerups.length > 0) && (
                    <p className="mt-1 text-muted-foreground">
                      {[fixture.route, fixture.powerups.join(", ")].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </>
              );
              const mine = eventId && userId ? availability.find((row) => row.event_id === eventId && row.profile_id === userId) : undefined;
              const rival = fixtureOpponent(fixture);
              const selection = selectionFor(fixture);
              return (
                <li
                  key={`${fixture.date}-${fixture.time}-${fixture.home}-${fixture.away}`}
                  className="flex h-full flex-col gap-3 rounded-md border bg-background p-3 text-sm"
                >
                  {eventId ? (
                    <Link href={`/events/${eventId}`} className="block rounded-sm transition hover:text-primary">
                      {body}
                    </Link>
                  ) : (
                    <div>{body}</div>
                  )}
                  {rival && (
                    <Link
                      href={adviceHref(rival)}
                      scroll={false}
                      className="self-start font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Advies
                    </Link>
                  )}
                  {selection && selection.riders.length > 0 && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">{selection.fromLadder ? "Opstelling" : "Selectie"}: </span>
                      {selection.riders.map((rider) => rider.name).join(", ")}
                    </p>
                  )}
                  {eventId && canSelect && !selection?.fromLadder && selectionOptions.length > 0 && (
                    <LadderSelection
                      teamId={team.id}
                      eventId={eventId}
                      options={selectionOptions}
                      selected={(selection?.riders ?? []).map(({ kind, id }) => ({ kind, id }))}
                    />
                  )}
                  {eventId && userId && (
                    <div className="mt-auto space-y-2">
                      <TeamAvailabilityButtons teamId={team.id} eventId={eventId} current={mine?.status ?? null} />
                      {(["available", "maybe"] as const).map((status) => {
                        const names = availabilityFor(eventId, status);
                        return names.length > 0 ? (
                          <p key={status} className="text-xs text-muted-foreground">
                            {status === "available" ? "Beschikbaar" : "Misschien"}: {names.join(", ")}
                          </p>
                        ) : null;
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Teamresultaten</h2>
        {(teamResults ?? []).length === 0 ? (
          <EmptyState className="mt-3">Nog geen resultaten.</EmptyState>
        ) : (
          <ul className="mt-2 divide-y">
            {(teamResults as TeamResult[]).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {r.competition}
                    {r.round_label ? ` - ${r.round_label}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.round_at ? new Date(r.round_at).toLocaleDateString("nl-NL", { dateStyle: "medium" }) : "-"}
                    {r.position ? ` · #${r.position}${r.total_teams ? `/${r.total_teams}` : ""}` : ""}
                    {r.points !== null && r.points !== undefined ? ` · ${r.points} pt` : ""}
                  </p>
                </div>
                {canEditResults && <DeleteResultButton teamId={team.id} resultId={r.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      {(canEditChat || canEditResults) && (
        <section className="space-y-6 rounded-2xl border border-dashed border-foreground/20 bg-card/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Beheer</h2>
          {canEditChat && (
            <TeamChatLinksForm teamId={team.id} whatsappUrl={(waGroups ?? [])[0]?.invite_url ?? null} discordUrl={team.discord_url} />
          )}
          {canEditResults && <TeamResultForm teamId={team.id} />}
        </section>
      )}
    </div>
  );
}

type TeamResult = {
  id: string;
  competition: string;
  round_label: string | null;
  round_at: string | null;
  position: number | null;
  total_teams: number | null;
  points: number | string | null;
};

function AdviceView({
  advice,
  opponent,
  options,
  selection,
}: {
  advice: LadderAdvice | null;
  opponent: string;
  options: LadderRouteRow[];
  selection: boolean;
}) {
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
        {(advice.weightKg.ours != null || advice.weightKg.theirs != null) && (
          <span className="rounded-md border px-2 py-1 tabular-nums text-muted-foreground">
            Gewicht {advice.weightKg.ours ?? "–"} / {advice.weightKg.theirs ?? "–"} kg
          </span>
        )}
        <span className="px-1 py-1 text-muted-foreground">
          {selection ? "Selectie · " : ""}
          {advice.ours.riders} / {advice.theirs.riders} renners · 90 d: {advice.ours.with90d} / {advice.theirs.with90d}
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

