import "server-only";

// ZRS en (met sleutel) ZwiftRacing per renner, voor de racebriefing.
//
// Een cache in zwift_rider_metrics (migr. 0257). De pagina leest wat er is en
// ververst na het antwoord (after) wat ontbreekt of ouder is dan een dag. Zwift:
// één profiel tegelijk met een pauze ertussen, binnen een tijdsbudget; de rest
// volgt bij het volgende bezoek. ZwiftRacing: één batch per verversing.

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchRacingScore } from "@/lib/events/zwift-club";
import { fetchZwiftRacingRiders, zwiftRacingConfigured } from "@/lib/zwiftracing/client";
import type { PowerProfile } from "./field";

const STALE_MS = 24 * 60 * 60 * 1000;
/** Ouder dan dit gooit het verversen weg: het is een cache, geen archief. */
const RETENTION_DAYS = 90;
/** Tussen twee profielen bij Zwift; 31 op rij met 700 ms ging goed (2026-10-20). */
const PROFILE_SPACING_MS = 700;

export type RiderMetrics = {
  racingScore: number | null;
  zwiftCategory: string | null;
  velo: number | null;
  veloCategory: string | null;
  phenotype: string | null;
  power: PowerProfile | null;
  zrsFetchedAt: string | null;
  veloFetchedAt: string | null;
};

type Row = {
  zwift_id: number;
  racing_score: number | null;
  zwift_category: string | null;
  zrs_fetched_at: string | null;
  velo: number | string | null;
  velo_category: string | null;
  phenotype: string | null;
  power_wkg: PowerProfile | null;
  velo_fetched_at: string | null;
};

export async function loadRiderMetrics(zwiftIds: number[]): Promise<Map<number, RiderMetrics>> {
  const out = new Map<number, RiderMetrics>();
  if (zwiftIds.length === 0) return out;
  const admin = createAdminClient();
  const { data } = await admin
    .from("zwift_rider_metrics")
    .select("zwift_id, racing_score, zwift_category, zrs_fetched_at, velo, velo_category, phenotype, power_wkg, velo_fetched_at")
    .in("zwift_id", zwiftIds);
  for (const row of (data ?? []) as Row[]) {
    out.set(Number(row.zwift_id), {
      racingScore: row.racing_score,
      zwiftCategory: row.zwift_category,
      velo: row.velo === null ? null : Number(row.velo),
      veloCategory: row.velo_category,
      phenotype: row.phenotype,
      power: row.power_wkg,
      zrsFetchedAt: row.zrs_fetched_at,
      veloFetchedAt: row.velo_fetched_at,
    });
  }
  return out;
}

const stale = (at: string | null | undefined, now: number) => !at || now - Date.parse(at) > STALE_MS;

/** Profielen die nu al worden opgehaald, zodat twee kijkers ze niet allebei vragen. */
const inFlight = new Set<number>();
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function refreshRiderMetrics(
  zwiftIds: number[],
  known: Map<number, RiderMetrics>,
  options: { budgetMs: number },
): Promise<void> {
  const started = Date.now();
  const admin = createAdminClient();
  const now = Date.now();

  const zrsDue = zwiftIds.filter((id) => stale(known.get(id)?.zrsFetchedAt, now) && !inFlight.has(id));
  for (const id of zrsDue) {
    if (Date.now() - started > options.budgetMs) break;
    inFlight.add(id);
    try {
      const score = await fetchRacingScore(String(id));
      await admin.from("zwift_rider_metrics").upsert({
        zwift_id: id,
        racing_score: score.racingScore,
        zwift_category: score.category,
        zrs_fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Een profiel dat niet lukt, komt bij het volgende bezoek terug.
    } finally {
      inFlight.delete(id);
    }
    await pause(PROFILE_SPACING_MS);
  }

  if (zwiftRacingConfigured()) {
    const veloDue = zwiftIds.filter((id) => stale(known.get(id)?.veloFetchedAt, now));
    if (veloDue.length > 0 && Date.now() - started < options.budgetMs) {
      try {
        const riders = await fetchZwiftRacingRiders(veloDue);
        const at = new Date().toISOString();
        if (riders.length > 0) {
          await admin.from("zwift_rider_metrics").upsert(
            riders.map((r) => ({
              zwift_id: r.zwiftId,
              velo: r.velo,
              velo_category: r.category,
              phenotype: r.phenotype,
              power_wkg: r.powerWkg,
              velo_fetched_at: at,
              updated_at: at,
            })),
          );
        }
      } catch {
        // ZwiftRacing niet bereikbaar of limiet: de briefing valt terug op ZRS.
      }
    }
  }

  const cutoff = new Date(now - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await admin.from("zwift_rider_metrics").delete().lt("updated_at", cutoff);
}
