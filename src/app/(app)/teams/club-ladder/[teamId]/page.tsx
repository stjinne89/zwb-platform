import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Activity, ArrowUpRight, RefreshCw, Swords, Trophy, Users } from "lucide-react";
import { BackLink, EmptyState, PageHeader } from "@/components/app-ui";
import { TeamChatLinks } from "@/components/team-chat-links";
import { canAssignLadderRiders, canEditLadderPuzzle } from "@/lib/club-ladder/access";
import { loadTeamMatches } from "@/lib/club-ladder/matches";
import { parseLadderRiderSort, sortLadderRiders } from "@/lib/club-ladder/riders";
import { loadLadderSelections } from "@/lib/club-ladder/selection";
import { ladderRouteOptions } from "@/lib/club-ladder/routes";
import { raceOrganisationUrl } from "@/lib/club-ladder/challenge-post";
import { CHALLENGE_RANGE, challengeableTeams } from "@/lib/club-ladder/rules";
import { storeLadderResults } from "@/lib/club-ladder/store";
import { ladderResultUrl, ladderTeamResults, type TeamMatchResult } from "@/lib/club-ladder/event-result";
import { ladderOpponentFromTitle } from "@/lib/club-ladder/fixture-events";
import {
  fetchClubLadderSummary,
  findStandingWindow,
  type ClubLadderFixture,
  type ClubLadderResult,
  type ClubLadderStanding,
} from "@/lib/club-ladder/summary";
import { normalizeTeamName } from "@/lib/ladder";
import { ladderRouteRows, loadLadderRouteAdvice, type AdviceCandidate, type LadderRouteAdvice } from "@/lib/club-ladder/route-advice";
import { getRequestAccess } from "@/lib/auth/request";
import { loadWeightMissing } from "@/lib/teams/missing-weight";
import { MissingWeightNotice } from "@/components/missing-weight-notice";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { DeleteResultButton, TeamChatLinksForm, TeamResultForm } from "../../[id]/_components/admin-panel";
import { LadderRouteAdviceView } from "../_components/ladder-route-advice";
import { LadderChallengePost } from "../_components/ladder-challenge-post";
import { LadderPoolAdd } from "../_components/ladder-pool-add";
import { LadderRoutes } from "../_components/ladder-routes";
import { Metric, StandingsTable, TeamRidersTable } from "../_components/team-tables";
import {
  fixtureMatches,
  fixtureWhen,
  latestResultFor,
  loadLadderAddOptions,
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
import { WhatsAppShareLink } from "@/components/whatsapp-share-link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Tijd om ontbrekende renners van wedstrijden op te halen voordat de pagina antwoordt. */
const ANALYSIS_BUDGET_MS = 12_000;
/** Zelfde budget als de racebriefing om ZRS en ZwiftRacing na het antwoord aan te vullen. */
const METRICS_REFRESH_BUDGET_MS = 20_000;

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
  // Een puzzelteam deelt alleen de rol teamcaptain in, een team erbuiten wie ladderteams indeelt.
  const inPuzzle = Boolean(puzzle?.teams.some((row) => row.id === team.id));
  const canAddRider = puzzle != null && (inPuzzle ? canEditRoutes : canAssign);
  const addOptions = canAddRider ? await loadLadderAddOptions(admin) : null;
  const teamRiderIds = new Set(teamRiders.map((rider) => rider.rosterEntryId ?? rider.id));

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
  const plannedNames = new Set(planned.map(normalizeTeamName));
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

  // Wat de losse teampagina had: chatkanalen en teamresultaten. Aanmelden en de
  // selectie van een wedstrijd staan sinds 2026-11-08 op het event zelf.
  const [{ data: waGroups }, { data: teamResults }, { data: captainRows }, selections, storedMatches, { data: pastEvents }] = await Promise.all([
    supabase
      .from("whatsapp_groups")
      .select("id, name, invite_url, description, kind")
      .eq("team_id", team.id)
      .order("display_order")
      .order("name"),
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
    loadTeamMatches(admin, aliases, LADDER_RESULTS_SHOWN),
    supabase
      .from("events")
      .select("id, title, start_at, club_ladder_opponent")
      .eq("team_id", team.id)
      .eq("type", "ladder")
      .lt("start_at", new Date().toISOString()),
  ]);
  // Gereden wedstrijden: de bewaarde en die van de summary van nu (die bewaart de pagina pas na het antwoord).
  const matchResults = ladderTeamResults(
    [
      ...storedMatches,
      ...ladderResults.map((result) => ({
        result_id: result.resultId,
        raced_on: result.date,
        raced_at: result.time,
        challenger: result.challenger,
        challenger_score: result.challengerScore,
        opponent: result.opponent,
        opponent_score: result.opponentScore,
      })),
    ],
    aliases,
    ((pastEvents ?? []) as Array<{ id: string; title: string; start_at: string; club_ladder_opponent: string | null }>).map((event) => ({
      id: event.id,
      start_at: event.start_at,
      opponent: event.club_ladder_opponent ?? ladderOpponentFromTitle(event.title, team.name),
    })),
  ).slice(0, LADDER_RESULTS_SHOWN);
  // Nieuwste bovenaan; de ladderpositie (zonder datum) is de stand van nu en staat erboven.
  const resultItems = [
    ...matchResults.map((result) => ({ kind: "match" as const, key: `m${result.resultId}`, at: result.racedOn, result })),
    ...((teamResults ?? []) as TeamResult[]).map((row) => ({ kind: "team" as const, key: row.id, at: row.round_at ?? "9999", row })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const isCaptain = (captainRows ?? []).length > 0;
  const canEditChat = access.has("teams.manage_roster") || isCaptain;
  const canEditResults = access.has("teams.manage_results") || isCaptain;
  const opponent = tegen ? standings.find((row) => normalizeTeamName(row.name) === normalizeTeamName(tegen)) ?? null : null;

  const options = ladderRouteOptions();
  const favorites = new Set(((favoriteRows ?? []) as Array<{ route_slug: string }>).map((row) => row.route_slug));
  const routeRows = ladderRouteRows(options);

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

  let routeAdvice: LadderRouteAdvice | null = null;
  // Zet een captain (of de ladder) een selectie op de matchup, dan rekent het advies met precies die renners.
  const opponentFixture = opponent
    ? teamFixtures.find((fixture) => normalizeTeamName(fixtureOpponent(fixture) ?? "") === normalizeTeamName(opponent.name))
    : undefined;
  const adviceSelection = opponentFixture ? selectionFor(opponentFixture) : null;
  const hasSelection = (adviceSelection?.riders.length ?? 0) > 0;
  if (opponent) {
    // Eerst de verse uitslagen bewaren, dan de renners van beide teams aanvullen.
    await storeLadderResults(admin, ladderResults);
    // De selectie, anders wie nu in de ploeg zit, tegen wie de laatste wedstrijden van de
    // tegenstander reed; niet de oude opstelling uit eerdere ladderraces (2026-11-03).
    const candidates: AdviceCandidate[] = hasSelection
      ? adviceSelection!.riders.map((rider) => ({
          key: `${rider.kind}:${rider.id}`,
          name: rider.name,
          zwiftId: rider.zwiftId,
          profileId: rider.kind === "profile" ? rider.id : null,
        }))
      : teamRiders.map((rider) => ({
          key: `${rider.rosterEntryId ? "roster" : "profile"}:${rider.id}`,
          name: rider.name,
          zwiftId: rider.zwiftId,
          profileId: rider.rosterEntryId ? null : rider.id,
        }));
    routeAdvice = await loadLadderRouteAdvice(admin, {
      ourNames: [...aliases, ...(match ? [match.name] : [])],
      opponent: opponent.name,
      candidates,
      favorites,
      options,
      budgetMs: ANALYSIS_BUDGET_MS,
      refreshBudgetMs: METRICS_REFRESH_BUDGET_MS,
    });
  } else if (ladderResults.length > 0) {
    after(() => storeLadderResults(admin, ladderResults));
  }

  // Wie zelf in dit team rijdt zonder gewicht, staat leeg in de W/kg-kolommen.
  const needsWeight =
    userId != null &&
    teamRiders.some((rider) => rider.rosterEntryId == null && rider.id === userId) &&
    (await loadWeightMissing(supabase, userId));

  const adviceHref = (name: string) =>
    `/teams/club-ladder/${team.id}?tegen=${encodeURIComponent(name)}${sortParam ? `&sort=${sortParam}` : ""}#advies`;
  const opponentHref = (row: ClubLadderStanding) => adviceHref(row.name);
  // Een geplande wedstrijd met event: advies, selectie en matchup staan op het event (2026-11-11).
  const plannedHref = (row: ClubLadderStanding) => {
    const fixture = teamFixtures.find(
      (item) => item.fixtureId && normalizeTeamName(fixtureOpponent(item) ?? "") === normalizeTeamName(row.name),
    );
    const eventId = fixture?.fixtureId ? eventByFixture.get(fixture.fixtureId) : undefined;
    return eventId ? `/events/${eventId}${fixture!.route ? "#matchup" : "#parcoursadvies"}` : null;
  };

  return (
    <div className="space-y-6">
      <BackLink href="/teams/club-ladder" label="Club Ladder" />
      <PageHeader
        eyebrow="Club Ladder"
        title={team.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <WhatsAppShareLink text={`${team.name} in de Club Ladder`} path={`/teams/club-ladder/${team.id}`} />
            <TeamChatLinks whatsappGroups={waGroups ?? []} discordUrl={team.discord_url} />
          </div>
        }
      />

      {needsWeight && <MissingWeightNotice />}

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
        {match && canAssign && challengeable.length > 0 && (
          <div className="mt-3">
            <LadderChallengePost
              teamName={match.name}
              channelUrl={raceOrganisationUrl(match.region)}
              candidates={challengeable.map((row) => ({
                name: row.name,
                ladderTeamId: row.ladderTeamId,
                position: row.position,
                planned: plannedNames.has(normalizeTeamName(row.name)),
              }))}
            />
          </div>
        )}
        <StandingsTable
          rows={rankingRows}
          selectedAliases={aliases}
          challengeable={challengeable.map((row) => row.name)}
          planned={planned}
          opponentHref={opponentHref}
          plannedHref={plannedHref}
          activeOpponent={opponent?.name ?? null}
          scrollable={!match}
        />
      </section>

      {opponent && (
        <section id="advies" className="scroll-mt-20 rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Advies tegen {opponent.name}</h2>
          <LadderRouteAdviceView
            routeAdvice={routeAdvice}
            opponent={opponent.name}
            options={routeRows}
            selection={hasSelection}
          />
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
          canRemove={canAssign && !inPuzzle}
          opponent={opponent?.name ?? null}
        />
      </section>

      {addOptions && (
        <LadderPoolAdd
          title={`Renner aan ${team.name} toevoegen`}
          teamId={team.id}
          members={addOptions.members.filter((member) => !teamRiderIds.has(member.id))}
          roster={addOptions.roster.filter((entry) => !teamRiderIds.has(entry.id))}
        />
      )}

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
                  {eventId && (
                    <Link
                      href={`/events/${eventId}#matchup`}
                      className="self-start font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Aanmelden en matchup
                    </Link>
                  )}
                  {/* Het routeadvies helpt zolang het parcours nog niet vastligt; daarna telt de matchup.
                      Met een event staat het daar, naast de selectie (2026-11-11). */}
                  {rival && (!eventId || !fixture.route) && (
                    <Link
                      href={eventId ? `/events/${eventId}#parcoursadvies` : adviceHref(rival)}
                      scroll={!eventId ? false : undefined}
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
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Teamresultaten</h2>
        {resultItems.length === 0 ? (
          <EmptyState className="mt-3">Nog geen resultaten.</EmptyState>
        ) : (
          <ul className="mt-2 divide-y">
            {resultItems.map((item) => {
              if (item.kind === "match") return <MatchResultRow key={item.key} result={item.result} />;
              const r = item.row;
              return (
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
              );
            })}
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

/** Zoveel gereden wedstrijden onder Teamresultaten. */
const LADDER_RESULTS_SHOWN = 20;

const racedOnFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeZone: "UTC" });

/** Een gereden wedstrijd: alleen de uitslag; klikbaar naar het event, en zonder event naar de ladder. */
function MatchResultRow({ result }: { result: TeamMatchResult }) {
  const body = (
    <>
      <div className="min-w-0">
        <p className="truncate font-medium">{result.opponent}</p>
        <p className="text-xs text-muted-foreground">{racedOnFormat.format(new Date(`${result.racedOn}T12:00:00Z`))}</p>
      </div>
      <div className="flex shrink-0 items-baseline gap-2">
        <span className="text-xs text-muted-foreground">{result.won ? "gewonnen" : "verloren"}</span>
        <span className={cn("font-semibold tabular-nums", result.won && "text-primary")}>
          {result.ourScore}–{result.theirScore}
        </span>
        {!result.eventId && <ArrowUpRight className="size-3.5 self-center text-muted-foreground" aria-label="op de ladder" />}
      </div>
    </>
  );
  return (
    <li>
      {result.eventId ? (
        <Link
          href={`/events/${result.eventId}#uitslag`}
          className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/50"
        >
          {body}
        </Link>
      ) : (
        <a
          href={ladderResultUrl(result.resultId)}
          target="_blank"
          rel="noopener noreferrer"
          className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/50"
        >
          {body}
        </a>
      )}
    </li>
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
