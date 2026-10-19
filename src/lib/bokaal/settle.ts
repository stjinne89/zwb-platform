// Afrekenen na de koers: briefjes en bonusvragen.
//
// Niet gestart (niet meer op de startlijst bij het afrekenen) is inzet terug.
// Gestart maar niet in de uitslag (opgegeven) telt als niet gefinisht. In een
// duel waarin geen van beiden finisht, krijg je je inzet terug.

import type { Category, Market } from "./rules";

export type ResultRow = {
  /** Plek; null bij opgave. */
  pos: number | null;
  slug: string;
  name: string;
  /** Landcode van de renner, "BE". */
  nat: string | null;
  age: number | null;
  team: string | null;
  /** Achterstand op de winnaar in seconden; 0 voor de winnaar. */
  gap: number | null;
};

export type OpenBet = { id: string; market: Market; rider_slug: string; vs_slug: string | null; stake: number; odds: number };
export type Outcome = { id: string; outcome: "raak" | "mis" | "terug"; payout: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function settleBet(bet: OpenBet, result: ResultRow[], starters: Set<string>): Outcome {
  const back = (): Outcome => ({ id: bet.id, outcome: "terug", payout: bet.stake });
  const place = (slug: string) => result.find((r) => r.slug === slug && r.pos != null)?.pos ?? null;
  if (!starters.has(bet.rider_slug) || (bet.vs_slug && !starters.has(bet.vs_slug))) return back();
  const p = place(bet.rider_slug);
  let hit: boolean;
  if (bet.market === "duel") {
    const q = place(bet.vs_slug!);
    if (p == null && q == null) return back();
    hit = p != null && (q == null || p < q);
  } else {
    const limit = bet.market === "win" ? 1 : bet.market === "pod" ? 3 : 10;
    hit = p != null && p <= limit;
  }
  return hit ? { id: bet.id, outcome: "raak", payout: round2(bet.stake * bet.odds) } : { id: bet.id, outcome: "mis", payout: 0 };
}

// ── Bonusvragen ───────────────────────────────────────────────────────────
// Alleen meerkeuzevragen die uit de uitslag op CyclingFlash na te kijken zijn
// (plek, achterstand, leeftijd, nationaliteit).

export type BonusQuestion = { key: string; question: string; options: string[]; answer: number | null };

type Definition = {
  question: (category: Category) => string;
  options: string[];
  /** Het juiste antwoord, of null als de uitslag het niet zegt. */
  answer: (finished: ResultRow[]) => number | null;
};

const finishers = (result: ResultRow[]) =>
  result.filter((r) => r.pos != null).sort((a, b) => (a.pos as number) - (b.pos as number));

export const BONUS_QUESTIONS: Record<string, Definition> = {
  marge: {
    question: (c) => (c === "w" ? "Voorsprong van de winnares?" : "Voorsprong van de winnaar?"),
    options: ["minder dan 10 s", "10 tot 30 s", "meer dan 30 s"],
    answer: (f) => {
      const gap = f[1]?.gap;
      if (gap == null) return null;
      return gap < 10 ? 0 : gap <= 30 ? 1 : 2;
    },
  },
  jong: {
    question: () => "Renners jonger dan 25 in de top 10?",
    options: ["0 tot 2", "3 of 4", "5 of meer"],
    answer: (f) => {
      const top = f.slice(0, 10);
      if (top.length < 10 || top.some((r) => r.age == null)) return null;
      const young = top.filter((r) => (r.age as number) < 25).length;
      return young <= 2 ? 0 : young <= 4 ? 1 : 2;
    },
  },
  "belgen-podium": {
    question: () => "Belgen op het podium?",
    options: ["geen", "1", "2", "3"],
    answer: (f) => {
      const podium = f.slice(0, 3);
      if (podium.length < 3 || podium.some((r) => !r.nat)) return null;
      return podium.filter((r) => r.nat === "BE").length;
    },
  },
  "be-nl": {
    question: () => "Meer Belgen of Nederlanders in de top 10?",
    options: ["Belgen", "Nederlanders", "evenveel"],
    answer: (f) => {
      const top = f.slice(0, 10);
      if (top.length < 10 || top.some((r) => !r.nat)) return null;
      const be = top.filter((r) => r.nat === "BE").length;
      const nl = top.filter((r) => r.nat === "NL").length;
      return be > nl ? 0 : nl > be ? 1 : 2;
    },
  },
};

export const BONUS_KEYS = Object.keys(BONUS_QUESTIONS);

export function bonusQuestion(key: string, category: Category): BonusQuestion | null {
  const definition = BONUS_QUESTIONS[key];
  return definition ? { key, question: definition.question(category), options: definition.options, answer: null } : null;
}

export function bonusAnswer(key: string, result: ResultRow[]): number | null {
  return BONUS_QUESTIONS[key]?.answer(finishers(result)) ?? null;
}
