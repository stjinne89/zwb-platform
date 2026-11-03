import { normalizeTeamName } from "@/lib/ladder";
import type { ClubLadderStanding } from "./summary";

/**
 * Club Ladder-regels uit het race book (gelezen 28 september 2026): je daagt een
 * ploeg uit tot zeven plekken boven je, in je eigen ladder (regio). Een parcours
 * is 15–25 km, lead-in meegeteld, over één of meer rondes; event-only routes
 * tellen mee (afspraak eigenaar 2026-11-02).
 */
export const CHALLENGE_RANGE = 7;
export const LADDER_ROUTE_MIN_KM = 15;
export const LADDER_ROUTE_MAX_KM = 25;
/**
 * Geen race book-regel maar een keuze van de eigenaar (2026-11-03): een parcours
 * dat volgens het clubmodel langer dan 45 minuten duurt (Ven-Top, Road to Sky,
 * Lutscher) is geen ladderrace. 45 valt in het gat tussen 42,5 en 49 minuten.
 */
export const LADDER_ROUTE_MAX_MINUTES = 45;

/** De ploegen die `team` mag uitdagen: tot zeven plekken hoger in dezelfde regio. */
export function challengeableTeams(standings: ClubLadderStanding[], team: ClubLadderStanding) {
  return standings
    .filter(
      (row) =>
        row.region === team.region &&
        row.position < team.position &&
        row.position >= team.position - CHALLENGE_RANGE &&
        normalizeTeamName(row.name) !== normalizeTeamName(team.name),
    )
    .sort((a, b) => a.position - b.position);
}
