// Spelregels van voorZpWelBokaal (heropbouw 2026-10-19).
//
// START, PER_RACE en BONUS staan ook in migratie 0252 (bokaal_balance en
// bokaal_place_bet); wie ze wijzigt, wijzigt beide.

/** Saldo waarmee elk lid een seizoen begint. */
export const START = 10;
/** Hoogstens zoveel ballen per wedstrijd, dames en heren apart, ook met een groot saldo. */
export const PER_RACE = 5;
/** Een goed antwoord op de bonusvraag. */
export const BONUS = 1;

/** Hoe zwaar een ratingverschil weegt: 35 punten meer is e (≈ 2,7) keer zo sterk. Voorlopig; te ijken op vorig seizoen. */
export const TEMPERATURE = 35;
/** Rating voor wie geen CyclingFlash-rating heeft. */
export const FLOOR_RATING = 600;
export const SIMULATIONS = 20000;
export const MIN_ODD = 1.05;
export const MAX_ODD = 50;
/** De gokkantoorladder; een eerlijke quotering wordt naar beneden afgerond op deze stappen. */
export const LADDER = [
  1.05, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2, 2.25, 2.5, 2.75, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 10, 12, 15, 20, 25, 33, 50,
] as const;

/** De toestemming waarmee een lid meedoet; ook in de check-constraint van bokaal_players (0252). */
export const BOKAAL_CONSENT_VERSION = "2026-10-19";

export type Category = "w" | "m";
export type Market = "win" | "pod" | "top" | "duel";

export const CATEGORY_LABEL: Record<Category, string> = { w: "Dames", m: "Heren" };
export const MARKET_LABEL: Record<Market, string> = { win: "wint", pod: "podium", top: "top 10", duel: "duel" };

/** Een veldritseizoen loopt van augustus tot en met juli: "2026-2027". */
export function seasonOf(date: Date): string {
  const year = date.getUTCFullYear();
  return date.getUTCMonth() >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

/** Eerlijke quotering naar de ladder; null als hij onder MIN_ODD valt (niet op het bord). */
export function toLadder(fair: number): number | null {
  if (Number.isNaN(fair) || fair < MIN_ODD) return null;
  // Ook wie in geen enkele simulatie top 10 reed (kans 0, quotering oneindig).
  if (fair >= MAX_ODD) return MAX_ODD;
  let odd: number = LADDER[0];
  for (const step of LADDER) {
    if (step <= fair) odd = step;
    else break;
  }
  return odd;
}

/** "4,50", "20", "–". */
export function formatOdd(odd: number | null | undefined): string {
  if (odd == null) return "–";
  return odd >= 10 ? String(Math.round(odd)) : odd.toFixed(2).replace(".", ",");
}

/** Saldo of uitbetaling: "43", "6,75". */
export function formatBalls(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, "").replace(".", ",");
}

/** Achternaam zoals op een krijtbord: "Ceylin del Carmen Alvarado" wordt "Alvarado". */
export function boardName(name: string): string {
  let rest = name.trim().split(/\s+/).slice(1).join(" ");
  if (!rest) return name;
  if (rest.length > 15) rest = rest.split(" ").pop() ?? rest;
  return rest;
}
