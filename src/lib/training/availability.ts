// Beschikbaarheid van een lid: hoeveel minuten het per weekdag kan trainen.
//
// Tot 0115 zat dat in training_goals.available_days — een lijst weekdagen zonder
// tijd, één keer ingevuld bij het doel. De planner wist daardoor wél dat dinsdag
// kon, maar niet of dat 45 of 120 minuten was.
//
// Er zijn drie bronnen, in deze volgorde: de rij voor die specifieke week, de
// standaardrij van het lid, en anders het oude available_days. Die laatste kent
// geen minuten; een aangevinkte dag blijft daar dus onbeperkt.

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export const WEEKDAY_SLUGS = ["ma", "di", "wo", "do", "vr", "za", "zo"] as const;
export type WeekdaySlug = (typeof WEEKDAY_SLUGS)[number];

export const WEEKDAY_LABELS: Record<WeekdaySlug, string> = {
  ma: "Maandag",
  di: "Dinsdag",
  wo: "Woensdag",
  do: "Donderdag",
  vr: "Vrijdag",
  za: "Zaterdag",
  zo: "Zondag",
};

/** De schuifbalk loopt in kwartieren tot zes uur; daarboven is het geen dagritje meer. */
export const AVAILABILITY_STEP_MINUTES = 15;
export const AVAILABILITY_MAX_MINUTES = 360;

export type MinutesByDay = Partial<Record<WeekdaySlug, number>>;

export type AvailabilitySource = "week" | "default" | "goal";

export type Availability = {
  /** Maandag van de week, of null bij het standaardpatroon. */
  weekStart: string | null;
  minutesByDay: MinutesByDay;
  source: AvailabilitySource;
};

/** Eén week die het lid apart heeft ingevuld. */
export type AvailabilityWeekMinutes = {
  /** Maandag van de week. */
  weekStart: string;
  minutesByDay: MinutesByDay;
};

/**
 * De beschikbaarheid over een heel planvenster: de weken met een eigen rij, plus
 * het standaardpatroon dat voor alle andere weken geldt.
 */
export type AvailabilityPlan = {
  default: MinutesByDay | null;
  weeks: AvailabilityWeekMinutes[];
};

/**
 * Maandag van de week waarin `dayKey` valt, als "YYYY-MM-DD". Spiegelbeeld van
 * endOfWeekKey() in zwbeterworden.ts, inclusief de UTC-truc op 12:00 zodat een
 * zomertijdgrens de dag niet laat verspringen.
 */
export function mondayKey(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00Z`);
  // getUTCDay(): 0 = zondag. Maandag telt als dag 1, dus zondag is dag 7.
  const daysSinceMonday = (date.getUTCDay() || 7) - 1;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

/** Dezelfde weekdag, `weeks` weken verder (of terug bij een negatief getal). */
export function shiftWeeks(dayKey: string, weeks: number): string {
  const date = new Date(`${dayKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
}

/** Weekdag-slug van een datum ("2026-08-10" → "ma"). */
export function weekdayOf(dayKey: string): WeekdaySlug {
  const date = new Date(`${dayKey}T12:00:00Z`);
  return WEEKDAY_SLUGS[(date.getUTCDay() || 7) - 1];
}

/** Rondt af op kwartieren en houdt de waarde binnen de grenzen van de schuifbalk. */
export function clampMinutes(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const stepped = Math.round(n / AVAILABILITY_STEP_MINUTES) * AVAILABILITY_STEP_MINUTES;
  return Math.min(AVAILABILITY_MAX_MINUTES, stepped);
}

export function normalizeMinutesByDay(value: unknown): MinutesByDay {
  const raw = (value ?? {}) as Record<string, unknown>;
  const result: MinutesByDay = {};
  for (const day of WEEKDAY_SLUGS) {
    if (raw[day] == null) continue;
    result[day] = clampMinutes(raw[day]);
  }
  return result;
}

/** Uit het oude available_days: aangevinkt = beschikbaar zonder minutenlimiet. */
function fromAvailableDays(days: string[] | null | undefined): MinutesByDay {
  const available = new Set(days ?? []);
  const result: MinutesByDay = {};
  for (const day of WEEKDAY_SLUGS) {
    if (!available.has(day)) result[day] = 0;
  }
  return result;
}

/**
 * De beschikbaarheid die geldt voor een bepaalde week. `weekStart` mag elke dag
 * uit die week zijn; hij wordt naar de maandag getrokken.
 */
export async function loadAvailability(
  admin: Admin,
  profileId: string,
  weekStart: string | null,
): Promise<Availability> {
  const week = weekStart ? mondayKey(weekStart) : null;

  const { data: rows } = await admin
    .from("training_availability")
    .select("week_start, minutes_by_day")
    .eq("profile_id", profileId)
    .or(week ? `week_start.eq.${week},week_start.is.null` : "week_start.is.null");

  const forWeek = week ? (rows ?? []).find((row) => row.week_start === week) : undefined;
  if (forWeek) {
    return {
      weekStart: week,
      minutesByDay: normalizeMinutesByDay(forWeek.minutes_by_day),
      source: "week",
    };
  }

  const fallback = (rows ?? []).find((row) => row.week_start == null);
  if (fallback) {
    return {
      weekStart: week,
      minutesByDay: normalizeMinutesByDay(fallback.minutes_by_day),
      source: "default",
    };
  }

  const { data: goal } = await admin
    .from("training_goals")
    .select("available_days")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    weekStart: week,
    minutesByDay: fromAvailableDays(goal?.available_days as string[] | null),
    source: "goal",
  };
}

/**
 * Alle beschikbaarheid die in een planvenster geldt: elke week met een eigen rij
 * plus het standaardpatroon voor de rest.
 *
 * Deze functie bestond eerst niet, en dat was precies het probleem: de planner
 * kreeg via loadAvailability() alleen de week van vandaag mee en legde die over
 * elke week tot de doeldatum. Vulde een lid volgende week in, dan zag het schema
 * daar niets van terug.
 */
export async function loadAvailabilityRange(
  admin: Admin,
  profileId: string,
  from: string,
  to: string,
): Promise<AvailabilityPlan> {
  const firstWeek = mondayKey(from);
  const lastWeek = mondayKey(to);

  const { data: rows } = await admin
    .from("training_availability")
    .select("week_start, minutes_by_day")
    .eq("profile_id", profileId)
    .or(`and(week_start.gte.${firstWeek},week_start.lte.${lastWeek}),week_start.is.null`)
    .order("week_start", { ascending: true });

  const weeks: AvailabilityWeekMinutes[] = [];
  let fallback: MinutesByDay | null = null;

  for (const row of rows ?? []) {
    if (row.week_start == null) {
      fallback = normalizeMinutesByDay(row.minutes_by_day);
      continue;
    }
    // Ook hier filteren en niet alleen in de query: een week buiten het venster
    // hoort de planner niet te zien, wat de kolom ook teruggeeft.
    const week = String(row.week_start).slice(0, 10);
    if (week < firstWeek || week > lastWeek) continue;
    weeks.push({ weekStart: week, minutesByDay: normalizeMinutesByDay(row.minutes_by_day) });
  }

  weeks.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  return { default: fallback, weeks };
}

/**
 * Beschikbaarheid in de vorm die de AI-prompt verwacht, voor het hele bereik dat
 * gepland wordt. Heeft het lid niets ingevuld — geen weekrij en geen standaard —
 * dan geven we niets mee: dan geldt het oude available_days, dat zit al in
 * goal.availableDays, en als minutenlijst zou het een harde limiet worden.
 */
export async function availabilityForAi(
  admin: Admin,
  profileId: string,
  from: string,
  to: string,
) {
  const plan = await loadAvailabilityRange(admin, profileId, from, to).catch(() => null);
  if (!plan) return null;
  if (!plan.default && plan.weeks.length === 0) return null;
  return {
    default: (plan.default ?? null) as Record<string, number> | null,
    weeks: plan.weeks.map((week) => ({
      weekStart: week.weekStart,
      minutesByDay: week.minutesByDay as Record<string, number>,
    })),
  };
}

/**
 * Wat er in een bereik vastligt: ritten die het lid zelf heeft ingepland,
 * clubevents die het heeft toegezegd en ingeplande tests. De planner mag ze niet
 * vervangen of verplaatsen, alleen de rest eromheen zetten.
 */
export async function loadFixedWorkouts(
  admin: Admin,
  profileId: string,
  from: string,
  to: string,
) {
  const { data } = await admin
    .from("training_workouts")
    .select("scheduled_at, title, duration_minutes, intensity, origin, test_type")
    .eq("profile_id", profileId)
    .in("origin", ["member", "event"])
    .eq("status", "planned")
    .is("superseded_at", null)
    .gte("scheduled_at", `${from}T00:00:00`)
    .lte("scheduled_at", `${to}T23:59:59`)
    .order("scheduled_at", { ascending: true });

  return (data ?? []).map((workout) => ({
    date: String(workout.scheduled_at).slice(0, 10),
    title: workout.title as string,
    durationMinutes: Number(workout.duration_minutes ?? 0),
    intensity: workout.intensity as string,
    kind: workout.test_type
      ? ("ftp_test" as const)
      : workout.origin === "event"
        ? ("clubevent" as const)
        : ("eigen_rit" as const),
  }));
}
