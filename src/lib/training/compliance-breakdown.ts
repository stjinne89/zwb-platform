// Naleving per onderdeel: duur, belasting, intensiteit, zones en RPE, elk gepland
// tegenover gereden. Puur informatie: het oordeel (te licht, volgens plan, te
// zwaar) en het percentage op de pil blijven op TSS (compliance.ts), want daar
// lezen de AI-regels en de replan-signalen op. Keuze van de eigenaar, 24 oktober
// 2026.
//
// Rekent bij het tonen uit de momentopname plus de geplande blokken, zodat het
// ook werkt voor momentopnames van vóór deze uitsplitsing. Puur, ook in de browser.

import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
import { RPE_BANDS, rpeBand } from "@/lib/training/rpe";
import { ZWIFT_ZONES, type WorkoutBlock } from "@/lib/training/workouts";
import { plannedSegments, plannedZoneSeconds } from "@/lib/training/zone-times";

export type Comparison = {
  planned: number | null;
  actual: number | null;
  /** Gereden als percentage van gepland. */
  pct: number | null;
};

export type ZoneCompliance = {
  zone: number;
  plannedSeconds: number;
  riddenSeconds: number;
  /** Gereden minuten in deze zone als percentage van de geplande; null bij te weinig plan. */
  pct: number | null;
};

export type ComplianceBreakdown = {
  /** In minuten. */
  duration: Comparison;
  /** In TSS; pct is de loadPct op de pil. */
  load: Comparison;
  /** IF; gepland volgt uit de geplande TSS en duur. */
  intensity: Comparison;
  /** Alleen met gemeten zonetijden én een geplande opbouw. */
  zones: {
    rows: ZoneCompliance[];
    /**
     * Hoeveel procent van de verdeling over de zones overeenkomt, los van de
     * duur: 100 is dezelfde verhouding tussen de zones als gepland.
     */
    match: number | null;
  } | null;
  rpe: {
    expected: { low: number; high: number } | null;
    actual: number | null;
  };
};

/** Onder zoveel geplande seconden geeft een zone geen percentage: 1 minuut gepland, 3 gereden is geen 300 %. */
const MIN_ZONE_SECONDS = 60;
/** Een zone verschijnt pas in de rij vanaf zoveel seconden, gepland of gereden. */
const SHOW_ZONE_SECONDS = 30;
/**
 * Verwachte RPE: de zwaarste band waarin het schema minstens zo lang rijdt.
 * Korte sprints of een opener tillen de sessie niet naar RPE 10, een blok van
 * vijf minuten wel. Een productkeuze, geen getal uit onderzoek.
 */
export const EXPECTED_RPE_MIN_MINUTES = 5;

function percentOf(actual: number | null, planned: number | null): number | null {
  if (actual == null || planned == null || !(planned > 0)) return null;
  return Math.round((actual / planned) * 100);
}

/** IF van het schema: TSS = IF² × uren × 100, dus IF = √(TSS / (uren × 100)). */
export function plannedIntensityFactor(
  plannedLoad: number | null | undefined,
  plannedMinutes: number | null | undefined,
): number | null {
  if (plannedLoad == null || plannedMinutes == null || !(plannedLoad > 0) || !(plannedMinutes > 0)) {
    return null;
  }
  return Math.round(Math.sqrt(plannedLoad / ((plannedMinutes / 60) * 100)) * 100) / 100;
}

/**
 * De RPE die bij het schema hoort, op de RPE-banden van de blokken: de zwaarste
 * band met minstens EXPECTED_RPE_MIN_MINUTES, anders de band waar het meeste
 * tijd in zit.
 */
export function expectedSessionRpe(
  blocks: WorkoutBlock[],
  ftpWatts: number | null,
): { low: number; high: number } | null {
  const seconds = RPE_BANDS.map(() => 0);
  for (const segment of plannedSegments(blocks, ftpWatts)) {
    if (segment.pct == null || !(segment.pct > 0)) continue;
    seconds[RPE_BANDS.indexOf(rpeBand(segment.pct))] += segment.seconds;
  }
  for (let index = RPE_BANDS.length - 1; index >= 0; index--) {
    if (seconds[index] >= EXPECTED_RPE_MIN_MINUTES * 60) {
      return { low: RPE_BANDS[index].low, high: RPE_BANDS[index].high };
    }
  }
  const most = seconds.indexOf(Math.max(...seconds));
  if (!(seconds[most] > 0)) return null;
  return { low: RPE_BANDS[most].low, high: RPE_BANDS[most].high };
}

/** Deel van de verdeling dat overeenkomt: de som van de kleinste aandelen per zone. */
export function zoneDistributionMatch(planned: number[], ridden: number[]): number | null {
  const plannedTotal = planned.reduce((sum, value) => sum + value, 0);
  const riddenTotal = ridden.reduce((sum, value) => sum + value, 0);
  if (!(plannedTotal > 0) || !(riddenTotal > 0)) return null;
  const overlap = planned.reduce(
    (sum, value, index) => sum + Math.min(value / plannedTotal, (ridden[index] ?? 0) / riddenTotal),
    0,
  );
  return Math.round(overlap * 100);
}

export function complianceBreakdown({
  metrics,
  blocks,
  ftpWatts,
  rpe,
}: {
  metrics: Partial<WorkoutMetricsSnapshot>;
  blocks?: WorkoutBlock[] | null;
  ftpWatts?: number | null;
  rpe?: number | null;
}): ComplianceBreakdown {
  const plannedMinutes = metrics.plannedMinutes ?? null;
  const actualMinutes = metrics.movingMinutes ?? null;
  const plannedLoad = metrics.plannedLoad ?? null;
  const actualLoad = metrics.tss ?? null;
  // De geplande TSS komt uit de blokken; reken de IF op hun duur, niet op een
  // afgeronde duration_minutes die daar een paar minuten naast kan liggen.
  const blockMinutes = blocks?.reduce((sum, block) => sum + block.durationMinutes, 0) ?? 0;
  const plannedIf = plannedIntensityFactor(plannedLoad, blockMinutes > 0 ? blockMinutes : plannedMinutes);
  const actualIf = metrics.intensityFactor ?? null;

  let zones: ComplianceBreakdown["zones"] = null;
  const zoneTimes = metrics.zoneTimes;
  if (zoneTimes?.source === "intervals" && blocks?.length) {
    // Zelfde FTP als het zonepaneel: die van het lid, anders die van de indeling.
    const planned = plannedZoneSeconds(blocks, ftpWatts ?? zoneTimes.ftpWatts);
    const ridden = ZWIFT_ZONES.map((_, index) => zoneTimes.seconds[index] ?? 0);
    zones = {
      rows: ZWIFT_ZONES.flatMap((zone, index) => {
        const plannedSeconds = planned[index] ?? 0;
        const riddenSeconds = ridden[index];
        if (plannedSeconds < SHOW_ZONE_SECONDS && riddenSeconds < SHOW_ZONE_SECONDS) return [];
        return [
          {
            zone: zone.zone,
            plannedSeconds,
            riddenSeconds,
            pct: plannedSeconds >= MIN_ZONE_SECONDS ? percentOf(riddenSeconds, plannedSeconds) : null,
          },
        ];
      }),
      match: zoneDistributionMatch(planned, ridden),
    };
  }

  return {
    duration: {
      planned: plannedMinutes,
      actual: actualMinutes,
      pct: percentOf(actualMinutes, plannedMinutes),
    },
    load: {
      planned: plannedLoad,
      actual: actualLoad,
      // De loadPct uit de momentopname, zodat dit getal en de pil nooit verschillen.
      pct: metrics.loadPct ?? percentOf(actualLoad, plannedLoad),
    },
    intensity: { planned: plannedIf, actual: actualIf, pct: percentOf(actualIf, plannedIf) },
    zones,
    rpe: {
      expected: blocks?.length ? expectedSessionRpe(blocks, ftpWatts ?? null) : null,
      actual: rpe ?? null,
    },
  };
}
