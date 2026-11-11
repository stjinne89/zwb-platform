import "server-only";

import { after } from "next/server";
import { loadRiderMetrics, refreshRiderMetrics } from "@/lib/race-briefing/metrics";
import type { createAdminClient } from "@/lib/supabase/admin";
import { buildLadderAdvice, recentMatches, type LadderAdvice } from "./advice";
import { riderRaces } from "./event-matchup";
import { loadIntervalsPower } from "./intervals-power";
import { ensureMatchRiders, loadStoredMatches, loadTeamMatches } from "./matches";
import { riderPowerFromMatches, squadPool } from "./matchup";
import { pickFive, RECENT_RACES, recentTeamRiders, SQUAD_FOCUSES, type SquadFocus } from "./opponent-five";
import { riderPower, type AdviceRider } from "./rank-pairs";
import { loadRiderWeights } from "./rider-weights";
import { ladderOpponentFromTitle } from "./fixture-events";
import { loadLadderSelections, loadLadderTeamRiders } from "./selection";
import { ladderRouteOptions, ROUTE_CLASS_LABELS, worldLabel, type LadderRouteOption } from "./routes";
import type { PowerWkg } from "./team-power";

type Admin = ReturnType<typeof createAdminClient>;

/** Een renner van ons waarmee het advies rekent: de selectie, anders de hele ploeg. */
export type AdviceCandidate = { key: string; name: string; zwiftId: number | null; profileId: string | null };

/** De vijf van de tegenstander waartegen het advies rekent, met in hoeveel van zijn laatste races ze reden. */
export type OpponentSquad = { riders: Array<{ name: string; races: number }>; races: number };

export type LadderRouteAdvice = {
  advice: LadderAdvice | null;
  /** Per type de beste vijf van de tegenstander met hun advies; null als er niets te kiezen is. */
  byFocus: Array<{ focus: SquadFocus; advice: LadderAdvice | null; squad: OpponentSquad }> | null;
  /** De ploeg van de tegenstander als er maar één advies is. */
  squad: OpponentSquad | null;
};

/** Wat de parcourskaarten van elk parcours tonen; dezelfde lijst als de favorieten. */
export type LadderRouteRowData = {
  slug: string;
  name: string;
  world: string;
  worldLabel: string;
  eventOnly: boolean;
  zwiftInsiderUrl: string | null;
  classLabel: string;
  laps: LadderRouteOption["laps"];
};

export function ladderRouteRows(options: LadderRouteOption[] = ladderRouteOptions()): LadderRouteRowData[] {
  return options.map((option) => ({
    slug: option.slug,
    name: option.name,
    world: option.world,
    worldLabel: worldLabel(option.world),
    eventOnly: option.eventOnly,
    zwiftInsiderUrl: option.zwiftInsiderUrl,
    classLabel: ROUTE_CLASS_LABELS[option.routeClass],
    laps: option.laps,
  }));
}

/**
 * Parcoursadvies tegen één tegenstander: per parcours ons voordeel, met onze
 * renners (de selectie, anders de hele ploeg) tegen de vijf die de
 * tegenstander per type uit zijn laatste races zou kiezen. Gedeeld door de
 * Club Ladder-teampagina en de eventpagina van een ladderrace (2026-11-11).
 */
export async function loadLadderRouteAdvice(
  admin: Admin,
  input: {
    ourNames: string[];
    opponent: string;
    candidates: AdviceCandidate[];
    favorites: Set<string>;
    options?: LadderRouteOption[];
    /** Wachten op ontbrekende renners van wedstrijden voordat de pagina antwoordt. */
    budgetMs: number;
    /** Na het antwoord ZwiftRacing aanvullen, zo lang; 0 slaat dat over. */
    refreshBudgetMs: number;
  },
): Promise<LadderRouteAdvice> {
  const { ourNames, opponent, candidates, favorites, budgetMs, refreshBudgetMs } = input;
  const options = input.options ?? ladderRouteOptions();
  const [ours, theirs] = await Promise.all([loadTeamMatches(admin, ourNames), loadTeamMatches(admin, [opponent], RECENT_RACES)]);
  const all = [...new Map([...ours, ...theirs].map((row) => [row.result_id, row])).values()];
  await ensureMatchRiders(admin, all, budgetMs);
  const stored = await loadStoredMatches(admin, all);
  const ourIds = [...new Set(candidates.map((rider) => rider.zwiftId).filter((id): id is number => id != null))];
  // Wie de laatste tien ladderraces voor de tegenstander reed; daaruit kiezen we per type vijf (2026-11-04).
  const recent = recentTeamRiders(stored, opponent);
  const theirIds = recent.riders.map((rider) => rider.zwiftId);
  const [ourRaces, metrics, riderWeights, intervals] = await Promise.all([
    riderRaces(admin, ourIds),
    loadRiderMetrics([...ourIds, ...theirIds]),
    loadRiderWeights(admin, [...ourIds, ...theirIds]),
    loadIntervalsPower(
      admin,
      candidates.map((rider) => rider.profileId).filter((id): id is string => id != null),
    ),
  ]);
  // ZwiftRacing van beide ploegen na het antwoord aanvullen: wie ontbreekt (zoals een
  // net geclaimd Zwift-ID) of ouder is dan een dag, telt bij het volgende bezoek mee.
  if (refreshBudgetMs > 0) after(() => refreshRiderMetrics([...ourIds, ...theirIds], metrics, { budgetMs: refreshBudgetMs }));
  const known = new Set(stored.map((row) => row.resultId));
  const ladderPower = riderPowerFromMatches([...stored, ...ourRaces.filter((row) => !known.has(row.resultId))]);
  // 90 dagen van ZwiftRacing, zoals de matchup.
  const power90 = new Map<number, PowerWkg>();
  for (const [id, row] of metrics) {
    if (row.power) power90.set(id, { s15: row.power.s15, m1: row.power.m1, m5: row.power.m5, m20: row.power.m20 });
  }
  // Van ons eerst intervals.icu, dan 90 dagen van ZwiftRacing, dan de ladderraces (2026-11-04).
  const ourRiders: AdviceRider[] = candidates.map((rider) => ({
    key: rider.key,
    name: rider.name,
    ...riderPower({
      intervals: rider.profileId ? intervals.get(rider.profileId) : null,
      power90: rider.zwiftId != null ? power90.get(rider.zwiftId) : null,
      ladder: rider.zwiftId != null ? ladderPower.get(rider.zwiftId)?.wkg : null,
      zwiftWeightKg: rider.zwiftId != null ? riderWeights.get(rider.zwiftId) : null,
    }),
  }));
  const pool = squadPool(recent, ladderPower, power90, riderWeights);
  const adviceFor = (focus: SquadFocus) => {
    const five = pickFive(pool, focus, options);
    return {
      focus,
      squad: { riders: five.map(({ name, races }) => ({ name, races })), races: recent.races },
      advice: buildLadderAdvice({
        options,
        favorites,
        ourNames,
        ours: ourRiders,
        theirName: opponent,
        theirs: five.map((rider) => ({
          key: String(rider.zwiftId),
          name: rider.name,
          wkg: rider.wkg,
          weightKg: rider.weightKg,
          source: power90.has(rider.zwiftId) ? "90d" : "ladder",
        })),
        // Uitslagen per routetype en eigen routekeuzes: alleen de laatste 90 dagen, net als het vermogen.
        matches: recentMatches(stored),
      }),
    };
  };
  // Met vijf of minder renners is er niets te kiezen: dan één advies.
  if (pool.length > 5) {
    const byFocus = SQUAD_FOCUSES.map(adviceFor);
    return { advice: byFocus[0].advice, byFocus, squad: null };
  }
  const only = adviceFor("overall");
  return { advice: only.advice, byFocus: null, squad: only.squad };
}

const positiveId = (value: unknown) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/** Na de matchup, die de renners van de wedstrijden al ophaalt: kort wachten volstaat. */
const EVENT_BUDGET_MS = 2_000;

export type LadderEventRouteAdvice = {
  opponent: string;
  routeAdvice: LadderRouteAdvice;
  routeRows: LadderRouteRowData[];
  selection: boolean;
};

/**
 * Parcoursadvies op de eventpagina van een ladderrace, zolang het parcours nog
 * niet vastligt: zet de sync een route op het event, dan is er niets meer te
 * kiezen en geeft dit null.
 */
export async function loadLadderEventRouteAdvice(
  admin: Admin,
  eventId: string,
  event: { team_id: string | null; title: string; zwift_route_id: number | string | null },
): Promise<LadderEventRouteAdvice | null> {
  if (!event.team_id || positiveId(event.zwift_route_id)) return null;
  const teamId = event.team_id;
  const [{ data: link }, { data: team }, selections, { data: favoriteRows }] = await Promise.all([
    admin.from("events").select("club_ladder_opponent").eq("id", eventId).maybeSingle(),
    admin.from("teams").select("name").eq("id", teamId).maybeSingle(),
    loadLadderSelections(admin, teamId, [eventId]),
    admin.from("club_ladder_favorite_routes").select("route_slug").eq("team_id", teamId),
  ]);
  const ourName = (team?.name as string | undefined) ?? null;
  if (!ourName) return null;
  const opponent = (link?.club_ladder_opponent as string | null | undefined) ?? ladderOpponentFromTitle(event.title, ourName);
  if (!opponent) return null;
  // De selectie (of de opstelling van de ladder), anders iedereen die gekozen kan worden.
  const selected = selections.get(eventId)?.riders ?? [];
  const riders = selected.length > 0 ? selected : await loadLadderTeamRiders(admin, teamId);
  const candidates: AdviceCandidate[] = riders.map((rider) => ({
    key: `${rider.kind}:${rider.id}`,
    name: rider.name,
    zwiftId: rider.zwiftId,
    profileId: rider.kind === "profile" ? rider.id : null,
  }));
  const options = ladderRouteOptions();
  const routeAdvice = await loadLadderRouteAdvice(admin, {
    ourNames: [ourName],
    opponent,
    candidates,
    favorites: new Set(((favoriteRows ?? []) as Array<{ route_slug: string }>).map((row) => row.route_slug)),
    options,
    budgetMs: EVENT_BUDGET_MS,
    // De matchup ververst ZwiftRacing al na het antwoord; twee tegelijk lopen elkaar in de weg.
    refreshBudgetMs: 0,
  });
  return { opponent, routeAdvice, routeRows: ladderRouteRows(options), selection: selected.length > 0 };
}
