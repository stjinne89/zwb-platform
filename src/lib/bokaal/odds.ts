// Van startlijst met ratings naar het bord.
//
// Elke renner krijgt een kracht e^(rating / T). Winst is exact: kracht gedeeld
// door de som van alle krachten op de startlijst (Plackett–Luce). Podium en
// top 10 komen uit gesimuleerde koersen met dezelfde krachten: rating/T plus
// Gumbel-ruis, gesorteerd, geeft precies die verdeling. Een duel is exact:
// kracht A / (kracht A + kracht B). Zie PLAN.md, ronde voorZpWelBokaal.

import { FLOOR_RATING, SIMULATIONS, TEMPERATURE, toLadder } from "./rules";

export type FieldRider = { slug: string; name: string; rating: number | null };
export type BoardRider = FieldRider & { win: number | null; pod: number | null; top: number | null };
export type BoardDuel = { a: string; b: string; oa: number | null; ob: number | null };
export type Board = { riders: BoardRider[]; duels: BoardDuel[] };
export type Probabilities = { slug: string; win: number; pod: number; top: number };

type Options = { temperature?: number; simulations?: number; seed?: number };

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Vaste seed per koers, zodat hetzelfde veld altijd dezelfde quoteringen geeft. */
export function seedFor(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const effective = (rider: FieldRider) => rider.rating ?? FLOOR_RATING;

export function probabilities(field: FieldRider[], options: Options = {}): Probabilities[] {
  const T = options.temperature ?? TEMPERATURE;
  const sims = options.simulations ?? SIMULATIONS;
  const n = field.length;
  if (n === 0) return [];
  const base = field.map((r) => effective(r) / T);
  const max = Math.max(...base);
  const strength = base.map((b) => Math.exp(b - max));
  const total = strength.reduce((a, s) => a + s, 0);
  const pod = new Array<number>(n).fill(0);
  const top = new Array<number>(n).fill(0);
  const rnd = mulberry32(options.seed ?? 1);
  const keys = new Float64Array(n);
  const places = Math.min(10, n);
  for (let s = 0; s < sims; s++) {
    for (let i = 0; i < n; i++) keys[i] = base[i] - Math.log(-Math.log(rnd() || 1e-12));
    for (let k = 0; k < places; k++) {
      let best = 0;
      for (let i = 1; i < n; i++) if (keys[i] > keys[best]) best = i;
      if (k < 3) pod[best]++;
      top[best]++;
      keys[best] = -Infinity;
    }
  }
  return field.map((r, i) => ({ slug: r.slug, win: strength[i] / total, pod: pod[i] / sims, top: top[i] / sims }));
}

export function duelChance(a: FieldRider, b: FieldRider, temperature = TEMPERATURE): number {
  return 1 / (1 + Math.exp((effective(b) - effective(a)) / temperature));
}

/** Twee duels: buren in rating binnen de top 10 met het kleinste gat, zonder renner dubbel. */
export function pickDuels(sorted: FieldRider[], count = 2): [FieldRider, FieldRider][] {
  const top = sorted.slice(0, 10);
  const pairs: [FieldRider, FieldRider, number][] = [];
  for (let i = 0; i < top.length - 1; i++) pairs.push([top[i], top[i + 1], effective(top[i]) - effective(top[i + 1])]);
  pairs.sort((x, y) => x[2] - y[2]);
  const used = new Set<string>();
  const chosen: [FieldRider, FieldRider][] = [];
  for (const [a, b] of pairs) {
    if (chosen.length === count) break;
    if (used.has(a.slug) || used.has(b.slug)) continue;
    used.add(a.slug);
    used.add(b.slug);
    chosen.push([a, b]);
  }
  return chosen;
}

export function buildBoard(field: FieldRider[], options: Options = {}): Board {
  const unique = [...new Map(field.map((r) => [r.slug, r])).values()];
  const sorted = [...unique].sort((x, y) => effective(y) - effective(x) || x.name.localeCompare(y.name));
  const p = new Map(probabilities(sorted, options).map((x) => [x.slug, x]));
  const riders: BoardRider[] = sorted.map((r) => {
    const q = p.get(r.slug)!;
    return { ...r, win: toLadder(1 / q.win), pod: toLadder(1 / q.pod), top: toLadder(1 / q.top) };
  });
  const duels: BoardDuel[] = pickDuels(sorted).map(([a, b]) => {
    const pa = duelChance(a, b, options.temperature);
    return { a: a.slug, b: b.slug, oa: toLadder(1 / pa), ob: toLadder(1 / (1 - pa)) };
  });
  return { riders, duels };
}
