// Naleving: wat stond er gepland, wat is er werkelijk gereden, en hoe ver zit
// dat uit elkaar. Voedt zowel de beoordelingsrij van de trainer als de context
// die de AI meekrijgt bij een nieuw of bijgewerkt schema.

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  rideMetricsFromStrava,
  STRAVA_RIDE_COLUMNS,
  type StravaRideRow,
} from "@/lib/training/ride-metrics";
import {
  estimateTrainingLoad,
  normalizeWorkoutBlocks,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

type Admin = ReturnType<typeof createAdminClient>;

export type ComplianceVerdict = "niet_gereden" | "te_licht" | "volgens_plan" | "te_zwaar";

/**
 * Grenzen rond 100%. Bewust asymmetrisch: een sessie 15% zwaarder rijden gebeurt
 * makkelijk op een goede dag, 20% te licht is een echt signaal dat het schema
 * niet past.
 */
export const COMPLIANCE_LOW = 80;
export const COMPLIANCE_HIGH = 115;

export type WorkoutCompliance = {
  workoutId: string;
  date: string;
  title: string;
  plannedMinutes: number | null;
  plannedLoad: number | null;
  plannedIntensity: string;
  actualMinutes: number | null;
  actualLoad: number | null;
  actualIf: number | null;
  /** Werkelijke belasting als percentage van de geplande. */
  loadPct: number | null;
  verdict: ComplianceVerdict;
  athleteRpe: number | null;
  athleteFeel: string | null;
};

export type ComplianceSummary = {
  planned: number;
  ridden: number;
  missed: number;
  tooLight: number;
  tooHard: number;
  onPlan: number;
  /** Gemiddelde loadPct over de gereden workouts; null zonder meetbare ritten. */
  avgLoadPct: number | null;
};

export type ComplianceContext = {
  workouts: WorkoutCompliance[];
  summary: ComplianceSummary;
};

/**
 * Werkelijke belasting t.o.v. geplande, in hele procenten. Zelfde rekenregel als
 * workoutScoreLabel in strava-summary.ts, maar dan als getal.
 */
export function loadPercentage(
  actualLoad: number | null,
  plannedLoad: number | null,
): number | null {
  if (actualLoad == null || plannedLoad == null || plannedLoad <= 0) return null;
  return Math.round((actualLoad / plannedLoad) * 100);
}

export function complianceVerdict(
  loadPct: number | null,
  hasActivity: boolean,
): ComplianceVerdict {
  if (!hasActivity) return "niet_gereden";
  // Wel gereden maar geen bruikbare belasting (geen meter, of geen geplande
  // blokken): dan is er niets af te wijken, dus telt het als volgens plan.
  if (loadPct == null) return "volgens_plan";
  if (loadPct < COMPLIANCE_LOW) return "te_licht";
  if (loadPct > COMPLIANCE_HIGH) return "te_zwaar";
  return "volgens_plan";
}

export const COMPLIANCE_LABELS: Record<ComplianceVerdict, string> = {
  niet_gereden: "Niet gereden",
  te_licht: "Te licht",
  volgens_plan: "Volgens plan",
  te_zwaar: "Te zwaar",
};

/**
 * Zelfde palet als de gereedscore (ZWB_LEVEL_META), zodat een kleur in de app
 * overal hetzelfde betekent: teal is goed, oranje is een signaal, rood vraagt om
 * actie. Te zwaar weegt zwaarder dan te licht — een sessie boven plan rijden
 * stapelt vermoeidheid op, te licht kost alleen prikkel.
 */
export const COMPLIANCE_PILLS: Record<ComplianceVerdict, string> = {
  niet_gereden: "bg-muted text-muted-foreground",
  te_licht: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  volgens_plan: "bg-zwb-teal text-white",
  te_zwaar: "bg-destructive/20 text-destructive",
};

export function summarizeCompliance(workouts: WorkoutCompliance[]): ComplianceSummary {
  const measured = workouts.filter((workout) => workout.loadPct != null);
  return {
    planned: workouts.length,
    ridden: workouts.filter((workout) => workout.verdict !== "niet_gereden").length,
    missed: workouts.filter((workout) => workout.verdict === "niet_gereden").length,
    tooLight: workouts.filter((workout) => workout.verdict === "te_licht").length,
    tooHard: workouts.filter((workout) => workout.verdict === "te_zwaar").length,
    onPlan: workouts.filter((workout) => workout.verdict === "volgens_plan").length,
    avgLoadPct: measured.length
      ? Math.round(
          measured.reduce((total, workout) => total + (workout.loadPct as number), 0) /
            measured.length,
        )
      : null,
  };
}

export type PlannedWorkoutForCompliance = {
  id: string;
  scheduled_at: string;
  title: string;
  duration_minutes: number | null;
  intensity: string;
  structure_json: unknown;
};

export type ReportForCompliance = {
  workout_id: string;
  athlete_rpe: number | null;
  athlete_feel: string | null;
};

/**
 * Pure koppeling van geplande workouts aan gereden ritten. De match loopt via de
 * kalenderdag in Amsterdam-tijd en, bij meerdere ritten op één dag, via de
 * rijtijd die het dichtst bij de geplande duur ligt.
 */
export function complianceForWorkouts(
  workouts: PlannedWorkoutForCompliance[],
  rides: StravaRideRow[],
  ftpWatts: number | null,
  reports: Map<string, ReportForCompliance> = new Map(),
): WorkoutCompliance[] {
  const used = new Set<number>();

  return workouts
    .filter((workout) => workout.intensity !== "rest")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((workout) => {
      const plannedMinutes = workout.duration_minutes ?? null;
      const blocks = normalizeWorkoutBlocks(
        workout.structure_json,
        workout.intensity as WorkoutIntensity,
      );
      const plannedLoad = blocks.length > 0 ? estimateTrainingLoad(blocks) : null;

      // Een rit kan maar bij één workout horen; zonder deze filter zou een
      // dubbele training op één dag twee keer als "gereden" tellen.
      const available = rides.filter((row) => !used.has(row.id));
      const match = pickRideForWorkout(available, workout.scheduled_at, plannedMinutes);
      if (match) used.add(match.id);

      const metrics = match
        ? rideMetricsFromStrava(match.raw, match.moving_time_seconds, ftpWatts)
        : null;
      const loadPct = loadPercentage(metrics?.tss ?? null, plannedLoad);
      const report = reports.get(workout.id);

      return {
        workoutId: workout.id,
        date: String(workout.scheduled_at).slice(0, 10),
        title: workout.title,
        plannedMinutes,
        plannedLoad,
        plannedIntensity: workout.intensity,
        actualMinutes: metrics?.movingMinutes ?? null,
        actualLoad: metrics?.tss ?? null,
        actualIf: metrics?.intensityFactor ?? null,
        loadPct,
        verdict: complianceVerdict(loadPct, Boolean(match)),
        athleteRpe: report?.athlete_rpe ?? null,
        athleteFeel: report?.athlete_feel ?? null,
      };
    });
}

/**
 * De rit die bij een geplande workout hoort: zelfde kalenderdag, en bij meerdere
 * ritten die dag degene met de rijtijd het dichtst bij de geplande duur.
 * Spiegelbeeld van pickPlannedWorkout, dat vanuit de rit redeneert.
 */
export function pickRideForWorkout<T extends StravaRideRow>(
  rides: T[],
  scheduledAt: string,
  plannedMinutes: number | null,
): T | null {
  const dayKey = amsterdamDayKey(new Date(scheduledAt));
  const sameDay = rides.filter(
    (row) => amsterdamDayKey(new Date(row.start_date)) === dayKey,
  );
  if (sameDay.length === 0) return null;
  if (sameDay.length === 1 || plannedMinutes == null) {
    return [...sameDay].sort(
      (a, b) => (b.moving_time_seconds ?? 0) - (a.moving_time_seconds ?? 0),
    )[0];
  }

  const gap = (row: T) =>
    row.moving_time_seconds == null
      ? Number.POSITIVE_INFINITY
      : Math.abs(row.moving_time_seconds / 60 - plannedMinutes);
  return [...sameDay].sort(
    (a, b) => gap(a) - gap(b) || (b.moving_time_seconds ?? 0) - (a.moving_time_seconds ?? 0),
  )[0];
}

/**
 * Naleving over de afgelopen periode. De ritten komen uit strava_activities:
 * intervals.icu geeft via de API niets terug voor activiteiten die daar via
 * Strava binnenkwamen, en dat is bij de meeste leden alles.
 */
/**
 * Ligt dit schema stil? De laatste `streak` trainingen die geweest zijn, zijn
 * geen van alle gereden.
 *
 * Waarom dit bestaat: uit de doorlichting van 2026-08-20 bleek dat het systeem
 * bleef herzien voor leden die hun schema niet aanraakten — voor één lid twaalf
 * generaties en zes herzieningen bij nul gereden trainingen. Een herziening is
 * dan geen dienst maar ruis, en hij kost geld.
 *
 * Bewust op een reeks en niet op een percentage: wie de helft van zijn
 * trainingen rijdt, is bezig. Wie er vier op rij laat lopen, is dat niet.
 */
export function planIsBeingIgnored(workouts: WorkoutCompliance[], streak = 4): boolean {
  // buildComplianceContext levert alleen trainingen met een datum in het
  // verleden, op volgorde; de laatste vier zijn dus de vier meest recente.
  if (workouts.length < streak) return false;
  return workouts.slice(-streak).every((workout) => workout.verdict === "niet_gereden");
}

export async function buildComplianceContext(
  admin: Admin,
  profileId: string,
  days = 21,
): Promise<ComplianceContext | null> {
  const now = Date.now();
  const fromIso = new Date(now - days * 86400_000).toISOString();

  const [{ data: workoutRows }, { data: rideRows }, { data: profile }] = await Promise.all([
    admin
      .from("training_workouts")
      .select("id, scheduled_at, title, duration_minutes, intensity, structure_json")
      .eq("profile_id", profileId)
      .is("superseded_at", null)
      .neq("status", "skipped")
      .gte("scheduled_at", fromIso)
      .lte("scheduled_at", new Date(now).toISOString())
      .order("scheduled_at", { ascending: true }),
    admin
      .from("strava_activities")
      .select(STRAVA_RIDE_COLUMNS)
      .eq("profile_id", profileId)
      .gte("start_date", new Date(now - (days + 1) * 86400_000).toISOString()),
    admin.from("profiles").select("ftp_watts").eq("id", profileId).maybeSingle(),
  ]);

  const workouts = (workoutRows ?? []) as PlannedWorkoutForCompliance[];
  if (workouts.length === 0) return null;

  const { data: reportRows } = await admin
    .from("training_workout_reports")
    .select("workout_id, athlete_rpe, athlete_feel")
    .in(
      "workout_id",
      workouts.map((workout) => workout.id),
    );
  const reports = new Map(
    ((reportRows ?? []) as ReportForCompliance[]).map((row) => [row.workout_id, row]),
  );

  const result = complianceForWorkouts(
    workouts,
    (rideRows ?? []) as StravaRideRow[],
    profile?.ftp_watts == null ? null : Number(profile.ftp_watts),
    reports,
  );
  return { workouts: result, summary: summarizeCompliance(result) };
}
