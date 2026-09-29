// Zet een FRR-tour in de kalender: een tourevent, daaronder per etappe een
// event, en daaronder per tijdslot een event (migr. 0195 en 0196). Gedeeld door
// de beheeractie en de cron.
//
// Idempotent. De tour wordt herkend aan tour zonder etappenummer, een etappe
// aan tour en nummer, een slot aan zijn Zwift-event-id. Opnieuw draaien vult
// aan en werkt starttijden bij; het verwijdert nooit iets, want gereden slots
// vallen uit de feed van Zwift.

import type { SupabaseClient } from "@supabase/supabase-js";
import { safeFetch } from "@/lib/net/safe-fetch";
import { zwiftEventUrl, type ZwiftEventApiRow } from "@/lib/events/external-scan";
import {
  eventRouteTotals,
  ZWIFT_PUBLIC_EVENT_BASE,
  type ZwiftSubgroupStart,
} from "@/lib/events/zwift-route";
import {
  amsterdamDay,
  FRR_TAG_PATTERN,
  frrSlotLabel,
  frrSlotTitle,
  frrStageTitle,
  frrTourTitle,
  groupFrrFeed,
  isGeneratedFrrTitle,
  type FrrStage,
} from "@/lib/frr/feed";

export const FRR_TOURS_PAGE_URL = "https://flammerougeracing.com/tours/";

export type FrrTourRow = {
  id: string;
  name: string;
  zwift_tag: string;
  gc_code: string | null;
  starts_on: string | null;
  ends_on: string | null;
  gc_after_stage: number | null;
  gc_scraped_at: string | null;
  gc_error: string | null;
  synced_at: string | null;
  sync_error: string | null;
  created_by: string | null;
};

export const FRR_TOUR_COLUMNS =
  "id, name, zwift_tag, gc_code, starts_on, ends_on, gc_after_stage, gc_scraped_at, gc_error, synced_at, sync_error, created_by";

/** Alle komende tijdsloten van een tour, via de publieke Zwift-API. */
export async function fetchFrrFeed(tag: string): Promise<ZwiftEventApiRow[]> {
  if (!FRR_TAG_PATTERN.test(tag)) throw new Error("Ongeldige FRR-tag.");
  const url = new URL(`${ZWIFT_PUBLIC_EVENT_BASE}/upcoming`);
  url.searchParams.set("limit", "200");
  url.searchParams.set("tags", tag);
  const response = await safeFetch(url.toString(), {
    cache: "no-store",
    // Zonder dit geeft Zwift protobuf terug.
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Zwift gaf status ${response.status}.`);
  const payload = await response.json();
  return Array.isArray(payload) ? (payload as ZwiftEventApiRow[]) : [];
}

export type FrrImportResult = {
  stagesCreated: number;
  slotsCreated: number;
  updated: number;
  slotsInFeed: number;
  warnings: string[];
  /** Zwift-event-id → subgroepen, voor de inschrijvingen-sync. */
  subgroupsByZwiftEvent: Map<number, ZwiftSubgroupStart[]>;
};

const EVENT_COLUMNS =
  "id, title, description, start_at, parent_event_id, zwift_event_id, frr_tour_id, frr_stage";

type ExistingEvent = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  parent_event_id: string | null;
  zwift_event_id: number | string | null;
  frr_tour_id: string | null;
  frr_stage: number | null;
};

/** Registreert de routes, zodat de foreign key van events.zwift_route_id houdt. */
async function registerRoutes(admin: SupabaseClient, stages: FrrStage[]) {
  const routes = new Map<number, NonNullable<FrrStage["slots"][number]["info"]["route"]>>();
  for (const stage of stages) {
    for (const slot of stage.slots) {
      if (slot.info.route) routes.set(slot.info.route.routeId, slot.info.route);
    }
  }
  if (routes.size === 0) return new Set<number>();
  const { error } = await admin.from("zwift_routes").upsert(
    [...routes.values()].map((route) => ({
      route_id: route.routeId,
      slug: route.slug,
      name: route.name,
      world: route.world,
      strava_segment_id: route.stravaSegmentId,
    })),
    { onConflict: "route_id", ignoreDuplicates: true },
  );
  return error ? new Set<number>() : new Set(routes.keys());
}

export async function importFrrTour(
  admin: SupabaseClient,
  tour: Pick<FrrTourRow, "id" | "name" | "zwift_tag" | "starts_on" | "ends_on" | "created_by">,
  options: { createdBy?: string | null; rows?: ZwiftEventApiRow[] } = {},
): Promise<FrrImportResult> {
  const rows = options.rows ?? (await fetchFrrFeed(tour.zwift_tag));
  const feed = groupFrrFeed(rows);
  const warnings = [...feed.warnings];
  if (feed.unrecognised.length > 0) {
    warnings.push(`Niet herkend: ${feed.unrecognised.slice(0, 3).join(", ")}.`);
  }
  const subgroupsByZwiftEvent = new Map<number, ZwiftSubgroupStart[]>();
  for (const stage of feed.stages) {
    for (const slot of stage.slots) {
      subgroupsByZwiftEvent.set(slot.zwiftEventId, slot.info.subgroups);
    }
  }
  const result: FrrImportResult = {
    stagesCreated: 0,
    slotsCreated: 0,
    updated: 0,
    slotsInFeed: subgroupsByZwiftEvent.size,
    warnings,
    subgroupsByZwiftEvent,
  };
  if (feed.stages.length === 0) return result;
  // Een event heeft altijd een maker; bij de cron is dat wie de tour toevoegde.
  const createdBy = options.createdBy ?? tour.created_by;
  if (!createdBy) throw new Error("De tour heeft geen beheerder als maker.");

  const knownRoutes = await registerRoutes(admin, feed.stages);
  const zwiftIds = [...subgroupsByZwiftEvent.keys()];
  const [{ data: ofTour, error: tourError }, { data: byZwift, error: zwiftError }] =
    await Promise.all([
      admin
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("frr_tour_id", tour.id),
      admin
        .from("events")
        .select(EVENT_COLUMNS)
        .in("zwift_event_id", zwiftIds),
    ]);
  if (tourError) throw new Error(tourError.message);
  if (zwiftError) throw new Error(zwiftError.message);

  const existing = new Map<string, ExistingEvent>();
  for (const row of [...(ofTour ?? []), ...(byZwift ?? [])] as ExistingEvent[]) {
    existing.set(row.id, row);
  }
  // Binnen een tour (migr. 0196): tourevent zonder etappenummer, etappe met
  // nummer, tijdslot met Zwift-event-id.
  let tourEvent: ExistingEvent | null = null;
  const stageByNumber = new Map<number, ExistingEvent>();
  const slotByZwift = new Map<number, ExistingEvent>();
  for (const row of existing.values()) {
    if (row.zwift_event_id != null) {
      slotByZwift.set(Number(row.zwift_event_id), row);
    } else if (row.frr_tour_id === tour.id && row.frr_stage) {
      stageByNumber.set(row.frr_stage, row);
    } else if (row.frr_tour_id === tour.id) {
      tourEvent = row;
    }
  }

  // 1. Het tourevent: één regel in de kalender, met de etappes eronder.
  const tourTitle = frrTourTitle(tour.name);
  if (!tourEvent) {
    const { data, error } = await admin
      .from("events")
      .insert({
        type: "flamme_rouge",
        title: tourTitle,
        start_at: feed.stages[0].slots[0].startAt,
        external_url: FRR_TOURS_PAGE_URL,
        frr_tour_id: tour.id,
        created_by: createdBy,
      })
      .select(EVENT_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    tourEvent = data as ExistingEvent;
  }
  const stageStarts: string[] = [];

  for (const stage of feed.stages) {
    const first = stage.slots[0];
    const totals = eventRouteTotals(first.info);
    const routeId =
      first.info.routeId !== null && knownRoutes.has(first.info.routeId)
        ? first.info.routeId
        : null;
    const stageTitle = frrStageTitle(tour.name, stage.stage, stage.suffix);
    const route = {
      zwift_route_id: routeId,
      laps: totals?.laps ?? first.info.laps,
      distance_km: totals ? Math.round(totals.distanceKm * 10) / 10 : first.info.distanceKm,
      elevation_m: totals?.elevationM ?? null,
    };

    // 2. De etappe onder de tour.
    let stageEvent = stageByNumber.get(stage.stage);
    if (!stageEvent) {
      const { data, error } = await admin
        .from("events")
        .insert({
          type: "flamme_rouge",
          title: stageTitle,
          start_at: first.startAt,
          parent_event_id: tourEvent.id,
          external_url: FRR_TOURS_PAGE_URL,
          frr_tour_id: tour.id,
          frr_stage: stage.stage,
          ...route,
          created_by: createdBy,
        })
        .select(EVENT_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      stageEvent = data as ExistingEvent;
      stageByNumber.set(stage.stage, stageEvent);
      result.stagesCreated += 1;
    }

    // 3. De tijdsloten onder de etappe.
    const starts: string[] = stage.slots.map((slot) => slot.startAt);
    for (const row of existing.values()) {
      if (row.parent_event_id === stageEvent.id) starts.push(new Date(row.start_at).toISOString());
    }
    starts.sort();
    const stageDay = amsterdamDay(starts[0]);
    stageStarts.push(starts[0]);

    for (const slot of stage.slots) {
      const title = frrSlotTitle(
        tour.name,
        stage.stage,
        stage.suffix,
        frrSlotLabel(slot.startAt, stageDay),
      );
      const known = slotByZwift.get(slot.zwiftEventId);
      if (!known) {
        const { error } = await admin.from("events").insert({
          type: "flamme_rouge",
          title,
          start_at: slot.startAt,
          parent_event_id: stageEvent.id,
          frr_tour_id: tour.id,
          frr_stage: stage.stage,
          zwift_event_id: slot.zwiftEventId,
          external_url: zwiftEventUrl(slot.zwiftEventId),
          zwift_event_type: slot.info.eventType,
          zwift_rules: slot.info.rules,
          zwift_tags: slot.info.tags,
          ...route,
          created_by: createdBy,
        });
        if (error) throw new Error(error.message);
        result.slotsCreated += 1;
        continue;
      }
      const update: Record<string, unknown> = {};
      if (new Date(known.start_at).toISOString() !== slot.startAt) update.start_at = slot.startAt;
      if (known.title !== title && isGeneratedFrrTitle(known.title)) update.title = title;
      if (known.parent_event_id !== stageEvent.id) update.parent_event_id = stageEvent.id;
      if (known.frr_tour_id !== tour.id) update.frr_tour_id = tour.id;
      if (known.frr_stage !== stage.stage) update.frr_stage = stage.stage;
      if (Object.keys(update).length === 0) continue;
      const { error } = await admin.from("events").update(update).eq("id", known.id);
      if (error) throw new Error(error.message);
      result.updated += 1;
    }

    const stageUpdate: Record<string, unknown> = {};
    if (new Date(stageEvent.start_at).toISOString() !== starts[0]) stageUpdate.start_at = starts[0];
    if (stageEvent.title !== stageTitle && isGeneratedFrrTitle(stageEvent.title)) {
      stageUpdate.title = stageTitle;
    }
    if (stageEvent.parent_event_id !== tourEvent.id) stageUpdate.parent_event_id = tourEvent.id;
    // Tot 2026-09-29 nam de import de Engelse eventtekst van FRR over. Die staat
    // achter de links, dus een omschrijving die gelijk is aan die van Zwift gaat
    // weg; een eigen tekst van een beheerder blijft staan.
    const ownDescription = (stageEvent.description ?? "").trim();
    if (ownDescription && stage.slots.some((slot) => slot.description === ownDescription)) {
      stageUpdate.description = null;
    }
    if (Object.keys(stageUpdate).length > 0) {
      const { error } = await admin.from("events").update(stageUpdate).eq("id", stageEvent.id);
      if (error) throw new Error(error.message);
      result.updated += 1;
    }
  }

  // De tour begint bij zijn vroegste etappe. Gereden etappes staan niet meer in
  // de feed, dus die tellen via hun opgeslagen starttijd mee.
  for (const row of stageByNumber.values()) {
    stageStarts.push(new Date(row.start_at).toISOString());
  }
  const tourStart = stageStarts.sort()[0];
  const tourUpdate: Record<string, unknown> = {};
  if (tourStart && new Date(tourEvent.start_at).toISOString() !== tourStart) {
    tourUpdate.start_at = tourStart;
  }
  if (tourEvent.title !== tourTitle && isGeneratedFrrTitle(tourEvent.title)) {
    tourUpdate.title = tourTitle;
  }
  if (Object.keys(tourUpdate).length > 0) {
    const { error } = await admin.from("events").update(tourUpdate).eq("id", tourEvent.id);
    if (error) throw new Error(error.message);
    result.updated += 1;
  }

  // Tourdagen alleen verruimen: gereden etappes staan niet meer in de feed.
  const days = feed.stages.flatMap((stage) => stage.slots.map((slot) => amsterdamDay(slot.startAt)));
  const firstDay = feed.stages.map((stage) => amsterdamDay(stage.slots[0].startAt)).sort()[0];
  const lastDay = days.sort()[days.length - 1];
  const tourDays: Record<string, string> = {};
  if (!tour.starts_on || firstDay < tour.starts_on) tourDays.starts_on = firstDay;
  if (!tour.ends_on || lastDay > tour.ends_on) tourDays.ends_on = lastDay;
  if (Object.keys(tourDays).length > 0) {
    await admin.from("frr_tours").update(tourDays).eq("id", tour.id);
  }

  return result;
}
