// Analyse van een gereden ZRL-race voor één ZWB-team (ZWBeter racen): de ploeg
// naast de andere teams in de groep, en per renner vermogen en segmenten.
//
// Puur: geen I/O. De invoer is de stand die de live ZRL-pagina ook gebruikt
// (`ZrlLiveView`), plus de ruwe Zwift-data met vermogen (`RaceData`). Alles
// komt uit Zwift, dus uit wat ook in de game en op ZwiftPower te zien is. Geen
// FTP of trainingsdata van leden: die zijn privé (zie ride.ts voor de eigen rit).
// Uitwerking en keuzes: docs/zrl-analyse.md.

import type { RaceCriticalPower, SubgroupResult } from "@/lib/events/zwift-club";
import type { Passage, ScoredPass, TeamScore, ZrlScoringFormat } from "@/lib/zrl-live/scoring";

/** Wat race.ts uit de live stand nodig heeft; `ZrlLiveView` past hierop. */
export type RaceViewInput = {
  subgroupLabel: string;
  startAt: number;
  ownTeam: string | null;
  ownRiders: number[];
  teamLabels: Record<string, string>;
  entrants: Array<{ athleteId: number; name: string; team: string | null }>;
  score: {
    format: ZrlScoringFormat;
    final: boolean;
    passes: ScoredPass[];
    riders: Array<{ athleteId: number; name: string; team: string | null; fal: number; fts: number; fin: number; podium: number; total: number; time: number | null; void: boolean }>;
    teams: TeamScore[];
    splits: Array<{ index: number; name: string; lap: number; teams: Array<{ team: string; row: number; gap: number }> }>;
  };
};

export type SegmentKind = "klim" | "sprint" | "segment";

export function segmentKind(name: string): SegmentKind {
  if (/kom|climb|klim/i.test(name)) return "klim";
  if (/sprint/i.test(name)) return "sprint";
  return "segment";
}

export type RiderSegment = {
  index: number;
  name: string;
  kind: SegmentKind;
  /** Seconden over het segment. */
  elapsed: number;
  watts: number | null;
  wkg: number | null;
  /** Plek op dit segment in de hele groep, snelste tijd eerst (zoals FTS telt). */
  rank: number;
  of: number;
  /** Plek over de streep van dit segment (zoals FAL telt). */
  falRank: number;
};

export type RiderAnalysis = {
  athleteId: number;
  name: string;
  /** Finishtijd in ms vanaf de eigen start, of null zonder finish. */
  time: number | null;
  /** Plek in de groep. */
  rank: number | null;
  avgWatts: number | null;
  wkg: number | null;
  powerType: string | null;
  criticalPower: RaceCriticalPower | null;
  /** Beste 20 minuten in W/kg. */
  cp20Wkg: number | null;
  /** Punten (puntenrace en scratch); 0 in een ploegentijdrit. */
  points: number;
  /** In een ploegentijdrit: niet bij de ploeg gefinisht (later dan de vierde plus de marge). */
  dropped: boolean;
  segments: RiderSegment[];
  /**
   * Mediaan van het gemiddelde W/kg van de (hooguit vijf) renners die in de
   * groep direct voor deze renner finishten; null zonder die gegevens.
   */
  aheadWkg: number | null;
};

export type TeamSection = {
  /** "Start → SPRINT Reverse", "→ finish". */
  name: string;
  kind: SegmentKind | "finish";
  /** Tijd die de eigen ploeg op dit stuk won (+) of verloor (−) op de tegenstander, in ms. */
  versusRival: number;
  /** De ploeg die dit stuk het snelst reed. */
  fastest: string;
};

export type RaceAnalysis = {
  format: ZrlScoringFormat;
  subgroupLabel: string;
  final: boolean;
  /** De eigen ploeg in de teamstand, of null als het team niet gevonden is. */
  team: (TeamScore & { label: string }) | null;
  teams: Array<TeamScore & { label: string; own: boolean }>;
  /** De ploeg waarmee de eigen ploeg vergeleken wordt: de dichtstbijzijnde in de uitslag. */
  rival: { team: string; label: string } | null;
  /** TTT: voorsprong op de tegenstander bij elk tussenpunt, in ms (+ is voor). */
  gapTrace: Array<{ name: string; kind: SegmentKind | "finish"; ahead: number }>;
  sections: TeamSection[];
  /** TTT: tussen de eerste en de vierde finisher van de ploeg, in ms. */
  spread: number | null;
  riders: RiderAnalysis[];
  /** Segmenten van de route in volgorde. */
  route: Array<{ index: number; name: string; kind: SegmentKind; lap: number }>;
  /** Er was vermogen in de uitslag of de passages. */
  hasPower: boolean;
  /** Een race zonder draft (Race of Truth): positie en wiel tellen niet. */
  noDraft: boolean;
  findings: string[];
};

/** Zoveel renners direct voor iemand tellen mee voor `aheadWkg`. */
const AHEAD_RIDERS = 5;
/** Wie later dan de vierde plus dit finisht, reed niet meer met de ploeg. */
export const DROPPED_MARGIN_MS = 30_000;
/** Zoveel renners tellen voor de ploegtijd in een TTT. */
const TTT_RIDERS = 4;

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function wkgOf(watts: number | null | undefined, kg: number | null | undefined): number | null {
  if (!watts || !kg) return null;
  return Math.round((watts / kg) * 100) / 100;
}

function seconds(ms: number) {
  return round1(Math.abs(ms) / 1000).toLocaleString("nl-NL");
}

/**
 * De ploeg waarmee vergeleken wordt: bij een eerste plaats de tweede, anders
 * de ploeg één plaats hoger. Alleen ploegen met een uitslag (tijd of punten).
 */
function pickRival(teams: TeamScore[], own: TeamScore | undefined): TeamScore | undefined {
  if (!own) return undefined;
  const ranked = teams.filter((t) => t.team !== own.team);
  if (ranked.length === 0) return undefined;
  const ahead = ranked.filter((t) => t.rank < own.rank).sort((a, b) => b.rank - a.rank)[0];
  return ahead ?? ranked.sort((a, b) => a.rank - b.rank)[0];
}

export function analyseRace(
  view: RaceViewInput,
  results: SubgroupResult[],
  passages: Passage[],
  /** Platformnaam per Zwift-ID; zonder naam blijft de Zwift-naam ("2. Jeroen (ZWB)"). */
  names: Map<number, string> = new Map(),
  options: { noDraft?: boolean } = {},
): RaceAnalysis {
  const { score } = view;
  const ownIds = new Set(view.ownRiders);
  const label = (team: string) => view.teamLabels[team] ?? team;
  const ownScore = view.ownTeam ? score.teams.find((t) => t.team === view.ownTeam) : undefined;
  const rivalScore = pickRival(score.teams, ownScore);

  // Vermogen per passage: dezelfde passage staat in de stand (crossing) en in de ruwe data.
  const powerByCrossing = new Map<string, Passage>();
  for (const p of passages) powerByCrossing.set(`${p.athleteId}:${p.ts}`, p);
  const resultById = new Map(results.map((r) => [r.profileId, r]));
  const finishOrder = [...results].filter((r) => r.durationMs != null).sort((a, b) => a.rank - b.rank);
  /** W/kg van de renners die direct voor deze renner finishten. */
  const aheadWkg = (id: number): number | null => {
    const at = finishOrder.findIndex((r) => r.profileId === id);
    if (at <= 0) return null;
    const values = finishOrder
      .slice(Math.max(0, at - AHEAD_RIDERS), at)
      .flatMap((r) => (r.avgWatts && r.weightKg ? [r.avgWatts / r.weightKg] : []))
      .sort((a, b) => a - b);
    if (values.length < 3) return null;
    return Math.round(values[values.length >> 1] * 100) / 100;
  };
  const hasPower = results.some((r) => r.avgWatts) || passages.some((p) => p.avgPower);

  const route = score.passes.map((pass) => ({ index: pass.index, name: pass.name, kind: segmentKind(pass.name), lap: pass.lap }));

  // Ploegtijd van de eigen ploeg, voor "gelost".
  const ownTimes = score.riders
    .filter((r) => ownIds.has(r.athleteId) && r.time !== null)
    .map((r) => r.time as number)
    .sort((a, b) => a - b);
  const teamTime = ownTimes.length >= TTT_RIDERS ? ownTimes[TTT_RIDERS - 1] : null;

  const riders: RiderAnalysis[] = score.riders
    .filter((r) => ownIds.has(r.athleteId))
    .map((r) => {
      const result = resultById.get(r.athleteId);
      const kg = result?.weightKg ?? null;
      const segments: RiderSegment[] = [];
      for (const pass of score.passes) {
        const ordered = [...pass.crossings].sort((a, b) => a.elapsed - b.elapsed);
        const at = ordered.findIndex((c) => c.athleteId === r.athleteId);
        if (at < 0) continue;
        const falRank = [...pass.crossings].sort((a, b) => a.ts - b.ts).findIndex((c) => c.athleteId === r.athleteId) + 1;
        const crossing = ordered[at];
        const raw = powerByCrossing.get(`${crossing.athleteId}:${crossing.ts}`);
        const watts = raw?.avgPower ?? null;
        segments.push({
          index: pass.index,
          name: pass.name,
          kind: segmentKind(pass.name),
          elapsed: crossing.elapsed,
          watts,
          wkg: wkgOf(watts, raw?.weightKg ?? kg),
          rank: at + 1,
          of: ordered.length,
          falRank,
        });
      }
      const cp = result?.criticalPower ?? null;
      return {
        athleteId: r.athleteId,
        name: names.get(r.athleteId) ?? r.name,
        time: r.time,
        rank: result?.rank ?? null,
        avgWatts: result?.avgWatts ?? null,
        wkg: wkgOf(result?.avgWatts, kg),
        powerType: result?.powerType ?? null,
        criticalPower: cp,
        cp20Wkg: wkgOf(cp?.m20, kg),
        points: score.format === "ttt" ? 0 : r.total,
        dropped: score.format === "ttt" && teamTime !== null && (r.time === null || r.time > teamTime + DROPPED_MARGIN_MS),
        segments,
        aheadWkg: score.format === "ttt" ? null : aheadWkg(r.athleteId),
      };
    })
    .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity) || a.name.localeCompare(b.name));

  // Ploegentijdrit: voorsprong op de tegenstander per tussenpunt en per stuk.
  const gapTrace: RaceAnalysis["gapTrace"] = [];
  const sections: TeamSection[] = [];
  if (score.format === "ttt" && ownScore && rivalScore) {
    let previous = 0;
    let previousName = "Start";
    const fastestOn = new Map<number, string>();
    for (const split of score.splits) {
      const own = split.teams.find((t) => t.team === ownScore.team);
      const rival = split.teams.find((t) => t.team === rivalScore.team);
      if (!own || !rival) continue;
      const ahead = rival.gap - own.gap;
      const kind = segmentKind(split.name);
      gapTrace.push({ name: split.name, kind, ahead });
      // Snelste ploeg op dit stuk: kleinste toename van de achterstand sinds het vorige punt.
      const prev = score.splits.find((s) => s.index === split.index - 1);
      const gained = split.teams.map((t) => ({ team: t.team, delta: t.gap - (prev?.teams.find((p) => p.team === t.team)?.gap ?? 0) }));
      const fastest = gained.sort((a, b) => a.delta - b.delta)[0]?.team ?? ownScore.team;
      fastestOn.set(split.index, fastest);
      sections.push({ name: `${previousName} → ${split.name}`, kind, versusRival: ahead - previous, fastest: label(fastest) });
      previous = ahead;
      previousName = split.name;
    }
    if (ownScore.time !== null && rivalScore.time !== null) {
      const ahead = rivalScore.time - ownScore.time;
      gapTrace.push({ name: "Finish", kind: "finish", ahead });
      const lastSplit = score.splits.at(-1);
      const finishDelta = score.teams
        .filter((t) => t.time !== null)
        .map((t) => ({ team: t.team, delta: (t.time as number) - (lastSplit?.teams.find((s) => s.team === t.team)?.gap ?? NaN) }));
      // Zonder tussentijd van een ploeg is het snelste slotstuk niet eerlijk te bepalen.
      const comparable = finishDelta.filter((d) => Number.isFinite(d.delta));
      const fastestTeam = comparable.length === finishDelta.length && comparable.length > 0
        ? comparable.sort((a, b) => a.delta - b.delta)[0].team
        : null;
      sections.push({ name: `${previousName} → finish`, kind: "finish", versusRival: ahead - previous, fastest: fastestTeam ? label(fastestTeam) : "—" });
    }
  }

  const spread = score.format === "ttt" && ownTimes.length >= TTT_RIDERS ? ownTimes[TTT_RIDERS - 1] - ownTimes[0] : null;

  const findings: string[] = [];
  if (ownScore) {
    const place = `${ownScore.rank}e van ${score.teams.length}`;
    if (score.format === "ttt" && rivalScore && ownScore.time !== null && rivalScore.time !== null) {
      const diff = rivalScore.time - ownScore.time;
      findings.push(
        diff >= 0
          ? `${place}, ${seconds(diff)} s voor ${label(rivalScore.team)}.`
          : `${place}, ${seconds(diff)} s achter ${label(rivalScore.team)}.`,
      );
    } else if (score.format !== "ttt") {
      findings.push(`${place} met ${ownScore.total} punten.`);
    }
  }
  if (sections.length > 1) {
    const best = [...sections].sort((a, b) => b.versusRival - a.versusRival)[0];
    const worst = [...sections].sort((a, b) => a.versusRival - b.versusRival)[0];
    // Een stuk loopt tot en met het genoemde segment: "naar de Zwift KOM" omvat de klim.
    const to = (section: TeamSection) => (section.kind === "finish" ? "de finish" : section.name.replace(/^.*→ /, ""));
    if (best.versusRival > 0) findings.push(`Meeste winst op het stuk naar ${to(best)}: ${seconds(best.versusRival)} s.`);
    if (worst.versusRival < 0) findings.push(`Meeste verlies op het stuk naar ${to(worst)}: ${seconds(worst.versusRival)} s.`);
  }
  if (spread !== null) findings.push(`De vier snelste binnen ${seconds(spread)} s over de streep.`);
  for (const rider of riders.filter((r) => r.dropped)) findings.push(`${rider.name} finishte niet bij de ploeg.`);
  if (score.format !== "ttt") {
    const top = [...riders].sort((a, b) => b.points - a.points)[0];
    if (top && top.points > 0) findings.push(`Meeste punten: ${top.name} (${top.points}).`);
  }
  if (!hasPower) findings.push("Zwift gaf geen vermogen voor deze race.");

  return {
    format: score.format,
    subgroupLabel: view.subgroupLabel,
    final: score.final,
    team: ownScore ? { ...ownScore, label: label(ownScore.team) } : null,
    teams: score.teams.map((t) => ({ ...t, label: label(t.team), own: t.team === ownScore?.team })),
    rival: rivalScore ? { team: rivalScore.team, label: label(rivalScore.team) } : null,
    gapTrace,
    sections,
    spread,
    riders,
    route,
    hasPower,
    noDraft: options.noDraft ?? false,
    findings,
  };
}
