import type { WtrlStanding } from "@/lib/wtrl/import";

// De ZRL-competitiestand per ZWB-team, uit wat het WTRL-script bewaarde (0362).
// Puur: de teampagina leest de rijen, deze module zoekt per team zijn divisie.

export type StoredStandings = {
  season: number;
  class: string;
  race: number;
  final: boolean;
  rows: WtrlStanding[];
};

export type StandingsWtrlTeam = { trc_ref: string; team_id: string | null; division: string | null };

export type TeamStandings = {
  teamId: string;
  division: string | null;
  race: number;
  final: boolean;
  rows: WtrlStanding[];
  /** Het WTRL-team-ID van dit ZWB-team in `rows`. */
  ownTeamId: string;
};

/** WTRL-team-ID: het tweede deel van de TRC-referentie ("79152/8683"). */
export function wtrlTeamIdOf(trcRef: string): string | null {
  const id = trcRef.split("/")[1];
  return id && /^\d{1,9}$/.test(id) ? id : null;
}

/**
 * Per ZWB-team de stand van zijn divisie in het nieuwste seizoen. Een team
 * zonder WTRL-koppeling of zonder stand komt er niet in.
 */
export function standingsPerTeam(
  teamIds: string[],
  wtrlTeams: StandingsWtrlTeam[],
  standings: StoredStandings[],
): Map<string, TeamStandings> {
  const season = Math.max(...standings.map((row) => row.season));
  const current = standings.filter((row) => row.season === season);
  const out = new Map<string, TeamStandings>();
  for (const teamId of teamIds) {
    for (const wtrl of wtrlTeams.filter((row) => row.team_id === teamId)) {
      const ownTeamId = wtrlTeamIdOf(wtrl.trc_ref);
      const table = ownTeamId ? current.find((row) => row.rows.some((team) => team.teamId === ownTeamId)) : null;
      if (!ownTeamId || !table) continue;
      out.set(teamId, {
        teamId,
        division: wtrl.division,
        race: table.race,
        final: table.final,
        rows: table.rows,
        ownTeamId,
      });
      break;
    }
  }
  return out;
}
