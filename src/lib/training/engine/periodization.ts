// Periodisering van de regelmotor: per kalenderweek de soort, het volume, het
// aantal sleutelsessies, het niveau en de lange rit. De getallen komen uit
// defaultTrainingPrompt() in src/lib/training/workouts.ts; zie
// docs/eigen-regelmotor.md, sectie "Periodisering".
//
// Werkwijze in drie stappen:
// 1. Vaste weken: kamp, rust, rustig, taper, heropbouw en de herstelweek tussen
//    twee blokken liggen vast door de jaarplanning en het venster.
// 2. De vrije weken daartussen worden cycli van opbouw + herstel, zo uitgelijnd
//    dat een piekweek vóór een taper, rust of kamp valt.
// 3. Een doorloop van voor naar achter geeft elke week zijn volume.
//
// Volumes rekenen eerst in volle-weekminuten, daarna naar het deel van de week
// dat in het venster valt.

import { REBUILD_AFTER_REST_DAYS } from "@/lib/training/season";
import {
  datesBetween,
  daysBetween,
  fixedMinutesBetween,
  minutesOn,
  mondayKey,
  periodOn,
  shiftDays,
  weekdayOf,
} from "@/lib/training/engine/calendar";
import { recoverySignals } from "@/lib/training/engine/signals";
import type {
  EngineReason,
  PlanWindow,
  TrainingAiInput,
  WeekKind,
  WeekPlan,
} from "@/lib/training/engine/types";

/** Groei per opbouwweek; een keuze van ZWB, geen grens. */
const GROWTH = 1.1;
/** Groei bij een hoge ramp rate. */
const GROWTH_RAMP_HIGH = 1.05;
/**
 * Nooit meer dan een kwart erbij ten opzichte van de vorige belaste week. De
 * motor plant net onder 1,25, zodat afronden er niet overheen tilt.
 */
const PLANNED_JUMP = 1.24;
const PEAK_SHARE = 0.85;
const RECOVERY_SHARE = 0.65;
const RUSTIG_SHARE = 0.5;
/** Eerste week bij een vermoeidheidssignaal, als deel van het huidige volume. */
const FATIGUED_START = 0.8;
/** Heropbouw na een lange rust: twee weken onder het volume van ervoor. */
const REBUILD_SHARES = [0.7, 0.85];
/** Taper: 40-60 % onder de laatste opbouwweek, geleidelijk aflopend. */
const TAPER_SHARES: Record<number, number[]> = { 1: [0.5], 2: [0.6, 0.5], 3: [0.6, 0.55, 0.5] };
/** Zonder plafond: hooguit een kwart boven wat het lid nu rijdt. */
const NO_CEILING_HEADROOM = 1.25;
const LONG_RIDE_STEP = 1.15;
/** In een kamp mag de lange rit een kwart langer dan thuis. */
const CAMP_LONG_RIDE = 1.25;
const LONG_RIDE_EVENT_SHARE = 0.85;
const LONG_RIDE_MIN_MINUTES = 90;
/** Een dag met minder dan dit is te kort voor een sleutelsessie. */
const KEY_SESSION_MIN_MINUTES = 45;

const ENDURANCE_GOALS = new Set(["gran_fondo", "outdoor_event"]);
const RACE_INTENSITIES = new Set(["tempo", "threshold", "vo2max", "anaerobic", "race"]);

type CycleKind = "opbouw" | "piek" | "herstel";
type SegmentEnd = "open" | "piek" | "kamp" | "herstel";

/** Een kalenderweek met alles wat uit de invoer volgt, nog zonder besluit. */
type Frame = {
  weekStart: string;
  from: string;
  to: string;
  days: string[];
  rustDays: number;
  rustigDays: number;
  kampDays: number;
  normalDays: number;
  /** Beschikbaar over [from, to]; null = er is een onbeperkte dag. */
  capacity: number | null;
  /** Plafond in volle-weekminuten: min(maxHoursPerWeek, beschikbaarheid van de hele week). */
  ceiling: number | null;
  /** Het lid heeft deze week apart ingevuld in availability.weeks. */
  explicitWeek: boolean;
  fixed: number;
  races: number;
  /** Hoeveel niet-aaneengesloten dagen een sleutelsessie kunnen dragen. */
  keyDays: number;
  /** Langste beschikbare dag; null = onbeperkt. */
  maxDay: number | null;
};

type Cycle = {
  index: number;
  /** Opbouwweken van de cyclus, op volgorde (zonder kamp en herstel). */
  builds: number[];
  /** De laatste opbouwweek is een piekweek. */
  peak: boolean;
  /** Het kamp direct erna telt als piek van deze cyclus. */
  endsInKamp: boolean;
};

type Herstel = "cyclus" | "blok" | "tussen_blokken" | "na_kamp";

type Taper = { date: string; title: string; slots: number[]; second: string | null };

function hours(minutes: number): string {
  const value = (Math.round(minutes / 6) / 10).toFixed(1).replace(".", ",");
  return `${value.endsWith(",0") ? value.slice(0, -2) : value} uur`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

function sumOrNull(values: Array<number | null>): number | null {
  let sum = 0;
  for (const value of values) {
    if (value == null) return null;
    sum += value;
  }
  return sum;
}

function buildFrame(input: TrainingAiInput, monday: string, window: PlanWindow): Frame {
  const sunday = shiftDays(monday, 6);
  const from = monday < window.from ? window.from : monday;
  const to = sunday > window.to ? window.to : sunday;
  const days = datesBetween(from, to);

  let rustDays = 0;
  let rustigDays = 0;
  let kampDays = 0;
  for (const day of days) {
    const period = periodOn(input, day);
    if (period === "rust") rustDays += 1;
    else if (period === "rustig") rustigDays += 1;
    else if (period === "kamp") kampDays += 1;
  }

  const minutes = days.map((day) => minutesOn(input, day));
  const weekMinutes = datesBetween(monday, sunday).map((day) => minutesOn(input, day));
  const weekCapacity = sumOrNull(weekMinutes);
  const maxHours = input.goal.maxHoursPerWeek;
  const limits = [maxHours != null && maxHours > 0 ? maxHours * 60 : null, weekCapacity].filter(
    (value): value is number => value != null,
  );

  const fixedHere = (input.fixedWorkouts ?? []).filter(
    (workout) => workout.date >= from && workout.date <= to,
  );
  const races = fixedHere.filter(
    (workout) =>
      workout.kind === "ftp_test" ||
      (workout.kind === "clubevent" && RACE_INTENSITIES.has(workout.intensity)),
  ).length;

  // Greedy van voor naar achter: zo veel mogelijk dagen met een dag ertussen.
  let keyDays = 0;
  let lastKeyDay: string | null = null;
  days.forEach((day, index) => {
    const available = minutes[index];
    if (periodOn(input, day) === "rust") return;
    if (available != null && available < KEY_SESSION_MIN_MINUTES) return;
    if (lastKeyDay && daysBetween(lastKeyDay, day) < 2) return;
    keyDays += 1;
    lastKeyDay = day;
  });

  return {
    weekStart: monday,
    from,
    to,
    days,
    rustDays,
    rustigDays,
    kampDays,
    normalDays: days.length - rustDays - rustigDays - kampDays,
    capacity: sumOrNull(minutes),
    ceiling: limits.length > 0 ? Math.min(...limits) : null,
    explicitWeek: (input.availability?.weeks ?? []).some((week) => week.weekStart === monday),
    fixed: fixedMinutesBetween(input, from, to),
    races,
    keyDays,
    maxDay: minutes.some((value) => value == null) ? null : Math.max(0, ...(minutes as number[])),
  };
}

/** Het A-mikpunt (of bij een eendaags doel de doeldatum) waar het venster naar tapert. */
function findTaper(input: TrainingAiInput, window: PlanWindow, frames: Frame[]): Taper | null {
  const targets = (input.seasonPlan?.targets ?? [])
    .filter((target) => target.priority === "a" && target.date >= window.from && target.date <= window.to)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let date: string | null = null;
  let title = "";
  if (targets.length > 0) {
    date = targets[0].date;
    title = targets[0].title;
  } else {
    const targetDate = input.goal.targetDate;
    const goalBeyond = input.planWindow?.goalBeyond ?? false;
    if (
      ENDURANCE_GOALS.has(input.goal.type) &&
      targetDate &&
      !goalBeyond &&
      targetDate >= window.from &&
      targetDate <= window.to
    ) {
      date = targetDate;
      title = input.goal.title;
    }
  }
  if (!date) return null;

  const eventIndex = frames.findIndex((frame) => date >= frame.from && date <= frame.to);
  if (eventIndex < 0) return null;
  // Twee weken taper, de racedag inbegrepen. Valt de dag op maandag of dinsdag,
  // dan telt die week nauwelijks mee en komt er een week bij.
  const wanted = ["ma", "di"].includes(weekdayOf(date)) ? 3 : 2;
  // Laat er minstens één opbouwweek vóór staan als het venster dat toelaat.
  const length = Math.max(1, Math.min(wanted, eventIndex));
  const slots: number[] = [];
  for (let index = eventIndex - length + 1; index <= eventIndex; index += 1) slots.push(index);

  return { date, title, slots, second: targets[1]?.title ?? null };
}

/**
 * Verdeelt een reeks vrije weken in cycli. "open" vult van voren af aan en mag
 * eindigen in een halve cyclus; de andere einden worden van achteren uitgelijnd
 * zodat de laatste week de gevraagde soort heeft.
 */
function layoutSegment(length: number, n: number, end: SegmentEnd): Array<{ builds: number; herstel: boolean; peak: boolean }> {
  const cycles: Array<{ builds: number; herstel: boolean; peak: boolean }> = [];
  if (length <= 0) return cycles;

  if (end === "open") {
    let remaining = length;
    while (remaining > 0) {
      const builds = Math.min(n, remaining);
      remaining -= builds;
      const herstel = builds === n && remaining > 0;
      if (herstel) remaining -= 1;
      cycles.push({ builds, herstel, peak: builds === n });
    }
    return cycles;
  }

  // Bij "kamp" telt het kamp als laatste opbouwweek; die zit niet in dit segment.
  const span = length - (end === "herstel" ? 1 : 0) + (end === "kamp" ? 1 : 0);
  if (span <= 0) return end === "herstel" ? [{ builds: 0, herstel: true, peak: false }] : cycles;
  const count = Math.max(1, Math.round((span + 1) / (n + 1)));
  const totalBuilds = span - (count - 1);
  const base = Math.floor(totalBuilds / count);
  const extra = totalBuilds % count;
  for (let index = 0; index < count; index += 1) {
    const last = index === count - 1;
    let builds = base + (index < extra ? 1 : 0);
    if (last && end === "kamp") builds -= 1;
    cycles.push({
      builds,
      herstel: !last || end === "herstel",
      peak: !(last && end === "kamp"),
    });
  }
  return cycles;
}

function reason(rule: string, date: string, text: string, caution = false): EngineReason {
  return { rule, date, text, caution };
}

export function planWeeks(input: TrainingAiInput, window: PlanWindow): WeekPlan[] {
  if (window.from > window.to) return [];

  const frames: Frame[] = [];
  for (let monday = mondayKey(window.from); monday <= window.to; monday = shiftDays(monday, 7)) {
    frames.push(buildFrame(input, monday, window));
  }

  const signals = recoverySignals(input);
  const beginner = input.goal.experienceLevel === "beginner";
  const n = beginner ? 2 : 3;
  const buildKeys = beginner ? 1 : 2;
  const peakKeys = Math.min(3, buildKeys + 1);
  const campFactor =
    input.goal.experienceLevel === "advanced" ? 2 : beginner ? 1.5 : 1.75;
  const goalBeyond = input.planWindow?.goalBeyond ?? false;

  // ---- 1. Vaste weken ------------------------------------------------------
  const kinds: Array<WeekKind | null> = frames.map((frame) => {
    const total = frame.days.length;
    if (frame.kampDays > 0) return "kamp";
    if (frame.rustDays * 2 > total) return "rust";
    if ((frame.rustDays + frame.rustigDays) * 2 > total) return "rustig";
    return null;
  });
  const herstelNote: Array<Herstel | null> = frames.map(() => null);

  for (const period of input.seasonPlan?.periods ?? []) {
    if (period.kind !== "rust" || daysBetween(period.from, period.to) + 1 <= REBUILD_AFTER_REST_DAYS) continue;
    const limit = shiftDays(mondayKey(period.to), 14);
    let marked = 0;
    frames.forEach((frame, index) => {
      if (marked >= 2 || frame.to <= period.to || frame.weekStart > limit) return;
      if (kinds[index] === null) {
        kinds[index] = "heropbouw";
        marked += 1;
      } else if (kinds[index] !== "rust") {
        marked = 2;
      }
    });
  }

  const taper = findTaper(input, window, frames);
  if (taper) {
    for (const slot of taper.slots) if (kinds[slot] === null || kinds[slot] === "heropbouw") kinds[slot] = "taper";
  }

  // Volgend blok: de herstelweek waarmee het vorige blok afsluit blijft staan.
  if (input.planUpdate?.nextBlock) {
    const oldEnd = (input.planUpdate.remainingWorkouts ?? []).reduce(
      (latest, workout) => (workout.date > latest ? workout.date : latest),
      "",
    );
    const found = frames.findIndex((frame) => oldEnd >= frame.from && oldEnd <= frame.to);
    const slot = found >= 0 ? found : oldEnd > window.to ? frames.length - 1 : 0;
    if (kinds[slot] === null) {
      kinds[slot] = "herstel";
      herstelNote[slot] = "tussen_blokken";
    }
  }

  // ---- 2. Cycli in de vrije weken -------------------------------------------
  const cycleOf: Array<Cycle | null> = frames.map(() => null);
  const cycles: Cycle[] = [];
  let index = 0;
  while (index < frames.length) {
    if (kinds[index] !== null) {
      index += 1;
      continue;
    }
    let start = index;
    let stop = index;
    while (stop + 1 < frames.length && kinds[stop + 1] === null) stop += 1;

    if (start > 0 && kinds[start - 1] === "kamp") {
      kinds[start] = "herstel";
      herstelNote[start] = "na_kamp";
      start += 1;
    }
    const next = stop + 1 < frames.length ? kinds[stop + 1] : null;
    const end: SegmentEnd =
      stop + 1 >= frames.length ? (goalBeyond ? "herstel" : "open") : next === "kamp" ? "kamp" : "piek";

    let cursor = start;
    for (const layout of layoutSegment(stop - start + 1, n, end)) {
      const cycle: Cycle = {
        index: cycles.length,
        builds: [],
        peak: layout.peak && layout.builds > 0,
        endsInKamp: end === "kamp" && !layout.peak,
      };
      for (let build = 0; build < layout.builds; build += 1) {
        const last = build === layout.builds - 1;
        kinds[cursor] = (last && cycle.peak ? "piek" : "opbouw") satisfies CycleKind;
        cycleOf[cursor] = cycle;
        cycle.builds.push(cursor);
        cursor += 1;
      }
      if (layout.herstel) {
        kinds[cursor] = "herstel";
        herstelNote[cursor] = stop + 1 >= frames.length && cursor === stop && goalBeyond ? "blok" : "cyclus";
        cursor += 1;
      }
      if (cycle.builds.length > 0 || cycle.endsInKamp) cycles.push(cycle);
    }
    index = stop + 1;
  }

  // ---- 3. Volume, sleutelsessies, niveau en lange rit -----------------------
  const recentMinutes = Math.max(0, input.recentLoad.hoursPerWeek * 60);
  const knownCeilings = frames.map((frame) => frame.ceiling).filter((value): value is number => value != null);
  const typicalCeiling = median(knownCeilings);
  const startMinutes =
    recentMinutes > 0 ? recentMinutes : typicalCeiling != null ? typicalCeiling * 0.5 : 120;
  const progressionCap = typicalCeiling ?? startMinutes * NO_CEILING_HEADROOM;

  const goalEvent = ENDURANCE_GOALS.has(input.goal.type)
    ? (input.upcomingEvents ?? []).find((event) => event.date === input.goal.targetDate) ??
      [...(input.upcomingEvents ?? [])].sort((a, b) => b.durationMinutes - a.durationMinutes)[0] ??
      null
    : null;
  const longestRecent = Math.max(0, input.recentLoad.longestRideMinutes);
  const longRideCap = goalEvent ? goalEvent.durationMinutes * LONG_RIDE_EVENT_SHARE : null;

  const progression = new Map<number, number>();
  const peakShort = new Map<number, string>();

  function planCycle(cycle: Cycle, first: number, ref: number, growth: number, floor: number, forcePeak: boolean) {
    const slots = cycle.builds;
    const caps = slots.map((slot) => Math.max(progressionCap, frames[slot].ceiling ?? 0));
    const values = slots.map(() => 0);
    slots.forEach((_, position) => {
      const wanted = position === 0 ? Math.max(first, floor) : values[position - 1] * growth;
      values[position] = Math.min(Math.max(wanted, floor), caps[position]);
    });
    const last = slots.length - 1;
    const lastCeiling = frames[slots[last]].ceiling;
    // Naar boven op vijf minuten: het samenstellen rondt per rit af, en 84,9 % is geen 85 %.
    const target = lastCeiling != null ? Math.min(Math.ceil((PEAK_SHARE * lastCeiling) / 5) * 5, caps[last]) : null;
    if (forcePeak && target != null && values[last] < target) {
      values[last] = target;
      for (let position = last - 1; position >= 0; position -= 1) {
        values[position] = Math.max(values[position], values[position + 1] / PLANNED_JUMP);
      }
    }
    // Nooit meer dan een kwart erbij, ook niet om de piek te halen.
    values.forEach((value, position) => {
      const previous = position === 0 ? ref : values[position - 1];
      values[position] = Math.min(value, previous * PLANNED_JUMP, caps[position]);
    });
    slots.forEach((slot, position) => progression.set(slot, values[position]));

    if (cycle.peak && lastCeiling != null) {
      const actual = Math.min(values[last], lastCeiling);
      if (actual < PEAK_SHARE * lastCeiling - 1) {
        peakShort.set(
          slots[last],
          signals.fatigued
            ? "De piekweek blijft onder 85 % van je beschikbare tijd door de herstelsignalen."
            : signals.rampHigh
              ? "De piekweek blijft onder 85 % van je beschikbare tijd: je belasting steeg de laatste weken snel."
              : "De piekweek blijft onder 85 % van je beschikbare tijd: het volume groeit hooguit een kwart per week.",
        );
      }
    }
  }

  const weeks: WeekPlan[] = [];
  let lastLoaded: number | null = null;
  let lastBuildActual: number | null = null;
  let lastBuildKeys = buildKeys;
  let previousCycleFirst: number | null = null;
  let afterRebuild: number | null = null;
  let rebuildBase: number | null = null;
  let rebuildStep = 0;
  let previousWeek = startMinutes;
  let previousLevel = 0;
  let longRide = longestRecent;
  let longRideLimited = false;
  let longRideBuilds = 0;
  let firstCycleSeen = false;

  frames.forEach((frame, slot) => {
    const kind = kinds[slot] as WeekKind;
    const reasons: EngineReason[] = [];
    const add = (rule: string, text: string, caution = false) => reasons.push(reason(rule, frame.weekStart, text, caution));
    const ceiling = frame.ceiling ?? Infinity;
    const share = (frame.normalDays + RUSTIG_SHARE * frame.rustigDays) / 7;
    const cycle = cycleOf[slot];
    const firstCycle = cycle?.index === 0 && cycle.builds[0] <= 1;

    if (cycle && cycle.builds[0] === slot) {
      const fatigueHere = firstCycle && signals.fatigued;
      const rampHere = firstCycle && signals.rampHigh;
      const floor = fatigueHere ? 0 : startMinutes;
      const first = fatigueHere
        ? startMinutes * FATIGUED_START
        : afterRebuild != null
          ? afterRebuild * GROWTH
          : previousCycleFirst != null
            ? previousCycleFirst * GROWTH
            : startMinutes;
      planCycle(
        cycle,
        first,
        lastLoaded ?? startMinutes,
        rampHere ? GROWTH_RAMP_HIGH : GROWTH,
        floor,
        !fatigueHere && !rampHere,
      );
      previousCycleFirst = progression.get(slot) ?? first;
      afterRebuild = null;
      if (!firstCycleSeen && firstCycle) {
        if (fatigueHere) add("volume.vermoeid", "Door de herstelsignalen begint het schema onder je huidige volume.", true);
        if (rampHere) add("volume.ramp", "Je belasting steeg de laatste weken snel: de opbouw is gematigd.", true);
      }
      firstCycleSeen = true;
    }

    let weekVolume = 0; // volle-weekminuten
    let target = 0;
    let keys = 0;
    let level = 0;
    let long: number | null = null;

    switch (kind) {
      case "opbouw":
      case "piek": {
        const planned = progression.get(slot) ?? startMinutes;
        weekVolume = Math.min(planned, ceiling);
        target = weekVolume * share;
        lastLoaded = planned;
        lastBuildActual = weekVolume;
        keys = kind === "piek" ? peakKeys : buildKeys;
        const position = cycle ? cycle.builds.indexOf(slot) : 0;
        const builds = cycle ? cycle.builds.length : 1;
        const span = cycle?.endsInKamp ? builds : cycle?.peak ? builds - 1 : n - 1;
        const low = Math.min(0.5, 0.25 * (cycle?.index ?? 0));
        level = span <= 0 ? 1 : low + (1 - low) * Math.min(1, position / span);
        if (kind === "piek") {
          const short = peakShort.get(slot);
          if (short) add("volume.piek", short, true);
          else add("volume.piek", `Piekweek van ${hours(target)}: de zwaarste week van deze cyclus.`);
        } else {
          add("volume.opbouw", `Opbouwweek van ${hours(target)}.`);
        }
        if (planned > ceiling + 0.5) add("volume.plafond", "Begrensd door je beschikbare tijd deze week.");
        break;
      }
      case "herstel": {
        const note = herstelNote[slot] ?? "cyclus";
        const base = note === "na_kamp" ? (lastLoaded ?? startMinutes) : previousWeek;
        weekVolume = Math.min(RECOVERY_SHARE * base, ceiling);
        target = weekVolume * share;
        keys = 1;
        level = previousLevel;
        add(
          "volume.herstelweek",
          note === "blok"
            ? "Het blok sluit af met een herstelweek, zodat het volgende blok erop voortbouwt."
            : note === "tussen_blokken"
              ? "Herstelweek tussen het vorige en dit blok."
              : note === "na_kamp"
                ? "Herstelweek na het trainingskamp."
                : "Herstelweek: ongeveer twee derde van de week ervoor.",
        );
        break;
      }
      case "taper": {
        const position = taper ? taper.slots.indexOf(slot) : 0;
        const shares = TAPER_SHARES[taper?.slots.length ?? 1] ?? TAPER_SHARES[1];
        weekVolume = Math.min((lastBuildActual ?? startMinutes) * shares[Math.max(0, position)], ceiling);
        target = weekVolume * share;
        keys = lastBuildKeys;
        level = previousLevel;
        add("volume.taper", `Taper naar ${taper?.title ?? "het doel"}: minder volume, de sleutelsessies blijven.`);
        if (taper?.second && position === 0) {
          add("volume.tweede_a", `${taper.second} is ook een A-mikpunt; dit blok werkt naar ${taper.title} toe.`, true);
        }
        break;
      }
      case "kamp": {
        const normal = lastLoaded ?? startMinutes;
        weekVolume = normal * campFactor;
        target = (normal * (frame.kampDays * campFactor + frame.normalDays + RUSTIG_SHARE * frame.rustigDays)) / 7;
        if (frame.explicitWeek && frame.capacity != null) target = Math.min(target, frame.capacity);
        keys = peakKeys;
        level = 1;
        add(
          "volume.kamp",
          `Trainingskamp: ${String(campFactor).replace(".", ",")} keer je normale weekvolume, passend bij je ervaringsniveau.`,
          true,
        );
        break;
      }
      case "rustig": {
        weekVolume = Math.min(lastLoaded ?? startMinutes, ceiling);
        target = weekVolume * share;
        add("volume.rustig", "Drukke periode: ongeveer de helft van het volume, geen sleutelsessies.");
        break;
      }
      case "rust": {
        add("volume.rust", "Rustperiode: geen training gepland.");
        break;
      }
      case "heropbouw": {
        if (rebuildBase == null || slot === 0 || kinds[slot - 1] !== "heropbouw") {
          rebuildBase = lastLoaded ?? startMinutes;
          rebuildStep = 0;
        }
        const stepShare = REBUILD_SHARES[Math.min(rebuildStep, REBUILD_SHARES.length - 1)];
        weekVolume = Math.min(rebuildBase * stepShare, ceiling);
        target = weekVolume * share;
        rebuildStep += 1;
        lastLoaded = weekVolume;
        afterRebuild = weekVolume;
        keys = 1;
        add("volume.heropbouw", "Na de rustperiode begint het volume lager en bouwt het in twee weken terug op.");
        break;
      }
    }

    if (kind !== "rust" && frame.rustDays > 0) {
      add("volume.rust", `${frame.rustDays} ${frame.rustDays === 1 ? "dag" : "dagen"} rust uit je jaarplanning: minder volume.`);
    }
    if (kind !== "kamp" && kind !== "rust" && frame.capacity != null) target = Math.min(target, frame.capacity);
    if (frame.days.length < 7 && kind !== "rust") {
      add("volume.deelweek", "Deze week valt deels in het schema: evenredig minder volume.");
    }
    if (frame.fixed > target + 0.5) {
      target = frame.fixed;
      add("volume.vast", "Je vaste afspraken vullen deze week al.");
    }
    if (slot === 0 && recentMinutes === 0) {
      add("volume.start", "Er is geen recente rijdata: het schema begint voorzichtig.", true);
    }
    if (slot === 0 && frame.ceiling == null) {
      add("volume.plafond", "Geen urenplafond of beschikbaarheid bekend: het volume volgt wat je nu rijdt.");
    }

    // Sleutelsessies.
    if (keys > frame.keyDays) {
      keys = frame.keyDays;
      add("sleutel.dagen", "Te weinig losse dagen voor meer sleutelsessies.");
    }
    if (slot === 0 && signals.lowerCapacity && keys > 0) {
      const minimum = kind === "opbouw" || kind === "piek" || kind === "kamp" || kind === "heropbouw" ? 1 : 0;
      const lowered = Math.max(minimum, keys - 1);
      if (lowered < keys) {
        keys = lowered;
        add("sleutel.belastbaarheid", "Lagere belastbaarheid deze week: een sleutelsessie minder.", true);
      }
    }
    if (frame.races > 0) {
      if (frame.races > keys) keys = frame.races;
      add("sleutel.race", "De race telt als sleutelsessie.");
    }
    if (kind === "opbouw" || kind === "piek") lastBuildKeys = keys;

    // Lange rit.
    const longShare = goalEvent ? 0.6 : 0.5;
    const fit = (wanted: number): number | null => {
      const limit = Math.min(wanted, frame.maxDay ?? Infinity, longShare * target);
      if (goalEvent && limit < wanted - 0.5 && !longRideLimited) {
        longRideLimited = true;
        add("langerit.plafond", "De lange rit is begrensd door je beschikbare tijd.");
      }
      if (limit < LONG_RIDE_MIN_MINUTES || limit <= input.recentLoad.avgDurationMinutes) return null;
      return Math.round(limit);
    };
    const eventThisWeek = taper && taper.date >= frame.from && taper.date <= frame.to;
    if (kind === "opbouw" || kind === "piek") {
      if (goalEvent && longRideCap != null) {
        // De eerste opbouwweek begint bij de langste rit van nu, daarna stap voor stap.
        const grown = longRideBuilds > 0 ? longRide * LONG_RIDE_STEP : longRide;
        longRide = Math.min(grown, longRideCap);
        longRideBuilds += 1;
        long = fit(longRide);
        if (long != null && long > longestRecent) {
          add("langerit.opbouw", `De lange rit groeit naar ${long} minuten richting ${goalEvent.title}.`);
        }
      } else {
        long = fit(longestRecent);
      }
    } else if (kind === "kamp") {
      const grown = Math.max(longRide, longestRecent) * CAMP_LONG_RIDE;
      long = fit(longRideCap != null ? Math.min(grown, longRideCap) : grown);
    } else if (kind === "herstel" || kind === "heropbouw") {
      long = fit(0.75 * (goalEvent ? longRide : longestRecent));
    } else if (kind === "taper" && !eventThisWeek) {
      long = fit(0.6 * (goalEvent ? longRide : longestRecent));
    }

    weeks.push({
      weekStart: frame.weekStart,
      from: frame.from,
      to: frame.to,
      kind,
      targetMinutes: Math.round(target),
      capacityMinutes: frame.capacity,
      keySessions: keys,
      level: round2(level),
      longRideMinutes: long,
      reasons,
    });

    previousWeek = kind === "kamp" ? (lastLoaded ?? startMinutes) : weekVolume;
    previousLevel = level;
  });

  return weeks;
}
