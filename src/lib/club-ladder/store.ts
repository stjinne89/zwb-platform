import { findLadderRouteSlug } from "./routes";
import type { ClubLadderResult } from "./summary";

/**
 * Bewaart de uitslagen van de summary; een bekende wedstrijd blijft zoals hij is.
 * De summary toont maar een week, dus zo groeit een geschiedenis per team.
 * Doet niets zolang 0298 ontbreekt (dan geeft de upsert een fout).
 */
export async function storeLadderResults(
  // Admin-client; structureel getypt zoals in team-results/sync.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  results: ClubLadderResult[],
) {
  if (results.length === 0) return 0;
  const rows = results.map((result) => ({
    result_id: result.resultId,
    raced_on: result.date,
    raced_at: result.time,
    route_name: result.route,
    route_slug: findLadderRouteSlug(result.route),
    challenger: result.challenger,
    challenger_score: result.challengerScore,
    opponent: result.opponent,
    opponent_score: result.opponentScore,
    stage: result.stage,
  }));
  const { error } = await admin.from("club_ladder_matches").upsert(rows, { onConflict: "result_id", ignoreDuplicates: true });
  return error ? 0 : rows.length;
}
