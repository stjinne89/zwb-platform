// ZWBriljant in de tijd en naast anderen: een steen uit een opgeslagen snapshot,
// de week bij een gekozen datum en het ZWB-gemiddelde. Puur; de server levert de
// snapshots. Een snapshot bewaart alleen niveaus, geen metingen: een steen uit het
// verleden of van een ander toont dus punten en klassen, geen watts of ZRS.

import { CONSISTENCY_WEEKS, FACETS, FACET_LABELS, FACET_MEASURES, consistencyFactor, points, positionFor, profileScore, type Facet } from "./score";
import { FACET_WEIGHTS, LEVELS, levelOf } from "./norms";
import type { BriljantView, FacetMeter, FacetView } from "./view";

export type StoredSnapshot = {
  week: string;
  score: number | null;
  facets: Partial<Record<Facet, number | null>>;
  consistency: number | null;
};

/** Pas vanaf zoveel leden is er een ZWB-gemiddelde: anders is het te herleiden. */
export const MIN_FOR_AVERAGE = 5;

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * De snapshot bij een gekozen datum: de laatste week op of vóór die datum, en als
 * de datum vóór de eerste snapshot ligt de eerste. Null zonder snapshots met score.
 */
export function snapshotAt(snapshots: StoredSnapshot[], day: string): StoredSnapshot | null {
  const scored = snapshots.filter((snapshot) => snapshot.score != null).sort((a, b) => a.week.localeCompare(b.week));
  if (scored.length === 0) return null;
  const before = scored.filter((snapshot) => snapshot.week <= day);
  return before.at(-1) ?? scored[0];
}

/** De balk in punten: van de grens van de klasse naar de volgende (geen meting bewaard). */
function pointsMeter(level: number): FacetMeter {
  const reached = levelOf(level);
  const next = LEVELS[reached.n + 1] ?? null;
  const value = points(level);
  if (!next) {
    return { share: 1, from: `${reached.n * 100} punten`, to: "", fromLevel: reached, toLevel: null, note: `${reached.name}: het maximum` };
  }
  return {
    share: Math.min(1, Math.max(0, (value - reached.n * 100) / 100)),
    from: `${reached.n * 100} punten`,
    to: `${next.n * 100} punten`,
    fromLevel: reached,
    toLevel: next,
    note: `nog ${next.n * 100 - value} punten tot ${next.name}`,
  };
}

/** Een steen uit een snapshot, voor een week uit het verleden of een ander lid. */
export function viewFromSnapshot(args: { seed: string; snapshot: StoredSnapshot; source: string }): BriljantView {
  const levels = Object.fromEntries(FACETS.map((facet) => [facet, args.snapshot.facets[facet] ?? null])) as Record<Facet, number | null>;
  const present = FACETS.filter((facet) => levels[facet] != null);
  const totalWeight = present.reduce((sum, facet) => sum + FACET_WEIGHTS[facet], 0);
  const raw = profileScore(levels);
  const profile = raw == null ? null : round2(raw);
  const score = args.snapshot.score;
  const position = positionFor(score ?? 0);
  const facets: FacetView[] = present.map((facet) => {
    const level = levels[facet]!;
    const weight = FACET_WEIGHTS[facet] / totalWeight;
    return {
      key: facet,
      label: FACET_LABELS[facet],
      value: "",
      what: FACET_MEASURES[facet].what,
      source: args.source,
      points: points(level),
      level: levelOf(level),
      weight,
      contribution: Math.round(weight * level * 100),
      lowerIsBetter: facet === "durability",
      meter: pointsMeter(level),
    };
  });
  const consistency = args.snapshot.consistency;
  return {
    seed: args.seed,
    score,
    points: points(score ?? 0),
    profile,
    profilePoints: points(profile ?? 0),
    level: position.reached,
    next: position.next,
    toNext: position.toNext,
    delta4w: null,
    facets,
    missing: FACETS.filter((facet) => levels[facet] == null),
    consistency:
      consistency == null
        ? null
        : {
            value: consistency,
            factor: consistencyFactor(consistency),
            hitWeeks: null,
            weeks: CONSISTENCY_WEEKS,
            streak: null,
            compliance: null,
            normHours: null,
            normSource: null,
          },
  };
}

/**
 * Het ZWB-gemiddelde: per facet het gemiddelde niveau van wie dat facet heeft, de
 * gemiddelde score en consistentie, over de laatste snapshot per lid. Anoniem en
 * pas vanaf MIN_FOR_AVERAGE leden met een score; anders null.
 */
export function clubAverage(latest: StoredSnapshot[]): (StoredSnapshot & { members: number }) | null {
  const scored = latest.filter((snapshot) => snapshot.score != null);
  if (scored.length < MIN_FOR_AVERAGE) return null;
  const mean = (values: number[]) => (values.length === 0 ? null : round2(values.reduce((sum, value) => sum + value, 0) / values.length));
  const facets = Object.fromEntries(
    FACETS.map((facet) => [
      facet,
      mean(scored.map((snapshot) => snapshot.facets[facet]).filter((value): value is number => value != null)),
    ]),
  ) as Record<Facet, number | null>;
  const consistencies = scored.map((snapshot) => snapshot.consistency).filter((value): value is number => value != null);
  return {
    week: scored.map((snapshot) => snapshot.week).sort().at(-1)!,
    score: mean(scored.map((snapshot) => snapshot.score!)),
    facets,
    consistency: mean(consistencies),
    members: scored.length,
  };
}
