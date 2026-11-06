import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { ladderRiders, matchupWeights } from "./briefing";
import { loadLadderEventMatchup } from "./event-matchup";
import { ladderEventResult, pickEventMatch, startersFromResult, type LadderEventResult } from "./event-result";
import { ladderOpponentFromTitle } from "./fixture-events";
import type { MatchupSignup } from "./matchup";
import { ensureMatchRiders, loadStoredMatches, MATCH_COLUMNS, type MatchRow } from "./matches";

type Admin = ReturnType<typeof createAdminClient>;

/** Renners ophalen voordat de pagina rendert, als de sync dat nog niet deed. */
const PAGE_BUDGET_MS = 6_000;

const positiveId = (value: unknown) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const day = (iso: string, offset: number) => {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

/**
 * Uitslag van een gereden ladderrace, uit de wedstrijden die de sync van de
 * summary bewaart (club_ladder_matches, 0298). Null vóór de start of zolang de
 * uitslag er niet is.
 */
export async function loadLadderEventResult(
  admin: Admin,
  eventId: string,
  event: { team_id: string | null; title: string; start_at: string; zwift_route_id: number | string | null },
): Promise<LadderEventResult | null> {
  if (!event.team_id || Date.parse(event.start_at) > Date.now()) return null;
  const [{ data: link, error: linkError }, { data: team }] = await Promise.all([
    admin.from("events").select("club_ladder_fixture_id, club_ladder_opponent").eq("id", eventId).maybeSingle(),
    admin.from("teams").select("name").eq("id", event.team_id).maybeSingle(),
  ]);
  const ourName = (team?.name as string | undefined) ?? null;
  if (linkError || !ourName) return null;
  const opponent = (link?.club_ladder_opponent as string | null | undefined) ?? ladderOpponentFromTitle(event.title, ourName);
  if (!opponent) return null;

  const { data: candidates } = await admin
    .from("club_ladder_matches")
    .select(`${MATCH_COLUMNS}, raced_at`)
    .gte("raced_on", day(event.start_at, -1))
    .lte("raced_on", day(event.start_at, 1));
  const row = pickEventMatch((candidates ?? []) as unknown as Array<MatchRow & { raced_at: string | null }>, { ours: ourName, opponent }, event.start_at);
  if (!row) return null;

  if (!row.riders_fetched_at) await ensureMatchRiders(admin, [row], PAGE_BUDGET_MS);
  const [match] = await loadStoredMatches(admin, [row]);
  if (!match) return null;

  // Zonder Zwift-ID uit de uitslag: op naam uit de aanmeldingen van de ladder.
  const fixtureId = positiveId(link?.club_ladder_fixture_id);
  const { data: signupRows } = fixtureId
    ? await admin.from("club_ladder_fixture_signups").select("zwift_id, team, name").eq("fixture_id", fixtureId)
    : { data: [] };
  const signups: MatchupSignup[] = ((signupRows ?? []) as Array<{ zwift_id: number | string; team: string; name: string }>).flatMap((signup) => {
    const zwiftId = positiveId(signup.zwift_id);
    return zwiftId ? [{ zwiftId, team: signup.team, name: signup.name, position: null }] : [];
  });
  const starters = startersFromResult(match.riders, signups);

  const ratings = new Map<number, number | null>();
  if (starters.size >= 2) {
    const expected = await loadLadderEventMatchup(admin, eventId, event, {
      starters: [...starters.values()],
      excludeResultId: match.resultId,
    }).catch(() => null);
    if (expected) {
      const byZwift = new Map(ladderRiders(expected.matchup, matchupWeights(expected.matchup)).map((rider) => [rider.zwiftId, rider.rating]));
      for (const [position, starter] of starters) ratings.set(position, byZwift.get(starter.zwiftId) ?? null);
    }
  }
  return ladderEventResult(match, ourName, ratings);
}
