import "server-only";

// ZWB DS: het raceoverzicht van één ZWB-event, voor de pagina /ds/[eventId].
//
// Zwift geeft de status per renner en staat ~45 verzoeken per minuut per account
// toe (docs/zwb-ds-spike.md). Er draait geen poller: elke keer dat iemand de
// pagina ververst, vragen we een paar renners op die aan de beurt zijn, binnen
// een budget dat alle kijkers en races delen (migr. 0249). Kijkt niemand, dan
// gaat er niets naar Zwift.

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchEntrants, fetchPlayerState, fetchZwiftEvent, zwiftDsConfigured } from "@/lib/events/zwift-club";
import { routeFromZwiftId } from "@/lib/events/zwift-route";
import { routeSegments } from "@/lib/zwift/route-segments";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";
import { expandLaps } from "@/lib/pacing/route-profile";
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
  cadence_rpm: number | null;
  draft: number | null;
  elapsed_s: number | null;
  kj: number | null;
  climbing_m: number | null;
};

const STATE_COLUMNS =
  "zwift_id, checked_at, state_at, event_subgroup_id, event_distance_m, speed_kmh, power, cadence_rpm, draft, elapsed_s, kj, climbing_m";

/** Hoogteprofiel van het hele event (aanloop en ronden), uitgedund voor de pagina. */
export type DsProfile = { distanceM: number[]; altitudeM: number[] };
/** Genoeg punten voor een scherm, en een pagina die elke 15 s ververst blijft licht. */
const PROFILE_POINTS = 400;
/** Zoals het pacingplan: een profiel dat meer dan 10% afwijkt, hoort bij een andere route. */
const PROFILE_TOLERANCE = 0.1;

async function fetchRouteProfile(routeId: number): Promise<RouteProfile | null> {
  const { data } = await createAdminClient()
    .from("zwift_routes")
    .select("profile")
    .eq("route_id", routeId)
    .maybeSingle();
  const profile = data?.profile as RouteProfile | null | undefined;
  return profile?.distanceM?.length && profile.altitudeM?.length === profile.distanceM.length ? profile : null;
}

// Een routeprofiel verandert niet tijdens een race.
const fetchCachedRouteProfile = unstable_cache(fetchRouteProfile, ["zwb-ds-route-profile", "v1"], { revalidate: 86400 });

function thin(profile: RouteProfile, points: number): DsProfile {
  const step = Math.max(1, Math.ceil(profile.distanceM.length / points));
  const distanceM: number[] = [];
  const altitudeM: number[] = [];
  for (let i = 0; i < profile.distanceM.length; i += step) {
    distanceM.push(Math.round(profile.distanceM[i]));
    altitudeM.push(Math.round(profile.altitudeM[i] * 10) / 10);
  }
  const last = profile.distanceM.length - 1;
  if (distanceM[distanceM.length - 1] !== Math.round(profile.distanceM[last])) {
    distanceM.push(Math.round(profile.distanceM[last]));
    altitudeM.push(Math.round(profile.altitudeM[last] * 10) / 10);
  }
  return { distanceM, altitudeM };
}

/** Hoogte op een afstand, lineair tussen twee punten. */
function altitudeAt(profile: RouteProfile, distanceM: number): number | null {
  const d = profile.distanceM;
  if (d.length < 2 || distanceM < d[0] || distanceM > d[d.length - 1]) return null;
  let lo = 0;
  let hi = d.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (d[mid] <= distanceM) lo = mid;
    else hi = mid;
  }
  const span = d[hi] - d[lo] || 1;
  return profile.altitudeM[lo] + ((distanceM - d[lo]) / span) * (profile.altitudeM[hi] - profile.altitudeM[lo]);
}

/** Helling over 100 m rond een afstand, in procent. */
function gradeAt(profile: RouteProfile, distanceM: number): number | null {
  const a = altitudeAt(profile, Math.max(0, distanceM - 50));
  const b = altitudeAt(profile, distanceM + 50);
  return a === null || b === null ? null : ((b - a) / 100) * 100;
}

async function eventProfile(subgroup: DsSubgroup, routeM: number | null): Promise<RouteProfile | null> {
  const route = subgroup.routeId ? routeFromZwiftId(subgroup.routeId) : null;
  if (!route || !subgroup.routeId) return null;
  let lap: RouteProfile | null = null;
  try {
    lap = await fetchCachedRouteProfile(subgroup.routeId);
  } catch {
    return null;
  }
  if (!lap) return null;
  const lapKm = lap.distanceM[lap.distanceM.length - 1] / 1000;
  if (Math.abs(lapKm - route.distanceKm) / route.distanceKm > PROFILE_TOLERANCE) return null;
  const expanded = expandLaps(lap, { leadInKm: route.leadInKm, leadInElevationM: route.leadInElevationM, laps: subgroup.laps });
  if (routeM === null) return expanded;
  // Een event dat korter is dan de ronden (distanceInMeters), stopt eerder.
  const keep = expanded.distanceM.findIndex((m) => m > routeM);
  return keep > 1
    ? { distanceM: expanded.distanceM.slice(0, keep + 1), altitudeM: expanded.altitudeM.slice(0, keep + 1) }
    : expanded;
}

export type DsView = {
  event: { id: string; title: string; zrlLiveHref: string | null };
  subgroups: Array<{ id: string; label: string; riders: number; zwb: number }>;
  subgroup: { id: string; label: string; startAt: number };
  field: DsField;
  profile: DsProfile | null;
  /** Zwift-ID van de kijker als die in dit veld rijdt: daar zoomt de strook op in. */
  focusId: string | null;
  /** ZWB'ers in deze groep zonder (verse) status. */
  zwbUnseen: string[];
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
        cadence_rpm: state?.cadenceRpm ?? null,
        draft: state?.draft ?? null,
        elapsed_s: state?.elapsedS ?? null,
        kj: state?.kj ?? null,
        climbing_m: state?.climbingM ?? null,
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
      .select(STATE_COLUMNS)
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
            cadenceRpm: row.cadence_rpm,
            draft: row.draft,
            elapsedS: row.elapsed_s,
            kj: row.kj,
          }
        : null,
    };
  });
  const { routeM, marks } = routeMarks(subgroup);
  const profile = await eventProfile(subgroup, routeM);
  const field = buildField(entrants, {
    now,
    routeM,
    marks,
    gradeAt: profile ? (m) => gradeAt(profile, m) : undefined,
  });
  const inField = new Set(field.riders.map((r) => r.zwiftId));
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
      profile: profile ? thin(profile, PROFILE_POINTS) : null,
      focusId: viewer && inField.has(viewer) ? viewer : null,
      zwbUnseen: entrants.filter((e) => e.zwb && !inField.has(e.zwiftId)).map((e) => e.name),
      now,
      live,
      newestStateAt: newest || null,
      problem,
    },
  };
}
