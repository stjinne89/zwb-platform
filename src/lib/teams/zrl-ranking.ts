// ZRL-teamindeling als ranglijst: alle renners van een hoofdteam (ZRL B) op één
// lijst, gesorteerd op zFTP, zMAP of het beste W/kg over 1, 5 of 20 minuten, met
// na elke 5 renners een grens. Elk blok is een subteam; Bdev is het laatste blok
// (afspraak eigenaar 2026-11-15).
//
// Voor een nieuwe ZRL-ronde zijn de divisies nog onbekend, dus toetst de lijst
// niet aan B1 of B4 maar alleen aan de grens van de categorie (te sterk voor B)
// en aan het plafond van Development.
//
// zFTP en zMAP zijn geschat uit het vermogen van de laatste 90 dagen in Zwift
// (ZwiftRacing). De factoren zijn gefit op de 51 renners met zowel een WTRL-plak
// als ZwiftRacing-waarden (2026-11-13, opnieuw nagerekend 2026-11-15): gemiddeld
// 0,10 W/kg ernaast voor zFTP en 0,11 voor zMAP, bij 9 op de 10 minder dan 0,22.
// Zonder ZwiftRacing-waarden geldt de WTRL-plak van de vorige ronde.

import { upperLimit, type Category } from "@/lib/teams/wtrl-roster";

export const ZRL_BLOCK_SIZE = 5;
export const ZFTP_FROM_20M = 0.937;
export const ZMAP_FROM_5M = 0.971;
/** Zo ver kan de schatting ernaast zitten (90e percentiel); binnen deze marge is het krap. */
export const ESTIMATE_MARGIN = 0.22;

export type RankingSortKey = "zftp" | "zmap" | "m1" | "m5" | "m20";

export type RankingAvailability = "available" | "maybe" | "unavailable" | null;

export type RankingRider = {
  /** Profiel-id of rosterregel-id. */
  key: string;
  name: string;
  /** Leeg bij een rosternaam zonder account. */
  profileId: string | null;
  /** Beste W/kg van de laatste 90 dagen in Zwift (ZwiftRacing). */
  power: { m1: number | null; m5: number | null; m20: number | null } | null;
  /** zFTP en zMAP uit de laatste WTRL-plak. */
  wtrl: { zftpWkg: number | null; zmapWkg: number | null } | null;
};

export type ZValue = { value: number; source: "estimate" | "wtrl" };

export type LimitStatus = "ok" | "near" | "over";

export type RankedRider = RankingRider & {
  zftp: ZValue | null;
  zmap: ZValue | null;
  /** Te sterk voor de categorie van het hoofdteam; null zonder categorie of waarden. */
  category: LimitStatus | null;
  /** Past onder het Development-plafond; null zonder categorie of zonder beide waarden. */
  dev: LimitStatus | null;
};

export type RankingTeam = { id: string; name: string };

export type RankingBlock = {
  /** null: reserves voorbij het laatste team. */
  team: (RankingTeam & { dev: boolean }) | null;
  riders: RankedRider[];
  level: LimitStatus;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export function estimateZ(rider: RankingRider): { zftp: ZValue | null; zmap: ZValue | null } {
  const pick = (estimate: number | null | undefined, wtrl: number | null | undefined): ZValue | null =>
    estimate != null
      ? { value: round2(estimate), source: "estimate" }
      : wtrl != null
        ? { value: wtrl, source: "wtrl" }
        : null;
  return {
    zftp: pick(rider.power?.m20 != null ? rider.power.m20 * ZFTP_FROM_20M : null, rider.wtrl?.zftpWkg),
    zmap: pick(rider.power?.m5 != null ? rider.power.m5 * ZMAP_FROM_5M : null, rider.wtrl?.zmapWkg),
  };
}

export function isDevTeamName(name: string) {
  return /dev/i.test(name);
}

/** "ZRL B" → B; null als de naam geen categorie noemt. */
export function categoryFromTeamName(name: string): Category | null {
  const match = /\b([A-D])\b/.exec(name);
  return match ? (match[1] as Category) : null;
}

export function isWomenTeamName(name: string) {
  return /ladies|women|womens|vrouw/i.test(name);
}

/**
 * Hoe dicht een renner bij een grens zit. Over: zFTP of zMAP op of boven de grens.
 * Krap: binnen de foutmarge van de schatting eronder. Alleen W/kg; de wattvloer
 * van Open (250 W voor A) telt niet mee, want de schatting kent geen watt.
 */
function judge(zftp: number | null, zmap: number | null, limit: { ftp: number; map: number }): LimitStatus {
  if ((zftp != null && zftp >= limit.ftp) || (zmap != null && zmap >= limit.map)) return "over";
  if (
    (zftp != null && zftp >= limit.ftp - ESTIMATE_MARGIN) ||
    (zmap != null && zmap >= limit.map - ESTIMATE_MARGIN)
  ) {
    return "near";
  }
  return "ok";
}

export function rankRider(rider: RankingRider, category: Category | null, women: boolean): RankedRider {
  const { zftp, zmap } = estimateZ(rider);
  let categoryStatus: LimitStatus | null = null;
  let dev: LimitStatus | null = null;
  if (category) {
    const upper = upperLimit({ category, development: false, women });
    if (upper && (zftp || zmap)) categoryStatus = judge(zftp?.value ?? null, zmap?.value ?? null, upper);
    // Development vraagt dat beide waarden eronder blijven, dus zonder een van beide onbekend.
    const devLimit = upperLimit({ category, development: true, women });
    if (devLimit && zftp && zmap) dev = judge(zftp.value, zmap.value, devLimit);
  }
  return { ...rider, zftp, zmap, category: categoryStatus, dev };
}

export function sortValue(rider: RankedRider, key: RankingSortKey): number | null {
  switch (key) {
    case "zftp":
      return rider.zftp?.value ?? null;
    case "zmap":
      return rider.zmap?.value ?? null;
    default:
      return rider.power?.[key] ?? null;
  }
}

/** Sterkste boven; zonder waarde onderaan, daarbinnen op naam. */
export function sortRanking(riders: RankedRider[], key: RankingSortKey): RankedRider[] {
  return [...riders].sort((a, b) => {
    const x = sortValue(a, key);
    const y = sortValue(b, key);
    if (x == null && y == null) return a.name.localeCompare(b.name, "nl");
    if (x == null) return 1;
    if (y == null) return -1;
    return y - x || a.name.localeCompare(b.name, "nl");
  });
}

/** Subteams op naam, het Development-team als laatste. */
export function orderRankingTeams(teams: RankingTeam[]): Array<RankingTeam & { dev: boolean }> {
  return teams
    .map((team) => ({ ...team, dev: isDevTeamName(team.name) }))
    .sort((a, b) => Number(a.dev) - Number(b.dev) || a.name.localeCompare(b.name, "nl", { numeric: true }));
}

const worse = (a: LimitStatus, b: LimitStatus | null): LimitStatus =>
  b === "over" || a === "over" ? "over" : b === "near" || a === "near" ? "near" : "ok";

/**
 * Knip de gesorteerde lijst in blokken van 5, één per team; wat overblijft zijn
 * reserves. Een blok kleurt rood als iemand te sterk is voor de categorie of, in
 * het Dev-blok, boven het Dev-plafond zit; oranje bij krap.
 */
export function splitIntoTeams(
  sorted: RankedRider[],
  teams: Array<RankingTeam & { dev: boolean }>,
  size = ZRL_BLOCK_SIZE,
): RankingBlock[] {
  const blocks: RankingBlock[] = [];
  teams.forEach((team, index) => {
    const riders = sorted.slice(index * size, (index + 1) * size);
    if (riders.length === 0) return;
    blocks.push({ team, riders, level: blockLevel(riders, team.dev) });
  });
  const rest = sorted.slice(teams.length * size);
  if (rest.length > 0) blocks.push({ team: null, riders: rest, level: blockLevel(rest, false) });
  return blocks;
}

/** Onbekend in het Dev-blok (geen zFTP of zMAP) is krap: passen is niet te zien. */
export function riderLevel(rider: RankedRider, inDevTeam: boolean): LimitStatus {
  let level: LimitStatus = rider.category ?? "ok";
  if (inDevTeam) level = worse(level, rider.dev ?? "near");
  return level;
}

function blockLevel(riders: RankedRider[], dev: boolean): LimitStatus {
  return riders.reduce<LimitStatus>((level, rider) => worse(level, riderLevel(rider, dev)), "ok");
}

// Indeling per raceweek (2026-11-16): de captain deelt in, los van de sortering.
// De blokken komen dan uit de echte opstelling (team_event_lineups), dezelfde
// regels die de captain-selectie en het racebriefje lezen.

/** Eén regel van de opstelling van een raceweek. */
export type RankingLineup = { id: string; eventId: string; teamId: string; riderKey: string };

export type LineupBlock = {
  team: RankingTeam & { dev: boolean };
  rows: Array<{ rider: RankedRider; lineupId: string }>;
  level: LimitStatus;
  /** Meer renners dan een blok telt. */
  crowded: boolean;
};

/**
 * De opstelling van één raceweek per team, binnen elk team gesorteerd. Een renner
 * die voor twee teams rijdt, staat in beide. Regels van een renner die niet in de
 * lijst staat, of van een team buiten de subteams, vallen weg.
 */
export function lineupBlocks(
  riders: RankedRider[],
  lineups: RankingLineup[],
  teams: Array<RankingTeam & { dev: boolean }>,
  key: RankingSortKey,
  size = ZRL_BLOCK_SIZE,
): { blocks: LineupBlock[]; assigned: Set<string> } {
  const riderByKey = new Map(riders.map((rider) => [rider.key, rider]));
  const assigned = new Set<string>();
  const blocks = teams.map((team) => {
    const lineupOf = new Map<string, string>();
    for (const lineup of lineups) {
      if (lineup.teamId === team.id && riderByKey.has(lineup.riderKey)) lineupOf.set(lineup.riderKey, lineup.id);
    }
    const sorted = sortRanking(
      [...lineupOf.keys()].map((riderKey) => riderByKey.get(riderKey)!),
      key,
    );
    for (const rider of sorted) assigned.add(rider.key);
    return {
      team,
      rows: sorted.map((rider) => ({ rider, lineupId: lineupOf.get(rider.key)! })),
      level: blockLevel(sorted, team.dev),
      crowded: sorted.length > size,
    };
  });
  return { blocks, assigned };
}

/** "ZRL 2026/27 · R2 · W1" → "ZRL 2026/27 · R2", dus met het seizoen; null zonder ronde. */
export function roundOfTitle(title: string): string | null {
  const match = /^(.*?\bR\d+)\b/.exec(title);
  return match ? match[1] : null;
}

/** De raceweken na deze in dezelfde ronde, op datum. */
export function laterWeeksInRound<T extends { id: string; title: string; startAt: string }>(
  weeks: T[],
  eventId: string,
): T[] {
  const current = weeks.find((week) => week.id === eventId);
  const round = current ? roundOfTitle(current.title) : null;
  if (!current || round == null) return [];
  return weeks
    .filter((week) => week.id !== eventId && week.startAt > current.startAt && roundOfTitle(week.title) === round)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}
