"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  fetchIntervalsAthlete,
  upsertIntervalsWorkoutEvent,
} from "@/lib/intervals/client";
import { sendNotificationToMembers } from "@/lib/push/send";
import { generateTrainingPlanDraft } from "@/lib/training/ai";
import {
  adaptiveDailyPrompt,
  blocksFromForm,
  blocksToIntervalsText,
  blocksToWorkoutDoc,
  estimateTrainingLoad,
  normalizeWorkoutBlocks,
  WORKOUT_INTENSITIES,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { buildYesterdayContext } from "@/lib/training/adapt-context";
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

  revalidatePath("/training");
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

// Renner-actie: "pas vandaag aan" - de renner geeft beschikbare tijd + gevoel
// op en de AI maakt een draft-aanpassing van het actieve plan voor vandaag/deze
// week (zelfde draft-patroon als de cron). Geen trainer-goedkeuring nodig om te
// genereren; publiceren volgt de bestaande flow.
export async function adjustTodayPlan(formData: FormData) {
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
      .order("status", { ascending: false }) // 'published' > 'approved' alfabetisch? nee
      .order("updated_at", { ascending: false })
      .limit(5);
    const active =
      (plans ?? []).find((p) => p.status === "published") ?? (plans ?? [])[0];
    if (!active) {
      return {
        ok: false as const,
        error: "Geen actief schema gevonden om aan te passen.",
      };
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
    if (!profile) return { ok: false as const, error: "Profiel niet gevonden." };

    const { wellnessForAi } = await import("@/lib/training/wellness");
    const wellness = await wellnessForAi(admin, user.id).catch(() => null);
    const yesterday = await buildYesterdayContext(admin, user.id, active.id).catch(
      () => null,
    );

    const ai = await generateTrainingPlanDraft(
      {
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
      },
      adaptiveDailyPrompt(),
      { reasoningEffort: "low" },
    );

    const { data: draft, error: draftError } = await admin
      .from("training_plans")
      .insert({
        profile_id: user.id,
        trainer_id: active.trainer_id,
        goal_id: active.goal_id,
        parent_plan_id: active.id,
        title: `${ai.plan.title} (aanpassing vandaag)`,
        summary: [ai.plan.summary, ...ai.plan.cautions.map((c) => `Let op: ${c}`)].join("\n\n"),
        start_date: ai.plan.startDate,
        end_date: ai.plan.endDate,
        status: "draft",
        source: "ai",
        adaptation_reason: `Renner-aanpassing: tijd=${availableMinutes ?? "-"}min, gevoel=${feeling ?? "-"}.`,
      })
      .select("id")
      .single();
    if (draftError) throw new Error(draftError.message);

    const workouts = ai.plan.workouts.map((workout) => {
      const intensity = workout.intensity;
      assertWorkoutIntensity(intensity);
      const blocks = normalizeWorkoutBlocks(workout.structure, intensity);
      return {
        plan_id: draft.id,
        profile_id: user.id,
        trainer_id: active.trainer_id,
        scheduled_at: `${workout.date}T09:00:00+01:00`,
        title: workout.title,
        description: workout.description,
        duration_minutes: Math.round(workout.durationMinutes),
        intensity,
        target_type: workout.targetType,
        structure_json: blocks,
        intervals_external_id: `zwb-${draft.id}-${workout.date}-${workout.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`,
      };
    });
    const { error: workoutError } = await admin.from("training_workouts").insert(workouts);
    if (workoutError) throw new Error(workoutError.message);

    revalidatePath("/training");
    return { ok: true as const, planId: draft.id };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Aanpassing maken faalde.",
    };
  }
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

    revalidatePath("/training");
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

    revalidatePath("/training");
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

    revalidatePath("/training");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Workout wijzigen faalde." };
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

    revalidatePath("/training");
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

    revalidatePath("/training");
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

    const [{ data: conn }, { data: riderProfile }] = await Promise.all([
      admin
        .from("intervals_connections")
        .select("api_key, athlete_id")
        .eq("profile_id", plan.profile_id)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("ftp_watts")
        .eq("id", plan.profile_id)
        .maybeSingle(),
    ]);
    if (!conn?.api_key || !conn?.athlete_id) {
      throw new Error("Dit lid heeft intervals.icu nog niet gekoppeld.");
    }
    const riderFtp = riderProfile?.ftp_watts ? Number(riderProfile.ftp_watts) : null;

    let failed = 0;
    for (const workout of workouts ?? []) {
      try {
        const blocks = normalizeWorkoutBlocks(workout.structure_json, workout.intensity);
        const intervalsText = blocksToIntervalsText(blocks);
        const trainingLoad = estimateTrainingLoad(blocks);
        const externalId =
          workout.intervals_external_id ?? `zwb-${workout.id}`;
        // intervals.icu parseert de description NIET server-side, dus moeten we
        // zelf een geldig native workout_doc meesturen. Zonder steps bevat de
        // FIT-export 0 stappen en weigeren Garmin/Wahoo het bestand als corrupt.
        // De description (workout-tekst + prose) blijft staan voor leesbaarheid.
        const workoutDoc = blocksToWorkoutDoc(blocks, riderFtp);
        const event = await upsertIntervalsWorkoutEvent(conn.api_key, conn.athlete_id, {
          id: workout.intervals_event_id,
          externalId,
          startDateLocal: String(workout.scheduled_at).slice(0, 16),
          name: workout.title,
          description: [intervalsText, workout.description].filter(Boolean).join("\n\n"),
          category: "WORKOUT",
          type: "Ride",
          target: "POWER",
          trainingLoad,
          durationMinutes: workout.duration_minutes,
          workoutDoc,
        });
        await admin
          .from("training_workouts")
          .update({
            intervals_event_id: String(event.id),
            intervals_external_id: externalId,
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
