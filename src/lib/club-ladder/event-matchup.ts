import "server-only";

import { after } from "next/server";
import { loadRiderMetrics, refreshRiderMetrics } from "@/lib/race-briefing/metrics";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { ensureMatchRiders, loadStoredMatches, loadTeamMatches } from "./matches";
import { buildLadderMatchup, type LadderMatchup, type MatchupSignup } from "./matchup";
import { findLadderRouteSlug, ladderRouteBySlug, ROUTE_CLASS_LABELS } from "./routes";
import type { PowerWkg, StoredMatch } from "./team-power";

type Admin = ReturnType<typeof createAdminClient>;
type Client = Awaited<ReturnType<typeof createClient>>;

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
  supabase: Client,
  eventId: string,
  event: { team_id: string | null; zwift_route_id: number | string | null },
): Promise<LadderEventMatchup | null> {
  if (!event.team_id) return null;
  // Apart gelezen: zonder 0302 geeft dit een fout en blijft de pagina heel.
  const [{ data: link, error: linkError }, { data: team }] = await Promise.all([
    admin.from("events").select("club_ladder_fixture_id, club_ladder_opponent").eq("id", eventId).maybeSingle(),
    admin.from("teams").select("name").eq("id", event.team_id).maybeSingle(),
  ]);
  const opponent = (link?.club_ladder_opponent as string | null | undefined) ?? null;
  const fixtureId = positiveId(link?.club_ladder_fixture_id);
  const ourName = (team?.name as string | undefined) ?? null;
  if (linkError || !opponent || !fixtureId || !ourName) return null;

  const { data: signupRows } = await admin
    .from("club_ladder_fixture_signups")
    .select("zwift_id, team, name, position")
    .eq("fixture_id", fixtureId);
  const signups: MatchupSignup[] = ((signupRows ?? []) as Array<{ zwift_id: number | string; team: string; name: string; position: number | null }>)
    .map((row) => ({ zwiftId: positiveId(row.zwift_id) ?? 0, team: row.team, name: row.name, position: row.position }))
    .filter((row) => row.zwiftId > 0);
  const zwiftIds = signups.map((row) => row.zwiftId);

  const [ours, theirs] = await Promise.all([loadTeamMatches(admin, [ourName]), loadTeamMatches(admin, [opponent])]);
  const all = [...new Map([...ours, ...theirs].map((row) => [row.result_id, row])).values()];
  await ensureMatchRiders(admin, all, PAGE_BUDGET_MS);
  if (all.some((row) => !row.riders_fetched_at)) after(() => ensureMatchRiders(admin, all, AFTER_BUDGET_MS));

  const [matches, riderMatches, ourProfiles, metrics] = await Promise.all([
    loadStoredMatches(admin, all),
    riderRaces(admin, zwiftIds),
    profilePower(admin, supabase, zwiftIds),
    loadRiderMetrics(zwiftIds),
  ]);
  if (zwiftIds.length > 0) after(() => refreshRiderMetrics(zwiftIds, metrics, { budgetMs: METRICS_BUDGET_MS }));
  const scores = new Map<number, number>();
  for (const [id, row] of metrics) if (row.racingScore != null) scores.set(id, row.racingScore);

  const slug = findLadderRouteSlug(null, positiveId(event.zwift_route_id));
  const option = slug ? ladderRouteBySlug(slug) : null;
  const known = new Set(matches.map((match) => match.resultId));
  return {
    matchup: buildLadderMatchup({
      ourName,
      opponent,
      signups,
      matches,
      riderMatches: [...matches, ...riderMatches.filter((match) => !known.has(match.resultId))],
      ourProfiles,
      scores,
      weights: option?.weights ?? null,
    }),
    routeLabel: option ? ROUTE_CLASS_LABELS[option.routeClass] : null,
  };
}

/** Bewaarde ladderraces van deze renners, ook als ze toen voor een ander team reden. */
async function riderRaces(admin: Admin, zwiftIds: number[]): Promise<StoredMatch[]> {
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

/** 90-dagenprofiel (geen 15 s) van ZWB-leden onder de aanmeldingen; RLS van de kijker. */
async function profilePower(admin: Admin, supabase: Client, zwiftIds: number[]): Promise<Map<number, PowerWkg>> {
  const out = new Map<number, PowerWkg>();
  if (zwiftIds.length === 0) return out;
  const { data: profiles } = await admin.from("profiles").select("id, zwift_id").in("zwift_id", zwiftIds.map(String));
  const byProfile = new Map(
    ((profiles ?? []) as Array<{ id: string; zwift_id: string | null }>)
      .map((row) => [row.id, positiveId(row.zwift_id?.trim())] as const)
      .filter((entry): entry is readonly [string, number] => entry[1] != null),
  );
  if (byProfile.size === 0) return out;
  const { data: power } = await supabase
    .from("rider_power_profiles")
    .select("profile_id, wkg_1m, wkg_5m, wkg_20m")
    .in("profile_id", [...byProfile.keys()]);
  const num = (value: number | string | null) => (value == null ? null : Number(value) || null);
  for (const row of (power ?? []) as Array<{ profile_id: string; wkg_1m: number | string | null; wkg_5m: number | string | null; wkg_20m: number | string | null }>) {
    const zwiftId = byProfile.get(row.profile_id);
    if (zwiftId) out.set(zwiftId, { s15: null, m1: num(row.wkg_1m), m5: num(row.wkg_5m), m20: num(row.wkg_20m) });
  }
  return out;
}
