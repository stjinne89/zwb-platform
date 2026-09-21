"use server";

import { revalidatePath } from "next/cache";
import { loadForUser, rideFor } from "@/lib/pacing/session";
import {
  fitStoredPlanToTime,
  readPlan,
  recomputePlan,
  saveEditedPlan,
  type StoredPlan,
} from "@/lib/pacing/store";
import { parseTargetTime } from "@/lib/pacing/target-time";
import { adoptSharedPlan, sharedPlanView } from "@/lib/pacing/share";
import { validateEditedPlan, type EditedSegmentInput } from "@/lib/pacing/edit";
import { imposeFixedPieces, rebalancePlan, type PlanSegment } from "@/lib/pacing/plan";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Het lid heeft doelen verzet of stukken geknipt en samengevoegd. Sinds
 * september 2026 komt de hele indeling mee, maar de server vertrouwt die niet:
 * validateEditedPlan zet de grenzen op het raster, eist dat de route gedekt is,
 * en leidt accent, inspanning en de vaste stukken (neutralisatie, afdaling) zelf
 * af uit de route.
 */
export async function savePacingPlan(
  eventId: string,
  input: EditedSegmentInput[],
  notes: string | null,
): Promise<ActionResult> {
  const result = await loadForUser(eventId);
  if (!result.ok) return { ok: false, error: result.error };
  const { ctx } = result;

  const plan = await readPlan(ctx.admin, eventId, ctx.userId);
  if (!plan) return { ok: false, error: "Er is nog geen plan om aan te passen." };

  const ride = rideFor(ctx, plan.assumptions?.setup);
  const validated = validateEditedPlan(
    input,
    ctx.loaded.route,
    ctx.rider.model,
    plan.segments,
    ride?.physics ?? null,
  );
  if (!validated.ok) return { ok: false, error: validated.error };
  const segments: PlanSegment[] = validated.segments;

  await saveEditedPlan(ctx.admin, {
    eventId,
    profileId: ctx.userId,
    segments,
    plan,
    route: ctx.loaded.route,
    rider: ctx.rider,
    routeSyncedAt: ctx.loaded.routeSyncedAt,
    notes,
    ride,
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
    ride: rideFor(ctx, plan.assumptions?.setup),
  });

  revalidatePath(`/events/${eventId}/pacing`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

/**
 * Zwift: het lid kiest format, fiets, upgradeniveau, ploeggrootte of lengte. Het
 * plan wordt meteen doorgerekend met die opzet; doelen en indeling blijven, de
 * start en sprint van een wedstrijd komen erbij of gaan eraf.
 */
export async function savePacingSetup(eventId: string, setup: unknown): Promise<ActionResult> {
  const result = await loadForUser(eventId);
  if (!result.ok) return { ok: false, error: result.error };
  const { ctx } = result;
  if (!ctx.zwift) return { ok: false, error: "Alleen een Zwift-event heeft een opzet." };

  const plan = await readPlan(ctx.admin, eventId, ctx.userId);
  if (!plan) return { ok: false, error: "Er is nog geen plan om aan te passen." };

  await recomputePlan(ctx.admin, {
    eventId,
    profileId: ctx.userId,
    plan,
    route: ctx.loaded.route,
    rider: ctx.rider,
    routeSyncedAt: ctx.loaded.routeSyncedAt,
    ride: rideFor(ctx, setup),
  });

  revalidatePath(`/events/${eventId}/pacing`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

/**
 * Zet het plan op een gewenste eindtijd ("5:30"). Geen AI: dezelfde verdeling op
 * een ander niveau, en eerlijk "niet haalbaar" als het doel sneller is dan kan.
 */
export async function planForTargetTime(
  eventId: string,
  value: string,
): Promise<
  | { ok: true; reachable: boolean; seconds: number; fastestSeconds: number }
  | { ok: false; error: string }
> {
  const targetSeconds = parseTargetTime(String(value ?? ""));
  if (!targetSeconds) return { ok: false, error: "Vul een tijd in als u:mm, bijvoorbeeld 5:30." };

  const result = await loadForUser(eventId);
  if (!result.ok) return { ok: false, error: result.error };
  const { ctx } = result;

  const plan = await readPlan(ctx.admin, eventId, ctx.userId);
  if (!plan) return { ok: false, error: "Er is nog geen plan om op tijd te zetten." };

  const targetTime = await fitStoredPlanToTime(ctx.admin, {
    eventId,
    profileId: ctx.userId,
    plan,
    route: ctx.loaded.route,
    rider: ctx.rider,
    routeSyncedAt: ctx.loaded.routeSyncedAt,
    targetSeconds,
    ride: rideFor(ctx, plan.assumptions?.setup),
  });

  revalidatePath(`/events/${eventId}/pacing`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true, ...targetTime };
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

  const plan = await readPlan(ctx.admin, eventId, ctx.userId);
  if (!plan) return { ok: false, error: "Er is nog geen eigen plan om te vervangen." };

  // Andermans plan hoeft op jouw benen niet te kloppen; rebalancePlan snijdt
  // eraf wat er niet in past voordat het wordt opgeslagen. Je eigen fiets en
  // format blijven staan: die kies je zelf.
  const ride = rideFor(ctx, plan.assumptions?.setup);
  const rebalanced = rebalancePlan(
    imposeFixedPieces(mine, ctx.loaded.route, ctx.rider.model, ride?.physics ?? null),
    ctx.loaded.route,
    ctx.rider.model,
    ctx.rider.curve,
    { durability: ctx.rider.durability, ride: ride?.physics ?? null },
  );

  await saveEditedPlan(ctx.admin, {
    eventId,
    profileId: ctx.userId,
    segments: rebalanced.plan,
    plan,
    route: ctx.loaded.route,
    rider: ctx.rider,
    routeSyncedAt: ctx.loaded.routeSyncedAt,
    notes: null,
    ride,
  });

  revalidatePath(`/events/${eventId}/pacing`);
  return { ok: true };
}
