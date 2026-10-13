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
  /** TTT: tijd tussen twee startrijen in ms (Zwifts `timeGapBetweenRowsMs`). */
  rowGapMs?: number;
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

export type TeamSplit = {
  /** Meest voorkomende teamsleutel in de startrij, of "Rij 3" zonder één tag. */
  team: string;
  /** Startrij, geteld vanaf de eerste rij met renners. */
  row: number;
  /** Achterstand op de snelste ploeg op dit punt, in ms. */
  gap: number;
};

/** Tussentijd in een ploegentijdrit: de ploegen aan het einde van één segment. */
export type SplitPoint = {
  /** Index in de route. */
  index: number;
  name: string;
  lap: number;
  /** Snelste eerst; alleen ploegen waarvan de vierde renner voorbij is. */
  teams: TeamSplit[];
};

export type ScoreResult = {
  format: ZrlScoringFormat;
  starters: number;
  final: boolean;
  passes: ScoredPass[];
  riders: RiderScore[];
  teams: TeamScore[];
  /** Alleen in een ploegentijdrit, in routevolgorde. */
  splits: SplitPoint[];
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
  const deduped = passages.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  const unique = format === "ttt" && input.route.length > 0 ? dropWarmup(deduped, input.route[0].segmentId) : deduped;

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

  const splits =
    format === "ttt" ? tttSplits(passes, riderById, input.startAt, input.rowGapMs ?? DEFAULT_ROW_GAP_MS) : [];
  return { format, starters: n, final, passes, riders, teams: rankTeams(format, riders), splits };
}

/**
 * In een TTT start de laatste rij een kwartier na de groepsstart, en wie nog niet
 * aan de beurt is, rijdt soms warm over een segment van de route (gezien
 * 2026-10-13: een KOM-passage 112 s na de groepsstart, tien minuten voor de eigen
 * rij). Die passage is geen race. De race van een renner begint bij het eerste
 * segment van de route: de passage die hij samen met ploeggenoten rijdt, en
 * anders zijn laatste. Alles daarvoor vervalt. `passages` staat op tijd.
 */
function dropWarmup(passages: Passage[], firstSegmentId: string): Passage[] {
  const first = passages
    .filter((p) => p.segmentId === firstSegmentId)
    .map((p) => ({ p, entry: p.ts - p.elapsed * 1000 }))
    .sort((a, b) => a.entry - b.entry);
  const raceFrom = new Map<number, Passage>();
  const together = new Set<number>();
  first.forEach((item, i) => {
    const { p, entry } = item;
    const near = (other?: (typeof first)[number]) =>
      other !== undefined && other.p.athleteId !== p.athleteId && Math.abs(other.entry - entry) <= PACK_MS;
    const inPack = near(first[i - 1]) || near(first[i + 1]);
    if (together.has(p.athleteId) && !inPack) return;
    if (inPack && together.has(p.athleteId)) return; // De eerste keer samen telt.
    raceFrom.set(p.athleteId, p);
    if (inPack) together.add(p.athleteId);
  });
  return passages.filter((p) => {
    const start = raceFrom.get(p.athleteId);
    if (!start) return true;
    return p.segmentId === firstSegmentId ? p.ts >= start.ts : p.ts > start.ts - start.elapsed * 1000;
  });
}

const DEFAULT_ROW_GAP_MS = 60_000;
/** Renners die zo kort na elkaar het eerste segment oprijden, rijden samen. */
const PACK_MS = 3_000;
/**
 * Zoveel van een rijtijd moet de beste indeling beter passen dan de op één na
 * beste, zolang alleen het eerste segment bekend is; anders geen tussentijden.
 */
const AMBIGUITY = 1 / 3;
/**
 * Zoveel van een rijtijd mag een ploeg afwijken van wat haar tempo naar het
 * tweede segment voorspelt (gemeten 2026-10-13: goed hooguit 6 s, fout ruim 20 s).
 */
const PACE_TOLERANCE = 1 / 5;

type Pack = { entry: number; teams: Set<string>; /** Rijtijd van segment 1 naar 2, ms. */ pace: number | null };

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

/**
 * Hoe ver ligt de traagste of snelste ploeg van de lijn "wie langzamer naar het
 * tweede segment rijdt, deed ook langer over de aanloop"? Een ploeg die een rij
 * te vroeg of te laat is ingedeeld, valt daar een halve rijtijd buiten.
 */
function paceMisfit(points: Array<[pace: number, delay: number]>): number {
  const n = points.length;
  const meanPace = points.reduce((sum, [pace]) => sum + pace, 0) / n;
  const meanDelay = points.reduce((sum, [, delay]) => sum + delay, 0) / n;
  const spread = points.reduce((sum, [pace]) => sum + (pace - meanPace) ** 2, 0);
  const together = points.reduce((sum, [pace, delay]) => sum + (pace - meanPace) * (delay - meanDelay), 0);
  // Trager rijden en toch eerder bij het segment bestaat niet.
  const slope = spread > 0 ? Math.max(0, together / spread) : 0;
  return Math.max(...points.map(([pace, delay]) => Math.abs(delay - meanDelay - slope * (pace - meanPace))));
}

/**
 * Startrij per renner, ten opzichte van elkaar. Zwift geeft de startrij niet
 * door, maar ploegen starten precies één rijtijd na elkaar. Het moment waarop
 * een ploeg het eerste segment oprijdt, is dus rij × rijtijd plus de tijd over de
 * aanloop, en die laatste scheelt tussen ploegen minder dan één rijtijd (gemeten
 * 2026-10-13, Open Pink: hooguit 30 s op vier minuten). We zoeken de aanlooptijd
 * van de snelste ploeg waarbij geen twee ploegen in dezelfde rij vallen. Zodra
 * drie ploegen het tweede segment voorbij zijn, moet de indeling ook bij hun
 * tempo passen. Alleen verschillen kloppen: of de eerste ploeg in rij 0 of 1
 * stond, is hieruit niet te halen. Leeg als de rijen niet eenduidig zijn.
 */
export function tttRows(
  passes: ScoredPass[],
  riderById: Map<number, Rider>,
  startAt: number,
  rowGapMs: number,
): Map<number, number> {
  const first = passes[0];
  if (!first) return new Map();
  const second = new Map((passes[1]?.crossings ?? []).map((c) => [c.athleteId, c.ts]));
  const entries = first.crossings
    .map((c) => ({ athleteId: c.athleteId, entry: c.ts - c.elapsed * 1000 - startAt, ts: c.ts }))
    .sort((a, b) => a.entry - b.entry);
  const packs: Pack[] = [];
  let current: typeof entries = [];
  const close = () => {
    // Een eenling is een losgereden renner, geen ploeg.
    if (current.length < 2) return;
    packs.push({
      entry: current[0].entry,
      teams: new Set(current.flatMap((e) => riderById.get(e.athleteId)?.team ?? [])),
      pace: median(
        current.flatMap((e) => {
          const pace = (second.get(e.athleteId) ?? 0) - e.ts;
          return pace > 0 ? [pace] : [];
        }),
      ),
    });
  };
  for (const e of entries) {
    if (current.length && e.entry - current[current.length - 1].entry > PACK_MS) {
      close();
      current = [];
    }
    current.push(e);
  }
  close();
  if (packs.length === 0) return new Map();

  // Speling: ploeggenoten rijden het segment niet op dezelfde milliseconde op.
  const rowOf = (entry: number, lead: number) => Math.floor((entry - lead + PACK_MS) / rowGapMs);
  // Elke ploeg als mogelijke snelste; `rows` zegt welke indeling daaruit volgt.
  const options = packs.map((candidate) => {
    const lead = candidate.entry % rowGapMs;
    const packRows = packs.map((pack) => rowOf(pack.entry, lead));
    const delays = packs.map((pack, i) => pack.entry - lead - packRows[i] * rowGapMs);
    let clash = false;
    packs.forEach((pack, i) => {
      // Twee groepen in één rij mag alleen als het dezelfde ploeg kan zijn.
      for (let j = 0; j < i; j++) {
        const other = packs[j];
        if (packRows[j] !== packRows[i] || pack.teams.size === 0 || other.teams.size === 0) continue;
        if (![...pack.teams].some((team) => other.teams.has(team))) clash = true;
      }
    });
    const paced = packs.flatMap((pack, i) => (pack.pace === null ? [] : [[pack.pace, delays[i]] as [number, number]]));
    return {
      lead,
      clash,
      spread: Math.max(...delays),
      misfit: paced.length >= 3 ? paceMisfit(paced) : null,
      rows: packRows.map((row) => row - packRows[0]).join(),
    };
  });
  const fitting = options.filter((option) => !option.clash);
  let best: (typeof options)[number] | undefined;
  if (fitting.some((option) => option.misfit !== null)) {
    best = [...fitting].sort((a, b) => (a.misfit as number) - (b.misfit as number))[0];
    if ((best.misfit as number) > rowGapMs * PACE_TOLERANCE) return new Map();
  } else {
    fitting.sort((a, b) => a.spread - b.spread);
    best = fitting[0];
    if (!best) return new Map();
    // Past een andere indeling bijna even goed, dan is het gokken.
    const chosen = best;
    const rival = fitting.find((option) => option.rows !== chosen.rows);
    if (rival && rival.spread - chosen.spread < rowGapMs * AMBIGUITY) return new Map();
  }
  const lead = best.lead;
  return new Map(entries.map((e) => [e.athleteId, rowOf(e.entry, lead)]));
}

/** Meest voorkomende ploeg onder de renners van een rij; null zonder één teamtag. */
function rowTeam(athletes: number[], riderById: Map<number, Rider>): string | null {
  const counts = new Map<string, number>();
  for (const id of athletes) {
    const team = riderById.get(id)?.team;
    if (team) counts.set(team, (counts.get(team) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

/**
 * Een ploeg is hier een startrij, niet een teamtag: wie samen start, rijdt samen,
 * ook de renners zonder tag of met een andere spelling.
 */
function tttSplits(
  passes: ScoredPass[],
  riderById: Map<number, Rider>,
  startAt: number,
  rowGapMs: number,
): SplitPoint[] {
  if (passes.length === 0) return [];
  const rows = tttRows(passes, riderById, startAt, rowGapMs);
  const athletesByRow = new Map<number, number[]>();
  for (const [athleteId, row] of rows) athletesByRow.set(row, [...(athletesByRow.get(row) ?? []), athleteId]);
  const firstRow = Math.min(...athletesByRow.keys());
  const teamByRow = new Map(
    [...athletesByRow].map(([row, athletes]) => [row, rowTeam(athletes, riderById) ?? `Rij ${row - firstRow + 1}`]),
  );
  return passes.map((pass) => {
    const byRow = new Map<number, number[]>();
    for (const crossing of pass.crossings) {
      const row = rows.get(crossing.athleteId);
      if (row !== undefined) byRow.set(row, [...(byRow.get(row) ?? []), crossing.ts]);
    }
    const times = [...byRow].flatMap(([row, list]) => {
      if (list.length < TTT_RIDERS) return [];
      list.sort((a, b) => a - b);
      return [{ row, time: list[TTT_RIDERS - 1] - row * rowGapMs }];
    });
    const fastest = Math.min(...times.map((t) => t.time));
    return {
      index: pass.index,
      name: pass.name,
      lap: pass.lap,
      teams: times
        .map(({ row, time }) => ({ team: teamByRow.get(row) as string, row: row - firstRow + 1, gap: time - fastest }))
        .sort((a, b) => a.gap - b.gap || a.row - b.row),
    };
  });
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
