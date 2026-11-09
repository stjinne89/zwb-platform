// Teamraces: een ZRL- of ladderrace die bij één team hoort (`events.team_id`).
// Zo'n race is van dat team en van zijn hoofdteam; voor de rest van de club is
// hij geen vraag. Het schemapaneel toonde tot 2026-11-09 elke teamrace van elk
// team, en de enige manier om er een kwijt te raken was "Nee". Daardoor stonden
// leden op "Nee" bij races van teams waar ze nooit in zaten.

export const TEAM_RACE_TYPES = ["zrl", "ladder"] as const;

export function isTeamRace(event: { type: string | null; team_id: string | null }): boolean {
  return Boolean(event.team_id) && (TEAM_RACE_TYPES as readonly string[]).includes(event.type ?? "");
}

type TeamRow = { id: string; parent_team_id: string | null };

/** Je eigen teams plus hun subteams: de teamraces die voor jou zijn. */
export function teamIdsForRaces(memberTeamIds: Iterable<string>, teams: TeamRow[]): string[] {
  const mine = new Set(memberTeamIds);
  const out = new Set(mine);
  for (const team of teams) {
    if (team.parent_team_id && mine.has(team.parent_team_id)) out.add(team.id);
  }
  return [...out];
}

/** Het team van de race en zijn hoofdteam: wie daarin zit, hoort bij de race. */
export function raceTeamIds(teamId: string, teams: TeamRow[]): string[] {
  const parent = teams.find((team) => team.id === teamId)?.parent_team_id;
  return parent ? [teamId, parent] : [teamId];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PostgREST-filter voor de events in iemands schema: alles wat geen teamrace is
 * (zonder de FRR-tijdsloten), plus de teamraces van je eigen teams en de races
 * waar je zelf al ja of misschien op zei.
 */
export function scheduleEventsFilter(teamIds: string[], answeredEventIds: string[]): string {
  const list = (ids: string[]) => ids.filter((id) => UUID.test(id)).join(",");
  const types = TEAM_RACE_TYPES.join(",");
  const parts = [
    "and(team_id.is.null,or(type.neq.flamme_rouge,parent_event_id.is.null))",
    `and(team_id.not.is.null,type.not.in.(${types}))`,
  ];
  const teams = list(teamIds);
  if (teams) parts.push(`team_id.in.(${teams})`);
  const answered = list(answeredEventIds);
  if (answered) parts.push(`id.in.(${answered})`);
  return parts.join(",");
}
