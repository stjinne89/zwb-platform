// Segmentrecords op het racebriefje: per sprint en KOM de eigen PR van onze
// renners, de snelste PR van het startveld als richttijd, en de watt die je
// nodig hebt om die tijd te rijden. Puur: geen I/O.
//
// Vraag van de eigenaar (2026-10-26). De PR's komen uit Zwift (laatste 90 dagen,
// zie segment-bests.ts). De benodigde watt is de w/kg van de renner met de
// richttijd maal je eigen gewicht: een benadering, want hoeveel slipstream er op
// die passage was, zie je er niet aan. Een rekenmodel zonder slipstream zou het
// in een sprint juist overschatten.

import { segmentLabel, type BriefingSegment } from "./route";

/** De snelste passage van één renner op één Zwift-segment, of null als er geen was. */
export type SegmentBest = {
  zwiftId: number;
  segmentId: string;
  seconds: number | null;
  watts: number | null;
  weightKg: number | null;
  at: string | null;
  fetchedAt: string;
};

export type SegmentPr = { seconds: number; watts: number | null; wkg: number | null };

export type SegmentTarget = SegmentPr & {
  zwiftId: number;
  name: string;
  /** Uit het startveld, of (zonder groep bij Zwift) alleen uit onze ploeg. */
  scope: "veld" | "ploeg";
};

export type SegmentRecordRider = {
  zwiftId: number;
  name: string;
  pr: SegmentPr | null;
  /** Watt voor de richttijd; null zonder bekend gewicht of zonder w/kg van de richttijd. */
  neededWatts: number | null;
  /** Deze renner heeft zelf de richttijd. */
  holder: boolean;
  /** Al opgezocht bij Zwift; zo niet, dan volgt de PR nog. */
  fetched: boolean;
};

export type SegmentRecord = {
  segmentId: string;
  label: string;
  kind: BriefingSegment["kind"];
  /** Km van de eerste passage; zo vaak ligt hij op de route. */
  firstKm: number;
  passes: number;
  target: SegmentTarget | null;
  riders: SegmentRecordRider[];
};

const prOf = (best: SegmentBest | undefined): SegmentPr | null => {
  if (!best || best.seconds === null) return null;
  const wkg = best.watts && best.weightKg ? best.watts / best.weightKg : null;
  return { seconds: best.seconds, watts: best.watts, wkg };
};

/** Het gewicht van de laatste passage met een gewicht, over alle segmenten. */
export function latestWeights(bests: SegmentBest[]): Map<number, number> {
  const latest = new Map<number, { at: string; kg: number }>();
  for (const best of bests) {
    if (!best.weightKg || !best.at) continue;
    const known = latest.get(best.zwiftId);
    if (!known || best.at > known.at) latest.set(best.zwiftId, { at: best.at, kg: best.weightKg });
  }
  return new Map([...latest].map(([id, { kg }]) => [id, kg]));
}

/**
 * Per Zwift-segment op de route één regel, in de volgorde van de eerste passage.
 * Segmenten zonder Zwift-ID vallen weg: daar hebben we geen PR's van.
 */
export function segmentRecords(input: {
  segments: BriefingSegment[];
  /** Zwift-segment-ID per slug van zwift-data. */
  segmentIds: Map<string, string>;
  bests: SegmentBest[];
  own: Array<{ zwiftId: number; name: string }>;
  /** Het startveld met namen, inclusief onze renners; leeg zonder groep bij Zwift. */
  field: Array<{ zwiftId: number; name: string }>;
}): SegmentRecord[] {
  const bestBy = new Map(input.bests.map((b) => [`${b.zwiftId}:${b.segmentId}`, b]));
  const weights = latestWeights(input.bests);
  const scope: SegmentTarget["scope"] = input.field.length > 0 ? "veld" : "ploeg";
  const candidates = scope === "veld" ? input.field : input.own;

  const records: SegmentRecord[] = [];
  for (const segment of input.segments) {
    const segmentId = input.segmentIds.get(segment.slug);
    if (!segmentId) continue;
    const known = records.find((r) => r.segmentId === segmentId);
    if (known) {
      known.passes += 1;
      continue;
    }
    let target: SegmentTarget | null = null;
    for (const rider of candidates) {
      const pr = prOf(bestBy.get(`${rider.zwiftId}:${segmentId}`));
      if (pr && (!target || pr.seconds < target.seconds)) target = { ...pr, zwiftId: rider.zwiftId, name: rider.name, scope };
    }
    const riders = input.own.map((rider): SegmentRecordRider => {
      const best = bestBy.get(`${rider.zwiftId}:${segmentId}`);
      const pr = prOf(best);
      const holder = target?.zwiftId === rider.zwiftId;
      const weight = weights.get(rider.zwiftId) ?? null;
      const neededWatts = holder ? (pr?.watts ?? null) : target?.wkg && weight ? Math.round(target.wkg * weight) : null;
      return { zwiftId: rider.zwiftId, name: rider.name, pr, neededWatts, holder, fetched: best !== undefined };
    });
    records.push({ segmentId, label: segmentLabel(segment, false), kind: segment.kind, firstKm: segment.startKm, passes: 1, target, riders });
  }
  return records;
}
