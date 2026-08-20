// Core & mobiliteit: pure logica voor de bibliotheek, de series en het afvinken.
//
// Dit spoor staat bewust los van de fietspijplijn. Er zit hier dus géén
// belastingberekening in: een core-sessie telt niet mee in TSS, CTL of naleving.
// Zie supabase/migrations/0109_mobility_library.sql voor het waarom.
//
// Alle datums zijn dagsleutels ("YYYY-MM-DD") in Amsterdamse tijd, net als
// todayKeyAmsterdam() in de ZWBeter Worden-pagina's. Zo hoeft geen enkele
// functie hier een tijdzone te kennen.

export type MobilityCategory = "core" | "mobiliteit" | "activatie";
export type MobilityRegion = "lumbaal" | "heup" | "thoracaal" | "schouder" | "enkel";
export type MobilityGoal = "stabiliteit" | "mobiliteit" | "houding";
export type MobilityTiming = "pre_ride" | "post_ride" | "rustdag";

/** Alternatief beeld per oefening. Leeg bij oplevering: het beeld zit in het
 * figuurregister. Dit is de naad om later foto's, video of ingekochte animaties
 * per oefening te hangen zonder schemawijziging. */
export type MobilityMedia = {
  kind: "photo" | "video" | "animation";
  src: string;
  alt: string;
  position: number;
};

export type MobilityExercise = {
  id: string;
  slug: string;
  title: string;
  category: MobilityCategory;
  region: MobilityRegion;
  cue_md: string;
  illustration_slug: string | null;
  media_json: MobilityMedia[];
  default_hold_seconds: number | null;
  default_reps: number | null;
  is_unilateral: boolean;
  level: number;
};

export type MobilitySeries = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  goal: MobilityGoal;
  timing: MobilityTiming;
  duration_minutes: number;
  level: number;
  is_standard: boolean;
  owner_id: string | null;
};

export type MobilitySeriesItem = {
  id: string;
  series_id: string;
  sort_order: number;
  sets: number;
  reps: number | null;
  hold_seconds: number | null;
  rest_seconds: number;
  exercise: MobilityExercise;
};

export type MobilitySession = {
  id: string;
  series_id: string;
  completed_on: string;
  minutes: number | null;
  feel: "goed" | "neutraal" | "zwaar" | null;
};

/** Een herhaling duurt ongeveer drie seconden als je hem gecontroleerd
 * uitvoert — dat is de hele bedoeling bij dit werk, dus rekenen we er ook zo
 * mee. */
const SECONDS_PER_REP = 3;

/** Doel uit de literatuur: programma's van minimaal vier weken, twee tot drie
 * sessies per week. Beide getallen sturen de voortgangsweergave. */
export const MOBILITY_WINDOW_DAYS = 28;
export const MOBILITY_SESSIONS_PER_WEEK = 2;

/** Werktijd van één item in seconden, inclusief rust en beide kanten bij een
 * eenzijdige oefening. */
export function itemSeconds(item: MobilitySeriesItem): number {
  const perSet =
    item.hold_seconds ?? (item.reps ?? 0) * SECONDS_PER_REP;
  const sides = item.exercise.is_unilateral ? 2 : 1;
  return item.sets * sides * (perSet + item.rest_seconds);
}

/**
 * Korte notatie van één item, voor een lijstje waar geen ruimte is voor een hele
 * zin: "2×8", "2×40s", en bij een eenzijdige oefening "p/k" (per kant) erachter.
 */
export function itemLabel(item: MobilitySeriesItem): string {
  const perSet =
    item.hold_seconds != null
      ? `${item.hold_seconds}s`
      : item.reps != null
        ? String(item.reps)
        : null;
  const base = perSet ? `${item.sets}×${perSet}` : `${item.sets} sets`;
  return item.exercise.is_unilateral ? `${base} p/k` : base;
}

/** Geschatte duur van een serie, naar boven afgerond op hele minuten. Wordt
 * gebruikt voor zelfgemaakte series; de standaardset heeft een vaste duur uit
 * de seed. */
export function seriesMinutes(items: MobilitySeriesItem[]): number {
  const seconds = items.reduce((total, item) => total + itemSeconds(item), 0);
  return Math.max(1, Math.ceil(seconds / 60));
}

/** Dagsleutel `days` dagen vóór `dayKey`. Rekent in UTC zodat zomertijd de
 * uitkomst niet verschuift — de sleutels zelf zijn al Amsterdamse dagen. */
export function shiftDayKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Sessies binnen het venster van 28 dagen, inclusief vandaag. */
export function sessionsLast28Days(
  sessions: MobilitySession[],
  today: string,
): MobilitySession[] {
  const from = shiftDayKey(today, -(MOBILITY_WINDOW_DAYS - 1));
  return sessions.filter(
    (session) => session.completed_on >= from && session.completed_on <= today,
  );
}

/**
 * Aantal aaneengesloten weken waarin het doel gehaald is, terugtellend vanaf
 * vandaag in blokken van zeven dagen.
 *
 * Bewust geen dagenstreak: het doel is twee tot drie sessies per week, dus een
 * dagteller zou bij een correct uitgevoerd programma elke dag breken.
 *
 * De lopende week telt pas mee als hij vol is, maar breekt de reeks niet. Anders
 * stond er elke maandagochtend "nog geen reeks" bij iemand die het al een maand
 * volhoudt — en juist daar is de teller voor bedoeld.
 */
export function weeklyStreak(
  sessions: MobilitySession[],
  today: string,
  perWeek = MOBILITY_SESSIONS_PER_WEEK,
): number {
  const days = new Set(sessions.map((session) => session.completed_on));
  let streak = 0;

  for (let week = 0; ; week++) {
    const end = shiftDayKey(today, -week * 7);
    const start = shiftDayKey(end, -6);
    let count = 0;
    for (const day of days) {
      if (day >= start && day <= end) count++;
    }
    if (count < perWeek) {
      // Week 0 loopt nog; wat daar (nog) niet staat zegt niets over de weken
      // ervoor.
      if (week === 0) continue;
      return streak;
    }
    streak++;
    // Zonder bovengrens zou een lege sessielijst hier niet uitkomen; die valt
    // al bij week 0 af, maar de grens houdt de lus hoe dan ook eindig.
    if (week > 520) return streak;
  }
}

/** Laatste keer dat deze serie gedaan is, of null. */
export function lastDoneOn(
  sessions: MobilitySession[],
  seriesId: string,
): string | null {
  return sessions
    .filter((session) => session.series_id === seriesId)
    .map((session) => session.completed_on)
    .sort()
    .at(-1) ?? null;
}

export type RecommendContext = {
  /** Staat er vandaag een workout in het schema? */
  hasPlannedWorkoutToday: boolean;
  /** Is er vandaag al gereden? Dan is de rit-voorbereiding niet meer nuttig. */
  rodeToday: boolean;
};

/**
 * Welke serie past vandaag. Bewust regelgebaseerd en niet via de AI: off-bike
 * werk hoort niet in de trainingsprompt, en een vaste regel is hier net zo goed
 * én uitlegbaar.
 *
 * Bij een rustdag kiest hij tussen de twee rustdagseries op wat het langst
 * geleden is, zodat het programma vanzelf afwisselt.
 */
export function recommendSeries<T extends MobilitySeries>(
  series: T[],
  sessions: MobilitySession[],
  today: string,
  context: RecommendContext,
): T | null {
  if (series.length === 0) return null;
  const bySlug = (slug: string) => series.find((row) => row.slug === slug) ?? null;

  if (context.rodeToday) {
    const post = bySlug("na-de-rit") ?? series.find((row) => row.timing === "post_ride");
    if (post) return post;
  }

  if (context.hasPlannedWorkoutToday && !context.rodeToday) {
    const pre = bySlug("voor-de-rit") ?? series.find((row) => row.timing === "pre_ride");
    if (pre) return pre;
  }

  const restDay = series.filter((row) => row.timing === "rustdag");
  if (restDay.length === 0) return series[0];

  // Nooit gedaan telt als het langst geleden.
  return restDay
    .map((row) => ({ row, last: lastDoneOn(sessions, row.id) ?? "" }))
    .sort((a, b) => a.last.localeCompare(b.last) || a.row.slug.localeCompare(b.row.slug))[0].row;
}
