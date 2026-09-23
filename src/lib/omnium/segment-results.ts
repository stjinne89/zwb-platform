// Sprint Quali uit Zwifts segmentresultaten.
//
// Zwifts uitslag (`race-results/entries`) kent geen segmenttijden, de
// segmentresultaten wel: alle passages van iedereen in een tijdvenster, met de
// tijd in milliseconden. Dezelfde bron als de live ZRL-stand, zie
// docs/live-zrl-dashboard.md. Per renner telt de snelste passage binnen het
// onderdeel; rangschikken doet `scoreParsedRows` met mode `segment`.
//
// Puur: geen I/O.

import type { SegmentResult } from "@/lib/zwift/segment-results-pb";
import { routeSegments } from "@/lib/zwift/route-segments";
import type { ParsedResultRow } from "./parse-results";

/**
 * Marge rond het onderdeel. Vooraf: Zwift start soms net vóór de geplande
 * minuut. Achteraf: `ts` is het einde van de passage, dus een sprint die vlak
 * voor het einde begint, eindigt erna. Eén minuut is te kort voor nog een ronde.
 */
export const SEGMENT_WINDOW_MARGIN_MS = 60_000;

export function segmentWindow(startsAt: string, durationMinutes: number) {
  const start = Date.parse(startsAt);
  if (!Number.isFinite(start)) throw new Error("Ongeldige starttijd.");
  return {
    windowStart: start - SEGMENT_WINDOW_MARGIN_MS,
    windowEnd: start + durationMinutes * 60_000 + SEGMENT_WINDOW_MARGIN_MS,
  };
}

export type SegmentQualiInput = {
  passes: SegmentResult[];
  entrants: Array<{ zwiftId: string; name: string; league: string | null }>;
  /** Unix-ms. */
  windowStart: number;
  windowEnd: number;
};

export function bestSegmentTimes(input: SegmentQualiInput): {
  rows: ParsedResultRow[];
  warnings: string[];
} {
  const entrants = new Map(input.entrants.map((e) => [e.zwiftId, e]));
  const seen = new Set<string>();
  const best = new Map<string, SegmentResult>();
  let outsiders = 0;

  for (const pass of input.passes) {
    if (pass.ts < input.windowStart || pass.ts > input.windowEnd) continue;
    if (!(pass.elapsed > 0)) continue;
    const key = pass.id || `${pass.athleteId}:${pass.ts}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const zwiftId = String(pass.athleteId);
    if (!entrants.has(zwiftId)) {
      outsiders += 1;
      continue;
    }
    const current = best.get(zwiftId);
    if (!current || pass.elapsed < current.elapsed || (pass.elapsed === current.elapsed && pass.ts < current.ts)) {
      best.set(zwiftId, pass);
    }
  }

  const warnings: string[] = [];
  if (outsiders > 0) {
    warnings.push(`${outsiders} ${outsiders === 1 ? "passage" : "passages"} van renners buiten de startlijst.`);
  }

  const ranked = [...best.entries()].sort(([, a], [, b]) => a.elapsed - b.elapsed || a.ts - b.ts);
  const withoutLeague: string[] = [];
  const rows: ParsedResultRow[] = [];
  for (const [zwiftId, pass] of ranked) {
    const entrant = entrants.get(zwiftId)!;
    if (!entrant.league) {
      withoutLeague.push(entrant.name);
      continue;
    }
    const seconds = Math.round(pass.elapsed * 1000) / 1000;
    const timeText = seconds.toFixed(3);
    rows.push({
      lineNumber: rows.length + 1,
      raw: `Zwift-segment ${pass.segmentId}: ${timeText} s${pass.avgPower ? `, ${pass.avgPower} W` : ""}`,
      name: entrant.name,
      teamName: null,
      league: entrant.league,
      zwiftId,
      position: null,
      timeText,
      timeSeconds: null,
      segmentSeconds: seconds,
      points: null,
      deltaSeconds: null,
      status: "finished",
      block: null,
    });
  }
  if (withoutLeague.length > 0) {
    warnings.push(`Zonder league, niet meegeteld: ${withoutLeague.join(", ")}.`);
  }

  const missing = input.entrants.filter((e) => !best.has(e.zwiftId)).map((e) => e.name);
  if (missing.length > 0) {
    warnings.push(`${missing.length} ingeschreven ${missing.length === 1 ? "renner" : "renners"} zonder passage: ${missing.join(", ")}.`);
  }
  return { rows, warnings };
}

type EventSubgroup = { routeId?: unknown; eventSubgroupStart?: unknown };

function subgroupsOf(event: unknown): EventSubgroup[] {
  const rows = (event as { eventSubgroups?: unknown } | null)?.eventSubgroups;
  return Array.isArray(rows) ? (rows as EventSubgroup[]) : [];
}

/**
 * De segmenten op de route(s) van een Zwift-event, uniek en in rijvolgorde.
 * Leeg als Zwift geen route geeft of de route niet in de segmenttabel staat.
 */
export function sprintSegmentOptions(event: unknown): Array<{ segmentId: string; name: string }> {
  const options = new Map<string, string>();
  for (const subgroup of subgroupsOf(event)) {
    if (subgroup.routeId == null || subgroup.routeId === "") continue;
    for (const ref of routeSegments(String(subgroup.routeId)) ?? []) {
      if (!options.has(ref.segmentId)) options.set(ref.segmentId, ref.name);
    }
  }
  return [...options].map(([segmentId, name]) => ({ segmentId, name }));
}

/** Vroegste subgroepstart volgens Zwift (Unix-ms), of null. */
export function zwiftEventStart(event: unknown): number | null {
  const starts = subgroupsOf(event)
    .map((s) => (typeof s.eventSubgroupStart === "string" ? Date.parse(s.eventSubgroupStart) : Number(s.eventSubgroupStart)))
    .filter((ms) => Number.isFinite(ms) && ms > 0);
  return starts.length ? Math.min(...starts) : null;
}
