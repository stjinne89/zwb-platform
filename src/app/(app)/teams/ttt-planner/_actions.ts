"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  buildZwiftGopherPayload,
  optimizeWithZwiftGopher,
} from "@/lib/ttt/zwiftgopher";
import type {
  TttActionResult,
  TttPlanInput,
  TttPlanRiderInput,
} from "@/lib/ttt/types";

type ExistingPlan = {
  id: string;
  parent_team_id: string;
  team_id: string | null;
  event_id: string | null;
};

function finiteNumber(value: unknown) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) ? n : null;
}

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function cleanNullableString(value: unknown) {
  const text = cleanString(value);
  return text ? text : null;
}

function normalizeRiders(riders: TttPlanRiderInput[]) {
  return riders
    .slice(0, 8)
    .map((rider, index) => ({
      id: rider.id ?? null,
      profileId: rider.profileId || null,
      isManual: Boolean(rider.isManual),
      zwiftId: cleanString(rider.zwiftId),
      name: cleanString(rider.name),
      ftpWatts: finiteNumber(rider.ftpWatts),
      weightKg: finiteNumber(rider.weightKg),
      heightCm: finiteNumber(rider.heightCm),
      power300Watts: finiteNumber(rider.power300Watts),
      pullWatts: finiteNumber(rider.pullWatts),
      pullDurationSeconds: finiteNumber(rider.pullDurationSeconds),
      displayOrder: Number.isFinite(Number(rider.displayOrder))
        ? Number(rider.displayOrder)
        : index,
      role: cleanNullableString(rider.role),
      notes: cleanNullableString(rider.notes),
    }));
}

function normalizePlan(input: TttPlanInput): TttPlanInput {
  return {
    id: input.id || null,
    name: cleanString(input.name) || "ZWB TTT plan",
    eventId: input.eventId || null,
    parentTeamId: input.parentTeamId,
    teamId: input.teamId || null,
    settings: {
      route: input.settings.route,
      targetSpeed: finiteNumber(input.settings.targetSpeed),
      intensity: Math.max(-3, Math.min(3, Number(input.settings.intensity ?? 0))),
      efficiency: Math.max(-2, Math.min(2, Number(input.settings.efficiency ?? 0))),
      allowZeroPulls: Boolean(input.settings.allowZeroPulls),
      minPullDuration: Math.max(
        10,
        Math.min(120, Number(input.settings.minPullDuration ?? 30)),
      ),
      maxPullDuration: Math.max(
        30,
        Math.min(600, Number(input.settings.maxPullDuration ?? 180)),
      ),
      durationInterval: input.settings.durationInterval === 10 ? 10 : 15,
      optimizationStrategy:
        input.settings.optimizationStrategy === "fixed" ? "fixed" : "variable",
    },
    riders: normalizeRiders(input.riders),
  };
}

async function canManageTttPlan(parentTeamId: string, teamId?: string | null) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd.", userId: null };
  if (access.has("teams.manage_roster")) {
    return { ok: true as const, userId: access.user.id };
  }

  const admin = createAdminClient();
  const teamIds = Array.from(new Set([parentTeamId, teamId].filter(Boolean))) as string[];
  const { data, error } = await admin
    .from("team_members")
    .select("team_id")
    .in("team_id", teamIds)
    .eq("profile_id", access.user.id)
    .in("role", ["captain", "co-captain"]);
  if (error) return { ok: false as const, error: error.message, userId: access.user.id };
  if ((data ?? []).length === 0) {
    return { ok: false as const, error: "Geen recht om dit TTT-plan te beheren.", userId: access.user.id };
  }
  return { ok: true as const, userId: access.user.id };
}

async function guardExistingPlan(planId: string) {
  const admin = createAdminClient();
  const { data: plan, error } = await admin
    .from("ttt_plans")
    .select("id, parent_team_id, team_id, event_id")
    .eq("id", planId)
    .maybeSingle<ExistingPlan>();
  if (error) return { ok: false as const, error: error.message, plan: null };
  if (!plan) return { ok: false as const, error: "TTT-plan niet gevonden.", plan: null };
  const guard = await canManageTttPlan(plan.parent_team_id, plan.team_id);
  if (!guard.ok) return { ...guard, plan: null };
  return { ok: true as const, userId: guard.userId, plan };
}

function validatePlan(plan: TttPlanInput, mode: "save" | "optimize") {
  if (!plan.parentTeamId) return "Kies eerst een team.";
  if (plan.riders.length === 0) return "Voeg minstens een rider toe.";
  if (plan.riders.length > 8) return "Een TTT race sheet mag maximaal 8 riders bevatten.";
  if (mode === "optimize" && plan.riders.length < 2) {
    return "ZwiftGopher heeft minstens 2 riders nodig.";
  }
  if (plan.settings.minPullDuration > plan.settings.maxPullDuration) {
    return "Minimale pull-duur mag niet hoger zijn dan maximale pull-duur.";
  }
  for (const rider of plan.riders) {
    if (!rider.name) return "Elke rider moet een naam hebben.";
  }
  if (mode === "optimize") {
    try {
      buildZwiftGopherPayload(plan);
    } catch (err) {
      return err instanceof Error ? err.message : "Ongeldige ZwiftGopher-input.";
    }
  }
  return null;
}

function responseRiders(apiResponse: unknown): unknown[] {
  if (
    typeof apiResponse === "object" &&
    apiResponse &&
    "data" in apiResponse &&
    typeof apiResponse.data === "object" &&
    apiResponse.data &&
    "riders" in apiResponse.data &&
    Array.isArray(apiResponse.data.riders)
  ) {
    return apiResponse.data.riders;
  }
  return [];
}

function riderResult(rider: TttPlanRiderInput, apiRiders: unknown[], index: number) {
  const zwiftId = rider.zwiftId.trim();
  const byZwift = apiRiders.find(
    (row) =>
      typeof row === "object" &&
      row &&
      "zwift_id" in row &&
      String(row.zwift_id) === zwiftId,
  );
  if (byZwift) return byZwift;
  const byName = apiRiders.find(
    (row) =>
      typeof row === "object" &&
      row &&
      "name" in row &&
      String(row.name).toLowerCase() === rider.name.toLowerCase(),
  );
  return byName ?? apiRiders[index] ?? {};
}

async function savePlanRows(
  plan: TttPlanInput,
  userId: string,
  status: "draft" | "optimized" | "error",
  apiResponse?: unknown,
  lastError?: string | null,
) {
  const admin = createAdminClient();
  const planPayload = {
    event_id: plan.eventId,
    parent_team_id: plan.parentTeamId,
    team_id: plan.teamId,
    name: plan.name,
    route: plan.settings.route,
    target_speed: plan.settings.targetSpeed,
    intensity: plan.settings.intensity,
    efficiency: plan.settings.efficiency,
    allow_zero_pulls: plan.settings.allowZeroPulls,
    min_pull_duration: plan.settings.minPullDuration,
    max_pull_duration: plan.settings.maxPullDuration,
    duration_interval: plan.settings.durationInterval,
    optimization_strategy: plan.settings.optimizationStrategy,
    status,
    api_response: apiResponse ?? null,
    export_snapshot: {
      settings: plan.settings,
      riders: plan.riders,
      optimizedAt: status === "optimized" ? new Date().toISOString() : null,
    },
    last_error: lastError ?? null,
    updated_by: userId,
    ...(status === "optimized" ? { optimized_at: new Date().toISOString() } : {}),
  };

  const existing = plan.id
    ? await admin
        .from("ttt_plans")
        .update(planPayload)
        .eq("id", plan.id)
        .select("id")
        .single<{ id: string }>()
    : await admin
        .from("ttt_plans")
        .insert({ ...planPayload, created_by: userId })
        .select("id")
        .single<{ id: string }>();

  if (existing.error) throw new Error(existing.error.message);
  const planId = existing.data.id;

  const { error: deleteError } = await admin
    .from("ttt_plan_riders")
    .delete()
    .eq("plan_id", planId);
  if (deleteError) throw new Error(deleteError.message);

  const apiRiders = responseRiders(apiResponse);
  const rows = plan.riders.map((rider, index) => ({
    plan_id: planId,
    profile_id: rider.profileId,
    is_manual: rider.isManual,
    zwift_id: rider.zwiftId || null,
    name: rider.name,
    ftp_watts: rider.ftpWatts,
    weight_kg: rider.weightKg,
    height_cm: rider.heightCm,
    power_300_watts: rider.power300Watts,
    pull_watts: rider.pullWatts,
    pull_duration_seconds: rider.pullDurationSeconds,
    display_order: index,
    role: rider.role,
    notes: rider.notes,
    result: riderResult(rider, apiRiders, index),
  }));

  if (rows.length > 0) {
    const { error: insertError } = await admin.from("ttt_plan_riders").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/teams/ttt-planner");
  revalidatePath(`/teams/ttt-planner/${planId}`);
  revalidatePath(`/teams/${plan.parentTeamId}`);
  if (plan.teamId) revalidatePath(`/teams/${plan.teamId}`);
  if (plan.eventId) revalidatePath(`/events/${plan.eventId}`);
  return planId;
}

export async function saveTttPlan(input: TttPlanInput): Promise<TttActionResult> {
  const plan = normalizePlan(input);
  const validation = validatePlan(plan, "save");
  if (validation) return { ok: false, error: validation };

  const guard = plan.id
    ? await guardExistingPlan(plan.id)
    : await canManageTttPlan(plan.parentTeamId, plan.teamId);
  if (!guard.ok || !guard.userId) {
    return { ok: false, error: guard.error ?? "Geen recht om dit TTT-plan te beheren." };
  }

  try {
    const planId = await savePlanRows(plan, guard.userId, "draft");
    return { ok: true, planId, message: "TTT-plan opgeslagen." };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Opslaan van TTT-plan faalde.",
    };
  }
}

export async function optimizeTttPlan(input: TttPlanInput): Promise<TttActionResult> {
  const plan = normalizePlan(input);
  const validation = validatePlan(plan, "optimize");
  if (validation) return { ok: false, error: validation };

  const guard = plan.id
    ? await guardExistingPlan(plan.id)
    : await canManageTttPlan(plan.parentTeamId, plan.teamId);
  if (!guard.ok || !guard.userId) {
    return { ok: false, error: guard.error ?? "Geen recht om dit TTT-plan te beheren." };
  }

  try {
    const { body } = await optimizeWithZwiftGopher(plan);
    const planId = await savePlanRows(plan, guard.userId, "optimized", body);
    return { ok: true, planId, apiResponse: body, message: "TTT-plan geoptimaliseerd." };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "ZwiftGopher optimalisatie faalde.",
      statusCode:
        err instanceof Error && "statusCode" in err
          ? Number((err as Error & { statusCode?: number }).statusCode)
          : undefined,
    };
  }
}

export async function deleteTttPlan(planId: string): Promise<TttActionResult> {
  const guard = await guardExistingPlan(planId);
  if (!guard.ok) {
    return { ok: false, error: guard.error ?? "Geen recht om dit TTT-plan te beheren." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("ttt_plans").delete().eq("id", planId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/teams/ttt-planner");
  if (guard.plan) {
    revalidatePath(`/teams/${guard.plan.parent_team_id}`);
    if (guard.plan.team_id) revalidatePath(`/teams/${guard.plan.team_id}`);
    if (guard.plan.event_id) revalidatePath(`/events/${guard.plan.event_id}`);
  }
  return { ok: true, planId, message: "TTT-plan verwijderd." };
}
