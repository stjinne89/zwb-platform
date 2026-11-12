import { cardById, pool } from "./cards";
import { courseWeights, fitFor } from "./course";
import { DIVISIONS, divisionOfRace } from "./divisions";
import { GEAR_SLOTS, NO_BONUS, teamBonus, type TeamBonus } from "./items";
import { rng } from "./rng";
import type { Course, RiderCard, RiderType, TeamDef } from "./types";

const SLOTS: RiderType[] = ["klimmer", "klimmer", "klassieker", "klassieker", "sprinter", "sprinter", "tijdrijder", "allrounder"];

const cached = new Map<number, TeamDef[]>();

/**
 * The eleven rival teams of a level, eight riders each, from strong to weak.
 * Built from the fixed pool, so every player meets the same peloton. A rider
 * rides for one team per level; the levels each pick their own.
 */
export function rivalTeams(division: number): TeamDef[] {
  const hit = cached.get(division);
  if (hit) return hit;
  const def = DIVISIONS[division];
  if (!def) throw new Error(`Onbekend niveau: ${division}`);
  const random = rng(77 + division);
  const taken = new Set<string>();
  const riders = pool().pool;
  const [strong, weak] = def.band;
  // The weakest team picks first: low ratings are scarce in the pool, and a
  // strong team finds riders near its target anyway.
  const rosters = def.teams.map((_, t) => t).reverse().map((t) => {
    const target = strong - ((strong - weak) * t) / Math.max(1, def.teams.length - 1);
    const roster = SLOTS.map((type) => {
      // A fixed jitter per rider, so the sort is consistent in every browser.
      const options = riders.filter((r) => r.type === type && !taken.has(r.id)).map((r) => ({ r, key: Math.abs(r.overall - target) + random() * 2 }));
      options.sort((a, b) => a.key - b.key || a.r.id.localeCompare(b.r.id));
      const pick = options[0].r;
      taken.add(pick.id);
      return pick.id;
    });
    return roster;
  });
  // Strongest first, by the five a team usually starts.
  const strength = (roster: string[]) => roster.map((id) => cardById(id).overall).sort((a, b) => b - a).slice(0, 5).reduce((sum, n) => sum + n, 0);
  rosters.sort((a, b) => strength(b) - strength(a) || a[0].localeCompare(b[0]));
  const teams = def.teams.map((team, t) => ({ ...team, riders: rosters[t] }));
  cached.set(division, teams);
  return teams;
}

const gearCache = new Map<number, TeamBonus>();
/** What the equipment of the rival teams in a level does: a full set of one tier, the same for every team. */
export function rivalBonus(division: number): TeamBonus {
  const hit = gearCache.get(division);
  if (hit) return hit;
  const tier = DIVISIONS[division].gear;
  const bonus = tier ? teamBonus(Object.fromEntries(GEAR_SLOTS.map((slot) => [`m-${slot}-${tier}`, 1]))) : NO_BONUS;
  gearCache.set(division, bonus);
  return bonus;
}

/** The rival teams in this race: the peloton of its level. */
export const rivalsIn = (raceId: string) => rivalTeams(divisionOfRace(raceId));

const byId = new Map(DIVISIONS.flatMap((d) => d.teams.map((t) => [t.id, t] as const)));
/** Any rival team, of any level, by id. */
export const teamById = (id: string) => byId.get(id);

/** The five a team starts on this course, best fit first: that one is the kopman. */
export function lineupFor(riders: RiderCard[], course: Course, exclude: Set<string> = new Set()) {
  const weights = courseWeights(course);
  return riders
    .filter((r) => !exclude.has(r.id))
    .map((r) => ({ r, fit: fitFor(r, weights) }))
    .sort((a, b) => b.fit - a.fit || a.r.id.localeCompare(b.r.id))
    .slice(0, 5)
    .map((x) => x.r);
}
