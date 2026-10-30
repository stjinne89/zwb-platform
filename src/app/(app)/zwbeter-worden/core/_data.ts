// Dataophaal voor het core- en mobiliteitsspoor.
//
// Bewust losse queries op de mobility_*-tabellen: dit spoor deelt geen enkele
// tabel met de fietspijplijn, dus er is hier niets uit training_workouts,
// compliance of de belastingberekening te halen — en dat moet zo blijven. De
// uitzondering is lezen: welke rit er vandaag is, en de krachttrainingen uit
// intervals_activities.

import {
  loadConnection,
  refreshIntervalsActivitiesIfStale,
  type Viewer,
} from "../_data";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { memberHiddenPlanIds } from "@/lib/training/member-hidden-plans";
import {
  MOBILITY_WINDOW_DAYS,
  shiftDayKey,
  type MobilityExercise,
  type MobilitySeries,
  type MobilitySeriesItem,
  type MobilitySession,
  type RecommendContext,
} from "@/lib/training/mobility";
import {
  INTERVALS_STRENGTH_TYPES,
  normalizeMuscleSelection,
  type IntervalsStrengthSession,
} from "@/lib/training/intervals-strength";

export { requireViewer, todayKeyAmsterdam } from "../_data";
export type { Viewer } from "../_data";

const EXERCISE_COLUMNS =
  "id, slug, title, category, region, cue_md, illustration_slug, media_json, default_hold_seconds, default_reps, is_unilateral, level";

const SERIES_COLUMNS =
  "id, slug, title, subtitle, goal, timing, duration_minutes, level, is_standard, owner_id";

export type SeriesWithItems = MobilitySeries & { items: MobilitySeriesItem[] };

/** Alle series die dit lid mag zien: de standaardset plus zijn eigen series.
 * De RLS-policy doet het filteren; hier hoeft niets extra's bij. */
export async function loadSeries(viewer: Viewer): Promise<SeriesWithItems[]> {
  const { data } = await viewer.supabase
    .from("mobility_series")
    .select(
      `${SERIES_COLUMNS}, items:mobility_series_items(id, series_id, sort_order, sets, reps, hold_seconds, rest_seconds, exercise:mobility_exercises(${EXERCISE_COLUMNS}))`,
    );

  const rows = (data ?? []) as unknown as SeriesWithItems[];
  return rows
    .map((series) => ({
      ...series,
      items: [...(series.items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    }))
    // Standaardseries eerst, daarna de eigen series op titel.
    .sort(
      (a, b) =>
        Number(b.is_standard) - Number(a.is_standard) ||
        a.title.localeCompare(b.title, "nl"),
    );
}

export async function loadSeriesBySlug(
  viewer: Viewer,
  slug: string,
): Promise<SeriesWithItems | null> {
  const all = await loadSeries(viewer);
  return all.find((series) => series.slug === slug) ?? null;
}

/** De hele oefeningenbibliotheek, voor de bibliotheekpagina en de bouwer. */
export async function loadExercises(viewer: Viewer): Promise<MobilityExercise[]> {
  const { data } = await viewer.supabase
    .from("mobility_exercises")
    .select(EXERCISE_COLUMNS)
    .order("category", { ascending: true })
    .order("title", { ascending: true });
  return (data ?? []) as unknown as MobilityExercise[];
}

/**
 * Wat er vandaag op de fiets gebeurt. Puur lezen: dit spoor schrijft nooit in
 * training_workouts of strava_activities, het kijkt alleen mee om de juiste
 * serie voor te stellen.
 */
export async function loadDayContext(
  viewer: Viewer,
  today: string,
): Promise<RecommendContext> {
  const from = `${shiftDayKey(today, -1)}T00:00:00Z`;
  const to = `${shiftDayKey(today, 2)}T00:00:00Z`;

  const [workouts, rides, hiddenIds] = await Promise.all([
    viewer.supabase
      .from("training_workouts")
      .select("scheduled_at, status, plan_id")
      .eq("profile_id", viewer.user.id)
      .is("superseded_at", null)
      .neq("status", "skipped")
      .gte("scheduled_at", from)
      .lt("scheduled_at", to),
    viewer.supabase
      .from("strava_activities")
      .select("start_date")
      .eq("profile_id", viewer.user.id)
      .gte("start_date", from)
      .lt("start_date", to),
    memberHiddenPlanIds(viewer.supabase, [viewer.user.id]),
  ]);

  const onToday = (value: string | null) =>
    Boolean(value) && amsterdamDayKey(new Date(value as string)) === today;

  return {
    hasPlannedWorkoutToday: (workouts.data ?? []).some(
      (row) =>
        !hiddenIds.has(row.plan_id as string) && onToday(row.scheduled_at as string | null),
    ),
    rodeToday: (rides.data ?? []).some((row) => onToday(row.start_date as string | null)),
  };
}

/** Afgevinkte sessies binnen het venster van 28 dagen, plus wat marge zodat
 * weeklyStreak ook de week ervóór nog kan beoordelen. */
export async function loadSessions(
  viewer: Viewer,
  today: string,
): Promise<MobilitySession[]> {
  const from = shiftDayKey(today, -(MOBILITY_WINDOW_DAYS * 4));
  const { data } = await viewer.supabase
    .from("mobility_sessions")
    .select("id, series_id, completed_on, minutes, feel")
    .gte("completed_on", from)
    .order("completed_on", { ascending: false });
  return (data ?? []) as unknown as MobilitySession[];
}

/**
 * Krachttrainingen uit intervals.icu binnen het venster van 28 dagen, nieuwste
 * eerst, met de spieren die het lid heeft aangetikt. Is de opgeslagen lijst
 * ouder dan zes uur, dan eerst bijwerken: leden met Strava hebben geen uurlijkse
 * intervals-sync, en een gymsessie van vanochtend moet de krachtregel kennen.
 * Het blok op de ZWBeter-startpagina slaat dat over (`refresh: false`): die
 * pagina werkt de lijst zelf al bij.
 */
export async function loadIntervalsStrength(
  viewer: Viewer,
  today: string,
  { refresh = true }: { refresh?: boolean } = {},
): Promise<IntervalsStrengthSession[]> {
  if (refresh) {
    const conn = await loadConnection(viewer);
    if (conn?.api_key && conn.athlete_id) {
      await refreshIntervalsActivitiesIfStale(viewer, conn).catch(() => undefined);
    }
  }

  const from = shiftDayKey(today, -(MOBILITY_WINDOW_DAYS - 1));
  const [activities, choices] = await Promise.all([
    viewer.supabase
      .from("intervals_activities")
      .select("intervals_id, start_date_local, name, moving_time_seconds")
      .eq("profile_id", viewer.user.id)
      .in("type", [...INTERVALS_STRENGTH_TYPES])
      .gte("start_date_local", from)
      .lte("start_date_local", today)
      .order("start_date_local", { ascending: false }),
    // Zonder migratie 0292 bestaat deze tabel niet; dan alleen geen spieren.
    viewer.supabase
      .from("intervals_strength_muscles")
      .select("intervals_id, muscles")
      .eq("profile_id", viewer.user.id),
  ]);

  const musclesById = new Map(
    ((choices.error ? [] : choices.data) ?? []).map((row) => [
      row.intervals_id as string,
      normalizeMuscleSelection((row.muscles as string[] | null) ?? []),
    ]),
  );

  return (activities.data ?? []).map((row) => {
    const seconds = row.moving_time_seconds as number | null;
    return {
      intervalsId: row.intervals_id as string,
      day: String(row.start_date_local).slice(0, 10),
      name: (row.name as string | null) ?? null,
      minutes: seconds && seconds > 0 ? Math.round(seconds / 60) : null,
      muscles: musclesById.get(row.intervals_id as string) ?? [],
    };
  });
}
