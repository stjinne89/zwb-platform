// Clubevents in het trainingsschema.
//
// De planner kreeg tot nu toe elk aankomend event mee en zette het als sessie in
// het schema, ook bij een lid dat zich niet had opgegeven. Alleen een 'ja' in
// event_rsvps is een toezegging; de rest is hooguit een suggestie waar het lid
// zelf over gaat.

import type { createAdminClient } from "@/lib/supabase/admin";
import { deleteIntervalsWorkoutEvent } from "@/lib/intervals/client";
import { activeBasePlan } from "@/lib/training/active-plan";
import { normalizeWorkoutBlocks, type WorkoutIntensity } from "@/lib/training/workouts";

type Admin = ReturnType<typeof createAdminClient>;

export type ClubEventRow = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  end_at: string | null;
  distance_km: number | string | null;
  elevation_m: number | null;
};

/**
 * Wat een event in het schema wordt als het lid meedoet. De duur komt bij
 * voorkeur uit de eindtijd, dan uit afstand + hoogtemeters, en pas daarna uit
 * een typegemiddelde — een clubrit van 80 km is nu eenmaal iets anders dan een
 * ZRL van drie kwartier.
 *
 * `gran_fondo` en `zwift` ontbraken hier tot 2026-08-18 en vielen daardoor terug
 * op `outdoor`. Bij een gran fondo neemt de afstand de duur meestal over, maar
 * de intensiteit bleef zo hangen op die van een gewone buitenrit.
 */
const EVENT_DEFAULTS: Record<string, { minutes: number; intensity: WorkoutIntensity }> = {
  zrl: { minutes: 60, intensity: "race" },
  ladder: { minutes: 60, intensity: "race" },
  flamme_rouge: { minutes: 60, intensity: "race" },
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

export function eventWorkoutDefaults(event: ClubEventRow): {
  durationMinutes: number;
  intensity: WorkoutIntensity;
} {
  const fallback = EVENT_DEFAULTS[event.type] ?? EVENT_DEFAULTS.outdoor;

  const start = new Date(event.start_at).getTime();
  const end = event.end_at ? new Date(event.end_at).getTime() : null;
  const fromEnd =
    end != null && Number.isFinite(end) && end > start
      ? Math.round((end - start) / 60_000)
      : null;

  const minutes =
    fromEnd ?? estimateEventMinutes(event.distance_km, event.elevation_m) ?? fallback.minutes;
  return {
    durationMinutes: Math.min(MAX_EVENT_MINUTES, Math.max(20, minutes)),
    intensity: fallback.intensity,
  };
}

export type ScheduleEvent = ClubEventRow & {
  /** 'yes' | 'maybe' | 'no' | null — null is nog niet beantwoord. */
  rsvp: string | null;
  /** Staat dit event al als blok in het schema? */
  inSchedule: boolean;
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
): Promise<ScheduleEvent[]> {
  const { data: events } = await admin
    .from("events")
    .select("id, title, type, start_at, end_at, distance_km, elevation_m")
    .gte("start_at", `${from}T00:00:00`)
    .lte("start_at", `${to}T23:59:59`)
    .order("start_at", { ascending: true })
    .limit(50);
  if (!events || events.length === 0) return [];

  const ids = events.map((event) => event.id as string);
  const [{ data: rsvps }, { data: workouts }] = await Promise.all([
    admin
      .from("event_rsvps")
      .select("event_id, status")
      .eq("profile_id", profileId)
      .in("event_id", ids),
    admin
      .from("training_workouts")
      .select("event_id")
      .eq("profile_id", profileId)
      .is("superseded_at", null)
      .in("event_id", ids),
  ]);

  const byEvent = new Map((rsvps ?? []).map((row) => [row.event_id as string, row.status as string]));
  const scheduled = new Set((workouts ?? []).map((row) => row.event_id as string));

  return (events as ClubEventRow[]).map((event) => ({
    ...event,
    rsvp: byEvent.get(event.id) ?? null,
    inSchedule: scheduled.has(event.id),
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
): Promise<{ inserted: boolean; removed: boolean }> {
  const unchanged = { inserted: false, removed: false };

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
    return { inserted: false, removed: true };
  }

  // Staat hij er al? Dan niets doen; de unieke index zou een tweede blok toch
  // weigeren.
  if (existing) return unchanged;

  const { data: event } = await admin
    .from("events")
    .select("id, title, type, start_at, end_at, distance_km, elevation_m")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return unchanged;

  // Zonder lopend schema is er niets om het blok in te hangen. De toezegging is
  // dan wel vastgelegd, en zodra er een schema komt pakt de planner het event op
  // via committedEventsForAi.
  const plan = await activeBasePlan(admin, profileId);
  if (!plan) return unchanged;

  const { durationMinutes, intensity } = eventWorkoutDefaults(event as ClubEventRow);
  const blocks = normalizeWorkoutBlocks(
    [
      {
        label: event.title as string,
        durationMinutes,
        target: "",
        notes: "Clubevent uit de ZWB-kalender.",
        intensity,
      },
    ],
    intensity,
  );
  const slug = String(event.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48);

  const { error } = await admin.from("training_workouts").insert({
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
  });
  if (error) throw new Error(error.message);
  return { inserted: true, removed: false };
}
