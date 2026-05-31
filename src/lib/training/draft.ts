import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { fetchIntervalsWellness } from "@/lib/intervals/client";
import { sendNotificationToMembers } from "@/lib/push/send";
import {
  defaultTrainingPrompt,
  generateTrainingPlanDraft,
  type TrainingAiInput,
} from "@/lib/training/ai";
import {
  normalizeWorkoutBlocks,
  WORKOUT_INTENSITIES,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

type TrainingDraftResult =
  | { ok: true; planId: string }
  | { ok: false; error: string };

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

    const ai = await generateTrainingPlanDraft(
      {
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
      },
      promptText,
    );

    const { data: aiRow, error: aiError } = await admin
      .from("training_ai_generations")
      .insert({
        profile_id: athleteId,
        trainer_id: user.id,
        goal_id: goalId,
        model: ai.model,
        status: "completed",
        prompt_text: promptText,
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

    const workouts = ai.plan.workouts.map((workout) => {
      const intensity = workout.intensity;
      assertWorkoutIntensity(intensity);
      const blocks = normalizeWorkoutBlocks(workout.structure, intensity);
      return {
        plan_id: plan.id,
        profile_id: athleteId,
        trainer_id: user.id,
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
        title: "Nieuw trainingsconcept",
        body: "Je trainer heeft een nieuw conceptschema klaargezet.",
        url: "/training",
        tag: `training-plan-${plan.id}`,
      },
      { profileIds: [athleteId] },
    ).catch(() => null);

    revalidatePath("/training");
    return { ok: true, planId: plan.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "AI-concept maken faalde." };
  }
}
