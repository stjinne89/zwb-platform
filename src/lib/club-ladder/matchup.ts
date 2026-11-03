// Matchup van een ladderwedstrijd: ZWB tegen de tegenstander, vermogen per duur.
//
// Per renner het beste W/kg per duur over 90 dagen van ZwiftRacing.app
// (zwift_rider_metrics.power_wkg), voor beide teams dezelfde bron. Een ladderrace
// vraagt zelden het uiterste: het beste uit alleen de bewaarde ladderraces lag
// bij een tegenstander 0,5 W/kg onder zijn 90 dagen (20 min, 2026-11-03). Alleen
// zonder 90-dagenwaarde valt een renner terug op zijn ladderraces; dat staat erbij.

import { DURATIONS, sameTeam, teamPowerFromMatches, topFiveAverage, type PowerWkg, type StoredMatch } from "./team-power";
import type { DurationWeights, PowerDuration } from "./routes";

/** Verschil dat we gelijk noemen, in procenten (eigen vuistregel). */
export const EVEN_PCT = 2;

export type RiderPower = { wkg: PowerWkg; races: number; racingScore: number | null };

export type MatchupRider = {
  zwiftId: number;
  name: string;
  position: number | null;
  wkg: PowerWkg | null;
  /** 90 dagen van ZwiftRacing, of alleen de bewaarde ladderraces. */
  source: "90d" | "ladder" | null;
  racingScore: number | null;
};

export type MatchupSide = {
  name: string;
  riders: MatchupRider[];
  /** Opgesteld (startplek gegeven) of alleen aangemeld. */
  lineup: boolean;
  wkg: PowerWkg | null;
  races: number;
};

export type MatchupDuration = {
  duration: PowerDuration;
  ours: number | null;
  theirs: number | null;
  /** + is ZWB sterker; log-verschil in procenten, zoals het advies. */
  edgePct: number | null;
  /** Hoe zwaar deze duur op dit parcours telt (som 1), of null zonder route. */
  weight: number | null;
};

export type LadderMatchup = {
  basis: "lineup" | "races";
  ours: MatchupSide;
  theirs: MatchupSide;
  durations: MatchupDuration[];
  /** Gewogen voordeel op dit parcours, null zonder route of vermogen. */
  routeEdgePct: number | null;
};

export type MatchupSignup = { zwiftId: number; team: string; name: string; position: number | null };

/** Beste W/kg per duur per Zwift-ID over alle bewaarde ladderraces. */
export function riderPowerFromMatches(matches: StoredMatch[]): Map<number, RiderPower> {
  const out = new Map<number, RiderPower>();
  for (const match of matches) {
    for (const rider of match.riders) {
      if (!rider.zwiftId || !rider.powerWkg) continue;
      const current = out.get(rider.zwiftId) ?? { wkg: { s15: null, m1: null, m5: null, m20: null }, races: 0, racingScore: null };
      for (const d of DURATIONS) {
        const value = rider.powerWkg[d];
        if (value != null && value > 0 && (current.wkg[d] == null || value > current.wkg[d]!)) current.wkg[d] = value;
      }
      current.races += 1;
      // Nieuwste wedstrijd eerst: de eerste ZRS is de recentste.
      current.racingScore = current.racingScore ?? rider.racingScore;
      out.set(rider.zwiftId, current);
    }
  }
  return out;
}

const hasPower = (wkg: PowerWkg | null | undefined) => Boolean(wkg && DURATIONS.some((d) => wkg[d] != null));

export type SquadPower = { wkg: PowerWkg; riders: number; with90d: number };

/**
 * Vermogen van een ploeg voor het advies: per renner 90 dagen, anders het beste
 * uit zijn ladderraces, dan de vijf besten per duur. Zelfde bron als de matchup.
 */
export function squadPower(zwiftIds: number[], power: Map<number, RiderPower>, power90: Map<number, PowerWkg>): SquadPower | null {
  const rows: PowerWkg[] = [];
  let with90d = 0;
  for (const id of new Set(zwiftIds)) {
    const best90 = power90.get(id);
    if (hasPower(best90)) {
      rows.push(best90!);
      with90d += 1;
    } else {
      const ladder = power.get(id)?.wkg;
      if (hasPower(ladder)) rows.push(ladder!);
    }
  }
  return rows.length > 0 ? { wkg: topFiveAverage(rows), riders: rows.length, with90d } : null;
}

function sideRiders(
  signups: MatchupSignup[],
  power: Map<number, RiderPower>,
  power90: Map<number, PowerWkg>,
  scores: Map<number, number>,
): { riders: MatchupRider[]; lineup: boolean } {
  const placed = signups.filter((rider) => rider.position != null);
  const chosen = placed.length > 0 ? placed : signups;
  const riders = chosen.map((signup): MatchupRider => {
    const ladder = power.get(signup.zwiftId);
    const best90 = power90.get(signup.zwiftId);
    const source = hasPower(best90) ? "90d" : hasPower(ladder?.wkg) ? "ladder" : null;
    return {
      zwiftId: signup.zwiftId,
      name: signup.name,
      position: signup.position,
      wkg: source === "90d" ? best90! : source === "ladder" ? ladder!.wkg : null,
      source,
      racingScore: scores.get(signup.zwiftId) ?? ladder?.racingScore ?? null,
    };
  });
  riders.sort(
    (a, b) =>
      (a.position ?? Infinity) - (b.position ?? Infinity) || a.name.localeCompare(b.name, "nl"),
  );
  return { riders, lineup: placed.length > 0 };
}

function logPct(ours: number | null | undefined, theirs: number | null | undefined) {
  return ours && theirs ? Math.log(ours / theirs) : null;
}

export function buildLadderMatchup(input: {
  ourName: string;
  opponent: string;
  signups: MatchupSignup[];
  /** Wedstrijden van beide teams, voor het teamprofiel. */
  matches: StoredMatch[];
  /** Alle bewaarde races van de aangemelde renners, ook voor een ander team. */
  riderMatches?: StoredMatch[];
  /** Beste W/kg over 90 dagen van ZwiftRacing, voor beide teams. */
  power90: Map<number, PowerWkg>;
  scores: Map<number, number>;
  weights: DurationWeights | null;
}): LadderMatchup {
  const { ourName, opponent, signups, matches, power90, scores, weights } = input;
  const power = riderPowerFromMatches(input.riderMatches ?? matches);
  const ours = sideRiders(
    signups.filter((row) => sameTeam(row.team, ourName)),
    power,
    power90,
    scores,
  );
  const theirs = sideRiders(
    signups.filter((row) => sameTeam(row.team, opponent)),
    power,
    power90,
    scores,
  );

  const lineupPower = (riders: MatchupRider[]) => {
    const rows = riders.filter((rider) => hasPower(rider.wkg)).map((rider) => rider.wkg!);
    return rows.length > 0 ? topFiveAverage(rows) : null;
  };
  const ourLineupWkg = lineupPower(ours.riders);
  const theirLineupWkg = lineupPower(theirs.riders);
  const basis = ourLineupWkg && theirLineupWkg ? "lineup" : "races";

  const ourTeam = teamPowerFromMatches([ourName], matches);
  const theirTeam = teamPowerFromMatches([opponent], matches);
  // Zonder aanmeldingen aan beide kanten: beide teams uit hun ladderraces, nooit gemengd.
  const ourWkg = basis === "lineup" ? ourLineupWkg : ourTeam?.wkg ?? null;
  const theirWkg = basis === "lineup" ? theirLineupWkg : theirTeam?.wkg ?? null;

  let weighted = 0;
  let weightSum = 0;
  const durations = DURATIONS.map((duration): MatchupDuration => {
    const edge = logPct(ourWkg?.[duration], theirWkg?.[duration]);
    const weight = weights ? weights[duration] : null;
    if (edge != null && weight) {
      weighted += weight * edge;
      weightSum += weight;
    }
    return {
      duration,
      ours: ourWkg?.[duration] ?? null,
      theirs: theirWkg?.[duration] ?? null,
      edgePct: edge == null ? null : Math.round(edge * 100),
      weight,
    };
  });

  return {
    basis,
    ours: { name: ourName, riders: ours.riders, lineup: ours.lineup, wkg: ourWkg ?? null, races: ourTeam?.races ?? 0 },
    theirs: { name: opponent, riders: theirs.riders, lineup: theirs.lineup, wkg: theirWkg ?? null, races: theirTeam?.races ?? 0 },
    durations,
    routeEdgePct: weightSum > 0 ? Math.round((weighted / weightSum) * 100) : null,
  };
}

/** Duren waarop ZWB meer dan gelijk sterker is. */
export function ourAdvantages(matchup: LadderMatchup): PowerDuration[] {
  return matchup.durations.filter((row) => row.edgePct != null && row.edgePct >= EVEN_PCT).map((row) => row.duration);
}
