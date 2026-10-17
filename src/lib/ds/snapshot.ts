import "server-only";

// ZWB DS: het raceoverzicht van één ZWB-event, voor de pagina /ds/[eventId].
//
// Zwift geeft de status per renner en staat ~45 verzoeken per minuut per account
// toe (docs/zwb-ds-spike.md). Er draait geen poller: elke keer dat iemand de
// pagina ververst, vragen we een paar renners op die aan de beurt zijn, binnen
// een budget dat alle kijkers en races delen (migr. 0247). Kijkt niemand, dan
// gaat er niets naar Zwift.

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchEntrants, fetchPlayerState, fetchZwiftEvent, zwiftDsConfigured } from "@/lib/events/zwift-club";
import { routeFromZwiftId } from "@/lib/events/zwift-route";
import { routeSegments } from "@/lib/zwift/route-segments";
import { hasZwbTag, pickSubgroup } from "@/lib/zrl-live/snapshot";
import { buildField, type DsEntrant, type DsField, type DsMark } from "@/lib/ds/field";
import { DS_AFTER_MS, ridersToCheck } from "@/lib/ds/schedule";

/** In de startvak staat iedereen op 0 m: pas vlak voor de start loont vragen. */
const POLL_LEAD_MS = 2 * 60 * 1000;
/** Per keer verversen hooguit zoveel renners; de emmer in de database begrenst het totaal. */
const MAX_PER_VIEW = 8;
const CONCURRENCY = 4;

type DsSubgroup = {
  id: string;
  label: string;
  startAt: number;
  routeId: number | null;
  laps: number;
  distanceM: number | null;
  entrants: Array<{ zwiftId: string; name: string; weightKg: number | null }>;
};

type DsEventData = { name: string; subgroups: DsSubgroup[] };

async function fetchDsEvent(zwiftEventId: string): Promise<DsEventData> {
  const event = (await fetchZwiftEvent(zwiftEventId)) as { name?: unknown; eventSubgroups?: unknown[] } | null;
  const subgroups: DsSubgroup[] = [];
  for (const row of (event?.eventSubgroups ?? []) as Array<Record<string, unknown>>) {
    const startAt = Date.parse(String(row.eventSubgroupStart ?? ""));
    if (row.id == null || !Number.isFinite(startAt)) continue;
    const id = String(row.id);
    const entrants = await fetchEntrants([id]);
    subgroups.push({
      id,
      label: String(row.subgroupLabel ?? ""),
      startAt,
      routeId: Number(row.routeId) || null,
      laps: Number(row.laps) || 1,
      distanceM: Number(row.distanceInMeters) > 0 ? Number(row.distanceInMeters) : null,
      entrants: entrants.map((e) => ({ zwiftId: e.zwiftId, name: e.name, weightKg: e.weightKg ?? null })),
    });
  }
  return { name: String(event?.name ?? ""), subgroups };
}

// Startlijsten veranderen tijdens een race nauwelijks; vijf minuten is ruim.
const fetchCachedDsEvent = unstable_cache(fetchDsEvent, ["zwb-ds-event", "v1"], { revalidate: 300 });

type StateRow = {
  zwift_id: number;
  checked_at: string;
  state_at: string | null;
  event_subgroup_id: number | null;
  event_distance_m: number | null;
  speed_kmh: number | null;
  power: number | null;
};

export type DsView = {
  event: { id: string; title: string; zrlLiveHref: string | null };
  subgroups: Array<{ id: string; label: string; riders: number; zwb: number }>;
  subgroup: { id: string; label: string; startAt: number };
  field: DsField;
  now: number;
  /** Binnen het venster waarin we Zwift vragen. */
  live: boolean;
  /** Tijdstip van de nieuwste status in het veld. */
  newestStateAt: number | null;
  /** Er ging iets mis bij het verversen; het overzicht toont de laatste stand. */
  problem: "zwift" | "database" | null;
};

export type DsOutcome =
  | { status: "ok"; view: DsView }
  | { status: "not-found" | "no-zwift-event" | "not-configured" | "error" };

/** Sprints en KOM's vanaf de start van het event: aanloop, dan per ronde. */
function routeMarks(subgroup: DsSubgroup): { routeM: number | null; marks: DsMark[] } {
  const route = subgroup.routeId ? routeFromZwiftId(subgroup.routeId) : null;
  const leadInM = (route?.leadInKm ?? 0) * 1000;
  const lapM = (route?.distanceKm ?? 0) * 1000;
  const routeM = subgroup.distanceM ?? (route ? leadInM + subgroup.laps * lapM : null);
  const lap = subgroup.routeId && route ? routeSegments(subgroup.routeId, 1) : null;
  const marks: DsMark[] = [];
  for (let i = 0; lap && i < subgroup.laps; i++) {
    for (const ref of lap) {
      const atM = leadInM + i * lapM + ref.offsetM;
      if (routeM === null || atM <= routeM) marks.push({ name: ref.name, atM });
    }
  }
  return { routeM, marks };
}

async function inPool<T, R>(items: T[], size: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(run))));
  }
  return results;
}

/**
 * Vraagt de renners op die aan de beurt zijn, binnen het gedeelde budget, en
 * schrijft hun status weg. Geeft de bijgewerkte rijen en of Zwift weigerde.
 */
async function refreshStates(
  admin: ReturnType<typeof createAdminClient>,
  entrants: DsSubgroup["entrants"],
  zwb: Set<string>,
  rows: Map<string, StateRow>,
  now: number,
): Promise<{ rateLimited: boolean }> {
  const due = ridersToCheck(
    entrants.map((e) => {
      const row = rows.get(e.zwiftId);
      return {
        zwiftId: e.zwiftId,
        zwb: zwb.has(e.zwiftId),
        checkedAt: row ? Date.parse(row.checked_at) : null,
        absent: row ? row.state_at === null : false,
      };
    }),
    now,
    MAX_PER_VIEW,
  );
  if (due.length === 0) return { rateLimited: false };
  const { data: granted, error } = await admin.rpc("claim_zwb_ds_budget", { want: due.length });
  if (error) throw error;
  const ids = due.slice(0, Number(granted) || 0);
  let rateLimited = false;
  const fetched = await inPool(ids, CONCURRENCY, async (zwiftId) => {
    if (rateLimited) return null;
    try {
      const outcome = await fetchPlayerState(zwiftId);
      if (outcome.status === "rate-limited") {
        rateLimited = true;
        return null;
      }
      const state = outcome.status === "ok" ? outcome.state : null;
      const row: StateRow = {
        zwift_id: Number(zwiftId),
        checked_at: new Date().toISOString(),
        state_at: state?.ts ? new Date(state.ts).toISOString() : null,
        event_subgroup_id: state?.eventSubgroupId ?? null,
        event_distance_m: state?.eventDistanceM ?? null,
        speed_kmh: state?.speedKmh ?? null,
        power: state?.power ?? null,
      };
      return row;
    } catch {
      return null;
    }
  });
  const upserts = fetched.filter((row): row is StateRow => row !== null);
  if (upserts.length > 0) {
    const { error: upsertError } = await admin.from("zwb_ds_rider_states").upsert(upserts, { onConflict: "zwift_id" });
    if (upsertError) throw upsertError;
    for (const row of upserts) rows.set(String(row.zwift_id), row);
  }
  return { rateLimited };
}

export async function loadDsView(
  eventId: string,
  options: { subgroupId?: string; viewerZwiftId?: string | null } = {},
): Promise<DsOutcome> {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, title, type, team_id, zwift_event_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { status: "not-found" };
  if (!event.zwift_event_id) return { status: "no-zwift-event" };
  if (!zwiftDsConfigured()) return { status: "not-configured" };

  let data: DsEventData;
  try {
    data = await fetchCachedDsEvent(String(event.zwift_event_id));
  } catch {
    return { status: "error" };
  }
  const occupied = data.subgroups.filter((s) => s.entrants.length > 0);
  if (occupied.length === 0) return { status: "error" };

  const allIds = [...new Set(occupied.flatMap((s) => s.entrants.map((e) => e.zwiftId)))];
  const zwb = new Set<string>();
  const { data: members } = await admin.from("profiles").select("zwift_id").in("zwift_id", allIds);
  for (const row of members ?? []) if (row.zwift_id) zwb.add(String(row.zwift_id).trim());
  for (const subgroup of occupied) {
    for (const e of subgroup.entrants) if (hasZwbTag(e.name)) zwb.add(e.zwiftId);
  }

  const viewer = options.viewerZwiftId?.trim();
  const subgroup =
    occupied.find((s) => s.id === options.subgroupId) ??
    (viewer ? occupied.find((s) => s.entrants.some((e) => e.zwiftId === viewer)) : undefined) ??
    pickSubgroup(occupied, new Set([...zwb].map(Number))) ??
    occupied[0];

  const now = Date.now();
  const live = now >= subgroup.startAt - POLL_LEAD_MS && now <= subgroup.startAt + DS_AFTER_MS;
  const rows = new Map<string, StateRow>();
  let problem: DsView["problem"] = null;
  try {
    const { data: stored, error } = await admin
      .from("zwb_ds_rider_states")
      .select("zwift_id, checked_at, state_at, event_subgroup_id, event_distance_m, speed_kmh, power")
      .in("zwift_id", subgroup.entrants.map((e) => Number(e.zwiftId)));
    if (error) throw error;
    for (const row of (stored ?? []) as StateRow[]) rows.set(String(row.zwift_id), row);
    if (live) {
      const { rateLimited } = await refreshStates(admin, subgroup.entrants, zwb, rows, now);
      if (rateLimited) problem = "zwift";
    }
  } catch {
    // Zonder database ook geen budget: dan vragen we Zwift niets.
    problem = "database";
  }

  const entrants: DsEntrant[] = subgroup.entrants.map((e) => {
    const row = rows.get(e.zwiftId);
    // Een status uit een ander event (inrijden, vrij rijden) zegt niets over deze race.
    const inRace =
      row?.state_at &&
      String(row.event_subgroup_id) === subgroup.id &&
      row.event_distance_m !== null &&
      row.speed_kmh !== null;
    return {
      zwiftId: e.zwiftId,
      name: e.name,
      zwb: zwb.has(e.zwiftId),
      weightKg: e.weightKg,
      sample: inRace
        ? {
            stateAt: Date.parse(row.state_at as string),
            eventDistanceM: row.event_distance_m as number,
            speedKmh: row.speed_kmh as number,
            power: row.power,
          }
        : null,
    };
  });
  const { routeM, marks } = routeMarks(subgroup);
  const field = buildField(entrants, { now, routeM, marks });
  const newest = entrants.reduce((max, e) => Math.max(max, e.sample?.stateAt ?? 0), 0);

  return {
    status: "ok",
    view: {
      event: {
        id: String(event.id),
        title: String(event.title),
        zrlLiveHref: event.type === "zrl" && event.team_id ? `/live/zrl/${event.id}` : null,
      },
      subgroups: occupied.map((s) => ({
        id: s.id,
        label: s.label,
        riders: s.entrants.length,
        zwb: s.entrants.filter((e) => zwb.has(e.zwiftId)).length,
      })),
      subgroup: { id: subgroup.id, label: subgroup.label, startAt: subgroup.startAt },
      field,
      now,
      live,
      newestStateAt: newest || null,
      problem,
    },
  };
}
