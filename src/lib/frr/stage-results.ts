// Finishtijden per FRR-tijdslot uit Zwift (migr. 0215), voor het voorlopige
// klassement. Het serviceaccount leest de uitslag per startgroep; ZwiftPower
// blijft een link.
//
// Een gereden slot staat niet meer in de feed van Zwift, dus de startgroepen
// komen uit het event zelf.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchSubgroupResults,
  fetchZwiftEvent,
  zwiftClubConfigured,
} from "@/lib/events/zwift-club";

/** Voor de eerste finishers binnen zijn heeft ophalen geen zin. */
const RESULTS_AFTER_START_MS = 45 * 60_000;
/** Zo lang na de start komen er nog finishers en correcties bij. */
const RESULTS_WINDOW_MS = 30 * 3600_000;
const SLOTS_AT_ONCE = 3;

type SlotRow = {
  id: string;
  start_at: string;
  zwift_event_id: number | string | null;
  frr_stage: number | null;
};

export type StageResultRow = {
  slot_event_id: string;
  zwift_id: string;
  tour_id: string;
  stage: number;
  pen: string | null;
  time_s: number;
  fetched_at: string;
};

/** De startgroepen van een Zwift-event: id en letter. */
export function zwiftEventPens(event: unknown): Array<{ id: string; pen: string | null }> {
  const rows = ((event as { eventSubgroups?: unknown[] } | null)?.eventSubgroups ?? []) as Array<
    Record<string, unknown>
  >;
  return rows.flatMap((row) => {
    const id = String(row.id ?? "");
    if (!/^\d+$/.test(id)) return [];
    const pen = String(row.subgroupLabel ?? "").trim();
    return [{ id, pen: pen || null }];
  });
}

async function fetchSlotResults(
  tourId: string,
  slot: SlotRow,
  fetchedAt: string,
): Promise<StageResultRow[]> {
  const pens = zwiftEventPens(await fetchZwiftEvent(String(slot.zwift_event_id)));
  const perPen = await Promise.all(
    pens.map(async (pen) => ({ pen: pen.pen, results: await fetchSubgroupResults(pen.id) })),
  );
  const rows = new Map<string, StageResultRow>();
  for (const { pen, results } of perPen) {
    for (const result of results) {
      if (!result.durationMs || result.durationMs <= 0) continue;
      const zwiftId = String(result.profileId);
      if (!/^\d+$/.test(zwiftId) || rows.has(zwiftId)) continue;
      rows.set(zwiftId, {
        slot_event_id: slot.id,
        zwift_id: zwiftId,
        tour_id: tourId,
        stage: slot.frr_stage as number,
        pen,
        time_s: result.durationMs / 1000,
        fetched_at: fetchedAt,
      });
    }
  }
  return [...rows.values()];
}

/**
 * Haalt de uitslag op van slots die net gereden zijn. Met `all` van elk gereden
 * slot van de tour, voor de knop Nu verversen.
 */
export async function syncStageResults(
  admin: SupabaseClient,
  tourId: string,
  options: { now: Date; deadline: number; all?: boolean },
): Promise<{ slots: number; results: number; notes: string[] }> {
  if (!zwiftClubConfigured()) {
    return { slots: 0, results: 0, notes: ["Geen Zwift-serviceaccount: etappe-uitslagen overgeslagen."] };
  }
  const now = options.now.getTime();
  let query = admin
    .from("events")
    .select("id, start_at, zwift_event_id, frr_stage")
    .eq("frr_tour_id", tourId)
    .not("zwift_event_id", "is", null)
    .not("frr_stage", "is", null)
    .lte("start_at", new Date(now - RESULTS_AFTER_START_MS).toISOString())
    .order("start_at", { ascending: false });
  if (!options.all) {
    query = query.gte("start_at", new Date(now - RESULTS_WINDOW_MS).toISOString());
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let slots = (data ?? []) as SlotRow[];
  if (options.all) {
    // Slots zonder uitslag eerst, anders komt een lange tour nooit rond binnen
    // het tijdbudget.
    const known = await Promise.all(
      slots.map(async (slot) => {
        const { count } = await admin
          .from("frr_stage_results")
          .select("zwift_id", { count: "exact", head: true })
          .eq("slot_event_id", slot.id);
        return (count ?? 0) > 0;
      }),
    );
    slots = [...slots.filter((_, index) => !known[index]), ...slots.filter((_, index) => known[index])];
  }
  const notes: string[] = [];
  let synced = 0;
  let results = 0;
  for (let index = 0; index < slots.length; index += SLOTS_AT_ONCE) {
    if (Date.now() > options.deadline) {
      notes.push("Tijd op; de overige etappe-uitslagen volgen in de volgende ronde.");
      break;
    }
    const fetchedAt = new Date().toISOString();
    const batch = await Promise.allSettled(
      slots
        .slice(index, index + SLOTS_AT_ONCE)
        .map((slot) => fetchSlotResults(tourId, slot, fetchedAt)),
    );
    for (const outcome of batch) {
      // Eén haperend slot mag de rest niet tegenhouden.
      if (outcome.status === "rejected") {
        notes.push(
          outcome.reason instanceof Error ? outcome.reason.message : "Etappe-uitslag mislukt.",
        );
        continue;
      }
      if (outcome.value.length === 0) continue;
      const { error: upsertError } = await admin
        .from("frr_stage_results")
        .upsert(outcome.value, { onConflict: "slot_event_id,zwift_id" });
      if (upsertError) throw new Error(upsertError.message);
      synced += 1;
      results += outcome.value.length;
    }
  }
  return { slots: synced, results, notes };
}
