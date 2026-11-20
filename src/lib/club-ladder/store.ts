import { findLadderRouteSlug } from "./routes";
import type { ClubLadderResult } from "./summary";

type StoredScore = { result_id: number; challenger_score: number; opponent_score: number; stage: string | null };

/**
 * Bekende wedstrijden waarvan de ladder de score of de fase sindsdien heeft
 * aangepast (een correctie achteraf, of "Finished" dat "Final" wordt).
 */
export function changedLadderResults(stored: StoredScore[], results: ClubLadderResult[]): ClubLadderResult[] {
  const known = new Map(stored.map((row) => [Number(row.result_id), row]));
  return results.filter((result) => {
    const row = known.get(result.resultId);
    if (!row) return false;
    return (
      Number(row.challenger_score) !== result.challengerScore ||
      Number(row.opponent_score) !== result.opponentScore ||
      (result.stage != null && row.stage !== result.stage)
    );
  });
}

/**
 * Bewaart de uitslagen van de summary. De summary toont maar een week, dus zo
 * groeit een geschiedenis per team. Een bekende wedstrijd houdt route en tijd,
 * maar volgt een gecorrigeerde score: dan gaan de renners opnieuw, want hun
 * team volgt uit de score (result-page.ts). Tot 2026-11-20 bleef een bekende
 * wedstrijd zoals hij was, en hield de eventpagina een oude uitslag vast.
 * Doet niets zolang 0298 ontbreekt (dan geeft de upsert een fout).
 */
export async function storeLadderResults(
  // Admin-client; structureel getypt zoals in team-results/sync.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  results: ClubLadderResult[],
) {
  if (results.length === 0) return 0;
  const ids = [...new Set(results.map((result) => result.resultId))];
  const { data: stored } = await admin
    .from("club_ladder_matches")
    .select("result_id, challenger_score, opponent_score, stage")
    .in("result_id", ids);

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
  if (error) return 0;

  // Eerst de renners weg, dan de wedstrijd terug op "renners nog ophalen".
  for (const result of changedLadderResults((stored ?? []) as StoredScore[], results)) {
    const { error: deleteError } = await admin.from("club_ladder_match_riders").delete().eq("result_id", result.resultId);
    if (deleteError) continue;
    await admin
      .from("club_ladder_matches")
      .update({
        challenger_score: result.challengerScore,
        opponent_score: result.opponentScore,
        ...(result.stage != null ? { stage: result.stage } : {}),
        riders_fetched_at: null,
      })
      .eq("result_id", result.resultId);
  }
  return rows.length;
}
