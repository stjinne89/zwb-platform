// WTRL-telling voor een ZRL-race, live uit Zwift-segmentpassages en -uitslag.
//
// Regels (wtrl.racing/zrl/resources, gelezen 2026-09-22 en 2026-09-29):
// - Puntenrace en Race of Truth:
//   - FAL: per passage krijgt de eerste het aantal starters, dan telkens 1 minder.
//   - FTS: per segment over de hele race de top 10 snelste tijden,
//     15-12-10-8-6-5-4-3-2-1; één renner kan meerdere keren scoren.
//   - FIN: de eerste finisher krijgt het aantal starters, aflopend.
//   - Podium: 10-8-6-4-2 voor de eerste vijf.
//   - DNF/DQ: punten vervallen en schuiven niet door.
// - Scratch: alleen FIN en podium. Segmentpassages tellen dan alleen nog om de
//   starters te bepalen.
// - Ploegentijdrit: geen rennerspunten. De teamtijd is die van de vierde renner
//   over de streep; met minder dan vier finishers geen tijd en geen leaguepunten.
// - Teamvolgorde (punten en scratch): eerst teams met vier of meer starters, dan
//   met drie; met minder dan drie geen leaguepunten. Daarbinnen totaal, FIN, FAL,
//   FTS en de tijd van de eerste renner van het team.
// - Leaguepunten: de winnaar krijgt het aantal gestarte teams, dan telkens 1 minder.
//
// Puur: geen I/O. Tot de uitslag definitief is, is alles voorlopig: FTS kan nog
// verschuiven en wie niet finisht, verliest zijn punten. De officiële
// WTRL-uitslag blijft leidend.

export const FTS_POINTS = [15, 12, 10, 8, 6, 5, 4, 3, 2, 1];
export const PODIUM_POINTS = [10, 8, 6, 4, 2];

/** Van de vierde renner over de streep telt de tijd in een ploegentijdrit. */
export const TTT_RIDERS = 4;
/** Zoveel starters voor volle leaguepunten; met één minder achteraan, daaronder niets. */
export const FULL_TEAM_STARTERS = 4;

/** Puntenrace (ook Race of Truth), scratch of ploegentijdrit. */
export type ZrlScoringFormat = "points" | "scratch" | "ttt";

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
  /** Finishtijd per renner in ms vanaf de eigen start (in een TTT de eigen startrij). */
  times?: Map<number, number>;
};

export type ScoreInput = {
  /** Standaard een puntenrace. */
  format?: ZrlScoringFormat;
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
  /** Finishtijd in ms vanaf de eigen start, of null zonder finish. */
  time: number | null;
  /** Punten vervallen: niet gefinisht terwijl de uitslag definitief is. */
  void: boolean;
};

export type TeamScore = {
  team: string;
  total: number;
  /** Gestarte renners van dit team. */
  riders: number;
  finishers: number;
  /** TTT: tijd van de vierde renner (ms), anders null. */
  time: number | null;
  rank: number;
  /** 0 bij te weinig starters, of in een TTT zonder vier finishers. */
  league: number;
};

export type ScoreResult = {
  format: ZrlScoringFormat;
  starters: number;
  final: boolean;
  passes: ScoredPass[];
  riders: RiderScore[];
  teams: TeamScore[];
};

export function scoreRace(input: ScoreInput): ScoreResult {
  const format = input.format ?? "points";
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

  if (format === "points") {
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
  }

  const finishers = (input.finish?.finishers ?? []).filter((id) => riderById.has(id));
  if (format !== "ttt") {
    finishers.forEach((id, i) => {
      add(id, "fin", Math.max(n - i, 0));
      if (i < PODIUM_POINTS.length) add(id, "podium", PODIUM_POINTS[i]);
    });
  }

  const final = Boolean(input.finish?.final);
  const finished = new Set(finishers);
  const times = input.finish?.times ?? new Map<number, number>();
  const riders: RiderScore[] = [...starters].map((athleteId) => {
    const rider = riderById.get(athleteId) as Rider;
    const s = score.get(athleteId) ?? { fal: 0, fts: 0, fin: 0, podium: 0 };
    const isVoid = final && !finished.has(athleteId);
    return {
      ...rider,
      ...s,
      total: isVoid ? 0 : s.fal + s.fts + s.fin + s.podium,
      time: finished.has(athleteId) ? (times.get(athleteId) ?? null) : null,
      void: isVoid,
    };
  });
  if (format === "ttt") {
    riders.sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity) || a.name.localeCompare(b.name));
  } else {
    riders.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }

  return { format, starters: n, final, passes, riders, teams: rankTeams(format, riders) };
}

type TeamTally = TeamScore & { fin: number; fal: number; fts: number; first: number; times: number[] };

function rankTeams(format: ZrlScoringFormat, riders: RiderScore[]): TeamScore[] {
  const byTeam = new Map<string, TeamTally>();
  for (const rider of riders) {
    if (!rider.team) continue;
    const team = byTeam.get(rider.team) ?? {
      team: rider.team, total: 0, riders: 0, finishers: 0, time: null, rank: 0, league: 0,
      fin: 0, fal: 0, fts: 0, first: Infinity, times: [],
    };
    team.total += rider.total;
    team.riders += 1;
    if (!rider.void) {
      team.fin += rider.fin;
      team.fal += rider.fal;
      team.fts += rider.fts;
    }
    if (rider.time !== null) {
      team.finishers += 1;
      team.times.push(rider.time);
      team.first = Math.min(team.first, rider.time);
    }
    byTeam.set(rider.team, team);
  }
  const teams = [...byTeam.values()];

  // Volgorde volgens WTRL; `scores` zegt of een team leaguepunten kan krijgen.
  let keys: (team: TeamTally) => number[];
  let scores: (team: TeamTally) => boolean;
  if (format === "ttt") {
    for (const team of teams) {
      team.times.sort((a, b) => a - b);
      team.time = team.times.length >= TTT_RIDERS ? team.times[TTT_RIDERS - 1] : null;
    }
    keys = (t) => [t.time ?? Infinity, -t.finishers];
    scores = (t) => t.time !== null;
  } else {
    const tier = (t: TeamTally) => (t.riders >= FULL_TEAM_STARTERS ? 0 : t.riders === FULL_TEAM_STARTERS - 1 ? 1 : 2);
    keys = (t) => [tier(t), -t.total, -t.fin, -t.fal, -t.fts, t.first];
    scores = (t) => tier(t) < 2;
  }
  const compare = (a: TeamTally, b: TeamTally) => {
    const ka = keys(a);
    const kb = keys(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
    return 0;
  };
  teams.sort((a, b) => compare(a, b) || a.team.localeCompare(b.team));
  teams.forEach((team, i) => {
    team.rank = i > 0 && compare(teams[i - 1], team) === 0 ? teams[i - 1].rank : i + 1;
    team.league = scores(team) ? teams.length - team.rank + 1 : 0;
  });
  return teams.map(({ team, total, riders, finishers, time, rank, league }) => ({
    team, total, riders, finishers, time, rank, league,
  }));
}
