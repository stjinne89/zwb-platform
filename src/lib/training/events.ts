// Clubevents in het trainingsschema.
//
// De planner kreeg tot nu toe elk aankomend event mee en zette het als sessie in
// het schema, ook bij een lid dat zich niet had opgegeven. Alleen een 'ja' in
// event_rsvps is een toezegging; de rest is hooguit een suggestie waar het lid
// zelf over gaat.

import type { createAdminClient } from "@/lib/supabase/admin";
import { deleteIntervalsWorkoutEvent } from "@/lib/intervals/client";
import { hasOwnRoute, withParentRoute } from "@/lib/events/route-source";
import { withoutParentEvents } from "@/lib/events/sub-events";
import { routeFromZwiftId } from "@/lib/events/zwift-route";
import { activeBasePlan } from "@/lib/training/active-plan";
import { pushWorkoutToIntervals } from "@/lib/training/publish";
import { removeRaceWarmup } from "@/lib/training/race-warmup";
import {
  normalizeWorkoutBlocks,
  type WorkoutBlock,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

type Admin = ReturnType<typeof createAdminClient>;

export type ClubEventRow = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  end_at: string | null;
  distance_km: number | string | null;
  elevation_m: number | null;
  /** Route en format van een Zwift-race; zie zwiftRaceKind en zwiftRaceTotals. */
  gpx_path?: string | null;
  zwift_route_id?: number | string | null;
  laps?: number | string | null;
  zwift_event_type?: string | null;
  zwift_tags?: string[] | null;
  parent_event_id?: string | null;
};

const EVENT_COLUMNS =
  "id, title, type, start_at, end_at, distance_km, elevation_m, gpx_path, zwift_route_id, laps, zwift_event_type, zwift_tags, parent_event_id";

/**
 * Wat een event in het schema wordt als het lid meedoet. De duur komt bij
 * voorkeur uit de eindtijd, dan uit afstand + hoogtemeters, en pas daarna uit
 * een typegemiddelde — een clubrit van 80 km is nu eenmaal iets anders dan een
 * ZRL van drie kwartier.
 *
 * `gran_fondo` en `zwift` ontbraken hier tot 2026-08-18 en vielen daardoor terug
 * op `outdoor`. Bij een gran fondo neemt de afstand de duur meestal over, maar
 * de intensiteit bleef zo hangen op die van een gewone buitenrit.
 *
 * ZRL stond tot 2026-09-30 op 60 minuten. Een ZRL-teamrace wordt zonder route
 * aangemaakt, dus zolang de Zwift-link er niet in staat is dit de duur; en 60
 * minuten op race-intensiteit is precies 100 TSS, voor elke race. De mediaan van
 * 468 gereden ZRL-races van ZWB'ers is 53 minuten, van de TTT's 43.
 */
const EVENT_DEFAULTS: Record<string, { minutes: number; intensity: WorkoutIntensity }> = {
  zrl: { minutes: 50, intensity: "race" },
  ladder: { minutes: 60, intensity: "race" },
  flamme_rouge: { minutes: 60, intensity: "race" },
  src: { minutes: 85, intensity: "race" },
  zwift: { minutes: 60, intensity: "race" },
  gran_fondo: { minutes: 300, intensity: "endurance" },
  outdoor: { minutes: 120, intensity: "endurance" },
  social: { minutes: 90, intensity: "endurance" },
  training: { minutes: 75, intensity: "tempo" },
};

/**
 * Duurmodel voor een buitenrit: `afstand / VLAK_KMH + hoogtemeters * MIN_PER_HM`.
 *
 * Het oude model rekende alleen 28 km/h over de afstand en negeerde de
 * hoogtemeters volledig. Op de Marmotte (176 km, 5067 hm) schatte dat 377
 * minuten waar het echte antwoord ruim negen uur is — 32% te laag. Andersom was
 * het op een vlakke rit als Sallands Mooiste juist 17% te hoog.
 *
 * De twee constanten zijn geen losse aannames maar een kleinste-kwadraten-fit
 * op het natuurkundige model uit `@/lib/ride-estimate`, gedraaid over de acht
 * ZWB-events die een GPX hebben (14 tot 235 km, 2 tot 5067 hm). Daarom staat er
 * 34 km/h en niet een "realistischer" ogende 28: het is een fitparameter die
 * samen met de klimterm de totale tijd verdeelt, niet een snelheid die iemand
 * ergens rijdt. Los eraan draaien maakt het model slechter.
 *
 * Afwijking t.o.v. het natuurkundige model op die acht routes: binnen 7%,
 * behalve op een pure klimroute (14 km, 1064 hm) waar de vlakke term
 * betekenisloos wordt en het model 21% te laag uitkomt. Dat is geen clubevent
 * maar een col; wie dat exact wil weten, kijkt op de eventpagina zelf, waar de
 * schatting wél over de GPX en met je eigen w/kg loopt.
 */
const VLAK_KMH = 34;
const MIN_PER_HM = 0.045;

/** Bovengrens; een gran fondo van tien uur bestaat, een van twintig niet. */
const MAX_EVENT_MINUTES = 720;

/**
 * Geschatte rijtijd in minuten uit afstand en hoogtemeters, of null zonder
 * bruikbare afstand. Hoogtemeters mogen ontbreken; dan telt alleen de afstand.
 */
export function estimateEventMinutes(
  distanceKm: number | string | null | undefined,
  elevationM: number | null | undefined,
): number | null {
  const km = distanceKm == null ? null : Number(distanceKm);
  if (km == null || !Number.isFinite(km) || km <= 0) return null;
  const hm = elevationM == null ? 0 : Number(elevationM);
  const climbMinutes = Number.isFinite(hm) && hm > 0 ? hm * MIN_PER_HM : 0;
  return Math.round((km / VLAK_KMH) * 60 + climbMinutes);
}

/**
 * Duur en intensiteit van een Zwift-race, gefit op de gereden races van
 * ZWB'ers (strava_activities, 30 september 2026): 608 races en tijdritten uit de
 * ZRL en de FRR, en 135 TTT's, met de afstand en hoogtemeters van de rit zelf.
 *
 * Het buitenritmodel hierboven zat op diezelfde races mediaan 42% te lang: in
 * Zwift rijd je in een groep, zonder kruisingen of wind. Een TTT gaat nog
 * sneller, met tijdritfietsen en een team dat aflost. Een FRR-iTT reed los gefit
 * even snel als een gewone race (43,5 km/h) en valt er daarom onder, net als de
 * Race of Truth — al zat die op 22 september 2026 zo'n 6% trager.
 *
 * Afwijking van dit model op die ritten: mediaan 7% in duur (5,5% bij TTT's).
 */
const ZWIFT_RACE_PACE: Record<ZwiftRaceKind, { kmh: number; minPerHm: number }> = {
  race: { kmh: 43, minPerHm: 0.02 },
  ttt: { kmh: 46.5, minPerHm: 0.021 },
};

/**
 * De IF van een Zwift-race zakt met de duur: mediaan 0,98 onder de 40 minuten,
 * 0,90 rond het uur en 0,86 boven de 70 minuten. Lineair gefit op 507 races met
 * vermogensmeter en de FTP van dat moment (profile_ftp_history). Het format
 * voegde daar niets aan toe: bij gelijke duur rijdt een TTT of tijdrit geen
 * hogere IF dan een puntenrace. Het format telt dus alleen via de snelheid.
 */
const ZWIFT_RACE_IF = { base: 1.05, perMinute: 0.0019, min: 0.8, max: 1 };

/** Halve breedte van het vermogensdoel rond die IF, in %FTP. */
const ZWIFT_RACE_TARGET_SPREAD = 5;

// De Sunday Race Club rijdt op MyWhoosh, maar het tempo is dat van een
// Zwift-race: op de acht SRC-races van september 2026 zat dit model 2 tot 5%
// van de mediane finishtijd bij de heren, en 8 tot 10% te kort bij de dames.
const ZWIFT_RACE_TYPES = new Set(["zrl", "ladder", "flamme_rouge", "src"]);
const ZWIFT_RACE_EVENT_TYPES = new Set(["RACE", "TIME_TRIAL", "TEAM_TIME_TRIAL"]);

export type ZwiftRaceKind = "race" | "ttt";

/**
 * Is dit een Zwift-race, en zo ja een TTT of een gewone race? Een TTT is bij
 * Zwift een event van het type TEAM_TIME_TRIAL, en WTRL zet er de tag `ttt` op
 * (zie zrlFormatOf). Een los Zwift-event telt alleen als race als Zwift dat zegt;
 * een groepsrit met de standaard race-intensiteit rekent verder zoals altijd.
 */
export function zwiftRaceKind(event: ClubEventRow): ZwiftRaceKind | null {
  const zwiftType = (event.zwift_event_type ?? "").trim().toUpperCase();
  const isRace =
    ZWIFT_RACE_TYPES.has(event.type) ||
    (event.type === "zwift" && ZWIFT_RACE_EVENT_TYPES.has(zwiftType));
  if (!isRace) return null;
  const tags = (event.zwift_tags ?? []).map((tag) => tag.toLowerCase());
  return zwiftType === "TEAM_TIME_TRIAL" || tags.includes("ttt") ? "ttt" : "race";
}

function positive(value: number | string | null | undefined): number | null {
  const n = value == null || value === "" ? NaN : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Afstand en hoogtemeters van een Zwift-race. Eerst die van het event zelf: bij
 * het plakken van de Zwift-link worden die voor de eigen subgroep ingevuld,
 * inclusief lead-in en ronden. Anders uit de route en het aantal ronden, die een
 * teamrace ook van zijn raceweek kan erven (withParentRoute).
 */
export function zwiftRaceTotals(
  event: ClubEventRow,
): { distanceKm: number; elevationM: number } | null {
  const ownKm = positive(event.distance_km);
  if (ownKm != null) return { distanceKm: ownKm, elevationM: positive(event.elevation_m) ?? 0 };

  const routeId = positive(event.zwift_route_id);
  const route = routeId == null ? null : routeFromZwiftId(routeId);
  if (!route || route.distanceKm <= 0) return null;
  const laps = Math.round(positive(event.laps) ?? 1);
  return {
    distanceKm: route.leadInKm + laps * route.distanceKm,
    elevationM: route.leadInElevationM + laps * route.elevationM,
  };
}

/** Geschatte racetijd in minuten, of null zonder afstand of route. */
export function estimateZwiftRaceMinutes(event: ClubEventRow, kind: ZwiftRaceKind): number | null {
  const totals = zwiftRaceTotals(event);
  if (!totals) return null;
  const pace = ZWIFT_RACE_PACE[kind];
  return Math.round((totals.distanceKm / pace.kmh) * 60 + totals.elevationM * pace.minPerHm);
}

/** De verwachte IF van een Zwift-race van zoveel minuten. */
export function zwiftRaceIntensityFactor(minutes: number): number {
  const factor = ZWIFT_RACE_IF.base - ZWIFT_RACE_IF.perMinute * minutes;
  return Math.min(ZWIFT_RACE_IF.max, Math.max(ZWIFT_RACE_IF.min, factor));
}

/**
 * Het vermogensdoel van een Zwift-race: een band rond de verwachte IF. De
 * belasting in ZWB en in intervals.icu rekent met het midden daarvan; zonder
 * doel was dat het midden van de hele raceband, 100% FTP.
 */
function zwiftRaceTarget(minutes: number): string {
  const pct = Math.round(zwiftRaceIntensityFactor(minutes) * 100);
  return `${pct - ZWIFT_RACE_TARGET_SPREAD}-${pct + ZWIFT_RACE_TARGET_SPREAD}%`;
}

export function eventWorkoutDefaults(event: ClubEventRow): {
  durationMinutes: number;
  intensity: WorkoutIntensity;
  /** Vermogensdoel van het blok; leeg laat de band van de intensiteit gelden. */
  target: string;
} {
  const fallback = EVENT_DEFAULTS[event.type] ?? EVENT_DEFAULTS.outdoor;
  const raceKind = zwiftRaceKind(event);

  const start = new Date(event.start_at).getTime();
  const end = event.end_at ? new Date(event.end_at).getTime() : null;
  const fromEnd =
    end != null && Number.isFinite(end) && end > start
      ? Math.round((end - start) / 60_000)
      : null;

  const fromRoute = raceKind
    ? estimateZwiftRaceMinutes(event, raceKind)
    : estimateEventMinutes(event.distance_km, event.elevation_m);
  const minutes = fromEnd ?? fromRoute ?? fallback.minutes;
  const durationMinutes = Math.min(MAX_EVENT_MINUTES, Math.max(20, minutes));
  return {
    durationMinutes,
    intensity: fallback.intensity,
    target: raceKind ? zwiftRaceTarget(durationMinutes) : "",
  };
}

/** Het ene blok waaruit een event in het schema bestaat. */
export function eventWorkoutBlocks(event: ClubEventRow): WorkoutBlock[] {
  const { durationMinutes, intensity, target } = eventWorkoutDefaults(event);
  return normalizeWorkoutBlocks(
    [
      {
        label: event.title,
        durationMinutes,
        target,
        notes: EVENT_BLOCK_NOTE,
        intensity,
      },
    ],
    intensity,
  );
}

const EVENT_BLOCK_NOTE = "Clubevent uit de ZWB-kalender.";

/**
 * Vult bij teamraces zonder eigen route de route van hun raceweek in. De
 * ZRL-import maakt teamraces zonder route aan; staat de route op de raceweek,
 * dan kan de duur daar toch uit volgen.
 */
async function withParentRoutes<T extends ClubEventRow>(admin: Admin, events: T[]): Promise<T[]> {
  const needsParent = (event: T) =>
    Boolean(event.parent_event_id) &&
    positive(event.distance_km) == null &&
    !hasOwnRoute({ gpx_path: event.gpx_path ?? null, zwift_route_id: event.zwift_route_id ?? null });
  const parentIds = [...new Set(events.filter(needsParent).map((e) => e.parent_event_id as string))];
  if (parentIds.length === 0) return events;

  const { data } = await admin
    .from("events")
    .select("id, gpx_path, zwift_route_id, laps")
    .in("id", parentIds);
  const parents = new Map(
    ((data ?? []) as Array<{
      id: string;
      gpx_path: string | null;
      zwift_route_id: number | string | null;
      laps: number | string | null;
    }>).map((row) => [row.id, row]),
  );
  return events.map((event) => {
    if (!needsParent(event)) return event;
    const parent = parents.get(event.parent_event_id as string);
    if (!parent) return event;
    return withParentRoute(
      {
        ...event,
        gpx_path: event.gpx_path ?? null,
        zwift_route_id: event.zwift_route_id ?? null,
        laps: event.laps ?? null,
      },
      parent,
    );
  });
}

export type ScheduleEvent = ClubEventRow & {
  /** 'yes' | 'maybe' | 'no' | null — null is nog niet beantwoord. */
  rsvp: string | null;
  /** Staat dit event al als blok in het schema? */
  inSchedule: boolean;
  /**
   * En staat dat blok ook in intervals.icu? Die twee liepen uiteen: een blok kon
   * in ZWB staan terwijl het nooit was doorgezet, en dan reed het lid het niet
   * van zijn fietscomputer.
   */
  inIntervals: boolean;
};

/**
 * De clubevents binnen de looptijd van een schema, met het antwoord van het lid
 * erbij. 'misschien' telt als onbeslist en blijft dus gewoon in de keuzelijst
 * staan; alleen 'ja' is een toezegging.
 */
export async function loadScheduleEvents(
  admin: Admin,
  profileId: string,
  from: string,
  to: string,
  /**
   * Standaard 50, want een schemaperiode van een paar maanden komt daar niet
   * overheen. De jaarplanning kijkt twaalf maanden vooruit en heeft er meer
   * nodig; die geeft daarom zelf een ruimere waarde mee.
   */
  limit = 50,
): Promise<ScheduleEvent[]> {
  // De tijdsloten van een FRR-etappe (migr. 0195) blijven buiten de basislijst:
  // een tour heeft er ruim veertig, en die zouden de limiet opeten. Alleen de
  // slots waar het lid zelf op antwoordde, komen er hieronder bij.
  const [{ data: rawEvents }, { data: frrSlots }] = await Promise.all([
    admin
      .from("events")
      .select(EVENT_COLUMNS)
      .gte("start_at", `${from}T00:00:00`)
      .lte("start_at", `${to}T23:59:59`)
      .or("type.neq.flamme_rouge,parent_event_id.is.null")
      .order("start_at", { ascending: true })
      .limit(limit),
    admin
      .from("event_rsvps")
      .select(`events!inner(${EVENT_COLUMNS})`)
      .eq("profile_id", profileId)
      .eq("events.type", "flamme_rouge")
      .not("events.parent_event_id", "is", null)
      .gte("events.start_at", `${from}T00:00:00`)
      .lte("events.start_at", `${to}T23:59:59`),
  ]);
  const ownSlots = ((frrSlots ?? []) as Array<{ events: ClubEventRow | ClubEventRow[] | null }>)
    .flatMap((row) => (Array.isArray(row.events) ? row.events : row.events ? [row.events] : []));
  const combined = [...((rawEvents ?? []) as ClubEventRow[]), ...ownSlots].sort((a, b) =>
    String(a.start_at).localeCompare(String(b.start_at)),
  );
  if (combined.length === 0) return [];

  // Een hoofdevent (migr. 0178) is geen race om ja op te zeggen; dat gebeurt op
  // het teamevent eronder.
  const events = await withParentRoutes(admin, await withoutParentEvents(admin, combined));
  if (events.length === 0) return [];

  const ids = events.map((event) => event.id as string);
  const [{ data: rsvps }, { data: workouts }] = await Promise.all([
    admin
      .from("event_rsvps")
      .select("event_id, status")
      .eq("profile_id", profileId)
      .in("event_id", ids),
    admin
      .from("training_workouts")
      .select("event_id, intervals_event_id")
      .eq("profile_id", profileId)
      .is("superseded_at", null)
      .in("event_id", ids),
  ]);

  const byEvent = new Map((rsvps ?? []).map((row) => [row.event_id as string, row.status as string]));
  const scheduled = new Map(
    (workouts ?? []).map((row) => [
      row.event_id as string,
      (row.intervals_event_id as string | null) ?? null,
    ]),
  );

  return events.map((event) => ({
    ...event,
    rsvp: byEvent.get(event.id) ?? null,
    inSchedule: scheduled.has(event.id),
    inIntervals: Boolean(scheduled.get(event.id)),
  }));
}

/**
 * De events waar het lid 'ja' op heeft gezegd, in de vorm die de AI-input
 * verwacht. Alleen dit gaat naar de planner: een event zonder toezegging hoort
 * het schema niet te sturen.
 *
 * De afmetingen gaan mee sinds 2026-08-18. Daarvoor kreeg de planner alleen
 * titel, type en datum, en dat ging precies zo mis als je zou verwachten: voor
 * een gran fondo van 167 km en 3305 hoogtemeters plande hij een "gecontroleerde
 * eventprikkel" van 150 minuten. Hij kón niet weten dat het een rit van zeven
 * uur was.
 */
export async function committedEventsForAi(
  admin: Admin,
  profileId: string,
  from: string,
  to: string,
) {
  const events = await loadScheduleEvents(admin, profileId, from, to).catch(() => []);
  return events
    .filter((event) => event.rsvp === "yes")
    .map((event) => ({
      title: event.title,
      type: event.type,
      date: String(event.start_at).slice(0, 10),
      durationMinutes: eventWorkoutDefaults(event).durationMinutes,
      distanceKm: event.distance_km == null ? null : Number(event.distance_km),
      elevationM: event.elevation_m ?? null,
    }));
}

/**
 * Zet een toegezegd event als vast blok in het schema, of haalt het er weer uit.
 *
 * Eén bron voor beide ja-knoppen. De knop op de eventpagina schreef tot
 * 2026-08-18 alleen een rij in `event_rsvps`, waardoor het schema niets van het
 * event wist; alleen de knop in het schemapaneel zette het blok erbij. Wie zich
 * op de eventpagina opgaf — de logische plek — kreeg dus een schema waarin de AI
 * zelf maar iets verzon voor die dag.
 *
 * Alleen 'ja' is een toezegging: bij 'nee' én bij 'misschien' verdwijnt het blok
 * weer, zodat het schema geen afspraak toont die het lid niet heeft gemaakt.
 */
export async function syncEventWorkout(
  admin: Admin,
  profileId: string,
  eventId: string,
  status: "yes" | "maybe" | "no",
): Promise<{ inserted: boolean; removed: boolean; pushed: boolean }> {
  const unchanged = { inserted: false, removed: false, pushed: false };

  const { data: existing } = await admin
    .from("training_workouts")
    .select("id, intervals_event_id")
    .eq("profile_id", profileId)
    .eq("event_id", eventId)
    .is("superseded_at", null)
    .maybeSingle();

  if (status !== "yes") {
    if (!existing) return unchanged;
    // Ook uit intervals.icu halen; anders blijft daar een training staan voor
    // een event waar het lid zich net voor heeft afgemeld.
    if (existing.intervals_event_id) {
      const { data: conn } = await admin
        .from("intervals_connections")
        .select("api_key, athlete_id")
        .eq("profile_id", profileId)
        .maybeSingle();
      if (conn?.api_key && conn.athlete_id) {
        await deleteIntervalsWorkoutEvent(
          conn.api_key,
          conn.athlete_id,
          existing.intervals_event_id,
        ).catch(() => null);
      }
    }
    await admin.from("training_workouts").delete().eq("id", existing.id);
    // De warming-up die het lid bij deze race had klaargezet gaat mee weg.
    await removeRaceWarmup(admin, profileId, existing.id).catch(() => null);
    return { inserted: false, removed: true, pushed: false };
  }

  // Staat hij er al? Dan geen tweede blok — de unieke index zou dat toch
  // weigeren. Wél alsnog doorzetten als hij nooit in intervals.icu is beland;
  // zo repareert een tweede keer 'ja' een blok dat in ZWB stond maar niet op de
  // fietscomputer.
  if (existing) {
    if (existing.intervals_event_id) return unchanged;
    const { ok } = await pushWorkoutToIntervals(admin, existing.id).catch(() => ({ ok: false }));
    return { inserted: false, removed: false, pushed: ok };
  }

  const { data: row } = await admin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle();
  if (!row) return unchanged;
  const [event] = await withParentRoutes(admin, [row as ClubEventRow]);

  // Zonder lopend schema is er niets om het blok in te hangen. De toezegging is
  // dan wel vastgelegd, en zodra er een schema komt pakt de planner het event op
  // via committedEventsForAi.
  const plan = await activeBasePlan(admin, profileId);
  if (!plan) return unchanged;

  const { durationMinutes, intensity } = eventWorkoutDefaults(event);
  const blocks = eventWorkoutBlocks(event);
  const slug = String(event.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48);

  const { data: created, error } = await admin
    .from("training_workouts")
    .insert({
      plan_id: plan.id,
      profile_id: profileId,
      trainer_id: plan.trainer_id,
      event_id: eventId,
      scheduled_at: new Date(event.start_at as string).toISOString(),
      title: event.title,
      description: `Clubevent: ${event.title}.`,
      duration_minutes: durationMinutes,
      intensity,
      target_type: "free",
      structure_json: blocks,
      origin: "event",
      publish_status: "pending",
      intervals_external_id: `zwb-${plan.id}-${String(event.start_at).slice(0, 10)}-${slug}`,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Meteen doorzetten naar intervals.icu. Zonder dit bleef het blok op
  // 'pending' staan: het hangt aan het lópende basisplan, terwijl de herziening
  // die erna draait een níéuw afgeleid plan publiceert en alleen díens workouts
  // pusht. Het event viel zo tussen wal en schip en stond wel in ZWB, maar niet
  // op de fietscomputer.
  const { ok } = await pushWorkoutToIntervals(admin, created.id).catch(() => ({ ok: false }));
  return { inserted: true, removed: false, pushed: ok };
}

export type EventWorkoutRefresh = { updated: number; pushed: number; failed: number };

/**
 * Rekent de nog niet gereden eventblokken opnieuw uit en zet de gewijzigde door
 * naar intervals.icu.
 *
 * Een eventblok werd één keer gemaakt, bij de toezegging, en daarna nooit meer
 * aangeraakt. Bij de ZRL is dat precies het verkeerde moment: de teamrace staat
 * er dan nog zonder route, en de Zwift-link met afstand en ronden komt pas een
 * week voor de race. Alle ZRL-blokken bleven zo op het uur en de 100 TSS van de
 * terugval staan, ook nadat de route bekend was.
 *
 * Met `eventIds` alleen die events en de teamevents eronder (een route op de
 * raceweek geldt ook voor de teamraces); zonder alle komende events. Alleen
 * blokken die nog uit één eventblok bestaan: een blok dat iemand heeft
 * opgeknipt, blijft zoals het is.
 *
 * Doorzetten gebeurt tot `deadline`. Wat er dan nog ligt, staat op 'pending' en
 * gaat mee met de volgende ronde; ook dat is waar de dagelijkse cron dit voor
 * aanroept.
 */
export async function refreshEventWorkouts(
  admin: Admin,
  options: { eventIds?: string[]; deadline?: number } = {},
): Promise<EventWorkoutRefresh> {
  const result: EventWorkoutRefresh = { updated: 0, pushed: 0, failed: 0 };
  const now = new Date();

  let eventFilter: string[] | null = null;
  if (options.eventIds) {
    if (options.eventIds.length === 0) return result;
    const { data: children } = await admin
      .from("events")
      .select("id")
      .in("parent_event_id", options.eventIds);
    eventFilter = [...new Set([...options.eventIds, ...(children ?? []).map((c) => c.id as string)])];
  }

  let query = admin
    .from("training_workouts")
    .select(
      "id, event_id, duration_minutes, intensity, structure_json, intervals_event_id, publish_status",
    )
    .eq("origin", "event")
    .eq("status", "planned")
    .is("superseded_at", null)
    .not("event_id", "is", null)
    .gte("scheduled_at", now.toISOString().slice(0, 10));
  if (eventFilter) query = query.in("event_id", eventFilter);
  const { data: workouts } = await query;
  if (!workouts || workouts.length === 0) return result;

  const { data: rows } = await admin
    .from("events")
    .select(EVENT_COLUMNS)
    .in("id", [...new Set(workouts.map((w) => w.event_id as string))]);
  const events = await withParentRoutes(admin, (rows ?? []) as ClubEventRow[]);
  const byId = new Map(events.map((event) => [event.id, event]));

  const toPush: string[] = [];
  for (const workout of workouts) {
    const event = byId.get(workout.event_id as string);
    // Een race die al begonnen is, rekenen we niet meer om: dan kan de rit al
    // aan het blok hangen.
    if (!event || new Date(event.start_at).getTime() <= now.getTime()) continue;

    const current = normalizeWorkoutBlocks(
      workout.structure_json,
      workout.intensity as WorkoutIntensity,
    );
    let publishStatus = workout.publish_status as string;
    if (current.length === 1) {
      const blocks = eventWorkoutBlocks(event);
      const { durationMinutes, intensity } = eventWorkoutDefaults(event);
      const same =
        Number(workout.duration_minutes) === durationMinutes &&
        workout.intensity === intensity &&
        JSON.stringify(current) === JSON.stringify(blocks);
      if (!same) {
        publishStatus = workout.intervals_event_id ? "pending" : publishStatus;
        const { error } = await admin
          .from("training_workouts")
          .update({
            duration_minutes: durationMinutes,
            intensity,
            structure_json: blocks,
            publish_status: publishStatus,
          })
          .eq("id", workout.id)
          .eq("status", "planned")
          .is("superseded_at", null);
        if (!error) result.updated += 1;
      }
    }
    if (workout.intervals_event_id && publishStatus === "pending") toPush.push(workout.id as string);
  }

  for (const id of toPush) {
    if (options.deadline != null && Date.now() > options.deadline) break;
    const { ok } = await pushWorkoutToIntervals(admin, id).catch(() => ({ ok: false }));
    if (ok) result.pushed += 1;
    else result.failed += 1;
  }
  return result;
}
