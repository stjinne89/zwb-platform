import { randomAt, standings } from "./engine";
import { strength } from "./roster";
import type { GameRider, RaceState } from "./types";

/**
 * Club Ladder rules, from the race book (read 28 September 2026): five against
 * five, points 10 to 1 on finishing position, the highest team total wins, a tie
 * is a loss for the challenger. You challenge up to seven places up; a win
 * leapfrogs you onto the loser's place and moves everyone in between down one.
 */
export const LADDER_POINTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const CHALLENGE_RANGE = 7;
export const TEAM_SIZE = 5;
export const OWN_TEAM = "own";
const RIVAL_TEAMS = 9;
const TEAM_NAMES = ["Polderpijlen", "Dijkdiesels", "Kasseikoppen", "Waaierwolven", "Tempobeulen", "Sprintsnoeken", "Heuvelhelden", "Klimgeiten", "Bergbokken"];

export type LadderTeam = { id: string; name: string; riderIds: string[] };
export type LadderRecord = { date: string; rival: string; route: string; score: [number, number]; won: boolean };
export type LadderStanding = { version: 1; order: string[]; history: LadderRecord[] };

/**
 * Your team and nine club teams around your level, weakest at the bottom. Your
 * real Club Ladder teammates ride with you; open places go to riders closest to
 * you in strength. Built from the roster every time, so no names are stored.
 */
export function buildLadderTeams(roster: GameRider[], playerId: string, club: { name: string; memberIds: string[] } | null, seed: number): { own: LadderTeam; rivals: LadderTeam[] } {
  const player = roster.find((r) => r.id === playerId);
  if (!player) throw new Error("Je renner ontbreekt.");
  const level = strength(player);
  const near = (list: GameRider[]) => list
    .map((rider, i) => ({ rider, rank: Math.abs(strength(rider) - level) + randomAt(seed, 11000 + i) * 0.2 }))
    .sort((a, b) => a.rank - b.rank || a.rider.id.localeCompare(b.rider.id)).map((x) => x.rider);
  const others = roster.filter((r) => r.id !== playerId);
  const mates = others.filter((r) => club?.memberIds.includes(r.id)).slice(0, TEAM_SIZE - 1);
  const ownIds = [playerId, ...mates.map((r) => r.id)];
  for (const rider of near(others.filter((r) => !ownIds.includes(r.id)))) { if (ownIds.length >= TEAM_SIZE) break; ownIds.push(rider.id); }
  const pool = near(others.filter((r) => !ownIds.includes(r.id))).slice(0, RIVAL_TEAMS * TEAM_SIZE)
    .sort((a, b) => strength(a) - strength(b) || a.id.localeCompare(b.id));
  const rivals: LadderTeam[] = [];
  for (let i = 0; i + 3 <= pool.length && rivals.length < RIVAL_TEAMS; i += TEAM_SIZE) {
    rivals.push({ id: `t${rivals.length + 1}`, name: TEAM_NAMES[rivals.length], riderIds: pool.slice(i, i + TEAM_SIZE).map((r) => r.id) });
  }
  // A club too small for a ladder still gets one opponent.
  if (!rivals.length) rivals.push({ id: "t1", name: TEAM_NAMES[0], riderIds: Array.from({ length: TEAM_SIZE }, (_, i) => `guest:l${i}`) });
  return { own: { id: OWN_TEAM, name: club?.name ?? "ZWB", riderIds: ownIds }, rivals };
}
/** Strongest team on top, you at the bottom. */
export function initialLadder(rivals: LadderTeam[]): LadderStanding {
  return { version: 1, order: [...rivals.map((t) => t.id).reverse(), OWN_TEAM], history: [] };
}
/** Keeps a stored ladder consistent with today's teams. */
export function normalizeLadder(saved: LadderStanding | null, rivals: LadderTeam[]): LadderStanding {
  if (!saved) return initialLadder(rivals);
  const ids = new Set([OWN_TEAM, ...rivals.map((t) => t.id)]);
  const order = [...new Set(saved.order)].filter((id) => ids.has(id));
  for (const team of [...rivals].reverse()) if (!order.includes(team.id)) order.splice(Math.max(0, order.length - 1), 0, team.id);
  if (!order.includes(OWN_TEAM)) order.push(OWN_TEAM);
  return { ...saved, order };
}
export function challengeable(order: string[]) {
  const own = order.indexOf(OWN_TEAM);
  return order.slice(Math.max(0, own - CHALLENGE_RANGE), Math.max(0, own));
}
/** Leapfrog: a winning challenger takes the defender's place; everyone from there down moves one. */
export function applyChallenge(order: string[], challenger: string, defender: string, won: boolean) {
  const from = order.indexOf(challenger), to = order.indexOf(defender);
  if (!won || from < 0 || to < 0 || to >= from || from - to > CHALLENGE_RANGE) return [...order];
  const next = order.filter((id) => id !== challenger);
  next.splice(to, 0, challenger);
  return next;
}
/**
 * Points per team. During the race this is the standing if it finished now; at
 * the end a rider who did not finish scores nothing.
 */
export function teamScore(state: RaceState): [number, number] {
  const score: [number, number] = [0, 0];
  standings(state).filter((r) => r.team).forEach((r, place) => {
    if (state.finished && r.finishTime === null) return;
    score[r.team === "own" ? 0 : 1] += LADDER_POINTS[place] ?? 0;
  });
  return score;
}
/** You are always the challenger: a tie is a loss. */
export const challengeWon = ([own, rival]: [number, number]) => own > rival;
