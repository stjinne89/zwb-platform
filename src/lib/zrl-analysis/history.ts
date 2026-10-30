// De eigen race naast eerdere races (ZWBeter racen): per sprint en klim de
// passage van vandaag tegenover de eigen eerdere passages, de eigen PR en de
// richttijd van het racebriefje, en over alle races waar de punten vandaan
// komen. Puur: geen I/O.
//
// Vraag van de eigenaar (2026-10-28): "ik had vergeleken met andere races een
// paar goede sprints en scoorde meer punten dan voorspeld." Alles komt uit de
// bewaarde Zwift-uitslagen (zrl_race_snapshots) en de PR-cache van het briefje
// (zwift_segment_bests); alleen voor de renner zelf. Uitwerking:
// docs/zrl-analyse.md, sectie "Verdieping".

import type { RaceKind } from "@/lib/zrl-analysis/personal";
import type { RaceAnalysis, RiderAnalysis, SegmentKind } from "@/lib/zrl-analysis/race";
import type { ZrlScoringFormat } from "@/lib/zrl-live/scoring";
import type { PointsSplit } from "@/lib/zrl-analysis/expectation";
import type { SegmentBest } from "@/lib/race-briefing/segment-records";

/** Eén gereden race, samengevat voor de terugblik. */
export type RaceRecord = {
  zwiftEventId: string;
  title: string;
  startAt: number;
  kind: RaceKind;
  /** Een puntenrace met FAL en FTS (ZRL). */
  points: boolean;
  place: number | null;
  finishers: number;
  expectedPlace: number | null;
  pointsSplit: PointsSplit | null;
  expectedPoints: PointsSplit | null;
  /** Puntenrace met verwachting: gescoord en verwacht per soort segment, en de finish. */
  byKind: Record<PointsSource, { scored: number; expected: number }> | null;
  /** Beste 15 s en 1 min in deze race, W/kg (uit de uitslag van Zwift). */
  best15Wkg: number | null;
  best60Wkg: number | null;
  segments: Array<{ segmentId: string; name: string; kind: SegmentKind; elapsed: number; wkg: number | null }>;
};

/** Waar punten vandaan komen: sprints, klimmen, andere segmenten en de finish (FIN plus podium). */
export type PointsSource = "sprint" | "klim" | "segment" | "finish";

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Puntenrace met verwachting: gescoord en verwacht per bron (sprints, klimmen, overige segmenten, finish). */
export function pointsBySource(rider: RiderAnalysis): RaceRecord["byKind"] {
  const expected = rider.expected;
  if (!expected?.points || !rider.pointsSplit) return null;
  const byKind: NonNullable<RaceRecord["byKind"]> = {
    sprint: { scored: 0, expected: 0 },
    klim: { scored: 0, expected: 0 },
    segment: { scored: 0, expected: 0 },
    finish: {
      scored: rider.pointsSplit.fin + rider.pointsSplit.podium,
      expected: expected.points.fin + expected.points.podium,
    },
  };
  for (const pass of expected.passes) {
    const seg = rider.segments.find((s) => s.index === pass.index);
    const kind = seg?.kind ?? "segment";
    byKind[kind].expected += pass.points;
    if (seg) byKind[kind].scored += seg.falPoints + seg.ftsPoints;
  }
  for (const value of Object.values(byKind)) value.expected = round1(value.expected);
  return byKind;
}

export function raceRecord(
  rider: RiderAnalysis,
  meta: { zwiftEventId: string; title: string; startAt: number; kind: RaceKind; finishers: number },
): RaceRecord {
  const expected = rider.expected;
  const points = Boolean(expected?.points) || (rider.pointsSplit !== null && rider.pointsSplit.fal + rider.pointsSplit.fts > 0);
  const byKind = pointsBySource(rider);
  const kg = rider.avgWatts && rider.wkg ? rider.avgWatts / rider.wkg : null;
  const wkgOf = (watts: number | null | undefined) => (watts && kg ? Math.round((watts / kg) * 100) / 100 : null);
  return {
    ...meta,
    points,
    place: rider.rank,
    expectedPlace: expected?.place ?? null,
    pointsSplit: rider.pointsSplit,
    expectedPoints: expected?.points ?? null,
    byKind,
    best15Wkg: wkgOf(rider.criticalPower?.s15),
    best60Wkg: wkgOf(rider.criticalPower?.m1),
    segments: rider.segments.map((s) => ({ segmentId: s.segmentId, name: s.name, kind: s.kind, elapsed: s.elapsed, wkg: s.wkg })),
  };
}

// ---------------------------------------------------------------------------
// Per segment: vandaag tegenover eerder, de PR en de richttijd van het briefje.

export type SegmentComparison = {
  index: number;
  name: string;
  kind: SegmentKind;
  elapsed: number;
  watts: number | null;
  wkg: number | null;
  falRank: number;
  of: number;
  /** Puntenrace: FAL plus FTS op deze passage; null in een andere race. */
  points: number | null;
  expectedFalRank: number | null;
  expectedPoints: number | null;
  /** Eigen passages over dit segment in eerdere bewaarde races. */
  earlier: { count: number; bestElapsed: number; bestWkg: number | null; medianWkg: number | null } | null;
  /** Sneller dan elke eerdere passage in een bewaarde race. */
  fastestYet: boolean;
  /** Eigen snelste passage in de 90 dagen vóór de race, uit de PR-cache van het briefje. */
  pr: { seconds: number; wkg: number | null } | null;
  /** Richttijd van het briefje: de snelste PR van het startveld vóór de race, met de watt die jij daarvoor nodig had. */
  target: { seconds: number; wkg: number | null; neededWatts: number | null } | null;
};

/** Zo vaak moet je een segment eerder gereden hebben om "je snelste" te zeggen. */
export const FASTEST_YET_MIN = 1;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

export function compareSegments(input: {
  rider: RiderAnalysis;
  raceStart: number;
  /** Gewicht in deze race, voor de watt bij de richttijd. */
  weightKg: number | null;
  /** Eerdere races van deze renner (andere races worden genegeerd). */
  history: RaceRecord[];
  /** PR's uit zwift_segment_bests, van de renner en het startveld. */
  bests: SegmentBest[];
  /** Het startveld, voor de richttijd. */
  field: number[];
}): SegmentComparison[] {
  const { rider } = input;
  const earlierRaces = input.history.filter((r) => r.startAt < input.raceStart);
  const fieldIds = new Set(input.field);
  // Alleen PR's van vóór de race: daarmee rekende het briefje.
  const before = input.bests.filter((b) => b.seconds !== null && b.at !== null && Date.parse(b.at) < input.raceStart);
  const pointsRace = Boolean(rider.expected?.points) || rider.segments.some((s) => s.falPoints > 0);
  // In een puntenrace telt elk segment op de route; anders alleen sprints en klimmen.
  return rider.segments
    .filter((s) => pointsRace || s.kind !== "segment")
    .map((s) => {
      const passes = earlierRaces.flatMap((r) => r.segments.filter((x) => x.segmentId === s.segmentId));
      const earlier = passes.length
        ? {
            count: passes.length,
            bestElapsed: Math.min(...passes.map((p) => p.elapsed)),
            bestWkg: passes.reduce<number | null>((best, p) => (p.wkg !== null && (best === null || p.wkg > best) ? p.wkg : best), null),
            medianWkg: median(passes.flatMap((p) => (p.wkg !== null ? [p.wkg] : []))),
          }
        : null;
      const own = before.find((b) => b.zwiftId === rider.athleteId && b.segmentId === s.segmentId);
      const ownWkg = own?.watts && own.weightKg ? own.watts / own.weightKg : null;
      const fastest = before
        .filter((b) => b.segmentId === s.segmentId && fieldIds.has(b.zwiftId))
        .sort((a, b) => (a.seconds as number) - (b.seconds as number))[0];
      const targetWkg = fastest?.watts && fastest.weightKg ? fastest.watts / fastest.weightKg : null;
      const expectedPass = rider.expected?.passes.find((p) => p.index === s.index);
      return {
        index: s.index,
        name: s.name,
        kind: s.kind,
        elapsed: s.elapsed,
        watts: s.watts,
        wkg: s.wkg,
        falRank: s.falRank,
        of: s.of,
        points: pointsRace ? s.falPoints + s.ftsPoints : null,
        expectedFalRank: rider.expected ? expectedPass?.falRank ?? rider.expected.place : null,
        expectedPoints: expectedPass ? round1(expectedPass.points) : null,
        earlier,
        fastestYet: earlier !== null && earlier.count >= FASTEST_YET_MIN && s.elapsed < earlier.bestElapsed,
        pr: own ? { seconds: own.seconds as number, wkg: ownWkg === null ? null : Math.round(ownWkg * 100) / 100 } : null,
        target: fastest
          ? {
              seconds: fastest.seconds as number,
              wkg: targetWkg === null ? null : Math.round(targetWkg * 100) / 100,
              neededWatts: targetWkg !== null && input.weightKg ? Math.round(targetWkg * input.weightKg) : null,
            }
          : null,
      };
    });
}

// ---------------------------------------------------------------------------
// Over alle races: waar de punten vandaan komen en hoe je eindigt tegenover je ZRS.

export type SourceTrend = {
  source: PointsSource;
  /** Puntenraces met verwachting. */
  races: number;
  /** Gemiddeld per race: gescoord min verwacht. */
  perRace: number;
  scored: number;
  expected: number;
};

export type RaceTrend = {
  races: RaceRecord[];
  /** Races met een verwachte plek. */
  placed: number;
  /** Gemiddeld zoveel plekken voor (+) of achter (−) de verwachting. */
  placeGain: number | null;
  sources: SourceTrend[];
};

export function raceTrend(records: RaceRecord[]): RaceTrend {
  const races = [...records].sort((a, b) => b.startAt - a.startAt);
  const placed = races.filter((r) => r.place !== null && r.expectedPlace !== null);
  const placeGain = placed.length
    ? round1(placed.reduce((sum, r) => sum + ((r.expectedPlace as number) - (r.place as number)), 0) / placed.length)
    : null;
  const withPoints = races.filter((r) => r.byKind !== null);
  const sources: SourceTrend[] = (["sprint", "klim", "finish", "segment"] as PointsSource[])
    .map((source) => {
      const counted = withPoints.filter((r) => source === "finish" || r.segments.some((s) => s.kind === source));
      const scored = counted.reduce((sum, r) => sum + (r.byKind as NonNullable<RaceRecord["byKind"]>)[source].scored, 0);
      const expected = counted.reduce((sum, r) => sum + (r.byKind as NonNullable<RaceRecord["byKind"]>)[source].expected, 0);
      return {
        source,
        races: counted.length,
        perRace: counted.length ? round1((scored - expected) / counted.length) : 0,
        scored,
        expected: round1(expected),
      };
    })
    .filter((s) => s.races > 0);
  return { races, placed: placed.length, placeGain, sources };
}

// ---------------------------------------------------------------------------
// De eigen race in een paar getallen, voor het weekoverzicht (eigenaar,
// 2026-10-28: "nu zegt dat vrij weinig met alleen die balken en de positie van
// de ploeg. Ook mooi als daar iets over de bijdrage van de renner staat").

export type RaceContribution = {
  format: ZrlScoringFormat;
  /** Plek in de groep en de verwachte plek op ZRS van vóór de race. */
  place: number | null;
  expectedPlace: number | null;
  finishers: number | null;
  /** Punten (puntenrace en scratch) en de verwachte punten (puntenrace). */
  points: number | null;
  expectedPoints: number | null;
  /** Jouw deel van de punten van de ploeg, in procent, en je plek daarin (1 = meeste). */
  teamShare: number | null;
  teamRank: number | null;
  teamRiders: number;
  /** Per renner van de ploeg de punten (of in een ploegentijdrit de W/kg), hoog naar laag; jij op `ownIndex`. */
  team: number[];
  ownIndex: number;
  /** Puntenrace: de bron met het grootste verschil met de verwachting. */
  standout: { source: PointsSource; diff: number } | null;
  /** Ploegentijdrit: bij de ploeg gefinisht, en je W/kg tegenover het gemiddelde van de ploeg. */
  withTeam: boolean | null;
  wkg: number | null;
  teamWkg: number | null;
};

export function raceContribution(analysis: RaceAnalysis, athleteId: number): RaceContribution | null {
  const rider = analysis.riders.find((r) => r.athleteId === athleteId);
  if (!rider) return null;
  const ttt = analysis.format === "ttt";
  const value = (r: RiderAnalysis) => (ttt ? r.wkg ?? 0 : r.points);
  const ranked = [...analysis.riders].sort((a, b) => value(b) - value(a));
  const ownIndex = ranked.indexOf(rider);
  const teamPoints = analysis.riders.reduce((sum, r) => sum + r.points, 0);
  const sources = pointsBySource(rider);
  const standout = sources
    ? (Object.entries(sources) as Array<[PointsSource, { scored: number; expected: number }]>)
        .map(([source, v]) => ({ source, diff: round1(v.scored - v.expected) }))
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0] ?? null
    : null;
  const wkgs = analysis.riders.flatMap((r) => (r.wkg !== null ? [r.wkg] : []));
  return {
    format: analysis.format,
    place: rider.rank,
    expectedPlace: rider.expected?.place ?? null,
    finishers: rider.expected?.finishers ?? null,
    points: ttt ? null : rider.points,
    expectedPoints: rider.expected?.points ? Math.round(rider.expected.points.total) : null,
    teamShare: !ttt && teamPoints > 0 ? Math.round((100 * rider.points) / teamPoints) : null,
    teamRank: ownIndex + 1,
    teamRiders: analysis.riders.length,
    team: ranked.map((r) => Math.round(value(r) * 100) / 100),
    ownIndex,
    standout: standout && standout.diff !== 0 ? standout : null,
    withTeam: ttt ? !rider.dropped : null,
    wkg: rider.wkg,
    teamWkg: wkgs.length ? Math.round((wkgs.reduce((a, b) => a + b, 0) / wkgs.length) * 100) / 100 : null,
  };
}
