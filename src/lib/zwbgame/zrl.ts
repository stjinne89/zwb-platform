import { scoreRace, type Passage, type RiderScore, type RouteSegment } from "@/lib/zrl-live/scoring";
import { clubPool, TEAM_NAMES, TEAM_SIZE, type LadderTeam } from "./ladder";
import { strength } from "./roster";
import { OWN_TEAM, type GameRider, type RaceState, type ZrlFormat } from "./types";

/**
 * ZRL rules (wtrl.racing/zrl/resources, read 22 and 28 September 2026):
 * - Points race and Race of Truth: FAL, FTS, FIN and podium, via scoreRace, the same
 *   code as the live ZRL dashboard. The Race of Truth is ridden without drafting.
 * - Scratch: finish points and podium only.
 * - TTT: drafting only in your own team; the team time is the fourth rider over the
 *   line; fewer than four finishers is no result. No rider points.
 * - League points: the winning team gets as many points as there are teams, then
 *   one less per place.
 */
export const ZRL_TEAMS = 6;
export const ZRL_FORMATS: ZrlFormat[] = ["points", "rot", "scratch", "ttt"];
export const TTT_COUNTS = 4;

/**
 * Your ZRL team and five club teams around your level. The opponents are drafted
 * like a division: the strongest riders spread over the teams, so every team is
 * about as strong. Built from the roster every time; nothing is stored.
 */
export function buildZrlTeams(roster: GameRider[], playerId: string, club: { name: string; memberIds: string[] } | null, seed: number): { own: LadderTeam; rivals: LadderTeam[] } {
  const { own, others } = clubPool(roster, playerId, club, seed);
  const pool = others.slice(0, (ZRL_TEAMS - 1) * TEAM_SIZE).sort((a, b) => strength(b) - strength(a) || a.id.localeCompare(b.id));
  const count = Math.max(1, Math.min(ZRL_TEAMS - 1, Math.floor(pool.length / 3)));
  const rivals: LadderTeam[] = Array.from({ length: count }, (_, i) => ({ id: `z${i + 1}`, name: TEAM_NAMES[i], riderIds: [] }));
  // Snake draft: 1-2-3-4-5, 5-4-3-2-1, …
  pool.forEach((rider, i) => {
    const round = Math.floor(i / count), slot = i % count;
    const team = rivals[round % 2 ? count - 1 - slot : slot];
    if (team.riderIds.length < TEAM_SIZE) team.riderIds.push(rider.id);
  });
  for (const team of rivals) while (team.riderIds.length < 3) team.riderIds.push(`guest:${team.id}-${team.riderIds.length}`);
  return { own, rivals };
}

export type ZrlTeamResult = {
  id: string;
  /** Rider points, or null in a TTT. */
  points: number | null;
  /** TTT: the fourth rider's time; null without four finishers. */
  time: number | null;
  rank: number;
  league: number;
};
export type ZrlScore = { teams: ZrlTeamResult[]; riders: Map<string, RiderScore> };

/** The ZRL result so far; final once the race is over. */
export function scoreZrl(state: RaceState): ZrlScore {
  const format = state.config.format ?? "points";
  const squads = (state.config.squads ?? []).map((s) => s.id);
  const rank = (teams: Omit<ZrlTeamResult, "rank" | "league">[], better: (a: typeof teams[number], b: typeof teams[number]) => number, same: (a: typeof teams[number], b: typeof teams[number]) => boolean, scored: (t: typeof teams[number]) => boolean): ZrlTeamResult[] => {
    const sorted = [...teams].sort((a, b) => better(a, b) || a.id.localeCompare(b.id));
    const out: ZrlTeamResult[] = [];
    sorted.forEach((team, i) => {
      const place = i > 0 && same(sorted[i - 1], team) ? out[i - 1].rank : i + 1;
      out.push({ ...team, rank: place, league: scored(team) ? squads.length - place + 1 : 0 });
    });
    return out;
  };
  if (format === "ttt") {
    const teams = squads.map((id) => {
      const times = state.riders.filter((r) => r.team === id && r.finishTime !== null).map((r) => r.finishTime!).sort((a, b) => a - b);
      return { id, points: null, time: times.length >= TTT_COUNTS ? times[TTT_COUNTS - 1] : null };
    });
    return {
      teams: rank(teams, (a, b) => (a.time ?? Infinity) - (b.time ?? Infinity), (a, b) => a.time === b.time, (t) => t.time !== null),
      riders: new Map(),
    };
  }
  const segments: RouteSegment[] = format === "scratch" ? [] : state.route.accents.flatMap((a) => (a.banner ? [{ segmentId: a.name, name: a.name }] : []));
  const passages: Passage[] = format === "scratch" ? [] : state.passes.flatMap((p) => (p.e === null ? [] : [{
    id: `${p.r}:${p.a}:${p.s}`, athleteId: p.r, segmentId: state.route.accents[p.a].name, ts: Math.round(p.e * 1000), elapsed: p.e - p.s,
  }]));
  const finished = state.riders.map((r, i) => ({ r, i })).filter(({ r }) => r.finishTime !== null).sort((a, b) => a.r.finishTime! - b.r.finishTime! || a.r.rider.id.localeCompare(b.r.rider.id));
  const result = scoreRace({
    route: segments,
    riders: state.riders.map((r, i) => ({ athleteId: i, name: r.rider.id, team: r.team })),
    passages, startAt: 0,
    finishedAt: new Map(finished.map(({ r, i }) => [i, Math.round(r.finishTime! * 1000)])),
    finish: { finishers: finished.map(({ i }) => i), final: state.finished },
  });
  const riders = new Map(result.riders.map((r) => [r.name, r]));
  const teams = squads.map((id) => ({ id, points: result.teams.find((t) => t.team === id)?.total ?? 0, time: null }));
  return {
    teams: rank(teams, (a, b) => (b.points ?? 0) - (a.points ?? 0), (a, b) => a.points === b.points, () => true),
    riders,
  };
}
export const ownTeamResult = (score: ZrlScore) => score.teams.find((t) => t.id === OWN_TEAM)!;
