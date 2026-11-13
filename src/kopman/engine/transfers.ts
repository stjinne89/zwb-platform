// A world that moves (round D of docs/kopman-breder.md, built 2026-11-13):
// every season the rival teams swap a few riders, the strongest buy gold, and
// the rival who beat you most becomes your arch-rival and climbs with you.
import { cardById, overallOf, pool } from "./cards";
import { DIVISIONS } from "./divisions";
import { clamp, hashSeed, rng } from "./rng";
import { rivalTeams } from "./teams";
import { STAT_KEYS, type RiderCard, type Stats } from "./types";

/** Riders a team swaps per season, and how many of the strongest teams buy a gold rider. */
export const TRANSFERS = { perTeam: 2, buyers: 3 };
/** The arch-rival rides this much above the top of the band of your level. */
export const NEMESIS_ABOVE = 3;
/** Times a rival must finish ahead of your best rider, on the podium, to become your arch-rival. */
export const NEMESIS_MIN = 2;

const cache = new Map<string, Record<string, string[]>>();

/**
 * The rosters of a level in a season of your career. Season 1 is the fixed
 * peloton; after that each team swaps TRANSFERS.perTeam riders for riders of
 * the same type near its strength, and the strongest teams buy gold.
 */
export function seasonRosters(division: number, seed: number, season: number): Record<string, string[]> {
  const key = `${division}:${seed}:${season}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const teams = rivalTeams(division);
  const out: Record<string, string[]> = Object.fromEntries(teams.map((t) => [t.id, [...t.riders]]));
  if (season > 1) {
    const random = rng(hashSeed(seed, division, season, "transfers"));
    const taken = new Set(teams.flatMap((t) => t.riders));
    const riders = pool().pool.filter((c) => c.tier !== "diamant");
    teams.forEach((team, t) => {
      const roster = out[team.id];
      const strength = roster.map((id) => cardById(id).overall).sort((a, b) => b - a).slice(0, 5);
      const target = strength.reduce((sum, n) => sum + n, 0) / strength.length;
      for (let i = 0; i < TRANSFERS.perTeam; i++) {
        const leaving = roster.filter((id) => cardById(id).tier !== "diamant");
        const out1 = leaving[Math.floor(random() * leaving.length)];
        const type = cardById(out1).type;
        // The first swap of a strong team buys a gold rider above its strength.
        const buy = t < TRANSFERS.buyers && i === 0;
        const options = riders
          .filter((c) => c.type === type && !taken.has(c.id) && (!buy || c.tier === "goud"))
          .map((c) => ({ c, key: Math.abs(c.overall - (buy ? target + 4 : cardById(out1).overall)) + random() * 3 }))
          .sort((a, b) => a.key - b.key || a.c.id.localeCompare(b.c.id));
        const into = options[0]?.c.id;
        if (!into) continue;
        roster[roster.indexOf(out1)] = into;
        taken.delete(out1);
        taken.add(into);
      }
    });
  }
  cache.set(key, out);
  return out;
}

/** The arch-rival's card at your level: his own stats, lifted to the top of the band if he is below it. */
export function nemesisCard(id: string, division: number): RiderCard {
  const card = cardById(id);
  const target = DIVISIONS[division].band[0] + NEMESIS_ABOVE;
  const lift = Math.max(0, target - card.overall);
  if (!lift) return card;
  const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, clamp(card.stats[k] + lift, 30, 99)])) as Stats;
  return { ...card, stats, overall: overallOf(card.type, stats) };
}

/**
 * The rosters with your arch-rival in the strongest team. He leaves any other
 * team of the level first, so he rides once.
 */
export function withNemesis(rosters: Record<string, string[]>, division: number, nemesis: string | null, mine: Set<string>): Record<string, string[]> {
  if (!nemesis || mine.has(nemesis)) return rosters;
  const strongest = rivalTeams(division)[0].id;
  const out = Object.fromEntries(Object.entries(rosters).map(([id, riders]) => [id, riders.filter((r) => r !== nemesis)]));
  out[strongest] = [...out[strongest], nemesis];
  return out;
}

/** The rival who beat you most this season, on the podium and ahead of your best rider. */
export function nextNemesis(beaten: Record<string, number>, current: string | null): string | null {
  const best = Object.entries(beaten).filter(([, n]) => n >= NEMESIS_MIN).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return best ? best[0] : current;
}
