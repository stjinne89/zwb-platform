// Live stand van een ladderrace: de volgorde bij elke sprint, KOM en
// rondestreep, en daarna de finish. Puur: geen I/O; live-load.ts laadt.
//
// De ladder telt alleen de finish, 10‥1 punt over de tien renners (briefing.ts).
// Onderweg is er dus geen telling. Daarom per punt een tussenstand: de punten
// alsof de race daar eindigde. Zwift geeft de passages van iedereen over elk
// segment (dezelfde bron als de live ZRL-stand), niet de plek tussen twee punten
// in; daarvoor is er ZWB DS.

import { LADDER_POINTS, ladderWins } from "./briefing";
import { cleanRiderName } from "@/lib/race-briefing/field";
import { racePassages, routePasses, type Passage, type RouteSegment } from "@/lib/zrl-live/scoring";

/** Zoals FINISH_MARGIN_MS in zrl-live/snapshot.ts: ligt een boog op de finishlijn, dan stempelt Zwift die net na de finish. */
const FINISH_MARGIN_MS = 10 * 1000;

/** Vanaf een kwartier voor de start tot drie uur erna; daarna geldt de uitslag van de ladder. */
export const LADDER_LIVE_LEAD_MS = 15 * 60 * 1000;
export const LADDER_LIVE_AFTER_MS = 3 * 60 * 60 * 1000;

export function inLadderLiveWindow(startAt: number, now: number = Date.now()): boolean {
  return now >= startAt - LADDER_LIVE_LEAD_MS && now <= startAt + LADDER_LIVE_AFTER_MS;
}

export type LadderLiveRider = { zwiftId: number; name: string; own: boolean };

/**
 * Wie bij ons rijdt: de aanmeldingen van de ladder voor deze wedstrijd gaan
 * voor, dan de leden van het team, dan de clubtag in de Zwift-naam. Wie geen
 * van drieën heeft, rijdt bij de tegenstander: in een ladderrace staan alleen
 * de twee ploegen in het Zwift-event.
 */
export function splitLadderRiders(
  entrants: Array<{ zwiftId: string; name: string }>,
  known: { ours: Set<number>; theirs: Set<number>; members: Set<number> },
  isClubRider: (zwiftName: string) => boolean,
): LadderLiveRider[] {
  return entrants.flatMap((entrant) => {
    const zwiftId = Number(entrant.zwiftId);
    if (!Number.isSafeInteger(zwiftId) || zwiftId <= 0) return [];
    const own = known.ours.has(zwiftId)
      ? true
      : known.theirs.has(zwiftId)
        ? false
        : known.members.has(zwiftId) || isClubRider(entrant.name);
    return [{ zwiftId, name: cleanRiderName(entrant.name), own }];
  });
}

export type LadderLiveInput = {
  riders: LadderLiveRider[];
  route: RouteSegment[];
  passages: Passage[];
  /** Unix-ms van de start. */
  startAt: number;
  /** Zwift-uitslag; `durationMs` vanaf de start. */
  results: Array<{ zwiftId: number; durationMs: number | null }>;
  /** De uitslag is compleet: wie dan niet binnen is, krijgt geen punten. */
  final: boolean;
  /** Wij dagen uit (gelijk is verlies), zij dagen uit, of onbekend. */
  challenger: boolean | null;
};

export type LadderLivePlace = LadderLiveRider & {
  /** Plek in deze stand; null voor wie nog nergens langs is. */
  place: number | null;
  points: number;
  /** Achterstand op de eerste over dit punt (ms); null als de renner er (nog) niet langs is. */
  gapMs: number | null;
};

export type LadderLiveScore = {
  ours: number;
  theirs: number;
  /** Winnen wij met deze stand; null als niet bekend is wie uitdaagt en het gelijk staat. */
  win: boolean | null;
};

export type LadderLiveCheckpoint = {
  /** Volgorde in de race, vanaf 0. */
  index: number;
  kind: "segment" | "finish";
  /** "Itza KOM", "Stoneway Sprint Reverse 2" of "Finish". */
  name: string;
  /** Wanneer de eerste renner hier langskwam, in ms na de start. */
  leaderMs: number;
  /** Zoveel renners zijn hier langs (bij de finish: binnen). */
  passed: number;
  places: LadderLivePlace[];
  score: LadderLiveScore;
};

export type LadderLive = {
  /** Wie over minstens één punt kwam of binnen is. */
  starters: number;
  finished: number;
  final: boolean;
  /** In rijvolgorde, de finish als laatste; alleen punten waar iemand langs is. */
  checkpoints: LadderLiveCheckpoint[];
  /** De laatste stand; null zolang niemand ergens langs is. */
  current: LadderLiveCheckpoint | null;
};

type Crossing = { zwiftId: number; ts: number };
type Point = { kind: "segment" | "finish"; name: string; crossings: Crossing[] };

export function scoreOf(places: LadderLivePlace[], challenger: boolean | null): LadderLiveScore {
  let ours = 0;
  let theirs = 0;
  for (const place of places) {
    if (place.own) ours += place.points;
    else theirs += place.points;
  }
  const win = challenger === null ? (ours === theirs ? null : ours > theirs) : ladderWins(ours, theirs, challenger);
  return { ours, theirs, win };
}

/** Een rij in de stand van de stream-overlay: een ploeg met de score, of een renner met zijn punten. */
export type LadderOverlayRow = {
  key: string;
  kind: "team" | "rider";
  rank: number;
  label: string;
  value: number;
  own: boolean;
};

/**
 * De stand voor de stream-overlay: eerst beide ploegen met de score (de
 * winnaar bovenaan), dan de renners op volgorde bij het laatste punt, samen
 * hooguit `limit` rijen. Leeg zolang niemand ergens langs is.
 */
export function ladderOverlayRows(
  input: { ours: string; theirs: string; live: LadderLive },
  limit: number,
): LadderOverlayRow[] {
  const current = input.live.current;
  if (!current) return [];
  const { ours, theirs, win } = current.score;
  const oursFirst = win ?? ours >= theirs;
  const teams: LadderOverlayRow[] = [
    { key: "team-ours", kind: "team", rank: 0, label: input.ours, value: ours, own: true },
    { key: "team-theirs", kind: "team", rank: 0, label: input.theirs, value: theirs, own: false },
  ];
  if (!oursFirst) teams.reverse();
  teams.forEach((team, i) => (team.rank = i + 1));
  const riders: LadderOverlayRow[] = current.places.flatMap((place) =>
    place.place === null
      ? []
      : [{ key: `rider-${place.zwiftId}`, kind: "rider", rank: place.place, label: place.name, value: place.points, own: place.own }],
  );
  return [...teams, ...riders].slice(0, Math.max(2, limit));
}

/** De kleine regel boven de titel in de overlay. */
export function ladderOverlayStatus(live: LadderLive, startAt: number, fetchedAt: number): string {
  if (live.final) return "Uitslag · Club Ladder";
  if (fetchedAt < startAt) return "Begint zo · Club Ladder";
  const current = live.current;
  if (!current) return "Live · Club Ladder";
  return current.kind === "finish" ? "Live · Club Ladder · finish" : `Live · Club Ladder · na ${current.name}`;
}

export function ladderLive(input: LadderLiveInput): LadderLive {
  const riderIds = new Set(input.riders.map((rider) => rider.zwiftId));
  const results = input.results
    .filter((r): r is { zwiftId: number; durationMs: number } => r.durationMs != null && riderIds.has(r.zwiftId))
    .sort((a, b) => a.durationMs - b.durationMs);
  const finishedAt = new Map(results.map((r) => [r.zwiftId, input.startAt + r.durationMs + FINISH_MARGIN_MS]));

  const passages = racePassages({
    riders: input.riders.map((rider) => ({ athleteId: rider.zwiftId, name: rider.name, team: null })),
    passages: input.passages,
    startAt: input.startAt,
    finishedAt,
  });
  const passes = routePasses(input.route, passages);
  const repeated = (segmentId: string) => input.route.filter((segment) => segment.segmentId === segmentId).length > 1;

  // Op het moment dat de eerste erlangs kwam: zo staat de volgorde ook goed als
  // de routetabel en de echte route niet gelijk lopen.
  const finishLeader = results.length > 0 ? input.startAt + results[0].durationMs : null;
  const segments: Point[] = passes
    .filter((pass) => pass.crossings.length > 0)
    // Een boog op de finishlijn is dezelfde stand als de finish (Mayan
    // Mountainside KOM in de ladderrace van 2026-11-25).
    .filter((pass) => finishLeader === null || Math.abs(pass.crossings[0].ts - finishLeader) > FINISH_MARGIN_MS)
    .sort((a, b) => a.crossings[0].ts - b.crossings[0].ts)
    .map((pass) => ({
      kind: "segment",
      name: repeated(pass.segmentId) ? `${pass.name} ${pass.lap}` : pass.name,
      crossings: pass.crossings.map((c) => ({ zwiftId: c.athleteId, ts: c.ts })),
    }));
  const points: Point[] = finishLeader !== null
    ? [...segments, { kind: "finish", name: "Finish", crossings: results.map((r) => ({ zwiftId: r.zwiftId, ts: input.startAt + r.durationMs })) }]
    : segments;

  const byName = (a: LadderLiveRider, b: LadderLiveRider) => a.name.localeCompare(b.name, "nl");
  const checkpoints = points.map((point, index): LadderLiveCheckpoint => {
    // Per renner het verste punt tot en met dit punt, en wanneer hij daar was.
    const reached = new Map<number, { index: number; ts: number }>();
    for (let i = 0; i <= index; i++) {
      for (const crossing of points[i].crossings) reached.set(crossing.zwiftId, { index: i, ts: crossing.ts });
    }
    const order = [...input.riders].sort((a, b) => {
      const ra = reached.get(a.zwiftId);
      const rb = reached.get(b.zwiftId);
      if (!ra || !rb) return ra ? -1 : rb ? 1 : byName(a, b);
      return rb.index - ra.index || ra.ts - rb.ts || byName(a, b);
    });
    const leaderTs = point.crossings[0].ts;
    const here = new Map(point.crossings.map((c) => [c.zwiftId, c.ts]));
    const finish = point.kind === "finish";
    let place = 0;
    const places = order.map((rider): LadderLivePlace => {
      if (!reached.has(rider.zwiftId)) return { ...rider, place: null, points: 0, gapMs: null };
      place += 1;
      // Na een complete uitslag telt wie niet binnen is niet mee.
      const out = finish && input.final && !here.has(rider.zwiftId);
      const ts = here.get(rider.zwiftId);
      return {
        ...rider,
        place,
        points: out ? 0 : (LADDER_POINTS[place - 1] ?? 0),
        gapMs: ts === undefined ? null : ts - leaderTs,
      };
    });
    return {
      index,
      kind: point.kind,
      name: point.name,
      leaderMs: leaderTs - input.startAt,
      passed: point.crossings.length,
      places,
      score: scoreOf(places, input.challenger),
    };
  });

  const started = new Set(points.flatMap((point) => point.crossings.map((c) => c.zwiftId)));
  return {
    starters: started.size,
    finished: results.length,
    final: input.final,
    checkpoints,
    current: checkpoints.at(-1) ?? null,
  };
}
