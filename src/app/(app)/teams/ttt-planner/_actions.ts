"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  gopherJsonUrl,
  looksLikeUrl,
  parseGopherExport,
  type GopherPlan,
} from "@/lib/ttt/zwiftgopher";
import { DEFAULT_TTT_SETTINGS, tttMaxRiders } from "@/lib/ttt/types";
import type { TttActionResult, TttPlanInput, TttPlanRiderInput } from "@/lib/ttt/types";

type ExistingPlan = {
  id: string;
  parent_team_id: string;
  team_id: string | null;
  event_id: string | null;
};

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

function revalidatePlan(planId: string, plan: Pick<ExistingPlan, "parent_team_id" | "team_id" | "event_id">) {
  revalidatePath("/teams/ttt-planner");
  revalidatePath(`/teams/ttt-planner/${planId}`);
  revalidatePath(`/teams/${plan.parent_team_id}`);
  if (plan.team_id) revalidatePath(`/teams/${plan.team_id}`);
  if (plan.event_id) revalidatePath(`/events/${plan.event_id}`);
}

/** Binnen de grenzen van de kolom (migr. 0071), anders leeg. */
function within(value: number | null, min: number, max: number) {
  return value != null && value >= min && value <= max ? value : null;
}

function clamp(value: number | null, min: number, max: number, fallback: number) {
  return value == null ? fallback : Math.max(min, Math.min(max, value));
}

async function savePlanRows(
  plan: TttPlanInput,
  userId: string,
  apiResponse: unknown,
  riderResults: Array<Record<string, unknown>>,
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
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
    status: "optimized",
    api_response: apiResponse,
    export_snapshot: { settings: plan.settings, riders: plan.riders, optimizedAt: now },
    last_error: null,
    updated_by: userId,
    optimized_at: now,
  };

  const saved = plan.id
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
  if (saved.error) throw new Error(saved.error.message);
  const planId = saved.data.id;

  const { error: deleteError } = await admin
    .from("ttt_plan_riders")
    .delete()
    .eq("plan_id", planId);
  if (deleteError) throw new Error(deleteError.message);

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
    result: riderResults[index] ?? {},
  }));
  if (rows.length > 0) {
    const { error: insertError } = await admin.from("ttt_plan_riders").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePlan(planId, {
    parent_team_id: plan.parentTeamId,
    team_id: plan.teamId,
    event_id: plan.eventId,
  });
  return planId;
}

/** Export Link van ZwiftGopher ophalen; alleen dat adres, met een time-out. */
async function fetchGopherExport(link: string) {
  const url = gopherJsonUrl(link);
  if (!url) throw new Error("Alleen een link van zwiftgopher.com/TTT werkt hier.");
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`ZwiftGopher gaf HTTP ${res.status}.`);
  return res.text();
}

export type TttImportInput = {
  planId?: string | null;
  source: string;
  name: string;
  eventId: string | null;
  teamId: string;
};

export type TttImportResult =
  | {
      ok: true;
      planId: string;
      message: string;
      riders: Array<{ name: string; pullWatts: number | null; pullSeconds: number }>;
    }
  | { ok: false; error: string };

/**
 * Een plan uit ZwiftGopher opslaan: Export JSON, Export Link of Export Text.
 * Met `planId` vervangt de import de renners van dat plan; publicatie en
 * deellink blijven staan.
 */
export async function importTttPlan(input: TttImportInput): Promise<TttImportResult> {
  const admin = createAdminClient();
  const { data: team } = await admin
    .from("teams")
    .select("id, parent_team_id")
    .eq("id", input.teamId)
    .maybeSingle<{ id: string; parent_team_id: string | null }>();
  if (!team) return { ok: false, error: "Kies eerst een team." };
  const parentTeamId = team.parent_team_id ?? team.id;

  const guard = await canManageTttPlan(parentTeamId, team.id);
  if (!guard.ok || !guard.userId) {
    return { ok: false, error: guard.error ?? "Geen recht om dit TTT-plan te beheren." };
  }
  if (input.planId) {
    const existing = await guardExistingPlan(input.planId);
    if (!existing.ok) {
      return { ok: false, error: existing.error ?? "Geen recht om dit TTT-plan te beheren." };
    }
  }

  let gopher: GopherPlan;
  try {
    const source = looksLikeUrl(input.source)
      ? await fetchGopherExport(input.source)
      : input.source;
    gopher = parseGopherExport(source);
  } catch (err) {
    const timeout = err instanceof Error && err.name === "TimeoutError";
    return {
      ok: false,
      error: timeout
        ? "ZwiftGopher antwoordde niet op tijd."
        : err instanceof Error
          ? err.message
          : "De export is niet te lezen.",
    };
  }

  let event: { title: string; type: string } | null = null;
  if (input.eventId) {
    const { data } = await admin
      .from("events")
      .select("title, type")
      .eq("id", input.eventId)
      .maybeSingle<{ title: string; type: string }>();
    event = data;
  }
  const maxRiders = tttMaxRiders(event?.type);
  if (gopher.riders.length > maxRiders) {
    return {
      ok: false,
      error: `De export heeft ${gopher.riders.length} renners; deze TTT telt er maximaal ${maxRiders}.`,
    };
  }

  // Renners met een ZWB-account herkennen aan hun Zwift-ID.
  const zwiftIds = gopher.riders.map((rider) => rider.zwiftId).filter(Boolean) as string[];
  const profileByZwiftId = new Map<string, string>();
  if (zwiftIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, zwift_id")
      .in("zwift_id", zwiftIds);
    for (const profile of (profiles ?? []) as Array<{ id: string; zwift_id: string }>) {
      profileByZwiftId.set(profile.zwift_id.trim(), profile.id);
    }
  }

  const riders: TttPlanRiderInput[] = gopher.riders.map((rider, index) => ({
    profileId: rider.zwiftId ? (profileByZwiftId.get(rider.zwiftId) ?? null) : null,
    isManual: !rider.zwiftId,
    zwiftId: rider.zwiftId ?? "",
    name: rider.name,
    ftpWatts: within(rider.ftpWatts && Math.round(rider.ftpWatts), 1, 1199),
    weightKg: within(rider.weightKg, 1, 299),
    heightCm: within(rider.heightCm && Math.round(rider.heightCm), 100, 230),
    power300Watts: within(rider.power300Watts, 1, 1999),
    pullWatts: within(rider.pullWatts, 1, 1999),
    pullDurationSeconds: Math.min(1200, rider.pullSeconds),
    displayOrder: index,
    role: null,
    notes: null,
  }));

  const plan: TttPlanInput = {
    id: input.planId || null,
    name: input.name.trim() || gopher.teamName || event?.title || "TTT-plan",
    eventId: input.eventId || null,
    parentTeamId,
    teamId: team.id,
    settings: {
      ...DEFAULT_TTT_SETTINGS,
      targetSpeed: within(gopher.targetSpeedKmh, 1, 999),
      intensity: clamp(gopher.intensity, -3, 3, DEFAULT_TTT_SETTINGS.intensity),
      efficiency: clamp(gopher.efficiency, -2, 2, DEFAULT_TTT_SETTINGS.efficiency),
    },
    riders,
  };

  try {
    const planId = await savePlanRows(
      plan,
      guard.userId,
      {
        source: "zwiftgopher",
        format: gopher.format,
        importedAt: new Date().toISOString(),
        teamName: gopher.teamName,
        targetSpeedKmh: gopher.targetSpeedKmh,
      },
      gopher.riders.map((rider) =>
        rider.intensityFactor != null ? { intensity_factor: rider.intensityFactor } : {},
      ),
    );
    return {
      ok: true,
      planId,
      message: `${riders.length} renners geïmporteerd.`,
      riders: riders.map((rider) => ({
        name: rider.name,
        pullWatts: rider.pullWatts,
        pullSeconds: rider.pullDurationSeconds ?? 0,
      })),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Opslaan mislukte." };
  }
}

export async function setTttPlanPublished(
  planId: string,
  publish: boolean,
): Promise<TttActionResult> {
  const guard = await guardExistingPlan(planId);
  if (!guard.ok || !guard.plan) {
    return { ok: false, error: guard.error ?? "Geen recht om dit TTT-plan te beheren." };
  }
  const { error } = await createAdminClient()
    .from("ttt_plans")
    .update({ published_at: publish ? new Date().toISOString() : null })
    .eq("id", planId);
  if (error) return { ok: false, error: error.message };
  revalidatePlan(planId, guard.plan);
  return {
    ok: true,
    planId,
    message: publish ? "TTT-plan gepubliceerd." : "Publicatie ingetrokken.",
  };
}

/** Deellink voor de Discord-bot. Een bestaand token blijft staan: de bot kent het al. */
export async function shareTttPlan(
  planId: string,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const guard = await guardExistingPlan(planId);
  if (!guard.ok) {
    return { ok: false, error: guard.error ?? "Geen recht om dit TTT-plan te beheren." };
  }

  const admin = createAdminClient();
  const { data: current, error: readError } = await admin
    .from("ttt_plans")
    .select("share_token")
    .eq("id", planId)
    .maybeSingle<{ share_token: string | null }>();
  if (readError) return { ok: false, error: readError.message };
  if (current?.share_token) return { ok: true, token: current.share_token };

  const token = randomBytes(24).toString("base64url");
  const { error } = await admin
    .from("ttt_plans")
    .update({ share_token: token })
    .eq("id", planId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, token };
}

export async function revokeTttPlanShare(
  planId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardExistingPlan(planId);
  if (!guard.ok) {
    return { ok: false, error: guard.error ?? "Geen recht om dit TTT-plan te beheren." };
  }

  const { error } = await createAdminClient()
    .from("ttt_plans")
    .update({ share_token: null })
    .eq("id", planId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteTttPlan(planId: string): Promise<TttActionResult> {
  const guard = await guardExistingPlan(planId);
  if (!guard.ok) {
    return { ok: false, error: guard.error ?? "Geen recht om dit TTT-plan te beheren." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("ttt_plans").delete().eq("id", planId);
  if (error) return { ok: false, error: error.message };

  if (guard.plan) revalidatePlan(planId, guard.plan);
  return { ok: true, planId, message: "TTT-plan verwijderd." };
}
