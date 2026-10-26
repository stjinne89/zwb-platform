// ZWBriljant in de tijd en naast anderen: een steen uit een opgeslagen snapshot,
// de week bij een gekozen datum en het ZWB-gemiddelde. Puur; de server levert de
// snapshots. Een snapshot bewaart alleen niveaus, geen metingen: een steen uit het
// verleden of van een ander toont dus punten en klassen. Voor je eigen stenen
// rekenen we de meting terug uit het niveau (de schaal is recht tussen de
// ijkwaarden); van anderen bewust niet, want leden zien elkaars metingen niet.

import { FACETS, FACET_LABELS, FACET_MEASURES, points, positionFor, profileScore, scoreFor, type Facet } from "./score";
import { FACET_WEIGHTS, LEVELS, levelOf } from "./norms";
import type { Sex } from "./norms";
import { formatMeasure, meterFor, readingFromLevel, storedConsistencyView, type BriljantView, type FacetMeter, type FacetView } from "./view";

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
    consistency: storedConsistencyView(consistency),
  };
}

/**
 * Het ZWB-gemiddelde: per facet het gemiddelde niveau van wie dat facet heeft, de
 * gemiddelde score en consistentie, over de laatste snapshot per lid. Anoniem en
 * pas vanaf MIN_FOR_AVERAGE leden met een score; anders null. Een facet dat minder
 * dan MIN_FOR_AVERAGE leden hebben, blijft leeg: anders toont het gemiddelde van
 * één lid diens niveau (sinds 2026-10-22).
 */
export function clubAverage(latest: StoredSnapshot[]): (StoredSnapshot & { members: number }) | null {
  const scored = latest.filter((snapshot) => snapshot.score != null);
  if (scored.length < MIN_FOR_AVERAGE) return null;
  const mean = (values: number[]) => (values.length === 0 ? null : round2(values.reduce((sum, value) => sum + value, 0) / values.length));
  const facets = Object.fromEntries(
    FACETS.map((facet) => {
      const values = scored.map((snapshot) => snapshot.facets[facet]).filter((value): value is number => value != null);
      return [facet, values.length < MIN_FOR_AVERAGE ? null : mean(values)];
    }),
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

/** Het gemiddelde van iedereen, en apart van mannen en van vrouwen. */
export type AverageGroup = "zwb" | "man" | "vrouw";

/**
 * Het ZWB-gemiddelde en het gemiddelde per opgegeven geslacht, elk met dezelfde
 * grens als clubAverage. Wie geen geslacht opgaf, telt alleen mee voor "zwb".
 */
export function clubAverages(
  latest: Array<StoredSnapshot & { sex: Sex | null }>,
): Record<AverageGroup, (StoredSnapshot & { members: number }) | null> {
  const strip = (rows: typeof latest): StoredSnapshot[] =>
    rows.map(({ week, score, facets, consistency }) => ({ week, score, facets, consistency }));
  return {
    zwb: clubAverage(strip(latest)),
    man: clubAverage(strip(latest.filter((row) => row.sex === "man"))),
    vrouw: clubAverage(strip(latest.filter((row) => row.sex === "vrouw"))),
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
 * Wie er in een zin staat: een naam ("Piet", "het gemiddelde ZWB-lid") of jij.
 * Zo werken de zinnen voor jij tegen een ander en voor twee anderen tegen elkaar.
 */
type Person = { name: string; you: boolean };
const who = (person: Person) => (person.you ? "jij" : person.name);
const whom = (person: Person) => (person.you ? "jou" : person.name);
/** Een werkwoord na het onderwerp of erachter: "Piet komt", "kom jij", "Jij bent". */
const is = (person: Person) => (person.you ? "bent" : "is");
const after = (person: Person, third: string, you: string) => (person.you ? `${you} jij` : `${third} ${person.name}`);

/**
 * Per onderdeel de zin bij `w` (beter) tegen `l`: wat het onderdeel in een rit
 * betekent, niet het getal, want dat staat al op de steen.
 */
const LINES: Record<Facet, (w: Person, l: Person, mate: Mate) => string> = {
  sprint: (w, l, mate) =>
    `${who(w)} ${is(w)} een ${BETTER[mate]} betere sprinter dan ${who(l)}: ` +
    (l.you ? "een bordjessprint winnen wordt lastig." : `de bordjessprint is voor ${whom(w)}.`),
  anaeroob: (w, l, mate) =>
    mate === "iets"
      ? `Als ${who(w)} aanvalt, moet ${who(l)} even diep.`
      : `Als ${who(w)} aanvalt, ${after(l, "komt", "kom")} moeilijk mee.`,
  vo2max: (w, l, mate) =>
    mate === "iets"
      ? `Op een korte klim ${after(w, "komt", "kom")} net voor ${whom(l)} boven.`
      : `Op een korte klim ${after(w, "rijdt", "rijd")} bij ${l.you ? "je" : l.name} weg.`,
  drempel: (w, l, mate) =>
    mate === "iets"
      ? `Samen de Alpe op? Dan ${after(w, "komt", "kom")} net iets eerder boven.`
      : `Als ${w.you || l.you ? "jullie" : "ze"} samen de Alpe op rijden, ${after(l, "kan", "kun")} ${whom(w)} niet bijhouden.`,
  durability: (w, l, mate) =>
    `${who(w)} houdt na een lange rit ${mate} meer over dan ${who(l)}: in de finale ${after(l, "is", "ben")} eerder leeg.`,
  fitheid: (w, l, mate) => `${who(w)} traint op dit moment ${mate} meer dan ${who(l)}.`,
  racen: (w, l, mate) => `In een race ${after(w, "eindigt", "eindig")} ${mate === "iets" ? "vaak net" : "meestal"} voor ${whom(l)}.`,
};

const capitalize = (line: string) => line.charAt(0).toUpperCase() + line.slice(1);

/**
 * Korte zinnen bij het vergelijken van twee stenen: de grootste verschillen per
 * onderdeel, vanaf EVEN_POINTS punten. Een naam is zoals in een zin ("Piet", "het
 * gemiddelde ZWB-lid"); null is jij. Alleen onderdelen die ze allebei hebben.
 * Zonder groot verschil één zin dat ze aan elkaar gewaagd zijn.
 */
export function compareLines(a: BriljantView, b: BriljantView, aName: string | null, bName: string | null): string[] {
  const first: Person = { name: aName ?? "", you: aName == null };
  const second: Person = { name: bName ?? "", you: bName == null };
  const own = new Map(a.facets.map((facet) => [facet.key, facet.points]));
  const shared = b.facets.filter((facet) => own.has(facet.key));
  const differences = shared
    .map((facet) => ({ key: facet.key, difference: facet.points - own.get(facet.key)! }))
    .filter((entry) => Math.abs(entry.difference) >= EVEN_POINTS)
    .sort((x, y) => Math.abs(y.difference) - Math.abs(x.difference))
    .slice(0, MAX_LINES);
  if (differences.length === 0) {
    // "Piet en jij": jij achteraan.
    const pair = first.you ? [second, first] : [first, second];
    return shared.length > 0 ? [capitalize(`${who(pair[0])} en ${who(pair[1])} zijn aan elkaar gewaagd.`)] : [];
  }
  return differences.map(({ key, difference }) => {
    const mate = mateOf(Math.abs(difference));
    return capitalize(difference > 0 ? LINES[key](second, first, mate) : LINES[key](first, second, mate));
  });
}

/** ZWB Rankings: de groei over zoveel weken. */
export const GROWTH_WEEKS = 4;
/** Is de laatste steen ouder dan dit, dan doet het lid niet mee. */
const GROWTH_FRESH_WEEKS = 2;
/** Het beginpunt ligt hooguit zoveel weken voor de laatste steen. */
const GROWTH_BASE_WEEKS = 9;

export type BriljantGrowth = {
  profileId: string;
  from: number;
  to: number;
  /** In punten, zoals op de steen. */
  growth: number;
  fromWeek: string;
  toWeek: string;
};

const weeksBefore = (week: string, weeks: number) => {
  const date = new Date(`${week}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - weeks * 7);
  return date.toISOString().slice(0, 10);
};

/**
 * Wie zijn score het meest zag stijgen: per lid de laatste steen (niet ouder dan
 * twee weken voor `currentWeek`) tegen de laatste steen die minstens GROWTH_WEEKS
 * eerder ligt. De terugblik bewaart één steen per maand, dus het beginpunt mag
 * tot negen weken terug liggen. Alleen groei; wie daalde, staat er niet in.
 */
export function briljantGrowth(
  rows: Array<{ profile_id: string; week: string; facets: unknown; consistency: number | string | null }>,
  currentWeek: string,
): BriljantGrowth[] {
  const byProfile = new Map<string, Array<{ week: string; score: number }>>();
  for (const row of rows) {
    const score = storedScore(
      (row.facets ?? {}) as StoredSnapshot["facets"],
      row.consistency == null ? null : Number(row.consistency),
    );
    if (score == null) continue;
    const list = byProfile.get(row.profile_id) ?? [];
    list.push({ week: row.week, score });
    byProfile.set(row.profile_id, list);
  }

  const result: BriljantGrowth[] = [];
  for (const [profileId, list] of byProfile) {
    list.sort((a, b) => b.week.localeCompare(a.week));
    const latest = list[0];
    if (!latest || latest.week < weeksBefore(currentWeek, GROWTH_FRESH_WEEKS)) continue;
    const latestBy = weeksBefore(latest.week, GROWTH_WEEKS);
    const earliest = weeksBefore(latest.week, GROWTH_BASE_WEEKS);
    const base = list.find((point) => point.week <= latestBy && point.week >= earliest);
    if (!base) continue;
    const growth = points(latest.score) - points(base.score);
    if (growth <= 0) continue;
    result.push({ profileId, from: base.score, to: latest.score, growth, fromWeek: base.week, toWeek: latest.week });
  }
  return result.sort((a, b) => b.growth - a.growth);
}
