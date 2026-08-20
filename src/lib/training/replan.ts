// Het schema past zich aan zodra het lid iets verandert: een rit inplannen of
// de beschikbaarheid van deze week bijstellen. Dat is dezelfde herziening als de
// knop "Schema bijwerken", maar dan zonder dat het lid er zelf om vraagt.
//
// Elke herziening is een AI-generatie en kost dus geld. Vandaar de demping: een
// lid dat wat zit te schuiven met schuifbalken mag niet vijf generaties per
// minuut afvuren. Binnen het venster geven we `skipped` terug — de wijziging is
// wél opgeslagen en wordt bij de eerstvolgende herziening meegenomen.
//
// Die laatste zin was lang een loze belofte: niets vroeg die volgende herziening
// aan. Sinds 0132 legt elk verzoek zich vast in `training_replan_requests`, en
// haalt de nacht-cron op wat is blijven liggen. De rij verdwijnt zodra er een
// herziening uit is gekomen.

import type { createAdminClient } from "@/lib/supabase/admin";
import { activeBasePlan } from "@/lib/training/active-plan";
import { startPlanUpdate } from "@/lib/training/draft";

type Admin = ReturnType<typeof createAdminClient>;

/** Hoe lang na een herziening we een volgende laten wachten. */
export const REPLAN_COOLDOWN_MS = 5 * 60_000;

export type ReplanResult =
  | { started: true; generationId: string }
  | { started: false; reason: "no_plan" | "cooldown" | "failed"; error?: string };

/** Loopt er al een verse herziening voor dit lid? */
async function withinCooldown(admin: Admin, profileId: string) {
  const since = new Date(Date.now() - REPLAN_COOLDOWN_MS).toISOString();
  const { data } = await admin
    .from("training_ai_generations")
    .select("id")
    .eq("profile_id", profileId)
    .eq("adaptation_kind", "plan_update")
    .in("status", ["queued", "in_progress", "completed"])
    .gte("created_at", since)
    .limit(1);
  return (data ?? []).length > 0;
}

/**
 * Vraag een herziening van het resterende schema aan. Stilletjes overslaan is
 * hier het normale geval: heeft het lid geen lopend schema, of is er net een
 * herziening geweest, dan is er niets aan de hand.
 */
export async function requestReplan(
  admin: Admin,
  profileId: string,
  reason: string,
): Promise<ReplanResult> {
  try {
    const plan = await activeBasePlan(admin, profileId);
    // Zonder schema valt er niets te herzien, ook niet vannacht: dan zou er een
    // verzoek blijven staan waar nooit iemand iets mee doet.
    if (!plan) return { started: false, reason: "no_plan" };

    // Eerst vastleggen, dan pas proberen. Gaat de generatie hierna niet door of
    // komt er niets uit, dan staat het verzoek er nog en pakt de nacht-cron het
    // op. Slaagt hij wel, dan haalt createPlanFromAiGeneration() de rij weg.
    await markReplanPending(admin, profileId, reason);

    if (await withinCooldown(admin, profileId)) {
      return { started: false, reason: "cooldown" };
    }

    const result = await startPlanUpdate({
      admin,
      planId: plan.id,
      actorId: profileId,
      reason,
    });
    if (!result.ok) return { started: false, reason: "failed", error: result.error };
    return { started: true, generationId: result.generationId };
  } catch (err) {
    return {
      started: false,
      reason: "failed",
      error: err instanceof Error ? err.message : "Schema bijwerken faalde.",
    };
  }
}

export type PendingReplan = {
  reason: string;
  requestedAt: string;
};

/**
 * Leg vast dat het schema van dit lid herzien moet worden. Eén rij per lid: vier
 * wijzigingen op één avond horen samen één herziening op te leveren. De nieuwste
 * reden wint — die beschrijft de laatste stand van zaken.
 */
export async function markReplanPending(admin: Admin, profileId: string, reason: string) {
  await admin
    .from("training_replan_requests")
    .upsert(
      { profile_id: profileId, reason, requested_at: new Date().toISOString() },
      { onConflict: "profile_id" },
    )
    .then(
      () => null,
      // Niet kritiek genoeg om de actie van het lid op te laten klappen: zijn
      // wijziging is al opgeslagen, alleen het vangnet ontbreekt dan.
      () => null,
    );
}

/**
 * Haal het verzoek weg, maar alleen als het ouder is dan de generatie die zojuist
 * een schema heeft opgeleverd. Wijzigde het lid iets terwijl de AI aan het werk
 * was, dan zat dat niet in de invoer en moet het verzoek blijven staan.
 */
export async function clearReplanPending(admin: Admin, profileId: string, plannedAt: string) {
  await admin
    .from("training_replan_requests")
    .delete()
    .eq("profile_id", profileId)
    .lte("requested_at", plannedAt)
    .then(
      () => null,
      () => null,
    );
}

/** Het openstaande verzoek van een lid, of null als er niets ligt. */
export async function loadPendingReplan(
  admin: Admin,
  profileId: string,
): Promise<PendingReplan | null> {
  const { data } = await admin
    .from("training_replan_requests")
    .select("reason, requested_at")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!data) return null;
  return { reason: String(data.reason), requestedAt: String(data.requested_at) };
}

/**
 * Is de beschikbaarheid gewijzigd nadat het schema die voor het laatst heeft
 * verwerkt?
 *
 * Dit is de terugval naast `training_replan_requests`: voor beschikbaarheid is
 * de wijziging ook achteraf nog zichtbaar, dus een verzoek dat om wat voor reden
 * dan ook niet is vastgelegd (of dateert van vóór 0132) valt hier alsnog op. Voor
 * een afmelding kan dat niet — daar is de rij verdwenen.
 *
 * `planCreatedAt` is het moment waarop het basisplan is gemaakt en
 * `lastPlanUpdateAt` dat van de laatste geslaagde herziening. Een dagaanpassing
 * telt hier bewust niet mee: die laat de verdere toekomst met rust en kan een
 * gewijzigde week dus niet hebben verwerkt.
 *
 * Tijdstempels worden als getal vergeleken, niet als tekst: dezelfde tijd kan in
 * de database met een andere zone-offset zijn opgeslagen en sorteert dan
 * verkeerd.
 */
export function availabilityNeedsReplan(
  changedAt: string | null | undefined,
  planCreatedAt: string,
  lastPlanUpdateAt?: string | null,
): boolean {
  if (!changedAt) return false;
  const changed = Date.parse(changedAt);
  if (!Number.isFinite(changed)) return false;

  const planned = Math.max(
    Date.parse(planCreatedAt) || 0,
    lastPlanUpdateAt ? Date.parse(lastPlanUpdateAt) || 0 : 0,
  );
  return changed > planned;
}
