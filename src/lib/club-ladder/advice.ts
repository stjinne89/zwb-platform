import { EVEN_PCT, formatEdge } from "./edge-tone";
import { powerOverview, routeEdge, type AdviceRider, type RiderPair } from "./rank-pairs";
import { shownWeight, weightsUsable } from "./rider-weight";
import { routeClassOfSlug, ROUTE_CLASS_LABELS, type LadderRouteClass, type LadderRouteOption, type PowerDuration } from "./routes";
import { DURATIONS, sameTeam, type StoredMatch } from "./team-power";

export const DURATION_LABELS: Record<PowerDuration, string> = { s15: "15 s", m1: "1 min", m5: "5 min", m20: "20 min" };

export type ClassRecord = { races: number; wins: number; pointsShare: number };

export type RouteAdvice = {
  slug: string;
  name: string;
  world: string;
  routeClass: LadderRouteClass;
  favorite: boolean;
  /** Ons voordeel op dit parcours in hele procenten (renner tegen renner op volgorde), null zonder vermogen. */
  edgePct: number | null;
  score: number;
  reasons: AdviceReason[];
};

/** Een reden bij een parcours. `pct` is ons voordeel in hele procenten, los van de tekst zodat hij kleur krijgt. */
export type AdviceReason = { text: string; pct?: number };

export function reasonText(reason: AdviceReason) {
  return reason.pct == null ? reason.text : `${reason.text} ${formatEdge(reason.pct)}`;
}

/** Per duur onze vijf tegen hun vijf op volgorde, in gewone W/kg. */
export type AdviceDuration = {
  duration: PowerDuration;
  pairs: RiderPair[];
  /** Gemiddeld verschil van de paren in hele procenten, null met minder dan drie paren. */
  edgePct: number | null;
};

export type LadderAdvice = {
  routes: RouteAdvice[];
  bestFavorite: RouteAdvice | null;
  durations: AdviceDuration[];
  /** Gemiddeld gewicht (hele kg) per kant, pas vanaf drie renners met gewicht. */
  weightKg: { ours: number | null; theirs: number | null };
  /** Telt gewicht mee per parcours (beide kanten minstens drie gewichten). */
  weightCounts: boolean;
  /** Renners met vermogen per kant. */
  ours: { riders: number };
  theirs: { riders: number };
  /** Van onze vijf zonder vermogen; die tellen niet mee in de paren. */
  missing: string[];
};

/** Gewicht van de uitslagen per routeklasse naast het krachtverschil (eigen vuistregel). */
const HISTORY_WEIGHT = 0.1;
/** Een route die de tegenstander zelf koos, past bij hem: kleine aftrek per keer. */
const OWN_PICK_PENALTY = 0.02;
const FAVORITE_BONUS = 0.005;
const SHOWN_ROUTES = 3;

/** Wedstrijden van de laatste 90 dagen, zoals het vermogen van ZwiftRacing. */
export function recentMatches(matches: StoredMatch[], now = new Date()) {
  const since = new Date(now.getTime() - 90 * 86_400_000).toISOString().slice(0, 10);
  return matches.filter((match) => match.racedOn >= since);
}

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

const hasWkg = (rider: AdviceRider) => Boolean(rider.wkg && DURATIONS.some((d) => rider.wkg![d] != null));
const toPct = (value: number) => Math.round(value * 100);

/**
 * Advies per parcours: renner tegen renner op volgorde (`rank-pairs.ts`), onze
 * vijf (de selectie, of de sterkste vijf voor dat parcours) tegen de gekozen
 * vijf van de tegenstander, met de duren gewogen naar het parcours. Daar komen
 * de uitslagen per routetype en een kleine aftrek voor eigen keuzes van de
 * tegenstander bij, zoals eerder.
 */
export function buildLadderAdvice(input: {
  options: LadderRouteOption[];
  favorites: Set<string>;
  ourNames: string[];
  ours: AdviceRider[];
  theirName: string;
  theirs: AdviceRider[];
  matches: StoredMatch[];
}): LadderAdvice | null {
  const { options, favorites, ourNames, ours, theirName, theirs, matches } = input;
  const overview = powerOverview(ours, theirs);
  const ourRecords = classRecords(ourNames, matches);
  const theirRecords = classRecords([theirName], matches);
  const hasPower = overview.durations.some((row) => row.edge != null);
  const hasHistory = ourRecords.size > 0 || theirRecords.size > 0;
  if (!hasPower && !hasHistory) return null;

  const theirPicks = new Map<string, number>();
  for (const match of matches) {
    if (match.routeSlug && sameTeam(match.challenger, theirName)) {
      theirPicks.set(match.routeSlug, (theirPicks.get(match.routeSlug) ?? 0) + 1);
    }
  }
  const ourPowered = ours.filter(hasWkg);

  const routes = options.map((option): RouteAdvice => {
    const reasons: AdviceReason[] = [];
    const result = hasPower ? routeEdge({ ours, theirs, weights: option.weights, terrain: option.terrain }) : null;
    if (result) {
      // De duur die op dit parcours het zwaarst weegt, niet die met de grootste bijdrage.
      const counted = DURATIONS.filter((d) => result.perDuration[d] != null && option.weights[d] > 0);
      const heaviest = counted.reduce<PowerDuration | null>((best, d) => (!best || option.weights[d] > option.weights[best] ? d : best), null);
      if (heaviest) reasons.push({ text: `${DURATION_LABELS[heaviest]} telt hier zwaar: wij`, pct: toPct(result.perDuration[heaviest]!) });
      if (result.weightCounts) {
        const plain = routeEdge({ ours, theirs, weights: option.weights, terrain: option.terrain, ignoreWeight: true });
        const diff = plain ? toPct(result.edge - plain.edge) : 0;
        if (Math.abs(diff) >= EVEN_PCT) reasons.push({ text: "Gewicht scheelt hier", pct: diff });
      }
      // Zonder selectie kiezen we per parcours onze vijf: wie dat zijn, staat erbij.
      if (ourPowered.length > 5) reasons.push({ text: `Met ${result.five.map((rider) => rider.name).join(", ")}` });
    }

    const oursRecord = ourRecords.get(option.routeClass);
    const theirsRecord = theirRecords.get(option.routeClass);
    const history = recordLean(oursRecord) - recordLean(theirsRecord);
    const label = ROUTE_CLASS_LABELS[option.routeClass].toLowerCase();
    if (oursRecord) reasons.push({ text: `Wij op ${label}: ${oursRecord.wins} van ${oursRecord.races} gewonnen` });
    if (theirsRecord) reasons.push({ text: `${theirName} op ${label}: ${theirsRecord.wins} van ${theirsRecord.races} gewonnen` });

    const picks = theirPicks.get(option.slug) ?? 0;
    if (picks > 0) reasons.push({ text: `Koos ${theirName} zelf (${picks}×)` });

    const favorite = favorites.has(option.slug);
    const score = (result?.edge ?? 0) + HISTORY_WEIGHT * history - OWN_PICK_PENALTY * picks + (favorite ? FAVORITE_BONUS : 0);
    return {
      slug: option.slug,
      name: option.name,
      world: option.world,
      routeClass: option.routeClass,
      favorite,
      edgePct: result ? toPct(result.edge) : null,
      score,
      reasons,
    };
  });

  routes.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "nl"));
  const theirPowered = theirs.filter(hasWkg);
  return {
    routes: routes.slice(0, SHOWN_ROUTES),
    bestFavorite: routes.find((route) => route.favorite) ?? null,
    durations: overview.durations.map((row) => ({
      duration: row.duration,
      pairs: row.pairs,
      edgePct: row.edge == null ? null : toPct(row.edge),
    })),
    weightKg: { ours: shownWeight(ourPowered), theirs: shownWeight(theirPowered) },
    weightCounts: weightsUsable(ourPowered, theirPowered),
    ours: { riders: ourPowered.length },
    theirs: { riders: theirPowered.length },
    missing: overview.missing,
  };
}
