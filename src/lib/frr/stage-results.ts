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
/** Zo ver terug kijken de cron en Nu verversen. */
const RESULTS_WINDOW_MS = 30 * 3600_000;
/**
 * Een uitslag die zo lang na de start is opgehaald, is compleet: de laatste
 * finishers zijn binnen. Opnieuw ophalen kost alleen verzoeken bij Zwift.
 */
const SETTLED_AFTER_START_MS = 4 * 3600_000;
// Zwift begrenst de uitslag-API streng: drie slots tegelijk gaf op 2026-10-04
// meteen status 429. Daarom één verzoek tegelijk, met een pauze ertussen.
const REQUEST_PAUSE_MS = 300;
/** Wachttijden na een 429, oplopend; daarna geeft de ronde op. */
const RATE_LIMIT_WAITS_MS = [5000, 10000];

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
 * Bij een 429 wachten en opnieuw proberen, steeds langer, zolang dat binnen het
 * tijdbudget past. Het budget geldt per verzoek en niet per slot: een slot is
 * zes verzoeken, en op 2026-10-04 liep Nu verversen daardoor over de limiet van
 * de functie heen.
 */
async function patiently<T>(request: () => Promise<T>, deadline: number): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    if (Date.now() > deadline) throw new OutOfTime();
    try {
      return await request();
    } catch (error) {
      const wait = RATE_LIMIT_WAITS_MS[attempt];
      if (!isRateLimited(error) || wait === undefined || Date.now() + wait > deadline) throw error;
      await pause(wait);
    } finally {
      await pause(REQUEST_PAUSE_MS);
    }
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
 * Welke slots nog opgehaald moeten worden: eerst die zonder uitslag, daarna die
 * waarvan de uitslag is opgehaald terwijl de race nog liep. Een slot dat ruim
 * na de start is opgehaald, is klaar.
 */
export function slotsToFetch<T extends { id: string; start_at: string }>(
  candidates: T[],
  /** Slot-id → tijdstip van de laatst opgeslagen uitslag. */
  lastFetched: Map<string, string>,
): { missing: T[]; unfinished: T[] } {
  const missing: T[] = [];
  const unfinished: T[] = [];
  for (const slot of candidates) {
    const fetched = lastFetched.get(slot.id);
    if (!fetched) missing.push(slot);
    else if (Date.parse(fetched) - Date.parse(slot.start_at) < SETTLED_AFTER_START_MS) {
      unfinished.push(slot);
    }
  }
  return { missing, unfinished };
}

/**
 * Haalt de uitslag op van slots die net gereden zijn. Met `all` van elk gereden
 * slot van de tour, voor de knop Uitslagen ophalen. Slots zonder uitslag gaan
 * voor; wat niet binnen het tijdbudget of de limiet van Zwift past, volgt de
 * volgende ronde. `missing` is het aantal slots dat daarna nog geen uitslag
 * heeft.
 */
export async function syncStageResults(
  admin: SupabaseClient,
  tourId: string,
  options: { now: Date; deadline: number; all?: boolean },
): Promise<{ slots: number; results: number; missing: number; notes: string[] }> {
  if (!zwiftClubConfigured()) {
    return {
      slots: 0,
      results: 0,
      missing: 0,
      notes: ["Geen Zwift-serviceaccount: etappe-uitslagen overgeslagen."],
    };
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
  const lastFetched = new Map<string, string>();
  await Promise.all(
    candidates.map(async (slot) => {
      const { data: latest, error: latestError } = await admin
        .from("frr_stage_results")
        .select("fetched_at")
        .eq("slot_event_id", slot.id)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError) throw new Error(latestError.message);
      if (latest?.fetched_at) lastFetched.set(slot.id, latest.fetched_at as string);
    }),
  );
  const todo = slotsToFetch(candidates, lastFetched);
  const slots = [...todo.missing, ...todo.unfinished];

  const notes: string[] = [];
  let synced = 0;
  let results = 0;
  let missing = todo.missing.length;
  // Alleen melden wat echt ontbreekt; een slot waarvan de race nog loopt, komt
  // de volgende ronde vanzelf weer.
  const stopped = (reason: string) => {
    if (missing > 0) notes.push(`${reason}; nog ${missing} slots zonder uitslag volgen in de volgende ronde.`);
  };
  for (const [index, slot] of slots.entries()) {
    if (Date.now() > options.deadline) {
      stopped("Tijd op");
      break;
    }
    let rows: StageResultRow[];
    try {
      rows = await fetchSlotResults(tourId, slot, new Date().toISOString(), options.deadline);
    } catch (err) {
      // Een half opgehaald slot bewaren we niet: de eerste van een klasse kan
      // in de ontbrekende startgroep zitten.
      if (err instanceof OutOfTime) {
        stopped("Tijd op");
        break;
      }
      if (isRateLimited(err)) {
        stopped("Zwift begrenst het ophalen");
        break;
      }
      // Eén haperend slot mag de rest niet tegenhouden.
      notes.push(err instanceof Error ? err.message : "Etappe-uitslag mislukt.");
      continue;
    }
    if (rows.length === 0) continue;
    if (index < todo.missing.length) missing -= 1;
    const { error: upsertError } = await admin
      .from("frr_stage_results")
      .upsert(rows, { onConflict: "slot_event_id,zwift_id" });
    if (upsertError) throw new Error(upsertError.message);
    synced += 1;
    results += rows.length;
  }
  return { slots: synced, results, missing, notes };
}
