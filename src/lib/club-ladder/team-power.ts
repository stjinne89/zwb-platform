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

/** Rijtijden van ladder en Zwift verschillen hooguit afronding; 2 s ruimte. */
const TIME_TOLERANCE_S = 2;

/**
 * Koppelt de renners van de ladderuitslag aan de Zwift-uitslag van hetzelfde
 * event: op rijtijd, en anders op finishplek als beide lijsten even lang zijn.
 */
export function matchZwiftResults(riders: LadderResultRider[], results: SubgroupResult[]): MatchRider[] {
  const used = new Set<number>();
  const sameLength = riders.length === results.length;
  return riders.map((rider) => {
    let result =
      rider.timeS == null
        ? undefined
        : results.find(
            (row) =>
              !used.has(row.profileId) &&
              row.durationMs != null &&
              Math.abs(row.durationMs / 1000 - rider.timeS!) <= TIME_TOLERANCE_S,
          );
    if (!result && sameLength) {
      const byRank = results.find((row) => row.rank === rider.position);
      if (byRank && !used.has(byRank.profileId)) result = byRank;
    }
    if (!result) return { ...rider, zwiftId: null, weightKg: null, racingScore: null, powerWkg: null };
    used.add(result.profileId);
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
 * Krachtprofiel van een team uit zijn ladderraces: per renner het beste per duur
 * over die races, dan het gemiddelde van de vijf besten (een ladderteam rijdt met vijf).
 */
export function teamPowerFromMatches(team: string[], matches: StoredMatch[]): TeamPower | null {
  const isTeam = (name: string) => team.some((alias) => sameTeam(alias, name));
  const best = new Map<string, PowerWkg>();
  let races = 0;
  for (const match of matches) {
    const own = match.riders.filter((rider) => isTeam(rider.team) && rider.powerWkg);
    if (own.length === 0) continue;
    races += 1;
    for (const rider of own) {
      const key = rider.zwiftId ? `z${rider.zwiftId}` : `n${rider.name}`;
      const current = best.get(key) ?? { s15: null, m1: null, m5: null, m20: null };
      for (const d of DURATIONS) {
        const value = rider.powerWkg![d];
        if (value != null && (current[d] == null || value > current[d]!)) current[d] = value;
      }
      best.set(key, current);
    }
  }
  if (best.size === 0) return null;
  return { wkg: topFiveAverage([...best.values()]), riders: best.size, races };
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
