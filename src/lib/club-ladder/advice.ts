import { routeClassOfSlug, ROUTE_CLASS_LABELS, type LadderRouteClass, type LadderRouteOption, type PowerDuration } from "./routes";
import { DURATIONS, sameTeam, type StoredMatch, type TeamPower } from "./team-power";

export const DURATION_LABELS: Record<PowerDuration, string> = { s15: "15 s", m1: "1 min", m5: "5 min", m20: "20 min" };

export type ClassRecord = { races: number; wins: number; pointsShare: number };

export type RouteAdvice = {
  slug: string;
  name: string;
  world: string;
  routeClass: LadderRouteClass;
  favorite: boolean;
  score: number;
  reasons: string[];
};

export type LadderAdvice = {
  routes: RouteAdvice[];
  bestFavorite: RouteAdvice | null;
  /** Per duur ons voordeel in procenten (+ is sterker), null zonder data. */
  edge: Record<PowerDuration, number | null>;
  ourRaces: number;
  theirRaces: number;
};

/** Gewicht van de uitslagen per routeklasse naast het krachtverschil (eigen vuistregel). */
const HISTORY_WEIGHT = 0.1;
/** Een route die de tegenstander zelf koos, past bij hem: kleine aftrek per keer. */
const OWN_PICK_PENALTY = 0.02;
const FAVORITE_BONUS = 0.005;

function isTeam(names: string[], team: string) {
  return names.some((name) => sameTeam(name, team));
}

/** Gewonnen races en puntenaandeel per routeklasse voor een team. */
export function classRecords(names: string[], matches: StoredMatch[]) {
  const records = new Map<LadderRouteClass, { races: number; wins: number; own: number; total: number }>();
  for (const match of matches) {
    const asChallenger = isTeam(names, match.challenger);
    if (!asChallenger && !isTeam(names, match.opponent)) continue;
    const routeClass = routeClassOfSlug(match.routeSlug);
    if (!routeClass) continue;
    const own = asChallenger ? match.challengerScore : match.opponentScore;
    const other = asChallenger ? match.opponentScore : match.challengerScore;
    // Gelijk is verlies voor de uitdager.
    const won = own > other || (own === other && !asChallenger);
    const record = records.get(routeClass) ?? { races: 0, wins: 0, own: 0, total: 0 };
    record.races += 1;
    record.wins += won ? 1 : 0;
    record.own += own;
    record.total += own + other;
    records.set(routeClass, record);
  }
  return new Map(
    [...records].map(([key, r]) => [key, { races: r.races, wins: r.wins, pointsShare: r.total ? r.own / r.total : 0.5 } satisfies ClassRecord]),
  );
}

/** Afwijking van een gelijk opgaande strijd, gedempt bij weinig races. */
function recordLean(record: ClassRecord | undefined) {
  if (!record) return 0;
  return (record.pointsShare - 0.5) * (record.races / (record.races + 2));
}

function pct(value: number) {
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export function buildLadderAdvice(input: {
  options: LadderRouteOption[];
  favorites: Set<string>;
  ourNames: string[];
  ourPower: TeamPower | null;
  theirName: string;
  theirPower: TeamPower | null;
  matches: StoredMatch[];
}): LadderAdvice | null {
  const { options, favorites, ourNames, ourPower, theirName, theirPower, matches } = input;
  const edge = Object.fromEntries(
    DURATIONS.map((d) => {
      const ours = ourPower?.wkg[d];
      const theirs = theirPower?.wkg[d];
      return [d, ours && theirs ? Math.log(ours / theirs) : null];
    }),
  ) as Record<PowerDuration, number | null>;
  const ourRecords = classRecords(ourNames, matches);
  const theirRecords = classRecords([theirName], matches);
  const hasPower = DURATIONS.some((d) => edge[d] != null);
  const hasHistory = ourRecords.size > 0 || theirRecords.size > 0;
  if (!hasPower && !hasHistory) return null;

  const theirPicks = new Map<string, number>();
  for (const match of matches) {
    if (match.routeSlug && sameTeam(match.challenger, theirName)) {
      theirPicks.set(match.routeSlug, (theirPicks.get(match.routeSlug) ?? 0) + 1);
    }
  }

  const routes = options.map((option): RouteAdvice => {
    const reasons: string[] = [];
    let power = 0;
    let weightSum = 0;
    let strongest: { d: PowerDuration; contribution: number } | null = null;
    for (const d of DURATIONS) {
      const e = edge[d];
      if (e == null) continue;
      power += option.weights[d] * e;
      weightSum += option.weights[d];
      const contribution = option.weights[d] * e;
      if (!strongest || Math.abs(contribution) > Math.abs(strongest.contribution)) strongest = { d, contribution };
    }
    if (weightSum > 0) {
      power /= weightSum;
      if (strongest) reasons.push(`${DURATION_LABELS[strongest.d]} telt hier zwaar: wij ${pct(edge[strongest.d]!)}`);
    }

    const ours = ourRecords.get(option.routeClass);
    const theirs = theirRecords.get(option.routeClass);
    const history = recordLean(ours) - recordLean(theirs);
    const label = ROUTE_CLASS_LABELS[option.routeClass].toLowerCase();
    if (ours) reasons.push(`Wij op ${label}: ${ours.wins} van ${ours.races} gewonnen`);
    if (theirs) reasons.push(`${theirName} op ${label}: ${theirs.wins} van ${theirs.races} gewonnen`);

    const picks = theirPicks.get(option.slug) ?? 0;
    if (picks > 0) reasons.push(`Koos ${theirName} zelf (${picks}×)`);

    const favorite = favorites.has(option.slug);
    const score = power + HISTORY_WEIGHT * history - OWN_PICK_PENALTY * picks + (favorite ? FAVORITE_BONUS : 0);
    return { slug: option.slug, name: option.name, world: option.world, routeClass: option.routeClass, favorite, score, reasons };
  });

  routes.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "nl"));
  const percent = Object.fromEntries(DURATIONS.map((d) => [d, edge[d] == null ? null : Math.round(edge[d]! * 100)])) as Record<PowerDuration, number | null>;
  return {
    routes: routes.slice(0, 3),
    bestFavorite: routes.find((route) => route.favorite) ?? null,
    edge: percent,
    ourRaces: ourPower?.races ?? [...ourRecords.values()].reduce((sum, r) => sum + r.races, 0),
    theirRaces: theirPower?.races ?? [...theirRecords.values()].reduce((sum, r) => sum + r.races, 0),
  };
}
