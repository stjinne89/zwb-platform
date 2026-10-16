// De Duurtest: eens per maand 60 minuten op 75 % FTP, en dan kijken hoeveel de
// hartslag wegloopt van het vermogen. Minder ontkoppeling op hetzelfde vermogen
// wijst op meer duurvermogen (Rothschild 2025, Barsumyan 2025). Zie het protocol
// "duurtest" (protocols/training.ts) en het artikel lange-ritten.
//
// De meting zelf staat in execution.ts (`steady`): alleen het werkblok, zonder
// inrijden en uitrijden. Een rit herkennen we aan de titel van de geplande
// training; de AI noemt hem zo (aiHint van het protocol). Bewust een reeks en
// geen oordeel: een gevalideerde grens voor ontkoppeling bestaat niet.

import type { ExecutionAnalysis } from "@/lib/training/execution";

export const DURABILITY_TEST_TITLE = "Duurtest";

export function isDurabilityTestTitle(title: string | null | undefined): boolean {
  return Boolean(title && title.toLowerCase().includes(DURABILITY_TEST_TITLE.toLowerCase()));
}

export type DurabilityPoint = {
  day: string;
  decoupling: number;
  avgHr: number;
  avgWatts: number;
};

type ReportRow = {
  metrics_json: { plannedTitle?: string; execution?: ExecutionAnalysis } | null;
  training_workouts: { scheduled_at: string | null } | { scheduled_at: string | null }[] | null;
};

/** De gemeten duurtests, oudste eerst. Een rit zonder bruikbare meting valt weg. */
export function durabilityPoints(rows: ReportRow[]): DurabilityPoint[] {
  return rows
    .flatMap((row) => {
      if (!isDurabilityTestTitle(row.metrics_json?.plannedTitle)) return [];
      const steady = row.metrics_json?.execution?.steady;
      const workout = Array.isArray(row.training_workouts) ? row.training_workouts[0] : row.training_workouts;
      const day = workout?.scheduled_at ? String(workout.scheduled_at).slice(0, 10) : null;
      if (!steady || !day) return [];
      return [{ day, decoupling: steady.decoupling, avgHr: steady.avgHr, avgWatts: steady.avgWatts }];
    })
    .sort((a, b) => a.day.localeCompare(b.day));
}

export async function loadDurabilityTests(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  profileId: string,
): Promise<DurabilityPoint[]> {
  const { data, error } = await client
    .from("training_workout_reports")
    .select("metrics_json, training_workouts(scheduled_at)")
    .eq("profile_id", profileId)
    .ilike("metrics_json->>plannedTitle", `%${DURABILITY_TEST_TITLE}%`)
    .limit(50);
  if (error) return [];
  return durabilityPoints((data ?? []) as ReportRow[]);
}
