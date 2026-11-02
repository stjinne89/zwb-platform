// Hoe het lid zich zelf voelt, als herstelsignaal naast HRV en rust-hartslag.
//
// Bij ervaren fietsers werkte sturen op HRV, rust-hartslag en welbevinden samen
// beter dan op HRV alleen (Alfonso e.a. 2025), en een HRV-meting mist
// overbelasting soms helemaal (Coates e.a. 2018). Het lid vertelt het ons al:
// in het verslag na een rit, met de RPE bij een losse rit (0303) en in het
// klachtenlogboek. Zie docs/wetenschappelijke-toets.md, 1C.
//
// Bewust smal: alleen wat duidelijk "zwaar" zegt, over de laatste drie dagen.
// Een zware intervaltraining die zwaar voelde is geen signaal; een rustige rit
// die zwaar voelde wel (dezelfde regel als de trainersuggestie in
// training-advice.ts). Dit haalt hooguit de ruimte voor kwaliteit weg, zie
// summarizeTrainingReadiness.

import { HIGH_RPE } from "@/lib/training/training-advice";
import { loadHrBasis, type HrBasis } from "@/lib/training/hr-load";
import {
  rideMetricsFromStrava,
  STRAVA_RIDE_COLUMNS,
  type StravaRideRow,
} from "@/lib/training/ride-metrics";
import { loadSymptomLoadForAi } from "@/lib/training/symptoms";
import { detectIntensityFromLoad } from "@/lib/training/workouts";
import type { SubjectiveRecovery } from "@/lib/training/wellness";

/** Zoveel dagen terug telt een ritverslag mee. */
export const SUBJECTIVE_DAYS = 3;

/** Vanaf deze klachtenlast (0..1) telt het logboek als "zwaar"; gelijk aan de AI-regel. */
export const HIGH_SYMPTOM_LOAD = 0.65;

const EASY = new Set(["recovery", "endurance"]);

export type SubjectiveReport = {
  athlete_rpe: number | null;
  athlete_feel: string | null;
  updated_at: string;
  /** Intensiteit van de geplande training waar het verslag bij hoort. */
  intensity: string | null;
};

export function summarizeSubjectiveRecovery(
  reports: SubjectiveReport[],
  /** Klachtenlast 0..1 van de laatste week, of null als het logboek uit staat. */
  symptomScore: number | null,
  now: Date = new Date(),
): SubjectiveRecovery | null {
  const cutoff = now.getTime() - SUBJECTIVE_DAYS * 86_400_000;
  const recent = reports.filter((report) => {
    const at = new Date(report.updated_at).getTime();
    return Number.isFinite(at) && at >= cutoff;
  });

  if (recent.some((report) => report.athlete_feel === "slecht")) {
    return { heavy: true, note: "Je gaf aan dat een rit van de laatste dagen slecht ging." };
  }
  const easyFeltHard = recent.some(
    (report) =>
      report.intensity != null &&
      EASY.has(report.intensity) &&
      (report.athlete_feel === "zwaar" || (report.athlete_rpe ?? 0) >= HIGH_RPE),
  );
  if (easyFeltHard) {
    return { heavy: true, note: "Een rustige rit van de laatste dagen voelde zwaar." };
  }
  if (symptomScore != null && symptomScore >= HIGH_SYMPTOM_LOAD) {
    return { heavy: true, note: "Je gaf deze week veel klachten aan." };
  }
  return null;
}

/**
 * Losse ritten met een RPE als verslag. Er stond geen training tegenover, dus
 * de intensiteit volgt uit de gereden belasting; zonder TSS (geen vermogen of
 * hartslag) is niet te zeggen of de rit rustig was, en telt hij niet mee.
 */
export function rideReportsFrom(
  rides: Array<StravaRideRow & { athlete_rpe: number | null }>,
  ftpWatts: number | null,
  hr: HrBasis | null,
): SubjectiveReport[] {
  return rides
    .filter((ride) => ride.athlete_rpe != null)
    .map((ride) => {
      const metrics = rideMetricsFromStrava(ride.raw, ride.moving_time_seconds, ftpWatts, hr);
      return {
        athlete_rpe: ride.athlete_rpe,
        athlete_feel: null,
        updated_at: ride.start_date,
        intensity: detectIntensityFromLoad(metrics.tss, metrics.movingMinutes),
      };
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadRideReports(client: any, profileId: string, since: string) {
  // Aparte query: draait 0303 nog niet, dan valt alleen dit weg.
  const { data, error } = await client
    .from("strava_activities")
    .select(`${STRAVA_RIDE_COLUMNS}, athlete_rpe`)
    .eq("profile_id", profileId)
    .gte("start_date", since)
    .not("athlete_rpe", "is", null);
  if (error || !data?.length) return [];
  const [{ data: profile }, hr] = await Promise.all([
    client.from("profiles").select("ftp_watts").eq("id", profileId).maybeSingle(),
    loadHrBasis(client, profileId),
  ]);
  return rideReportsFrom(
    data as Array<StravaRideRow & { athlete_rpe: number | null }>,
    profile?.ftp_watts == null ? null : Number(profile.ftp_watts),
    hr,
  );
}

/**
 * Laadt het signaal voor één lid. `includeSymptoms` alleen op de eigen pagina's
 * van het lid: het klachtenlogboek is privé, ook voor de trainer. De
 * ritverslagen ziet de trainer al.
 */
export async function loadSubjectiveRecovery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  profileId: string,
  { includeSymptoms }: { includeSymptoms: boolean },
): Promise<SubjectiveRecovery | null> {
  const since = new Date(Date.now() - SUBJECTIVE_DAYS * 86_400_000).toISOString();
  const [{ data }, rideReports, symptoms] = await Promise.all([
    client
      .from("training_workout_reports")
      .select("athlete_rpe, athlete_feel, updated_at, training_workouts(intensity)")
      .eq("profile_id", profileId)
      .gte("updated_at", since),
    loadRideReports(client, profileId, since).catch(() => []),
    includeSymptoms
      ? loadSymptomLoadForAi(client, profileId).catch(() => null)
      : Promise.resolve(null),
  ]);

  const reports: SubjectiveReport[] = (
    (data ?? []) as Array<{
      athlete_rpe: number | null;
      athlete_feel: string | null;
      updated_at: string;
      training_workouts: { intensity: string | null } | { intensity: string | null }[] | null;
    }>
  ).map((row) => {
    const workout = Array.isArray(row.training_workouts)
      ? row.training_workouts[0]
      : row.training_workouts;
    return {
      athlete_rpe: row.athlete_rpe,
      athlete_feel: row.athlete_feel,
      updated_at: row.updated_at,
      intensity: workout?.intensity ?? null,
    };
  });

  return summarizeSubjectiveRecovery([...reports, ...rideReports], symptoms?.score ?? null);
}
