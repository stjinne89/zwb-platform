import { defaultTrainingPrompt, generateTrainingPlanDraft } from "@/lib/training/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWorkoutBlocks } from "@/lib/training/workouts";

type PlanRow = {
  id: string;
  profile_id: string;
  trainer_id: string | null;
  goal_id: string | null;
  title: string;
  end_date: string;
};

function since(days: number) {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

async function latestPlanCandidates(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("training_plans")
    .select("id, profile_id, trainer_id, goal_id, title, end_date")
    .in("status", ["approved", "published"])
    .gte("end_date", new Date().toISOString().slice(0, 10))
    .order("updated_at", { ascending: false })
    .limit(25);
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanRow[];
}

export async function POST(request: Request) {
  const expected = process.env.TRAINING_ADAPTATION_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const results: Array<{ profileId: string; status: string; draftPlanId?: string; error?: string }> = [];

  try {
    for (const plan of await latestPlanCandidates(admin)) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: existingRun } = await admin
        .from("training_adaptation_runs")
        .select("id")
        .eq("profile_id", plan.profile_id)
        .eq("source_plan_id", plan.id)
        .gte("created_at", `${today}T00:00:00.000Z`)
        .maybeSingle();
      if (existingRun) continue;

      try {
        const [{ data: recentActivities }, { data: goal }, { data: profile }, { data: sourceWorkouts }] =
          await Promise.all([
            admin
              .from("strava_activities")
              .select("distance_m, total_elevation_gain_m, moving_time_seconds")
              .eq("profile_id", plan.profile_id)
              .gte("start_date", since(1)),
            plan.goal_id
              ? admin.from("training_goals").select("*").eq("id", plan.goal_id).maybeSingle()
              : Promise.resolve({ data: null }),
            admin
              .from("profiles")
              .select("display_name, ftp_watts, weight_kg, zrl_category")
              .eq("id", plan.profile_id)
              .single(),
            admin.from("training_workouts").select("*").eq("plan_id", plan.id).order("scheduled_at"),
          ]);

        if (!recentActivities || recentActivities.length === 0 || !goal || !profile) {
          await admin.from("training_adaptation_runs").insert({
            profile_id: plan.profile_id,
            trainer_id: plan.trainer_id,
            source_plan_id: plan.id,
            status: "skipped",
            input_json: { reason: "Geen nieuwe activiteit of geen doel/profiel." },
          });
          results.push({ profileId: plan.profile_id, status: "skipped" });
          continue;
        }

        const recent = recentActivities.reduce(
          (acc, row) => ({
            activities: acc.activities + 1,
            distanceKm: acc.distanceKm + Number(row.distance_m ?? 0) / 1000,
            elevationM: acc.elevationM + Number(row.total_elevation_gain_m ?? 0),
            hours: acc.hours + Number(row.moving_time_seconds ?? 0) / 3600,
          }),
          { activities: 0, distanceKm: 0, elevationM: 0, hours: 0 },
        );

        const prompt = `${defaultTrainingPrompt()}\n\nMaak een dagelijkse aanpassing als concept. Behoud alleen toekomstige workouts, verlaag of verhoog belasting voorzichtig op basis van wat de renner gisteren deed.`;
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
          },
          prompt,
        );

        const { data: draft, error: draftError } = await admin
          .from("training_plans")
          .insert({
            profile_id: plan.profile_id,
            trainer_id: plan.trainer_id,
            goal_id: plan.goal_id,
            parent_plan_id: plan.id,
            title: `${ai.plan.title} (dagelijkse aanpassing)`,
            summary: ai.plan.summary,
            start_date: ai.plan.startDate,
            end_date: ai.plan.endDate,
            status: "draft",
            source: "ai",
            adaptation_reason: "Dagelijkse aanpassing op basis van uitgevoerde workouts.",
            ctl_projection_json: {
              sourcePlanId: plan.id,
              sourceWorkoutCount: (sourceWorkouts ?? []).length,
            },
          })
          .select("id")
          .single();
        if (draftError) throw new Error(draftError.message);

        await admin.from("training_workouts").insert(
          ai.plan.workouts.map((workout) => ({
            plan_id: draft.id,
            profile_id: plan.profile_id,
            trainer_id: plan.trainer_id,
            scheduled_at: `${workout.date}T09:00:00+01:00`,
            title: workout.title,
            description: workout.description,
            duration_minutes: Math.round(workout.durationMinutes),
            intensity: workout.intensity,
            target_type: workout.targetType,
            structure_json: normalizeWorkoutBlocks(workout.structure, workout.intensity),
            intervals_external_id: `zwb-${draft.id}-${workout.date}-${workout.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`,
          })),
        );

        await admin.from("training_adaptation_runs").insert({
          profile_id: plan.profile_id,
          trainer_id: plan.trainer_id,
          source_plan_id: plan.id,
          draft_plan_id: draft.id,
          status: "completed",
          input_json: { recent },
          response_json: ai.plan,
        });
        results.push({ profileId: plan.profile_id, status: "completed", draftPlanId: draft.id });
      } catch (err) {
        await admin.from("training_adaptation_runs").insert({
          profile_id: plan.profile_id,
          trainer_id: plan.trainer_id,
          source_plan_id: plan.id,
          status: "failed",
          error: err instanceof Error ? err.message : "Dagelijkse aanpassing faalde.",
        });
        results.push({
          profileId: plan.profile_id,
          status: "failed",
          error: err instanceof Error ? err.message : "Dagelijkse aanpassing faalde.",
        });
      }
    }

    return Response.json({ ok: true, results });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Adaptatie-cron faalde." },
      { status: 500 },
    );
  }
}

export const GET = POST;
