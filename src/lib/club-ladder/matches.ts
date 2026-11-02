import "server-only";

import { fetchSubgroupResults, fetchZwiftEvent, zwiftClubConfigured, type SubgroupResult } from "@/lib/events/zwift-club";
import type { createAdminClient } from "@/lib/supabase/admin";
import { fetchLadderResultPage, parseLadderResultPage } from "./result-page";
import { findLadderRouteSlug } from "./routes";
import { matchZwiftResults, type MatchRider, type PowerWkg, type StoredMatch } from "./team-power";

type Admin = ReturnType<typeof createAdminClient>;

type MatchRow = {
  result_id: number;
  raced_on: string;
  route_name: string | null;
  route_slug: string | null;
  challenger: string;
  challenger_score: number;
  opponent: string;
  opponent_score: number;
  zwift_event_id: number | null;
  riders_fetched_at: string | null;
};

type RiderRow = {
  result_id: number;
  position: number;
  name: string;
  team: string;
  points: number;
  time_s: number | string | null;
  avg_wkg: number | string | null;
  zwift_id: number | string | null;
  weight_kg: number | string | null;
  racing_score: number | string | null;
  power_wkg: PowerWkg | null;
};

const MATCH_COLUMNS =
  "result_id, raced_on, route_name, route_slug, challenger, challenger_score, opponent, opponent_score, zwift_event_id, riders_fetched_at";

const num = (value: number | string | null) => (value == null || value === "" ? null : Number(value));

/** De laatste wedstrijden van deze teams (op exacte ladder-naam), nieuwste eerst. */
export async function loadTeamMatches(admin: Admin, names: string[], limit = 8): Promise<MatchRow[]> {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length === 0) return [];
  const [asChallenger, asOpponent] = await Promise.all([
    admin.from("club_ladder_matches").select(MATCH_COLUMNS).in("challenger", unique).order("raced_on", { ascending: false }).limit(limit),
    admin.from("club_ladder_matches").select(MATCH_COLUMNS).in("opponent", unique).order("raced_on", { ascending: false }).limit(limit),
  ]);
  const byId = new Map<number, MatchRow>();
  for (const row of [...((asChallenger.data ?? []) as MatchRow[]), ...((asOpponent.data ?? []) as MatchRow[])]) byId.set(row.result_id, row);
  return [...byId.values()].sort((a, b) => b.raced_on.localeCompare(a.raced_on) || b.result_id - a.result_id).slice(0, limit);
}

async function zwiftResultsFor(eventId: number): Promise<SubgroupResult[]> {
  if (!zwiftClubConfigured()) return [];
  const event = (await fetchZwiftEvent(String(eventId))) as { eventSubgroups?: Array<{ id?: unknown }> } | null;
  const results: SubgroupResult[] = [];
  for (const subgroup of event?.eventSubgroups ?? []) {
    if (subgroup.id == null) continue;
    results.push(...(await fetchSubgroupResults(String(subgroup.id))));
  }
  return results;
}

/**
 * Haalt de renners op van wedstrijden waar ze nog ontbreken: de openbare
 * uitslagpagina, dan de Zwift-uitslag van hetzelfde event voor Zwift-ID en
 * vermogen. Binnen een tijdbudget; wat overblijft komt bij een volgende keer.
 */
export async function ensureMatchRiders(admin: Admin, matches: MatchRow[], budgetMs = 15_000) {
  const deadline = Date.now() + budgetMs;
  for (const match of matches) {
    if (match.riders_fetched_at) continue;
    if (Date.now() > deadline) break;
    try {
      const page = parseLadderResultPage(await fetchLadderResultPage(match.result_id), {
        challenger: match.challenger,
        opponent: match.opponent,
        challengerScore: match.challenger_score,
        opponentScore: match.opponent_score,
      });
      const zwift = page.zwiftEventId ? await zwiftResultsFor(page.zwiftEventId).catch(() => []) : [];
      const riders = matchZwiftResults(page.riders, zwift);
      await admin.from("club_ladder_match_riders").upsert(
        riders.map((rider) => ({
          result_id: match.result_id,
          position: rider.position,
          name: rider.name,
          team: rider.team,
          points: rider.points,
          time_s: rider.timeS,
          avg_wkg: rider.avgWkg,
          zwift_id: rider.zwiftId,
          weight_kg: rider.weightKg,
          racing_score: rider.racingScore,
          power_wkg: rider.powerWkg,
        })),
        { onConflict: "result_id,position" },
      );
      const routeSlug = findLadderRouteSlug(page.routeName ?? match.route_name, page.zwiftRouteId) ?? match.route_slug;
      // Zonder Zwift-uitslag (nog niet binnen of geen account) later opnieuw proberen.
      const complete = zwift.length > 0 || !zwiftClubConfigured() || !page.zwiftEventId;
      await admin
        .from("club_ladder_matches")
        .update({ zwift_event_id: page.zwiftEventId, route_slug: routeSlug, ...(complete ? { riders_fetched_at: new Date().toISOString() } : {}) })
        .eq("result_id", match.result_id);
      match.route_slug = routeSlug;
    } catch {
      // Een pagina die niet laadt, slaan we deze keer over.
    }
  }
}

/** Wedstrijden met hun renners, voor het advies. */
export async function loadStoredMatches(admin: Admin, matches: MatchRow[]): Promise<StoredMatch[]> {
  if (matches.length === 0) return [];
  const { data } = await admin
    .from("club_ladder_match_riders")
    .select("result_id, position, name, team, points, time_s, avg_wkg, zwift_id, weight_kg, racing_score, power_wkg")
    .in("result_id", matches.map((match) => match.result_id));
  const riders = new Map<number, MatchRider[]>();
  for (const row of (data ?? []) as RiderRow[]) {
    const list = riders.get(row.result_id) ?? [];
    list.push({
      name: row.name,
      position: row.position,
      points: row.points,
      team: row.team,
      timeS: num(row.time_s),
      avgWkg: num(row.avg_wkg),
      zwiftId: num(row.zwift_id),
      weightKg: num(row.weight_kg),
      racingScore: num(row.racing_score),
      powerWkg: row.power_wkg,
    });
    riders.set(row.result_id, list);
  }
  return matches.map((match) => ({
    resultId: match.result_id,
    racedOn: match.raced_on,
    routeName: match.route_name,
    routeSlug: match.route_slug,
    challenger: match.challenger,
    challengerScore: match.challenger_score,
    opponent: match.opponent,
    opponentScore: match.opponent_score,
    riders: (riders.get(match.result_id) ?? []).sort((a, b) => a.position - b.position),
  }));
}
