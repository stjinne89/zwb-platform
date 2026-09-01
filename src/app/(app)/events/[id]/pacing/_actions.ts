"use server";

import { revalidatePath } from "next/cache";
import { loadForUser } from "@/lib/pacing/session";
import {
  readPlan,
  recomputePlan,
  saveEditedPlan,
  type StoredPlan,
} from "@/lib/pacing/store";
import { adoptSharedPlan, sharedPlanView } from "@/lib/pacing/share";
import { rebalancePlan, type PlanEffort, type PlanSegment } from "@/lib/pacing/plan";
import { createAdminClient } from "@/lib/supabase/admin";

const EFFORTS: PlanEffort[] = ["rustig", "duur", "tempo", "drempel", "vol"];

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Het lid heeft schuifregelaars verzet. We nemen alleen de doelen over, niet de
 * grenzen: de indeling van de route hoort bij het plan, niet bij de invoer van
 * het formulier. Zo kan een gemanipuleerde post geen stukken toevoegen of
 * verschuiven.
 */
export async function savePacingPlan(
  eventId: string,
  targets: Array<{ index: number; targetWkg: number }>,
  notes: string | null,
): Promise<ActionResult> {
  const result = await loadForUser(eventId);
  if (!result.ok) return { ok: false, error: result.error };
  const { ctx } = result;

  const plan = await readPlan(ctx.admin, eventId, ctx.userId);
  if (!plan) return { ok: false, error: "Er is nog geen plan om aan te passen." };

  const segments: PlanSegment[] = plan.segments.map((segment, index) => {
    const update = targets.find((item) => item.index === index);
    if (!update || !Number.isFinite(update.targetWkg)) return segment;
    return {
      ...segment,
      targetWkg: Math.min(12, Math.max(0.5, Math.round(update.targetWkg * 100) / 100)),
      effort: EFFORTS.includes(segment.effort) ? segment.effort : "tempo",
    };
  });

  await saveEditedPlan(ctx.admin, {
    eventId,
    profileId: ctx.userId,
    segments,
    plan,
    route: ctx.loaded.route,
    rider: ctx.rider,
    routeSyncedAt: ctx.loaded.routeSyncedAt,
    notes,
  });

  revalidatePath(`/events/${eventId}/pacing`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

/**
 * Herberekent met de huidige gegevens van het lid, met behoud van de accenten.
 * Dit is de gratis knop bij een verouderd plan — geen AI-call.
 */
export async function recomputePacingPlan(eventId: string): Promise<ActionResult> {
  const result = await loadForUser(eventId);
  if (!result.ok) return { ok: false, error: result.error };
  const { ctx } = result;

  const plan = await readPlan(ctx.admin, eventId, ctx.userId);
  if (!plan) return { ok: false, error: "Er is nog geen plan om te verversen." };

  await recomputePlan(ctx.admin, {
    eventId,
    profileId: ctx.userId,
    plan,
    route: ctx.loaded.route,
    rider: ctx.rider,
    routeSyncedAt: ctx.loaded.routeSyncedAt,
  });

  revalidatePath(`/events/${eventId}/pacing`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function setPacingPlanShared(
  eventId: string,
  shared: boolean,
): Promise<ActionResult> {
  const result = await loadForUser(eventId);
  if (!result.ok) return { ok: false, error: result.error };
  const { ctx } = result;

  const { error } = await ctx.admin
    .from("event_pacing_plans")
    .update({ shared, updated_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("profile_id", ctx.userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/events/${eventId}/pacing`);
  return { ok: true };
}

/**
 * Neemt het gedeelde plan van een clubgenoot over als vertrekpunt, omgerekend
 * naar het CP van dit lid en daarna opnieuw doorgerekend op zijn eigen route.
 */
export async function adoptClubmatePlan(
  eventId: string,
  planId: string,
): Promise<ActionResult> {
  const result = await loadForUser(eventId);
  if (!result.ok) return { ok: false, error: result.error };
  const { ctx } = result;

  const admin = createAdminClient();
  const { data } = await admin
    .from("event_pacing_plans")
    .select("*")
    .eq("id", planId)
    .eq("event_id", eventId)
    .eq("shared", true)
    .maybeSingle();

  const source = data as StoredPlan | null;
  if (!source) return { ok: false, error: "Dit plan is niet (meer) gedeeld." };
  if (source.profile_id === ctx.userId) {
    return { ok: false, error: "Dit is je eigen plan." };
  }

  const { data: owner } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", source.profile_id)
    .maybeSingle();

  const mine = adoptSharedPlan(
    sharedPlanView(source, (owner as { display_name?: string } | null)?.display_name ?? "Clubgenoot"),
    ctx.rider.model.cpWatts / ctx.rider.model.weightKg,
  );

  // Andermans plan hoeft op jouw benen niet te kloppen; rebalancePlan snijdt
  // eraf wat er niet in past voordat het wordt opgeslagen.
  const rebalanced = rebalancePlan(
    mine,
    ctx.loaded.route,
    ctx.rider.model,
    ctx.rider.curve,
    { durability: ctx.rider.durability },
  );

  const plan = await readPlan(ctx.admin, eventId, ctx.userId);
  if (!plan) return { ok: false, error: "Er is nog geen eigen plan om te vervangen." };

  await saveEditedPlan(ctx.admin, {
    eventId,
    profileId: ctx.userId,
    segments: rebalanced.plan,
    plan,
    route: ctx.loaded.route,
    rider: ctx.rider,
    routeSyncedAt: ctx.loaded.routeSyncedAt,
    notes: null,
  });

  revalidatePath(`/events/${eventId}/pacing`);
  return { ok: true };
}
