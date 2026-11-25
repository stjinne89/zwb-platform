// Ladderuitslagen voor de groep Uitslagen op het dashboard (wens eigenaar,
// 2026-11-25): per ZWB-ladderteam de nieuwste gereden wedstrijd van de
// afgelopen week, als teamtegel naast de ZRL. De wedstrijden komen uit
// club_ladder_matches (0298), het event erbij zoals op de teampagina
// (`ladderTeamResults`).

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { ladderTeamResults, type LadderScoreRow } from "./event-result";
import { ladderOpponentFromTitle } from "./fixture-events";

export type LadderDashboardTeam = {
  id: string;
  name: string;
  division: string | null;
  /** Teamnaam en de naam op de ladder (team_result_sources.match_name). */
  aliases: string[];
};

export type LadderDashboardEvent = {
  id: string;
  team_id: string;
  title: string;
  start_at: string;
  club_ladder_opponent: string | null;
};

export type LadderDashboardResult = {
  resultId: number;
  teamId: string;
  teamName: string;
  division: string | null;
  opponent: string;
  ourScore: number;
  theirScore: number;
  won: boolean;
  /** Start van de wedstrijd (UTC). */
  racedAt: string;
  /** De uitslag op het event, of de teampagina als er geen event is. */
  href: string;
};

const startOf = (row: LadderScoreRow) => `${row.raced_on}T${(row.raced_at ?? "00:00").slice(0, 5)}:00.000Z`;

/** Per team de nieuwste wedstrijd sinds `sinceMs`. Puur. */
export function latestLadderResults(
  teams: LadderDashboardTeam[],
  matches: LadderScoreRow[],
  events: LadderDashboardEvent[],
  sinceMs: number,
): LadderDashboardResult[] {
  const recent = matches.filter((row) => Date.parse(startOf(row)) >= sinceMs);
  const out: LadderDashboardResult[] = [];
  for (const team of teams) {
    const [latest] = ladderTeamResults(
      recent,
      team.aliases,
      events
        .filter((event) => event.team_id === team.id)
        .map((event) => ({
          id: event.id,
          start_at: event.start_at,
          opponent: event.club_ladder_opponent ?? ladderOpponentFromTitle(event.title, team.name),
        })),
    );
    if (!latest) continue;
    const row = recent.find((match) => match.result_id === latest.resultId)!;
    out.push({
      resultId: latest.resultId,
      teamId: team.id,
      teamName: team.name,
      division: team.division,
      opponent: latest.opponent,
      ourScore: latest.ourScore,
      theirScore: latest.theirScore,
      won: latest.won,
      racedAt: startOf(row),
      href: latest.eventId ? `/events/${latest.eventId}#uitslag` : `/teams/club-ladder/${team.id}`,
    });
  }
  return out.sort((a, b) => b.racedAt.localeCompare(a.racedAt));
}

const SCORE_COLUMNS = "result_id, raced_on, raced_at, challenger, challenger_score, opponent, opponent_score";

/**
 * De wedstrijden van de afgelopen 7 dagen, voor de hele club gelijk en daarom
 * 10 minuten gedeeld gecachet, zoals de uitslagen van leden. Met de
 * admin-client: club_ladder_matches is niet voor leden leesbaar.
 */
export const loadLadderDashboardResults = unstable_cache(
  async (): Promise<LadderDashboardResult[]> => {
    const admin = createAdminClient();
    const sinceMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sinceDay = new Date(sinceMs).toISOString().slice(0, 10);
    const [{ data: teamRows }, { data: sourceRows }] = await Promise.all([
      admin.from("teams").select("id, name, division, is_graveyard").eq("type", "ladder"),
      admin.from("team_result_sources").select("team_id, match_name").eq("provider", "club_ladder"),
    ]);
    const teams: LadderDashboardTeam[] = (
      (teamRows ?? []) as Array<{ id: string; name: string; division: string | null; is_graveyard: boolean | null }>
    )
      .filter((team) => !team.is_graveyard)
      .map((team) => ({
        id: team.id,
        name: team.name,
        division: team.division,
        aliases: [
          ...new Set(
            [
              team.name,
              ...((sourceRows ?? []) as Array<{ team_id: string; match_name: string | null }>)
                .filter((source) => source.team_id === team.id)
                .map((source) => source.match_name),
            ].filter((name): name is string => Boolean(name)),
          ),
        ],
      }));
    const names = teams.flatMap((team) => team.aliases);
    if (names.length === 0) return [];
    const [asChallenger, asOpponent, { data: eventRows }] = await Promise.all([
      admin.from("club_ladder_matches").select(SCORE_COLUMNS).in("challenger", names).gte("raced_on", sinceDay),
      admin.from("club_ladder_matches").select(SCORE_COLUMNS).in("opponent", names).gte("raced_on", sinceDay),
      admin
        .from("events")
        .select("id, team_id, title, start_at, club_ladder_opponent")
        .eq("type", "ladder")
        .in(
          "team_id",
          teams.map((team) => team.id),
        )
        .gte("start_at", new Date(sinceMs - 24 * 60 * 60 * 1000).toISOString())
        .lte("start_at", new Date().toISOString()),
    ]);
    return latestLadderResults(
      teams,
      [...((asChallenger.data ?? []) as LadderScoreRow[]), ...((asOpponent.data ?? []) as LadderScoreRow[])],
      (eventRows ?? []) as LadderDashboardEvent[],
      sinceMs,
    );
  },
  ["dashboard-ladder-results"],
  { revalidate: 600 },
);
