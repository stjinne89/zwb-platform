// Wat de coach van een lid weet als het een vraag stelt.
//
// Twee helften. De eerste is "keuzes onderbouwen": de redenering achter een
// schema zit in de "Let op"-regels die de AI zelf bij het plan schreef
// (training_plans.summary, uit elkaar gehaald door plan-summary.ts) en in de
// invoer die het model zag toen het die keuzes maakte
// (training_ai_generations.prompt_summary). Zonder dat tweede stuk kan de coach
// alleen herhalen wát er staat, niet waaróm.
//
// De tweede helft is wat het lid werkelijk reed: `trainingsdata`, uit
// training-data.ts. Die ontbrak in de eerste versie, en daardoor antwoordde de
// coach op "kun je bij mijn trainingsdata" terecht nee — hij kende alleen de
// belasting van het moment waarop het schema werd gemaakt.
//
// De rest komt uit loaders die draft.ts al gebruikt. Eén netwerkronde is er nu
// wel: de actuele CTL/ATL/TSB staat nergens in onze database. Die call heeft een
// eigen tijdbudget en mislukt stil, zodat een trage koppeling nooit het
// coach-antwoord kost.

import type { createAdminClient } from "@/lib/supabase/admin";
import { activeBasePlan } from "@/lib/training/active-plan";
import { availabilityForAi } from "@/lib/training/availability";
import { buildComplianceContext } from "@/lib/training/compliance";
import { cautionsFromSummary, summaryWithoutCautions } from "@/lib/training/plan-summary";
import { seasonPlanForAi } from "@/lib/training/season-data";
import { buildCoachTrainingData, type CoachTrainingData } from "@/lib/training/training-data";
import { getWellnessSummary } from "@/lib/training/wellness";
import { normalizeWorkoutBlocks, type WorkoutIntensity } from "@/lib/training/workouts";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

type Admin = ReturnType<typeof createAdminClient>;

/** Hoe ver vooruit de coach het schema meekrijgt. */
const LOOKAHEAD_DAYS = 21;
/** Hoe ver terug de naleving wordt gemeten; gelijk aan de default van draft.ts. */
const COMPLIANCE_DAYS = 21;
/**
 * Plafond op de generatie-invoer. Die is doorgaans een paar kB, maar bij een
 * lid met veel events en een volle beschikbaarheid loopt hij op, en hij mag de
 * vraag van het lid niet uit het venster duwen.
 */
const MAX_GENERATION_INPUT_CHARS = 12_000;

export type CoachChatContext = {
  vandaag: string;
  schema: {
    id: string;
    titel: string;
    status: string;
    startDatum: string;
    eindDatum: string;
    omschrijving: string;
    /** De "Let op"-regels, volledig — niet de ingekorte memberCautions-lijst. */
    letOp: string[];
  } | null;
  /**
   * De invoer waarop dit schema is gemaakt, ontdaan van de naam. Dit is letterlijk
   * wat het model zag toen het de keuzes maakte.
   */
  generatieInvoer: unknown | null;
  komendeWorkouts: Array<{
    datum: string;
    titel: string;
    minuten: number;
    intensiteit: string;
    status: string;
    blokken: Array<{ label: string; minuten: number; intensiteit: string }>;
  }>;
  doel: {
    titel: string;
    type: string;
    doeldatum: string | null;
    maxUrenPerWeek: number | null;
    niveau: string;
    gewensteIntensiteit: string;
    aandachtspunten: string | null;
  } | null;
  beschikbaarheid: unknown | null;
  seizoen: unknown | null;
  naleving: {
    gepland: number;
    gereden: number;
    gemist: number;
    teLicht: number;
    teZwaar: number;
    opSchema: number;
    gemiddeldeBelastingPct: number | null;
    /**
     * Gepland naast gereden, per training. De samenvatting zegt dát er twee
     * trainingen te licht waren; dit zegt welke, met wat het lid erover schreef.
     */
    perTraining: Array<{
      datum: string;
      titel: string;
      geplandeMinuten: number | null;
      geplandeBelasting: number | null;
      intensiteit: string;
      geredenOp: string | null;
      geredenNaam: string | null;
      geredenMinuten: number | null;
      geredenBelasting: number | null;
      belastingPct: number | null;
      oordeel: string;
      rpe: number | null;
      gevoel: string | null;
      opmerking: string | null;
    }>;
  } | null;
  /** Wat het lid werkelijk reed: ritten, weekbelasting, vermogen en vorm. */
  trainingsdata: CoachTrainingData | null;
  /** Alleen gevuld als het lid hersteldata deelt. */
  herstel: unknown | null;
};

/** Hoeveel trainingen er met gepland-naast-gereden meegaan. */
const COMPLIANCE_DETAIL_LIMIT = 12;
/** Wat een lid bij een training schreef gaat mee, maar niet onbegrensd. */
const REPORT_CHARS = 200;

function dayKeyPlus(days: number): string {
  return amsterdamDayKey(new Date(Date.now() + days * 86_400_000));
}

/**
 * De generatie-invoer opschonen voordat hij opnieuw naar OpenAI gaat.
 *
 * `athleteName` staat erin omdat draft.ts hem meestuurt. Voor een uitleg voegt
 * een naam niets toe, en de privacyverklaring belooft dat er geen directe
 * identificatiegegevens naar OpenAI gaan. Dus eruit.
 */
function stripIdentifiers(promptSummary: string | null): unknown | null {
  if (!promptSummary) return null;
  try {
    const parsed = JSON.parse(promptSummary) as Record<string, unknown>;
    delete parsed.athleteName;
    const text = JSON.stringify(parsed);
    return text.length > MAX_GENERATION_INPUT_CHARS ? null : parsed;
  } catch {
    // Geen geldige JSON (oude rij, of een generatie die anders is opgeslagen):
    // dan liever niets dan een halve string waar het model op gaat gokken.
    return null;
  }
}

type WorkoutRow = {
  id: string;
  plan_id: string;
  scheduled_at: string;
  title: string;
  duration_minutes: number;
  intensity: string;
  status: string;
  structure_json: unknown;
};

export async function buildCoachChatContext(
  admin: Admin,
  profileId: string,
): Promise<CoachChatContext> {
  const vandaag = amsterdamDayKey();
  const tot = dayKeyPlus(LOOKAHEAD_DAYS);

  const [plan, { data: workoutRows }, { data: goalRow }, beschikbaarheid, seizoen, naleving] =
    await Promise.all([
      activeBasePlan(admin, profileId),
      admin
        .from("training_workouts")
        .select("id, plan_id, scheduled_at, title, duration_minutes, intensity, status, structure_json")
        .eq("profile_id", profileId)
        .is("superseded_at", null)
        .gte("scheduled_at", `${vandaag}T00:00:00Z`)
        .lte("scheduled_at", `${tot}T23:59:59Z`)
        .order("scheduled_at", { ascending: true })
        .limit(30),
      admin
        .from("training_goals")
        .select("title, goal_type, target_date, max_hours_per_week, experience_level, desired_intensity, risk_notes")
        .eq("profile_id", profileId)
        .eq("status", "active")
        .order("target_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      availabilityForAi(admin, profileId, vandaag, tot).catch(() => null),
      seasonPlanForAi(admin, profileId, vandaag, tot).catch(() => null),
      buildComplianceContext(admin, profileId, COMPLIANCE_DAYS).catch(() => null),
    ]);

  const workouts = (workoutRows ?? []) as WorkoutRow[];

  // De samenvatting van het plan waar de eerstvolgende workout bij hoort, niet
  // die van het basisplan: een herziening maakt een nieuw plan met een nieuwe
  // redenering, en dát is de redenering achter wat er nu staat. Zelfde keuze als
  // loadPlanCautions() op de Vandaag-pagina.
  const planId = workouts[0]?.plan_id ?? plan?.id ?? null;
  const { data: planRow } = planId
    ? await admin
        .from("training_plans")
        .select("id, title, summary, status, start_date, end_date, ai_generation_id")
        .eq("id", planId)
        .maybeSingle()
    : { data: null };

  const planDetail = planRow as {
    id: string;
    title: string;
    summary: string | null;
    status: string;
    start_date: string;
    end_date: string;
    ai_generation_id: string | null;
  } | null;

  const { data: generationRow } = planDetail?.ai_generation_id
    ? await admin
        .from("training_ai_generations")
        .select("prompt_summary")
        .eq("id", planDetail.ai_generation_id)
        .maybeSingle()
    : { data: null };

  // Eén keer de koppeling: de sleutels zijn voor de vorm (CTL/ATL/TSB) in de
  // trainingsdata, wellness_opt_in beslist over de hersteldata daaronder.
  const { data: connectionRow } = await admin
    .from("intervals_connections")
    .select("api_key, athlete_id, wellness_opt_in")
    .eq("profile_id", profileId)
    .maybeSingle();
  const connection = connectionRow as {
    api_key: string | null;
    athlete_id: string | null;
    wellness_opt_in: boolean | null;
  } | null;

  const [trainingsdata, herstel] = await Promise.all([
    buildCoachTrainingData(admin, profileId, connection).catch(() => null),
    connection?.wellness_opt_in
      ? getWellnessSummary(admin, profileId).catch(() => null)
      : Promise.resolve(null),
  ]);

  const goal = goalRow as {
    title: string;
    goal_type: string;
    target_date: string | null;
    max_hours_per_week: number | null;
    experience_level: string;
    desired_intensity: string;
    risk_notes: string | null;
  } | null;

  return {
    vandaag,
    schema: planDetail
      ? {
          id: planDetail.id,
          titel: planDetail.title,
          status: planDetail.status,
          startDatum: planDetail.start_date,
          eindDatum: planDetail.end_date,
          omschrijving: summaryWithoutCautions(planDetail.summary),
          letOp: cautionsFromSummary(planDetail.summary),
        }
      : null,
    generatieInvoer: stripIdentifiers(
      (generationRow as { prompt_summary: string | null } | null)?.prompt_summary ?? null,
    ),
    komendeWorkouts: workouts.map((workout) => ({
      datum: String(workout.scheduled_at).slice(0, 10),
      titel: workout.title,
      minuten: workout.duration_minutes,
      intensiteit: workout.intensity,
      status: workout.status,
      blokken: normalizeWorkoutBlocks(
        workout.structure_json,
        workout.intensity as WorkoutIntensity,
      ).map((block) => ({
        label: block.label,
        minuten: block.durationMinutes,
        intensiteit: block.intensity,
      })),
    })),
    doel: goal
      ? {
          titel: goal.title,
          type: goal.goal_type,
          doeldatum: goal.target_date,
          maxUrenPerWeek: goal.max_hours_per_week == null ? null : Number(goal.max_hours_per_week),
          niveau: goal.experience_level,
          gewensteIntensiteit: goal.desired_intensity,
          aandachtspunten: goal.risk_notes,
        }
      : null,
    beschikbaarheid,
    seizoen,
    naleving: naleving
      ? {
          gepland: naleving.summary.planned,
          gereden: naleving.summary.ridden,
          gemist: naleving.summary.missed,
          teLicht: naleving.summary.tooLight,
          teZwaar: naleving.summary.tooHard,
          opSchema: naleving.summary.onPlan,
          gemiddeldeBelastingPct: naleving.summary.avgLoadPct,
          perTraining: naleving.workouts.slice(-COMPLIANCE_DETAIL_LIMIT).map((workout) => ({
            datum: workout.date,
            titel: workout.title,
            geplandeMinuten: workout.plannedMinutes,
            geplandeBelasting: workout.plannedLoad,
            intensiteit: workout.plannedIntensity,
            geredenOp: workout.actualDate,
            geredenNaam: workout.actualName,
            geredenMinuten: workout.actualMinutes,
            geredenBelasting: workout.actualLoad,
            belastingPct: workout.loadPct,
            oordeel: workout.verdict,
            rpe: workout.athleteRpe,
            gevoel: workout.athleteFeel,
            opmerking: workout.athleteReport
              ? workout.athleteReport.slice(0, REPORT_CHARS)
              : null,
          })),
        }
      : null,
    trainingsdata,
    herstel,
  };
}
