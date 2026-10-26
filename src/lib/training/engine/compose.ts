// Samenstellen: de weken uit de periodisering worden workouts op dagen. Per
// week kiest dit de trainingsdagen, de lange rit, de sleutelsessies en de dag
// vóór een race, verdeelt het weekvolume over die dagen en laat de catalogus
// elke sessie uitschrijven. Regels uit defaultTrainingPrompt() en
// planUpdatePrompt() in src/lib/training/workouts.ts; ontwerp in
// docs/eigen-regelmotor.md ("Samenstellen").
//
// Keuzes van de motor, niet uit de prompt (de prompt laat ze aan de AI):
// - Een aangevinkte dag zonder minuten krijgt hooguit UNBOUNDED_DAY_MINUTES.
// - De overgangsperiode duurt TRANSITION_DAYS na het laatste A/B-mikpunt.
// - Een FTP-test telt als sleutelsessie van zijn week, net als een race.

import {
  datesBetween,
  daysBetween,
  eventsOn,
  fixedOn,
  isRaceOrTestDay,
  minutesOn,
  mondayKey,
  periodOn,
  shiftDays,
  weekdayOf,
} from "@/lib/training/engine/calendar";
import { recoverySignals } from "@/lib/training/engine/signals";
import { sessionToWorkout } from "@/lib/training/engine/workout";
import type {
  ComposeArgs,
  EngineReason,
  EngineResult,
  GeneratedWorkout,
  PlanWindow,
  SessionForm,
  TrainingAiInput,
  WeekKind,
  WeekPlan,
} from "@/lib/training/engine/types";
import { OPTIONAL_REST_RIDE_MINUTES } from "@/lib/training/workouts";

/** Aangevinkte dag zonder minuten (goal.availableDays): zo lang mag een sessie hooguit. */
const UNBOUNDED_DAY_MINUTES = 300;
/** Kampdag zonder eigen weekrij in availability.weeks: het lid heeft de hele dag. */
const CAMP_DAY_MINUTES = 360;
/** Openers vóór een race of test: kort, de rest van de dag is rust. */
const OPENERS_MINUTES = 60;
/** Korter is geen zinvolle rit; minder minuten in de week geeft minder ritten. */
const MIN_RIDE_MINUTES = 30;
/** Een opbouwweek groeit hooguit een kwart ten opzichte van de vorige (prompt). */
const MAX_WEEK_GROWTH = 1.25;
/** Zoveel langer dan gewend mag de gemiddelde rit worden voordat er een rit bij komt. */
const AVG_DURATION_STRETCH = 1.5;
/** Overgangsperiode: de weken die binnen zoveel dagen na het laatste A/B-mikpunt beginnen. */
const TRANSITION_DAYS = 28;
/** Geen overgang als er binnen zoveel dagen een nieuw A/B-mikpunt ligt. */
const TRANSITION_GAP_DAYS = 42;

const HARD_INTENSITIES = new Set(["threshold", "vo2max", "anaerobic", "race"]);
const DUUR_FORMS = new Set<SessionForm>(["rustige_duur", "intensieve_duur", "lange_duur"]);
const HEAT_PROTOCOLS = new Set(["hitte-kort", "hitte-lang"]);
const LOW_CADENCE_PROTOCOL = "lage-cadans-vo2max";

type KeySlot = { forms: SessionForm[]; /** Een race vult dit slot. */ race?: boolean };

const ZRL_SLOTS: KeySlot[] = [
  { forms: ["vo2max", "anaeroob"], race: true },
  { forms: ["drempel", "sweetspot"] },
];
const BASE_SLOTS: KeySlot[] = [{ forms: ["sweetspot", "tempo"] }, { forms: ["tempo", "sweetspot"] }];
const EVENT_SLOTS: KeySlot[] = [{ forms: ["sweetspot", "drempel"] }, { forms: ["drempel", "sweetspot"] }];

/** Sleutelvormen per goal.type; de variant (weekindex) wisselt binnen een slot. */
const KEY_SLOTS: Record<string, KeySlot[]> = {
  zrl: ZRL_SLOTS,
  ladder: ZRL_SLOTS,
  ftp: [{ forms: ["drempel"] }, { forms: ["vo2max"], race: true }],
  base_fitness: BASE_SLOTS,
  gran_fondo: EVENT_SLOTS,
  outdoor_event: EVENT_SLOTS,
  rebuild: [{ forms: ["tempo", "sweetspot"] }, { forms: ["sweetspot", "tempo"] }],
};

const FORM_LABELS: Record<SessionForm, string> = {
  herstel: "herstel",
  rustige_duur: "rustige duur",
  intensieve_duur: "intensieve duur",
  lange_duur: "lange duurrit",
  tempo: "tempo",
  sweetspot: "sweet spot",
  drempel: "drempel",
  vo2max: "VO2max",
  anaeroob: "anaeroob",
  sprint: "sprints",
  openers: "openers",
};

const MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

function dayLabel(date: string): string {
  return `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
}

type Role = "lang" | "openers" | "sleutel" | "duur" | "overgang";

type DayPlan = { date: string; role: Role; form: SessionForm; minutes: number; cap: number };

type State = {
  input: TrainingAiInput;
  buildSession: ComposeArgs["buildSession"];
  /** Dagen met een sleutelsessie, race, test of zware vaste rit: hiernaast geen sleutelsessie. */
  hardDays: Set<string>;
  fatigued: boolean;
  ftpWatts: number | null;
  workouts: GeneratedWorkout[];
  reasons: EngineReason[];
  /**
   * Wat de laatste volledige opbouwweek werkelijk kreeg, inclusief vaste
   * afspraken. De periodisering rekent met doelen; past een week niet (zeven
   * races, weinig dagen), dan groeit de volgende vanaf wat er wél stond.
   */
  lastBuildMinutes: number | null;
};

/**
 * Zet de weken om in workouts. Bij een bijwerking alleen planUpdate.fromDate
 * tot en met toDate. De redenen van de weken zelf staan in weeks[].reasons en
 * komen hier niet nog eens terug.
 */
export function composePlan({ input, window, weeks, buildSession }: ComposeArgs): EngineResult {
  const range = planRange(input, window);
  const state: State = {
    input,
    buildSession,
    hardDays: new Set(
      (input.fixedWorkouts ?? [])
        .filter((workout) => HARD_INTENSITIES.has(workout.intensity))
        .map((workout) => workout.date),
    ),
    fatigued: recoverySignals(input).fatigued,
    ftpWatts: input.profile.ftpWatts ?? input.intervalsLoad?.eftp ?? null,
    workouts: [],
    reasons: [],
    lastBuildMinutes: null,
  };
  weeks.forEach((week, index) => composeWeek(state, week, index, range));
  const workouts = [...state.workouts].sort((a, b) => a.date.localeCompare(b.date));
  return { workouts, reasons: state.reasons };
}

function planRange(input: TrainingAiInput, window: PlanWindow): PlanWindow {
  const update = input.planUpdate;
  return update ? { from: update.fromDate, to: update.toDate } : window;
}

function composeWeek(state: State, week: WeekPlan, variant: number, range: PlanWindow) {
  const { input } = state;
  const from = week.from > range.from ? week.from : range.from;
  const to = week.to < range.to ? week.to : range.to;
  if (from > to) return;
  const days = datesBetween(from, to);
  const reason = (rule: string, text: string, caution = false, date: string = week.weekStart) =>
    state.reasons.push({ rule, date, text, caution });

  // Toegezegde events die niet als vaste afspraak meekomen: opnemen met hun eigen duur.
  const eventDays = new Set<string>();
  let eventMinutes = 0;
  for (const day of days) {
    for (const event of eventsOn(input, day)) {
      if (coveredByFixed(input, day)) continue;
      // Oude invoer kende de duur van een event nog niet; zonder duur geen rit.
      if (!Number.isFinite(event.durationMinutes) || event.durationMinutes <= 0) continue;
      eventDays.add(day);
      eventMinutes += Math.max(0, event.durationMinutes);
      state.workouts.push(raceWorkout(day, event));
      reason("dag.event", `${event.title} staat op ${dayLabel(day)} met de eigen rijtijd.`, false, day);
    }
  }

  if (week.kind === "rust") {
    reason("dag.rust", `Week van ${dayLabel(week.weekStart)}: rustperiode, geen training.`);
    state.lastBuildMinutes = null;
    return;
  }

  const fixed = (input.fixedWorkouts ?? []).filter((workout) => workout.date >= from && workout.date <= to);
  // Het piekmoment zelf (doeldatum of A-mikpunt) is geen trainingsvolume van zijn
  // week: anders vult de gran fondo de laatste taperweek en valt de rest weg.
  const peakMinutes =
    fixed.filter((workout) => isPeakDay(input, workout.date)).reduce((sum, workout) => sum + Math.max(0, workout.durationMinutes || 0), 0) +
    [...eventDays].filter((day) => isPeakDay(input, day)).reduce(
      (sum, day) => sum + eventsOn(input, day).reduce((total, event) => total + Math.max(0, event.durationMinutes), 0),
      0,
    );
  const fixedMinutes = fixed.reduce((sum, workout) => sum + Math.max(0, workout.durationMinutes || 0), 0);
  const races = fixed.filter((workout) => workout.kind === "clubevent").length + eventDays.size;
  const tests = fixed.filter((workout) => workout.kind === "ftp_test").length;

  const weekDays = daysBetween(week.from, week.to) + 1;
  const building = week.kind === "opbouw" || week.kind === "piek";
  // De piekweek haalt 85 % van het plafond; die regel gaat vóór de rem op groei.
  const capGrowth = week.kind === "opbouw";
  let target = Math.round((week.targetMinutes * days.length) / weekDays);
  // Nooit onder wat het lid nu al rijdt, ook niet door die rem (prompt).
  const recentFloor = state.fatigued ? 0 : Math.round((input.recentLoad.hoursPerWeek * 60 * days.length) / 7);
  const grown = Math.max(Math.floor((state.lastBuildMinutes ?? 0) * MAX_WEEK_GROWTH), recentFloor);
  if (capGrowth && state.lastBuildMinutes != null && target > grown) {
    target = grown;
    reason("dag.groei", `Week van ${dayLabel(week.weekStart)}: hooguit een kwart meer dan de vorige opbouwweek.`);
  }
  const budget = target - fixedMinutes - eventMinutes + peakMinutes;
  const complete = days.length === 7;
  const recordWeek = (trainingMinutes: number) => {
    if (building && complete) state.lastBuildMinutes = trainingMinutes + fixedMinutes + eventMinutes - peakMinutes;
    else if (!building && week.kind !== "herstel") state.lastBuildMinutes = null;
  };

  if (days.some((day) => periodOn(input, day) === "rust")) {
    reason("dag.rust", `Rustperiode in de week van ${dayLabel(week.weekStart)}: die dagen blijven leeg.`);
  }
  const caps = new Map<string, number>();
  for (const day of days) {
    if (periodOn(input, day) === "rust" || fixedOn(input, day).length > 0 || eventDays.has(day)) continue;
    const cap = dayCap(input, day);
    if (cap > 0) caps.set(day, cap);
  }
  const candidates = [...caps.keys()];

  if (budget < MIN_RIDE_MINUTES) {
    if (fixedMinutes + eventMinutes > 0) {
      reason("dag.week_vol", `Week van ${dayLabel(week.weekStart)}: de vaste afspraken vullen het weekvolume.`);
    }
    recordWeek(0);
    return;
  }
  if (candidates.length === 0) {
    reason("dag.geen_dag", `Week van ${dayLabel(week.weekStart)}: geen beschikbare dag voor training.`, true);
    recordWeek(0);
    return;
  }

  // Aantal ritten: het eigen ritme, met een rit erbij als de gemiddelde rit anders te lang wordt.
  const avg = Math.max(MIN_RIDE_MINUTES, input.recentLoad.avgDurationMinutes || 60);
  const rhythm = Math.round((input.recentLoad.ridesPerWeek * days.length) / 7);
  let rides = Math.min(candidates.length, Math.max(1, rhythm - fixed.length - eventDays.size));
  if (budget / rides > AVG_DURATION_STRETCH * avg) {
    rides = Math.min(candidates.length, Math.max(rides, Math.round(budget / avg)));
  }
  rides = Math.min(rides, Math.max(1, Math.floor(budget / MIN_RIDE_MINUTES)));
  // Past het weekvolume niet in de gekozen dagen, dan komt er een rit bij in
  // plaats van dat het volume vervalt. Een dag vóór een race telt alleen als
  // openers.
  const roomOf = (days: string[]) =>
    days.reduce(
      (sum, day) => sum + (isRaceOrTestDay(input, shiftDays(day, 1)) ? OPENERS_MINUTES : caps.get(day)!),
      0,
    );
  let picked = pickDays(candidates, rides, caps, budget / rides);
  while (roomOf(picked) < budget && rides < candidates.length) {
    rides += 1;
    picked = pickDays(candidates, rides, caps, budget / rides);
  }
  reason(
    "dag.ritten",
    `Week van ${dayLabel(week.weekStart)}: ${rides} ritten, gewend is ${input.recentLoad.ridesPerWeek} per week.`,
  );

  for (const day of candidates) {
    if (!picked.includes(day)) {
      reason("dag.rustdag", `Rustdag: naar keuze tot ${OPTIONAL_REST_RIDE_MINUTES} minuten rustig fietsen.`, false, day);
    }
  }

  const plans = new Map<string, DayPlan>();
  const assign = (date: string, role: Role, form: SessionForm) =>
    plans.set(date, { date, role, form, minutes: 0, cap: caps.get(date) ?? 0 });

  // De dag vóór een race of test: openers.
  for (const day of picked) {
    if (isRaceOrTestDay(input, shiftDays(day, 1))) {
      assign(day, "openers", "openers");
      reason("dag.voor_race", `Dag vóór een race of test: openers.`, false, day);
    }
  }

  const transition = isTransition(input, from);
  const lowTime = !transition && (week.kind === "rustig" || lowCapacity(input, days));
  const keyForms = transition
    ? []
    : lowTime
      ? Array<SessionForm>(!state.fatigued && picked.length >= 3 ? 2 : 1).fill("sprint")
      : keyFormsFor(input.goal.type, week.keySessions, races, tests, variant);

  // De lange rit op de ruimste dag (bij gelijke ruimte de latere: meestal het weekend).
  const free = () => picked.filter((day) => !plans.has(day));
  let longDay: string | null = null;
  if (week.longRideMinutes && (picked.length >= 2 || keyForms.length === 0)) {
    longDay =
      free().reduce<string | null>((best, day) => (best == null || caps.get(day)! >= caps.get(best)! ? day : best), null) ??
      null;
    if (longDay) {
      assign(longDay, "lang", "lange_duur");
      reason("dag.lange_rit", `Lange rit op de dag met de meeste tijd.`, false, longDay);
    }
  }

  if (transition) {
    const day = free()[0] ?? longDay;
    if (day) {
      assign(day, "overgang", "rustige_duur");
      reason("dag.overgang", "Overgangsperiode: één rustige duurrit met sprints, de rest rustig.", false, day);
    }
  } else if (lowTime) {
    reason("dag.weinig_tijd", `Week van ${dayLabel(week.weekStart)}: weinig tijd, korte sprintsessie(s) als onderhoud.`);
  }

  // Sleutelsessies: niet naast een andere sleutelsessie, race of test; liefst niet naast de lange rit.
  for (const form of keyForms) {
    const day = free()
      .filter((date) => !nextToHard(state, date))
      .sort(
        (a, b) =>
          Number(nextTo(a, longDay)) - Number(nextTo(b, longDay)) ||
          caps.get(b)! - caps.get(a)! ||
          a.localeCompare(b),
      )[0];
    if (!day) {
      reason(
        "dag.sleutel_vervalt",
        `Week van ${dayLabel(week.weekStart)}: ${FORM_LABELS[form]} past niet met herstel ertussen.`,
        true,
      );
      continue;
    }
    assign(day, "sleutel", form);
    state.hardDays.add(day);
    reason("dag.sleutel", `Sleutelsessie ${FORM_LABELS[form]}, met herstel ervoor en erna.`, false, day);
  }
  const zrlLike = input.goal.type === "zrl" || input.goal.type === "ladder";
  if (zrlLike && !transition && !lowTime && races === 0 &&!keyForms.some((form) => form === "vo2max" || form === "anaeroob")) {
    reason("dag.zrl_prikkel", zrlSkipText(week.kind), true);
  }

  // Overige dagen: duur, in een zware opbouwweek één keer intensief.
  let intensive = !lowTime && !transition && ["opbouw", "piek", "kamp"].includes(week.kind) && week.level >= 0.5;
  for (const day of free()) {
    if (intensive && !nextToHard(state, day)) {
      assign(day, "duur", "intensieve_duur");
      reason("dag.duur", "Intensieve duur op een dag zonder sleutelsessie ernaast.", false, day);
      intensive = false;
    } else {
      assign(day, "duur", "rustige_duur");
    }
  }

  allocateMinutes(plans, budget, week.longRideMinutes, (minutes) =>
    reason(
      "dag.rest_minuten",
      `Week van ${dayLabel(week.weekStart)}: ${minutes} minuten passen niet in de beschikbare tijd.`,
    ),
  );

  const built: Array<{ plan: DayPlan; workout: GeneratedWorkout }> = [];
  for (const plan of [...plans.values()].sort((a, b) => a.date.localeCompare(b.date))) {
    const workout = buildDay(state, plan, week, variant, reason);
    if (workout) built.push({ plan, workout });
  }
  // Een sleutelsessie kan langer uitvallen dan zijn deel, omdat de kern een
  // minimum heeft. Dat gaat af van de lange rit of de langste duurrit, zodat de
  // week binnen haar volume blijft.
  let over = built.reduce((sum, row) => sum + row.workout.durationMinutes, 0) - budget;
  const flexible = built
    .filter((row) => row.plan.role === "lang" || row.plan.role === "duur")
    .sort((a, b) => b.workout.durationMinutes - a.workout.durationMinutes);
  for (const row of flexible) {
    if (over < 5) break;
    // Een rustige rit gaat niet onder de 90 minuten: dan was hij een rustdag.
    const floor = isEasyPlan(row.plan) ? OPTIONAL_REST_RIDE_MINUTES : MIN_RIDE_MINUTES;
    const minutes = Math.max(floor, Math.floor((row.workout.durationMinutes - over) / 5) * 5);
    if (minutes >= row.workout.durationMinutes) continue;
    row.plan.minutes = minutes;
    const smaller = buildDay(state, row.plan, week, variant, reason);
    if (!smaller) continue;
    over -= row.workout.durationMinutes - smaller.durationMinutes;
    row.workout = smaller;
  }
  // Staan alle duurritten al op hun minimum en gaat de week nog over het
  // urenplafond, dan wordt de kortste duurrit een rustdag. Boven het doel maar
  // onder het plafond mag: dan blijft de rit staan.
  const ceiling =
    week.kind === "kamp" || !input.goal.maxHoursPerWeek
      ? Infinity
      : Math.round((input.goal.maxHoursPerWeek * 60 * days.length) / 7) - fixedMinutes - eventMinutes + peakMinutes;
  over = built.reduce((sum, row) => sum + row.workout.durationMinutes, 0) - ceiling;
  while (over >= 5) {
    const shortest = built
      .filter((row) => row.plan.role === "duur")
      .sort((a, b) => a.workout.durationMinutes - b.workout.durationMinutes)[0];
    if (!shortest) break;
    built.splice(built.indexOf(shortest), 1);
    over -= shortest.workout.durationMinutes;
    reason("dag.rustdag", `Rustdag: naar keuze tot ${OPTIONAL_REST_RIDE_MINUTES} minuten rustig fietsen.`, false, shortest.plan.date);
  }
  applyHeatProtocol(state, days, built, reason, week.weekStart);
  state.workouts.push(...built.map((row) => row.workout));
  recordWeek(built.reduce((sum, row) => sum + row.workout.durationMinutes, 0));
}

function buildDay(
  state: State,
  plan: DayPlan,
  week: WeekPlan,
  variant: number,
  reason: (rule: string, text: string, caution?: boolean, date?: string) => void,
): GeneratedWorkout | null {
  if (plan.minutes < MIN_RIDE_MINUTES) {
    reason("dag.rustdag", `Rustdag: naar keuze tot ${OPTIONAL_REST_RIDE_MINUTES} minuten rustig fietsen.`, false, plan.date);
    return null;
  }
  const request = (form: SessionForm) =>
    state.buildSession({
      form,
      targetMinutes: plan.minutes,
      maxMinutes: plan.cap,
      ftpWatts: state.ftpWatts,
      level: week.level,
      variant,
      lowCadence: protocolOn(state.input, plan.date, (slug) => slug === LOW_CADENCE_PROTOCOL) || undefined,
    });

  let form = plan.form;
  let session = request(form);
  if (!session && plan.role === "sleutel") {
    state.hardDays.delete(plan.date);
    reason(
      "dag.sleutel_vervalt",
      `${FORM_LABELS[plan.form]} past niet in de tijd van ${dayLabel(plan.date)}: rustige duur.`,
      true,
      plan.date,
    );
    form = "rustige_duur";
    session = request(form);
  }
  if (!session || session.durationMinutes > plan.cap) {
    reason("dag.past_niet", `Geen sessie die in de tijd van ${dayLabel(plan.date)} past.`, false, plan.date);
    return null;
  }
  // Herstel én rustige duur: een rit zonder intensiteit onder de 90 minuten
  // wordt een rustdag (eigenaar, 2026-10-26). Openers, de overgangsrit met
  // sprints en kwaliteit mogen korter.
  const easy = session.intensity === "recovery" || (form === "rustige_duur" && plan.role !== "overgang");
  if (easy && session.durationMinutes < OPTIONAL_REST_RIDE_MINUTES) {
    reason("dag.rustdag", `Rustdag: naar keuze tot ${OPTIONAL_REST_RIDE_MINUTES} minuten rustig fietsen.`, false, plan.date);
    return null;
  }
  if (plan.role === "overgang") {
    // TODO(catalogus): het contract kent geen vraag naar "rustige duur met
    // sprints"; tot dat er is staan de sprints als notitie, niet als blokken
    // met burstSeconds.
    // "met sprints" in de titel: zonder burst-blokken ziet isEasyRide() de
    // sprints anders niet, en is dit een korte rustige rit.
    return {
      ...sessionToWorkout(plan.date, session, {
        note: "Rij drie series van drie sprints van 30 seconden voluit, met 10 minuten rustige duur tussen de series.",
        methodLabel: "veelbelovend",
      }),
      title: `Duur met sprints ${session.durationMinutes} min`,
    };
  }
  return sessionToWorkout(plan.date, session);
}

function raceWorkout(
  date: string,
  event: { title: string; durationMinutes: number; distanceKm: number | null; elevationM: number | null },
): GeneratedWorkout {
  const minutes = Math.max(1, Math.round(event.durationMinutes));
  const size = [
    event.distanceKm != null ? `${Math.round(event.distanceKm)} km` : null,
    event.elevationM != null ? `${Math.round(event.elevationM)} hm` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return {
    date,
    title: event.title.slice(0, 30).trim() || "Race",
    description: `Toegezegd event${size ? ` (${size})` : ""}. Rij het op eigen gevoel.`,
    durationMinutes: minutes,
    intensity: "race",
    targetType: "rpe",
    structure: [
      {
        label: "Race",
        durationMinutes: minutes,
        target: "RPE 7-10",
        notes: "",
        intensity: "race",
        burstSeconds: 0,
        onSeconds: 0,
        offSeconds: 0,
        offTarget: "",
      },
    ],
    methodLabel: "geen",
  };
}

/** Een event staat al als vaste afspraak als er die dag een clubevent of rit met dezelfde titel is. */
/**
 * Staat er op de dag van een event al een vaste afspraak, dan is dat het event
 * (of rijdt het lid die dag iets anders): nooit een tweede training ernaast.
 */
function coveredByFixed(input: TrainingAiInput, date: string): boolean {
  return fixedOn(input, date).length > 0;
}

/**
 * Minuten op een dag. In een kamp telt alleen een week die het lid apart heeft
 * ingevuld; de standaardweek en de aangevinkte dagen gelden daar niet.
 */
function dayCap(input: TrainingAiInput, date: string): number {
  if (periodOn(input, date) === "kamp") {
    const week = (input.availability?.weeks ?? []).find((row) => row.weekStart === mondayKey(date));
    const own = week?.minutesByDay?.[weekdayOf(date)];
    return own != null ? Math.max(0, Number(own)) : CAMP_DAY_MINUTES;
  }
  return minutesOn(input, date) ?? UNBOUNDED_DAY_MINUTES;
}

/** De doeldatum van een doel met één piek, of een A-mikpunt. */
function isPeakDay(input: TrainingAiInput, date: string): boolean {
  const goal = input.goal;
  if ((goal.type === "outdoor_event" || goal.type === "gran_fondo") && goal.targetDate?.slice(0, 10) === date) return true;
  return (input.seasonPlan?.targets ?? []).some((target) => target.priority === "a" && target.date === date);
}

/** Deze dagen hebben samen minder dan de helft van de standaardweek. */
function lowCapacity(input: TrainingAiInput, days: string[]): boolean {
  const standard = input.availability?.default;
  if (!standard) return false;
  let normal = 0;
  let capacity = 0;
  for (const day of days) {
    const minutes = minutesOn(input, day);
    if (minutes == null) return false;
    normal += Math.max(0, Number(standard[weekdayOf(day)] ?? 0));
    capacity += minutes;
  }
  return normal > 0 && capacity < normal / 2;
}

/** Weken direct na het laatste A/B-mikpunt, als er binnen zes weken geen nieuw ligt. */
function isTransition(input: TrainingAiInput, weekFrom: string): boolean {
  const next = input.seasonPlan?.nextTargetAfterPlan;
  const dates = [
    ...(input.seasonPlan?.targets ?? []).filter((target) => target.priority !== "c").map((target) => target.date),
    ...(next ? [next.date] : []),
  ].sort();
  const last = dates.filter((date) => date < weekFrom).pop();
  if (!last || daysBetween(last, weekFrom) > TRANSITION_DAYS) return false;
  return !dates.some((date) => date > last && daysBetween(last, date) <= TRANSITION_GAP_DAYS);
}

function keyFormsFor(goalType: string, count: number, races: number, tests: number, variant: number): SessionForm[] {
  let slots = KEY_SLOTS[goalType] ?? BASE_SLOTS;
  if (races > 0) slots = slots.filter((slot) => !slot.race);
  const remaining = Math.max(0, count - races - tests);
  const forms: SessionForm[] = [];
  for (let i = 0; i < remaining && slots.length > 0; i++) {
    const slot = slots[i % slots.length];
    forms.push(slot.forms[(variant + Math.floor(i / slots.length)) % slot.forms.length]);
  }
  return forms;
}

function zrlSkipText(kind: WeekKind): string {
  if (kind === "herstel") return "In herstelweken vervalt de VO2max- of raceprikkel.";
  if (kind === "taper") return "In de taper vervalt de VO2max- of raceprikkel.";
  if (kind === "heropbouw") return "In de heropbouw na de rustperiode vervalt de VO2max- of raceprikkel.";
  return "Een week zonder VO2max- of raceprikkel door de herstelsignalen.";
}

/**
 * Kiest de trainingsdagen: eerst dagen met genoeg tijd voor een gemiddelde rit,
 * dan gespreid (geen twee dagen achter elkaar als het anders kan), dan de
 * ruimste, dan de vroegste.
 */
function pickDays(candidates: string[], count: number, caps: Map<string, number>, perRide: number): string[] {
  const picked: string[] = [];
  const remaining = [...candidates];
  while (picked.length < count && remaining.length > 0) {
    let best = 0;
    let bestKey: number[] | null = null;
    remaining.forEach((day, index) => {
      const gap = picked.length ? Math.min(...picked.map((p) => Math.abs(daysBetween(p, day)))) : 7;
      const cap = caps.get(day)!;
      const key = [cap >= perRide ? 1 : 0, Math.min(gap, 2), cap, -index];
      if (!bestKey || compareKeys(key, bestKey) > 0) {
        best = index;
        bestKey = key;
      }
    });
    picked.push(remaining.splice(best, 1)[0]);
  }
  return picked.sort();
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

function nextTo(date: string, other: string | null): boolean {
  return other != null && Math.abs(daysBetween(date, other)) === 1;
}

function nextToHard(state: State, date: string): boolean {
  return [shiftDays(date, -1), shiftDays(date, 1)].some(
    (day) => state.hardDays.has(day) || isRaceOrTestDay(state.input, day),
  );
}

/**
 * Verdeelt het weekbudget: de lange rit en de openers eerst, de rest gelijk over
 * de andere dagen, nooit boven de minuten van een dag. Wat niet past, blijft
 * liggen en wordt gemeld.
 */
function allocateMinutes(
  plans: Map<string, DayPlan>,
  budget: number,
  longRideMinutes: number | null,
  onLeftover: (minutes: number) => void,
) {
  const all = [...plans.values()];
  const others = all.filter((plan) => plan.role !== "lang" && plan.role !== "openers");
  let rest = budget;
  for (const plan of all) {
    if (plan.role === "openers") plan.minutes = Math.min(plan.cap, OPENERS_MINUTES);
  }
  rest -= all.reduce((sum, plan) => sum + plan.minutes, 0);
  const long = all.find((plan) => plan.role === "lang");
  if (long) {
    const reserve = others.length * MIN_RIDE_MINUTES;
    long.minutes = Math.max(0, Math.min(longRideMinutes ?? 0, long.cap, rest - reserve));
    rest -= long.minutes;
  }

  // Gelijk verdelen met plafonds per dag (waterfilling).
  let open = [...others];
  let pool = Math.max(0, rest);
  while (open.length > 0 && pool > 0.5) {
    const share = pool / open.length;
    const capped = open.filter((plan) => plan.cap - plan.minutes <= share);
    if (capped.length === 0) {
      for (const plan of open) plan.minutes += share;
      pool = 0;
      break;
    }
    for (const plan of capped) {
      pool -= plan.cap - plan.minutes;
      plan.minutes = plan.cap;
    }
    open = open.filter((plan) => !capped.includes(plan));
  }
  // Op vijf minuten afronden kan de week onder haar doel brengen (een piekweek
  // net onder 85 %); het tekort gaat in stappen van vijf naar dagen met ruimte.
  const wanted = Math.round(all.reduce((sum, plan) => sum + plan.minutes, 0));
  for (const plan of all) plan.minutes = Math.min(plan.cap, Math.round(plan.minutes / 5) * 5);
  let short = wanted - all.reduce((sum, plan) => sum + plan.minutes, 0);
  const roomy = all
    .filter((plan) => plan.role !== "openers")
    .sort((a, b) => b.cap - b.minutes - (a.cap - a.minutes) || a.date.localeCompare(b.date));
  for (const plan of roomy) {
    while (short > 0 && plan.cap - plan.minutes >= 5) {
      plan.minutes += 5;
      short -= 5;
    }
  }
  gatherEasyRides(all);
  const leftover = Math.round(pool);
  if (leftover >= 5) onLeftover(leftover);
}

const isEasyPlan = (plan: DayPlan) => plan.role === "duur" && plan.form === "rustige_duur";

/**
 * Een rustige duurrit onder de 90 minuten wordt een rustdag (buildDay). Gelijk
 * verdeeld over veel dagen haalt geen enkele rit dat, en valt de week ver onder
 * haar doel. Daarom gaan de minuten van de rustige ritten naar zo min mogelijk
 * dagen met minstens 90 minuten tijd; de rest wordt een rustdag. Een dag met
 * minder dan 90 minuten krijgt nooit een rustige rit, en zijn minuten gaan
 * alleen naar een andere rustige rit.
 */
function gatherEasyRides(plans: DayPlan[]) {
  const minimum = OPTIONAL_REST_RIDE_MINUTES;
  const short = plans.filter((plan) => isEasyPlan(plan) && plan.minutes < minimum);
  let pool = 0;
  const release = (plan: DayPlan) => {
    pool += plan.minutes;
    plan.minutes = 0;
  };
  short.filter((plan) => plan.cap < minimum).forEach(release);
  // De ritten met de meeste minuten (dan de meeste tijd) eerst aanvullen; de
  // laatste vervalt zolang het niet voor allemaal genoeg is. Komt de week door
  // aanvullen minder boven haar doel dan ze er door schrappen onder zou zakken,
  // dan wordt er toch aangevuld: liever 90 minuten dan een rustdag bij 85.
  const open = short
    .filter((plan) => plan.cap >= minimum)
    .sort((a, b) => b.minutes - a.minutes || b.cap - a.cap || a.date.localeCompare(b.date));
  const roomy = plans.filter((plan) => isEasyPlan(plan) && plan.minutes >= minimum);
  while (open.length > 0) {
    const need = open.reduce((sum, plan) => sum + minimum - plan.minutes, 0);
    const room = [...open.slice(0, -1).map((plan) => plan.cap - minimum), ...roomy.map((plan) => plan.cap - plan.minutes)]
      .reduce((sum, value) => sum + value, 0);
    const lostByDropping = Math.max(0, minimum - (need - pool) - room);
    if (need - pool <= Math.max(0, lostByDropping)) {
      for (const plan of open) {
        pool -= minimum - plan.minutes;
        plan.minutes = minimum;
      }
      break;
    }
    release(open.pop()!);
  }
  // Wat overblijft, in stappen van vijf naar de rustige ritten met ruimte.
  const rides = plans
    .filter((plan) => isEasyPlan(plan) && plan.minutes >= minimum)
    .sort((a, b) => b.cap - b.minutes - (a.cap - a.minutes) || a.date.localeCompare(b.date));
  for (let added = true; added && pool >= 5; ) {
    added = false;
    for (const plan of rides) {
      if (pool < 5) break;
      if (plan.cap - plan.minutes < 5) continue;
      plan.minutes += 5;
      pool -= 5;
      added = true;
    }
  }
}

function protocolOn(input: TrainingAiInput, date: string, match: (slug: string) => boolean): boolean {
  return (input.protocols ?? []).some((protocol) => match(protocol.slug) && protocol.from <= date && date <= protocol.to);
}

/** Hitte: één duurrit per week wordt de hittesessie; nooit een sleutelsessie. */
function applyHeatProtocol(
  state: State,
  days: string[],
  built: Array<{ plan: DayPlan; workout: GeneratedWorkout }>,
  reason: (rule: string, text: string, caution?: boolean, date?: string) => void,
  weekStart: string,
) {
  const isHeat = (date: string) => protocolOn(state.input, date, (slug) => HEAT_PROTOCOLS.has(slug));
  if (!days.some(isHeat)) return;
  const duur = built.filter((row) => DUUR_FORMS.has(row.plan.form) && row.plan.role !== "overgang" && isHeat(row.plan.date));
  const target = duur.find((row) => row.plan.role === "duur") ?? duur[0];
  if (!target) {
    reason("protocol.hitte", `Week van ${dayLabel(weekStart)}: geen duurrit om warm te rijden voor het hitteprotocol.`, true);
    return;
  }
  target.workout.description =
    `${target.workout.description} Hittesessie: rij deze duurrit warm, volgens het hitteprotocol.`.trim();
  reason("protocol.hitte", "Hittesessie op een duurrit, niet op een sleutelsessie.", false, target.plan.date);
}

// ---------------------------------------------------------------------------
// Titel, samenvatting en cautions
// ---------------------------------------------------------------------------

const GOAL_TITLES: Record<string, string> = {
  zrl: "ZRL-opbouw",
  ladder: "Ladder-opbouw",
  ftp: "FTP-opbouw",
  base_fitness: "Basisconditie",
  gran_fondo: "Gran fondo-opbouw",
  outdoor_event: "Opbouw naar het event",
  rebuild: "Heropbouw",
};

const GOAL_SUMMARIES: Record<string, string> = {
  zrl: "Elke opbouwweek heeft een VO2max- of raceprikkel en een drempel- of sweet-spotsessie, met herstel ertussen.",
  ladder: "Elke opbouwweek heeft een VO2max- of raceprikkel en een drempel- of sweet-spotsessie, met herstel ertussen.",
  ftp: "Elke opbouwweek heeft een drempel- en een VO2max-sessie, met herstel ertussen.",
  base_fitness: "De kwaliteit zit in sweet spot en tempo; de andere ritten zijn duur.",
  gran_fondo: "Sweet spot en drempel als kwaliteit, en elke week één lange rit.",
  outdoor_event: "Sweet spot en drempel als kwaliteit, en elke week één lange rit.",
  rebuild: "Tempo en sweet spot bouwen de belastbaarheid rustig weer op; de andere ritten zijn duur.",
};

const KIND_LABELS: Record<WeekKind, [string, string]> = {
  opbouw: ["opbouwweek", "opbouwweken"],
  piek: ["piekweek", "piekweken"],
  herstel: ["herstelweek", "herstelweken"],
  taper: ["taperweek", "taperweken"],
  kamp: ["kampweek", "kampweken"],
  rust: ["rustweek", "rustweken"],
  rustig: ["rustige week", "rustige weken"],
  heropbouw: ["heropbouwweek", "heropbouwweken"],
};

/** Wat nooit in cautions hoort: klachten en cyclus bij naam. */
const PRIVATE_WORDS = /klacht|cyclus|menstru|blessure|ziek|pijn/i;

function joinDutch(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} en ${parts[parts.length - 1]}`;
}

export function planText(
  input: TrainingAiInput,
  weeks: WeekPlan[],
  reasons: EngineReason[],
): { title: string; summary: string; cautions: string[] } {
  const type = input.goal.type;
  const title = `${GOAL_TITLES[type] ?? "Trainingsblok"}, ${weeks.length} ${weeks.length === 1 ? "week" : "weken"}`.slice(
    0,
    40,
  );

  const counts = new Map<WeekKind, number>();
  for (const week of weeks) counts.set(week.kind, (counts.get(week.kind) ?? 0) + 1);
  const parts = [...counts.entries()].map(([kind, n]) => `${n} ${KIND_LABELS[kind][n === 1 ? 0 : 1]}`);
  const rules = new Set(reasons.map((row) => row.rule));
  const sentences = [
    `${weeks.length} ${weeks.length === 1 ? "week" : "weken"}: ${joinDutch(parts)}.`,
    GOAL_SUMMARIES[type] ?? GOAL_SUMMARIES.base_fitness,
    `Op een rustdag mag je naar keuze tot ${OPTIONAL_REST_RIDE_MINUTES} minuten rustig fietsen.`,
  ];
  if (rules.has("dag.overgang")) {
    sentences.push("Na het laatste mikpunt volgt een rustige overgang met één sprintrit per week.");
  } else if (rules.has("dag.weinig_tijd")) {
    sentences.push("In weken met weinig tijd houden korte sprintsessies de scherpte erin.");
  }

  const cautions: string[] = [];
  const add = (text: string) => {
    if (!PRIVATE_WORDS.test(text) && !cautions.includes(text)) cautions.push(text);
  };
  for (const row of [...weeks.flatMap((week) => week.reasons), ...reasons]) {
    if (row.caution) add(row.text);
  }
  if ((input.preferences ?? []).length > 0) {
    add("Persoonlijke voorkeuren zijn niet automatisch verwerkt; de trainer kijkt ze na.");
  }
  if (input.planUpdate?.reason?.trim()) {
    add("De toelichting bij deze bijwerking is niet gelezen; alleen de gewijzigde instellingen tellen.");
  }

  return { title, summary: sentences.join(" "), cautions };
}
