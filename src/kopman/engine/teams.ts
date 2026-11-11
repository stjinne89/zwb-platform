import { pool } from "./cards";
import { courseWeights, fitFor } from "./course";
import { rng } from "./rng";
import type { Course, RiderCard, RiderType, TeamDef } from "./types";
import { TEAM_NAMES } from "./world";

const SLOTS: RiderType[] = ["klimmer", "klimmer", "klassieker", "klassieker", "sprinter", "sprinter", "tijdrijder", "allrounder"];

let cached: TeamDef[] | null = null;

/**
 * The eleven rival teams, eight riders each, from strong to weak. Built from the
 * fixed pool, so every player meets the same peloton.
 */
export function rivalTeams(): TeamDef[] {
  if (cached) return cached;
  const random = rng(77);
  const taken = new Set<string>();
  const riders = pool().pool;
  cached = TEAM_NAMES.map((team, t) => {
    const target = 80 - t * 1.6;
    const roster = SLOTS.map((type) => {
      // A fixed jitter per rider, so the sort is consistent in every browser.
      const options = riders.filter((r) => r.type === type && !taken.has(r.id)).map((r) => ({ r, key: Math.abs(r.overall - target) + random() * 2 }));
      options.sort((a, b) => a.key - b.key || a.r.id.localeCompare(b.r.id));
      const pick = options[0].r;
      taken.add(pick.id);
      return pick.id;
    });
    return { ...team, riders: roster };
  });
  return cached;
}

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
