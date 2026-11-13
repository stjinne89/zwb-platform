// Sponsors, popularity and a salary cap (round B of docs/kopman-breder.md,
// built 2026-11-13). Every season you pick one of three sponsors: he pays per
// race, sets the budget your starting five must fit in, and has a goal with a
// bonus. The better known your team, the better the offers.
import { buildCourse, courseKind } from "./course";
import { DIVISIONS, PROMOTED, TOP_DIVISION } from "./divisions";
import { clamp, hashSeed, rng } from "./rng";
import { raceById } from "./world";

export const FAME_START = 20;
/** Popularity per race by your best place; a stage counts half. */
export const FAME_GAIN = { win: 5, podium: 3, top10: 1, none: -1 };
/** Per jersey of yours at the end of a stage race. */
export const FAME_JERSEY = 3;
export const FAME_SKIP = -2;
/** A new season: the public forgets a part. */
export const fameNextSeason = (fame: number) => Math.round(fame * 0.6 + 12);

export function fameAfter(fame: number, best: number, share = 1, pers = 0) {
  const gain = best === 1 ? FAME_GAIN.win : best >= 1 && best <= 3 ? FAME_GAIN.podium : best >= 1 && best <= 10 ? FAME_GAIN.top10 : FAME_GAIN.none;
  return clamp(fame + Math.round(gain * share * (gain > 0 ? 1 + pers * 2.5 : 1)), 0, 100);
}

/** What a rider earns a season, in thousands, from his overall. */
export const salaryOf = (overall: number) => Math.max(5, Math.round((Math.max(0, overall - 45) ** 1.6) / 4));

/** The salaries a level's sponsors start from, for five riders: about the top of its band, a little more. */
export const BASE_BUDGET = [130, 200, 270, 320, 360];
/** What a sponsor pays per race, times the prize share of the level. */
export const BASE_PAY = 600;

export type GoalKind = "zeges" | "soort" | "top5" | "eindstand" | "jong" | "trui" | "titel";
export type Goal = { kind: GoalKind; n: number; soort?: string };
export type Sponsor = { name: string; pay: number; budget: number; goal: Goal; bonus: number; progress: number; met: boolean };

const NAMES = ["Melkerij De Weide", "Bouwbedrijf Kraanvogel", "Koffie Zwartbes", "Fietsenmaker Spaak", "Verzekeraar Schild", "Brouwerij Hopper", "Zuivel Noorderveld", "Energie Windhoek", "Tegelhuis Mozaïek", "Matrassen Zachtjes", "Reisbureau Zonnig", "Veiling Oogst", "Drukkerij Letterzet", "Bakkerij Korenbloem", "Glazenwasser Helder", "Transport Tienwieler"];
const SOORTEN = ["Kasseien", "Heuvels", "Bergop", "Tijdrit", "Vlak"];

export function goalText(goal: Goal) {
  switch (goal.kind) {
    case "zeges": return goal.n === 1 ? "Win een koers" : `Win ${goal.n} koersen`;
    case "soort": return `Win een koers: ${goal.soort!.toLowerCase()}`;
    case "top5": return `${goal.n} keer in de top 5`;
    case "eindstand": return goal.n === 1 ? "Win het seizoen" : `Eindig in de top ${goal.n}`;
    case "jong": return `Top 10 met een renner van ${goal.n} of jonger`;
    case "trui": return "Een trui in de ronde";
    case "titel": return "Word kampioen";
  }
}

/** The goals of one difficulty in this level, to draw from. */
function goalsFor(level: number, hard: 0 | 1 | 2, kinds: Set<string>): Goal[] {
  const top = level === TOP_DIVISION;
  if (hard === 0) return [{ kind: "top5", n: 2 }, { kind: "jong", n: 25 }, { kind: "eindstand", n: 8 }];
  if (hard === 1) return [{ kind: "zeges", n: 1 }, { kind: "top5", n: 4 }, { kind: "eindstand", n: 4 }, ...SOORTEN.filter((s) => kinds.has(s)).map((soort) => ({ kind: "soort" as const, n: 1, soort })), { kind: "jong", n: 23 }, { kind: "titel", n: 1 }];
  return [{ kind: "zeges", n: 3 }, { kind: "eindstand", n: top ? 1 : PROMOTED }, { kind: "top5", n: 6 }, ...(top ? [{ kind: "trui" as const, n: 1 }] : [])];
}

/** The kinds of course in a level's calendar. */
export const kindsIn = (level: number) => new Set(DIVISIONS[level].races.flatMap((id) => (raceById.get(id) ? [courseKind(buildCourse(raceById.get(id)!))] : [])));

/**
 * Three offers for a season: one that pays well with a hard goal and a tight
 * budget, one with room in the budget, and a steady one with an easy goal.
 * A sponsor whose goal you met last season comes back first and pays a tenth more.
 */
export function sponsorOffers(seed: number, season: number, level: number, fame: number, loyal: string | null): Sponsor[] {
  const random = rng(hashSeed(seed, season, level, "sponsor"));
  const prize = DIVISIONS[level].prize;
  const kinds = kindsIn(level);
  const names = NAMES.filter((n) => n !== loyal);
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  const reach = 0.6 + (clamp(fame, 0, 100) / 100) * 0.8;
  const shapes: { pay: number; budget: number; hard: 0 | 1 | 2; bonus: number }[] = [
    { pay: 1.4, budget: 0.9, hard: 2, bonus: 10 },
    { pay: 0.8, budget: 1.1, hard: 1, bonus: 7 },
    { pay: 1, budget: 1, hard: 0, bonus: 5 },
  ];
  return shapes.map((shape, i) => {
    const options = goalsFor(level, shape.hard, kinds);
    const goal = options[Math.floor(random() * options.length)];
    const again = i === 0 && loyal ? 1.1 : 1;
    const pay = Math.round(BASE_PAY * prize * shape.pay * reach * again);
    return {
      name: i === 0 && loyal ? loyal : names[i],
      pay,
      budget: Math.round(BASE_BUDGET[level] * shape.budget * (0.95 + reach * 0.1)),
      goal,
      bonus: pay * shape.bonus,
      progress: 0,
      met: false,
    };
  });
}

/** How far one race takes a goal. `young`: the youngest of yours in the top 10, if any. */
export function goalStep(goal: Goal, race: { best: number; kind: string; young: number | null }) {
  switch (goal.kind) {
    case "zeges": return race.best === 1 ? 1 : 0;
    case "soort": return race.best === 1 && race.kind === goal.soort ? 1 : 0;
    case "top5": return race.best >= 1 && race.best <= 5 ? 1 : 0;
    case "jong": return race.young !== null && race.young <= goal.n ? 1 : 0;
    default: return 0;
  }
}

/** The goals that count once: a season rank, a jersey, one win of a kind, a young rider. */
export const goalTarget = (goal: Goal) => (goal.kind === "zeges" || goal.kind === "top5" ? goal.n : 1);
