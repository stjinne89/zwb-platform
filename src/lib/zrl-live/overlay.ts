// De rijen van de ZRL-overlay voor OBS (livestreams, fase 2). Puur, voor de tests.

import type { TeamScore, ZrlScoringFormat } from "@/lib/zrl-live/scoring";

/**
 * De bovenste `limit` ploegen (5 tot 15), en staat de eigen ploeg daaronder,
 * dan vervangt die de laatste rij: de kijker ziet altijd waar wij staan.
 */
export function overlayRows(teams: TeamScore[], ownTeam: string | null, limit: number): TeamScore[] {
  const size = Math.min(15, Math.max(5, Math.round(limit) || 8));
  const sorted = [...teams].sort((a, b) => a.rank - b.rank);
  const top = sorted.slice(0, size);
  const own = ownTeam ? sorted.find((team) => team.team === ownTeam) : undefined;
  if (own && !top.includes(own)) top.splice(size - 1, 1, own);
  return top;
}

/** Punten, of in een ploegentijdrit de tijd van de vierde renner ("28:02"). */
export function overlayValue(team: TeamScore, format: ZrlScoringFormat): string {
  if (format !== "ttt") return String(team.total);
  if (team.time === null) return "—";
  const seconds = Math.round(team.time / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
