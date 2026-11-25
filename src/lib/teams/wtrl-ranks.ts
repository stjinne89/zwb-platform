import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { wtrlRankFor, type StoredResultRace, type WtrlTeamRank } from "@/lib/teams/zrl-standings";

/**
 * De WTRL-plaats (0363) per ZRL-race van een ZWB-team, voor het ZRL-overzicht
 * en het dashboard. De sleutel is `id` van de race. Zonder WTRL-uitslag, of
 * zonder tabel, komt een race er niet in en blijft de live plaats staan.
 */
export async function loadWtrlRanks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  races: Array<{ id: string; teamId: string | null; zwiftEventId: string | null }>,
): Promise<Map<string, WtrlTeamRank>> {
  const out = new Map<string, WtrlTeamRank>();
  const withEvent = races.filter((race) => race.teamId && race.zwiftEventId);
  if (withEvent.length === 0) return out;
  const { data: wtrlTeams } = await supabase
    .from("wtrl_teams")
    .select("name, team_id")
    .in("team_id", [...new Set(withEvent.map((race) => race.teamId as string))]);
  const namesByTeam = new Map<string, string[]>();
  for (const row of (wtrlTeams ?? []) as Array<{ name: string; team_id: string }>) {
    namesByTeam.set(row.team_id, [...(namesByTeam.get(row.team_id) ?? []), row.name]);
  }
  const eventIds = [
    ...new Set(
      withEvent
        .filter((race) => (namesByTeam.get(race.teamId as string) ?? []).length > 0)
        .map((race) => race.zwiftEventId as string),
    ),
  ];
  const resultsByEvent = new Map(
    await Promise.all(
      eventIds.map(async (zwiftEventId) => {
        const { data } = await supabase
          .from("zrl_wtrl_results")
          .select("season, class, race, teams")
          .contains("teams", JSON.stringify([{ zwiftEventId }]));
        return [zwiftEventId, (data ?? []) as StoredResultRace[]] as const;
      }),
    ),
  );
  for (const race of withEvent) {
    const names = namesByTeam.get(race.teamId as string) ?? [];
    const results = resultsByEvent.get(race.zwiftEventId as string) ?? [];
    const rank = names.length > 0 ? wtrlRankFor(results, names, race.zwiftEventId as string) : null;
    if (rank) out.set(race.id, rank);
  }
  return out;
}
