import { normalizeTeamName } from "@/lib/ladder";
import type { SubgroupResult } from "@/lib/events/zwift-club";
import type { LadderResultRider } from "./result-page";
import type { PowerDuration } from "./routes";

export type PowerWkg = Record<PowerDuration, number | null>;
export const DURATIONS: PowerDuration[] = ["s15", "m1", "m5", "m20"];

export type MatchRider = LadderResultRider & {
  zwiftId: number | null;
  weightKg: number | null;
  racingScore: number | null;
  powerWkg: PowerWkg | null;
};

/** Een opgeslagen wedstrijd met de renners die erbij horen. */
export type StoredMatch = {
  resultId: number;
  racedOn: string;
  routeName: string | null;
  routeSlug: string | null;
  challenger: string;
  challengerScore: number;
  opponent: string;
  opponentScore: number;
  riders: MatchRider[];
};

/**
 * De ladder toont de Zwift-rijtijd, afgerond op 0,01 s: alle 89 koppelingen die
 * met een bewaarde Zwift-uitslag te controleren waren, lagen binnen 0,005 s
 * (2026-11-19). Tot dan gold 2 s ruimte, en in een sprint schoof de eerste rij
 * binnen die ruimte de Zwift-ID's door (wedstrijd 17723: drie renners verkeerd).
 */
const TIME_TOLERANCE_S = 0.05;

/**
 * Koppelt de renners van de ladderuitslag aan de Zwift-uitslag van hetzelfde
 * event: op rijtijd, kleinste verschil eerst over alle paren, en anders op
 * finishplek als beide lijsten even lang zijn.
 */
export function matchZwiftResults(riders: LadderResultRider[], results: SubgroupResult[]): MatchRider[] {
  const used = new Set<number>();
  const chosen = new Map<number, SubgroupResult>();
  const pairs: Array<{ index: number; row: SubgroupResult; diff: number }> = [];
  riders.forEach((rider, index) => {
    if (rider.timeS == null) return;
    for (const row of results) {
      if (row.durationMs == null) continue;
      const diff = Math.abs(row.durationMs / 1000 - rider.timeS);
      if (diff <= TIME_TOLERANCE_S) pairs.push({ index, row, diff });
    }
  });
  for (const { index, row } of pairs.sort((a, b) => a.diff - b.diff)) {
    if (chosen.has(index) || used.has(row.profileId)) continue;
    chosen.set(index, row);
    used.add(row.profileId);
  }
  const sameLength = riders.length === results.length;
  return riders.map((rider, index) => {
    let result = chosen.get(index);
    if (!result && sameLength) {
      const byRank = results.find((row) => row.rank === rider.position);
      if (byRank && !used.has(byRank.profileId)) {
        result = byRank;
        used.add(byRank.profileId);
      }
    }
    if (!result) return { ...rider, zwiftId: null, weightKg: null, racingScore: null, powerWkg: null };
    const weight = result.weightKg ?? null;
    const cp = result.criticalPower;
    const wkg = (watts: number | null | undefined) => (watts && weight ? Math.round((watts / weight) * 100) / 100 : null);
    return {
      ...rider,
      zwiftId: result.profileId,
      weightKg: weight,
      racingScore: result.scoreBefore ?? null,
      powerWkg: cp ? { s15: wkg(cp.s15), m1: wkg(cp.m1), m5: wkg(cp.m5), m20: wkg(cp.m20) } : null,
    };
  });
}

export type TeamPower = {
  /** Gemiddelde van de vijf besten per duur, W/kg. */
  wkg: PowerWkg;
  riders: number;
  races: number;
};

export function sameTeam(a: string, b: string) {
  return normalizeTeamName(a) === normalizeTeamName(b);
}

/**
 * Renners van een team uit zijn ladderraces: per renner het beste per duur over
 * die races, en zijn gewicht uit de nieuwste race (wedstrijden nieuwste eerst).
 */
export function teamRidersFromMatches(team: string[], matches: StoredMatch[]) {
  const isTeam = (name: string) => team.some((alias) => sameTeam(alias, name));
  const best = new Map<string, { zwiftId: number | null; wkg: PowerWkg; weightKg: number | null }>();
  let races = 0;
  for (const match of matches) {
    const own = match.riders.filter((rider) => isTeam(rider.team) && rider.powerWkg);
    if (own.length === 0) continue;
    races += 1;
    for (const rider of own) {
      const key = rider.zwiftId ? `z${rider.zwiftId}` : `n${rider.name}`;
      const current = best.get(key) ?? { zwiftId: rider.zwiftId, wkg: { s15: null, m1: null, m5: null, m20: null }, weightKg: null };
      for (const d of DURATIONS) {
        const value = rider.powerWkg![d];
        if (value != null && (current.wkg[d] == null || value > current.wkg[d]!)) current.wkg[d] = value;
      }
      current.weightKg = current.weightKg ?? rider.weightKg;
      best.set(key, current);
    }
  }
  return { riders: [...best.values()], races };
}

/**
 * Krachtprofiel van een team uit zijn ladderraces: per renner het beste per duur
 * over die races, dan het gemiddelde van de vijf besten (een ladderteam rijdt met vijf).
 */
export function teamPowerFromMatches(team: string[], matches: StoredMatch[]): TeamPower | null {
  const { riders, races } = teamRidersFromMatches(team, matches);
  if (riders.length === 0) return null;
  return { wkg: topFiveAverage(riders.map((rider) => rider.wkg)), riders: riders.length, races };
}

export function topFiveAverage(riders: PowerWkg[]): PowerWkg {
  const result: PowerWkg = { s15: null, m1: null, m5: null, m20: null };
  for (const d of DURATIONS) {
    const values = riders
      .map((rider) => rider[d])
      .filter((value): value is number => value != null && value > 0)
      .sort((a, b) => b - a)
      .slice(0, 5);
    result[d] = values.length ? Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100 : null;
  }
  return result;
}
