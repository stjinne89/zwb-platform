"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { fetchIntervalsAthlete, upsertIntervalsWorkoutEvent } from "@/lib/intervals/client";
import { sendNotificationToMembers } from "@/lib/push/send";
import { generateTrainingPlanDraft } from "@/lib/training/ai";

const GOAL_TYPES = ["zrl", "ladder", "outdoor_event", "gran_fondo", "ftp", "base_fitness", "rebuild"];
const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const MODES = ["indoor", "outdoor", "mixed"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const INTENSITIES = ["easy", "balanced", "hard"];
const WORKOUT_INTENSITIES = [
  "recovery",
  "endurance",
  "tempo",
  "threshold",
  "vo2max",
  "anaerobic",
  "race",
  "rest",
];

type TrainingActionState = {
  ok: boolean;
  error?: string;
  message?: string;
} | null;

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = optionalString(value);
  if (!text) return null;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function mustString(value: FormDataEntryValue | null, label: string) {
  const text = optionalString(value);
  if (!text) throw new Error(`${label} ontbreekt.`);
  return text;
}

async function currentUser() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) throw new Error("Niet ingelogd.");
  return { supabase, access, user: access.user };
}

async function canCoach(admin: ReturnType<typeof createAdminClient>, trainerId: string, athleteId: string) {
  const { data } = await admin
    .from("training_coach_assignments")
    .select("id")
    .eq("trainer_id", trainerId)
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data);
}

export async function connectIntervalsWithKey(apiKey: string) {
  const trimmed = apiKey.trim();
  if (!trimmed) return { ok: false as const, error: "Geen API-key opgegeven." };
  if (trimmed.length < 16) {
    return { ok: false as const, error: "Dit ziet er niet uit als een geldige API-key (te kort)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  let athlete;
  try {
    athlete = await fetchIntervalsAthlete(trimmed);
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Kon intervals.icu niet bereiken.",
    };
  }

  if (!athlete.id) return { ok: false as const, error: "intervals.icu gaf geen athlete-id terug." };

  const { error } = await supabase.from("intervals_connections").upsert(
    {
      profile_id: user.id,
      api_key: trimmed,
      athlete_id: athlete.id,
      athlete_name: athlete.name ?? null,
    },
    { onConflict: "profile_id" },
  );
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/training");
  revalidatePath("/profiel");
  return { ok: true as const, athleteName: athlete.name ?? athlete.id };
}

export async function disconnectIntervals() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase.from("intervals_connections").delete().eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/training");
  revalidatePath("/profiel");
  return { ok: true as const };
}

export async function createTrainingGoal(formData: FormData) {
  try {
    const { user } = await currentUser();
    const admin = createAdminClient();
    const goalType = mustString(formData.get("goal_type"), "Doeltype");
    const preferredMode = optionalString(formData.get("preferred_mode")) ?? "mixed";
    const experienceLevel = optionalString(formData.get("experience_level")) ?? "intermediate";
    const desiredIntensity = optionalString(formData.get("desired_intensity")) ?? "balanced";
    const availableDays = formData.getAll("available_days").map(String).filter((day) => WEEKDAYS.includes(day));

    if (!GOAL_TYPES.includes(goalType)) throw new Error("Ongeldig doeltype.");
    if (!MODES.includes(preferredMode)) throw new Error("Ongeldige trainingsvoorkeur.");
    if (!LEVELS.includes(experienceLevel)) throw new Error("Ongeldig ervaringsniveau.");
    if (!INTENSITIES.includes(desiredIntensity)) throw new Error("Ongeldige intensiteit.");

    const { error } = await admin.from("training_goals").insert({
      profile_id: user.id,
      title: mustString(formData.get("title"), "Titel"),
      goal_type: goalType,
      target_date: optionalString(formData.get("target_date")),
      available_days: availableDays,
      max_hours_per_week: optionalNumber(formData.get("max_hours_per_week")),
      preferred_mode: preferredMode,
      experience_level: experienceLevel,
      desired_intensity: desiredIntensity,
      risk_notes: optionalString(formData.get("risk_notes")),
      created_by: user.id,
    });
    if (error) throw new Error(error.message);

    const { data: trainers } = await admin
      .from("training_coach_assignments")
      .select("trainer_id")
      .eq("athlete_id", user.id)
      .eq("status", "active");
    await sendNotificationToMembers(
      "on_training_plan",
      {
        title: "Nieuwe trainingsintake",
        body: "Een toegewezen lid heeft een nieuw trainingsdoel toegevoegd.",
        url: "/training",
        tag: `training-goal-${user.id}`,
      },
      { profileIds: (trainers ?? []).map((row) => row.trainer_id as string) },
    ).catch(() => null);

    revalidatePath("/training");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Doel opslaan faalde." };
  }
}

export async function grantTrainerAccess(formData: FormData) {
  try {
    const { user } = await currentUser();
    const trainerId = mustString(formData.get("trainer_id"), "Trainer");
    const admin = createAdminClient();

    const { data: trainer } = await admin
      .from("profiles")
      .select("id, community_roles")
      .eq("id", trainerId)
      .maybeSingle();
    if (!trainer || !((trainer.community_roles as string[] | null) ?? []).includes("trainer")) {
      throw new Error("Kies een profiel met de rol Trainer.");
    }

    const { data: existing } = await admin
      .from("training_coach_assignments")
      .select("id")
      .eq("athlete_id", user.id)
      .eq("trainer_id", trainerId)
      .maybeSingle();

    const values = {
      athlete_id: user.id,
      trainer_id: trainerId,
      status: "active",
      notes: optionalString(formData.get("notes")),
      granted_by: user.id,
      revoked_by: null,
      revoked_at: null,
      granted_at: new Date().toISOString(),
    };
    const result = existing
      ? await admin.from("training_coach_assignments").update(values).eq("id", existing.id)
      : await admin.from("training_coach_assignments").insert(values);
    if (result.error) throw new Error(result.error.message);

    await sendNotificationToMembers(
      "on_training_plan",
      {
        title: "Trainer-toegang gekregen",
        body: "Een lid heeft jou toegang gegeven tot trainingsdata.",
        url: "/training",
        tag: `training-access-${user.id}-${trainerId}`,
      },
      { profileIds: [trainerId] },
    ).catch(() => null);

    revalidatePath("/training");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Trainer koppelen faalde." };
  }
}

export async function grantTrainerAccessState(
  _prevState: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const result = await grantTrainerAccess(formData);
  return result.ok ? { ok: true, message: "Trainer gekoppeld." } : result;
}

export async function revokeTrainerAccess(formData: FormData) {
  try {
    const { user, access } = await currentUser();
    const assignmentId = mustString(formData.get("assignment_id"), "Koppeling");
    const admin = createAdminClient();

    const { data: assignment } = await admin
      .from("training_coach_assignments")
      .select("athlete_id")
      .eq("id", assignmentId)
      .maybeSingle();
    if (!assignment) throw new Error("Koppeling niet gevonden.");
    if (assignment.athlete_id !== user.id && !access.has("training.manage_assignments")) {
      throw new Error("Geen rechten om deze koppeling in te trekken.");
    }

    const { error } = await admin
      .from("training_coach_assignments")
      .update({
        status: "revoked",
        revoked_by: user.id,
        revoked_at: new Date().toISOString(),
      })
      .eq("id", assignmentId);
    if (error) throw new Error(error.message);

    revalidatePath("/training");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Koppeling intrekken faalde." };
  }
}

export async function revokeTrainerAccessState(
  _prevState: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const result = await revokeTrainerAccess(formData);
  return result.ok ? { ok: true, message: "Koppeling ingetrokken." } : result;
}

export async function generateAiDraft(formData: FormData) {
  try {
    const { user, access } = await currentUser();
    if (!access.has("training.ai_generate") || !access.has("training.create_plans")) {
      throw new Error("Geen rechten om AI-trainingsschema's te maken.");
    }

    const athleteId = mustString(formData.get("athlete_id"), "Lid");
    const goalId = mustString(formData.get("goal_id"), "Doel");
    const admin = createAdminClient();
    if (!access.has("training.manage_assignments") && !(await canCoach(admin, user.id, athleteId))) {
      throw new Error("Dit lid heeft jou geen actieve trainer-toegang gegeven.");
    }

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

    const ai = await generateTrainingPlanDraft({
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
    });

    const { data: aiRow, error: aiError } = await admin
      .from("training_ai_generations")
      .insert({
        profile_id: athleteId,
        trainer_id: user.id,
        goal_id: goalId,
        model: ai.model,
        status: "completed",
        prompt_summary: ai.promptSummary,
        response_json: ai.plan,
      })
      .select("id")
      .single();
    if (aiError) throw new Error(aiError.message);

    const { data: plan, error: planError } = await admin
      .from("training_plans")
      .insert({
        profile_id: athleteId,
        trainer_id: user.id,
        goal_id: goalId,
        ai_generation_id: aiRow.id,
        title: ai.plan.title,
        summary: [ai.plan.summary, ...ai.plan.cautions.map((c) => `Let op: ${c}`)].join("\n\n"),
        start_date: ai.plan.startDate,
        end_date: ai.plan.endDate,
        status: "draft",
        source: "ai",
      })
      .select("id")
      .single();
    if (planError) throw new Error(planError.message);

    const workouts = ai.plan.workouts.map((workout) => ({
      plan_id: plan.id,
      profile_id: athleteId,
      trainer_id: user.id,
      scheduled_at: `${workout.date}T09:00:00+01:00`,
      title: workout.title,
      description: workout.description,
      duration_minutes: Math.round(workout.durationMinutes),
      intensity: workout.intensity,
      target_type: workout.targetType,
      structure_json: workout.structure,
    }));
    const { error: workoutError } = await admin.from("training_workouts").insert(workouts);
    if (workoutError) throw new Error(workoutError.message);

    await sendNotificationToMembers(
      "on_training_plan",
      {
        title: "Nieuw trainingsconcept",
        body: "Je trainer heeft een nieuw conceptschema klaargezet.",
        url: "/training",
        tag: `training-plan-${plan.id}`,
      },
      { profileIds: [athleteId] },
    ).catch(() => null);

    revalidatePath("/training");
    return { ok: true as const, planId: plan.id };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "AI-concept maken faalde." };
  }
}

export async function updateWorkout(formData: FormData) {
  try {
    const { user, access } = await currentUser();
    if (!access.has("training.create_plans")) throw new Error("Geen rechten om workouts te wijzigen.");
    const workoutId = mustString(formData.get("workout_id"), "Workout");
    const admin = createAdminClient();
    const { data: workout } = await admin
      .from("training_workouts")
      .select("profile_id")
      .eq("id", workoutId)
      .single();
    if (!workout) throw new Error("Workout niet gevonden.");
    if (!access.has("training.manage_assignments") && !(await canCoach(admin, user.id, workout.profile_id))) {
      throw new Error("Geen trainer-toegang voor dit lid.");
    }

    const intensity = optionalString(formData.get("intensity")) ?? "endurance";
    if (!WORKOUT_INTENSITIES.includes(intensity)) throw new Error("Ongeldige intensiteit.");

    const { error } = await admin
      .from("training_workouts")
      .update({
        title: mustString(formData.get("title"), "Titel"),
        scheduled_at: `${mustString(formData.get("date"), "Datum")}T${optionalString(formData.get("time")) ?? "09:00"}:00+01:00`,
        duration_minutes: Math.round(optionalNumber(formData.get("duration_minutes")) ?? 60),
        intensity,
        description: optionalString(formData.get("description")),
        publish_status: "pending",
        publish_error: null,
      })
      .eq("id", workoutId);
    if (error) throw new Error(error.message);

    revalidatePath("/training");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Workout wijzigen faalde." };
  }
}

export async function setPlanStatus(formData: FormData) {
  try {
    const { user, access } = await currentUser();
    const status = mustString(formData.get("status"), "Status");
    if (!["review", "approved", "archived"].includes(status)) throw new Error("Ongeldige status.");
    if (!access.has("training.create_plans")) throw new Error("Geen rechten voor schema-status.");
    const planId = mustString(formData.get("plan_id"), "Schema");
    const admin = createAdminClient();
    const { data: plan } = await admin.from("training_plans").select("profile_id").eq("id", planId).single();
    if (!plan) throw new Error("Schema niet gevonden.");
    if (!access.has("training.manage_assignments") && !(await canCoach(admin, user.id, plan.profile_id))) {
      throw new Error("Geen trainer-toegang voor dit lid.");
    }
    const patch: Record<string, string | null> = { status };
    if (status === "approved") {
      patch.approved_by = user.id;
      patch.approved_at = new Date().toISOString();
    }
    const { error } = await admin.from("training_plans").update(patch).eq("id", planId);
    if (error) throw new Error(error.message);
    revalidatePath("/training");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Status wijzigen faalde." };
  }
}

export async function publishTrainingPlan(formData: FormData) {
  try {
    const { user, access } = await currentUser();
    if (!access.has("training.publish_plans")) throw new Error("Geen rechten om schema's te publiceren.");
    const planId = mustString(formData.get("plan_id"), "Schema");
    const admin = createAdminClient();
    const [{ data: plan }, { data: workouts }] = await Promise.all([
      admin.from("training_plans").select("profile_id, status").eq("id", planId).single(),
      admin
        .from("training_workouts")
        .select("*")
        .eq("plan_id", planId)
        .order("scheduled_at", { ascending: true }),
    ]);
    if (!plan) throw new Error("Schema niet gevonden.");
    if (!["approved", "published"].includes(plan.status)) {
      throw new Error("Keur het schema eerst goed voordat je publiceert.");
    }
    if (!access.has("training.manage_assignments") && !(await canCoach(admin, user.id, plan.profile_id))) {
      throw new Error("Geen trainer-toegang voor dit lid.");
    }

    const { data: conn } = await admin
      .from("intervals_connections")
      .select("api_key, athlete_id")
      .eq("profile_id", plan.profile_id)
      .maybeSingle();
    if (!conn?.api_key || !conn?.athlete_id) {
      throw new Error("Dit lid heeft intervals.icu nog niet gekoppeld.");
    }

    let failed = 0;
    for (const workout of workouts ?? []) {
      try {
        const event = await upsertIntervalsWorkoutEvent(conn.api_key, conn.athlete_id, {
          id: workout.intervals_event_id,
          startDateLocal: String(workout.scheduled_at).slice(0, 16),
          name: workout.title,
          description: workout.description,
          category: "WORKOUT",
          durationMinutes: workout.duration_minutes,
          workoutDoc: {
            steps: workout.structure_json,
            zwb_plan_id: planId,
            intensity: workout.intensity,
            target_type: workout.target_type,
          },
        });
        await admin
          .from("training_workouts")
          .update({
            intervals_event_id: String(event.id),
            publish_status: "published",
            publish_error: null,
          })
          .eq("id", workout.id);
      } catch (err) {
        failed++;
        await admin
          .from("training_workouts")
          .update({
            publish_status: "failed",
            publish_error: err instanceof Error ? err.message : "Publicatie faalde.",
          })
          .eq("id", workout.id);
      }
    }

    if (failed === 0) {
      await admin
        .from("training_plans")
        .update({
          status: "published",
          published_by: user.id,
          published_at: new Date().toISOString(),
        })
        .eq("id", planId);
      await sendNotificationToMembers(
        "on_training_plan",
        {
          title: "Trainingsschema gepubliceerd",
          body: "Je schema staat klaar in ZWB en intervals.icu.",
          url: "/training",
          tag: `training-published-${planId}`,
        },
        { profileIds: [plan.profile_id] },
      ).catch(() => null);
    }

    revalidatePath("/training");
    return { ok: true as const, failed };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Publiceren faalde." };
  }
}
