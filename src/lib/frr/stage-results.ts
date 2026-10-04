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
// Zwift begrenst de uitslag-API streng: drie slots tegelijk gaf op 2026-10-04
// meteen status 429. Daarom één verzoek tegelijk, met een pauze ertussen.
const REQUEST_PAUSE_MS = 300;
const RATE_LIMIT_WAIT_MS = 4000;

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

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isRateLimited(error: unknown) {
  return error instanceof Error && /status 429\b/.test(error.message);
}

class OutOfTime extends Error {}

/**
 * Eén keer wachten en opnieuw proberen bij een 429; daarna geeft hij op. Het
 * tijdbudget geldt per verzoek en niet per slot: een slot is zes verzoeken, en
 * op 2026-10-04 liep Nu verversen daardoor over de limiet van de functie heen.
 */
async function patiently<T>(request: () => Promise<T>, deadline: number): Promise<T> {
  if (Date.now() > deadline) throw new OutOfTime();
  try {
    return await request();
  } catch (error) {
    if (!isRateLimited(error) || Date.now() + RATE_LIMIT_WAIT_MS > deadline) throw error;
    await pause(RATE_LIMIT_WAIT_MS);
    return request();
  } finally {
    await pause(REQUEST_PAUSE_MS);
  }
}

async function fetchSlotResults(
  tourId: string,
  slot: SlotRow,
  fetchedAt: string,
  deadline: number,
): Promise<StageResultRow[]> {
  const pens = zwiftEventPens(
    await patiently(() => fetchZwiftEvent(String(slot.zwift_event_id)), deadline),
  );
  const rows = new Map<string, StageResultRow>();
  for (const pen of pens) {
    for (const result of await patiently(() => fetchSubgroupResults(pen.id), deadline)) {
      if (!result.durationMs || result.durationMs <= 0) continue;
      const zwiftId = String(result.profileId);
      if (!/^\d+$/.test(zwiftId) || rows.has(zwiftId)) continue;
      rows.set(zwiftId, {
        slot_event_id: slot.id,
        zwift_id: zwiftId,
        tour_id: tourId,
        stage: slot.frr_stage as number,
        pen: pen.pen,
        time_s: result.durationMs / 1000,
        fetched_at: fetchedAt,
      });
    }
  }
  return [...rows.values()];
}

/**
 * Haalt de uitslag op van slots die net gereden zijn. Met `all` van elk gereden
 * slot van de tour, voor de knop Nu verversen. Slots zonder uitslag gaan voor;
 * wat niet binnen het tijdbudget of de limiet van Zwift past, volgt de
 * volgende ronde.
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

  const candidates = (data ?? []) as SlotRow[];
  const known = await Promise.all(
    candidates.map(async (slot) => {
      const { count, error: countError } = await admin
        .from("frr_stage_results")
        .select("zwift_id", { count: "exact", head: true })
        .eq("slot_event_id", slot.id);
      if (countError) throw new Error(countError.message);
      return (count ?? 0) > 0;
    }),
  );
  const slots = [
    ...candidates.filter((_, index) => !known[index]),
    // Een slot met uitslag alleen verversen zolang er nog finishers bij komen.
    ...candidates.filter(
      (slot, index) => known[index] && now - Date.parse(slot.start_at) <= RESULTS_WINDOW_MS,
    ),
  ];

  const notes: string[] = [];
  let synced = 0;
  let results = 0;
  for (const [index, slot] of slots.entries()) {
    const left = slots.length - index;
    const outOfTime = `Tijd op; nog ${left} slots met etappe-uitslag volgen in de volgende ronde.`;
    if (Date.now() > options.deadline) {
      notes.push(outOfTime);
      break;
    }
    let rows: StageResultRow[];
    try {
      rows = await fetchSlotResults(tourId, slot, new Date().toISOString(), options.deadline);
    } catch (err) {
      // Een half opgehaald slot bewaren we niet: de eerste van een klasse kan
      // in de ontbrekende startgroep zitten.
      if (err instanceof OutOfTime) {
        notes.push(outOfTime);
        break;
      }
      if (isRateLimited(err)) {
        notes.push(`Zwift begrenst het ophalen; nog ${left} slots volgen in de volgende ronde.`);
        break;
      }
      // Eén haperend slot mag de rest niet tegenhouden.
      notes.push(err instanceof Error ? err.message : "Etappe-uitslag mislukt.");
      continue;
    }
    if (rows.length === 0) continue;
    const { error: upsertError } = await admin
      .from("frr_stage_results")
      .upsert(rows, { onConflict: "slot_event_id,zwift_id" });
    if (upsertError) throw new Error(upsertError.message);
    synced += 1;
    results += rows.length;
  }
  return { slots: synced, results, notes };
}
