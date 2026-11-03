// Het schema past zich aan zodra het lid iets verandert: een rit inplannen, de
// beschikbaarheid van een week bijstellen, een race toezeggen. Dat is dezelfde
// herziening als de knop "Schema bijwerken", maar dan zonder dat het lid er zelf
// om vraagt.
//
// Elke herziening is een AI-generatie en kost geld: ~$0,66 per stuk, 80% van de
// rekening in de eerste week op Claude (docs/claude-kosten-2026-11-03.md). Tot
// november 2026 startte elke wijziging er meteen een, met alleen een demping van
// vijf minuten; één lid kreeg er zo 23 in zes dagen. Nu legt een wijziging alleen
// het verzoek vast in `training_replan_requests` (sinds 0132), en verwerkt de
// dagelijkse cron 's nachts alles van die dag in één herziening. Wat meteen kan,
// gebeurt nog wel meteen en gratis: een dag zonder tijd valt direct vrij
// (fitScheduleToAvailability), een toegezegd event staat direct in het schema.
//
// Alleen een expliciete vraag van het lid (de chat: "dit raakt mijn schema")
// start direct, en ook dan hooguit één herziening per dag.

import type { createAdminClient } from "@/lib/supabase/admin";
import { activeBasePlan } from "@/lib/training/active-plan";
import { buildComplianceContext, planIsBeingIgnored } from "@/lib/training/compliance";
import { finishAiGeneration, planUpdateRunning, startPlanUpdate } from "@/lib/training/draft";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { amsterdamWallTimeToIso } from "@/lib/birthdays";

type Admin = ReturnType<typeof createAdminClient>;

export type ReplanResult =
  | { started: true; generationId: string }
  | {
      started: false;
      /**
       * `scheduled`: vastgelegd, gaat vannacht mee. `cooldown`: er loopt al een
       * herziening; het verzoek gaat mee met de volgende.
       */
      reason: "no_plan" | "scheduled" | "cooldown" | "ignored" | "failed";
      error?: string;
    };

/** Heeft dit lid vandaag (Amsterdamse dag) al een herziening gehad? */
async function plannedUpdateToday(admin: Admin, profileId: string) {
  const today = amsterdamDayKey();
  const dayStart = amsterdamWallTimeToIso(today, "00:00") ?? `${today}T00:00:00.000Z`;
  const { data } = await admin
    .from("training_ai_generations")
    .select("id")
    .eq("profile_id", profileId)
    .eq("adaptation_kind", "plan_update")
    .in("status", ["queued", "in_progress", "completed"])
    .gte("created_at", dayStart)
    .limit(1);
  return (data ?? []).length > 0;
}

/**
 * Rijdt dit lid zijn schema nog? Wordt op twee plekken gebruikt — hier vóór een
 * herziening, en op de schemapagina om het lid de vraag te stellen — dus de
 * uitkomst moet op beide plekken hetzelfde zijn.
 */
export async function planIsIgnored(admin: Admin, profileId: string): Promise<boolean> {
  const compliance = await buildComplianceContext(admin, profileId).catch(() => null);
  if (!compliance) return false;
  return planIsBeingIgnored(compliance.workouts);
}

/**
 * Vraag een herziening van het resterende schema aan. Standaard wordt die alleen
 * vastgelegd voor de cron van vannacht (`scheduled`). Met `now` start hij direct,
 * tenzij het lid vandaag al een herziening had of er een loopt; dan gaat hij ook
 * vannacht mee.
 */
export async function requestReplan(
  admin: Admin,
  profileId: string,
  reason: string,
  options: { now?: boolean } = {},
): Promise<ReplanResult> {
  try {
    const plan = await activeBasePlan(admin, profileId);
    // Zonder schema valt er niets te herzien, ook niet bij de volgende run: dan zou er een
    // verzoek blijven staan waar nooit iemand iets mee doet.
    if (!plan) return { started: false, reason: "no_plan" };

    // Eerst vastleggen, dan pas proberen. Gaat de generatie hierna niet door of
    // komt er niets uit, dan staat het verzoek er nog en pakt de dagelijkse cron het
    // op. Slaagt hij wel, dan haalt createPlanFromAiGeneration() de rij weg.
    await markReplanPending(admin, profileId, reason);

    // Ligt het schema stil, dan is herzien geen dienst maar ruis: het lid krijgt
    // een nieuwe versie van iets dat het toch niet rijdt. Het verzoek blijft
    // staan, dus zodra er weer gereden wordt gaat het alsnog door.
    if (await planIsIgnored(admin, profileId)) {
      return { started: false, reason: "ignored" };
    }

    if (!options.now) return { started: false, reason: "scheduled" };

    // Loopt er nog een herziening, dan gaat het verzoek mee met de volgende.
    // Zonder deze regel kwam startPlanUpdate() met "er wordt al een schema
    // gemaakt" terug en las het lid in de chat dat de herziening niet kon
    // starten (13 oktober 2026).
    if (await planUpdateRunning(admin, profileId)) {
      return { started: false, reason: "cooldown" };
    }
    if (await plannedUpdateToday(admin, profileId)) {
      return { started: false, reason: "scheduled" };
    }

    const result = await startPlanUpdate({
      admin,
      planId: plan.id,
      actorId: profileId,
      // Alles wat vandaag al lag gaat mee, niet alleen dit bericht.
      reason: (await loadPendingReplan(admin, profileId).catch(() => null))?.reason ?? reason,
      rollingWindow: true,
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

/** Ouder dan dit maakt de nachtelijke cron een generatie af of sluit hij hem. */
const SETTLE_MAX_AGE_MS = 6 * 3600_000;

/**
 * Zelfherstel bij het openen van het schema: een hangende generatie afmaken.
 *
 * Een achtergrondgeneratie werd pas een schema als de browser van het lid hem
 * ophaalde terwijl de pagina openstond. Zo bleef Stijns herziening van
 * 11 september 09:35 op 'in_progress' staan en zag hij zijn gewijzigde
 * beschikbaarheid niet terug. Nu maakt elk bezoek een hangende generatie af.
 *
 * Een blijven liggend verzoek start dit bewust niet meer: dat deed het tot
 * november 2026, en zo werd elk paginabezoek na een wijziging een betaalde
 * herziening. Verzoeken gaan 's nachts, via de cron.
 */
export async function settleOwnReplans(admin: Admin, profileId: string): Promise<void> {
  const since = new Date(Date.now() - SETTLE_MAX_AGE_MS).toISOString();
  const { data: pending } = await admin
    .from("training_ai_generations")
    .select("id")
    .eq("profile_id", profileId)
    .in("status", ["queued", "in_progress"])
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(2);

  for (const row of pending ?? []) {
    await finishAiGeneration(admin, row.id as string).catch(() => null);
  }
}

export type PendingReplan = {
  reason: string;
  requestedAt: string;
};

/** Hoeveel redenen een gebundeld verzoek hoogstens meedraagt. */
const MAX_REASONS = 6;

/**
 * Voegt een reden toe aan wat er al lag: de nieuwste onderaan, dubbele eruit,
 * hoogstens MAX_REASONS. De herziening van vannacht moet alle wijzigingen van de
 * dag kennen, niet alleen de laatste.
 */
export function combineReasons(existing: string | null | undefined, reason: string): string {
  const next = reason.trim();
  const lines = (existing ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== next);
  return [...lines, next].slice(-MAX_REASONS).join("\n");
}

/**
 * Leg vast dat het schema van dit lid herzien moet worden. Eén rij per lid: alle
 * wijzigingen van een dag horen samen één herziening op te leveren, dus de
 * redenen worden gebundeld (combineReasons).
 */
export async function markReplanPending(admin: Admin, profileId: string, reason: string) {
  // Niet kritiek genoeg om de actie van het lid op te laten klappen: zijn
  // wijziging is al opgeslagen, alleen het vangnet ontbreekt dan.
  const existing = await loadPendingReplan(admin, profileId).catch(() => null);
  await admin
    .from("training_replan_requests")
    .upsert(
      {
        profile_id: profileId,
        reason: combineReasons(existing?.reason, reason),
        requested_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    )
    .then(
      () => null,
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
