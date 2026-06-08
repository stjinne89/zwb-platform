import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { fetchIntervalsWellness } from "@/lib/intervals/client";
import { sendNotificationToMembers } from "@/lib/push/send";
import {
  defaultTrainingPrompt,
  retrieveTrainingPlanDraftBackground,
  startTrainingPlanDraftBackground,
  type GeneratedTrainingPlan,
  type TrainingAiInput,
} from "@/lib/training/ai";
import {
  adaptiveDailyPrompt,
  normalizeWorkoutBlocks,
  WORKOUT_INTENSITIES,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { buildYesterdayContext } from "@/lib/training/adapt-context";

type TrainingDraftStatus = "queued" | "in_progress" | "completed" | "failed" | "cancelled";

type TrainingDraftResult =
  | { ok: true; generationId: string; status: TrainingDraftStatus; planId?: string; message?: string; error?: string }
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
};

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

async function buildTrainingInput(
  admin: ReturnType<typeof createAdminClient>,
  athleteId: string,
  goalId: string,
): Promise<TrainingAiInput> {
  const [{ data: profile }, { data: goal }, { data: activities }] = await Promise.all([
    admin
      .from("profiles")
      .select("display_name, ftp_watts, weight_kg, zrl_category")
      .eq("id", athleteId)
      .single(),
    admin
      .from("training_goals")
      .select("*")
      .eq("id", goalId)
      .eq("profile_id", athleteId)
      .single(),
    admin
      .from("strava_activities")
      .select("distance_m, total_elevation_gain_m, moving_time_seconds")
      .eq("profile_id", athleteId)
      .gte("start_date", new Date(Date.now() - 28 * 86400_000).toISOString()),
  ]);
  if (!profile || !goal) throw new Error("Profiel of doel niet gevonden.");

  const recent = (activities ?? []).reduce(
    (acc, row) => ({
      activities: acc.activities + 1,
      distanceKm: acc.distanceKm + Number(row.distance_m ?? 0) / 1000,
      elevationM: acc.elevationM + Number(row.total_elevation_gain_m ?? 0),
      hours: acc.hours + Number(row.moving_time_seconds ?? 0) / 3600,
    }),
    { activities: 0, distanceKm: 0, elevationM: 0, hours: 0 },
  );

  const { wellnessForAi } = await import("@/lib/training/wellness");
  const wellness = await wellnessForAi(admin, athleteId).catch(() => null);

  let intervalsLoad: TrainingAiInput["intervalsLoad"] = null;
  try {
    const { data: conn } = await admin
      .from("intervals_connections")
      .select("api_key, athlete_id")
      .eq("profile_id", athleteId)
      .maybeSingle();
    if (conn?.api_key && conn?.athlete_id) {
      const rows = await fetchIntervalsWellness(conn.api_key, conn.athlete_id, 30);
      const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id));
      const latest = sorted[sorted.length - 1];
      if (latest) {
        const ctl = latest.ctl ?? null;
        const atl = latest.atl ?? null;
        intervalsLoad = {
          ctl,
          atl,
          tsb: ctl != null && atl != null ? Math.round((ctl - atl) * 10) / 10 : null,
          eftp: [...sorted].reverse().find((r) => r.eftp)?.eftp ?? null,
          rampRate: latest.ramp_rate ?? null,
        };
      }
    }
  } catch {
    // Niet kritiek: AI kan zonder intervals-belasting door.
  }

  const horizon = goal.target_date
    ? new Date(goal.target_date)
    : new Date(Date.now() + 90 * 86400_000);
  const { data: upcomingRows } = await admin
    .from("events")
    .select("title, type, start_at")
    .gte("start_at", new Date().toISOString())
    .lte("start_at", horizon.toISOString())
    .order("start_at")
    .limit(8);
  const upcomingEvents = (upcomingRows ?? []).map((e) => ({
    title: e.title as string,
    type: e.type as string,
    date: String(e.start_at).slice(0, 10),
  }));

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
      weightKg: profile.weight_kg ? Number(profile.weight_kg) : null,
      zrlCategory: profile.zrl_category ?? null,
    },
    recentLoad: recent,
    wellness: wellness
      ? {
          days: wellness.days,
          state: wellness.state,
          restingHr: wellness.restingHr,
          hrv: wellness.hrv,
          sleepHours: wellness.sleepHours,
          readiness: wellness.readiness,
          note: wellness.note,
        }
      : null,
    intervalsLoad,
    upcomingEvents,
  };
}

async function createPlanFromAiGeneration(
  admin: ReturnType<typeof createAdminClient>,
  generation: Pick<
    AiGenerationRow,
    "id" | "profile_id" | "trainer_id" | "goal_id" | "parent_plan_id" | "adaptation_reason"
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

  // Dag-aanpassing (renner): afgeleid plan met parent + reden + titel-suffix.
  const isAdaptation = Boolean(generation.parent_plan_id);
  const title = isAdaptation ? `${planDraft.title} (aanpassing vandaag)` : planDraft.title;

  const { data: plan, error: planError } = await admin
    .from("training_plans")
    .insert({
      profile_id: generation.profile_id,
      trainer_id: generation.trainer_id,
      goal_id: generation.goal_id,
      ai_generation_id: generation.id,
      parent_plan_id: generation.parent_plan_id ?? null,
      adaptation_reason: generation.adaptation_reason ?? null,
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
    throw new Error(planError.message);
  }

  const workouts = planDraft.workouts.map((workout) => {
    const intensity = workout.intensity;
    assertWorkoutIntensity(intensity);
    const blocks = normalizeWorkoutBlocks(workout.structure, intensity);
    return {
      plan_id: plan.id,
      profile_id: generation.profile_id,
      trainer_id: generation.trainer_id,
      scheduled_at: `${workout.date}T09:00:00+01:00`,
      title: workout.title,
      description: workout.description,
      duration_minutes: Math.round(workout.durationMinutes),
      intensity,
      target_type: workout.targetType,
      structure_json: blocks,
      intervals_external_id: `zwb-${plan.id}-${workout.date}-${workout.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`,
    };
  });
  const { error: workoutError } = await admin.from("training_workouts").insert(workouts);
  if (workoutError) throw new Error(workoutError.message);

  await sendNotificationToMembers(
    "on_training_plan",
    {
      title: isAdaptation ? "Aangepast schema klaar" : "Nieuw trainingsconcept",
      body: isAdaptation
        ? "Je aangepaste schema van vandaag staat klaar als concept."
        : "Je trainer heeft een nieuw conceptschema klaargezet.",
      url: "/training",
      tag: `training-plan-${plan.id}`,
    },
    { profileIds: [generation.profile_id] },
  ).catch(() => null);

  revalidatePath("/training");
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

    const input = await buildTrainingInput(admin, athleteId, goalId);
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
      })
      .select("id")
      .single();
    if (aiError) throw new Error(aiError.message);

    revalidatePath("/training");
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
    const feelingRaw = optionalString(formData.get("feeling"));
    const feeling =
      feelingRaw === "tired" || feelingRaw === "fresh" || feelingRaw === "normal"
        ? feelingRaw
        : null;
    const note = optionalString(formData.get("note"));

    // Actief plan van de renner zelf (gepubliceerd > goedgekeurd), nog lopend.
    const today = new Date().toISOString().slice(0, 10);
    const { data: plans } = await admin
      .from("training_plans")
      .select("id, goal_id, trainer_id, status, end_date")
      .eq("profile_id", user.id)
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

    const [{ data: goal }, { data: profile }] = await Promise.all([
      active.goal_id
        ? admin.from("training_goals").select("*").eq("id", active.goal_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("profiles")
        .select("display_name, ftp_watts, weight_kg, zrl_category")
        .eq("id", user.id)
        .single(),
    ]);
    if (!profile) return { ok: false, error: "Profiel niet gevonden." };

    const { wellnessForAi } = await import("@/lib/training/wellness");
    const wellness = await wellnessForAi(admin, user.id).catch(() => null);
    const yesterday = await buildYesterdayContext(admin, user.id, active.id).catch(
      () => null,
    );

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
      },
      recentLoad: { activities: 0, distanceKm: 0, elevationM: 0, hours: 0 },
      wellness: wellness
        ? {
            days: wellness.days,
            state: wellness.state,
            restingHr: wellness.restingHr,
            hrv: wellness.hrv,
            sleepHours: wellness.sleepHours,
            readiness: wellness.readiness,
            note: wellness.note,
          }
        : null,
      today: { availableMinutes, feeling, note },
      yesterday,
    };

    const adaptationReason = `Renner-aanpassing: tijd=${availableMinutes ?? "-"}min, gevoel=${feeling ?? "-"}.`;
    const prompt = adaptiveDailyPrompt();
    const background = await startTrainingPlanDraftBackground(input, prompt, {
      model: process.env.OPENAI_TRAINING_MODEL?.trim() || "gpt-5.5",
      reasoningEffort: "low",
      timeoutMs: 15_000,
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
        model: background.model,
        status: initialStatus,
        prompt_text: prompt,
        prompt_summary: background.promptSummary,
        openai_response_id: background.responseId,
      })
      .select("id")
      .single();
    if (aiError) throw new Error(aiError.message);

    revalidatePath("/training");
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

export async function pollAiDraft(generationId: string): Promise<TrainingDraftResult> {
  try {
    const { user, access } = await currentUser();
    const admin = createAdminClient();
    const { data: generation, error } = await admin
      .from("training_ai_generations")
      .select("id, profile_id, trainer_id, goal_id, model, status, prompt_summary, response_json, error, openai_response_id, parent_plan_id, adaptation_reason")
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
      return { ok: true, generationId: row.id, status: "completed", planId: existingPlan.id as string };
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

    return { ok: true, generationId: row.id, status: "completed", planId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "AI-concept status ophalen faalde." };
  }
}
