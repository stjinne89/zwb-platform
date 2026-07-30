// De cijfers van een gereden rit, uit Strava.
//
// Waarom niet uit intervals.icu: dat geeft via de API niets terug voor ritten
// die daar via Strava zijn binnengekomen. De opgeslagen payload is dan letterlijk
// { id, source: "STRAVA", _note: "STRAVA activities are not available via the
// API" }. Voor leden die hun meter niet rechtstreeks aan intervals hebben
// gekoppeld — de meesten — blijft die bron dus leeg.
//
// Strava heeft alles behalve TSS en IF; dat zijn intervals/TrainingPeaks-
// begrippen. Die rekenen we hier zelf uit met de standaardformules.

import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

/** Strava levert numerieke velden soms als string; alles wat niet telt wordt null. */
function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function positive(value: unknown): number | null {
  const n = num(value);
  return n != null && n > 0 ? n : null;
}

/** Intensity Factor: genormaliseerd vermogen ten opzichte van je FTP. */
export function intensityFactorFrom(
  normalizedWatts: number | null,
  ftpWatts: number | null,
): number | null {
  if (!normalizedWatts || !ftpWatts || ftpWatts <= 0) return null;
  return Math.round((normalizedWatts / ftpWatts) * 100) / 100;
}

/**
 * TSS = (duur × NP × IF) / (FTP × 3600) × 100. Een uur op precies je FTP levert
 * per definitie 100. Gebruikt de onafgeronde IF, zodat de afronding van IF niet
 * doorwerkt in de TSS.
 */
export function trainingStressScore(
  movingSeconds: number | null,
  normalizedWatts: number | null,
  ftpWatts: number | null,
): number | null {
  if (!movingSeconds || !normalizedWatts || !ftpWatts || ftpWatts <= 0) return null;
  const intensity = normalizedWatts / ftpWatts;
  return Math.round((movingSeconds * normalizedWatts * intensity) / (ftpWatts * 3600) * 100);
}

export type RideMetrics = {
  movingMinutes: number | null;
  averageWatts: number | null;
  normalizedWatts: number | null;
  maxWatts: number | null;
  averageHr: number | null;
  maxHr: number | null;
  averageCadence: number | null;
  kilojoules: number | null;
  /** Echte vermogensmeter? Zonder meter schat Strava het vermogen. */
  hasPowerMeter: boolean;
  tss: number | null;
  intensityFactor: number | null;
};

export const EMPTY_RIDE_METRICS: RideMetrics = {
  movingMinutes: null,
  averageWatts: null,
  normalizedWatts: null,
  maxWatts: null,
  averageHr: null,
  maxHr: null,
  averageCadence: null,
  kilojoules: null,
  hasPowerMeter: false,
  tss: null,
  intensityFactor: null,
};

/**
 * Haalt de cijfers uit een opgeslagen Strava-activiteit.
 *
 * TSS en IF berekenen we alleen bij een echte vermogensmeter. Zonder meter geeft
 * Strava een geschat vermogen, en een TSS die daarop leunt is niet betrouwbaar
 * genoeg om een schema op bij te sturen — dan blijft het veld leeg.
 */
export function rideMetricsFromStrava(
  raw: unknown,
  fallbackMovingSeconds: number | null,
  ftpWatts: number | null,
): RideMetrics {
  const activity = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const movingSeconds = positive(activity.moving_time) ?? positive(fallbackMovingSeconds);
  const hasPowerMeter = activity.device_watts === true;
  const normalizedWatts = hasPowerMeter ? positive(activity.weighted_average_watts) : null;

  return {
    movingMinutes: movingSeconds ? Math.round(movingSeconds / 60) : null,
    averageWatts: positive(activity.average_watts),
    normalizedWatts,
    maxWatts: positive(activity.max_watts),
    averageHr: positive(activity.average_heartrate),
    maxHr: positive(activity.max_heartrate),
    averageCadence: positive(activity.average_cadence),
    kilojoules: positive(activity.kilojoules),
    hasPowerMeter,
    tss: trainingStressScore(movingSeconds, normalizedWatts, ftpWatts),
    intensityFactor: intensityFactorFrom(normalizedWatts, ftpWatts),
  };
}

/** Vorm waarin we Strava-ritten uit de database lezen voor de koppeling. */
export type StravaRideRow = {
  id: number;
  name: string | null;
  start_date: string;
  moving_time_seconds: number | null;
  raw: unknown;
};

export const STRAVA_RIDE_COLUMNS = "id, name, start_date, moving_time_seconds, raw";

/**
 * Eén rit met zijn belasting, klaar voor de tabel en de weekgrafiek. De
 * veldnamen volgen die van intervals_activities, zodat weeklyLoad met beide
 * bronnen overweg kan.
 */
export type RideLoad = {
  id: number;
  name: string | null;
  /** Kalenderdag in Amsterdam-tijd. */
  start_date_local: string;
  moving_time_seconds: number | null;
  /** TSS. */
  training_load: number | null;
  /** IF. */
  intensity: number | null;
  normalized_watts: number | null;
  kilojoules: number | null;
  hasPowerMeter: boolean;
};

/** Ritten met hun belasting, nieuwste eerst. */
export function rideLoadRows(rides: StravaRideRow[], ftpWatts: number | null): RideLoad[] {
  return rides
    .map((ride) => {
      const metrics = rideMetricsFromStrava(ride.raw, ride.moving_time_seconds, ftpWatts);
      return {
        id: ride.id,
        name: ride.name,
        start_date_local: amsterdamDayKey(new Date(ride.start_date)),
        moving_time_seconds: metrics.movingMinutes ? metrics.movingMinutes * 60 : null,
        training_load: metrics.tss,
        intensity: metrics.intensityFactor,
        normalized_watts: metrics.normalizedWatts,
        kilojoules: metrics.kilojoules,
        hasPowerMeter: metrics.hasPowerMeter,
      };
    })
    .sort((a, b) => b.start_date_local.localeCompare(a.start_date_local));
}

export type WeeklyLoad = {
  /** Maandag van de week, als datumsleutel. */
  weekStart: string;
  load: number;
  hours: number;
  kilojoules: number;
};

/** Alles wat weeklyLoad nodig heeft; zowel RideLoad als ActivityLoadRow past. */
type WeeklyLoadInput = {
  start_date_local: string;
  moving_time_seconds: number | null;
  training_load: number | null;
  kilojoules: number | null;
};

function mondayOf(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

/** Telt belasting per week op, oudste week eerst. */
export function weeklyLoad(rows: WeeklyLoadInput[], weeks = 12): WeeklyLoad[] {
  const byWeek = new Map<string, WeeklyLoad>();
  for (const row of rows) {
    const weekStart = mondayOf(row.start_date_local);
    const entry = byWeek.get(weekStart) ?? { weekStart, load: 0, hours: 0, kilojoules: 0 };
    entry.load += Number(row.training_load ?? 0);
    entry.hours += Number(row.moving_time_seconds ?? 0) / 3600;
    entry.kilojoules += Number(row.kilojoules ?? 0);
    byWeek.set(weekStart, entry);
  }
  return Array.from(byWeek.values())
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-weeks)
    .map((week) => ({
      ...week,
      load: Math.round(week.load),
      hours: Math.round(week.hours * 10) / 10,
      kilojoules: Math.round(week.kilojoules),
    }));
}
