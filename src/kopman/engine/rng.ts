// Seeded randomness. Everything in Kopman that looks random (the rider pool,
// packs, races) comes from here, so the same seed gives the same game.

/** mulberry32: small, fast and good enough for a game. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable number in [0, 1) for (seed, index), without carrying state around. */
export function randomAt(seed: number, index: number) {
  let n = (seed ^ Math.imul(index + 1, 0x45d9f3b)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Mixes several numbers into one seed. */
export function hashSeed(...parts: (number | string)[]) {
  let h = 2166136261 >>> 0;
  for (const part of parts) {
    const text = String(part);
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
    h = Math.imul(h ^ 0x9e, 16777619) >>> 0;
  }
  return h >>> 0;
}

export const pick = <T,>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)];

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
