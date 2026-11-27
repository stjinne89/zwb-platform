// Een warming-up uit de bibliotheek bij een geplande race. Het lid kiest hem
// zelf; hij komt als eigen workout vlak voor de race te staan en gaat meteen
// naar intervals.icu, zodat hij in Zwift en op de fietscomputer klaarstaat.
//
// De koppeling met de race zit in intervals_external_id. Zo is er per race één
// warming-up, verdwijnt hij met de race mee en is er geen extra kolom nodig.

import type { createAdminClient } from "@/lib/supabase/admin";
import { deleteIntervalsWorkoutEvent } from "@/lib/intervals/client";

type Admin = ReturnType<typeof createAdminClient>;

const RACE_WARMUP_PREFIX = "zwb-warmup-";

/** Tijd tussen het einde van de warming-up en de start van de race. */
export const WARMUP_GAP_MINUTES = 5;

/** Vanaf deze duur is een race een lange wedstrijd. */
const LONG_RACE_MINUTES = 90;

export function raceWarmupExternalId(raceWorkoutId: string) {
  return `${RACE_WARMUP_PREFIX}${raceWorkoutId}`;
}

/** Het id van de race waar deze workout de warming-up van is, of null. */
export function warmupRaceId(workout: { intervals_external_id?: string | null }): string | null {
  const externalId = workout.intervals_external_id ?? "";
  return externalId.startsWith(RACE_WARMUP_PREFIX)
    ? externalId.slice(RACE_WARMUP_PREFIX.length)
    : null;
}

/** Een geplande race waar het lid nog een warming-up bij kan zetten. */
export function isUpcomingRace(
  workout: { intensity: string; status: string; superseded_at?: string | null; scheduled_at: string },
  todayKey: string,
) {
  return (
    workout.intensity === "race" &&
    workout.status === "planned" &&
    !workout.superseded_at &&
    String(workout.scheduled_at).slice(0, 10) >= todayKey
  );
}

/**
 * De warming-up die het best bij een race past, als voorkeuze. Uit de titel en
 * de duur: meer weet een workout niet over de race. Het lid kan altijd een
 * andere kiezen.
 */
export function suggestedWarmupTitle(race: { title: string; duration_minutes: number }): string {
  const title = race.title.toLowerCase();
  if (/\bttt\b|ploegentijdrit|team time trial/.test(title)) return "Warming-up ploegentijdrit";
  if (/\bi?tt\b|tijdrit|time trial|race of truth/.test(title)) return "Warming-up tijdrit";
  if (race.duration_minutes >= LONG_RACE_MINUTES) return "Warming-up lange wedstrijd";
  return "Warming-up wedstrijd";
}

/** Het begin van de warming-up, zodat hij kort voor de start van de race klaar is. */
export function warmupStart(raceScheduledAt: string, warmupMinutes: number): string {
  const race = new Date(raceScheduledAt);
  const start = new Date(race.getTime() - (warmupMinutes + WARMUP_GAP_MINUTES) * 60_000);
  // Een race vlak na middernacht: de warming-up blijft op de dag van de race.
  const sameDay = start.toISOString().slice(0, 10) === race.toISOString().slice(0, 10);
  return (sameDay ? start : race).toISOString();
}

export type WarmupOption = { id: string; title: string; durationMinutes: number };

type WarmupCandidate = {
  id: string;
  title: string;
  duration_minutes: number;
  status: string;
  intervals_external_id?: string | null;
  origin?: string | null;
  intensity?: string | null;
  scheduled_at?: string | null;
  superseded_at?: string | null;
};

/**
 * Een clubevent dat zo kort voor de race eindigt, is de warming-up: de
 * gezamenlijke ZWB-warming-up vóór de ZRL (een Zwift-groepstraining) eindigde
 * op 1 december 2026 elf minuten voor de start.
 */
export const CLUB_WARMUP_WINDOW_MINUTES = 30;

/**
 * Het clubevent in het schema dat als warming-up van deze race geldt: gepland,
 * geen race, en afgelopen binnen CLUB_WARMUP_WINDOW_MINUTES vóór de start. Puur.
 */
export function clubWarmupFor<T extends WarmupCandidate>(race: T, workouts: T[]): T | null {
  const raceStart = Date.parse(race.scheduled_at ?? "");
  if (!Number.isFinite(raceStart)) return null;
  const window = CLUB_WARMUP_WINDOW_MINUTES * 60_000;
  return (
    workouts.find((workout) => {
      if (workout.id === race.id || workout.origin !== "event" || workout.status !== "planned") return false;
      if (workout.superseded_at || workout.intensity === "race") return false;
      const start = Date.parse(workout.scheduled_at ?? "");
      if (!Number.isFinite(start) || start >= raceStart) return false;
      const end = start + Number(workout.duration_minutes) * 60_000;
      return end <= raceStart && raceStart - end <= window;
    }) ?? null
  );
}

/** Wat de keuze bij een race laat zien: de opties, de voorkeuze en wat er al staat. */
export function raceWarmupView<T extends WarmupCandidate>(race: T, workouts: T[], options: WarmupOption[]) {
  const suggested = suggestedWarmupTitle(race);
  const current = workouts.find(
    (workout) => warmupRaceId(workout) === race.id && workout.status === "planned",
  );
  // Een eigen warming-up gaat voor: die kan het lid hier ook weer weghalen.
  const club = current ? null : clubWarmupFor(race, workouts);
  return {
    options,
    suggestedId: options.find((option) => option.title === suggested)?.id ?? null,
    current: current
      ? { id: current.id, title: current.title, clubEvent: false }
      : club
        ? { id: club.id, title: club.title, clubEvent: true }
        : null,
  };
}

/**
 * De warming-ups uit de standaardbibliotheek. Via de service-role: de
 * bibliotheek zelf is door RLS alleen voor trainers leesbaar.
 */
export async function loadWarmupOptions(admin: Admin): Promise<WarmupOption[]> {
  const { data } = await admin
    .from("training_workout_templates")
    .select("id, title, duration_minutes")
    .eq("form", "warmup")
    .eq("is_standard", true)
    .order("duration_minutes", { ascending: false });
  return (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    durationMinutes: Number(row.duration_minutes),
  }));
}

/** Haalt de warming-up van een race weg, ook uit intervals.icu. */
export async function removeRaceWarmup(admin: Admin, profileId: string, raceWorkoutId: string) {
  const { data: warmups } = await admin
    .from("training_workouts")
    .select("id, intervals_event_id")
    .eq("profile_id", profileId)
    .eq("intervals_external_id", raceWarmupExternalId(raceWorkoutId));
  if (!warmups || warmups.length === 0) return;

  const eventIds = warmups.flatMap((row) => (row.intervals_event_id ? [row.intervals_event_id] : []));
  if (eventIds.length > 0) {
    const { data: conn } = await admin
      .from("intervals_connections")
      .select("api_key, athlete_id")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (conn?.api_key && conn.athlete_id) {
      for (const eventId of eventIds) {
        await deleteIntervalsWorkoutEvent(conn.api_key, conn.athlete_id, eventId).catch(() => null);
      }
    }
  }
  await admin
    .from("training_workouts")
    .delete()
    .in(
      "id",
      warmups.map((row) => row.id),
    );
}
