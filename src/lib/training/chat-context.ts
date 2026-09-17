// Wat de coach van een lid weet als het een vraag stelt.
//
// Dit is het hart van "keuzes onderbouwen". De redenering achter een schema zit
// op twee plekken: in de "Let op"-regels die de AI zelf bij het plan schreef
// (training_plans.summary, uit elkaar gehaald door plan-summary.ts), en in de
// invoer die het model zag toen het die keuzes maakte
// (training_ai_generations.prompt_summary). Zonder dat tweede stuk kan de coach
// alleen herhalen wát er staat, niet waaróm.
//
// Alles hieronder komt uit loaders die draft.ts al gebruikt. Bewust geen nieuwe
// queries en bewust geen live intervals.icu-call: die kost bij elk chatbericht
// een netwerkronde die kan mislukken, terwijl de CTL/TSB die ertoe doet — die
// waarop het schema gebouwd is — al in de generatie-invoer staat.

import type { createAdminClient } from "@/lib/supabase/admin";
import { activeBasePlan } from "@/lib/training/active-plan";
import { availabilityForAi } from "@/lib/training/availability";
import { buildComplianceContext } from "@/lib/training/compliance";
import { cautionsFromSummary, summaryWithoutCautions } from "@/lib/training/plan-summary";
import { seasonPlanForAi } from "@/lib/training/season-data";
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
  } | null;
  /** Alleen gevuld als het lid hersteldata deelt. */
  herstel: unknown | null;
};

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

  // Hersteldata alleen als het lid die deelt. wellness_opt_in staat op de
  // intervals-koppeling; zonder koppeling is er sowieso niets.
  const { data: connection } = await admin
    .from("intervals_connections")
    .select("wellness_opt_in")
    .eq("profile_id", profileId)
    .maybeSingle();
  const herstel = (connection as { wellness_opt_in: boolean | null } | null)?.wellness_opt_in
    ? await getWellnessSummary(admin, profileId).catch(() => null)
    : null;

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
        }
      : null,
    herstel,
  };
}
