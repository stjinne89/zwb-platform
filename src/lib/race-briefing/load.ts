import "server-only";

// Laden voor de racebriefing (/events/[id]/briefing): één ZWB-teamevent van de
// ZRL, met de groep uit Zwift (zoals de live stand), het routeprofiel, ZRS en
// eventueel vELO per renner, de opstelling, zFTP/zMAP uit WTRL, eerdere races van
// deze ronde en het plan van de captain.
//
// Zichtbaar voor alle leden (eigenaar, 2026-10-20). Tegenstanders per renner,
// zonder gewicht of FTP; bij de segmentrecords wel de w/kg van de snelste passage
// in het veld (eigenaar, 2026-10-26).

import { after } from "next/server";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentUserAccess } from "@/lib/auth/permissions";
import { fetchZwiftEvent } from "@/lib/events/zwift-club";
import { loadZrlLive, type ZrlLiveView } from "@/lib/zrl-live/snapshot";
import { captainTeamIds } from "@/lib/zrl-analysis/load";
import { loadPacingRoute, type LoadedRoute } from "@/lib/pacing/route-loader";
import { loadZwiftEventContext } from "@/lib/pacing/ride-context";
import { adviseBikes, steadySeconds, type BikeAdvice, type BikeChoice } from "@/lib/pacing/bike-advice";
import { loadZwiftGarage } from "@/lib/pacing/zwift-garage";
import {
  DEFAULT_TEAM_SIZE,
  ZWIFT_REF_HEIGHT_CM,
  ZWIFT_REF_WEIGHT_KG,
  type RaceFormat,
  type RidePhysics,
} from "@/lib/pacing/zwift-setup";
import { MAX_PER_RACE } from "@/lib/teams/zrl-season";
import { FULL_TEAM_STARTERS } from "@/lib/zrl-live/scoring";
import { zwiftRacingConfigured } from "@/lib/zwiftracing/client";
import { loadRiderMetrics, refreshRiderMetrics, type RiderMetrics } from "./metrics";
import { routeKeyPoints, type RouteKeyPoints } from "./route";
import {
  briefingFormatOf,
  checkLimits,
  divisionLimits,
  divisionOf,
  formatRules,
  powerupsFromTags,
  type BriefingFormat,
  type Division,
  limitWatts,
  type LimitCheck,
  type LimitWatts,
  type Powerup,
} from "./rules";
import {
  projectField,
  ratingOf,
  suggestRoles,
  watchList,
  cleanRiderName,
  type FieldRider,
  type OwnRole,
  type Projection,
  type WatchReason,
} from "./field";
import { briefingTips, type BriefingTip } from "./tips";
import { loadSegmentBests, refreshSegmentBests, segmentIdsForRoute } from "./segment-bests";
import { segmentRecords, type SegmentRecord } from "./segment-records";
import { defaultSheet, effectiveSheet, sanitizeOverride, type SheetContent, type SheetSection } from "./sheet";

type Access = Pick<CurrentUserAccess, "has">;

/** Zo ver terug zoeken we eerdere races van dezelfde ronde. */
const ROUND_LOOKBACK_DAYS = 42;
/** Na de start nog zo lang verversen; daarna is de briefing geschiedenis. */
const REFRESH_UNTIL_AFTER_START_MS = 60 * 60 * 1000;
/**
 * Na de start laadt de briefing de groep niet meer: dan is de live stand er, en
 * na de race zou dit de hele bevroren race-data ophalen (egress).
 */
const FIELD_UNTIL_AFTER_START_MS = 15 * 60 * 1000;
/** Zoveel tijd krijgt het verversen van ZRS na het antwoord. */
const REFRESH_BUDGET_MS = 20_000;
/** Fietsadvies zonder zFTP van eigen renners. Keuze bij de bouw, 2026-10-20. */
const BIKE_ADVICE_FALLBACK_WKG = 3.5;

const RIDE_FORMATS: Record<BriefingFormat, RaceFormat> = { points: "race", scratch: "race", rot: "tt", ttt: "ttt" };

/**
 * De snelste fietsen op deze route, voor de referentierenner van ZwiftInsider
 * (75 kg, 183 cm) op de mediane zFTP van onze renners, op stage 0: dat stage
 * heeft iedereen die het frame heeft. Daarnaast de snelste fiets uit de
 * Zwift-garage van wie kijkt, met dezelfde renner en hetzelfde vermogen, zodat
 * alleen de fiets verschilt.
 */
async function bikeAdviceFor(
  eventId: string,
  route: LoadedRoute["route"],
  format: BriefingFormat,
  zftpWkgs: number[],
  viewerId: string,
): Promise<BriefingBikes | null> {
  const admin = createAdminClient();
  const zwift = await loadZwiftEventContext(admin, eventId, route).catch(() => null);
  if (!zwift) return null;
  const sorted = [...zftpWkgs].sort((a, b) => a - b);
  const wkg = sorted.length > 0 ? sorted[Math.floor((sorted.length - 1) / 2)] : BIKE_ADVICE_FALLBACK_WKG;
  const rideFormat = RIDE_FORMATS[format];
  const input = {
    parts: zwift.parts,
    constraints: zwift.constraints,
    setup: { format: rideFormat, frame: null, wheels: null, stage: 0, teamSize: rideFormat === "ttt" ? DEFAULT_TEAM_SIZE : null },
    weightKg: ZWIFT_REF_WEIGHT_KG,
    heightCm: ZWIFT_REF_HEIGHT_CM,
    seconds: (physics: RidePhysics) => steadySeconds(route, physics, wkg * ZWIFT_REF_WEIGHT_KG, ZWIFT_REF_WEIGHT_KG),
  };
  const advice = adviseBikes(input);
  if (!advice || advice.best.length === 0) return null;
  const garage = await loadZwiftGarage(admin, viewerId, zwift.parts).catch(() => null);
  const own = garage ? (adviseBikes({ ...input, garage, garageOnly: true, limit: 1 })?.best[0] ?? null) : null;
  return { advice, wkg, own, hasGarage: garage !== null };
}

export type BriefingBikes = {
  advice: BikeAdvice;
  wkg: number;
  /** De snelste fiets uit de Zwift-garage van wie kijkt. */
  own: BikeChoice | null;
  hasGarage: boolean;
};

export type BriefingRider = FieldRider & {
  teamLabel: string | null;
  metrics: RiderMetrics | null;
  /** Verwachte plek over de streep, als er een verwachting is. */
  expectedPlace: number | null;
};

export type OwnBriefingRider = {
  zwiftId: number;
  name: string;
  inPen: boolean;
  inLineup: boolean;
  role: OwnRole;
  /** Rol zoals de captain hem schreef; anders null en geldt het voorstel. */
  captainRole: string | null;
  zftpWkg: number | null;
  zmapWkg: number | null;
  limits: LimitCheck;
  /** De grenzen van de divisie in watt; null zonder grenzen of zonder zFTP in watt. */
  limitWatts: LimitWatts | null;
  metrics: RiderMetrics | null;
  history: Array<number | null>;
  expectedPlace: number | null;
};

export type BriefingWarning = { kind: "lineup" | "limits" | "starters"; text: string };

export type BriefingView = {
  event: { id: string; title: string; startAt: string; teamId: string; teamName: string | null; zwiftEventId: string | null };
  /** Wat er op het racebriefje staat: per blok de aanpassing van de captain, anders het voorstel. */
  sheet: SheetContent & { edited: SheetSection[] };
  /** Het voorstel van de app, voor "Voorstel terugzetten" in de editor. */
  sheetDefaults: SheetContent;
  format: BriefingFormat;
  formatRules: string[];
  division: Division | null;
  subgroupLabel: string | null;
  route: { loaded: LoadedRoute; keyPoints: RouteKeyPoints } | null;
  /** Snelste fietsen op de route; null zonder Zwift-route, fietslijst of bij een opgelegd frame. */
  bikes: BriefingBikes | null;
  /** Per sprint en KOM de richttijd uit het veld en de PR van onze renners; leeg buiten een puntenrace of Race of Truth. */
  segmentRecords: SegmentRecord[];
  powerups: Array<{ powerup: Powerup; percent: number }>;
  /** Labels van eerdere races van deze ronde, in volgorde ("W1", "W2" …). */
  historyLabels: string[];
  field: BriefingRider[];
  projection: Projection | null;
  teamLabels: Record<string, string>;
  watch: Array<{ zwiftId: number; name: string; teamLabel: string | null; place: number; reason: WatchReason }>;
  own: OwnBriefingRider[];
  warnings: BriefingWarning[];
  tips: BriefingTip[];
  plan: { text: string | null; updatedAt: string | null } | null;
  canEdit: boolean;
  zwiftRacing: boolean;
  /** Waarom er geen groep is, als die ontbreekt. */
  fieldMissing: "no-zwift-event" | "no-entrants" | "error" | "started" | null;
};

export type BriefingOutcome = { status: "ok"; view: BriefingView } | { status: "not-found" };

type EventRow = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  team_id: string | null;
  parent_event_id: string | null;
  zwift_event_id: number | null;
  zwift_route_id: number | null;
  laps: number | null;
  gpx_path: string | null;
  distance_km: number | null;
  elevation_m: number | null;
  teams: { name?: string } | null;
};

const cachedZwiftEvent = unstable_cache(
  async (zwiftEventId: string) => {
    const event = (await fetchZwiftEvent(zwiftEventId)) as { tags?: unknown; description?: unknown; eventType?: unknown } | null;
    // Alleen wat de briefing gebruikt; de rest van het event hoeft niet in de cache.
    return { tags: event?.tags ?? [], description: event?.description ?? "", eventType: event?.eventType ?? null };
  },
  ["race-briefing-zwift-event"],
  { revalidate: 60 * 60 },
);

function raceLabel(title: string, startAt: string): string {
  const week = title.match(/\bW(\d+)\b/);
  if (week) return `W${week[1]}`;
  return new Date(startAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" });
}

type RoundHistory = { labels: string[]; places: Array<[number, Array<number | null>]> };

/**
 * Plek per renner in eerdere races van dit team in deze ronde, uit de bevroren
 * Zwift-data. Gecachet: de bevroren data verandert niet, en de subgroepen van vier
 * races zijn per bezoek een paar honderd kB egress.
 */
const roundHistory = unstable_cache(
  async (eventId: string, teamId: string, startAt: string): Promise<RoundHistory> => loadRoundHistory(eventId, teamId, startAt),
  ["race-briefing-round-history"],
  { revalidate: 6 * 60 * 60 },
);

async function loadRoundHistory(_eventId: string, teamId: string, startAt: string): Promise<RoundHistory> {
  const admin = createAdminClient();
  const since = new Date(Date.parse(startAt) - ROUND_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: earlier } = await admin
    .from("events")
    .select("id, title, start_at, zwift_event_id")
    .eq("type", "zrl")
    .eq("team_id", teamId)
    .not("zwift_event_id", "is", null)
    .gte("start_at", since)
    .lt("start_at", startAt)
    .order("start_at", { ascending: true })
    .limit(6);
  const races = (earlier ?? []) as Array<{ id: string; title: string; start_at: string; zwift_event_id: number }>;
  if (races.length === 0) return { labels: [], places: [] };
  const { data: snaps } = await admin
    .from("zrl_race_snapshots")
    .select("zwift_event_id, format:data->>format, subgroups:data->subgroups")
    .in("zwift_event_id", races.map((r) => r.zwift_event_id));
  // Een ploegentijdrit heeft geen plek per renner die iets zegt over een massastart.
  const bySnap = new Map(
    ((snaps ?? []) as Array<{ zwift_event_id: number | string; format: string | null; subgroups: Array<{ results?: Array<{ profileId: number; rank: number }> }> | null }>).filter((s) => s.format !== "ttt").map((s) => [
      String(s.zwift_event_id),
      s.subgroups ?? [],
    ]),
  );
  const withData = races.filter((r) => bySnap.has(String(r.zwift_event_id)));
  const places = new Map<number, Array<number | null>>();
  withData.forEach((race, index) => {
    for (const subgroup of bySnap.get(String(race.zwift_event_id)) ?? []) {
      for (const result of subgroup.results ?? []) {
        const list = places.get(result.profileId) ?? Array<number | null>(withData.length).fill(null);
        list[index] = result.rank;
        places.set(result.profileId, list);
      }
    }
  });
  return { labels: withData.map((r) => raceLabel(r.title, r.start_at)), places: [...places] };
}

type LineupRider = { zwiftId: number | null; name: string };

async function loadLineup(event: EventRow): Promise<LineupRider[]> {
  if (!event.team_id) return [];
  const admin = createAdminClient();
  const ids = [event.id, event.parent_event_id].filter((id): id is string => Boolean(id));
  const { data } = await admin
    .from("team_event_lineups")
    .select("profiles!team_event_lineups_profile_id_fkey(display_name, zwift_id), roster_entries(name, zwift_id)")
    .in("event_id", ids)
    .eq("team_id", event.team_id);
  const out: LineupRider[] = [];
  for (const row of (data ?? []) as unknown as Array<{ profiles: unknown; roster_entries: unknown }>) {
    const person = ([row.profiles].flat()[0] ?? [row.roster_entries].flat()[0] ?? null) as
      | { display_name?: string | null; name?: string | null; zwift_id?: string | null }
      | null;
    if (!person) continue;
    const zwiftId = Number(person.zwift_id);
    out.push({ zwiftId: zwiftId > 0 ? zwiftId : null, name: person.display_name ?? person.name ?? "?" });
  }
  return out;
}

/** Andere ZWB-teams met deze renners in de opstelling, op dezelfde dag. */
async function otherLineups(event: EventRow, zwiftIds: number[]): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  if (zwiftIds.length === 0 || !event.team_id) return out;
  const admin = createAdminClient();
  const day = event.start_at.slice(0, 10);
  const { data: sameDay } = await admin
    .from("events")
    .select("id")
    .eq("type", "zrl")
    .gte("start_at", `${day}T00:00:00Z`)
    .lt("start_at", `${day}T23:59:59Z`);
  const eventIds = (sameDay ?? []).map((e) => e.id as string);
  if (eventIds.length === 0) return out;
  const { data } = await admin
    .from("team_event_lineups")
    .select("team_id, teams(name), profiles!team_event_lineups_profile_id_fkey(zwift_id), roster_entries(zwift_id)")
    .in("event_id", eventIds)
    .neq("team_id", event.team_id);
  const wanted = new Set(zwiftIds);
  for (const row of (data ?? []) as unknown as Array<{ teams: unknown; profiles: unknown; roster_entries: unknown }>) {
    const person = ([row.profiles].flat()[0] ?? [row.roster_entries].flat()[0] ?? null) as { zwift_id?: string | null } | null;
    const id = Number(person?.zwift_id);
    const teamName = ([row.teams].flat()[0] as { name?: string } | undefined)?.name;
    if (!wanted.has(id) || !teamName) continue;
    out.set(id, [...new Set([...(out.get(id) ?? []), teamName])]);
  }
  return out;
}

type WtrlPower = { zftpW: number | null; zftpWkg: number | null; zmapWkg: number | null };

async function wtrlPower(teamId: string | null): Promise<Map<number, WtrlPower>> {
  const out = new Map<number, WtrlPower>();
  if (!teamId) return out;
  const admin = createAdminClient();
  const { data: teams } = await admin.from("wtrl_teams").select("trc_ref").eq("team_id", teamId);
  const refs = (teams ?? []).map((t) => t.trc_ref as string);
  if (refs.length === 0) return out;
  const { data } = await admin.from("wtrl_team_riders").select("zwift_id, zftp_w, zftp_wkg, zmap_wkg").in("trc_ref", refs);
  for (const row of data ?? []) {
    const id = Number(row.zwift_id);
    if (!id) continue;
    out.set(id, {
      zftpW: row.zftp_w === null ? null : Number(row.zftp_w),
      zftpWkg: row.zftp_wkg === null ? null : Number(row.zftp_wkg),
      zmapWkg: row.zmap_wkg === null ? null : Number(row.zmap_wkg),
    });
  }
  return out;
}

async function canEditBriefing(userId: string, access: Access, teamId: string | null): Promise<boolean> {
  if (access.has("teams.manage_roster") || access.has("teams.manage_results")) return true;
  if (!teamId) return false;
  return (await captainTeamIds(userId)).has(teamId);
}

export async function loadRaceBriefing(
  eventId: string,
  user: { id: string },
  access: Access,
  supabase: SupabaseClient,
): Promise<BriefingOutcome> {
  const admin = createAdminClient();
  const { data: eventData } = await admin
    .from("events")
    .select("id, title, type, start_at, team_id, parent_event_id, zwift_event_id, zwift_route_id, laps, gpx_path, distance_km, elevation_m, teams(name)")
    .eq("id", eventId)
    .maybeSingle();
  const event = eventData as unknown as EventRow | null;
  if (!event || event.type !== "zrl" || !event.team_id) return { status: "not-found" };
  const teamName = event.teams?.name ?? null;
  const zwiftEventId = event.zwift_event_id ? String(event.zwift_event_id) : null;
  const started = Date.now() > Date.parse(event.start_at) + FIELD_UNTIL_AFTER_START_MS;

  const [live, zwiftEvent, routeResult, lineup, historyRows, power, planRow, canEdit] = await Promise.all([
    zwiftEventId && !started ? loadZrlLive(event.id) : Promise.resolve(null),
    zwiftEventId ? cachedZwiftEvent(zwiftEventId).catch(() => null) : Promise.resolve(null),
    loadPacingRoute(supabase, event),
    loadLineup(event),
    roundHistory(event.id, event.team_id, event.start_at),
    wtrlPower(event.team_id),
    admin.from("race_briefings").select("plan, roles, updated_at").eq("event_id", event.id).maybeSingle(),
    canEditBriefing(user.id, access, event.team_id),
  ]);

  const view: ZrlLiveView | null = live?.status === "ok" ? live.view : null;
  // Apart gelezen: zonder migratie 0263 bestaat de kolom niet, en dan moet de rest blijven werken.
  const { data: sheetRow } = await admin.from("race_briefings").select("sheet").eq("event_id", event.id).maybeSingle();
  const history = { labels: historyRows.labels, places: new Map(historyRows.places) };
  const format = briefingFormatOf(zwiftEvent);
  const division = view ? divisionOf(view.eventName, view.subgroupLabel) : null;
  const limits = division ? divisionLimits(division) : null;

  const loadedRoute = routeResult.ok ? routeResult.loaded : null;
  const keyPoints = loadedRoute
    ? routeKeyPoints({
        segments: loadedRoute.route.segments,
        accents: loadedRoute.route.accents,
        totalKm: loadedRoute.route.totalKm,
        laps: event.laps ?? view?.laps ?? 1,
      })
    : null;

  const entrantIds = view?.entrants.map((e) => e.athleteId) ?? [];
  const metrics = await loadRiderMetrics(entrantIds);
  const startMs = view?.startAt ?? Date.parse(event.start_at);
  if (entrantIds.length > 0 && Date.now() < startMs + REFRESH_UNTIL_AFTER_START_MS) {
    after(() => refreshRiderMetrics(entrantIds, metrics, { budgetMs: REFRESH_BUDGET_MS }));
  }

  const ownSet = new Set(view?.ownRiders ?? []);
  const field: FieldRider[] = (view?.entrants ?? []).map((e) => {
    const m = metrics.get(e.athleteId) ?? null;
    return {
      zwiftId: e.athleteId,
      name: cleanRiderName(e.name),
      team: e.team,
      own: ownSet.has(e.athleteId),
      racingScore: m?.racingScore ?? null,
      velo: m?.velo ?? null,
      power: m?.power ?? null,
      history: history.places.get(e.athleteId) ?? history.labels.map(() => null),
    };
  });
  const projection = view ? projectField(field, format) : null;
  const placeOf = new Map(projection?.order.map((r, i) => [r.zwiftId, i + 1]) ?? []);
  const expectedPlace = (id: number) => (projection?.basis ? placeOf.get(id) ?? null : null);

  // Eigen renners: wie in de groep staat, plus wie in de opstelling staat maar niet ingeschreven is.
  const lineupIds = new Set(lineup.map((l) => l.zwiftId).filter((id): id is number => id !== null));
  const savedRoles = ((planRow.data?.roles ?? {}) as Record<string, unknown>) ?? {};
  const ownEntrants = field.filter((r) => r.own);
  const notSignedUp = lineup.filter((l) => l.zwiftId === null || !entrantIds.includes(l.zwiftId));
  const ownBase = [
    ...ownEntrants.map((r) => ({ zwiftId: r.zwiftId, name: r.name, inPen: true })),
    ...notSignedUp.filter((l) => l.zwiftId !== null).map((l) => ({ zwiftId: l.zwiftId as number, name: l.name, inPen: false })),
  ];
  const fiveMin = (id: number) => metrics.get(id)?.power?.m5 ?? power.get(id)?.zmapWkg ?? null;
  const suggested = suggestRoles(
    ownBase.filter((r) => r.inPen).map((r) => ({ zwiftId: r.zwiftId, rating: ratingOf(field.find((f) => f.zwiftId === r.zwiftId)!, projection?.basis ?? null), fiveMinWkg: fiveMin(r.zwiftId) })),
  );
  const own: OwnBriefingRider[] = ownBase.map((r) => {
    const wtrl = power.get(r.zwiftId);
    const captainRole = typeof savedRoles[String(r.zwiftId)] === "string" ? String(savedRoles[String(r.zwiftId)]).trim() || null : null;
    return {
      zwiftId: r.zwiftId,
      name: r.name,
      inPen: r.inPen,
      inLineup: lineupIds.has(r.zwiftId),
      role: suggested.get(r.zwiftId) ?? "steun",
      captainRole,
      zftpWkg: wtrl?.zftpWkg ?? null,
      zmapWkg: wtrl?.zmapWkg ?? null,
      limits: checkLimits(limits, wtrl?.zftpWkg ?? null, wtrl?.zmapWkg ?? null),
      limitWatts: limitWatts(limits, wtrl?.zftpW ?? null, wtrl?.zftpWkg ?? null),
      metrics: metrics.get(r.zwiftId) ?? null,
      history: history.places.get(r.zwiftId) ?? history.labels.map(() => null),
      expectedPlace: expectedPlace(r.zwiftId),
    };
  });

  const warnings: BriefingWarning[] = [];
  const inPen = own.filter((r) => r.inPen);
  if (view) {
    if (inPen.length > MAX_PER_RACE) {
      warnings.push({ kind: "lineup", text: `${inPen.length} ZWB'ers staan in de groep; er mogen er ${MAX_PER_RACE} rijden.` });
    }
    if (inPen.length < FULL_TEAM_STARTERS) {
      warnings.push({ kind: "starters", text: `${inPen.length} van onze renners staan in de groep. Voor volle leaguepunten moeten er ${FULL_TEAM_STARTERS} starten.` });
    }
    for (const r of notSignedUp) warnings.push({ kind: "lineup", text: `${r.name} staat in de opstelling maar niet in de groep bij Zwift.` });
    if (lineup.length > 0) {
      for (const r of inPen.filter((x) => !x.inLineup)) warnings.push({ kind: "lineup", text: `${r.name} staat in de groep maar niet in de opstelling.` });
    }
  }
  const elsewhere = await otherLineups(event, own.map((r) => r.zwiftId));
  for (const r of own) {
    const teams = elsewhere.get(r.zwiftId);
    if (teams?.length) warnings.push({ kind: "lineup", text: `${r.name} staat ook in de opstelling van ${teams.join(" en ")}.` });
  }
  for (const r of own.filter((x) => x.limits.status !== "ok")) {
    const parts = [
      r.limits.zftpShare !== null && r.zftpWkg !== null && limits?.zftpWkg ? `zFTP ${r.zftpWkg.toFixed(2).replace(".", ",")} van ${limits.zftpWkg.toFixed(2).replace(".", ",")}` : null,
      r.limits.zmapShare !== null && r.zmapWkg !== null && limits?.zmapWkg ? `zMAP ${r.zmapWkg.toFixed(2).replace(".", ",")} van ${limits.zmapWkg.toFixed(2).replace(".", ",")}` : null,
    ].filter(Boolean);
    warnings.push({ kind: "limits", text: `${r.name}: ${r.limits.status === "over" ? "boven" : "dicht bij"} de grens van ${division?.label ?? "de divisie"} (${parts.join(", ")} W/kg).` });
  }

  // Segmentrecords: alleen waar sprints en KOM's punten opleveren.
  let segmentRecordList: SegmentRecord[] = [];
  if (keyPoints && (format === "points" || format === "rot")) {
    const idBySlug = segmentIdsForRoute(event.zwift_route_id);
    const segmentIds = [...new Set(keyPoints.segments.map((s) => idBySlug.get(s.slug)).filter((id): id is string => Boolean(id)))];
    const recordOwn = (inPen.length > 0 ? inPen : own).map((r) => ({ zwiftId: r.zwiftId, name: cleanRiderName(r.name) }));
    const ownIds = new Set(recordOwn.map((r) => r.zwiftId));
    const riderIds = [...ownIds, ...field.map((r) => r.zwiftId).filter((id) => !ownIds.has(id))];
    const loaded = await loadSegmentBests(riderIds, segmentIds);
    const bests = loaded ?? [];
    if (loaded && segmentIds.length > 0 && Date.now() < startMs) {
      after(() => refreshSegmentBests(riderIds, segmentIds, bests, { budgetMs: REFRESH_BUDGET_MS }));
    }
    segmentRecordList = segmentRecords({
      segments: keyPoints.segments,
      segmentIds: idBySlug,
      bests,
      own: recordOwn,
      field: field.map((r) => ({ zwiftId: r.zwiftId, name: r.name })),
    });
  }

  const ownZftp = (inPen.length > 0 ? inPen : own).map((r) => r.zftpWkg).filter((v): v is number => v !== null && v > 0);
  const bikes =
    loadedRoute?.route.source === "zwift" ? await bikeAdviceFor(event.id, loadedRoute.route, format, ownZftp, user.id) : null;

  const watch = projection ? watchList(projection) : [];
  const powerups = powerupsFromTags(zwiftEvent?.tags);
  const tips = briefingTips({
    format,
    category: division?.category ?? null,
    route: keyPoints,
    powerups,
    projection: projection ?? { basis: null, order: [], teams: [] },
    watch,
    own: inPen.map((r) => ({ zwiftId: r.zwiftId, name: r.name, role: r.role, limits: r.limits })),
  });

  const teamLabels = view?.teamLabels ?? {};
  const briefingField: BriefingRider[] = (projection?.order ?? field).map((r) => ({
    ...r,
    teamLabel: r.team ? teamLabels[r.team] ?? r.team : null,
    metrics: metrics.get(r.zwiftId) ?? null,
    expectedPlace: expectedPlace(r.zwiftId),
  }));

  const watchView = watch.map((w) => ({ zwiftId: w.rider.zwiftId, name: w.rider.name, teamLabel: w.rider.team ? teamLabels[w.rider.team] ?? w.rider.team : null, place: w.place, reason: w.reason }));
  const sheetDefaults = defaultSheet({
    format,
    category: division?.category ?? null,
    route: keyPoints,
    powerups,
    own: inPen.map((r) => ({ zwiftId: r.zwiftId, name: r.name, role: r.role, limits: r.limits })),
    watch: watchView.map((w) => {
      const index = history.places.get(w.zwiftId)?.indexOf(1) ?? -1;
      return { name: w.name, teamLabel: w.teamLabel, reason: w.reason, wonAt: index >= 0 ? history.labels[index] ?? null : null };
    }),
    // Grenzen staan bij de rollen, niet onder Let op.
    warnings: warnings.filter((w) => w.kind !== "limits").map((w) => w.text),
  });
  const sheet = effectiveSheet(sheetDefaults, sheetRow ? sanitizeOverride((sheetRow as { sheet?: unknown }).sheet) : null);

  return {
    status: "ok",
    view: {
      event: { id: event.id, title: event.title, startAt: event.start_at, teamId: event.team_id, teamName, zwiftEventId },
      sheet,
      sheetDefaults,
      format,
      formatRules: formatRules(format),
      division,
      subgroupLabel: view?.subgroupLabel ?? null,
      route: loadedRoute && keyPoints ? { loaded: loadedRoute, keyPoints } : null,
      bikes,
      segmentRecords: segmentRecordList,
      powerups,
      historyLabels: history.labels,
      field: briefingField,
      projection,
      teamLabels,
      watch: watchView,
      own,
      warnings,
      tips,
      plan: planRow.data ? { text: (planRow.data.plan as string | null) ?? null, updatedAt: (planRow.data.updated_at as string | null) ?? null } : null,
      canEdit,
      zwiftRacing: zwiftRacingConfigured(),
      fieldMissing: !zwiftEventId ? "no-zwift-event" : started ? "started" : live?.status === "ok" ? null : live?.status === "error" ? "error" : "no-entrants",
    },
  };
}
