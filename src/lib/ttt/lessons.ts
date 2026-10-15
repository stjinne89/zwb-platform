// Spiekbriefje voor een ploegentijdrit in de TTT Planner: vuistregels uit het
// onderzoek, een check van het plan, en wat eerdere ploegentijdritten van het
// team en van de renners lieten zien. Puur: geen I/O. De races komen uit
// loadTttRaces (zrl-analysis/load.ts); de regels uit zrl-analysis/advice.ts.
// Alles is kort en gestructureerd, zodat het scherm het als spiekbrief kan tonen.
// Onderbouwing: docs/racestrategie-onderzoek.md, sectie 3.

import {
  dropClimb,
  heaviestOnClimb,
  planComposition,
  planCompositionAdvice,
  teamAdvice,
  tttPlanAdvice,
  type PlanComposition,
  type PlanRider,
} from "@/lib/zrl-analysis/advice";
import type { TttRaceRecord } from "@/lib/zrl-analysis/load";

/** Een vuistregel: het getal om te onthouden, en waar het over gaat. */
export type CheatRule = { value: string; text: string };

/**
 * Vuistregels uit het onderzoek (Zwift Insider over de beste WTRL-ploegen, WTRL,
 * en de eigen meting van 13 oktober). Vast, zodat ze bij elk plan klaarstaan.
 */
export const TTT_RULES: CheatRule[] = [
  { value: "20–30 s", text: "Kopbeurt, daarna rust in het wiel" },
  { value: "120–130%", text: "Kopvermogen, van de gemiddelde FTP" },
  { value: "95–100%", text: "Op plek 2 in het wiel; vanaf plek 3 rond 85%" },
  { value: "−15%", text: "FTP onder het gemiddelde: weinig kopbeurten" },
  { value: "−20%", text: "FTP onder het gemiddelde: alleen in het wiel" },
  { value: "≥ 3%", text: "Klim: één W/kg-doel voor de ploeg; vlak: wattdoel" },
  { value: "30 min", text: "Voor de laatste klim korte beurten voor wie kan lossen" },
  { value: "1 beurt", text: "Wie lost, trekt eerst nog één volle beurt" },
  { value: "11–15 s", text: "Kost een wissel: vaste volgorde, overslaan hardop melden" },
];

/** De doelband voor het kopvermogen, als deel van de gemiddelde FTP. */
export const PULL_TARGET = { low: 1.2, high: 1.3 } as const;

/** Een les als label en korte opdracht. */
export type CheatFlag = {
  /** warn: ging eerder mis; limit: zat aan de grens; note: om rekening mee te houden. */
  tone: "warn" | "limit" | "note";
  label: string;
  tip: string;
};

export type CheatsheetRace = {
  eventId: string;
  startAt: string;
  teamName: string | null;
  rank: number | null;
  of: number;
  /** Eindtijd in ms. */
  time: number | null;
  /** Verschil met de dichtstbijzijnde ploeg, in ms (+ is voor). */
  rival: { label: string; deltaMs: number } | null;
  /** Hoe dicht de vier snelsten binnenkwamen, in ms. */
  spreadMs: number | null;
  /** Winst (+) of verlies (−) op die ploeg per stuk, tot en met het genoemde punt. */
  sections: Array<{ name: string; deltaMs: number }>;
  /** Wat de ploeg als geheel anders kan; lessen over één renner staan bij die renner. */
  tips: string[];
};

export type CheatsheetRide = {
  startAt: string;
  teamName: string | null;
  wkg: number | null;
  /** De klim waar de renner loste; true als dat niet op een klim was. */
  dropped: string | true | null;
  climbs: Array<{ name: string; wkg: number }>;
};

export type CheatsheetRider = {
  zwiftId: number;
  name: string;
  rides: CheatsheetRide[];
  flags: CheatFlag[];
};

export type Cheatsheet = {
  rules: CheatRule[];
  plan: PlanComposition | null;
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

function race(record: TttRaceRecord, skip: Set<string>): CheatsheetRace {
  const { analysis } = record;
  const team = analysis.team;
  const rival = analysis.teams.find((t) => t.team === analysis.rival?.team);
  // Een les die met een rennernaam begint, hoort bij die renner, niet bij de ploeg.
  const names = analysis.riders.map((r) => r.name);
  const tips: string[] = [];
  for (const advice of [...tttPlanAdvice(analysis, record.plan), ...teamAdvice(analysis)]) {
    if (skip.has(advice.finding) || names.some((n) => advice.finding.startsWith(n)) || tips.includes(advice.tip)) continue;
    tips.push(advice.tip);
  }
  return {
    eventId: record.eventId,
    startAt: record.startAt,
    teamName: record.teamName,
    rank: team?.rank ?? null,
    of: analysis.teams.length,
    time: team?.time ?? null,
    rival:
      rival?.time != null && team?.time != null && analysis.rival
        ? { label: analysis.rival.label, deltaMs: rival.time - team.time }
        : null,
    spreadMs: analysis.spread,
    sections: analysis.sections.map((s) => ({ name: s.name.replace(/^.*→\s*/, ""), deltaMs: s.versusRival })),
    tips,
  };
}

function ride(record: TttRaceRecord, zwiftId: number): CheatsheetRide | null {
  const rider = record.analysis.riders.find((r) => r.athleteId === zwiftId);
  if (!rider) return null;
  return {
    startAt: record.startAt,
    teamName: record.teamName,
    wkg: rider.wkg,
    dropped: rider.dropped ? (dropClimb(record.analysis, rider) ?? true) : null,
    climbs: rider.dropped
      ? []
      : rider.segments.flatMap((s) => (s.kind === "klim" && s.wkg !== null ? [{ name: s.name, wkg: s.wkg }] : [])),
  };
}

function riderFlags(zwiftId: number, records: TttRaceRecord[], current: PlanRider | undefined): CheatFlag[] {
  const flags: CheatFlag[] = [];
  const mine = records.filter((r) => r.analysis.riders.some((x) => x.athleteId === zwiftId));
  const find = (r: TttRaceRecord) => r.analysis.riders.find((x) => x.athleteId === zwiftId)!;

  const latestDrop = mine.find((r) => find(r).dropped);
  if (latestDrop) {
    const climb = dropClimb(latestDrop.analysis, find(latestDrop));
    flags.push({
      tone: "warn",
      label: climb ? `Loste op ${climb}` : "Loste",
      tip: climb ? "Korte beurten in het halfuur voor de laatste klim" : "Lichtere beurten plannen",
    });
    if (current?.ftp && current.pullWatts && current.pullSeconds) {
      const share = current.pullWatts / current.ftp;
      if (share >= HEAVY_PULL_SHARE && current.pullSeconds >= HEAVY_PULL_S) {
        flags.push({
          tone: "warn",
          label: `Plan: ${current.pullWatts} W · ${current.pullSeconds} s · ${pct(share)}`,
          tip: "Korter of lichter maken",
        });
      }
    }
  }

  const heaviest = mine.map((r) => heaviestOnClimb(r.analysis, find(r))).find(Boolean);
  if (heaviest) {
    flags.push({ tone: "note", label: `Zwaarst op ${heaviest.climb}: ${heaviest.watts} W`, tip: "Geen lange beurt vlak voor een klim" });
  }

  for (const r of mine) {
    const rider = find(r);
    const ftp = r.plan.find((p) => p.zwiftId === zwiftId)?.ftp ?? current?.ftp ?? null;
    if (!ftp || !rider.avgWatts || rider.dropped || rider.avgWatts / ftp < AT_LIMIT_SHARE) continue;
    flags.push({
      tone: "limit",
      label: `Grens: ${pct(rider.avgWatts / ftp)} FTP`,
      tip: `Niet zwaarder plannen dan ${dateLabel.format(new Date(r.startAt))}`,
    });
    break;
  }
  return flags;
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
  // Wat de check van dit plan al zegt, hoeft niet nog eens bij een race.
  const skip = new Set(planCompositionAdvice(riders).map((a) => a.finding));
  const races = records.filter((r) => teamSet.has(r.teamId)).map((r) => race(r, skip));

  const cheatRiders: CheatsheetRider[] = riders.flatMap((p) => {
    if (p.zwiftId === null) return [];
    const zwiftId = p.zwiftId;
    const rides = records.flatMap((r) => ride(r, zwiftId) ?? []);
    if (rides.length === 0) return [];
    return [{ zwiftId, name: p.name, rides, flags: riderFlags(zwiftId, records, p) }];
  });

  return { rules: TTT_RULES, plan: planComposition(riders), races, riders: cheatRiders };
}
