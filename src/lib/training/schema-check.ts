// De meetlat onder een trainingsschema: toetst een schema aan de harde regels
// die tot nu toe alleen als tekst in de AI-prompt stonden (defaultTrainingPrompt,
// adaptiveDailyPrompt, planUpdatePrompt in workouts.ts).
//
// Waarom dit bestaat: de kwaliteit van AI-schema's werd nergens gemeten.
// insertPlanWorkouts() repareert achteraf een paar dingen (beschikbaarheid,
// korte herstelritten, intensiteit), maar hoe vaak de AI een regel brak, wist
// niemand. Dezelfde controle moet straks ook een eigen regelmotor beoordelen,
// zodat die twee naast elkaar te leggen zijn. Daarom puur en deterministisch:
// geen database, geen klok, alleen de invoer van de planner en zijn workouts.
//
// De drempels hieronder zijn de getallen uit de prompt. Waar de prompt vaag is
// ("grofweg", "sterk negatieve TSB") staat de gekozen grens erbij; die is een
// keuze voor de meetlat, geen trainingsregel. Zie docs/schema-meetlat.md.

import type { GeneratedWorkout, TrainingAiInput } from "@/lib/training/ai";
import { minutesForDate, mondayKey, weekdayOf, WEEKDAY_SLUGS, type AvailabilityPlan } from "@/lib/training/availability";
import { REBUILD_AFTER_REST_DAYS, daysBetween, shiftDays } from "@/lib/training/season";
import { currentWeeklyLoad, loadForIntensity } from "@/lib/training/load-basis";
import {
  alignBlockIntensity,
  alignWorkoutIntensities,
  estimateTrainingLoad,
  intensityFromPct,
  normalizeWorkoutBlocks,
  OPTIONAL_REST_RIDE_MINUTES,
  powerRangePercentForBlock,
  type WorkoutBlock,
} from "@/lib/training/workouts";

export const SCHEMA_RULES = {
  "ongeldige-datum": { ernst: "fout", omschrijving: "Workout met een datum die geen YYYY-MM-DD is." },
  beschikbaarheid: { ernst: "fout", omschrijving: "Training op een dag zonder tijd, of langer dan de beschikbare minuten." },
  "vaste-afspraak": { ernst: "fout", omschrijving: "Training op een dag met een fixedWorkout." },
  weekplafond: { ernst: "fout", omschrijving: "Weekvolume boven goal.maxHoursPerWeek, buiten een kamp." },
  piekweek: { ernst: "fout", omschrijving: "Zwaarste week van een opbouwblok niet duidelijk boven de huidige weekbelasting (currentLoad), zonder vermoeidheidssignaal." },
  opbouwgroei: { ernst: "waarschuwing", omschrijving: "Opbouwweek met meer dan 25% meer belasting dan de opbouwweek ervoor." },
  herstelweek: { ernst: "waarschuwing", omschrijving: "Herstelweek niet op grofweg 60-70% van de week ervoor." },
  "onder-recente-belasting": { ernst: "fout", omschrijving: "Opbouwweek onder de huidige weekbelasting (currentLoad; zonder die bron recentLoad.hoursPerWeek), zonder vermoeidheidssignaal." },
  blokintensiteit: { ernst: "fout", omschrijving: "Intensity van een blok valt niet in de zone van zijn doel." },
  workoutintensiteit: { ernst: "fout", omschrijving: "Intensity van de workout is niet die van het kernwerk." },
  "drempelblok-lang": { ernst: "fout", omschrijving: "Drempelblok van 15 minuten of langer boven 95% FTP." },
  "boven-ftp-lang": { ernst: "fout", omschrijving: "Boven 100% FTP in een blok langer dan 8 minuten." },
  "korte-herstelrit": { ernst: "fout", omschrijving: `Hersteltraining korter dan ${OPTIONAL_REST_RIDE_MINUTES} minuten.` },
  "rustdag-als-workout": { ernst: "waarschuwing", omschrijving: "Rustdag als workout teruggegeven in plaats van weggelaten." },
  "taper-zonder-piek": { ernst: "fout", omschrijving: "Taper zonder outdoor_event, gran_fondo of A-mikpunt." },
  "sleutelsessies-aaneen": { ernst: "fout", omschrijving: "Twee sleutelsessies op opeenvolgende dagen, buiten een kamp." },
  "sleutelsessie-voor-race": { ernst: "fout", omschrijving: "Sleutelsessie op de dag vóór een race, FTP-test of A/B-mikpunt." },
} as const satisfies Record<string, { ernst: SchemaSeverity; omschrijving: string }>;

export type SchemaRule = keyof typeof SCHEMA_RULES;
export type SchemaSeverity = "fout" | "waarschuwing";

export type SchemaFinding = {
  regel: SchemaRule;
  ernst: SchemaSeverity;
  /** De dag van de workout, of de maandag van de week bij een weekregel. */
  datum: string;
  toelichting: string;
};

export type SchemaCheckOptions = {
  /**
   * De periode van het schema als de invoer die niet noemt: bij oude generaties
   * zonder planWindow de startDate en endDate uit het antwoord. Zonder periode
   * gelden de eerste en laatste workoutdatum.
   */
  from?: string;
  to?: string;
};

/** Sleutelsessies in de zin van de prompt. */
const KEY_INTENSITIES = new Set<string>(["threshold", "vo2max", "anaerobic"]);
/** Doeltypes met één piekmoment; alleen daar hoort een taper bij. */
const PEAK_GOAL_TYPES = new Set(["outdoor_event", "gran_fondo"]);
/** De prompt: een taper duurt één tot hooguit drie weken. */
const TAPER_MAX_DAYS = 21;

/**
 * "Duidelijk boven" de huidige weekbelasting: tien procent erboven. Bij 10 %
 * groei per week haalt een blok dat in zijn tweede opbouwweek.
 */
const PEAK_LOAD_SHARE = 1.1;
/**
 * De belasting hier is een blok-som; een gereden rit meet TSS met het
 * genormaliseerd vermogen en komt zo'n 5 % hoger uit (estimateTrainingLoad).
 * Die marge krijgt het schema mee.
 */
const LOAD_ESTIMATE_MARGIN = 0.95;
/** Vult een week zijn beschikbare tijd al zo ver, dan begrenst de tijd en niet de planner. */
const FULL_TIME_SHARE = 0.95;
const MAX_WEEK_GROWTH = 1.25;
/** "Grofweg 60-70%": vijf procentpunt marge aan beide kanten. */
const RECOVERY_WEEK_BAND: [number, number] = [0.55, 0.75];
/** Zakt een week meer dan dit onder de week ervoor, dan is het een herstelweek. */
const RECOVERY_WEEK_BELOW = 0.85;
/** Twee weken op rij minstens zoveel lager is een afbouw. */
const TAPER_STEP = 0.9;

const LONG_THRESHOLD_MINUTES = 15;
const LONG_THRESHOLD_MAX_PCT = 95;
const ABOVE_FTP_MAX_MINUTES = 8;

/**
 * "Sterk negatieve TSB" en "hoge ramp_rate" staan in de prompt zonder getal.
 * Deze grenzen zijn de keuze van de meetlat.
 */
const FATIGUE_TSB = -20;
const FATIGUE_RAMP_RATE = 8;
const FATIGUE_SYMPTOM_SCORE = 0.65;

type Mode = "nieuw" | "bijwerking" | "dag";

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isDayKey(value: unknown): value is string {
  return typeof value === "string" && DAY_KEY.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

type DayEntry = {
  date: string;
  minutes: number;
  /** Geschatte TSS. */
  load: number;
  intensity: string;
  source: "ai" | "vast" | "plan";
};

type Week = {
  monday: string;
  minutes: number;
  /** Geschatte TSS van de week, vaste afspraken inbegrepen. */
  load: number;
  aiMinutes: number;
  complete: boolean;
  special: string | null;
  afterKamp: boolean;
  rebuild: boolean;
  beforeTaper: boolean;
  capMinutes: number | null;
};

function mode(input: TrainingAiInput): Mode {
  if (input.planUpdate) return "bijwerking";
  if (input.currentPlan) return "dag";
  return "nieuw";
}

function availabilityPlan(input: TrainingAiInput): AvailabilityPlan | null {
  const availability = input.availability;
  if (!availability) return null;
  return {
    default: availability.default ?? null,
    weeks: availability.weeks ?? [],
  };
}

/** Een concreet signaal waarop de prompt lager plannen toestaat. */
export function hasFatigueSignal(input: TrainingAiInput): boolean {
  if (input.wellness?.state === "fatigued") return true;
  const tsb = input.intervalsLoad?.tsb;
  if (tsb != null && tsb <= FATIGUE_TSB) return true;
  const ramp = input.intervalsLoad?.rampRate;
  if (ramp != null && ramp >= FATIGUE_RAMP_RATE) return true;
  if ((input.symptoms?.score ?? 0) > FATIGUE_SYMPTOM_SCORE) return true;
  return input.today?.feeling === "tired";
}

function hasExplicitPowerTarget(block: WorkoutBlock): boolean {
  return /\d\s*(?:%|w\b|watt)/i.test(block.target);
}

/** %FTP-band van een blok met een leesbaar doel; zonder doel geen oordeel. */
function blockRange(block: WorkoutBlock, ftp: number | null): [number, number] | null {
  if (!hasExplicitPowerTarget(block)) return null;
  return powerRangePercentForBlock(block, ftp);
}

function hours(minutes: number) {
  return `${(minutes / 60).toFixed(1).replace(".", ",")} u`;
}

function tss(load: number) {
  return `${Math.round(load)} TSS`;
}

function pct(share: number) {
  return `${Math.round(share * 100)}%`;
}

/**
 * Toets een schema aan de harde promptregels. `workouts` is de uitvoer van de
 * planner (of straks van de regelmotor) zoals hij is, vóór de reparaties in
 * insertPlanWorkouts().
 */
export function checkTrainingPlan(
  input: TrainingAiInput,
  generated: GeneratedWorkout[],
  options: SchemaCheckOptions = {},
): SchemaFinding[] {
  const findings: SchemaFinding[] = [];
  const add = (regel: SchemaRule, datum: string, toelichting: string) =>
    findings.push({ regel, ernst: SCHEMA_RULES[regel].ernst, datum, toelichting });

  const flow = mode(input);
  const ftp = input.profile?.ftpWatts && input.profile.ftpWatts > 0 ? input.profile.ftpWatts : null;
  const availability = availabilityPlan(input);
  const availableDays = new Set(input.goal?.availableDays ?? []);
  const fixed = (input.fixedWorkouts ?? []).filter((workout) => isDayKey(workout.date));
  const fixedDates = new Set(fixed.map((workout) => workout.date));
  const periods = (input.seasonPlan?.periods ?? []).filter((period) => isDayKey(period.from) && isDayKey(period.to));
  const targets = (input.seasonPlan?.targets ?? []).filter((target) => isDayKey(target.date));
  const fatigue = hasFatigueSignal(input);
  const today = flow === "dag" ? input.currentPlan?.fromDate ?? null : null;
  const capMinutes = input.goal?.maxHoursPerWeek ? input.goal.maxHoursPerWeek * 60 : null;

  // Een datum die geen dag is, kan nergens heen; de rest van het schema toetsen
  // we zonder die workout.
  for (const workout of generated) {
    if (!isDayKey(workout.date)) add("ongeldige-datum", String(workout.date), `Datum '${workout.date}' is geen dag.`);
  }
  const workouts = generated.filter((workout) => isDayKey(workout.date));

  const dates = workouts.map((workout) => workout.date).sort();
  const from = [input.planUpdate?.fromDate, input.currentPlan?.fromDate, input.planWindow?.from, options.from, dates[0]].find(isDayKey);
  const to = [input.planUpdate?.toDate, input.currentPlan?.toDate, input.planWindow?.to, options.to, dates[dates.length - 1]].find(isDayKey);
  if (!from || !to) return findings;

  const inPeriod = (date: string, kind: string) =>
    periods.some((period) => period.kind === kind && date >= period.from && date <= period.to);

  // Racedagen en tests: de dag ervóór hoort licht.
  const raceDays = new Map<string, string>();
  for (const workout of fixed) {
    if (workout.kind === "ftp_test") raceDays.set(workout.date, "FTP-test");
    else if (workout.intensity === "race") raceDays.set(workout.date, "race");
  }
  for (const target of targets) {
    if (target.priority === "a" || target.priority === "b") {
      raceDays.set(target.date, `${target.priority.toUpperCase()}-mikpunt`);
    }
  }

  // --- Per workout ---------------------------------------------------------
  const entries: DayEntry[] = [];
  const aiDates = new Set<string>();
  for (const workout of workouts) {
    const minutes = Math.round(Number(workout.durationMinutes) || 0);
    if (workout.intensity === "rest" || minutes < 1) {
      add("rustdag-als-workout", workout.date, "Een rustdag hoort niet in het antwoord.");
      continue;
    }
    aiDates.add(workout.date);

    const blocks = normalizeWorkoutBlocks(workout.structure, workout.intensity);
    const aligned = alignWorkoutIntensities(workout.intensity, blocks, ftp);
    const load = blocks.length > 0 ? estimateTrainingLoad(blocks, ftp) : loadForIntensity(minutes, aligned.intensity);
    entries.push({ date: workout.date, minutes, load, intensity: aligned.intensity, source: "ai" });

    if (fixedDates.has(workout.date)) {
      add("vaste-afspraak", workout.date, "Op deze dag ligt al een vaste afspraak.");
    }

    const askedToday = workout.date === today && input.today?.availableMinutes != null;
    // In een kamp geldt alleen een week die het lid apart heeft ingevuld; de
    // standaardweek en goal.availableDays wijken (defaultTrainingPrompt).
    const inCamp = inPeriod(workout.date, "kamp");
    const ownWeek = availability?.weeks.find((week) => week.weekStart === mondayKey(workout.date));
    const limit = askedToday
      ? input.today!.availableMinutes!
      : inCamp
        ? (ownWeek?.minutesByDay[weekdayOf(workout.date)] ?? null)
        : availability
          ? minutesForDate(availability, workout.date)
          : null;
    // Een toegezegd event heeft zijn eigen duur; die is een gegeven, geen keuze.
    const isEvent =
      workout.intensity === "race" && (input.upcomingEvents ?? []).some((event) => event.date === workout.date);
    if (isEvent) {
      // geen beschikbaarheidsoordeel
    } else if (limit === 0) {
      add("beschikbaarheid", workout.date, `${minutes} min op een dag zonder beschikbare tijd.`);
    } else if (limit != null && minutes > limit) {
      add("beschikbaarheid", workout.date, `${minutes} min, beschikbaar ${limit} min.`);
    } else if (limit == null && !inCamp && availableDays.size > 0 && !availableDays.has(weekdayOf(workout.date))) {
      add("beschikbaarheid", workout.date, `${minutes} min op een dag buiten goal.availableDays.`);
    }

    // Een rustige rit met openers vóór een race of test is geen hersteltraining,
    // ook als het kernwerk door de korte versnellingen onder 60% uitkomt.
    const isRecovery =
      workout.intensity === "recovery" ||
      (aligned.intensity === "recovery" && !raceDays.has(shiftDays(workout.date, 1)));
    if (isRecovery && minutes < OPTIONAL_REST_RIDE_MINUTES && !askedToday) {
      add("korte-herstelrit", workout.date, `Hersteltraining van ${minutes} min.`);
    }

    if (workout.intensity !== "race") {
      if (aligned.intensity !== workout.intensity) {
        add("workoutintensiteit", workout.date, `Opgegeven ${workout.intensity}, kernwerk is ${aligned.intensity}.`);
      }

      const wrongZone = blocks.filter(
        (block) =>
          block.intensity !== "rest" &&
          block.intensity !== "race" &&
          blockRange(block, ftp) != null &&
          alignBlockIntensity(block, ftp).intensity !== block.intensity,
      );
      if (wrongZone.length > 0) {
        const first = wrongZone[0];
        add(
          "blokintensiteit",
          workout.date,
          `${wrongZone.length} blok(ken) in de verkeerde zone, bijv. '${first.target}' als ${first.intensity} (hoort ${alignBlockIntensity(first, ftp).intensity}).`,
        );
      }

      const longThreshold = blocks.filter((block) => {
        const range = blockRange(block, ftp);
        if (!range || block.onOff || block.durationMinutes < LONG_THRESHOLD_MINUTES) return false;
        return intensityFromPct((range[0] + range[1]) / 2) === "threshold" && range[1] > LONG_THRESHOLD_MAX_PCT;
      });
      if (longThreshold.length > 0) {
        const block = longThreshold[0];
        add(
          "drempelblok-lang",
          workout.date,
          `${block.durationMinutes} min tot ${Math.round(blockRange(block, ftp)![1])}% FTP.`,
        );
      }

      const longAboveFtp = blocks.filter((block) => {
        const range = blockRange(block, ftp);
        return range != null && !block.onOff && block.intensity !== "race" && block.durationMinutes > ABOVE_FTP_MAX_MINUTES && range[1] > 100;
      });
      if (longAboveFtp.length > 0) {
        const block = longAboveFtp[0];
        add(
          "boven-ftp-lang",
          workout.date,
          `${block.durationMinutes} min tot ${Math.round(blockRange(block, ftp)![1])}% FTP.`,
        );
      }
    }
  }

  for (const workout of fixed) {
    const minutes = Number(workout.durationMinutes) || 0;
    entries.push({ date: workout.date, minutes, load: loadForIntensity(minutes, workout.intensity), intensity: workout.intensity, source: "vast" });
  }
  // Een dag-aanpassing geeft alleen de gewijzigde dagen terug; de rest van de
  // week staat in currentPlan. Vaste afspraken staan daar soms ook in.
  if (flow === "dag") {
    const fixedKeys = new Set(fixed.map((workout) => `${workout.date}|${workout.title}`));
    for (const workout of input.currentPlan?.workouts ?? []) {
      if (!isDayKey(workout.date)) continue;
      if (aiDates.has(workout.date) || fixedKeys.has(`${workout.date}|${workout.title}`)) continue;
      const minutes = Number(workout.durationMinutes) || 0;
      entries.push({ date: workout.date, minutes, load: loadForIntensity(minutes, workout.intensity), intensity: workout.intensity, source: "plan" });
    }
  }

  // --- Sleutelsessies ------------------------------------------------------
  const keyDays = new Map<string, Set<DayEntry["source"]>>();
  for (const entry of entries) {
    if (!KEY_INTENSITIES.has(entry.intensity)) continue;
    const sources = keyDays.get(entry.date) ?? new Set();
    sources.add(entry.source);
    keyDays.set(entry.date, sources);
  }
  for (const [date, sources] of [...keyDays].sort(([a], [b]) => a.localeCompare(b))) {
    const next = shiftDays(date, 1);
    const nextSources = keyDays.get(next);
    if (!nextSources || !(sources.has("ai") || nextSources.has("ai"))) continue;
    if (inPeriod(date, "kamp") || inPeriod(next, "kamp")) continue;
    add("sleutelsessies-aaneen", date, `Sleutelsessies op ${date} en ${next}.`);
  }

  for (const entry of entries) {
    if (entry.source !== "ai" || !KEY_INTENSITIES.has(entry.intensity)) continue;
    const what = raceDays.get(shiftDays(entry.date, 1));
    if (what) add("sleutelsessie-voor-race", entry.date, `${entry.intensity} op de dag vóór een ${what}.`);
  }

  // --- Per week ------------------------------------------------------------
  const taperAnchors = [
    ...(PEAK_GOAL_TYPES.has(input.goal?.type) && input.goal?.targetDate && !input.planWindow?.goalBeyond
      ? [input.goal.targetDate]
      : []),
    ...targets.filter((target) => target.priority === "a").map((target) => target.date),
  ];
  const longRests = periods.filter(
    (period) => period.kind === "rust" && daysBetween(period.from, period.to) + 1 > REBUILD_AFTER_REST_DAYS,
  );
  const camps = periods.filter((period) => period.kind === "kamp");

  const weeks: Week[] = [];
  for (let monday = mondayKey(from); monday <= to; monday = shiftDays(monday, 7)) {
    const sunday = shiftDays(monday, 6);
    const days = Array.from({ length: 7 }, (_, index) => shiftDays(monday, index));
    const inWeek = entries.filter((entry) => entry.date >= monday && entry.date <= sunday);
    const overlaps = (start: string, end: string) => start <= sunday && monday <= end;
    const kinds = periods.filter((period) => overlaps(period.from, period.to)).map((period) => period.kind);
    const taper = taperAnchors.some((anchor) => overlaps(shiftDays(anchor, -TAPER_MAX_DAYS), shiftDays(anchor, 7)));
    const dayLimits = availability ? days.map((day) => minutesForDate(availability, day)) : [];
    const availabilitySum =
      dayLimits.length === WEEKDAY_SLUGS.length && dayLimits.every((value) => value != null)
        ? dayLimits.reduce<number>((sum, value) => sum + (value ?? 0), 0)
        : null;
    const caps = [capMinutes, availabilitySum].filter((value): value is number => value != null);
    weeks.push({
      monday,
      minutes: inWeek.reduce((sum, entry) => sum + entry.minutes, 0),
      load: inWeek.reduce((sum, entry) => sum + entry.load, 0),
      aiMinutes: inWeek.filter((entry) => entry.source === "ai").reduce((sum, entry) => sum + entry.minutes, 0),
      complete: monday >= from && sunday <= to,
      special: kinds.includes("kamp") ? "kamp" : kinds.includes("rust") ? "rust" : kinds.includes("rustig") ? "rustig" : taper ? "taper" : null,
      afterKamp: camps.some((camp) => camp.to < monday && daysBetween(camp.to, monday) <= 7),
      rebuild: longRests.some((rest) => rest.to < monday && daysBetween(rest.to, monday) <= 14),
      beforeTaper: taperAnchors.some((anchor) => {
        const taperStart = shiftDays(anchor, -TAPER_MAX_DAYS);
        return sunday < taperStart && daysBetween(sunday, taperStart) <= 7;
      }),
      capMinutes: caps.length > 0 ? Math.min(...caps) : null,
    });
  }

  // De taperzone is ruim (tot drie weken vóór het piekmoment). Een week daarin
  // is pas taper als het volume echt zakt; tot dan loopt de opbouw door en kan
  // de piekweek er nog in liggen.
  weeks.forEach((week, index) => {
    const prev = weeks[index - 1];
    if (week.special === "taper" && prev && prev.special !== "taper" && prev.minutes > 0 && week.minutes >= prev.minutes * TAPER_STEP) {
      week.special = null;
    }
  });

  // Het piekmoment zelf (de race op de doeldatum of een A-mikpunt) is een
  // afspraak van het lid en telt niet tegen het urenplafond van zijn week.
  const peakDays = new Set(taperAnchors);
  for (const week of weeks) {
    const sunday = shiftDays(week.monday, 6);
    const peakMinutes = entries
      .filter((entry) => entry.intensity === "race" && peakDays.has(entry.date) && entry.date >= week.monday && entry.date <= sunday)
      .reduce((sum, entry) => sum + entry.minutes, 0);
    const minutes = week.minutes - peakMinutes;
    if (capMinutes != null && week.special !== "kamp" && week.aiMinutes > 0 && minutes > capMinutes) {
      add("weekplafond", week.monday, `${hours(minutes)} gepland, plafond ${hours(capMinutes)}.`);
    }
  }

  // Een dag-aanpassing raakt alleen deze week; de vorm van de opbouw is daar
  // niet uit af te lezen.
  if (flow === "dag") return findings;

  const complete = weeks.filter((week) => week.complete);
  // "herstel-deels": de week ervoor valt maar deels in de periode. Zijn minuten
  // zijn dan een ondergrens; zakt deze week daar al ruim onder, dan is het zeker
  // een herstelweek, maar hoe diep is niet te zeggen.
  type Kind = "opbouw" | "herstel" | "herstel-deels" | "bijzonder";
  const kinds: Kind[] = [];
  complete.forEach((week, index) => {
    const prev = index > 0 && daysBetween(complete[index - 1].monday, week.monday) === 7 ? complete[index - 1] : null;
    const partial = prev ? null : weeks.find((other) => !other.complete && daysBetween(other.monday, week.monday) === 7);
    const dropsBelow = (other: Week) => other.minutes > 0 && week.minutes < other.minutes * RECOVERY_WEEK_BELOW;
    if (week.special || week.afterKamp) kinds.push("bijzonder");
    else if (prev && kinds[index - 1] !== "bijzonder" && dropsBelow(prev)) kinds.push("herstel");
    else if (partial && !partial.special && dropsBelow(partial)) kinds.push("herstel-deels");
    else kinds.push("opbouw");
  });

  // Wat het lid nu aankan, in TSS per week. Zonder die bron (geen CTL, geen
  // ritten met TSS) blijft alleen de oude ondergrens in uren over, en geen
  // oordeel over de piek: het urenplafond is beschikbare tijd, geen doel.
  const current = currentWeeklyLoad(input);
  const recentMinutes = input.recentLoad?.hoursPerWeek ? input.recentLoad.hoursPerWeek * 60 : null;
  const timeFull = (week: Week) => week.capMinutes != null && week.minutes >= week.capMinutes * FULL_TIME_SHARE;
  const loadSource = current?.source === "ctl" ? "CTL × 7" : "gereden";
  let lastBuild: Week | null = null;
  let block: Week[] = [];
  /** De belasting vóór de eerste week van het blok: daarvandaan mag het per week een kwart groeien. */
  let blockStart: number | null = null;
  // Bij een bijwerking kan het eerste blok al vóór fromDate zijn begonnen; zijn
  // piek ligt dan mogelijk buiten beeld.
  const startedBefore = (first: Week) => flow === "bijwerking" && first.monday === complete[0]?.monday;
  // Een bijwerking eindigt op de einddatum van het oude schema, niet op het
  // einde van een blok: loopt het laatste blok daar nog, dan kan zijn piek erna
  // liggen.
  const closeBlock = (atWindowEnd = false) => {
    if (current && block.length > 0 && !fatigue && !startedBefore(block[0]) && !(atWindowEnd && flow === "bijwerking")) {
      const peak = block.reduce((best, week) => (week.load > best.load ? week : best));
      // De groeigrens gaat vóór de piekweek (besluit eigenaar, 2026-10-17): is
      // de piek niet te halen zonder sprongen van meer dan een kwart, dan is een
      // lagere piek geen fout.
      const reachable =
        blockStart != null && blockStart > 0 ? blockStart * MAX_WEEK_GROWTH ** (block.indexOf(peak) + 1) : Infinity;
      const needed = Math.min(current.weeklyTss * PEAK_LOAD_SHARE, reachable) * LOAD_ESTIMATE_MARGIN;
      if (peak.load < needed - 1 && !timeFull(peak)) {
        add(
          "piekweek",
          peak.monday,
          `Zwaarste week ${tss(peak.load)}, lid kan nu ${tss(current.weeklyTss)} per week (${loadSource}).`,
        );
      }
    }
    block = [];
  };

  complete.forEach((week, index) => {
    const kind = kinds[index];
    const prev = index > 0 && daysBetween(complete[index - 1].monday, week.monday) === 7 ? complete[index - 1] : null;
    if (kind === "bijzonder") {
      closeBlock();
      lastBuild = null;
      return;
    }
    if (kind === "herstel-deels") {
      closeBlock();
      return;
    }
    if (kind === "herstel") {
      closeBlock();
      const share = week.minutes / prev!.minutes;
      if (share < RECOVERY_WEEK_BAND[0] || share > RECOVERY_WEEK_BAND[1]) {
        add("herstelweek", week.monday, `Herstelweek op ${pct(share)} van de week ervoor.`);
      }
      return;
    }

    // Een opbouwweek. Na een herstelweek vergelijken we met de opbouwweek
    // daarvóór: terug naar het oude niveau is geen sprong.
    const reference: Week | null = prev && kinds[index - 1] === "opbouw" ? prev : lastBuild;
    // De eerste week van een bijwerking kan een geplande herstelweek zijn na
    // opbouwweken die buiten beeld liggen.
    const unknownBefore = flow === "bijwerking" && !prev && lastBuild == null;
    if (reference && reference.load > 0 && !week.rebuild && !week.beforeTaper && week.load > reference.load * MAX_WEEK_GROWTH) {
      add("opbouwgroei", week.monday, `${pct(week.load / reference.load - 1)} meer belasting dan ${reference.monday}.`);
    }
    if (!fatigue && !week.rebuild && !unknownBefore) {
      if (current) {
        if (week.load < current.weeklyTss * LOAD_ESTIMATE_MARGIN && !timeFull(week)) {
          add(
            "onder-recente-belasting",
            week.monday,
            `${tss(week.load)} gepland, lid kan nu ${tss(current.weeklyTss)} per week (${loadSource}).`,
          );
        }
      } else if (recentMinutes != null) {
        const floor = Math.min(recentMinutes, week.capMinutes ?? Infinity);
        if (week.minutes < floor) {
          add(
            "onder-recente-belasting",
            week.monday,
            floor < recentMinutes
              ? `${hours(week.minutes)} gepland, onder het plafond ${hours(floor)}; lid rijdt nu ${hours(recentMinutes)} per week.`
              : `${hours(week.minutes)} gepland, lid rijdt nu ${hours(recentMinutes)} per week.`,
          );
        }
      }
    }
    if (block.length === 0) blockStart = reference?.load ?? current?.weeklyTss ?? null;
    block.push(week);
    lastBuild = week;
  });
  closeBlock(true);

  // Taper: alleen met een piekmoment. Herkend aan het woord in een titel, of aan
  // twee weken afbouw op rij aan het eind van de periode.
  if (taperAnchors.length === 0) {
    const end = input.goal?.targetDate && input.goal.targetDate >= from && input.goal.targetDate <= to ? input.goal.targetDate : to;
    const titled = workouts.find(
      (workout) => /\btaper/i.test(workout.title ?? "") && workout.date <= end && daysBetween(workout.date, end) <= TAPER_MAX_DAYS,
    );
    const tail = complete.filter((week) => shiftDays(week.monday, 6) <= end).slice(-3);
    const declining =
      tail.length === 3 &&
      tail.every((week) => !week.special) &&
      daysBetween(tail[0].monday, tail[2].monday) === 14 &&
      tail[1].minutes < tail[0].minutes * TAPER_STEP &&
      tail[2].minutes < tail[1].minutes * TAPER_STEP;
    if (titled) {
      add("taper-zonder-piek", titled.date, `Taper bij doeltype '${input.goal?.type}' zonder A-mikpunt.`);
    } else if (declining) {
      add(
        "taper-zonder-piek",
        tail[1].monday,
        `Twee weken afbouw op rij (${tail.map((week) => hours(week.minutes)).join(" → ")}) bij doeltype '${input.goal?.type}'.`,
      );
    }
  }

  return findings;
}

/** Aantal bevindingen per regel, voor een rapport over veel schema's. */
export function countFindingsByRule(findings: SchemaFinding[]): Record<SchemaRule, number> {
  const counts = Object.fromEntries(Object.keys(SCHEMA_RULES).map((rule) => [rule, 0])) as Record<SchemaRule, number>;
  for (const finding of findings) counts[finding.regel] += 1;
  return counts;
}
