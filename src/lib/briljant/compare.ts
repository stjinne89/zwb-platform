// ZWBriljant in de tijd en naast anderen: een steen uit een opgeslagen snapshot,
// de week bij een gekozen datum en het ZWB-gemiddelde. Puur; de server levert de
// snapshots. Een snapshot bewaart alleen niveaus, geen metingen: een steen uit het
// verleden of van een ander toont dus punten en klassen. Voor je eigen stenen
// rekenen we de meting terug uit het niveau (de schaal is recht tussen de
// ijkwaarden); van anderen bewust niet, want leden zien elkaars metingen niet.

import { CONSISTENCY_WEEKS, FACETS, FACET_LABELS, FACET_MEASURES, consistencyFactor, points, positionFor, profileScore, scoreFor, type Facet } from "./score";
import { FACET_WEIGHTS, LEVELS, levelOf } from "./norms";
import type { Sex } from "./norms";
import { formatMeasure, meterFor, readingFromLevel, type BriljantView, type FacetMeter, type FacetView } from "./view";

export type StoredSnapshot = {
  week: string;
  score: number | null;
  facets: Partial<Record<Facet, number | null>>;
  consistency: number | null;
};

/**
 * De score van een bewaarde snapshot, opnieuw uit de niveaus en de consistentie:
 * zo telt een rij van vóór de optelling (2026-10-22) ook als optelling, zonder dat
 * de rij herschreven hoeft te worden.
 */
export function storedScore(facets: StoredSnapshot["facets"], consistency: number | null): number | null {
  const levels = Object.fromEntries(FACETS.map((facet) => [facet, facets[facet] ?? null])) as Record<Facet, number | null>;
  return scoreFor(levels, consistency);
}

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
    return { share: 1, from: `${reached.n * 100} punten`, to: "", fromLevel: reached, toLevel: null, note: `${reached.name}: de score telt door` };
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

/**
 * Een steen uit een snapshot, voor een week uit het verleden of een ander lid. Met
 * `sex` (alleen voor je eigen steen) komen de metingen terug, met de balk tussen de
 * grenzen van de klassen; zonder alleen punten.
 */
export function viewFromSnapshot(args: {
  seed: string;
  snapshot: StoredSnapshot;
  source: string;
  own?: { sex: Sex | null };
}): BriljantView {
  const levels = Object.fromEntries(FACETS.map((facet) => [facet, args.snapshot.facets[facet] ?? null])) as Record<Facet, number | null>;
  const present = FACETS.filter((facet) => levels[facet] != null);
  const raw = profileScore(levels);
  const profile = raw == null ? null : round2(raw);
  const score = args.snapshot.score;
  const position = positionFor(score ?? 0);
  const facets: FacetView[] = present.map((facet) => {
    const level = levels[facet]!;
    const weight = FACET_WEIGHTS[facet];
    const reading = args.own ? readingFromLevel(facet, level, args.own.sex) : null;
    return {
      key: facet,
      label: FACET_LABELS[facet],
      value: reading ? formatMeasure(facet, reading.value) : "",
      what: FACET_MEASURES[facet].what,
      source: args.source,
      points: points(level),
      level: levelOf(level),
      weight,
      contribution: Math.round(weight * level * 100),
      lowerIsBetter: facet === "durability",
      meter: reading ? meterFor(facet, reading) : pointsMeter(level),
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
            norm: null,
            measure: null,
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

// ── Vergelijken in woorden ──────────────────────────────────────────────────

/** Zo veel punten verschil op een onderdeel is nog gelijk op. */
export const EVEN_POINTS = 30;
/** Zo veel zinnen hooguit: de grootste verschillen. */
const MAX_LINES = 3;

type Mate = "iets" | "een stuk" | "veel";
const mateOf = (difference: number): Mate => (difference >= 200 ? "veel" : difference >= 100 ? "een stuk" : "iets");
/** Voor een bijvoeglijk naamwoord: "een veel betere sprinter". */
const BETTER: Record<Mate, string> = { iets: "net iets", "een stuk": "flink", veel: "veel" };

/**
 * Per onderdeel een zin als de ander (`n`) beter is en een als jij beter bent. Wat
 * het onderdeel in een rit betekent, niet het getal: dat staat al op de steen.
 */
const LINES: Record<Facet, { theirs: (n: string, mate: Mate) => string; mine: (n: string, mate: Mate) => string }> = {
  sprint: {
    theirs: (n, mate) => `${n} is een ${BETTER[mate]} betere sprinter dan jij: een bordjessprint winnen wordt lastig.`,
    mine: (n, mate) => `Jij bent een ${BETTER[mate]} betere sprinter dan ${n}: de bordjessprint is voor jou.`,
  },
  anaeroob: {
    theirs: (n, mate) => (mate === "iets" ? `Als ${n} aanvalt, moet je even diep.` : `Als ${n} aanvalt, kom je moeilijk mee.`),
    mine: (n, mate) => (mate === "iets" ? `Met een aanval zet jij ${n} onder druk.` : `Met een aanval rijd jij ${n} los.`),
  },
  vo2max: {
    theirs: (n, mate) => (mate === "iets" ? `Op een korte klim komt ${n} net voor je boven.` : `Op een korte klim rijdt ${n} bij je weg.`),
    mine: (n, mate) => (mate === "iets" ? `Op een korte klim kom jij net voor ${n} boven.` : `Op een korte klim rijd jij ${n} uit het wiel.`),
  },
  drempel: {
    theirs: (n, mate) =>
      mate === "iets" ? `Samen de Alpe op? Dan komt ${n} net iets eerder boven.` : `Als jullie samen de Alpe op rijden, kun jij ${n} niet bijhouden.`,
    mine: (n, mate) =>
      mate === "iets" ? `Samen de Alpe op? Dan kom jij net iets eerder boven.` : `Als jullie samen de Alpe op rijden, kan ${n} jou niet bijhouden.`,
  },
  durability: {
    theirs: (n, mate) => `${n} houdt na een lange rit ${mate} meer over: in de finale ben jij eerder leeg.`,
    mine: (n, mate) => `Jij houdt na een lange rit ${mate} meer over dan ${n}: in de finale heb jij nog wat.`,
  },
  fitheid: {
    theirs: (n, mate) => `${n} traint op dit moment ${mate} meer dan jij.`,
    mine: (n, mate) => `Jij traint op dit moment ${mate} meer dan ${n}.`,
  },
  racen: {
    theirs: (n, mate) => (mate === "iets" ? `In een race eindigt ${n} vaak net voor je.` : `In een race eindigt ${n} meestal voor je.`),
    mine: (n, mate) => (mate === "iets" ? `In een race eindig jij vaak net voor ${n}.` : `In een race eindig jij meestal voor ${n}.`),
  },
};

const capitalize = (line: string) => line.charAt(0).toUpperCase() + line.slice(1);

/**
 * Korte zinnen bij het vergelijken met een ander (`name`, zoals in een zin: "Piet",
 * "het gemiddelde ZWB-lid"): de grootste verschillen per onderdeel, vanaf
 * EVEN_POINTS punten. Alleen onderdelen die jullie allebei hebben. Zonder groot
 * verschil één zin dat jullie aan elkaar gewaagd zijn.
 */
export function compareLines(mine: BriljantView, theirs: BriljantView, name: string): string[] {
  const own = new Map(mine.facets.map((facet) => [facet.key, facet.points]));
  const differences = theirs.facets
    .filter((facet) => own.has(facet.key))
    .map((facet) => ({ key: facet.key, difference: facet.points - own.get(facet.key)! }))
    .filter((entry) => Math.abs(entry.difference) >= EVEN_POINTS)
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
    .slice(0, MAX_LINES);
  if (differences.length === 0) {
    return own.size > 0 && theirs.facets.some((facet) => own.has(facet.key))
      ? [capitalize(`${name} en jij zijn aan elkaar gewaagd.`)]
      : [];
  }
  return differences.map(({ key, difference }) => {
    const mate = mateOf(Math.abs(difference));
    return capitalize(difference > 0 ? LINES[key].theirs(name, mate) : LINES[key].mine(name, mate));
  });
}
