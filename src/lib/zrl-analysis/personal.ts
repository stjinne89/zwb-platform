// De eigen race in een individuele Zwift-race (ZWBeter racen): FRR-etappes,
// andere races uit de kalender en races waarvan een lid de link plakte.
// Puur: geen I/O.
//
// De renner staat centraal: plek en tijd in de eigen startgroep, de achterstand
// op de winnaar, per segment wat hij verloor op de snelste van zijn groep, en de
// ZWB'ers in dezelfde race (alleen plek en tijd). Uitwerking: docs/zrl-analyse.md.

import type { RaceData } from "@/lib/zrl-live/snapshot";
import { scoreRace, type ZrlScoringFormat } from "@/lib/zrl-live/scoring";
import { routeSegments } from "@/lib/zwift/route-segments";
import { analyseRace, segmentKind, type RiderAnalysis, type SegmentKind } from "@/lib/zrl-analysis/race";

/** Soort race, voor de woorden en de tips. */
export type RaceKind = "race" | "tt" | "ttt";

export function raceKindOf(eventType: string | null | undefined, title?: string | null): RaceKind {
  if (eventType === "TEAM_TIME_TRIAL") return "ttt";
  if (eventType === "TIME_TRIAL" || /\bi?TT\b/i.test(title ?? "")) return "tt";
  return "race";
}

export type SegmentLoss = {
  index: number;
  name: string;
  kind: SegmentKind;
  elapsed: number;
  /** Snelste tijd in de eigen startgroep. */
  fastest: number;
  /** Seconden verloren op de snelste. */
  loss: number;
};

export type Peer = {
  zwiftId: number;
  name: string;
  subgroupLabel: string;
  rank: number;
  of: number;
  /** Finishtijd in ms vanaf de eigen start. */
  time: number | null;
  own: boolean;
};

export type PersonalRace = {
  kind: RaceKind;
  eventName: string;
  subgroupLabel: string;
  startAt: number;
  rider: RiderAnalysis;
  /** Finishers in de eigen startgroep. */
  finishers: number;
  winnerTime: number | null;
  /** Achterstand op de winnaar van de eigen groep, in ms. */
  gapToWinner: number | null;
  segmentLoss: SegmentLoss[];
  /** ZWB'ers in dezelfde race, alle startgroepen. */
  peers: Peer[];
  hasPower: boolean;
};

export function analysePersonalRace(
  data: RaceData,
  zwiftId: number,
  /** Zwift-ID → naam van ZWB'ers (profiel of roster). */
  zwbNames: Map<number, string>,
  kind: RaceKind,
  /**
   * Hoe de stand telt. Standaard zonder segmentpunten (FRR en andere races); een
   * ZRL-race in de terugblik telt zoals de ZRL (`data.format`).
   */
  format: ZrlScoringFormat = kind === "ttt" ? "ttt" : "scratch",
): PersonalRace | null {
  const subgroup = data.subgroups.find((s) => s.results.some((r) => r.profileId === zwiftId));
  if (!subgroup) return null;
  const route = subgroup.routeId ? routeSegments(subgroup.routeId, subgroup.laps) ?? [] : [];
  const riders = subgroup.entrants.map((e) => ({ athleteId: Number(e.zwiftId), name: e.name, team: null }));
  // Een renner die wel finishte maar niet bij de inschrijvers staat (laat
  // ingestapt), hoort er toch bij.
  for (const r of subgroup.results) {
    if (!riders.some((x) => x.athleteId === r.profileId)) riders.push({ athleteId: r.profileId, name: "", team: null });
  }
  const finished = subgroup.results.filter((r) => r.durationMs != null);
  const score = scoreRace({
    format,
    route: route.map(({ segmentId, name }) => ({ segmentId, name })),
    riders,
    passages: data.passages,
    startAt: subgroup.startAt,
    finishedAt: new Map(finished.map((r) => [r.profileId, subgroup.startAt + (r.durationMs as number) + 10_000])),
    rowGapMs: subgroup.rowGapMs,
    finish: {
      finishers: subgroup.results.map((r) => r.profileId),
      final: true,
      times: new Map(finished.map((r) => [r.profileId, r.durationMs as number])),
    },
  });
  const name = (id: number, fallback: string) => zwbNames.get(id) ?? fallback;
  const analysis = analyseRace(
    {
      subgroupLabel: subgroup.label,
      startAt: subgroup.startAt,
      ownTeam: null,
      ownRiders: [zwiftId],
      teamLabels: {},
      entrants: riders,
      score,
    },
    subgroup.results,
    data.passages,
    new Map([...zwbNames].filter(([id]) => id === zwiftId)),
  );
  const rider = analysis.riders.find((r) => r.athleteId === zwiftId);
  if (!rider) return null;

  const own = subgroup.results.find((r) => r.profileId === zwiftId);
  const winner = [...finished].sort((a, b) => a.rank - b.rank)[0];
  const winnerTime = winner?.durationMs ?? null;

  const segmentLoss: SegmentLoss[] = score.passes.flatMap((pass) => {
    const mine = pass.crossings.find((c) => c.athleteId === zwiftId);
    if (!mine || pass.crossings.length === 0) return [];
    const fastest = Math.min(...pass.crossings.map((c) => c.elapsed));
    return [{ index: pass.index, name: pass.name, kind: segmentKind(pass.name), elapsed: mine.elapsed, fastest, loss: Math.round((mine.elapsed - fastest) * 10) / 10 }];
  });

  const peers: Peer[] = data.subgroups.flatMap((s) => {
    const done = s.results.filter((r) => r.durationMs != null);
    return s.results
      .filter((r) => r.profileId === zwiftId || zwbNames.has(r.profileId))
      .map((r) => ({
        zwiftId: r.profileId,
        name: name(r.profileId, s.entrants.find((e) => Number(e.zwiftId) === r.profileId)?.name || "ZWB'er"),
        subgroupLabel: s.label,
        rank: r.rank,
        of: done.length,
        time: r.durationMs,
        own: r.profileId === zwiftId,
      }));
  });
  peers.sort((a, b) => a.subgroupLabel.localeCompare(b.subgroupLabel) || a.rank - b.rank);

  return {
    kind,
    eventName: data.eventName,
    subgroupLabel: subgroup.label,
    startAt: own?.finishedAt && own.durationMs ? own.finishedAt - own.durationMs : subgroup.startAt,
    rider,
    finishers: finished.length,
    winnerTime,
    gapToWinner: own?.durationMs != null && winnerTime !== null ? own.durationMs - winnerTime : null,
    segmentLoss,
    peers,
    hasPower: analysis.hasPower,
  };
}
