// Persoonlijk tempo in Zwift-races: hoe snel een lid rijdt ten opzichte van het
// clubmodel (ZWIFT_RACE_PACE in events.ts).
//
// Het clubmodel is een fit over alle ZWB'ers samen. Per renner wijkt het
// structureel af: wie vooraan rijdt, is sneller klaar. Getoetst op 2 november
// 2026 over 1858 Zwift-races van 16 renners, met per race de mediaan van de tien
// races die het lid daarvoor reed: de mediane afwijking in duur zakte van 7,0%
// naar 4,5% (afgerond op 0,05, zoals hieronder). Op 238 TTT's, met dezelfde
// factor uit de gewone races, van 5,2% naar 4,3%.
//
// De factor zegt niets over de route. Op de Muckle Yin zit het model voor
// iedereen te ruim; dat lost dit niet op.

import type { createAdminClient } from "@/lib/supabase/admin";
import { zwiftRaceModelMinutes } from "@/lib/training/events";

type Admin = ReturnType<typeof createAdminClient>;

export type RaceRide = {
  distance_m: number | string | null;
  total_elevation_gain_m: number | string | null;
  moving_time_seconds: number | string | null;
};

/** Zoveel recente races tellen mee. */
const SAMPLE = 10;
/** Met minder races blijft het clubmodel gelden. */
const MIN_RACES = 3;
/**
 * Afgerond op 0,05, zodat niet elke nieuwe race de duur een minuut verschuift en
 * het blok opnieuw naar intervals.icu gaat. Kost 0,2 procentpunt nauwkeurigheid.
 */
const STEP = 0.05;
/** Gemeten factoren lagen tussen 0,85 en 1,15. */
const MIN_FACTOR = 0.85;
const MAX_FACTOR = 1.15;

function num(value: number | string | null): number {
  return value == null ? NaN : Number(value);
}

/** Een rit die als race meetelt: 10 tot 80 km en minstens een kwartier. */
function usable(ride: RaceRide): boolean {
  const meters = num(ride.distance_m);
  return meters >= 10_000 && meters <= 80_000 && num(ride.moving_time_seconds) > 900;
}

/**
 * Gereden tijd gedeeld door de modeltijd, mediaan over de ritten; 1 met minder
 * dan MIN_RACES bruikbare races. Puur, zodat het te testen is.
 */
export function racePaceFactor(rides: RaceRide[]): number {
  const ratios = rides
    .filter(usable)
    .slice(0, SAMPLE)
    .map((ride) => {
      const model = zwiftRaceModelMinutes(
        num(ride.distance_m) / 1000,
        Math.max(0, num(ride.total_elevation_gain_m) || 0),
        "race",
      );
      return num(ride.moving_time_seconds) / 60 / model;
    })
    .filter((ratio) => Number.isFinite(ratio) && ratio > 0)
    .sort((a, b) => a - b);
  if (ratios.length < MIN_RACES) return 1;
  const mid = Math.floor(ratios.length / 2);
  const median = ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2;
  const rounded = Math.round(median / STEP) * STEP;
  return Math.round(Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, rounded)) * 100) / 100;
}

/**
 * De factor van een lid uit de eigen Zwift-races in `strava_activities` (via
 * Strava of intervals.icu). Zwift noemt die "Zwift - Race: …"; TTT's
 * ("Zwift - TTT: …") tellen niet mee, want die rijden op een ander tempo.
 * Zonder ritten of bij een fout: 1, het clubmodel.
 */
export async function loadRacePaceFactor(admin: Admin, profileId: string): Promise<number> {
  const { data, error } = await admin
    .from("strava_activities")
    .select("distance_m, total_elevation_gain_m, moving_time_seconds")
    .eq("profile_id", profileId)
    .ilike("name", "Zwift - Race:%")
    .is("training_excluded_at", null)
    .gte("distance_m", 10_000)
    .lte("distance_m", 80_000)
    .gt("moving_time_seconds", 900)
    .order("start_date", { ascending: false })
    .limit(SAMPLE);
  if (error || !data) return 1;
  return racePaceFactor(data as RaceRide[]);
}
