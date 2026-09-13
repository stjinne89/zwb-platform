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
  /**
   * Kalenderdag (Amsterdam) en naam van de rit die bij deze training hoort.
   * Wijkt die dag af van `date`, dan is de training verschoven gereden: dezelfde
   * prikkel op een andere dag, geen extra training.
   */
  actualDate: string | null;
  actualName: string | null;
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
  athleteReport: string | null;
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
  athlete_report: string | null;
  /** De vastgelegde rit bij deze training, als die er is. */
  paired_activity_id?: string | null;
};

/** Wat de koppeling van een workout nodig heeft: wanneer, en hoe lang gepland. */
export type WorkoutForPairing = {
  id: string;
  scheduled_at: string;
  duration_minutes: number | null;
};

/**
 * Welke rit bij welke workout hoort. Elke workout claimt hooguit één rit van die
 * dag, en een geclaimde rit is voor de volgende workout van tafel — anders zou
 * een tweede training op dezelfde dag dezelfde rit nog eens opeisen.
 *
 * Een workout die al een `paired_activity_id` heeft, houdt die rit: die
 * koppeling is vastgelegd en weegt zwaarder dan wat we hier opnieuw zouden
 * uitrekenen. Alle vastgelegde ritten gaan er daarom vooraf af, zodat een
 * workout zonder koppeling er niet alsnog eentje wegkaapt. Staat de vastgelegde
 * rit niet meer in de bron, dan blijft de workout zonder rit — opnieuw matchen
 * zou de bevestigde koppeling stilzwijgend vervangen.
 *
 * `pairedActivityIds` mag ook koppelingen bevatten van workouts die niet in
 * `workouts` staan; die halen alleen hun rit van tafel. Zo telt een rit die het
 * lid aan de training van donderdag hing niet nóg eens voor de training van
 * vrijdag, ook als donderdag buiten het venster van de aanroeper valt.
 *
 * Staat dezelfde rit twee keer in `rides` (overlappende queries), dan telt hij één keer.
 */
export function pairWorkoutsWithRides<T extends StravaRideRow>(
  workouts: WorkoutForPairing[],
  rides: T[],
  pairedActivityIds: ReadonlyMap<string, string | null | undefined>,
): Map<string, T | null> {
  const used = new Set<string>();
  for (const id of pairedActivityIds.values()) {
    if (id != null && id !== "") used.add(String(id));
  }
  const ridesById = new Map(rides.map((ride) => [String(ride.id), ride]));
  const uniqueRides = [...ridesById.values()];

  const pairs = new Map<string, T | null>();
  for (const workout of workouts) {
    const paired = pairedActivityIds.get(workout.id);
    if (paired != null && paired !== "") {
      pairs.set(workout.id, ridesById.get(String(paired)) ?? null);
      continue;
    }
    const match = pickRideForWorkout(
      uniqueRides.filter((ride) => !used.has(String(ride.id))),
      workout.scheduled_at,
      workout.duration_minutes ?? null,
    );
    pairs.set(workout.id, match);
    if (match) used.add(String(match.id));
  }
  return pairs;
}

/**
 * Pure koppeling van geplande workouts aan gereden ritten, via
 * pairWorkoutsWithRides: een vastgelegde koppeling uit de rapportage gaat voor,
 * verder de kalenderdag in Amsterdam-tijd en bij meerdere ritten de rijtijd die
 * het dichtst bij de geplande duur ligt.
 *
 * Tot 13 september 2026 negeerde deze functie vastgelegde koppelingen. Een lid
 * dat de training van donderdag op vrijdag reed en die rit aan donderdag hing,
 * zag de AI dan donderdag als niet gereden lezen en vrijdag als afwijking van
 * de training die daar gepland stond.
 */
export function complianceForWorkouts(
  workouts: PlannedWorkoutForCompliance[],
  rides: StravaRideRow[],
  ftpWatts: number | null,
  reports: Map<string, ReportForCompliance> = new Map(),
  /** Koppelingen van workouts buiten `workouts`; zie pairWorkoutsWithRides. */
  otherPairings: ReadonlyMap<string, string | null | undefined> = new Map(),
): WorkoutCompliance[] {
  const sorted = workouts
    .filter((workout) => workout.intensity !== "rest")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const pairings = new Map(otherPairings);
  for (const [workoutId, report] of reports) {
    if (report.paired_activity_id) pairings.set(workoutId, report.paired_activity_id);
  }
  // Een rit kan maar bij één workout horen; anders zou een dubbele training op
  // één dag twee keer als "gereden" tellen.
  const pairs = pairWorkoutsWithRides(sorted, rides, pairings);

  return sorted.map((workout) => {
      const plannedMinutes = workout.duration_minutes ?? null;
      const blocks = normalizeWorkoutBlocks(
        workout.structure_json,
        workout.intensity as WorkoutIntensity,
      );
      const plannedLoad = blocks.length > 0 ? estimateTrainingLoad(blocks, ftpWatts) : null;
      const match = pairs.get(workout.id) ?? null;

      const metrics = match
        ? rideMetricsFromStrava(match.raw, match.moving_time_seconds, ftpWatts)
        : null;
      const loadPct = loadPercentage(metrics?.tss ?? null, plannedLoad);
      const report = reports.get(workout.id);

      return {
        workoutId: workout.id,
        date: amsterdamDayKey(new Date(workout.scheduled_at)),
        title: workout.title,
        actualDate: match ? amsterdamDayKey(new Date(match.start_date)) : null,
        actualName: match?.name ?? null,
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
        athleteReport: report?.athlete_report ?? null,
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

/**
 * Alle vastgelegde koppelingen (workoutId → Strava-id) voor deze ritten, ook van
 * workouts buiten het venster van de aanroeper. Zie pairWorkoutsWithRides.
 */
export async function loadRidePairings(
  admin: Admin,
  profileId: string,
  rides: Pick<StravaRideRow, "id">[],
): Promise<Map<string, string>> {
  const ids = [...new Set(rides.map((ride) => String(ride.id)))];
  if (ids.length === 0) return new Map();
  const { data } = await admin
    .from("training_workout_reports")
    .select("workout_id, paired_activity_id")
    .eq("profile_id", profileId)
    .in("paired_activity_id", ids);
  return new Map(
    ((data ?? []) as Array<{ workout_id: string; paired_activity_id: string | null }>)
      .filter((row) => row.paired_activity_id)
      .map((row) => [row.workout_id, String(row.paired_activity_id)]),
  );
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

  const rides = (rideRows ?? []) as StravaRideRow[];
  const [{ data: reportRows }, otherPairings] = await Promise.all([
    admin
      .from("training_workout_reports")
      .select("workout_id, athlete_rpe, athlete_feel, athlete_report, paired_activity_id")
      .in(
        "workout_id",
        workouts.map((workout) => workout.id),
      ),
    loadRidePairings(admin, profileId, rides),
  ]);
  const reports = new Map(
    ((reportRows ?? []) as ReportForCompliance[]).map((row) => [row.workout_id, row]),
  );

  const result = complianceForWorkouts(
    workouts,
    rides,
    profile?.ftp_watts == null ? null : Number(profile.ftp_watts),
    reports,
    otherPairings,
  );
  return { workouts: result, summary: summarizeCompliance(result) };
}
