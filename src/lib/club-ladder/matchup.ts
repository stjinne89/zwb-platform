// Matchup van een ladderwedstrijd: ZWB tegen de tegenstander, vermogen per duur.
//
// Per renner het beste W/kg per duur over 90 dagen van ZwiftRacing.app
// (zwift_rider_metrics.power_wkg), voor beide teams dezelfde bron. Een ladderrace
// vraagt zelden het uiterste: het beste uit alleen de bewaarde ladderraces lag
// bij een tegenstander 0,5 W/kg onder zijn 90 dagen (20 min, 2026-11-03). Alleen
// zonder 90-dagenwaarde valt een renner terug op zijn ladderraces; dat staat erbij.
//
// Gewicht telt mee zodra beide kanten het van minstens drie renners hebben: per
// renner W/kg omgerekend naar 75 kg op de hellingen van het parcours
// (`rider-weight.ts`). De tabel toont de gewone W/kg; het verschil is dat op dit
// parcours, met gewicht.

import { pickFive, SQUAD_SIZE, type PoolRider, type RecentSquad, type SquadFocus } from "./opponent-five";
import { averageWeight, logEdges, routeWkg, shownWeight, sideRouteWkg, weightsUsable, type WeightedRider } from "./rider-weight";
import { DURATIONS, sameTeam, teamRidersFromMatches, topFiveAverage, type PowerWkg, type StoredMatch } from "./team-power";
import { EVEN_PCT } from "./edge-tone";
import type { DurationTerrain, DurationWeights, PowerDuration } from "./routes";

export { EVEN_PCT };

export type RiderPower = { wkg: PowerWkg; races: number; racingScore: number | null };

export type MatchupRider = {
  zwiftId: number;
  name: string;
  position: number | null;
  wkg: PowerWkg | null;
  /** 90 dagen van ZwiftRacing, of alleen de bewaarde ladderraces. */
  source: "90d" | "ladder" | null;
  racingScore: number | null;
  /** Alleen om te rekenen; staat nergens los op de pagina. */
  weightKg: number | null;
  /** W/kg omgerekend naar 75 kg op dit parcours, null zonder parcours of zonder gewicht aan beide kanten. */
  routeWkg: PowerWkg | null;
  /** In hoeveel van de recente ladderraces van zijn team hij reed (tegenstander), anders null. */
  races: number | null;
};

export type MatchupSide = {
  name: string;
  riders: MatchupRider[];
  /** Opgesteld (startplek gegeven) of alleen aangemeld. */
  lineup: boolean;
  /** Geen aanmeldingen op de ladder: de selectie van een captain. */
  selection: boolean;
  wkg: PowerWkg | null;
  races: number;
  /** Gemiddeld gewicht (hele kg) van de renners met vermogen, pas vanaf drie met gewicht. */
  weightKg: number | null;
  /** De gekozen vijf van de tegenstander: zijn beste ploeg voor dit type, of null. */
  focus: SquadFocus | null;
  /** Over zoveel recente ladderraces telt `MatchupRider.races`. */
  recentRaces: number;
};

export type MatchupDuration = {
  duration: PowerDuration;
  ours: number | null;
  theirs: number | null;
  /** + is ZWB sterker; log-verschil in procenten, zoals het advies; met gewicht als dat meetelt. */
  edgePct: number | null;
  /** Hoe zwaar deze duur op dit parcours telt (som 1), of null zonder route. */
  weight: number | null;
};

export type LadderMatchup = {
  /** lineup: beide kanten uit renners; squad: de tegenstander uit zijn recente renners; races: beide uit ladderraces. */
  basis: "lineup" | "squad" | "races";
  ours: MatchupSide;
  theirs: MatchupSide;
  durations: MatchupDuration[];
  /** Gewogen voordeel op dit parcours, null zonder route of vermogen. */
  routeEdgePct: number | null;
  /** Telt gewicht mee in de verschillen (parcours bekend, beide kanten minstens drie gewichten). */
  weightCounts: boolean;
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

export type SquadPower = {
  wkg: PowerWkg;
  riders: number;
  with90d: number;
  /** Per renner vermogen en gewicht, voor het advies per parcours. */
  rows: WeightedRider[];
};

/**
 * Vermogen van een ploeg voor het advies: per renner 90 dagen, anders het beste
 * uit zijn ladderraces, dan de vijf besten per duur. Zelfde bron als de matchup.
 */
export function squadPower(
  zwiftIds: number[],
  power: Map<number, RiderPower>,
  power90: Map<number, PowerWkg>,
  weights: Map<number, number> = new Map(),
): SquadPower | null {
  const rows: WeightedRider[] = [];
  let with90d = 0;
  for (const id of new Set(zwiftIds)) {
    const best90 = power90.get(id);
    const weightKg = weights.get(id) ?? null;
    if (hasPower(best90)) {
      rows.push({ wkg: best90!, weightKg });
      with90d += 1;
    } else {
      const ladder = power.get(id)?.wkg;
      if (hasPower(ladder)) rows.push({ wkg: ladder!, weightKg });
    }
  }
  return rows.length > 0 ? { wkg: topFiveAverage(rows.map((row) => row.wkg)), riders: rows.length, with90d, rows } : null;
}

/** De recente renners van een ploeg met vermogen (90 dagen, anders ladderraces) en gewicht, om vijf uit te kiezen. */
export function squadPool(
  recent: RecentSquad,
  power: Map<number, RiderPower>,
  power90: Map<number, PowerWkg>,
  weights: Map<number, number> = new Map(),
): PoolRider[] {
  return recent.riders.flatMap((rider) => {
    const best90 = power90.get(rider.zwiftId);
    const wkg = hasPower(best90) ? best90! : power.get(rider.zwiftId)?.wkg;
    return wkg && hasPower(wkg) ? [{ ...rider, wkg, weightKg: weights.get(rider.zwiftId) ?? null }] : [];
  });
}

/** Zwift-ID's van wie de laatste wedstrijden voor dit team reed. */
export function opponentRiderIds(matches: StoredMatch[], team: string): number[] {
  return [
    ...new Set(
      matches.flatMap((match) =>
        match.riders.filter((rider) => rider.zwiftId && sameTeam(rider.team, team)).map((rider) => rider.zwiftId!),
      ),
    ),
  ];
}

function sideRiders(
  signups: MatchupSignup[],
  power: Map<number, RiderPower>,
  power90: Map<number, PowerWkg>,
  scores: Map<number, number>,
  weights: Map<number, number>,
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
      weightKg: weights.get(signup.zwiftId) ?? null,
      routeWkg: null,
      races: null,
    };
  });
  riders.sort(
    (a, b) =>
      (a.position ?? Infinity) - (b.position ?? Infinity) || a.name.localeCompare(b.name, "nl"),
  );
  return { riders, lineup: placed.length > 0 };
}

export function buildLadderMatchup(input: {
  ourName: string;
  opponent: string;
  signups: MatchupSignup[];
  /** Selectie van een captain, voor onze kant zolang wij niemand aangemeld hebben. */
  ourSelection?: MatchupSignup[];
  /** Recente renners van de tegenstander, als die nog niemand aangemeld heeft. */
  theirSquad?: number[];
  /** Wedstrijden van beide teams, voor het teamprofiel. */
  matches: StoredMatch[];
  /** Alle bewaarde races van de aangemelde renners, ook voor een ander team. */
  riderMatches?: StoredMatch[];
  /** Beste W/kg over 90 dagen van ZwiftRacing, voor beide teams. */
  power90: Map<number, PowerWkg>;
  scores: Map<number, number>;
  weights: DurationWeights | null;
  /** Op welke hellingen elke duur telt; zonder parcours telt gewicht niet. */
  terrain?: DurationTerrain | null;
  /** Gewicht per Zwift-ID (`rider-weights.ts`); ontbreekt het, dan W/kg alleen. */
  riderWeights?: Map<number, number>;
  /** Wie de laatste tien ladderraces voor de tegenstander reed, en hoe vaak. */
  theirRecent?: RecentSquad;
  /**
   * Kies van de tegenstander vijf renners: zijn beste ploeg voor dit type, uit
   * meer dan vijf aanmeldingen zonder startplek, anders uit `theirRecent`.
   * Zonder focus zijn echte aanmeldingen of opstelling, de vijf besten per duur.
   */
  theirFocus?: SquadFocus;
}): LadderMatchup {
  const { ourName, opponent, signups, matches, power90, scores, weights } = input;
  const terrain = input.terrain ?? null;
  const riderWeights = input.riderWeights ?? new Map<number, number>();
  const power = riderPowerFromMatches(input.riderMatches ?? matches);
  const ourSignups = signups.filter((row) => sameTeam(row.team, ourName));
  const selection = ourSignups.length === 0 && (input.ourSelection?.length ?? 0) > 0;
  const ours = sideRiders(selection ? input.ourSelection! : ourSignups, power, power90, scores, riderWeights);
  const theirSignups = signups.filter((row) => sameTeam(row.team, opponent));
  let theirs = sideRiders(theirSignups, power, power90, scores, riderWeights);
  const recentCount = new Map((input.theirRecent?.riders ?? []).map((rider) => [rider.zwiftId, rider.races]));
  const withRaces = (riders: MatchupRider[]) =>
    input.theirRecent ? riders.map((rider) => ({ ...rider, races: recentCount.get(rider.zwiftId) ?? 0 })) : riders;
  theirs = { ...theirs, riders: withRaces(theirs.riders) };
  let focus: SquadFocus | null = null;
  let fromRecent = false;
  if (input.theirFocus) {
    // Uit de aanmeldingen alleen als er meer dan vijf zijn en niemand een startplek heeft;
    // anders is dat de echte ploeg (een eigen tab) en kiezen we uit zijn recente renners (2026-11-06).
    const signed = theirs.lineup ? [] : theirs.riders.filter((rider) => hasPower(rider.wkg));
    const fromSignups = signed.length > SQUAD_SIZE;
    const recent = (input.theirRecent?.riders ?? []).map((rider) => ({ zwiftId: rider.zwiftId, team: opponent, name: rider.name, position: null }));
    const candidates = fromSignups ? signed : withRaces(sideRiders(recent, power, power90, scores, riderWeights).riders);
    const pool = candidates.filter((rider) => hasPower(rider.wkg));
    if (pool.length > 0) {
      const five = new Set(
        pickFive(
          pool.map((rider) => ({ zwiftId: rider.zwiftId, name: rider.name, races: rider.races ?? 0, wkg: rider.wkg!, weightKg: rider.weightKg })),
          input.theirFocus,
        ).map((rider) => rider.zwiftId),
      );
      theirs = { riders: pool.filter((rider) => five.has(rider.zwiftId)), lineup: false };
      focus = input.theirFocus;
      fromRecent = !fromSignups;
    }
  }

  const powered = (riders: MatchupRider[]): WeightedRider[] =>
    riders.filter((rider) => hasPower(rider.wkg)).map((rider) => ({ wkg: rider.wkg!, weightKg: rider.weightKg }));
  const ourLineup = powered(ours.riders);
  const theirLineup = powered(theirs.riders);
  // Wij weten wie er rijdt, de tegenstander nog niet: zijn recente renners, net als het advies.
  const theirSquad =
    ourLineup.length > 0 && theirLineup.length === 0 && input.theirSquad
      ? squadPower(input.theirSquad, power, power90, riderWeights)?.rows ?? []
      : [];
  const basis =
    ourLineup.length > 0 && theirLineup.length > 0
      ? fromRecent
        ? "squad"
        : "lineup"
      : theirSquad.length > 0
        ? "squad"
        : "races";

  // Anders beide teams uit hun ladderraces, nooit gemengd.
  const fromRaces = (names: string[]) => {
    const team = teamRidersFromMatches(names, matches);
    return {
      races: team.races,
      rows: team.riders.map((rider) => ({ wkg: rider.wkg, weightKg: (rider.zwiftId ? riderWeights.get(rider.zwiftId) : undefined) ?? rider.weightKg })),
    };
  };
  const ourTeam = fromRaces([ourName]);
  const theirTeam = fromRaces([opponent]);
  const ourRows = basis === "races" ? ourTeam.rows : ourLineup;
  const theirRows = basis === "races" ? theirTeam.rows : theirLineup.length > 0 ? theirLineup : theirSquad;
  const ourWkg = ourRows.length > 0 ? topFiveAverage(ourRows.map((row) => row.wkg)) : null;
  const theirWkg = theirRows.length > 0 ? topFiveAverage(theirRows.map((row) => row.wkg)) : null;

  const weightCounts = terrain !== null && weightsUsable(ourRows, theirRows);
  const edges = logEdges(sideRouteWkg(ourRows, terrain, weightCounts), sideRouteWkg(theirRows, terrain, weightCounts));
  if (weightCounts) {
    // Per renner op dit parcours, voor de verwachte uitslag; wie geen gewicht heeft, krijgt dat van zijn kant.
    for (const [side, rows] of [
      [ours.riders, ourRows],
      [theirs.riders, theirRows],
    ] as const) {
      const fallback = averageWeight(rows) ?? averageWeight(side);
      for (const rider of side) {
        const kg = rider.weightKg ?? fallback;
        if (rider.wkg && kg) rider.routeWkg = routeWkg(rider.wkg, kg, terrain!);
      }
    }
  }

  let weighted = 0;
  let weightSum = 0;
  const durations = DURATIONS.map((duration): MatchupDuration => {
    const edge = edges[duration];
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
    ours: {
      name: ourName,
      riders: ours.riders,
      lineup: ours.lineup,
      selection,
      wkg: ourWkg,
      races: ourTeam.races,
      weightKg: shownWeight(ourRows),
      focus: null,
      recentRaces: 0,
    },
    theirs: {
      name: opponent,
      riders: theirs.riders,
      lineup: theirs.lineup,
      selection: false,
      wkg: theirWkg,
      races: theirTeam.races,
      weightKg: shownWeight(theirRows),
      focus,
      recentRaces: input.theirRecent?.races ?? 0,
    },
    durations,
    routeEdgePct: weightSum > 0 ? Math.round((weighted / weightSum) * 100) : null,
    weightCounts,
  };
}

/** Duren waarop ZWB meer dan gelijk sterker is. */
export function ourAdvantages(matchup: LadderMatchup): PowerDuration[] {
  return matchup.durations.filter((row) => row.edgePct != null && row.edgePct >= EVEN_PCT).map((row) => row.duration);
}
