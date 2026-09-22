// WTRL-puntentelling voor een ZRL-puntenrace, live uit Zwift-segmentpassages.
//
// Regels (wtrl.racing/zrl/resources, gelezen 2026-09-22):
// - FAL: per passage krijgt de eerste het aantal starters, dan telkens 1 minder.
// - FTS: per segment over de hele race de top 10 snelste tijden,
//   15-12-10-8-6-5-4-3-2-1; één renner kan meerdere keren scoren.
// - FIN: de eerste finisher krijgt het aantal starters, aflopend.
// - Podium: 10-8-6-4-2 voor de eerste vijf.
// - DNF/DQ: punten vervallen en schuiven niet door.
//
// Puur: geen I/O. Tot de uitslag definitief is, is alles voorlopig: FTS kan nog
// verschuiven en wie niet finisht, verliest zijn punten. De officiële
// WTRL-uitslag blijft leidend.

export const FTS_POINTS = [15, 12, 10, 8, 6, 5, 4, 3, 2, 1];
export const PODIUM_POINTS = [10, 8, 6, 4, 2];

export type Passage = {
  id: string;
  athleteId: number;
  segmentId: string;
  /** Unix-ms van de passage. */
  ts: number;
  /** Tijd over het segment in seconden. */
  elapsed: number;
};

/** Segmenten in routevolgorde; een segment dat twee keer voorkomt, staat er twee keer. */
export type RouteSegment = { segmentId: string; name: string };

export type Rider = { athleteId: number; name: string; team: string | null };

export type Finish = {
  /** Finishers in volgorde (snelste eerst). */
  finishers: number[];
  /** Zwift heeft de uitslag definitief gemaakt. */
  final: boolean;
};

export type ScoreInput = {
  route: RouteSegment[];
  riders: Rider[];
  passages: Passage[];
  /** Passages vóór de start (opwarmen) tellen niet. */
  startAt: number;
  /** Finishmoment per renner (Unix-ms): doorfietsen na de finish telt niet. */
  finishedAt?: Map<number, number>;
  finish?: Finish | null;
};

export type Crossing = { athleteId: number; ts: number; elapsed: number; fal: number };

export type ScoredPass = {
  /** Index in de route. */
  index: number;
  segmentId: string;
  name: string;
  /** 1 bij de eerste keer dat dit segment op de route ligt, 2 bij de tweede. */
  lap: number;
  crossings: Crossing[];
};

export type RiderScore = Rider & {
  fal: number;
  fts: number;
  fin: number;
  podium: number;
  total: number;
  /** Punten vervallen: niet gefinisht terwijl de uitslag definitief is. */
  void: boolean;
};

export type TeamScore = { team: string; total: number; riders: number; rank: number };

export type ScoreResult = {
  starters: number;
  final: boolean;
  passes: ScoredPass[];
  riders: RiderScore[];
  teams: TeamScore[];
};

export function scoreRace(input: ScoreInput): ScoreResult {
  const riderById = new Map(input.riders.map((rider) => [rider.athleteId, rider]));
  const passages = input.passages
    .filter((p) => riderById.has(p.athleteId) && p.ts >= input.startAt)
    .filter((p) => p.ts <= (input.finishedAt?.get(p.athleteId) ?? Infinity))
    .sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));

  // Dezelfde passage kan in meerdere pollrondes binnenkomen.
  const seen = new Set<string>();
  const unique = passages.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));

  // Routeplekken per segment: Monceau op plek 1 en 3, bijvoorbeeld.
  const slotsBySegment = new Map<string, number[]>();
  input.route.forEach((segment, index) => {
    const slots = slotsBySegment.get(segment.segmentId) ?? [];
    slots.push(index);
    slotsBySegment.set(segment.segmentId, slots);
  });

  const passes: ScoredPass[] = input.route.map((segment, index) => ({
    index,
    segmentId: segment.segmentId,
    name: segment.name,
    lap: (slotsBySegment.get(segment.segmentId) ?? []).indexOf(index) + 1,
    crossings: [],
  }));

  const countByRiderSegment = new Map<string, number>();
  for (const p of unique) {
    const slots = slotsBySegment.get(p.segmentId);
    if (!slots) continue;
    const key = `${p.athleteId}:${p.segmentId}`;
    const nth = countByRiderSegment.get(key) ?? 0;
    countByRiderSegment.set(key, nth + 1);
    const slot = slots[nth];
    if (slot === undefined) continue; // Meer passages dan de route heeft: na de finish.
    passes[slot].crossings.push({ athleteId: p.athleteId, ts: p.ts, elapsed: p.elapsed, fal: 0 });
  }

  // Starters: wie over de startlijn ging. Live benaderd als wie minstens één
  // segment reed, aangevuld met de finishers.
  const starters = new Set<number>();
  for (const pass of passes) for (const c of pass.crossings) starters.add(c.athleteId);
  for (const id of input.finish?.finishers ?? []) if (riderById.has(id)) starters.add(id);
  const n = starters.size;

  const score = new Map<number, { fal: number; fts: number; fin: number; podium: number }>();
  const add = (id: number, kind: "fal" | "fts" | "fin" | "podium", points: number) => {
    const current = score.get(id) ?? { fal: 0, fts: 0, fin: 0, podium: 0 };
    current[kind] += points;
    score.set(id, current);
  };

  for (const pass of passes) {
    pass.crossings.forEach((crossing, i) => {
      crossing.fal = Math.max(n - i, 0);
      add(crossing.athleteId, "fal", crossing.fal);
    });
  }

  for (const segmentId of slotsBySegment.keys()) {
    const efforts = passes
      .filter((pass) => pass.segmentId === segmentId)
      .flatMap((pass) => pass.crossings)
      .sort((a, b) => a.elapsed - b.elapsed || a.ts - b.ts);
    efforts.slice(0, FTS_POINTS.length).forEach((effort, i) => add(effort.athleteId, "fts", FTS_POINTS[i]));
  }

  const finishers = (input.finish?.finishers ?? []).filter((id) => riderById.has(id));
  finishers.forEach((id, i) => {
    add(id, "fin", Math.max(n - i, 0));
    if (i < PODIUM_POINTS.length) add(id, "podium", PODIUM_POINTS[i]);
  });

  const final = Boolean(input.finish?.final);
  const finished = new Set(finishers);
  const riders: RiderScore[] = [...score].map(([athleteId, s]) => {
    const rider = riderById.get(athleteId) as Rider;
    const isVoid = final && !finished.has(athleteId);
    return { ...rider, ...s, total: isVoid ? 0 : s.fal + s.fts + s.fin + s.podium, void: isVoid };
  });
  riders.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const byTeam = new Map<string, { total: number; riders: number }>();
  for (const rider of riders) {
    if (!rider.team) continue;
    const team = byTeam.get(rider.team) ?? { total: 0, riders: 0 };
    team.total += rider.total;
    team.riders += 1;
    byTeam.set(rider.team, team);
  }
  const teams = [...byTeam]
    .map(([team, t]) => ({ team, ...t, rank: 0 }))
    .sort((a, b) => b.total - a.total || a.team.localeCompare(b.team));
  teams.forEach((team, i) => {
    team.rank = i > 0 && teams[i - 1].total === team.total ? teams[i - 1].rank : i + 1;
  });

  return { starters: n, final, passes, riders, teams };
}
