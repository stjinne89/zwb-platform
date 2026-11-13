import { cardById, overallOf } from "./cards";
import { clamp, hashSeed, rng } from "./rng";
import { STAT_KEYS, type RiderCard, type StatKey, type Stats } from "./types";

/**
 * A rider in your team lives (since 2026-11-13, docs/kopman-breder.md): he has
 * an age and a talent, he grows while young and declines when old, his form
 * goes down with every race and comes back with rest. The card stays the same;
 * the save keeps what changed.
 */
export type RiderLife = {
  age: number;
  /** The highest overall he grows to. */
  talent: number;
  /** 0 to 100: every FORM_STEP under 100 costs a point on every stat. */
  form: number;
  wins: number;
  /** Championships won. */
  titles: number;
  /** Points on every stat from growing and declining. */
  growth: number;
  /** Points on one stat, from a growth task. */
  extra: Partial<Stats>;
};

export const AGE = { min: 19, max: 33, growUntil: 25, declineFrom: 31, retireFrom: 34 };
export const FORM_STEP = 15;
export const FORM_COST = { race: 10, stage: 5, kampioenschap: 8 };
export const FORM_REST = 20;
export const FORM_SKIP = 30;
export const FORM_CAMP = 30;
export const TALENT_MAX = 94;

/** How far a rider of this age can still grow. */
const roomAt = (age: number) => (age <= 21 ? 12 : age <= 23 ? 8 : age <= 25 ? 4 : 0);

/** The life a rider starts with in your team: an age and a talent from your seed. */
export function lifeFor(seed: number, id: string, young = false): RiderLife {
  const random = rng(hashSeed(seed, "renner", id));
  const card = cardById(id);
  const age = young ? AGE.min + Math.floor(random() * 3) : AGE.min + Math.floor(random() * (AGE.max - AGE.min + 1));
  const room = young ? 6 + Math.floor(random() * 9) : Math.floor(random() * (roomAt(age) + 1));
  return { age, talent: Math.min(TALENT_MAX, Math.max(card.overall, card.overall + room)), form: 100, wins: 0, titles: 0, growth: 0, extra: {} };
}

/** The age at which a rider stops: 34 to 36, from your seed; `shift` years earlier under a harder career. */
export function retireAge(seed: number, id: string, shift = 0) {
  return AGE.retireFrom + Math.floor(rng(hashSeed(seed, "afscheid", id))() * 3) - shift;
}

/** Overall points a season adds (growth) or takes (decline). `boost` is the scout's share. */
export function seasonChange(life: RiderLife, overall: number, boost = 0, shift = 0) {
  if (life.age <= AGE.growUntil) {
    const base = life.age <= 22 ? 3 : 2;
    return Math.max(0, Math.min(life.talent - overall, Math.round(base * (1 + boost * 2.5))));
  }
  const from = AGE.declineFrom - shift;
  if (life.age < from) return 0;
  return -(life.age >= from + 4 ? 3 : life.age >= from + 2 ? 2 : 1);
}

export const formPenalty = (form: number) => Math.floor((100 - clamp(form, 0, 100)) / FORM_STEP);

/** The card as it rides today: the printed stats plus growth, a task's extra, and minus his lack of form. */
export function liveCardOf(id: string, life: RiderLife | undefined): RiderCard {
  const card = cardById(id);
  if (!life) return card;
  const penalty = formPenalty(life.form);
  if (!life.growth && !penalty && !Object.keys(life.extra).length) return card;
  const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, clamp(card.stats[k] + life.growth + (life.extra[k as StatKey] ?? 0) - penalty, 30, 99)])) as Stats;
  return { ...card, stats, overall: overallOf(card.type, stats) };
}

/** The overall without the form: what growth and decline work from. */
export const baseOverall = (id: string, life: RiderLife) => liveCardOf(id, { ...life, form: 100 }).overall;

export const restLives = (lives: Record<string, RiderLife>, ids: string[], gain: number) => {
  const out = { ...lives };
  for (const id of ids) if (out[id]) out[id] = { ...out[id], form: Math.min(100, out[id].form + gain) };
  return out;
};
