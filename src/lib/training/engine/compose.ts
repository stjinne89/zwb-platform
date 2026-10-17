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
import type {
  CatalogSession,
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
      if (coveredByFixed(input, day, event.title)) continue;
      eventDays.add(day);
      eventMinutes += Math.max(0, event.durationMinutes);
      state.workouts.push(raceWorkout(day, event));
      reason("dag.event", `${event.title} staat op ${dayLabel(day)} met de eigen rijtijd.`, false, day);
    }
  }

  if (week.kind === "rust") {
    reason("dag.rust", `Week van ${dayLabel(week.weekStart)}: rustperiode, geen training.`);
    return;
  }

  const fixed = (input.fixedWorkouts ?? []).filter((workout) => workout.date >= from && workout.date <= to);
  const fixedMinutes = fixed.reduce((sum, workout) => sum + Math.max(0, workout.durationMinutes || 0), 0);
  const races = fixed.filter((workout) => workout.kind === "clubevent").length + eventDays.size;
  const tests = fixed.filter((workout) => workout.kind === "ftp_test").length;

  const weekDays = daysBetween(week.from, week.to) + 1;
  const budget = Math.round((week.targetMinutes * days.length) / weekDays) - fixedMinutes - eventMinutes;

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
    return;
  }
  if (candidates.length === 0) {
    reason("dag.geen_dag", `Week van ${dayLabel(week.weekStart)}: geen beschikbare dag voor training.`, true);
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
  reason(
    "dag.ritten",
    `Week van ${dayLabel(week.weekStart)}: ${rides} ritten, gewend is ${input.recentLoad.ridesPerWeek} per week.`,
  );

  const picked = pickDays(candidates, rides, caps, budget / rides);
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
  applyHeatProtocol(state, days, built, reason, week.weekStart);
  state.workouts.push(...built.map((row) => row.workout));
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

  let session = request(plan.form);
  if (!session && plan.role === "sleutel") {
    state.hardDays.delete(plan.date);
    reason(
      "dag.sleutel_vervalt",
      `${FORM_LABELS[plan.form]} past niet in de tijd van ${dayLabel(plan.date)}: rustige duur.`,
      true,
      plan.date,
    );
    session = request("rustige_duur");
  }
  if (!session || session.durationMinutes > plan.cap) {
    reason("dag.past_niet", `Geen sessie die in de tijd van ${dayLabel(plan.date)} past.`, false, plan.date);
    return null;
  }
  if (session.intensity === "recovery" && session.durationMinutes < OPTIONAL_REST_RIDE_MINUTES) {
    reason("dag.rustdag", `Rustdag: naar keuze tot ${OPTIONAL_REST_RIDE_MINUTES} minuten rustig fietsen.`, false, plan.date);
    return null;
  }
  if (plan.role === "overgang") {
    // TODO(catalogus): het contract kent geen vraag naar "rustige duur met
    // sprints"; tot dat er is staan de sprints als notitie, niet als blokken
    // met burstSeconds.
    return toWorkout(plan.date, session, {
      note: "Rij drie series van drie sprints van 30 seconden voluit, met 10 minuten rustige duur tussen de series.",
      methodLabel: "veelbelovend",
    });
  }
  return toWorkout(plan.date, session);
}

function toWorkout(
  date: string,
  session: CatalogSession,
  extra: { note?: string; methodLabel?: GeneratedWorkout["methodLabel"] } = {},
): GeneratedWorkout {
  return {
    date,
    title: session.title,
    description: extra.note ? `${session.description} ${extra.note}`.trim() : session.description,
    durationMinutes: session.durationMinutes,
    intensity: session.intensity,
    targetType: session.targetType,
    structure: session.blocks.map((block) => ({
      label: block.label,
      durationMinutes: block.durationMinutes,
      target: block.target,
      notes: block.notes,
      intensity: block.intensity,
      burstSeconds: block.onOff ? 0 : (block.burstSeconds ?? 0),
      onSeconds: block.onOff?.onSeconds ?? 0,
      offSeconds: block.onOff?.offSeconds ?? 0,
      offTarget: block.onOff?.offTarget ?? "",
    })),
    methodLabel: extra.methodLabel ?? session.methodLabel,
  };
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
function coveredByFixed(input: TrainingAiInput, date: string, title: string): boolean {
  return fixedOn(input, date).some((workout) => workout.kind === "clubevent" || workout.title === title);
}

/**
 * Minuten op een dag. In een kamp telt alleen een week die het lid apart heeft
 * ingevuld; de standaardweek en de aangevinkte dagen gelden daar niet.
 */
function dayCap(input: TrainingAiInput, date: string): number {
  if (periodOn(input, date) === "kamp") {
    const week = input.availability?.weeks.find((row) => row.weekStart === mondayKey(date));
    const own = week?.minutesByDay?.[weekdayOf(date)];
    return own != null ? Math.max(0, Number(own)) : CAMP_DAY_MINUTES;
  }
  return minutesOn(input, date) ?? UNBOUNDED_DAY_MINUTES;
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
  for (const plan of all) plan.minutes = Math.min(plan.cap, Math.round(plan.minutes / 5) * 5);
  const leftover = Math.round(pool);
  if (leftover >= 5) onLeftover(leftover);
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
