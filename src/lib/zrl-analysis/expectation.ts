// Verwachting tegenover uitkomst (ZWBeter racen): waar had een renner op papier
// moeten eindigen, en hoeveel punten had dat opgeleverd? Puur: geen I/O.
//
// Vraag van de eigenaar (2026-10-28): "ik scoorde meer punten dan zwiftracing
// voor mij zou voorspeld hebben, ook vergeleken met wat het racebriefje dacht
// dat mogelijk was." Het racebriefje zet het veld op volgorde van één getal per
// renner (field.ts); zonder ZwiftRacing-sleutel is dat de ZRS. Hier dezelfde
// volgorde, maar met de ZRS van vóór de race zoals Zwift die in de uitslag
// geeft (`scoreBefore`): zo verschuift de verwachting niet als de score na de
// race verandert.
//
// De verwachte punten zijn wat de renner had gescoord als elk segment en de
// finish in die volgorde waren gereden. Dat is een meetlat, geen voorspelling:
// in een echte puntenrace kiest bijna iedereen segmenten. Het verschil per
// soort segment laat zien waar punten vandaan kwamen. Uitwerking:
// docs/zrl-analyse.md, sectie "Verdieping".

import { FTS_POINTS, PODIUM_POINTS } from "@/lib/zrl-live/scoring";

/** Zo'n deel van de starters moet een ZRS hebben, anders geen verwachting (zoals het briefje). */
export const MIN_SCORE_COVERAGE = 0.7;

export type PointsSplit = { fal: number; fts: number; fin: number; podium: number; total: number };

export type ExpectedPass = {
  index: number;
  /** Verwachte plek over de streep van dit segment (de plek in de verwachte volgorde). */
  falRank: number;
  /** Verwachte punten op dit segment: FAL plus eventueel FTS. */
  points: number;
};

export type RiderExpectation = {
  scoreBefore: number | null;
  /** Verwachte plek onder de finishers, op ZRS van vóór de race. */
  place: number;
  finishers: number;
  /** Puntenrace: de verwachte punten per soort, of null in een andere race. */
  points: PointsSplit | null;
  passes: ExpectedPass[];
};

/**
 * Plek per renner als het veld op ZRS van vóór de race was geëindigd (1 = sterkste).
 * Renners zonder score achteraan, in de volgorde van de lijst. Null als te weinig
 * renners een score hebben.
 */
export function expectedOrder(ids: number[], scores: Map<number, number | null | undefined>): Map<number, number> | null {
  if (ids.length === 0) return null;
  const known = ids.filter((id) => (scores.get(id) ?? 0) > 0);
  if (known.length / ids.length < MIN_SCORE_COVERAGE) return null;
  const order = [...ids].sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0));
  return new Map(order.map((id, i) => [id, i + 1]));
}

/**
 * FTS-punten voor een renner op plek `place` in de verwachte volgorde, als elk
 * van de `laps` passages van een segment in die volgorde wordt gereden: de
 * sterkste renner pakt dan de snelste `laps` tijden, enzovoort.
 */
function expectedFts(place: number, laps: number): number {
  let points = 0;
  for (let i = (place - 1) * laps; i < place * laps; i += 1) points += FTS_POINTS[i] ?? 0;
  return points;
}

export function riderExpectation(input: {
  athleteId: number;
  /** Puntenrace: ook verwachte punten per segment. */
  points: boolean;
  /** Wie van start ging (de stand telt FAL en FIN vanaf dit aantal). */
  starters: number[];
  /** Wie finishte, voor de verwachte plek. */
  finishers: number[];
  scores: Map<number, number | null | undefined>;
  /** De passages van de route, met het Zwift-segment voor FTS. */
  passes: Array<{ index: number; segmentId: string }>;
}): RiderExpectation | null {
  const finishOrder = expectedOrder(input.finishers, input.scores);
  const place = finishOrder?.get(input.athleteId);
  if (!finishOrder || place === undefined) return null;

  const startOrder = expectedOrder(input.starters, input.scores);
  const startPlace = startOrder?.get(input.athleteId);
  const n = input.starters.length;
  const laps = new Map<string, number>();
  for (const pass of input.passes) laps.set(pass.segmentId, (laps.get(pass.segmentId) ?? 0) + 1);

  let points: PointsSplit | null = null;
  let passes: ExpectedPass[] = [];
  if (input.points && startPlace !== undefined) {
    // FTS geldt per segment over alle ronden samen; verdeeld over de passages.
    passes = input.passes.map((pass) => {
      const count = laps.get(pass.segmentId) ?? 1;
      const fts = expectedFts(startPlace, count) / count;
      return { index: pass.index, falRank: startPlace, points: Math.max(n - startPlace + 1, 0) + fts };
    });
    const fal = passes.length * Math.max(n - startPlace + 1, 0);
    const fts = [...laps].reduce((sum, [, count]) => sum + expectedFts(startPlace, count), 0);
    const fin = Math.max(n - startPlace + 1, 0);
    const podium = PODIUM_POINTS[startPlace - 1] ?? 0;
    points = { fal, fts, fin, podium, total: fal + fts + fin + podium };
  }

  return {
    scoreBefore: input.scores.get(input.athleteId) ?? null,
    place,
    finishers: input.finishers.length,
    points,
    passes,
  };
}
