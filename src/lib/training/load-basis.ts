// Wat een lid nu aankan, in belasting (TSS) in plaats van uren.
//
// Beschikbaarheid en goal.maxHoursPerWeek zeggen hoeveel tijd een lid heeft. Wat
// het aankan staat in de opgebouwde fitheid: CTL is het gemiddelde van de
// dagelijkse TSS over zes weken, dus CTL × 7 is de weekbelasting waarop die
// fitheid gelijk blijft. Daaronder plannen is afbouwen, ook als de uren kloppen.
// Zie docs/schema-belasting-2026-10-26.md.
//
// Puur.

import { INTENSITY_FTP_RANGE, type WorkoutIntensity } from "@/lib/training/workouts";

export type CurrentLoad = {
  /** TSS per week waarop de fitheid van nu gelijk blijft. */
  weeklyTss: number;
  /** 'ctl': CTL × 7 uit intervals.icu. 'ritten': de gereden TSS van de laatste weken. */
  source: "ctl" | "ritten";
};

/**
 * Onder dit deel van de rijtijd met een bekende TSS zegt de gereden belasting te
 * weinig: de ritten zonder TSS zijn wel gereden, maar tellen dan niet mee.
 */
const MIN_LOAD_COVERAGE = 0.5;

type LoadSources = {
  recentLoad?: { tssPerWeek?: number | null; loadCoverage?: number } | null;
  intervalsLoad?: { ctl: number | null } | null;
};

/**
 * Het hoogste van CTL × 7 en de gereden TSS per week. Het hoogste, omdat beide
 * bronnen alleen naar onderen fout gaan: ritten die ZWB mist (koppeling net
 * gelegd, rit zonder vermogen of hartslag) maken de gereden TSS te laag, en een
 * CTL zakt vanzelf na een rustige periode. De gereden TSS wordt opgeschaald naar
 * de ritten zonder TSS; null zonder bruikbare bron.
 */
export function currentWeeklyLoad(input: LoadSources): CurrentLoad | null {
  const ctl = Number(input.intervalsLoad?.ctl);
  const fromCtl = Number.isFinite(ctl) && ctl > 0 ? Math.round(ctl * 7) : null;

  const tss = Number(input.recentLoad?.tssPerWeek);
  const coverage = Number(input.recentLoad?.loadCoverage ?? 0);
  const fromRides =
    input.recentLoad?.tssPerWeek != null && Number.isFinite(tss) && tss > 0 && coverage >= MIN_LOAD_COVERAGE
      ? Math.round(tss / Math.min(1, coverage))
      : null;

  if (fromCtl == null && fromRides == null) return null;
  if (fromRides != null && (fromCtl == null || fromRides > fromCtl)) return { weeklyTss: fromRides, source: "ritten" };
  return { weeklyTss: fromCtl!, source: "ctl" };
}

/**
 * Geschatte TSS van een rit waarvan alleen duur en intensiteit bekend zijn, zoals
 * een vaste afspraak: het midden van de %FTP-band van die intensiteit.
 */
export function loadForIntensity(minutes: number, intensity: string): number {
  const range = INTENSITY_FTP_RANGE[intensity as WorkoutIntensity] ?? INTENSITY_FTP_RANGE.endurance;
  const factor = (range[0] + range[1]) / 200;
  return Math.max(0, minutes / 60) * factor * factor * 100;
}
