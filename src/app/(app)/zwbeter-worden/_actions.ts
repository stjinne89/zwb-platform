"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  deleteIntervalsWorkoutEvent,
  fetchIntervalsAthlete,
} from "@/lib/intervals/client";
import { sendNotificationToMembers } from "@/lib/push/send";
import { pushPlanWorkoutsToIntervals } from "@/lib/training/publish";
import {
  blocksFromForm,
  WORKOUT_INTENSITIES,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { reviewNotificationBody } from "@/lib/training/completion";
import { TRAINING_FORM_SLUGS } from "@/lib/training/training-forms";
import { encryptSecret } from "@/lib/crypto/secrets";

const GOAL_TYPES = ["zrl", "ladder", "outdoor_event", "gran_fondo", "ftp", "base_fitness", "rebuild"];
const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const MODES = ["indoor", "outdoor", "mixed"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const INTENSITIES = ["easy", "balanced", "hard"];
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

function assertWorkoutIntensity(value: string): asserts value is WorkoutIntensity {
  if (!(WORKOUT_INTENSITIES as readonly string[]).includes(value)) {
    throw new Error("Ongeldige intensiteit.");
  }
}

async function currentUser() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) throw new Error("Niet ingelogd.");
  return { supabase, access, user: access.user };
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
      api_key: encryptSecret(trimmed), // versleuteld at rest (F4)
      athlete_id: athlete.id,
      athlete_name: athlete.name ?? null,
    },
    { onConflict: "profile_id" },
  );
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/zwbeter-worden", "layout");
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

  revalidatePath("/zwbeter-worden", "layout");
  revalidatePath("/profiel");
  return { ok: true as const };
}

export async function setWellnessOptIn(optIn: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  // Alleen schrijven als er een intervals-koppeling is.
  const { data: conn } = await supabase
    .from("intervals_connections")
    .select("profile_id, api_key, athlete_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!conn) {
    return {
      ok: false as const,
      error: "Koppel eerst intervals.icu voordat je herstel-data deelt.",
    };
  }

  const { error } = await supabase
    .from("intervals_connections")
    .update({ wellness_opt_in: optIn })
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  // Bij aanzetten meteen een eerste sync draaien (best-effort, service-role).
  if (optIn && conn.api_key && conn.athlete_id) {
    try {
      const admin = createAdminClient();
      const { syncWellnessForUser } = await import("@/lib/training/wellness");
      await syncWellnessForUser(
        admin,
        conn.api_key as string,
        conn.athlete_id as string,
        user.id,
        30,
      );
    } catch {
      // niet kritiek
    }
  }

  revalidatePath("/zwbeter-worden", "layout");
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
        url: "/zwbeter-worden",
        tag: `training-goal-${user.id}`,
      },
      { profileIds: (trainers ?? []).map((row) => row.trainer_id as string) },
    ).catch(() => null);

    revalidatePath("/zwbeter-worden", "layout");
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
        url: "/zwbeter-worden",
        tag: `training-access-${user.id}-${trainerId}`,
      },
      { profileIds: [trainerId] },
    ).catch(() => null);

    revalidatePath("/zwbeter-worden", "layout");
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

    revalidatePath("/zwbeter-worden", "layout");
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


export async function updateTrainingPlan(formData: FormData) {
  try {
    const { user, access } = await currentUser();
    if (!access.has("training.create_plans")) throw new Error("Geen rechten om schema's te wijzigen.");
    const planId = mustString(formData.get("plan_id"), "Schema");
    const admin = createAdminClient();
    const { data: plan } = await admin.from("training_plans").select("profile_id").eq("id", planId).single();
    if (!plan) throw new Error("Schema niet gevonden.");
    if (!access.has("training.manage_assignments") && !(await canCoach(admin, user.id, plan.profile_id))) {
      throw new Error("Geen trainer-toegang voor dit lid.");
    }

    const { error } = await admin
      .from("training_plans")
      .update({
        title: mustString(formData.get("title"), "Titel"),
        summary: optionalString(formData.get("summary")),
        start_date: mustString(formData.get("start_date"), "Startdatum"),
        end_date: mustString(formData.get("end_date"), "Einddatum"),
        status: "draft",
      })
      .eq("id", planId);
    if (error) throw new Error(error.message);

    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Schema wijzigen faalde." };
  }
}

export async function deleteTrainingPlan(planId: string) {
  try {
    const { user, access } = await currentUser();
    if (!access.has("training.create_plans")) throw new Error("Geen rechten om schema's te verwijderen.");
    const admin = createAdminClient();
    const { data: plan } = await admin
      .from("training_plans")
      .select("id, profile_id")
      .eq("id", planId)
      .single();
    if (!plan) throw new Error("Schema niet gevonden.");
    if (!access.has("training.manage_assignments") && !(await canCoach(admin, user.id, plan.profile_id))) {
      throw new Error("Geen trainer-toegang voor dit lid.");
    }

    const { error } = await admin.from("training_plans").delete().eq("id", planId);
    if (error) throw new Error(error.message);

    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Schema verwijderen faalde." };
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
    assertWorkoutIntensity(intensity);
    const blocks = blocksFromForm(formData, intensity);
    const durationMinutes =
      Math.round(optionalNumber(formData.get("duration_minutes")) ?? 0) ||
      blocks.reduce((total, block) => total + block.durationMinutes, 0) ||
      60;

    const { error } = await admin
      .from("training_workouts")
      .update({
        title: mustString(formData.get("title"), "Titel"),
        scheduled_at: `${mustString(formData.get("date"), "Datum")}T${optionalString(formData.get("time")) ?? "09:00"}:00+01:00`,
        duration_minutes: durationMinutes,
        intensity,
        target_type: optionalString(formData.get("target_type")) ?? "power",
        description: optionalString(formData.get("description")),
        structure_json: blocks,
        publish_status: "pending",
        publish_error: null,
      })
      .eq("id", workoutId);
    if (error) throw new Error(error.message);

    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Workout wijzigen faalde." };
  }
}

/**
 * Rustdag: de renner heeft vandaag geen tijd of ruimte. De geplande workout
 * vervalt en verdwijnt ook uit de intervals.icu-kalender.
 */
export async function markTodayRestDay(formData: FormData) {
  try {
    const { user } = await currentUser();
    const admin = createAdminClient();
    const note = optionalString(formData.get("note"));

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
    const { data: workouts } = await admin
      .from("training_workouts")
      .select("id, trainer_id, intervals_event_id, status, scheduled_at")
      .eq("profile_id", user.id)
      .gte("scheduled_at", `${today}T00:00:00`)
      .lt("scheduled_at", `${today}T23:59:59`)
      .order("scheduled_at", { ascending: true });
    const workout = (workouts ?? []).find((row) => row.status !== "skipped");
    if (!workout) {
      return { ok: false as const, error: "Er staat vandaag geen training gepland." };
    }

    const { error } = await admin
      .from("training_workouts")
      .update({ status: "skipped" })
      .eq("id", workout.id);
    if (error) throw new Error(error.message);

    await admin.from("training_workout_reports").upsert(
      {
        workout_id: workout.id,
        profile_id: user.id,
        trainer_id: workout.trainer_id,
        athlete_report: note ?? "Rustdag genomen.",
        intervals_event_id: workout.intervals_event_id,
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: "workout_id,profile_id" },
    );

    if (workout.intervals_event_id) {
      const { data: conn } = await admin
        .from("intervals_connections")
        .select("api_key, athlete_id")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (conn?.api_key && conn.athlete_id) {
        await deleteIntervalsWorkoutEvent(
          conn.api_key,
          conn.athlete_id,
          workout.intervals_event_id,
        ).catch(() => null);
      }
      await admin
        .from("training_workouts")
        .update({ intervals_event_id: null, publish_status: "pending" })
        .eq("id", workout.id);
    }

    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Rustdag opslaan faalde.",
    };
  }
}

export async function saveWorkoutReport(formData: FormData) {
  try {
    const { user } = await currentUser();
    const workoutId = mustString(formData.get("workout_id"), "Workout");
    const admin = createAdminClient();
    const { data: workout } = await admin
      .from("training_workouts")
      .select("id, profile_id, trainer_id, intervals_event_id")
      .eq("id", workoutId)
      .single();
    if (!workout) throw new Error("Workout niet gevonden.");
    if (workout.profile_id !== user.id) throw new Error("Alleen de renner kan deze rapportage invullen.");

    const rpe = optionalNumber(formData.get("athlete_rpe"));
    const feel = optionalString(formData.get("athlete_feel"));
    const values = {
      workout_id: workoutId,
      profile_id: workout.profile_id,
      trainer_id: workout.trainer_id,
      athlete_rpe: rpe ? Math.max(1, Math.min(10, Math.round(rpe))) : null,
      athlete_feel: feel,
      athlete_report: optionalString(formData.get("athlete_report")),
      intervals_event_id: workout.intervals_event_id,
      created_by: user.id,
      updated_by: user.id,
    };

    const { error } = await admin
      .from("training_workout_reports")
      .upsert(values, { onConflict: "workout_id,profile_id" });
    if (error) throw new Error(error.message);

    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Rapportage opslaan faalde." };
  }
}

export async function saveTrainerFeedback(formData: FormData) {
  try {
    const { user, access } = await currentUser();
    if (!access.has("training.create_plans")) throw new Error("Geen rechten om feedback te geven.");
    const workoutId = mustString(formData.get("workout_id"), "Workout");
    const admin = createAdminClient();
    const { data: workout } = await admin
      .from("training_workouts")
      .select("id, profile_id, trainer_id, intervals_event_id")
      .eq("id", workoutId)
      .single();
    if (!workout) throw new Error("Workout niet gevonden.");
    if (!access.has("training.manage_assignments") && !(await canCoach(admin, user.id, workout.profile_id))) {
      throw new Error("Geen trainer-toegang voor dit lid.");
    }

    const { error } = await admin.from("training_workout_reports").upsert(
      {
        workout_id: workoutId,
        profile_id: workout.profile_id,
        trainer_id: user.id,
        trainer_feedback: optionalString(formData.get("trainer_feedback")),
        intervals_event_id: workout.intervals_event_id,
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: "workout_id,profile_id" },
    );
    if (error) throw new Error(error.message);

    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Feedback opslaan faalde." };
  }
}

export async function setPlanStatus(formData: FormData) {
  try {
    const { user, access } = await currentUser();
    const status = mustString(formData.get("status"), "Status");
    if (!["review", "approved", "archived"].includes(status)) throw new Error("Ongeldige status.");
    const planId = mustString(formData.get("plan_id"), "Schema");
    const admin = createAdminClient();
    const { data: plan } = await admin
      .from("training_plans")
      .select("profile_id, parent_plan_id")
      .eq("id", planId)
      .single();
    if (!plan) throw new Error("Schema niet gevonden.");
    // Een renner mag zijn EIGEN dag-aanpassing (afgeleid plan) zelf beheren,
    // ook zonder trainer/bestuur-rol.
    const ownAdaptation = plan.profile_id === user.id && plan.parent_plan_id != null;
    if (!access.has("training.create_plans") && !ownAdaptation) {
      throw new Error("Geen rechten voor schema-status.");
    }
    if (
      !ownAdaptation &&
      !access.has("training.manage_assignments") &&
      !(await canCoach(admin, user.id, plan.profile_id))
    ) {
      throw new Error("Geen trainer-toegang voor dit lid.");
    }
    const patch: Record<string, string | null> = { status };
    if (status === "approved") {
      patch.approved_by = user.id;
      patch.approved_at = new Date().toISOString();
    }
    const { error } = await admin.from("training_plans").update(patch).eq("id", planId);
    if (error) throw new Error(error.message);
    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Status wijzigen faalde." };
  }
}

export async function publishTrainingPlan(formData: FormData) {
  try {
    const { user, access } = await currentUser();
    const planId = mustString(formData.get("plan_id"), "Schema");
    const admin = createAdminClient();
    const { data: plan } = await admin
      .from("training_plans")
      .select("profile_id, status, parent_plan_id")
      .eq("id", planId)
      .single();
    if (!plan) throw new Error("Schema niet gevonden.");
    // Renner mag zijn EIGEN dag-aanpassing zelf publiceren (ook zonder rol).
    const ownAdaptation = plan.profile_id === user.id && plan.parent_plan_id != null;
    if (!access.has("training.publish_plans") && !ownAdaptation) {
      throw new Error("Geen rechten om schema's te publiceren.");
    }
    if (!["approved", "published"].includes(plan.status)) {
      throw new Error("Keur het schema eerst goed voordat je publiceert.");
    }
    if (
      !ownAdaptation &&
      !access.has("training.manage_assignments") &&
      !(await canCoach(admin, user.id, plan.profile_id))
    ) {
      throw new Error("Geen trainer-toegang voor dit lid.");
    }

    const { connected, failed } = await pushPlanWorkoutsToIntervals(
      admin,
      planId,
      plan.profile_id,
    );
    if (!connected) {
      throw new Error("Dit lid heeft intervals.icu nog niet gekoppeld.");
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
          url: "/zwbeter-worden",
          tag: `training-published-${planId}`,
        },
        { profileIds: [plan.profile_id] },
      ).catch(() => null);
    }

    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const, failed };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Publiceren faalde." };
  }
}

/**
 * Zet een workout uit de bibliotheek op een datum in een schema. Tot nu toe kon
 * een workout alleen ontstaan uit een AI-generatie; dit is het handmatige pad.
 */
export async function addWorkoutFromTemplate(formData: FormData) {
  try {
    const { user, access } = await currentUser();
    if (!access.has("training.create_plans")) throw new Error("Geen rechten om workouts te maken.");
    const planId = mustString(formData.get("plan_id"), "Schema");
    const templateId = mustString(formData.get("template_id"), "Workout");
    const date = mustString(formData.get("date"), "Datum");
    const time = optionalString(formData.get("time")) ?? "09:00";

    const admin = createAdminClient();
    const [{ data: plan }, { data: template }] = await Promise.all([
      admin
        .from("training_plans")
        .select("id, profile_id, trainer_id")
        .eq("id", planId)
        .maybeSingle(),
      admin
        .from("training_workout_templates")
        .select("title, description, duration_minutes, intensity, target_type, structure_json")
        .eq("id", templateId)
        .maybeSingle(),
    ]);
    if (!plan) throw new Error("Schema niet gevonden.");
    if (!template) throw new Error("Workout niet gevonden in de bibliotheek.");
    if (!access.has("training.manage_assignments") && !(await canCoach(admin, user.id, plan.profile_id))) {
      throw new Error("Geen trainer-toegang voor dit lid.");
    }

    const slug = String(template.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 48);
    const { error } = await admin.from("training_workouts").insert({
      plan_id: plan.id,
      profile_id: plan.profile_id,
      trainer_id: plan.trainer_id ?? user.id,
      scheduled_at: `${date}T${time}:00+01:00`,
      title: template.title,
      description: template.description,
      duration_minutes: template.duration_minutes,
      intensity: template.intensity,
      target_type: template.target_type,
      structure_json: template.structure_json,
      publish_status: "pending",
      // Zelfde vorm als de AI-flow, zodat intervals.icu de workout bij een
      // herpublicatie bijwerkt in plaats van dubbel neer te zetten.
      intervals_external_id: `zwb-${plan.id}-${date}-${slug}`,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Workout invoegen faalde.",
    };
  }
}

/** Eigen workout bewaren in de bibliotheek. De standaardset blijft ongemoeid. */
export async function saveWorkoutTemplate(formData: FormData) {
  try {
    const { user, access } = await currentUser();
    if (!access.has("training.create_plans")) throw new Error("Geen rechten om workouts te maken.");
    const form = mustString(formData.get("form"), "Trainingsvorm");
    if (!TRAINING_FORM_SLUGS.includes(form as (typeof TRAINING_FORM_SLUGS)[number])) {
      throw new Error("Ongeldige trainingsvorm.");
    }
    const intensity = optionalString(formData.get("intensity")) ?? "endurance";
    assertWorkoutIntensity(intensity);
    const blocks = blocksFromForm(formData, intensity);
    if (blocks.length === 0) throw new Error("Voeg minstens één blok toe.");

    const admin = createAdminClient();
    const { error } = await admin.from("training_workout_templates").insert({
      form,
      title: mustString(formData.get("title"), "Titel"),
      description: optionalString(formData.get("description")),
      duration_minutes: blocks.reduce((total, block) => total + block.durationMinutes, 0),
      intensity,
      target_type: optionalString(formData.get("target_type")) ?? "power",
      structure_json: blocks,
      is_standard: false,
      created_by: user.id,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Workout bewaren faalde.",
    };
  }
}

export async function deleteWorkoutTemplate(formData: FormData) {
  try {
    const { user, access } = await currentUser();
    if (!access.has("training.create_plans")) throw new Error("Geen rechten om workouts te maken.");
    const templateId = mustString(formData.get("template_id"), "Workout");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("training_workout_templates")
      .delete()
      .eq("id", templateId)
      .eq("created_by", user.id)
      .eq("is_standard", false)
      .select("id");
    if (error) throw new Error(error.message);
    if ((data ?? []).length === 0) {
      throw new Error("Alleen je eigen workouts kun je verwijderen.");
    }

    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Workout verwijderen faalde.",
    };
  }
}

/**
 * Het lid bevestigt een afgeronde workout: RPE, gevoel en opmerking erbij, en
 * daarna gaat het naar de trainer. athlete_confirmed_at is het signaal waarop de
 * beoordelingsrij van de trainer filtert.
 */
export async function confirmWorkoutReview(formData: FormData) {
  try {
    const { user } = await currentUser();
    const workoutId = mustString(formData.get("workout_id"), "Workout");
    const admin = createAdminClient();
    const { data: workout } = await admin
      .from("training_workouts")
      .select("id, profile_id, trainer_id, title, intervals_event_id")
      .eq("id", workoutId)
      .single();
    if (!workout) throw new Error("Workout niet gevonden.");
    if (workout.profile_id !== user.id) {
      throw new Error("Alleen de renner kan deze training bevestigen.");
    }

    const rpe = optionalNumber(formData.get("athlete_rpe"));
    const feel = optionalString(formData.get("athlete_feel"));
    const { data: report, error } = await admin
      .from("training_workout_reports")
      .update({
        athlete_rpe: rpe ? Math.max(1, Math.min(10, Math.round(rpe))) : null,
        athlete_feel: feel,
        athlete_report: optionalString(formData.get("athlete_report")),
        athlete_confirmed_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("workout_id", workoutId)
      .eq("profile_id", user.id)
      .select("metrics_json")
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (workout.trainer_id && workout.trainer_id !== user.id) {
      const { data: athlete } = await admin
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      const name = athlete?.display_name ?? "Een lid";
      await sendNotificationToMembers(
        "on_workout_review",
        {
          // De kern in het bericht zelf: zo ziet de trainer op zijn
          // vergrendelscherm al of er iets aan de hand is.
          title: `${name} · ${workout.title}`,
          body: reviewNotificationBody(report?.metrics_json, rpe, feel),
          url: `/zwbeter-worden/trainer?athlete=${user.id}`,
          tag: `workout-reviewed-${workoutId}`,
        },
        { profileIds: [workout.trainer_id] },
      ).catch(() => null);
    }

    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Bevestigen faalde.",
    };
  }
}

/**
 * De trainer sluit de lus: feedback erbij en goedkeuren, of markeren dat het
 * schema wordt aangepast. Daarmee verdwijnt de workout uit de beoordelingsrij.
 */
export async function reviewWorkoutAsTrainer(formData: FormData) {
  try {
    const { user, access } = await currentUser();
    if (!access.has("training.create_plans")) throw new Error("Geen rechten om te beoordelen.");
    const workoutId = mustString(formData.get("workout_id"), "Workout");
    const status = optionalString(formData.get("trainer_status")) ?? "approved";
    if (!["approved", "adjusted"].includes(status)) throw new Error("Ongeldige status.");

    const admin = createAdminClient();
    const { data: workout } = await admin
      .from("training_workouts")
      .select("id, profile_id, trainer_id, title, intervals_event_id")
      .eq("id", workoutId)
      .single();
    if (!workout) throw new Error("Workout niet gevonden.");
    if (!access.has("training.manage_assignments") && !(await canCoach(admin, user.id, workout.profile_id))) {
      throw new Error("Geen trainer-toegang voor dit lid.");
    }

    const feedback = optionalString(formData.get("trainer_feedback"));
    const { error } = await admin.from("training_workout_reports").upsert(
      {
        workout_id: workoutId,
        profile_id: workout.profile_id,
        trainer_id: user.id,
        trainer_feedback: feedback,
        trainer_reviewed_at: new Date().toISOString(),
        trainer_status: status,
        intervals_event_id: workout.intervals_event_id,
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: "workout_id,profile_id" },
    );
    if (error) throw new Error(error.message);

    // Alleen berichten als er ook iets te lezen valt; een stille goedkeuring
    // hoeft geen pushbericht.
    if (feedback) {
      await sendNotificationToMembers(
        "on_workout_review",
        {
          title: "Feedback van je trainer",
          body: `Je trainer reageerde op ${workout.title}.`,
          url: "/zwbeter-worden/schema",
          tag: `workout-feedback-${workoutId}`,
        },
        { profileIds: [workout.profile_id] },
      ).catch(() => null);
    }

    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Beoordelen faalde.",
    };
  }
}
