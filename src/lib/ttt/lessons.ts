// Cheatsheet voor een ploegentijdrit in de TTT Planner: vuistregels uit het
// onderzoek, een check van het plan, en wat eerdere ploegentijdritten van het
// team en van de renners lieten zien. Puur: geen I/O. De races komen uit
// loadTttRaces (zrl-analysis/load.ts); de regels uit zrl-analysis/advice.ts.
// Onderbouwing: docs/racestrategie-onderzoek.md, sectie 3.

import {
  dropClimb,
  heaviestOnClimb,
  planCompositionAdvice,
  teamAdvice,
  tttPlanAdvice,
  type Advice,
  type PlanRider,
} from "@/lib/zrl-analysis/advice";
import type { TttRaceRecord } from "@/lib/zrl-analysis/load";
import { raceTime, signedSeconds, wkg } from "@/lib/zrl-analysis/format";

/**
 * Vuistregels uit het onderzoek (Zwift Insider over de beste WTRL-ploegen, WTRL,
 * en de eigen meting van 13 oktober). Vast, zodat ze bij elk plan klaarstaan.
 */
export const TTT_RULES: string[] = [
  "Kopbeurten van 20 tot 30 s op 120 tot 130% van de gemiddelde FTP van de ploeg, daarna rust in het wiel.",
  "In het wiel: op plek twee 95 tot 100% van de FTP, vanaf plek drie rond 85%.",
  "Renners 15% onder de gemiddelde FTP weinig kopbeurten, 20% eronder alleen in het wiel.",
  "Op klimmen vanaf ongeveer 3% één W/kg-doel voor de hele ploeg, op het vlakke een wattdoel.",
  "De vierde renner telt: wie op de laatste klim kan lossen, rijdt in het halfuur ervoor korte beurten. Lost iemand toch, dan eerst een laatste volle beurt.",
  "Een wissel kost tijd: op 13 oktober lag de nieuwe renner 11 tot 15 s na \"Wissel\" pas vooraan. Vaste volgorde, en overslaan hardop melden.",
];

export type CheatsheetRace = {
  eventId: string;
  title: string;
  startAt: string;
  teamName: string | null;
  /** "1e van 8 · 43:18,7 · +18,1 s op OTR". */
  result: string;
  /** Feiten zonder tip: waar de ploeg won, hoe dicht ze binnenkwam. */
  facts: string[];
  lessons: Advice[];
};

export type CheatsheetRider = {
  zwiftId: number;
  name: string;
  /** Per eerdere ploegentijdrit één regel. */
  history: string[];
  lessons: Advice[];
};

export type Cheatsheet = {
  rules: string[];
  plan: Advice[];
  races: CheatsheetRace[];
  riders: CheatsheetRider[];
};

/** Kopbeurt vanaf zoveel van de eigen FTP en zo lang telt als zwaar, voor een renner die eerder loste. */
const HEAVY_PULL_SHARE = 1.1;
const HEAVY_PULL_S = 60;
/** Gemiddeld vanaf zoveel van de eigen FTP reed iemand aan de grens. */
const AT_LIMIT_SHARE = 0.98;

const dateLabel = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" });
const pct = (share: number) => `${Math.round(100 * share)}%`;

function raceLine(record: TttRaceRecord) {
  const { analysis } = record;
  const team = analysis.team;
  if (!team) return "";
  const rival = analysis.teams.find((t) => t.team === analysis.rival?.team);
  const parts = [`${team.rank}e van ${analysis.teams.length}`, raceTime(team.time)];
  if (rival?.time != null && team.time !== null) parts.push(`${signedSeconds(rival.time - team.time)} op ${analysis.rival?.label}`);
  return parts.join(" · ");
}

function raceFacts(record: TttRaceRecord) {
  const { analysis } = record;
  const facts: string[] = [];
  const best = [...analysis.sections].sort((a, b) => b.versusRival - a.versusRival)[0];
  if (best && best.versusRival >= 2000) facts.push(`Meeste winst op het stuk naar ${best.name.replace(/^.*→ /, "")}: ${signedSeconds(best.versusRival)}.`);
  if (analysis.spread !== null) facts.push(`De vier snelsten binnen ${signedSeconds(analysis.spread).replace("+", "")}.`);
  return facts;
}

/** Een regel per eerdere race van deze renner: wanneer, met welk team, en wat opviel. */
function historyLine(record: TttRaceRecord, zwiftId: number) {
  const rider = record.analysis.riders.find((r) => r.athleteId === zwiftId);
  if (!rider) return null;
  const parts = [`${dateLabel.format(new Date(record.startAt))}, ${record.teamName ?? "team"}`];
  if (rider.dropped) {
    const climb = dropClimb(record.analysis, rider);
    parts.push(climb ? `gelost op ${climb}` : "niet bij de ploeg gefinisht");
  }
  if (rider.wkg !== null) parts.push(`gemiddeld ${wkg(rider.wkg)} W/kg`);
  const climbs = rider.segments.filter((s) => s.kind === "klim" && s.wkg !== null && !rider.dropped);
  if (climbs.length) parts.push(climbs.map((s) => `${s.name} ${wkg(s.wkg)} W/kg`).join(", "));
  return { line: parts.join(" · "), rider };
}

function riderLessons(name: string, zwiftId: number, records: TttRaceRecord[], current: PlanRider | undefined): Advice[] {
  const lessons: Advice[] = [];
  const mine = records.filter((r) => r.analysis.riders.some((x) => x.athleteId === zwiftId));
  const latestDrop = mine.find((r) => r.analysis.riders.find((x) => x.athleteId === zwiftId)?.dropped);
  if (latestDrop) {
    const rider = latestDrop.analysis.riders.find((x) => x.athleteId === zwiftId)!;
    const climb = dropClimb(latestDrop.analysis, rider);
    const where = climb ? ` op ${climb}` : "";
    const heavy =
      current?.ftp && current.pullWatts && current.pullSeconds && current.pullWatts / current.ftp >= HEAVY_PULL_SHARE && current.pullSeconds >= HEAVY_PULL_S
        ? ` Dit plan vraagt weer ${current.pullWatts} W gedurende ${current.pullSeconds} s (${pct(current.pullWatts / current.ftp)} van de eigen FTP).`
        : "";
    lessons.push({
      finding: `${name} loste ${dateLabel.format(new Date(latestDrop.startAt))}${where}.${heavy}`,
      tip: climb
        ? `Korte beurten voor ${name} in het halfuur voor de laatste klim; die klim moet met de ploeg.`
        : `Bespreek met ${name} waar het misging en plan lichtere beurten.`,
    });
  }
  const heaviest = mine
    .map((r) => {
      const rider = r.analysis.riders.find((x) => x.athleteId === zwiftId)!;
      return { r, h: heaviestOnClimb(r.analysis, rider) };
    })
    .find((x) => x.h);
  if (heaviest?.h) {
    lessons.push({
      finding: `${name} had ${dateLabel.format(new Date(heaviest.r.startAt))} op ${heaviest.h.climb} het meeste vermogen van de ploeg nodig: ${heaviest.h.watts} W.`,
      tip: `Geen lange beurt voor ${name} vlak voor een klim; laat een lichtere renner daar het tempo maken.`,
    });
  }
  for (const r of mine) {
    const rider = r.analysis.riders.find((x) => x.athleteId === zwiftId)!;
    const ftp = r.plan.find((p) => p.zwiftId === zwiftId)?.ftp ?? current?.ftp ?? null;
    if (!ftp || !rider.avgWatts || rider.dropped) continue;
    const share = rider.avgWatts / ftp;
    if (share < AT_LIMIT_SHARE) continue;
    lessons.push({
      finding: `${name} reed ${dateLabel.format(new Date(r.startAt))} gemiddeld ${pct(share)} van de eigen FTP en bleef bij de ploeg.`,
      tip: `Dat was de grens: plan ${name} niet zwaarder dan toen.`,
    });
    break;
  }
  return lessons;
}

export function buildCheatsheet({
  records,
  teamIds,
  riders,
}: {
  /** Alle gereden ploegentijdritten, nieuwste eerst. */
  records: TttRaceRecord[];
  /** Het team (en de subteams) waarvoor gepland wordt. */
  teamIds: string[];
  /** De renners van het plan of de opstelling; FTP en kopbeurt als die bekend zijn. */
  riders: Array<PlanRider & { zwiftId: number | null }>;
}): Cheatsheet {
  const teamSet = new Set(teamIds);
  const plan = planCompositionAdvice(riders);
  const races: CheatsheetRace[] = records
    .filter((r) => teamSet.has(r.teamId))
    .map((r) => {
      // Wat "Dit plan" al zegt, hoeft niet nog eens bij de race.
      const seen = new Set<string>(plan.map((a) => a.finding));
      const lessons = [...tttPlanAdvice(r.analysis, r.plan), ...teamAdvice(r.analysis)].filter((a) =>
        seen.has(a.finding) ? false : (seen.add(a.finding), true),
      );
      return { eventId: r.eventId, title: r.title, startAt: r.startAt, teamName: r.teamName, result: raceLine(r), facts: raceFacts(r), lessons };
    });

  const cheatRiders: CheatsheetRider[] = riders.flatMap((p) => {
    if (p.zwiftId === null) return [];
    const history = records.flatMap((r) => {
      const h = historyLine(r, p.zwiftId as number);
      return h ? [h.line] : [];
    });
    if (history.length === 0) return [];
    return [{ zwiftId: p.zwiftId, name: p.name, history, lessons: riderLessons(p.name, p.zwiftId, records, p) }];
  });

  return { rules: TTT_RULES, plan, races, riders: cheatRiders };
}
