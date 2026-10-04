// Houdt lopende FRR-tours bij: tijdsloten uit de Zwift-feed, inschrijvingen per
// slot en het klassement van flammerougeracing.com. Gedeeld door de cron
// (/api/frr/sync) en de knop op /beheer/frr-kalender.
//
// De Zwift-inschrijving is voor FRR de waarheid: wie in een slot staat, krijgt
// daar een "ja". Wie van slot wisselt, verliest zijn "ja" op het oude slot van
// dezelfde etappe, maar alleen als dat slot in deze ronde ook is opgehaald.

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchEntrants, zwiftClubConfigured } from "@/lib/events/zwift-club";
import {
  FRR_TOUR_COLUMNS,
  importFrrTour,
  type FrrTourRow,
} from "@/lib/frr/import";
import { fetchFrrGcRows, gcTourCodes, latestGcStage } from "@/lib/frr/gc";
import { amsterdamDay } from "@/lib/frr/feed";
import { syncStageResults } from "@/lib/frr/stage-results";

export const FRR_SYNC_BUDGET_MS = 20000;
const ENTRANTS_HORIZON_MS = 36 * 3600_000;
const GC_INTERVAL_MS = 3 * 3600_000;
/** Na de start van het eerste slot duurt het even voor FRR een uitslag heeft. */
const GC_AFTER_START_MS = 2 * 3600_000;
// De etappe-uitslagen komen als laatste en krijgen altijd eigen tijd: anders
// blijft er na inschrijvingen en klassement te weinig over voor één slot en
// komt de sync nooit verder (gebeurd op 2026-10-04). Samen met het budget blijft
// dit onder de 30 seconden van de route en de beheerpagina.
const STAGE_RESULTS_MIN_MS = 10_000;
const STAGE_RESULTS_OVERRUN_MS = 8_000;

export type FrrTourSyncResult = {
  tour: string;
  stagesCreated: number;
  slotsCreated: number;
  updated: number;
  slotsSynced: number;
  entrants: number;
  /** Finishtijden uit Zwift, voor het voorlopige klassement (migr. 0215). */
  stageResults: number;
  gcStage: number | null;
  notes: string[];
  error: string | null;
};

type SlotRow = {
  id: string;
  start_at: string;
  zwift_event_id: number | string | null;
  frr_stage: number | null;
};

/** Tours waarvan vandaag binnen [start − 2 dagen, eind + 2 dagen] valt. */
export function isActiveTour(
  tour: Pick<FrrTourRow, "starts_on" | "ends_on">,
  now: Date,
) {
  const today = amsterdamDay(now.toISOString());
  const shift = (day: string, days: number) =>
    new Date(Date.parse(`${day}T12:00:00Z`) + days * 86400_000).toISOString().slice(0, 10);
  if (tour.starts_on && today < shift(tour.starts_on, -2)) return false;
  if (tour.ends_on && today > shift(tour.ends_on, 2)) return false;
  return true;
}

async function memberZwiftIndex(admin: SupabaseClient) {
  const { data } = await admin.from("profiles").select("id, zwift_id").not("zwift_id", "is", null);
  const byZwift = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ id: string; zwift_id: string | null }>) {
    const id = row.zwift_id?.trim();
    if (id) byZwift.set(id, row.id);
  }
  return byZwift;
}

async function syncEntrants(
  admin: SupabaseClient,
  tourId: string,
  subgroupsByZwiftEvent: Map<number, Array<{ id: string; label: string }>>,
  now: Date,
  deadline: number,
): Promise<{ slots: number; entrants: number; notes: string[] }> {
  const notes: string[] = [];
  if (!zwiftClubConfigured()) {
    return { slots: 0, entrants: 0, notes: ["Geen Zwift-serviceaccount: inschrijvingen overgeslagen."] };
  }
  const { data, error } = await admin
    .from("events")
    .select("id, start_at, zwift_event_id, frr_stage")
    .eq("frr_tour_id", tourId)
    .not("zwift_event_id", "is", null)
    .gte("start_at", new Date(now.getTime() - 15 * 60_000).toISOString())
    .lte("start_at", new Date(now.getTime() + ENTRANTS_HORIZON_MS).toISOString())
    .order("start_at");
  if (error) throw new Error(error.message);

  const members = await memberZwiftIndex(admin);
  const synced = new Map<string, { stage: number | null; profiles: Set<string> }>();
  let entrants = 0;

  for (const slot of (data ?? []) as SlotRow[]) {
    if (Date.now() > deadline) {
      notes.push("Tijd op; de overige slots volgen in de volgende ronde.");
      break;
    }
    const subgroups = subgroupsByZwiftEvent.get(Number(slot.zwift_event_id)) ?? [];
    if (subgroups.length === 0) continue;

    const perGroup = await Promise.all(
      subgroups.map(async (group) =>
        (await fetchEntrants([group.id])).map((entrant) => ({ ...entrant, label: group.label })),
      ),
    );
    const syncedAt = new Date().toISOString();
    const rows = new Map<string, Record<string, unknown>>();
    for (const entrant of perGroup.flat()) {
      if (!/^\d+$/.test(entrant.zwiftId) || rows.has(entrant.zwiftId)) continue;
      rows.set(entrant.zwiftId, {
        event_id: slot.id,
        zwift_id: entrant.zwiftId,
        name: entrant.name,
        subgroup_label: entrant.label || null,
        profile_id: members.get(entrant.zwiftId) ?? null,
        synced_at: syncedAt,
      });
    }

    const { error: deleteError } = await admin
      .from("frr_slot_entrants")
      .delete()
      .eq("event_id", slot.id);
    if (deleteError) throw new Error(deleteError.message);
    if (rows.size > 0) {
      const { error: insertError } = await admin
        .from("frr_slot_entrants")
        .insert([...rows.values()]);
      if (insertError) throw new Error(insertError.message);
    }
    entrants += rows.size;

    const profiles = new Set(
      [...rows.values()].map((row) => row.profile_id).filter(Boolean) as string[],
    );
    synced.set(slot.id, { stage: slot.frr_stage, profiles });
    if (profiles.size > 0) {
      await admin.from("event_rsvps").upsert(
        [...profiles].map((profileId) => ({
          event_id: slot.id,
          profile_id: profileId,
          status: "yes",
          updated_at: syncedAt,
        })),
        { onConflict: "event_id,profile_id", ignoreDuplicates: true },
      );
    }
  }

  // Van slot gewisseld: de "ja" op het oude slot van dezelfde etappe weg.
  for (const [slotId, slot] of synced) {
    const siblings = [...synced.entries()].filter(
      ([otherId, other]) => otherId !== slotId && other.stage === slot.stage,
    );
    for (const profileId of slot.profiles) {
      const stale = siblings
        .filter(([, other]) => !other.profiles.has(profileId))
        .map(([otherId]) => otherId);
      if (stale.length === 0) continue;
      await admin
        .from("event_rsvps")
        .delete()
        .eq("profile_id", profileId)
        .eq("status", "yes")
        .in("event_id", stale);
    }
  }

  return { slots: synced.size, entrants, notes };
}

async function syncGc(
  admin: SupabaseClient,
  tour: FrrTourRow,
  now: Date,
  deadline: number,
  force: boolean,
): Promise<{ stage: number | null; note: string | null }> {
  if (!force && tour.gc_scraped_at && now.getTime() - Date.parse(tour.gc_scraped_at) < GC_INTERVAL_MS) {
    return { stage: tour.gc_after_stage, note: null };
  }
  // Pas ophalen als er een slot gereden is: vóór de tour staat er alleen het
  // klassement van de vorige.
  const { data: started } = await admin
    .from("events")
    .select("id")
    .eq("frr_tour_id", tour.id)
    .not("zwift_event_id", "is", null)
    .lte("start_at", new Date(now.getTime() - GC_AFTER_START_MS).toISOString())
    .limit(1);
  if (!force && (started ?? []).length === 0) return { stage: tour.gc_after_stage, note: null };

  const rows = await fetchFrrGcRows({ deadline });
  const codes = gcTourCodes(rows);
  if (!tour.gc_code) {
    const error = `Nog geen GC-code ingesteld. In de tabel: ${codes.join(", ") || "niets"}.`;
    await admin.from("frr_tours").update({ gc_error: error }).eq("id", tour.id);
    return { stage: null, note: error };
  }
  const latest = latestGcStage(rows, tour.gc_code);
  if (!latest) {
    const error = `Geen rijen voor ${tour.gc_code}; gevonden: ${codes.join(", ") || "niets"}.`;
    await admin.from("frr_tours").update({ gc_error: error }).eq("id", tour.id);
    return { stage: null, note: error };
  }
  const { error } = await admin.rpc("frr_replace_gc", {
    p_tour_id: tour.id,
    p_after_stage: latest.stage,
    p_rows: latest.rows.map((row) => ({
      gender_class: row.genderClass,
      class_code: row.classCode,
      gender: row.gender,
      zwift_id: row.zwiftId,
      position: row.position,
      name: row.name,
      club: row.club,
      age_cat: row.ageCat,
      stages_ridden: row.stagesRidden,
      tour_time_s: row.tourTimeS,
      egap_s: row.egapS,
      penalty_s: row.penaltyS,
    })),
  });
  if (error) throw new Error(error.message);
  return { stage: latest.stage, note: `Klassement na etappe ${latest.stage}: ${latest.rows.length} renners.` };
}

/** Minstens tien seconden voor de uitslagen, maar nooit ver over het budget heen. */
export function stageResultsDeadline(deadline: number, nowMs: number) {
  return Math.min(
    deadline + STAGE_RESULTS_OVERRUN_MS,
    Math.max(deadline, nowMs + STAGE_RESULTS_MIN_MS),
  );
}

export async function syncFrrTour(
  admin: SupabaseClient,
  tour: FrrTourRow,
  options: { now?: Date; deadline?: number; force?: boolean; createdBy?: string | null } = {},
): Promise<FrrTourSyncResult> {
  const now = options.now ?? new Date();
  const deadline = options.deadline ?? Date.now() + FRR_SYNC_BUDGET_MS;
  const result: FrrTourSyncResult = {
    tour: tour.name,
    stagesCreated: 0,
    slotsCreated: 0,
    updated: 0,
    slotsSynced: 0,
    entrants: 0,
    stageResults: 0,
    gcStage: tour.gc_after_stage,
    notes: [],
    error: null,
  };

  try {
    const imported = await importFrrTour(admin, tour, { createdBy: options.createdBy });
    result.stagesCreated = imported.stagesCreated;
    result.slotsCreated = imported.slotsCreated;
    result.updated = imported.updated;
    result.notes.push(...imported.warnings);

    const entrants = await syncEntrants(admin, tour.id, imported.subgroupsByZwiftEvent, now, deadline);
    result.slotsSynced = entrants.slots;
    result.entrants = entrants.entrants;
    result.notes.push(...entrants.notes);
  } catch (err) {
    result.error = err instanceof Error ? err.message : "FRR-sync mislukt.";
  }
  await admin
    .from("frr_tours")
    .update({ synced_at: new Date().toISOString(), sync_error: result.error })
    .eq("id", tour.id);

  try {
    const gc = await syncGc(admin, tour, now, deadline, Boolean(options.force));
    result.gcStage = gc.stage;
    if (gc.note) result.notes.push(gc.note);
  } catch (err) {
    const message = err instanceof Error ? err.message : "FRR-klassement mislukt.";
    await admin.from("frr_tours").update({ gc_error: message }).eq("id", tour.id);
    result.notes.push(message);
  }
  // Als laatste: de uitslagen gaan één voor één en zouden anders het klassement
  // verdringen (gebeurd op 2026-10-04: "tijd op voordat de tabel binnen was").
  // Zonder migratie 0215 of bij een storing van Zwift blijft de rest werken.
  try {
    const stage = await syncStageResults(admin, tour.id, {
      now,
      deadline: stageResultsDeadline(deadline, Date.now()),
      all: Boolean(options.force),
    });
    result.stageResults = stage.results;
    if (stage.slots > 0) {
      result.notes.push(`${stage.results} finishtijden uit ${stage.slots} slots.`);
    }
    result.notes.push(...stage.notes);
  } catch (err) {
    result.notes.push(err instanceof Error ? err.message : "Etappe-uitslagen mislukt.");
  }

  return result;
}

/** Alle lopende tours, zolang het tijdbudget het toelaat. */
export async function syncActiveFrrTours(
  admin: SupabaseClient,
  options: { now?: Date; budgetMs?: number } = {},
): Promise<FrrTourSyncResult[]> {
  const now = options.now ?? new Date();
  const deadline = Date.now() + (options.budgetMs ?? FRR_SYNC_BUDGET_MS);
  const { data, error } = await admin.from("frr_tours").select(FRR_TOUR_COLUMNS);
  if (error) throw new Error(error.message);
  const results: FrrTourSyncResult[] = [];
  for (const tour of (data ?? []) as FrrTourRow[]) {
    if (!isActiveTour(tour, now)) continue;
    if (Date.now() > deadline) break;
    results.push(await syncFrrTour(admin, tour, { now, deadline }));
  }
  return results;
}
