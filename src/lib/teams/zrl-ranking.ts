// ZRL-teamindeling als ranglijst: alle renners van een hoofdteam (ZRL B) op één
// lijst, gesorteerd op zFTP, zMAP of het beste W/kg over 1, 5 of 20 minuten, met
// na elke 5 renners een grens. Elk blok is een subteam; Bdev is het laatste blok
// (afspraak eigenaar 2026-11-15).
//
// Voor een nieuwe ZRL-ronde zijn de divisies nog onbekend, dus toetst de lijst
// niet aan B1 of B4 maar alleen aan de grens van de categorie (te sterk voor B)
// en aan het plafond van Development.
//
// zFTP en zMAP zijn geschat uit het beste W/kg van de laatste 90 dagen, per duur
// de hoogste van ZwiftRacing en intervals.icu (`bestPower`; eigenaar, 2026-11-24:
// de beste waarden, niet alleen uit races):
// - zMAP = 0,99 × beste 5 minuten. Zwift noemt zMAP het vermogen bij VO2max over
//   4 tot 6 minuten.
// - zFTP = 0,99 × critical power uit 5 en 20 minuten, (4 × 20 min − 5 min) / 3.
//   Zwift zegt dat zFTP geen vaste 95% van de 20 minuten is maar uit de curve
//   komt. Zonder 5 minuten 0,94 × 20 minuten.
// Gefit op 2026-11-24 op de 56 renners met een WTRL-plak van die dag en vermogen,
// met dezelfde invoer als hier (leave-one-out): zMAP gemiddeld 0,092 W/kg naast
// WTRL, bij 9 op de 10 minder dan 0,22; zFTP 0,075 en 0,14. De vorige factoren
// (0,937 × 20 min, 0,971 × 5 min, gefit op 2026-11-13) zaten toen 0,083 en 0,117
// ernaast, zMAP gemiddeld 0,08 te laag.
// Zonder vermogen geldt de WTRL-plak van de vorige ronde.

import { upperLimit, type Category } from "@/lib/teams/wtrl-roster";

export const ZRL_BLOCK_SIZE = 5;
export const ZMAP_FROM_5M = 0.99;
export const ZFTP_FROM_CP = 0.99;
/** Terugval voor zFTP zonder 5 minuten. */
export const ZFTP_FROM_20M = 0.94;
/** Zo ver kan de schatting ernaast zitten (90e percentiel); binnen deze marge is het krap. */
export const ZFTP_ESTIMATE_MARGIN = 0.14;
export const ZMAP_ESTIMATE_MARGIN = 0.22;

export type RankingSortKey = "zftp" | "zmap" | "m1" | "m5" | "m20" | "racefit";

/** Racefit per renner op één parcours (`zrl-racefit.ts`). */
export type RacefitByRider = Record<string, number | null>;

export type RankingAvailability = "available" | "maybe" | "unavailable" | null;

export type RankingRider = {
  /** Profiel-id of rosterregel-id. */
  key: string;
  name: string;
  /** Leeg bij een rosternaam zonder account. */
  profileId: string | null;
  /**
   * Beste W/kg van de laatste 90 dagen; 15 s alleen voor Racefit. Per duur de
   * hoogste van ZwiftRacing (races) en intervals.icu (alle ritten), zie `bestPower`.
   */
  power: RankingPower | null;
  /** Waar elke duur vandaan komt. */
  powerSource?: Partial<Record<PowerKey, PowerSource>>;
  /** zFTP en zMAP uit de laatste WTRL-plak. */
  wtrl: { zftpWkg: number | null; zmapWkg: number | null } | null;
};

export type PowerKey = "s15" | "m1" | "m5" | "m20";
export type RankingPower = { s15?: number | null; m1: number | null; m5: number | null; m20: number | null };
export type PowerSource = "zwiftracing" | "intervals";

/** Bij een schatting: uit welke bron de 5 en 20 minuten kwamen; "mixed" als ze uit allebei kwamen. */
/**
 * `ladder`: de zMAP van de Club Ladder zelf (0372), alleen in de Ladderpuzzel;
 * `spread` is dan de Spread Value waar de ladder nu mee rekent.
 */
export type ZValue = {
  value: number;
  source: "estimate" | "wtrl" | "ladder";
  from?: PowerSource | "mixed";
  spread?: number | null;
};

const SOURCE_LABEL: Record<PowerSource, string> = { zwiftracing: "ZwiftRacing", intervals: "intervals.icu" };

/** Tooltip van een zFTP of zMAP: "WTRL", "Geschat, intervals.icu", … */
export function zValueSourceLabel(value: ZValue): string {
  if (value.source === "wtrl") return "WTRL";
  if (value.source === "ladder") {
    const spread = value.spread != null && value.spread !== value.value ? `, telt nu ${value.spread.toFixed(2).replace(".", ",")}` : "";
    return `Club Ladder, live${spread}`;
  }
  if (!value.from) return "Geschat";
  if (value.from === "mixed") return `Geschat, ${SOURCE_LABEL.zwiftracing} en ${SOURCE_LABEL.intervals}`;
  return `Geschat, ${SOURCE_LABEL[value.from]}`;
}

const POWER_KEYS: PowerKey[] = ["s15", "m1", "m5", "m20"];
const usable = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value) && value > 0;

/**
 * Per duur de hoogste van ZwiftRacing (alleen races) en intervals.icu (alle
 * ritten, ook training en buiten), allebei over 90 dagen (eigenaar, 2026-11-16:
 * "de meest actuele waarde, niet alleen uit races"). Bij gelijke waarde
 * ZwiftRacing. Null als geen van beide iets heeft.
 */
export function bestPower(
  zwiftracing: Partial<Record<PowerKey, number | null>> | null | undefined,
  intervals: Partial<Record<PowerKey, number | null>> | null | undefined,
): { power: RankingPower; source: Partial<Record<PowerKey, PowerSource>> } | null {
  const power: RankingPower = { s15: null, m1: null, m5: null, m20: null };
  const source: Partial<Record<PowerKey, PowerSource>> = {};
  for (const key of POWER_KEYS) {
    const zr = zwiftracing?.[key];
    const iv = intervals?.[key];
    if (usable(iv) && !(usable(zr) && zr >= iv)) {
      power[key] = iv;
      source[key] = "intervals";
    } else if (usable(zr)) {
      power[key] = zr;
      source[key] = "zwiftracing";
    }
  }
  return Object.keys(source).length > 0 ? { power, source } : null;
}

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

/** Critical power (W/kg) uit de beste 5 en 20 minuten: de helling van arbeid tegen tijd. */
export function criticalPower(m5: number, m20: number) {
  return (m20 * 1200 - m5 * 300) / 900;
}

export function estimateZ(rider: RankingRider): { zftp: ZValue | null; zmap: ZValue | null } {
  const pick = (
    estimate: number | null | undefined,
    wtrl: number | null | undefined,
    from?: ZValue["from"],
  ): ZValue | null =>
    estimate != null
      ? { value: round2(estimate), source: "estimate", ...(from ? { from } : {}) }
      : wtrl != null
        ? { value: wtrl, source: "wtrl" }
        : null;
  const m5 = rider.power?.m5 ?? null;
  const m20 = rider.power?.m20 ?? null;
  const from5 = rider.powerSource?.m5;
  const from20 = rider.powerSource?.m20;
  const zftp =
    m20 == null ? null : m5 != null ? ZFTP_FROM_CP * criticalPower(m5, m20) : ZFTP_FROM_20M * m20;
  const zftpFrom = m5 != null && from5 && from20 && from5 !== from20 ? "mixed" : from20;
  return {
    zftp: pick(zftp, rider.wtrl?.zftpWkg, zftpFrom),
    zmap: pick(m5 != null ? m5 * ZMAP_FROM_5M : null, rider.wtrl?.zmapWkg, from5),
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
    (zftp != null && zftp >= limit.ftp - ZFTP_ESTIMATE_MARGIN) ||
    (zmap != null && zmap >= limit.map - ZMAP_ESTIMATE_MARGIN)
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

export function sortValue(rider: RankedRider, key: RankingSortKey, racefit?: RacefitByRider | null): number | null {
  switch (key) {
    case "zftp":
      return rider.zftp?.value ?? null;
    case "zmap":
      return rider.zmap?.value ?? null;
    case "racefit":
      return racefit?.[rider.key] ?? null;
    default:
      return rider.power?.[key] ?? null;
  }
}

/** Sterkste boven; zonder waarde onderaan, daarbinnen op naam. Racefit vraagt de scores op dat parcours. */
export function sortRanking(riders: RankedRider[], key: RankingSortKey, racefit?: RacefitByRider | null): RankedRider[] {
  return [...riders].sort((a, b) => {
    const x = sortValue(a, key, racefit);
    const y = sortValue(b, key, racefit);
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
  options: {
    size?: number;
    /** Racefit op het parcours van dat team, voor sorteren op Racefit. */
    racefitOf?: (teamId: string) => RacefitByRider | null;
  } = {},
): { blocks: LineupBlock[]; assigned: Set<string> } {
  const size = options.size ?? ZRL_BLOCK_SIZE;
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
      options.racefitOf?.(team.id),
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
