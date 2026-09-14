// Opslag van pacingplannen en hun generaties.
//
// De generatie-rij wordt geschreven vóórdat de call naar OpenAI vertrekt: een
// generatie die start zonder rij is geld dat verdwijnt zonder spoor. Opslaan
// gebeurt idempotent op `ai_generation_id`, zodat twee tabbladen die tegelijk
// pollen niet elkaars — of erger, het lid zijn eigen — bewerkingen overschrijven.

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPacingModel,
  retrievePacingPlan,
  startPacingPlanBackground,
  type PacingAiInput,
} from "@/lib/pacing/ai";
import { adoptGeneratedPlan } from "@/lib/pacing/adopt";
import { buildBaselinePlan } from "@/lib/pacing/baseline";
import { evaluatePlan, type PlanEvaluation, type PlanSegment } from "@/lib/pacing/plan";
import type { RiderContext } from "@/lib/pacing/draft";
import type { PacingRoute } from "@/lib/pacing/route-profile";
import type { TargetTime } from "@/lib/pacing/target-time";
import {
  buildAssumptions,
  planLayoutMatchesRoute,
  type PlanAssumptions,
  type RouteLayoutSnapshot,
} from "@/lib/pacing/staleness";

type Admin = ReturnType<typeof createAdminClient>;

export type PlanSummary = {
  totalSeconds: number;
  avgWatts: number;
  avgWkg: number;
  /**
   * CP in w/kg van de maker. Nodig om een gedeeld plan naar een clubgenoot te
   * kunnen vertalen: "105 % van mijn CP" moet bij hem "105 % van zijn CP"
   * worden, niet hetzelfde absolute getal.
   */
  cpWkg: number;
  intensityFactor: number;
  deepestDrawPct: number;
  feasible: boolean;
  depletedAtKm: number | null;
  totalKj: number;
  strategy?: string | null;
  risks?: string[];
  notes?: string[];
  /** Gewenste eindtijd, als het lid er een opgaf; sinds 14 september 2026. */
  targetTime?: TargetTime | null;
};

export type StoredPlan = {
  id: string;
  event_id: string;
  profile_id: string;
  source: "ai" | "baseline" | "manual";
  segments: PlanSegment[];
  assumptions: PlanAssumptions | null;
  summary: PlanSummary | null;
  route_snapshot: RouteLayoutSnapshot | null;
  notes: string | null;
  shared: boolean;
  ai_generation_id: string | null;
  updated_at: string;
};

export function summarize(
  evaluation: PlanEvaluation,
  cpWkg: number,
  extra: {
    strategy?: string | null;
    risks?: string[];
    notes?: string[];
    targetTime?: TargetTime | null;
  } = {},
): PlanSummary {
  return {
    totalSeconds: Math.round(evaluation.totalSeconds),
    avgWatts: evaluation.avgWatts,
    avgWkg: Math.round(evaluation.avgWkg * 100) / 100,
    cpWkg: Math.round(cpWkg * 100) / 100,
    intensityFactor: Math.round(evaluation.intensityFactor * 100) / 100,
    deepestDrawPct: Math.round(evaluation.deepestDrawPct),
    feasible: evaluation.feasible,
    depletedAtKm: evaluation.wPrime.depletedAtKm,
    totalKj: Math.round(evaluation.wPrime.totalKj),
    strategy: extra.strategy ?? null,
    risks: extra.risks ?? [],
    notes: extra.notes ?? [],
    targetTime: extra.targetTime ?? null,
  };
}

export function routeSnapshot(route: PacingRoute): RouteLayoutSnapshot {
  const km = (value: number) => Math.round(value * 1000) / 1000;
  return {
    totalKm: Math.round(route.totalKm * 100) / 100,
    accentIds: route.accents.map((accent) => accent.id),
    // De grenzen erbij, zodat een verlegde klim het plan ook verouderd maakt.
    accents: route.accents.map((accent) => ({
      id: accent.id,
      startKm: km(accent.startKm),
      endKm: km(accent.endKm),
    })),
    neutral: (route.neutralZones ?? []).map((zone) => ({
      startKm: km(zone.startKm),
      endKm: km(zone.endKm),
    })),
    descents: (route.descents ?? []).map((descent) => ({
      startKm: km(descent.startKm),
      endKm: km(descent.endKm),
    })),
  };
}

export async function readPlan(
  admin: Admin,
  eventId: string,
  profileId: string,
): Promise<StoredPlan | null> {
  const { data } = await admin
    .from("event_pacing_plans")
    .select("*")
    .eq("event_id", eventId)
    .eq("profile_id", profileId)
    .maybeSingle();
  return (data as StoredPlan) ?? null;
}

export async function savePlan(
  admin: Admin,
  input: {
    eventId: string;
    profileId: string;
    source: StoredPlan["source"];
    segments: PlanSegment[];
    evaluation: PlanEvaluation;
    route: PacingRoute;
    assumptions: PlanAssumptions;
    aiGenerationId?: string | null;
    strategy?: string | null;
    risks?: string[];
    notes?: string[];
    targetTime?: TargetTime | null;
    /** De route waar de stukken bij horen, als dat niet de huidige is. */
    routeSnapshot?: RouteLayoutSnapshot | null;
  },
) {
  const { error } = await admin.from("event_pacing_plans").upsert(
    {
      event_id: input.eventId,
      profile_id: input.profileId,
      source: input.source,
      segments: input.segments,
      route_snapshot: input.routeSnapshot ?? routeSnapshot(input.route),
      assumptions: input.assumptions,
      summary: summarize(
        input.evaluation,
        input.assumptions.cpWatts / input.assumptions.weightKg,
        {
          strategy: input.strategy,
          risks: input.risks,
          notes: input.notes,
          targetTime: input.targetTime,
        },
      ),
      ai_generation_id: input.aiGenerationId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_id,profile_id" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Maakt en bewaart het deterministische voorstel. Dit is wat een lid ziet zodra
 * het de pacingpagina opent — nooit een leeg scherm, ook zonder AI.
 */
export async function ensureBaselinePlan(
  admin: Admin,
  input: {
    eventId: string;
    profileId: string;
    route: PacingRoute;
    rider: RiderContext;
    routeSyncedAt: string | null;
  },
): Promise<StoredPlan> {
  const existing = await readPlan(admin, input.eventId, input.profileId);
  if (existing) return existing;

  const baseline = buildBaselinePlan({
    route: input.route,
    model: input.rider.model,
    riderType: input.rider.riderType,
    curve: input.rider.curve,
    durability: input.rider.durability,
  });

  await savePlan(admin, {
    eventId: input.eventId,
    profileId: input.profileId,
    source: "baseline",
    segments: baseline.plan,
    evaluation: baseline.evaluation,
    route: input.route,
    assumptions: assumptionsFor(input.rider, input.routeSyncedAt),
    notes: [...baseline.adjustments, ...baseline.clampNotes.map(clampNoteText)],
  });

  return (await readPlan(admin, input.eventId, input.profileId))!;
}

export function assumptionsFor(
  rider: RiderContext,
  routeSyncedAt: string | null,
): PlanAssumptions {
  return buildAssumptions({
    cpWatts: rider.model.cpWatts,
    wPrimeJoules: rider.model.wPrimeJoules,
    ftpWatts: rider.ftpWatts,
    weightKg: rider.model.weightKg,
    cpSource: rider.model.source,
    routeSyncedAt,
  });
}

function clampNoteText(note: {
  label: string;
  fromWkg: number;
  toWkg: number;
  reason: string;
}): string {
  return `${note.label}: ${note.fromWkg} → ${note.toWkg} w/kg (${note.reason}).`;
}

/**
 * Herberekent een bestaand plan met de huidige gegevens van het lid, maar houdt
 * de accenten vast die het lid zelf heeft gelegd. Dit is de gratis knop bij een
 * verouderd plan: geen AI-call, alleen opnieuw doorrekenen.
 */
export async function recomputePlan(
  admin: Admin,
  input: {
    eventId: string;
    profileId: string;
    plan: StoredPlan;
    route: PacingRoute;
    rider: RiderContext;
    routeSyncedAt: string | null;
  },
) {
  const { rebalancePlan } = await import("@/lib/pacing/plan");

  // Zijn de klimmen van de route veranderd, dan past de oude indeling er niet
  // meer op. Dan de indeling van de huidige route, met de eigen doelen van het
  // lid overgenomen op elk stuk dat precies gelijk is gebleven. Het lid drukt hier
  // zelf op de knop; stil op de achtergrond gebeurt dit nooit.
  const layoutChanged = !planLayoutMatchesRoute(
    input.plan.route_snapshot,
    input.plan.segments,
    input.route,
  );
  const startSegments = layoutChanged
    ? carryTargetsOver(
        input.plan.segments,
        buildBaselinePlan({
          route: input.route,
          model: input.rider.model,
          riderType: input.rider.riderType,
          curve: input.rider.curve,
          durability: input.rider.durability,
        }).plan,
      )
    : input.plan.segments;

  const { imposeFixedPieces } = await import("@/lib/pacing/plan");
  const rebalanced = rebalancePlan(
    imposeFixedPieces(startSegments, input.route, input.rider.model),
    input.route,
    input.rider.model,
    input.rider.curve,
    { durability: input.rider.durability },
  );
  const origin = recomputedOrigin(input.plan, layoutChanged);

  await savePlan(admin, {
    eventId: input.eventId,
    profileId: input.profileId,
    ...origin,
    segments: rebalanced.plan,
    evaluation: rebalanced.evaluation,
    route: input.route,
    assumptions: assumptionsFor(input.rider, input.routeSyncedAt),
    // Het doel blijft staan; de pagina toont hoe ver de nieuwe tijd ervan af ligt.
    targetTime: input.plan.summary?.targetTime ?? null,
    notes: [
      ...rebalanced.adjustments,
      ...rebalanced.clampNotes.map(clampNoteText),
      !layoutChanged
        ? "Opnieuw doorgerekend met je huidige gegevens."
        : input.plan.source === "ai"
          ? "Opnieuw ingedeeld op de huidige klimmen als basisvoorstel; het AI-voorstel hoorde bij de oude klimmen."
          : "Opnieuw ingedeeld op de huidige route; je eigen doelen staan nog op de stukken die gelijk bleven, zelf geknipte stukken zijn vervallen.",
    ],
  });

  return rebalanced;
}

/**
 * Waar een herberekend plan vandaan komt. Zonder nieuwe indeling blijft dat wat
 * het was: een herberekening maakt van een AI-plan geen handmatig plan, en de
 * strategie van de AI blijft staan.
 *
 * Met een nieuwe indeling staan er stukken uit het basisvoorstel. De strategie
 * en risico's van de AI gingen over de oude stukken ("Glandon strak afronden"
 * boven "Glandon (begin)") en vallen daarom weg; een AI-plan heet dan
 * basisvoorstel. Een handmatig plan blijft handmatig, want daar staan nog eigen
 * doelen op.
 */
export function recomputedOrigin(
  plan: Pick<StoredPlan, "source" | "summary" | "ai_generation_id">,
  layoutChanged: boolean,
): {
  source: StoredPlan["source"];
  aiGenerationId: string | null;
  strategy: string | null;
  risks: string[];
} {
  if (!layoutChanged) {
    return {
      source: plan.source,
      aiGenerationId: plan.ai_generation_id,
      strategy: plan.summary?.strategy ?? null,
      risks: plan.summary?.risks ?? [],
    };
  }
  return {
    source: plan.source === "ai" ? "baseline" : plan.source,
    aiGenerationId: null,
    strategy: null,
    risks: [],
  };
}

/**
 * Nieuwe indeling, oude keuzes: elk nieuw stuk dat qua grenzen en accent
 * precies gelijk is aan een oud stuk houdt het doel dat het lid daar had.
 * De rest krijgt het voorstel van de nieuwe indeling.
 */
export function carryTargetsOver(previous: PlanSegment[], next: PlanSegment[]): PlanSegment[] {
  const same = (a: PlanSegment, b: PlanSegment) =>
    Math.abs(a.startKm - b.startKm) <= 0.05 &&
    Math.abs(a.endKm - b.endKm) <= 0.05 &&
    (a.accentId ?? null) === (b.accentId ?? null);
  return next.map((segment) => {
    const kept = previous.find((old) => same(old, segment));
    return kept ? { ...segment, targetWkg: kept.targetWkg, effort: kept.effort } : segment;
  });
}

/** Rekent een door het lid bewerkt plan door en bewaart het. */
export async function saveEditedPlan(
  admin: Admin,
  input: {
    eventId: string;
    profileId: string;
    segments: PlanSegment[];
    plan: StoredPlan;
    route: PacingRoute;
    rider: RiderContext;
    routeSyncedAt: string | null;
    notes: string | null;
  },
) {
  const evaluation = evaluatePlan(input.segments, input.route, input.rider.model, {
    durability: input.rider.durability,
  });

  await savePlan(admin, {
    eventId: input.eventId,
    profileId: input.profileId,
    source: "manual",
    segments: input.segments,
    evaluation,
    route: input.route,
    assumptions: assumptionsFor(input.rider, input.routeSyncedAt),
    aiGenerationId: input.plan.ai_generation_id,
    strategy: input.plan.summary?.strategy ?? null,
    risks: input.plan.summary?.risks ?? [],
    targetTime: input.plan.summary?.targetTime ?? null,
    // Een schuifregelaar verzetten verandert de indeling niet. Hoorde die bij een
    // oudere route, dan blijft dat zo vastgelegd; anders verdween de melding
    // "verouderd" zodra het lid iets opsloeg, terwijl de stukken nog oud waren.
    routeSnapshot: planLayoutMatchesRoute(
      input.plan.route_snapshot,
      input.segments,
      input.route,
    )
      ? null
      : input.plan.route_snapshot,
  });

  if (input.notes !== null) {
    await admin
      .from("event_pacing_plans")
      .update({ notes: input.notes })
      .eq("event_id", input.eventId)
      .eq("profile_id", input.profileId);
  }

  return evaluation;
}

/**
 * Zet het plan van het lid op een gewenste eindtijd: de vorm van het huidige plan
 * blijft, het niveau schuift. Waar het plan vandaan kwam blijft staan; de
 * AI-strategie ook, want de verdeling is dezelfde.
 */
export async function fitStoredPlanToTime(
  admin: Admin,
  input: {
    eventId: string;
    profileId: string;
    plan: StoredPlan;
    route: PacingRoute;
    rider: RiderContext;
    routeSyncedAt: string | null;
    targetSeconds: number;
  },
) {
  const { imposeFixedPieces } = await import("@/lib/pacing/plan");
  const { fitPlanToTime } = await import("@/lib/pacing/target-time");

  const fitted = fitPlanToTime(
    imposeFixedPieces(input.plan.segments, input.route, input.rider.model),
    input.route,
    input.rider.model,
    input.targetSeconds,
    { curve: input.rider.curve, durability: input.rider.durability },
  );
  const targetTime = {
    seconds: fitted.seconds,
    reachable: fitted.reachable,
    fastestSeconds: fitted.fastestSeconds,
  };

  await savePlan(admin, {
    eventId: input.eventId,
    profileId: input.profileId,
    source: input.plan.source,
    segments: fitted.plan,
    evaluation: fitted.evaluation,
    route: input.route,
    assumptions: assumptionsFor(input.rider, input.routeSyncedAt),
    aiGenerationId: input.plan.ai_generation_id,
    strategy: input.plan.summary?.strategy ?? null,
    risks: input.plan.summary?.risks ?? [],
    targetTime,
    notes: [
      fitted.reachable
        ? "Doelen verschoven naar je gewenste eindtijd; de verhoudingen tussen de stukken zijn gelijk gebleven."
        : "Je gewenste eindtijd is met je huidige vermogen niet haalbaar; dit is het snelste plan dat je reserve tot de finish houdt.",
    ],
    routeSnapshot: planLayoutMatchesRoute(
      input.plan.route_snapshot,
      input.plan.segments,
      input.route,
    )
      ? null
      : input.plan.route_snapshot,
  });

  return targetTime;
}

// --- AI-generatie --------------------------------------------------------

export async function startGeneration(
  admin: Admin,
  input: {
    eventId: string;
    profileId: string;
    aiInput: PacingAiInput;
  },
): Promise<{ generationId: string }> {
  const model = getPacingModel();

  const { data: row, error } = await admin
    .from("event_pacing_generations")
    .insert({
      event_id: input.eventId,
      profile_id: input.profileId,
      model,
      status: "queued",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  try {
    const started = await startPacingPlanBackground(input.aiInput);
    await admin
      .from("event_pacing_generations")
      .update({
        openai_response_id: started.responseId,
        status: started.status === "completed" ? "in_progress" : started.status,
        prompt_summary: started.promptSummary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  } catch (err) {
    await admin
      .from("event_pacing_generations")
      .update({
        status: "failed",
        error: err instanceof Error ? err.message : "Generatie starten faalde.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    throw err;
  }

  return { generationId: row.id as string };
}

export type PollResult =
  | { status: "queued" | "in_progress" }
  | { status: "completed" }
  | { status: "failed"; error: string };

export async function pollGeneration(
  admin: Admin,
  input: {
    generationId: string;
    profileId: string;
    eventId: string;
    route: PacingRoute;
    rider: RiderContext;
    routeSyncedAt: string | null;
  },
): Promise<PollResult> {
  const { data } = await admin
    .from("event_pacing_generations")
    .select("id, status, openai_response_id, error")
    .eq("id", input.generationId)
    .eq("profile_id", input.profileId)
    .maybeSingle();

  const row = data as {
    status: string;
    openai_response_id: string | null;
    error: string | null;
  } | null;
  if (!row) return { status: "failed", error: "Generatie niet gevonden." };
  if (row.status === "completed") return { status: "completed" };
  if (row.status === "failed" || row.status === "cancelled") {
    return { status: "failed", error: row.error ?? "Generatie mislukt." };
  }
  if (!row.openai_response_id) return { status: "queued" };

  const result = await retrievePacingPlan(row.openai_response_id);

  if (result.status !== "completed") {
    // Nog bezig, of definitief mislukt — dat onderscheid zit in `error`.
    if (!("error" in result)) {
      await admin
        .from("event_pacing_generations")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", input.generationId);
      return { status: "in_progress" };
    }

    await admin
      .from("event_pacing_generations")
      .update({
        status: "failed",
        error: result.error,
        response_json: result.responseJson,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.generationId);
    return { status: "failed", error: result.error };
  }

  const adopted = adoptGeneratedPlan(result.plan, input.route, input.rider.model, {
    curve: input.rider.curve,
    durability: input.rider.durability,
  });

  await savePlan(admin, {
    eventId: input.eventId,
    profileId: input.profileId,
    source: "ai",
    segments: adopted.plan,
    evaluation: adopted.evaluation,
    route: input.route,
    assumptions: assumptionsFor(input.rider, input.routeSyncedAt),
    aiGenerationId: input.generationId,
    strategy: adopted.strategy,
    risks: adopted.risks,
    notes: [
      ...adopted.repairs,
      ...adopted.adjustments,
      ...adopted.clampNotes.map(clampNoteText),
    ],
  });

  await admin
    .from("event_pacing_generations")
    .update({
      status: "completed",
      response_json: result.responseJson,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.generationId);

  return { status: "completed" };
}
