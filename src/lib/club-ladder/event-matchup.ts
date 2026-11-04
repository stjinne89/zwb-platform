import "server-only";

import { after } from "next/server";
import { loadRiderMetrics, refreshRiderMetrics } from "@/lib/race-briefing/metrics";
import type { createAdminClient } from "@/lib/supabase/admin";
import { ladderOpponentFromTitle } from "./fixture-events";
import { ensureMatchRiders, loadStoredMatches, loadTeamMatches } from "./matches";
import { buildLadderMatchup, opponentRiderIds, type LadderMatchup, type MatchupSignup } from "./matchup";
import { loadRiderWeights } from "./rider-weights";
import { findLadderRouteSlug, ladderRouteBySlug, ROUTE_CLASS_LABELS } from "./routes";
import { loadLadderSelections } from "./selection";
import { sameTeam } from "./team-power";
import type { PowerWkg, StoredMatch } from "./team-power";

type Admin = ReturnType<typeof createAdminClient>;

/** Wachten op ontbrekende renners voordat de pagina rendert; de rest volgt na het antwoord. */
const PAGE_BUDGET_MS = 6_000;
const AFTER_BUDGET_MS = 30_000;
const METRICS_BUDGET_MS = 8_000;

export type LadderEventMatchup = { matchup: LadderMatchup; routeLabel: string | null };

const positiveId = (value: unknown) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export async function loadLadderEventMatchup(
  admin: Admin,
  eventId: string,
  event: { team_id: string | null; title: string; zwift_route_id: number | string | null },
): Promise<LadderEventMatchup | null> {
  if (!event.team_id) return null;
  // Apart gelezen: zonder 0302 geeft dit een fout en blijft de pagina heel.
  const [{ data: link, error: linkError }, { data: team }] = await Promise.all([
    admin.from("events").select("club_ladder_fixture_id, club_ladder_opponent").eq("id", eventId).maybeSingle(),
    admin.from("teams").select("name").eq("id", event.team_id).maybeSingle(),
  ]);
  const fixtureId = positiveId(link?.club_ladder_fixture_id);
  const ourName = (team?.name as string | undefined) ?? null;
  if (linkError || !fixtureId || !ourName) return null;
  const opponent =
    (link?.club_ladder_opponent as string | null | undefined) ?? ladderOpponentFromTitle(event.title, ourName);
  if (!opponent) return null;

  const [{ data: signupRows }, selections] = await Promise.all([
    admin.from("club_ladder_fixture_signups").select("zwift_id, team, name, position").eq("fixture_id", fixtureId),
    loadLadderSelections(admin, event.team_id, [eventId]),
  ]);
  const signups: MatchupSignup[] = ((signupRows ?? []) as Array<{ zwift_id: number | string; team: string; name: string; position: number | null }>)
    .map((row) => ({ zwiftId: positiveId(row.zwift_id) ?? 0, team: row.team, name: row.name, position: row.position }))
    .filter((row) => row.zwiftId > 0);
  // Selectie van een captain: telt alleen zolang wij op de ladder niemand aangemeld hebben.
  const ourSelection: MatchupSignup[] = signups.some((row) => sameTeam(row.team, ourName))
    ? []
    : (selections.get(eventId)?.riders ?? []).flatMap((rider) =>
        rider.zwiftId ? [{ zwiftId: rider.zwiftId, team: ourName, name: rider.name, position: null }] : [],
      );

  const [ours, theirs] = await Promise.all([loadTeamMatches(admin, [ourName]), loadTeamMatches(admin, [opponent])]);
  const all = [...new Map([...ours, ...theirs].map((row) => [row.result_id, row])).values()];
  await ensureMatchRiders(admin, all, PAGE_BUDGET_MS);
  if (all.some((row) => !row.riders_fetched_at)) after(() => ensureMatchRiders(admin, all, AFTER_BUDGET_MS));

  const matches = await loadStoredMatches(admin, all);
  const theirSquad = signups.some((row) => sameTeam(row.team, opponent)) ? [] : opponentRiderIds(matches, opponent);
  // Ook wie de laatste wedstrijden reed: dat is de vergelijking zonder aanmeldingen.
  const raceIds = matches.flatMap((match) => match.riders.map((rider) => rider.zwiftId).filter((id): id is number => id != null));
  const zwiftIds = [...new Set([...signups.map((row) => row.zwiftId), ...ourSelection.map((row) => row.zwiftId), ...theirSquad])];
  const [riderMatches, metrics, riderWeights] = await Promise.all([
    riderRaces(admin, zwiftIds),
    loadRiderMetrics(zwiftIds),
    loadRiderWeights(admin, [...zwiftIds, ...raceIds]),
  ]);
  if (zwiftIds.length > 0) after(() => refreshRiderMetrics(zwiftIds, metrics, { budgetMs: METRICS_BUDGET_MS }));
  const scores = new Map<number, number>();
  // 90 dagen van ZwiftRacing: met de API-sleutel ververst, anders met de hand via Chrome.
  const power90 = new Map<number, PowerWkg>();
  for (const [id, row] of metrics) {
    if (row.racingScore != null) scores.set(id, row.racingScore);
    if (row.power) power90.set(id, { s15: row.power.s15, m1: row.power.m1, m5: row.power.m5, m20: row.power.m20 });
  }

  const slug = findLadderRouteSlug(null, positiveId(event.zwift_route_id));
  const option = slug ? ladderRouteBySlug(slug) : null;
  const known = new Set(matches.map((match) => match.resultId));
  return {
    matchup: buildLadderMatchup({
      ourName,
      opponent,
      signups,
      ourSelection,
      theirSquad,
      matches,
      riderMatches: [...matches, ...riderMatches.filter((match) => !known.has(match.resultId))],
      power90,
      scores,
      weights: option?.weights ?? null,
      terrain: option?.terrain ?? null,
      riderWeights,
    }),
    routeLabel: option ? ROUTE_CLASS_LABELS[option.routeClass] : null,
  };
}

/** Bewaarde ladderraces van deze renners, ook als ze toen voor een ander team reden. */
export async function riderRaces(admin: Admin, zwiftIds: number[]): Promise<StoredMatch[]> {
  if (zwiftIds.length === 0) return [];
  const { data } = await admin
    .from("club_ladder_match_riders")
    .select("result_id, position, name, team, zwift_id, racing_score, power_wkg")
    .in("zwift_id", zwiftIds);
  const byResult = new Map<number, StoredMatch>();
  for (const row of (data ?? []) as Array<{
    result_id: number;
    position: number;
    name: string;
    team: string;
    zwift_id: number | string | null;
    racing_score: number | string | null;
    power_wkg: PowerWkg | null;
  }>) {
    const match =
      byResult.get(row.result_id) ??
      ({ resultId: row.result_id, racedOn: "", routeName: null, routeSlug: null, challenger: "", challengerScore: 0, opponent: "", opponentScore: 0, riders: [] } satisfies StoredMatch);
    match.riders.push({
      name: row.name,
      position: row.position,
      points: 0,
      team: row.team,
      timeS: null,
      avgWkg: null,
      zwiftId: positiveId(row.zwift_id),
      weightKg: null,
      racingScore: row.racing_score == null ? null : Number(row.racing_score),
      powerWkg: row.power_wkg,
    });
    byResult.set(row.result_id, match);
  }
  return [...byResult.values()];
}
