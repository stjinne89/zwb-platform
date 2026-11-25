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

export type StandingsWtrlTeam = { trc_ref: string; team_id: string | null; division: string | null; name: string };

export type TeamStandings = {
  teamId: string;
  season: number;
  /** WTRL-klasse: dezelfde sleutel als de uitslagen (0363). */
  class: string;
  /** De naam van dit team bij WTRL, zoals in de uitslag. */
  ownName: string;
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
        season: table.season,
        class: table.class,
        ownName: wtrl.name,
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

export type StoredResultRace = {
  season: number;
  class: string;
  race: number;
  teams: Array<{ name: string; rank: number | null; zwiftEventId: string | null }>;
};

export type WtrlTeamRank = { rank: number; teams: number; race: number };

/**
 * De WTRL-plaats van een ZWB-team in een race (0363): de uitslag met een team
 * van die naam in dat Zwift-event. Twee ZWB-teams kunnen één event delen (ronde
 * 2 week 1: A en B2), daarom ook de naam. Een gediskwalificeerd team heeft geen
 * plaats. Puur.
 */
export function wtrlRankFor(
  results: StoredResultRace[],
  wtrlNames: string[],
  zwiftEventId: string,
): WtrlTeamRank | null {
  for (const row of [...results].sort((a, b) => b.season - a.season || b.race - a.race)) {
    const own = row.teams.find((team) => team.zwiftEventId === zwiftEventId && wtrlNames.includes(team.name));
    if (own) return own.rank != null ? { rank: own.rank, teams: row.teams.length, race: row.race } : null;
  }
  return null;
}

export type LatestWtrlResult = { race: number; rank: number | null; teams: number; points: number; final: boolean };

/**
 * De nieuwste WTRL-uitslag van een team in zijn divisie, voor "Teamresultaten"
 * op de teampagina. `rank` is null bij een gediskwalificeerd team. Puur.
 */
export function latestWtrlResult(
  rows: Array<{ class: string; race: number; final: boolean; teams: Array<{ name: string; rank: number | null; points: number }> }>,
  wtrlClass: string,
  ownName: string,
): LatestWtrlResult | null {
  const sorted = rows.filter((row) => row.class === wtrlClass).sort((a, b) => b.race - a.race);
  for (const row of sorted) {
    const own = row.teams.find((team) => team.name === ownName);
    if (own) return { race: row.race, rank: own.rank, teams: row.teams.length, points: own.points, final: row.final };
  }
  return null;
}
