import "server-only";

// De beste tijd per renner per Zwift-segment, voor de segmentrecords op het
// racebriefje.
//
// Een cache in zwift_segment_bests (migr. 0279), zoals de ZRS in metrics.ts: de
// pagina leest wat er is en ververst na het antwoord (after) wat ontbreekt of
// ouder is dan een dag, binnen een tijdsbudget; de rest volgt bij het volgende
// bezoek. Eerst onze renners, dan de rest van het startveld.
//
// Zwift geeft met `player_id` de passages van één renner in een venster van
// hooguit 90 dagen; 120 dagen gaf status 400 (gemeten 2026-10-26). Ouder kan in
// stappen, maar de eigenaar koos 90 dagen voor iedereen: één verzoek per renner
// per segment.

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchSegmentResults } from "@/lib/events/zwift-club";
import { lapSegmentsForRoute, routeFromZwiftId } from "@/lib/events/zwift-route";
import { matchSegmentIds, routeLap } from "@/lib/zwift/route-segments";
import type { SegmentBest } from "./segment-records";

const WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;
/** Ouder dan dit gooit het verversen weg: het is een cache, geen archief. */
const RETENTION_DAYS = 90;
/** Tussen twee verzoeken; zoals bij de uitslagen (2 per seconde voor het hele account). */
const REQUEST_SPACING_MS = 550;

type Row = {
  zwift_id: number | string;
  segment_id: string;
  best_seconds: number | string | null;
  best_watts: number | null;
  best_weight_kg: number | string | null;
  best_at: string | null;
  fetched_at: string;
};

const num = (value: number | string | null) => (value === null ? null : Number(value));

/** Zwifts segment-ID per slug van zwift-data, voor een Zwift-route. */
export function segmentIdsForRoute(routeId: number | null): Map<string, string> {
  if (!routeId) return new Map();
  const route = routeFromZwiftId(routeId);
  const lap = routeLap(routeId);
  if (!route || !lap) return new Map();
  const laps = lapSegmentsForRoute(route.slug).map((s) => ({ ...s, kind: "lap" as const }));
  return matchSegmentIds([...route.accents, ...laps], lap);
}

/** Null als de tabel niet te lezen is (migratie 0279 nog niet toegepast): dan ook niet verversen. */
export async function loadSegmentBests(zwiftIds: number[], segmentIds: string[]): Promise<SegmentBest[] | null> {
  if (zwiftIds.length === 0 || segmentIds.length === 0) return [];
  const { data, error } = await createAdminClient()
    .from("zwift_segment_bests")
    .select("zwift_id, segment_id, best_seconds, best_watts, best_weight_kg, best_at, fetched_at")
    .in("zwift_id", zwiftIds)
    .in("segment_id", segmentIds);
  if (error) return null;
  return ((data ?? []) as Row[]).map((row) => ({
    zwiftId: Number(row.zwift_id),
    segmentId: row.segment_id,
    seconds: num(row.best_seconds),
    watts: row.best_watts,
    weightKg: num(row.best_weight_kg),
    at: row.best_at,
    fetchedAt: row.fetched_at,
  }));
}

/** Combinaties die nu al worden opgehaald, zodat twee kijkers ze niet allebei vragen. */
const inFlight = new Set<string>();
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Haalt per renner per segment de snelste passage van de laatste 90 dagen op. De
 * renners in volgorde van belang: eerst onze eigen, dan het veld.
 */
export async function refreshSegmentBests(
  zwiftIds: number[],
  segmentIds: string[],
  known: SegmentBest[],
  options: { budgetMs: number },
): Promise<void> {
  const started = Date.now();
  const admin = createAdminClient();
  const fresh = new Set(known.filter((b) => started - Date.parse(b.fetchedAt) < STALE_MS).map((b) => `${b.zwiftId}:${b.segmentId}`));
  const due = zwiftIds.flatMap((id) => segmentIds.map((segmentId) => ({ id, segmentId, key: `${id}:${segmentId}` })))
    .filter((pair) => !fresh.has(pair.key) && !inFlight.has(pair.key));

  for (const { id, segmentId, key } of due) {
    if (Date.now() - started > options.budgetMs) break;
    inFlight.add(key);
    try {
      const to = Date.now();
      const passages = (await fetchSegmentResults(segmentId, { athleteId: id, from: to - WINDOW_MS, to })).filter(
        (p) => p.athleteId === id && p.elapsed > 0,
      );
      const best = passages.reduce<(typeof passages)[number] | null>((a, b) => (!a || b.elapsed < a.elapsed ? b : a), null);
      await admin.from("zwift_segment_bests").upsert({
        zwift_id: id,
        segment_id: segmentId,
        best_seconds: best ? Math.round(best.elapsed * 1000) / 1000 : null,
        // Oude passages hebben soms 0 W: dan is de tijd bekend en het vermogen niet.
        best_watts: best?.avgPower ? Math.round(best.avgPower) : null,
        best_weight_kg: best?.weightKg ? Math.round(best.weightKg * 10) / 10 : null,
        best_at: best ? new Date(best.ts).toISOString() : null,
        fetched_at: new Date().toISOString(),
      });
    } catch (error) {
      // Limiet van Zwift: stoppen, de rest volgt bij het volgende bezoek.
      if (error instanceof Error && error.message.includes("status 429")) break;
    } finally {
      inFlight.delete(key);
    }
    await pause(REQUEST_SPACING_MS);
  }

  const cutoff = new Date(started - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await admin.from("zwift_segment_bests").delete().lt("fetched_at", cutoff);
}
