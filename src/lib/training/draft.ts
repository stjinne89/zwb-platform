import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { fetchIntervalsWellness } from "@/lib/intervals/client";
import { intervalsWeekUrl } from "@/lib/intervals/links";
import { sendNotificationToMembers } from "@/lib/push/send";
import {
  defaultTrainingPrompt,
  generateTrainingPlanDraft,
  retrieveTrainingPlanDraftBackground,
  startTrainingPlanDraftBackground,
  type GeneratedTrainingPlan,
  type GeneratedWorkout,
  type TrainingAiInput,
} from "@/lib/training/ai";
import {
  adaptiveDailyPrompt,
  normalizeWorkoutBlocks,
  planUpdatePrompt,
  WORKOUT_INTENSITIES,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { buildYesterdayContext } from "@/lib/training/adapt-context";
import { buildComplianceContext } from "@/lib/training/compliance";
import { loadSymptomLoadForAi } from "@/lib/training/symptoms";
import { availabilityForAi, loadFixedWorkouts } from "@/lib/training/availability";
import {
  asFtpTestType,
  ftpTestBlocks,
  ftpTestDurationMinutes,
  ftpTestTitle,
  loadFtpTests,
  type FtpTestType,
} from "@/lib/training/ftp-test";
import { committedEventsForAi } from "@/lib/training/events";
import { rootIdOf } from "@/lib/training/plan-tree";
import { pushPlanWorkoutsToIntervals } from "@/lib/training/publish";
import { amsterdamDayKey, endOfWeekKey } from "@/lib/training/zwbeterworden";

type TrainingDraftStatus = "queued" | "in_progress" | "completed" | "failed" | "cancelled";

/** Onder deze grens is een aanpassing zinloos; dan is het een rustdag. */
export const MIN_ADJUST_MINUTES = 10;
/**
 * Bovengrens voor een dagaanpassing. Was de DB-cap op
 * training_workouts.duration_minutes; sinds migratie `0125` staat die op 720 om
 * een lang clubevent te kunnen opslaan. Een tráining van meer dan acht uur
 * bestaat niet, dus die grens blijft hier staan.
 */
export const MAX_ADJUST_MINUTES = 480;

type TrainingDraftResult =
  | {
      ok: true;
      generationId: string;
      status: TrainingDraftStatus;
      planId?: string;
      message?: string;
      error?: string;
      /** Staat het schema al in intervals.icu? Alleen bij dag-aanpassingen. */
      published?: boolean;
      /** Deeplink naar de week in intervals.icu, zodra gepubliceerd. */
      intervalsUrl?: string | null;
    }
  | { ok: false; error: string };

type AiGenerationRow = {
  id: string;
  profile_id: string;
  trainer_id: string | null;
  goal_id: string | null;
  model: string;
  status: TrainingDraftStatus;
  prompt_summary: string;
  response_json: unknown | null;
  error: string | null;
  openai_response_id: string | null;
  parent_plan_id: string | null;
  adaptation_reason: string | null;
  adaptation_kind: "day" | "plan_update" | null;
  adapt_from_date: string | null;
  /** Gevraagde FTP-test bij een nieuw schema; wordt bij het plan een workout. */
  ftp_test_type: string | null;
  ftp_test_date: string | null;
  /**
   * Wanneer de generatie is gestart, en daarmee wanneer de invoer is opgebouwd.
   * Alles wat het lid daarna wijzigde zit er niet in — daar rekent het opruimen
   * van een openstaand herzieningsverzoek mee.
   */
  created_at: string;
};

/** Kolommen die pollAiDraft nodig heeft om het plan te kunnen bouwen. */
const AI_GENERATION_COLUMNS =
  "id, profile_id, trainer_id, goal_id, model, status, prompt_summary, response_json, error, openai_response_id, parent_plan_id, adaptation_reason, adaptation_kind, adapt_from_date, ftp_test_type, ftp_test_date, created_at";

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function mustString(value: FormDataEntryValue | null, label: string) {
  const text = optionalString(value);
  if (!text) throw new Error(`${label} ontbreekt.`);
  return text;
}

// Databasefouten mogen nooit rauw in de UI belanden.
function friendlyDbError(message: string) {
  if (message.includes("training_workouts_duration_minutes_check")) {
    return "De AI stelde een ongeldige trainingsduur voor. Probeer het opnieuw.";
  }
  return "Schema opslaan is mislukt. Probeer het opnieuw.";
}

function assertWorkoutIntensity(value: string): asserts value is WorkoutIntensity {
  if (!(WORKOUT_INTENSITIES as readonly string[]).includes(value)) {
    throw new Error("Ongeldige intensiteit.");
  }
}

async function currentUser() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) throw new Error("Niet ingelogd.");
  return { access, user: access.user };
}

async function canCoach(admin: ReturnType<typeof createAdminClient>, trainerId: string, athleteId: string) {
  if (trainerId === athleteId) return true;
  const { data } = await admin
    .from("training_coach_assignments")
    .select("id")
    .eq("trainer_id", trainerId)
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data);
}

async function canAccessGeneration(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  access: Awaited<ReturnType<typeof getCurrentUserAccess>>,
  generation: AiGenerationRow,
) {
  if (access.has("training.manage_assignments")) return true;
  if (generation.profile_id === userId || generation.trainer_id === userId) return true;
  return canCoach(admin, userId, generation.profile_id);
}

/**
 * Trainingsbelasting van de afgelopen 28 dagen uit Strava. Gedeeld door de
 * trainer-flow en de dag-aanpassing: zonder dit ziet de AI een renner die niets
 * doet en plant hij structureel te voorzichtig.
 */
export async function buildRecentLoad(
  admin: ReturnType<typeof createAdminClient>,
  athleteId: string,
  days = 28,
): Promise<TrainingAiInput["recentLoad"]> {
  const { data: activities } = await admin
    .from("strava_activities")
    .select("distance_m, total_elevation_gain_m, moving_time_seconds")
    .eq("profile_id", athleteId)
    .gte("start_date", new Date(Date.now() - days * 86400_000).toISOString());

  const totals = (activities ?? []).reduce(
    (acc, row) => ({
      days: acc.days,
      activities: acc.activities + 1,
      distanceKm: acc.distanceKm + Number(row.distance_m ?? 0) / 1000,
      elevationM: acc.elevationM + Number(row.total_elevation_gain_m ?? 0),
      hours: acc.hours + Number(row.moving_time_seconds ?? 0) / 3600,
    }),
    { days, activities: 0, distanceKm: 0, elevationM: 0, hours: 0 },
  );

  // Voorgerekend, want dit is precies de deling die het model eerder zelf maakte
  // en toen tegen het urenplafond legde alsof het een overschrijding was. Nu is
  // het waar het voor bedoeld is: het volume dat dit lid al aankan.
  return {
    ...totals,
    hoursPerWeek: days > 0 ? Math.round((totals.hours / days) * 7 * 10) / 10 : 0,
  };
}

/**
 * Actuele belasting/vorm uit intervals.icu (CTL/ATL/TSB/eFTP/ramp rate).
 * Best-effort: zonder koppeling of bij een API-fout gaat de AI door zonder.
 */
export async function buildIntervalsLoad(
  admin: ReturnType<typeof createAdminClient>,
  athleteId: string,
): Promise<TrainingAiInput["intervalsLoad"]> {
  try {
    const { data: conn } = await admin
      .from("intervals_connections")
      .select("api_key, athlete_id")
      .eq("profile_id", athleteId)
      .maybeSingle();
    if (!conn?.api_key || !conn?.athlete_id) return null;

    const rows = await fetchIntervalsWellness(conn.api_key, conn.athlete_id, 30);
    const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id));
    const latest = sorted[sorted.length - 1];
    if (!latest) return null;

    const ctl = latest.ctl ?? null;
    const atl = latest.atl ?? null;
    return {
      ctl,
      atl,
      tsb: ctl != null && atl != null ? Math.round((ctl - atl) * 10) / 10 : null,
      eftp: [...sorted].reverse().find((r) => r.eftp)?.eftp ?? null,
      rampRate: latest.ramp_rate ?? null,
    };
  } catch {
    // Niet kritiek: AI kan zonder intervals-belasting door.
    return null;
  }
}

async function buildTrainingInput(
  admin: ReturnType<typeof createAdminClient>,
  athleteId: string,
  goalId: string,
  /**
   * Een FTP-test die nog niet bestaat maar wel gepland gaat worden. Bij een
   * nieuw schema kan de workout er nog niet zijn — er is nog geen plan om hem
   * aan te hangen — maar de planner moet er wel omheen werken. Hij gaat daarom
   * als vast blok mee en wordt pas bij het aanmaken van het plan een echte rij.
   */
  plannedFtpTest?: { date: string; type: FtpTestType } | null,
): Promise<TrainingAiInput> {
  const [{ data: profile }, { data: goal }, recent] = await Promise.all([
    admin
      .from("profiles")
      .select("display_name, ftp_watts, weight_kg, zrl_category, sex")
      .eq("id", athleteId)
      .single(),
    admin
      .from("training_goals")
      .select("*")
      .eq("id", goalId)
      .eq("profile_id", athleteId)
      .single(),
    buildRecentLoad(admin, athleteId),
  ]);
  if (!profile || !goal) throw new Error("Profiel of doel niet gevonden.");

  const { wellnessForAi } = await import("@/lib/training/wellness");
  const wellness = await wellnessForAi(admin, athleteId).catch(() => null);
  const intervalsLoad = await buildIntervalsLoad(admin, athleteId);

  const horizon = goal.target_date
    ? new Date(goal.target_date)
    : new Date(Date.now() + 90 * 86400_000);
  const today = amsterdamDayKey();
  const horizonKey = horizon.toISOString().slice(0, 10);

  // Naleving van het lopende schema: hiermee kan de AI het volgende blok
  // afstemmen op wat het lid werkelijk rijdt in plaats van op wat er stond.
  const compliance = await buildComplianceContext(admin, athleteId).catch(() => null);

  // Wat het lid per week aan tijd heeft, welke ritten het al zelf heeft
  // vastgezet, en welke clubevents het heeft toegezegd. Zonder dat eerste plant
  // de AI dwars door een clubrit heen; zonder dat laatste zette hij sessies
  // klaar voor events waar het lid niet eens heen ging. De beschikbaarheid gaat
  // over het hele venster: één week meegeven liet de planner elke latere week op
  // de minuten van vandaag plannen.
  const [availability, loadedFixedWorkouts, upcomingEvents, ftpTests] = await Promise.all([
    availabilityForAi(admin, athleteId, today, horizonKey),
    loadFixedWorkouts(admin, athleteId, today, horizonKey).catch(() => []),
    committedEventsForAi(admin, athleteId, today, horizonKey),
    loadFtpTests(admin, athleteId, 1).catch(() => []),
  ]);

  const fixedWorkouts: NonNullable<TrainingAiInput["fixedWorkouts"]> = [...loadedFixedWorkouts];
  if (plannedFtpTest) {
    fixedWorkouts.push({
      date: plannedFtpTest.date,
      title: ftpTestTitle(plannedFtpTest.type),
      durationMinutes: ftpTestDurationMinutes(plannedFtpTest.type),
      intensity: "threshold",
      kind: "ftp_test" as const,
    });
    fixedWorkouts.sort((a, b) => a.date.localeCompare(b.date));
  }

  return {
    athleteName: profile.display_name ?? "ZWB-lid",
    goal: {
      title: goal.title,
      type: goal.goal_type,
      targetDate: goal.target_date,
      availableDays: goal.available_days ?? [],
      maxHoursPerWeek: goal.max_hours_per_week ? Number(goal.max_hours_per_week) : null,
      preferredMode: goal.preferred_mode,
      experienceLevel: goal.experience_level,
      desiredIntensity: goal.desired_intensity,
      riskNotes: goal.risk_notes,
    },
    profile: {
      ftpWatts: profile.ftp_watts ?? null,
      ftpTestedOn: ftpTests[0]?.testedOn ?? null,
      weightKg: profile.weight_kg ? Number(profile.weight_kg) : null,
      zrlCategory: profile.zrl_category ?? null,
      sex: profile.sex ?? null,
    },
    symptoms: await loadSymptomLoadForAi(admin, athleteId),
    recentLoad: recent,
    wellness: wellness
      ? {
          days: wellness.days,
          state: wellness.state,
          restingHr: wellness.restingHr,
          hrv: wellness.hrv,
          sleepHours: wellness.sleepHours,
          readiness: wellness.readiness,
          readinessSource: wellness.readinessSource,
          note: wellness.note,
        }
      : null,
    intervalsLoad,
    upcomingEvents,
    compliance,
    availability,
    fixedWorkouts,
  };
}

/**
 * Het schema waar een afgeleid plan bij hoort. Voor een basisplan is dat het
 * plan zelf; de kolom bestaat sinds 0113 maar kan bij oudere rijen leeg zijn,
 * vandaar de terugval op de parent-keten.
 */
export async function resolveRootPlanId(
  admin: ReturnType<typeof createAdminClient>,
  parentPlanId: string | null,
): Promise<string | null> {
  if (!parentPlanId) return null;
  const { data: parent } = await admin
    .from("training_plans")
    .select("id, profile_id, root_plan_id, parent_plan_id")
    .eq("id", parentPlanId)
    .maybeSingle();
  if (!parent) return null;
  if (parent.root_plan_id) return parent.root_plan_id as string;

  const { data: siblings } = await admin
    .from("training_plans")
    .select("id, parent_plan_id, root_plan_id, created_at")
    .eq("profile_id", parent.profile_id)
    .limit(500);
  return rootIdOf((siblings ?? []) as Parameters<typeof rootIdOf>[0], parentPlanId);
}

/**
 * Zet de workouts van een AI-concept in een schema. Gedeeld met de dagelijkse
 * cron: die had een eigen kopie zonder de 0-minutenfilter en zonder de cap op
 * 480, waardoor de duration-check een hele run kon laten klappen.
 */
export async function insertPlanWorkouts(
  admin: ReturnType<typeof createAdminClient>,
  plan: { id: string; profile_id: string; trainer_id: string | null },
  workouts: GeneratedWorkout[],
) {
  const rows = workouts
    // Een rustdag komt soms als 0-minuten-workout terug; die hoort niet in het schema.
    .filter((workout) => Math.round(workout.durationMinutes) >= 1)
    .map((workout) => {
      const intensity = workout.intensity;
      assertWorkoutIntensity(intensity);
      const blocks = normalizeWorkoutBlocks(workout.structure, intensity);
      return {
        plan_id: plan.id,
        profile_id: plan.profile_id,
        trainer_id: plan.trainer_id,
        scheduled_at: `${workout.date}T09:00:00+01:00`,
        title: workout.title,
        description: workout.description,
        duration_minutes: Math.min(480, Math.round(workout.durationMinutes)),
        intensity,
        target_type: workout.targetType,
        structure_json: blocks,
        origin: "ai",
        intervals_external_id: `zwb-${plan.id}-${workout.date}-${workout.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`,
      };
    });
  if (rows.length === 0) return 0;

  const { error } = await admin.from("training_workouts").insert(rows);
  if (error) throw new Error(friendlyDbError(error.message));
  return rows.length;
}

/**
 * Zet een FTP-test als vaste afspraak in een schema. origin 'member' is geen
 * detail: alleen daarmee overleeft de test elke herziening — retireSupersededWorkouts
 * laat wat het lid zelf heeft vastgezet met rust.
 */
export async function insertFtpTestWorkout(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    planId: string;
    profileId: string;
    trainerId: string | null;
    date: string;
    type: FtpTestType;
  },
): Promise<string> {
  const blocks = ftpTestBlocks(input.type);
  const title = ftpTestTitle(input.type);
  const { data, error } = await admin
    .from("training_workouts")
    .insert({
      plan_id: input.planId,
      profile_id: input.profileId,
      trainer_id: input.trainerId,
      scheduled_at: `${input.date}T09:00:00+01:00`,
      title,
      description:
        input.type === "ramp"
          ? "Trap tot je stukgaat; de laatste volledige minuut telt."
          : "Twintig minuten zo hard als je kunt volhouden; het gemiddelde telt.",
      duration_minutes: ftpTestDurationMinutes(input.type),
      intensity: "threshold",
      target_type: "power",
      structure_json: blocks,
      origin: "member",
      test_type: input.type,
      publish_status: "pending",
      intervals_external_id: `zwb-${input.planId}-${input.date}-ftp-test-${input.type}`,
    })
    .select("id")
    .single();
  if (error) throw new Error(friendlyDbError(error.message));
  return data.id as string;
}

async function createPlanFromAiGeneration(
  admin: ReturnType<typeof createAdminClient>,
  generation: Pick<
    AiGenerationRow,
    | "id"
    | "profile_id"
    | "trainer_id"
    | "goal_id"
    | "parent_plan_id"
    | "adaptation_reason"
    | "adaptation_kind"
    | "adapt_from_date"
    | "ftp_test_type"
    | "ftp_test_date"
    | "created_at"
  >,
  planDraft: GeneratedTrainingPlan,
) {
  const { data: existingPlan, error: existingError } = await admin
    .from("training_plans")
    .select("id")
    .eq("ai_generation_id", generation.id)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existingPlan) return existingPlan.id as string;

  // Afgeleid plan: dag-aanpassing (renner) of een bijwerking van het hele
  // resterende schema. De suffix maakt in de schemalijst zichtbaar welke van de
  // twee het is.
  const isAdaptation = Boolean(generation.parent_plan_id);
  const isPlanUpdate = generation.adaptation_kind === "plan_update";
  const title = isPlanUpdate
    ? `${planDraft.title} (bijgewerkt)`
    : isAdaptation
      ? `${planDraft.title} (aanpassing vandaag)`
      : planDraft.title;

  // root_plan_id wijst naar het schema waar deze rij bij hoort. Zonder dat zou
  // de aanpassing weer als los programma in de schemalijst belanden.
  const rootPlanId = await resolveRootPlanId(admin, generation.parent_plan_id ?? null);

  const { data: plan, error: planError } = await admin
    .from("training_plans")
    .insert({
      profile_id: generation.profile_id,
      trainer_id: generation.trainer_id,
      goal_id: generation.goal_id,
      ai_generation_id: generation.id,
      parent_plan_id: generation.parent_plan_id ?? null,
      root_plan_id: rootPlanId,
      adaptation_reason: generation.adaptation_reason ?? null,
      adaptation_kind: generation.adaptation_kind ?? (isAdaptation ? "day" : null),
      adapt_from_date: generation.adapt_from_date ?? null,
      title,
      summary: [planDraft.summary, ...planDraft.cautions.map((c) => `Let op: ${c}`)].join("\n\n"),
      start_date: planDraft.startDate,
      end_date: planDraft.endDate,
      status: "draft",
      source: "ai",
    })
    .select("id")
    .single();
  if (planError) {
    const { data: duplicatePlan } = await admin
      .from("training_plans")
      .select("id")
      .eq("ai_generation_id", generation.id)
      .maybeSingle();
    if (duplicatePlan) return duplicatePlan.id as string;
    throw new Error(friendlyDbError(planError.message));
  }

  // Een basisplan is zijn eigen schema. Dat kan pas na de insert: we hebben het
  // id nodig dat de database net heeft toegekend.
  if (!rootPlanId) {
    await admin.from("training_plans").update({ root_plan_id: plan.id }).eq("id", plan.id);
  }

  await insertPlanWorkouts(
    admin,
    { id: plan.id, profile_id: generation.profile_id, trainer_id: generation.trainer_id },
    planDraft.workouts,
  );

  // De gevraagde FTP-test. Die kon bij de generatie nog geen workout worden —
  // dit plan bestond toen niet — maar de AI heeft er wel omheen gepland, want
  // hij zat als vast blok in de input.
  const ftpTestType = asFtpTestType(generation.ftp_test_type);
  if (ftpTestType && generation.ftp_test_date) {
    await insertFtpTestWorkout(admin, {
      planId: plan.id,
      profileId: generation.profile_id,
      trainerId: generation.trainer_id,
      date: String(generation.ftp_test_date).slice(0, 10),
      type: ftpTestType,
    }).catch(() => null);
  }

  // Het openstaande herzieningsverzoek is hiermee ingelost. Alleen wat ouder is
  // dan deze generatie: wijzigde het lid iets terwijl de AI werkte, dan zat dat
  // niet in de invoer en moet het verzoek blijven staan voor de volgende ronde.
  // Dynamische import, anders verwijzen draft.ts en replan.ts naar elkaar.
  if (generation.adaptation_kind === "plan_update") {
    const { clearReplanPending } = await import("@/lib/training/replan");
    await clearReplanPending(admin, generation.profile_id, generation.created_at).catch(
      () => null,
    );
  }

  // Schema's die het lid zelf maakt (dag-aanpassing of zelf coachend) hoeven
  // niet langs een trainer: die gaan direct door naar intervals.icu.
  const selfManaged = isAdaptation || generation.trainer_id === generation.profile_id;
  let autoPublished = false;
  if (selfManaged) {
    const push = await pushPlanWorkoutsToIntervals(admin, plan.id, generation.profile_id).catch(
      () => null,
    );
    if (push?.connected && push.failed === 0) {
      await admin
        .from("training_plans")
        .update({
          status: "published",
          published_by: generation.profile_id,
          published_at: new Date().toISOString(),
        })
        .eq("id", plan.id);
      autoPublished = true;
    }
  }

  await sendNotificationToMembers(
    "on_training_plan",
    {
      title: isAdaptation ? "Aangepast schema klaar" : "Nieuw trainingsconcept",
      body: autoPublished
        ? "Je schema staat klaar in ZWB en intervals.icu."
        : isAdaptation
          ? "Je aangepaste schema van vandaag staat klaar als concept."
          : "Je trainer heeft een nieuw conceptschema klaargezet.",
      url: "/zwbeter-worden",
      tag: `training-plan-${plan.id}`,
    },
    { profileIds: [generation.profile_id] },
  ).catch(() => null);

  // Dag-aanpassing gaat direct door naar intervals.icu; de trainer beoordeelt
  // achteraf. Zonder dit bericht zou die niet weten dat de week is afgeweken en
  // dus ook niet dat de rest van de week bijgesteld moet worden.
  if (isAdaptation && generation.trainer_id && generation.trainer_id !== generation.profile_id) {
    const { data: athlete } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", generation.profile_id)
      .maybeSingle();
    const name = athlete?.display_name ?? "Een lid";
    await sendNotificationToMembers(
      "on_training_plan",
      {
        title: "Aanpassing om te beoordelen",
        body: autoPublished
          ? `${name} paste de training van vandaag aan. Die staat al in intervals.icu — bekijk of de rest van de week nog past.`
          : `${name} maakte een aanpassing voor vandaag. Bekijk het concept.`,
        url: "/zwbeter-worden",
        tag: `training-adaptation-${plan.id}`,
      },
      { profileIds: [generation.trainer_id] },
    ).catch(() => null);
  }

  revalidatePath("/zwbeter-worden", "layout");
  return plan.id as string;
}

export async function generateAiDraftFromForm(formData: FormData): Promise<TrainingDraftResult> {
  try {
    const { user, access } = await currentUser();
    if (!access.has("training.ai_generate") || !access.has("training.create_plans")) {
      throw new Error("Geen rechten om AI-trainingsschema's te maken.");
    }

    const athleteId = mustString(formData.get("athlete_id"), "Lid");
    const goalId = mustString(formData.get("goal_id"), "Doel");
    const promptText = optionalString(formData.get("prompt_text")) ?? defaultTrainingPrompt();
    const admin = createAdminClient();
    if (!access.has("training.manage_assignments") && !(await canCoach(admin, user.id, athleteId))) {
      throw new Error("Dit lid heeft jou geen actieve trainer-toegang gegeven.");
    }

    // Begint dit schema met een FTP-test, dan gaat die als vast blok mee in de
    // input zodat de AI er omheen plant. De workout zelf kan hier nog niet
    // bestaan — er is nog geen plan om hem aan te hangen — dus hij wordt bij het
    // aanmaken van het plan neergezet, uit deze twee velden.
    const ftpTestType = asFtpTestType(formData.get("ftp_test"));
    const ftpTestDate = ftpTestType
      ? optionalString(formData.get("ftp_test_date")) ?? amsterdamDayKey()
      : null;
    if (ftpTestDate && !/^\d{4}-\d{2}-\d{2}$/.test(ftpTestDate)) {
      throw new Error("Ongeldige datum voor de FTP-test.");
    }

    const input = await buildTrainingInput(
      admin,
      athleteId,
      goalId,
      ftpTestType && ftpTestDate ? { date: ftpTestDate, type: ftpTestType } : null,
    );
    const background = await startTrainingPlanDraftBackground(input, promptText, {
      model: process.env.OPENAI_TRAINING_MODEL?.trim() || "gpt-5.5",
      reasoningEffort: "medium",
      timeoutMs: 15_000,
    });
    const initialStatus: TrainingDraftStatus = background.status === "queued" ? "queued" : "in_progress";

    const { data: aiRow, error: aiError } = await admin
      .from("training_ai_generations")
      .insert({
        profile_id: athleteId,
        trainer_id: user.id,
        goal_id: goalId,
        model: background.model,
        status: initialStatus,
        prompt_text: promptText,
        prompt_summary: background.promptSummary,
        openai_response_id: background.responseId,
        ftp_test_type: ftpTestType,
        ftp_test_date: ftpTestDate,
      })
      .select("id")
      .single();
    if (aiError) throw new Error(aiError.message);

    revalidatePath("/zwbeter-worden", "layout");
    return {
      ok: true,
      generationId: aiRow.id as string,
      status: initialStatus,
      message: "AI-concept wordt gemaakt.",
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "AI-concept maken faalde." };
  }
}

// Renner-actie "pas vandaag aan" — zelfde achtergrond-flow als de trainer-knop,
// maar met de adaptieve dag-prompt en de tijd/gevoel-signalen. Voorkomt de
// serverless-timeout die de oude synchrone versie liet crashen.
export async function startTodayAdjustmentDraft(
  formData: FormData,
): Promise<TrainingDraftResult> {
  try {
    const { user } = await currentUser();
    const admin = createAdminClient();

    const availableMinutes = optionalNumber(formData.get("available_minutes"));
    if (availableMinutes != null && availableMinutes < MIN_ADJUST_MINUTES) {
      return { ok: false, error: `Vul minstens ${MIN_ADJUST_MINUTES} minuten in, of kies Rustdag.` };
    }
    if (availableMinutes != null && availableMinutes > MAX_ADJUST_MINUTES) {
      return { ok: false, error: `Vul hoogstens ${MAX_ADJUST_MINUTES} minuten in.` };
    }
    const feelingRaw = optionalString(formData.get("feeling"));
    const feeling =
      feelingRaw === "tired" || feelingRaw === "fresh" || feelingRaw === "normal"
        ? feelingRaw
        : null;
    const note = optionalString(formData.get("note"));

    // Actief schema van de renner zelf (gepubliceerd > goedgekeurd), nog lopend.
    // Alleen basisplannen: een eerdere aanpassing is geen schema om op voort te
    // bouwen, en zou de parent-keten nodeloos verlengen.
    const today = amsterdamDayKey();
    const { data: plans } = await admin
      .from("training_plans")
      .select("id, goal_id, trainer_id, status, end_date, title")
      .eq("profile_id", user.id)
      .is("parent_plan_id", null)
      .in("status", ["published", "approved"])
      .gte("end_date", today)
      .order("status", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(5);
    const active =
      (plans ?? []).find((p) => p.status === "published") ?? (plans ?? [])[0];
    if (!active) {
      return { ok: false, error: "Geen actief schema gevonden om aan te passen." };
    }

    // Het deel van het lopende schema dat de aanpassing raakt: vandaag t/m het
    // einde van deze week. Zonder deze context kan de AI niet aanpassen wat er
    // staat en verzint hij de week opnieuw.
    const weekEnd = endOfWeekKey(today);
    const planTo = active.end_date && String(active.end_date).slice(0, 10) < weekEnd
      ? String(active.end_date).slice(0, 10)
      : weekEnd;

    const [{ data: goal }, { data: profile }, { data: planned }] = await Promise.all([
      active.goal_id
        ? admin.from("training_goals").select("*").eq("id", active.goal_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("profiles")
        .select("display_name, ftp_watts, weight_kg, zrl_category, sex")
        .eq("id", user.id)
        .single(),
      // Op profiel en datum, niet op plan_id: eerdere aanpassingen wonen in
      // afgeleide plannen, en die horen net zo goed bij het lopende schema.
      admin
        .from("training_workouts")
        .select("scheduled_at, title, duration_minutes, intensity")
        .eq("profile_id", user.id)
        .is("superseded_at", null)
        .eq("status", "planned")
        .gte("scheduled_at", `${today}T00:00:00`)
        .lte("scheduled_at", `${planTo}T23:59:59`)
        .order("scheduled_at", { ascending: true }),
    ]);
    if (!profile) return { ok: false, error: "Profiel niet gevonden." };

    const { wellnessForAi } = await import("@/lib/training/wellness");
    const [wellness, yesterday, recentLoad, intervalsLoad, availability, fixedWorkouts] =
      await Promise.all([
        wellnessForAi(admin, user.id).catch(() => null),
        buildYesterdayContext(admin, user.id, active.id).catch(() => null),
        buildRecentLoad(admin, user.id),
        buildIntervalsLoad(admin, user.id),
        availabilityForAi(admin, user.id, today, planTo),
        loadFixedWorkouts(admin, user.id, today, planTo).catch(() => []),
      ]);

    const input: TrainingAiInput = {
      athleteName: profile.display_name ?? "ZWB-lid",
      goal: {
        title: goal?.title ?? "Lopend schema",
        type: goal?.goal_type ?? "base_fitness",
        targetDate: goal?.target_date ?? null,
        availableDays: goal?.available_days ?? [],
        maxHoursPerWeek: goal?.max_hours_per_week ? Number(goal.max_hours_per_week) : null,
        preferredMode: goal?.preferred_mode ?? "mixed",
        experienceLevel: goal?.experience_level ?? "intermediate",
        desiredIntensity: goal?.desired_intensity ?? "balanced",
        riskNotes: goal?.risk_notes ?? null,
      },
      profile: {
        ftpWatts: profile.ftp_watts ?? null,
        weightKg: profile.weight_kg ? Number(profile.weight_kg) : null,
        zrlCategory: profile.zrl_category ?? null,
        sex: profile.sex ?? null,
      },
      recentLoad,
      wellness: wellness
        ? {
            days: wellness.days,
            state: wellness.state,
            restingHr: wellness.restingHr,
            hrv: wellness.hrv,
            sleepHours: wellness.sleepHours,
            readiness: wellness.readiness,
            readinessSource: wellness.readinessSource,
            note: wellness.note,
          }
        : null,
      intervalsLoad,
      availability,
      fixedWorkouts,
      today: { availableMinutes, feeling, note },
      yesterday,
      currentPlan: {
        title: (active.title as string | null) ?? "Lopend schema",
        fromDate: today,
        toDate: planTo,
        workouts: (planned ?? []).map((workout) => ({
          date: String(workout.scheduled_at).slice(0, 10),
          title: workout.title as string,
          durationMinutes: Number(workout.duration_minutes ?? 0),
          intensity: workout.intensity as string,
        })),
      },
    };

    const adaptationReason = `Renner-aanpassing: tijd=${availableMinutes ?? "-"}min, gevoel=${feeling ?? "-"}.`;
    const prompt = adaptiveDailyPrompt();
    const background = await startTrainingPlanDraftBackground(input, prompt, {
      model: process.env.OPENAI_TRAINING_MODEL?.trim() || "gpt-5.5",
      reasoningEffort: "low",
      timeoutMs: 15_000,
      // Een dag-aanpassing mag één workout zijn; het oude minimum van 3 dwong de
      // AI om de rest van de week te verzinnen.
      minWorkouts: 1,
    });
    const initialStatus: TrainingDraftStatus =
      background.status === "queued" ? "queued" : "in_progress";

    const { data: aiRow, error: aiError } = await admin
      .from("training_ai_generations")
      .insert({
        profile_id: user.id,
        trainer_id: active.trainer_id,
        goal_id: active.goal_id,
        parent_plan_id: active.id,
        adaptation_reason: adaptationReason,
        adaptation_kind: "day",
        model: background.model,
        status: initialStatus,
        prompt_text: prompt,
        prompt_summary: background.promptSummary,
        openai_response_id: background.responseId,
      })
      .select("id")
      .single();
    if (aiError) throw new Error(aiError.message);

    revalidatePath("/zwbeter-worden", "layout");
    return {
      ok: true,
      generationId: aiRow.id as string,
      status: initialStatus,
      message: "Aanpassing wordt gemaakt.",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Aanpassing maken faalde.",
    };
  }
}

/** Alleen de velden die daadwerkelijk veranderen, als [oud, nieuw]. */
function changedGoalFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): NonNullable<TrainingAiInput["planUpdate"]>["changed"] {
  const changed: NonNullable<TrainingAiInput["planUpdate"]>["changed"] = {};
  const hoursBefore = before.max_hours_per_week == null ? null : Number(before.max_hours_per_week);
  const hoursAfter = after.max_hours_per_week == null ? null : Number(after.max_hours_per_week);
  if (hoursBefore !== hoursAfter) changed.hoursPerWeek = [hoursBefore, hoursAfter];
  if (before.desired_intensity !== after.desired_intensity) {
    changed.intensity = [String(before.desired_intensity), String(after.desired_intensity)];
  }
  if (before.goal_type !== after.goal_type) {
    changed.goalType = [String(before.goal_type), String(after.goal_type)];
  }
  if ((before.target_date ?? null) !== (after.target_date ?? null)) {
    changed.targetDate = [
      (before.target_date as string | null) ?? null,
      (after.target_date as string | null) ?? null,
    ];
  }
  const daysBefore = (before.available_days as string[] | null) ?? [];
  const daysAfter = (after.available_days as string[] | null) ?? [];
  if (daysBefore.join(",") !== daysAfter.join(",")) {
    changed.availableDays = [daysBefore, daysAfter];
  }
  return changed;
}

/** Nieuwe uitgangspunten voor het doel; alleen de velden die je wilt wijzigen. */
export type GoalUpdates = Partial<{
  max_hours_per_week: number | null;
  desired_intensity: string;
  goal_type: string;
  target_date: string | null;
  available_days: string[];
}>;

type PlanUpdateArgs = {
  admin: ReturnType<typeof createAdminClient>;
  planId: string;
  actorId: string;
  reason: string;
  goalUpdates?: GoalUpdates;
  authorized?: boolean;
};

type PreparedPlanUpdate = {
  plan: { id: string; profile_id: string; trainer_id: string | null; goal_id: string };
  fromDate: string;
  input: TrainingAiInput;
  prompt: string;
};

/**
 * Alles wat een herziening nodig heeft, klaargezet: rechten gecontroleerd, het
 * doel bijgewerkt, de resterende workouts erbij en de AI-input compleet.
 *
 * Gedeeld door de twee routes hieronder: de directe (achtergrondgeneratie, het
 * lid kijkt mee en haalt hem op) en de nachtelijke (synchroon, want er kijkt
 * niemand mee).
 *
 * `authorized` is voor de trainer-route: die heeft zijn toegang al gecontroleerd
 * met de rechten van de aanroeper. Zonder die vlag mag alleen het lid zelf.
 */
async function preparePlanUpdate({
  admin,
  planId,
  actorId,
  reason,
  goalUpdates,
  authorized = false,
}: PlanUpdateArgs): Promise<
  { ok: false; error: string } | { ok: true; prepared: PreparedPlanUpdate }
> {
  const { data: plan } = await admin
    .from("training_plans")
    .select("id, profile_id, trainer_id, goal_id, title, summary, end_date, status, root_plan_id")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) return { ok: false, error: "Schema niet gevonden." };
  if (!authorized && plan.profile_id !== actorId) {
    return { ok: false, error: "Geen trainer-toegang voor dit lid." };
  }
  if (!plan.goal_id) {
    return { ok: false, error: "Dit schema hangt niet aan een doel; maak een nieuw schema." };
  }

  const { data: goal } = await admin
    .from("training_goals")
    .select("*")
    .eq("id", plan.goal_id)
    .maybeSingle();
  if (!goal) return { ok: false, error: "Doel niet gevonden." };

  const fromDate = amsterdamDayKey();
  const toDate = String(plan.end_date).slice(0, 10);
  if (toDate < fromDate) {
    return { ok: false, error: "Dit schema is al afgelopen; maak een nieuw schema." };
  }

  // Leeg gelaten velden houden hun huidige waarde, zodat een aanroeper alleen
  // hoeft mee te geven wat er verandert.
  const updates = {
    max_hours_per_week: goalUpdates?.max_hours_per_week ?? goal.max_hours_per_week,
    desired_intensity: goalUpdates?.desired_intensity ?? goal.desired_intensity,
    goal_type: goalUpdates?.goal_type ?? goal.goal_type,
    target_date: goalUpdates?.target_date ?? goal.target_date,
    available_days: goalUpdates?.available_days ?? goal.available_days ?? [],
  };
  const changed = changedGoalFields(goal, updates);

  // Doel bijwerken vóór de generatie, zodat buildTrainingInput en elke volgende
  // generatie met de nieuwe uitgangspunten werken.
  if (Object.keys(changed).length > 0) {
    const { error: goalError } = await admin
      .from("training_goals")
      .update(updates)
      .eq("id", plan.goal_id);
    if (goalError) throw new Error(goalError.message);
  }

  // Op profiel en datum, niet op plan_id: eerdere aanpassingen wonen in
  // afgeleide plannen en horen net zo goed bij het lopende schema.
  const { data: remaining } = await admin
    .from("training_workouts")
    .select("scheduled_at, title, duration_minutes, intensity")
    .eq("profile_id", plan.profile_id)
    .is("superseded_at", null)
    .eq("status", "planned")
    .gte("scheduled_at", `${fromDate}T00:00:00`)
    .lte("scheduled_at", `${toDate}T23:59:59`)
    .order("scheduled_at", { ascending: true });

  // De omschrijving van het schéma zoals het nu loopt, niet die van het
  // basisplan. Een herziening hangt aan het basisplan, en dat draagt nog de
  // samenvatting van de allereerste generatie — inclusief de uitgangspunten die
  // sindsdien zijn veranderd. Zo bleef een schema verwijzen naar de zes uur per
  // week waarmee het ooit begon terwijl het doel allang op tien stond.
  const { data: newest } = await admin
    .from("training_plans")
    .select("title, summary")
    .eq("profile_id", plan.profile_id)
    .eq("root_plan_id", plan.root_plan_id ?? plan.id)
    .in("status", ["published", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const input = await buildTrainingInput(admin, plan.profile_id, plan.goal_id);
  input.planUpdate = {
    reason,
    fromDate,
    toDate,
    previousTitle: newest?.title ?? plan.title,
    previousSummary: newest?.summary ?? plan.summary,
    changed,
    remainingWorkouts: (remaining ?? []).map((workout) => ({
      date: String(workout.scheduled_at).slice(0, 10),
      title: workout.title as string,
      durationMinutes: Number(workout.duration_minutes ?? 0),
      intensity: workout.intensity as string,
    })),
  };

  return {
    ok: true,
    prepared: {
      plan: {
        id: plan.id as string,
        profile_id: plan.profile_id as string,
        trainer_id: (plan.trainer_id as string | null) ?? null,
        goal_id: plan.goal_id as string,
      },
      fromDate,
      input,
      prompt: planUpdatePrompt(),
    },
  };
}

/**
 * De kern van "schema bijwerken": het resterende deel van een lopend schema
 * wordt herzien, met de plan-update-prompt en het bereik vandaag t/m de
 * einddatum van het plan.
 *
 * Wordt aangeroepen door het bijwerkformulier (met nieuwe uitgangspunten) en
 * door requestReplan() in replan.ts, dat na een wijziging in de beschikbaarheid
 * of een zelf ingeplande rit hetzelfde doet zonder het doel aan te raken.
 *
 * De generatie loopt in de achtergrond; het lid haalt hem op via
 * /api/training/ai-draft/[id]. Kijkt er niemand mee, gebruik dan
 * runPlanUpdateNow().
 */
export async function startPlanUpdate(args: PlanUpdateArgs): Promise<TrainingDraftResult> {
  const prepared = await preparePlanUpdate(args);
  if (!prepared.ok) return { ok: false, error: prepared.error };
  const { plan, fromDate, input, prompt } = prepared.prepared;

  const background = await startTrainingPlanDraftBackground(input, prompt, {
    model: process.env.OPENAI_TRAINING_MODEL?.trim() || "gpt-5.5",
    reasoningEffort: "medium",
    timeoutMs: 15_000,
  });
  const initialStatus: TrainingDraftStatus =
    background.status === "queued" ? "queued" : "in_progress";

  const { data: aiRow, error: aiError } = await args.admin
    .from("training_ai_generations")
    .insert({
      profile_id: plan.profile_id,
      trainer_id: plan.trainer_id ?? args.actorId,
      goal_id: plan.goal_id,
      parent_plan_id: plan.id,
      adaptation_reason: args.reason,
      adaptation_kind: "plan_update",
      adapt_from_date: fromDate,
      model: background.model,
      status: initialStatus,
      prompt_text: prompt,
      prompt_summary: background.promptSummary,
      openai_response_id: background.responseId,
    })
    .select("id")
    .single();
  if (aiError) throw new Error(aiError.message);

  revalidatePath("/zwbeter-worden", "layout");
  return {
    ok: true,
    generationId: aiRow.id as string,
    status: initialStatus,
    message: "Bijgewerkt schema wordt gemaakt.",
  };
}

/**
 * Dezelfde herziening, maar synchroon en meteen doorgevoerd. Voor de nacht-cron.
 *
 * Een achtergrondgeneratie moet door iemand worden opgehaald voordat er een
 * schema uit komt; dat doet de browser van het lid. 's Nachts kijkt er niemand
 * mee, dus zo'n generatie zou tot de volgende keer dat het lid de app opent in
 * 'queued' blijven hangen. Vandaar hier de synchrone variant: het bijgewerkte
 * schema staat er 's ochtends gewoon.
 */
export async function runPlanUpdateNow(
  args: PlanUpdateArgs,
): Promise<{ ok: true; planId: string } | { ok: false; error: string }> {
  // Vóór het opbouwen van de invoer, niet na de AI-call: dit tijdstip bepaalt
  // welke verzoeken als ingelost gelden, en de call zelf duurt een minuut.
  const startedAt = new Date().toISOString();

  const prepared = await preparePlanUpdate(args);
  if (!prepared.ok) return { ok: false, error: prepared.error };
  const { plan, fromDate, input, prompt } = prepared.prepared;

  const ai = await generateTrainingPlanDraft(input, prompt, {
    model: process.env.OPENAI_TRAINING_MODEL?.trim() || "gpt-5.5",
    reasoningEffort: "medium",
    timeoutMs: 120_000,
  });

  const { data: aiRow, error: aiError } = await args.admin
    .from("training_ai_generations")
    .insert({
      profile_id: plan.profile_id,
      trainer_id: plan.trainer_id ?? args.actorId,
      goal_id: plan.goal_id,
      parent_plan_id: plan.id,
      adaptation_reason: args.reason,
      adaptation_kind: "plan_update",
      adapt_from_date: fromDate,
      model: ai.model,
      status: "completed",
      prompt_text: prompt,
      prompt_summary: ai.promptSummary,
      response_json: ai.plan,
      created_at: startedAt,
      completed_at: new Date().toISOString(),
    })
    .select(AI_GENERATION_COLUMNS)
    .single();
  if (aiError) throw new Error(aiError.message);

  const newPlanId = await createPlanFromAiGeneration(
    args.admin,
    aiRow as unknown as AiGenerationRow,
    ai.plan,
  );
  revalidatePath("/zwbeter-worden", "layout");
  return { ok: true, planId: newPlanId };
}

/** Formulier-route van "Schema bijwerken": rechten checken en dan bijwerken. */
export async function startPlanUpdateDraft(formData: FormData): Promise<TrainingDraftResult> {
  try {
    const { user, access } = await currentUser();
    const admin = createAdminClient();
    const planId = mustString(formData.get("plan_id"), "Schema");

    const { data: plan } = await admin
      .from("training_plans")
      .select("profile_id")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) return { ok: false, error: "Schema niet gevonden." };

    const authorized =
      plan.profile_id === user.id ||
      access.has("training.manage_assignments") ||
      (await canCoach(admin, user.id, plan.profile_id));
    if (!authorized) return { ok: false, error: "Geen trainer-toegang voor dit lid." };

    const days = formData.getAll("available_days").map(String).filter(Boolean);
    return await startPlanUpdate({
      admin,
      planId,
      actorId: user.id,
      reason: optionalString(formData.get("reason")) ?? "Schema bijgewerkt.",
      authorized: true,
      goalUpdates: {
        max_hours_per_week: optionalNumber(formData.get("max_hours_per_week")) ?? undefined,
        desired_intensity: optionalString(formData.get("desired_intensity")) ?? undefined,
        goal_type: optionalString(formData.get("goal_type")) ?? undefined,
        target_date: optionalString(formData.get("target_date")) ?? undefined,
        available_days: days.length > 0 ? days : undefined,
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Schema bijwerken faalde.",
    };
  }
}

/**
 * Is het aangepaste schema al doorgezet naar intervals.icu, en waar staat het?
 * Gebruikt door de dag-aanpassing, zodat het lid meteen kan doorklikken in
 * plaats van eerst het schema te moeten opzoeken.
 */
async function planPublishState(
  admin: ReturnType<typeof createAdminClient>,
  planId: string,
  profileId: string,
): Promise<{ published: boolean; intervalsUrl: string | null }> {
  const [{ data: plan }, { data: firstWorkout }, { data: conn }] = await Promise.all([
    admin.from("training_plans").select("status").eq("id", planId).maybeSingle(),
    admin
      .from("training_workouts")
      .select("scheduled_at")
      .eq("plan_id", planId)
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("intervals_connections")
      .select("athlete_id")
      .eq("profile_id", profileId)
      .maybeSingle(),
  ]);
  const published = plan?.status === "published";
  return {
    published,
    intervalsUrl:
      published && firstWorkout?.scheduled_at
        ? intervalsWeekUrl(
            conn?.athlete_id ?? null,
            String(firstWorkout.scheduled_at).slice(0, 10),
          )
        : null,
  };
}

export async function pollAiDraft(generationId: string): Promise<TrainingDraftResult> {
  try {
    const { user, access } = await currentUser();
    const admin = createAdminClient();
    const { data: generation, error } = await admin
      .from("training_ai_generations")
      .select(AI_GENERATION_COLUMNS)
      .eq("id", generationId)
      .single();
    if (error || !generation) throw new Error(error?.message ?? "AI-generatie niet gevonden.");

    const row = generation as AiGenerationRow;
    if (!(await canAccessGeneration(admin, user.id, access, row))) {
      throw new Error("Geen toegang tot deze AI-generatie.");
    }

    const { data: existingPlan } = await admin
      .from("training_plans")
      .select("id")
      .eq("ai_generation_id", row.id)
      .maybeSingle();
    if (existingPlan) {
      if (row.status !== "completed") {
        await admin.from("training_ai_generations").update({ status: "completed" }).eq("id", row.id);
      }
      const planId = existingPlan.id as string;
      return {
        ok: true,
        generationId: row.id,
        status: "completed",
        planId,
        ...(await planPublishState(admin, planId, row.profile_id)),
      };
    }

    if (row.status === "failed" || row.status === "cancelled") {
      return { ok: true, generationId: row.id, status: row.status, error: row.error ?? "AI-generatie is gestopt." };
    }
    if (!row.openai_response_id) throw new Error("OpenAI response-id ontbreekt voor deze AI-generatie.");

    const result = await retrieveTrainingPlanDraftBackground(row.openai_response_id);
    if (result.status === "queued" || result.status === "in_progress") {
      if (row.status !== result.status) {
        await admin.from("training_ai_generations").update({ status: result.status }).eq("id", row.id);
      }
      return { ok: true, generationId: row.id, status: result.status };
    }

    if (result.status === "failed" || result.status === "cancelled" || result.status === "incomplete") {
      const status = result.status === "incomplete" ? "failed" : result.status;
      await admin
        .from("training_ai_generations")
        .update({ status, error: result.error, response_json: result.responseJson })
        .eq("id", row.id);
      return { ok: true, generationId: row.id, status, error: result.error };
    }

    if (result.status !== "completed") {
      return { ok: true, generationId: row.id, status: "in_progress" };
    }

    const planId = await createPlanFromAiGeneration(admin, row, result.plan);
    await admin
      .from("training_ai_generations")
      .update({
        status: "completed",
        response_json: result.plan,
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return {
      ok: true,
      generationId: row.id,
      status: "completed",
      planId,
      ...(await planPublishState(admin, planId, row.profile_id)),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "AI-concept status ophalen faalde." };
  }
}
