// Wat voor dag het is op ZWBeter Vandaag. De pagina toonde elke dag dezelfde
// stapel: een gereden training bleef "eerstvolgende" en een rustdag kreeg de
// ritvoorbereiding. Deze ene afleiding bepaalt nu wat er bovenaan staat, welke
// groepen er zijn en in welke volgorde.

import { warmupRaceId } from "./race-warmup";

export type VandaagState = "training" | "race" | "gereden" | "rust" | "later" | "leeg";

/** De onderdelen van de pagina: hoe je ervoor staat, wat je gaat doen, wat je daarvoor nodig hebt, de rest van de dag. */
export type VandaagSection = "stand" | "dag" | "rit" | "ook";

type DayWorkout = {
  scheduled_at: string;
  status: string;
  intensity: string;
  intervals_external_id?: string | null;
};

export type VandaagDay<W> = {
  state: VandaagState;
  /** De training van vandaag die nog gereden moet worden. */
  open: W | null;
  /** De gereden of vervallen training als de dag daarmee klaar is. */
  closed: W | null;
  /** De eerste open training na vandaag. */
  next: W | null;
};

const dayKeyOf = (workout: DayWorkout) => String(workout.scheduled_at).slice(0, 10);

// Een geplande rustdag staat ook als workout in het schema, maar valt niet te rijden.
const isOpen = (workout: DayWorkout) =>
  workout.status === "planned" && workout.intensity !== "rest";

/**
 * `workouts` staat op datum oplopend (loadMemberWorkouts). `nextIntervalsDay` is
 * de dag van het eerstvolgende eigen event in intervals.icu, dat niet uit het
 * schema komt. Een open training gaat voor alles: wie 's ochtends reed en 's
 * avonds nog een training heeft, is nog niet klaar.
 */
export function vandaagDay<W extends DayWorkout>(
  workouts: W[],
  todayKey: string,
  nextIntervalsDay: string | null,
): VandaagDay<W> {
  // Een warming-up hoort bij zijn race en is geen training van zichzelf.
  const own = workouts.filter((workout) => !warmupRaceId(workout));
  const onToday = own.filter((workout) => dayKeyOf(workout) === todayKey);
  const open = onToday.find(isOpen) ?? null;
  const next = own.find((workout) => dayKeyOf(workout) > todayKey && isOpen(workout)) ?? null;
  const done = onToday.filter((workout) => workout.status === "completed").at(-1) ?? null;
  const rest =
    onToday.find((workout) => workout.status === "skipped" || workout.intensity === "rest") ?? null;

  if (open) {
    return { state: open.intensity === "race" ? "race" : "training", open, closed: null, next };
  }
  if (done) return { state: "gereden", open: null, closed: done, next };
  if (nextIntervalsDay === todayKey) return { state: "training", open: null, closed: null, next };
  if (rest) return { state: "rust", open: null, closed: rest, next };
  if (next || nextIntervalsDay) return { state: "later", open: null, closed: null, next };
  return { state: "leeg", open: null, closed: null, next: null };
}

/** De volgorde is elke dag gelijk; alleen zonder rit vervalt de ritvoorbereiding. */
export function vandaagSections(state: VandaagState): VandaagSection[] {
  return hasRideToday(state) ? ["stand", "dag", "rit", "ook"] : ["stand", "dag", "ook"];
}

/** De kaart toont een training die nog moet komen, met alles wat erbij hoort. */
export function hasTrainingAhead(state: VandaagState): boolean {
  return state === "training" || state === "race" || state === "later";
}

/** Vandaag wordt er nog gereden, dus de ritvoorbereiding is aan de orde. */
export function hasRideToday(state: VandaagState): boolean {
  return state === "training" || state === "race";
}

/** Na de rit of op een rustdag is bandendruk niet aan de orde. */
export function showsTirePressure(state: VandaagState): boolean {
  return state !== "gereden" && state !== "rust";
}
