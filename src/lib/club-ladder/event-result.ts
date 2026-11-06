// Uitslag van een gereden ladderrace op de eventpagina, naast de verwachting
// (2026-11-06, vraag eigenaar). Puur: geen I/O; event-result-load.ts laadt.
//
// De verwachting rekent zoals het racebriefje (briefing.ts): sterkte op dit
// parcours, beste eerst. Alleen over wie er echt reed, zodat een wissel na de
// opstelling de vergelijking niet scheef trekt. Een renner zonder vermogen
// houdt zijn echte plek; de anderen vullen de overige plekken op sterkte.
// Het vermogen per renner is dat van vóór de start (0308), zolang het er is.

import { normalizeTeamName } from "@/lib/ladder";
import { cleanRiderName } from "@/lib/race-briefing/field";
import { LADDER_POINTS, routeRatings } from "./briefing";
import type { LadderMatchup, MatchupSignup } from "./matchup";
import type { DurationWeights } from "./routes";
import { DURATIONS, sameTeam, type MatchRider, type PowerWkg, type StoredMatch } from "./team-power";

/** Een uitslag ligt hooguit zoveel uur van de starttijd van het event. */
const MAX_OFFSET_H = 6;

export type LadderMatchCandidate = {
  result_id: number;
  raced_on: string;
  raced_at: string | null;
  challenger: string;
  opponent: string;
};

/** De gereden wedstrijd bij dit event: dezelfde twee teams, het dichtst bij de starttijd. */
export function pickEventMatch<T extends LadderMatchCandidate>(
  rows: T[],
  teams: { ours: string; opponent: string },
  startAt: string,
): T | null {
  const start = Date.parse(startAt);
  const pair = (row: T) =>
    (sameTeam(row.challenger, teams.ours) && sameTeam(row.opponent, teams.opponent)) ||
    (sameTeam(row.challenger, teams.opponent) && sameTeam(row.opponent, teams.ours));
  let best: { row: T; offset: number } | null = null;
  for (const row of rows) {
    if (!pair(row)) continue;
    const at = Date.parse(`${row.raced_on}T${(row.raced_at ?? "00:00").slice(0, 5)}:00Z`);
    const offset = Math.abs(at - start);
    if (!Number.isFinite(offset) || offset > MAX_OFFSET_H * 3600_000) continue;
    if (!best || offset < best.offset) best = { row, offset };
  }
  return best?.row ?? null;
}

export type ExpectationRider = { zwiftId: number; name: string; own: boolean; wkg: PowerWkg };

const hasPower = (wkg: PowerWkg | null | undefined): wkg is PowerWkg =>
  Boolean(wkg && DURATIONS.some((d) => wkg[d] != null && wkg[d]! > 0));

/**
 * Per renner het vermogen waarop de verwachting hem zet, zoals `ladderRiders`:
 * met gewicht omgerekend als dat in de matchup meetelt. Uit meerdere matchups
 * (de keuze per type), de eerste wint.
 */
export function expectationRiders(matchups: LadderMatchup[]): ExpectationRider[] {
  const out = new Map<number, ExpectationRider>();
  for (const matchup of matchups) {
    for (const [side, own] of [
      [matchup.ours, true],
      [matchup.theirs, false],
    ] as const) {
      for (const rider of side.riders) {
        const wkg = rider.routeWkg ?? rider.wkg;
        if (!out.has(rider.zwiftId) && hasPower(wkg)) out.set(rider.zwiftId, { zwiftId: rider.zwiftId, name: rider.name, own, wkg });
      }
    }
  }
  return [...out.values()];
}

/** Sterkte per finishplek: het vermogen van vóór de start, anders dat van nu. */
export function starterRatings(
  starters: Map<number, MatchupSignup>,
  frozen: Map<number, PowerWkg>,
  live: Map<number, PowerWkg>,
  weights: DurationWeights | null,
): Map<number, number | null> {
  const rows = [...starters].map(([position, starter]) => ({
    position,
    zwiftId: starter.zwiftId,
    wkg: frozen.get(starter.zwiftId) ?? live.get(starter.zwiftId) ?? null,
  }));
  const ratings = routeRatings(rows, weights);
  return new Map(rows.map((row) => [row.position, ratings.get(row.zwiftId) ?? null]));
}

export type LadderScoreRow = LadderMatchCandidate & { challenger_score: number; opponent_score: number };

export type TeamMatchResult = {
  resultId: number;
  /** YYYY-MM-DD (UTC). */
  racedOn: string;
  opponent: string;
  ourScore: number;
  theirScore: number;
  won: boolean;
  /** Het ladder-event van deze wedstrijd, of null (wedstrijden van vóór 0300 hebben er geen). */
  eventId: string | null;
};

/**
 * De gereden wedstrijden van een team, nieuwste eerst, met het event erbij:
 * hetzelfde team, dezelfde tegenstander, het dichtst bij de starttijd.
 */
export function ladderTeamResults(
  rows: LadderScoreRow[],
  aliases: string[],
  events: Array<{ id: string; start_at: string; opponent: string | null }>,
): TeamMatchResult[] {
  const ours = (name: string) => aliases.some((alias) => sameTeam(alias, name));
  const unique = [...new Map(rows.map((row) => [row.result_id, row])).values()].filter((row) => ours(row.challenger) || ours(row.opponent));
  const eventOf = new Map<number, string>();
  for (const event of events) {
    if (!event.opponent) continue;
    for (const alias of aliases) {
      const row = pickEventMatch(unique, { ours: alias, opponent: event.opponent }, event.start_at);
      if (row && !eventOf.has(row.result_id)) {
        eventOf.set(row.result_id, event.id);
        break;
      }
    }
  }
  return unique
    .sort((a, b) => b.raced_on.localeCompare(a.raced_on) || (b.raced_at ?? "").localeCompare(a.raced_at ?? "") || b.result_id - a.result_id)
    .map((row) => {
      const weChallenge = ours(row.challenger);
      const ourScore = weChallenge ? row.challenger_score : row.opponent_score;
      const theirScore = weChallenge ? row.opponent_score : row.challenger_score;
      return {
        resultId: row.result_id,
        racedOn: row.raced_on,
        opponent: weChallenge ? row.opponent : row.challenger,
        ourScore,
        theirScore,
        // Bij gelijke stand verliest de uitdager (race book).
        won: ourScore > theirScore || (ourScore === theirScore && !weChallenge),
        eventId: eventOf.get(row.result_id) ?? null,
      };
    });
}

const nameKey = (name: string) => cleanRiderName(name).toLocaleLowerCase("nl");

/**
 * Wie er reed, als aanmelding voor de matchup: met Zwift-ID uit de uitslag, en
 * anders op naam uit de aanmeldingen van de ladder. Per finishplek, want zonder
 * Zwift-ID is dat de enige vaste sleutel.
 */
export function startersFromResult(riders: MatchRider[], signups: MatchupSignup[]): Map<number, MatchupSignup> {
  const byName = new Map<string, MatchupSignup>();
  for (const signup of signups) byName.set(`${normalizeTeamName(signup.team)}|${nameKey(signup.name)}`, signup);
  const out = new Map<number, MatchupSignup>();
  const used = new Set<number>();
  for (const rider of riders) {
    const zwiftId = rider.zwiftId ?? byName.get(`${normalizeTeamName(rider.team)}|${nameKey(rider.name)}`)?.zwiftId ?? null;
    if (!zwiftId || used.has(zwiftId)) continue;
    used.add(zwiftId);
    out.set(rider.position, { zwiftId, team: rider.team, name: rider.name, position: null });
  }
  return out;
}

/**
 * Verwachte plek per finishplek. Wie geen sterkte heeft, blijft op zijn echte
 * plek staan; de rest vult de vrije plekken, sterkste eerst. Null met minder
 * dan twee renners met een sterkte: dan valt er niets te verwachten.
 */
export function expectedPlaces(rows: Array<{ position: number; rating: number | null }>): Map<number, number> | null {
  const rated = rows.filter((row) => row.rating != null);
  if (rated.length < 2) return null;
  const fixed = new Set(rows.filter((row) => row.rating == null).map((row) => row.position));
  const free = rows
    .map((row) => row.position)
    .filter((position) => !fixed.has(position))
    .sort((a, b) => a - b);
  const order = [...rated].sort((a, b) => b.rating! - a.rating! || a.position - b.position);
  const out = new Map<number, number>();
  order.forEach((row, index) => out.set(row.position, free[index]));
  for (const position of fixed) out.set(position, position);
  return out;
}

export type LadderResultRow = {
  position: number;
  name: string;
  /** Profiel van een ZWB'er, voor de link naar /leden; null voor de rest. */
  profileId: string | null;
  team: string;
  own: boolean;
  points: number;
  timeS: number | null;
  avgWkg: number | null;
  /** Verwachte plek; null zonder vermogen of zonder verwachting. */
  expected: number | null;
  /** Verwacht min werkelijk: + is beter dan verwacht. */
  delta: number | null;
};

export type LadderEventResult = {
  resultId: number;
  ourName: string;
  opponent: string;
  ourScore: number;
  theirScore: number;
  won: boolean;
  /** Verwachte score met dezelfde renners; null zonder verwachting. */
  expectedScore: { ours: number; theirs: number } | null;
  rows: LadderResultRow[];
};

/** De uitslag met per renner de verwachte plek en het verschil. */
export function ladderEventResult(
  match: StoredMatch,
  ourName: string,
  /** Sterkte op dit parcours per finishplek (briefing.ts `routeRatings`). */
  ratings: Map<number, number | null>,
  /** Profiel-ID per finishplek. */
  profiles: Map<number, string> = new Map(),
): LadderEventResult {
  const weChallenge = sameTeam(match.challenger, ourName);
  const ourScore = weChallenge ? match.challengerScore : match.opponentScore;
  const theirScore = weChallenge ? match.opponentScore : match.challengerScore;
  const riders = [...match.riders].sort((a, b) => a.position - b.position);
  const expected = expectedPlaces(riders.map((rider) => ({ position: rider.position, rating: ratings.get(rider.position) ?? null })));
  const rated = (position: number) => ratings.get(position) != null;

  const rows = riders.map((rider): LadderResultRow => {
    const place = expected && rated(rider.position) ? (expected.get(rider.position) ?? null) : null;
    return {
      position: rider.position,
      name: rider.name,
      profileId: profiles.get(rider.position) ?? null,
      team: rider.team,
      own: sameTeam(rider.team, ourName),
      points: rider.points,
      timeS: rider.timeS,
      avgWkg: rider.avgWkg,
      expected: place,
      delta: place == null ? null : place - rider.position,
    };
  });

  let expectedScore: LadderEventResult["expectedScore"] = null;
  if (expected) {
    expectedScore = { ours: 0, theirs: 0 };
    for (const row of rows) {
      const points = LADDER_POINTS[(expected.get(row.position) ?? row.position) - 1] ?? 0;
      if (row.own) expectedScore.ours += points;
      else expectedScore.theirs += points;
    }
  }

  return {
    resultId: match.resultId,
    ourName,
    opponent: weChallenge ? match.opponent : match.challenger,
    ourScore,
    theirScore,
    // Bij gelijke stand verliest de uitdager (race book).
    won: ourScore > theirScore || (ourScore === theirScore && !weChallenge),
    expectedScore,
    rows,
  };
}
