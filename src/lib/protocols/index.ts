// Alle protocollen en de rekenregels eromheen: welke dag van het protocol het
// is, welke taken er vandaag staan en hoeveel een dosis is bij dit gewicht.
// Los van React en de database, zodat het te testen is.

import { daysBetween, shiftDays } from "@/lib/training/season";
import { NUTRITION_PROTOCOLS } from "./nutrition";
import { TRAINING_PROTOCOLS } from "./training";
import type {
  Protocol,
  ProtocolCheck,
  ProtocolDose,
  ProtocolPhase,
  ProtocolPillar,
  ProtocolRun,
  ProtocolTask,
} from "./types";

export * from "./types";

export const PROTOCOLS: Protocol[] = [...TRAINING_PROTOCOLS, ...NUTRITION_PROTOCOLS];

export function protocolBySlug(slug: string): Protocol | null {
  return PROTOCOLS.find((protocol) => protocol.slug === slug) ?? null;
}

/** De protocollen van een pijler, per groep in de volgorde waarin ze staan. */
export function protocolsByGroup(pillar: ProtocolPillar): { group: string; protocols: Protocol[] }[] {
  const groups: { group: string; protocols: Protocol[] }[] = [];
  for (const protocol of PROTOCOLS.filter((item) => item.pillar === pillar)) {
    const existing = groups.find((entry) => entry.group === protocol.group);
    if (existing) existing.protocols.push(protocol);
    else groups.push({ group: protocol.group, protocols: [protocol] });
  }
  return groups;
}

export function firstDay(protocol: Protocol): number {
  return Math.min(...protocol.phases.map((phase) => phase.fromDay));
}

export function lastDay(protocol: Protocol): number {
  return Math.max(...protocol.phases.map((phase) => phase.toDay));
}

/** Lengte in dagen, van de eerste tot en met de laatste dag. */
export function protocolLength(protocol: Protocol): number {
  return lastDay(protocol) - firstDay(protocol) + 1;
}

/**
 * Begin- en wedstrijddatum van een nieuwe run. Bij een protocol naar een
 * wedstrijd rekent de startdatum terug vanaf de wedstrijd.
 */
export function runDates(
  protocol: Protocol,
  input: { startDate?: string | null; raceDate?: string | null },
): { startDate: string; raceDate: string | null } | null {
  if (protocol.anchor === "wedstrijd") {
    if (!input.raceDate) return null;
    return { startDate: shiftDays(input.raceDate, firstDay(protocol)), raceDate: input.raceDate };
  }
  if (!input.startDate) return null;
  return { startDate: input.startDate, raceDate: null };
}

function anchorDate(protocol: Protocol, run: Pick<ProtocolRun, "startDate" | "raceDate">): string {
  if (protocol.anchor === "wedstrijd" && run.raceDate) return run.raceDate;
  // Een startanker begint op dag firstDay (normaal 0).
  return shiftDays(run.startDate, -firstDay(protocol));
}

/** Dagnummer ten opzichte van het anker: 0 is de start of de wedstrijddag. */
export function dayNumber(
  protocol: Protocol,
  run: Pick<ProtocolRun, "startDate" | "raceDate">,
  date: string,
): number {
  return daysBetween(anchorDate(protocol, run), date);
}

export function runEndDate(protocol: Protocol, run: Pick<ProtocolRun, "startDate" | "raceDate">): string {
  return shiftDays(anchorDate(protocol, run), lastDay(protocol));
}

export function phaseOn(
  protocol: Protocol,
  run: Pick<ProtocolRun, "startDate" | "raceDate">,
  date: string,
): ProtocolPhase | null {
  const day = dayNumber(protocol, run, date);
  return protocol.phases.find((phase) => day >= phase.fromDay && day <= phase.toDay) ?? null;
}

/** Een lopende run die voorbij zijn laatste dag is, telt als afgerond. */
export function isRunOver(protocol: Protocol, run: ProtocolRun, today: string): boolean {
  return run.status !== "actief" || today > runEndDate(protocol, run);
}

const NUMBER = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * De dosis voor dit lid: "210–420 mg" bij 70 kg, of "3–6 mg per kg" zonder
 * gewicht. Afgerond op de stap van de dosis en nooit boven het plafond.
 */
export function formatDose(dose: ProtocolDose, weightKg: number | null): string {
  if (!weightKg || weightKg <= 0) {
    const { min, max } = dose.perKg;
    const range = min === max ? NUMBER.format(min) : `${NUMBER.format(min)}–${NUMBER.format(max)}`;
    return `${range} ${dose.unit} per kg`;
  }
  const low = Math.min(dose.max, roundTo(dose.perKg.min * weightKg, dose.step));
  const high = Math.min(dose.max, roundTo(dose.perKg.max * weightKg, dose.step));
  const range = low === high ? NUMBER.format(low) : `${NUMBER.format(low)}–${NUMBER.format(high)}`;
  return `${range} ${dose.unit}`;
}

export type DayTask = ProtocolTask & {
  /** De dosis voor dit lid, of null als de taak er geen heeft. */
  amount: string | null;
  done: boolean;
  /** Bij een taak per week: zoveel is er deze protocolweek gedaan, vandaag meegeteld. */
  weekCount?: number;
};

/**
 * De taken van één dag. Een taak "per week" verdwijnt als het weekaantal al is
 * gehaald; een eenmalige taak verdwijnt als hij op een andere dag al is gedaan.
 * Een taak die vandaag is afgevinkt blijft altijd staan, zodat je hem kunt
 * terugdraaien.
 */
export function tasksForDay(
  protocol: Protocol,
  run: ProtocolRun,
  date: string,
  weightKg: number | null,
  checks: ProtocolCheck[],
): { phase: ProtocolPhase; day: number; tasks: DayTask[] } | null {
  const phase = phaseOn(protocol, run, date);
  if (!phase) return null;
  const day = dayNumber(protocol, run, date);
  const own = checks.filter((check) => check.protocolId === run.id);
  const weekIndex = Math.floor((day - phase.fromDay) / 7);
  const phaseStart = shiftDays(anchorDate(protocol, run), phase.fromDay);

  const tasks: DayTask[] = [];
  for (const task of phase.tasks) {
    const sameTask = own.filter((check) => check.taskKey === task.key);
    const done = sameTask.some((check) => check.day === date);
    const amount = task.dose ? formatDose(task.dose, weightKg) : null;

    if (task.once) {
      const doneElsewhere = sameTask.some(
        (check) => check.day !== date && check.day >= phaseStart && check.day <= shiftDays(phaseStart, phase.toDay - phase.fromDay),
      );
      if (doneElsewhere && !done) continue;
      tasks.push({ ...task, amount, done });
      continue;
    }

    if (task.perWeek) {
      const weekStart = shiftDays(phaseStart, weekIndex * 7);
      const weekEnd = shiftDays(weekStart, 6);
      const count = sameTask.filter((check) => check.day >= weekStart && check.day <= weekEnd).length;
      if (count >= task.perWeek && !done) continue;
      tasks.push({ ...task, amount, done, weekCount: count });
      continue;
    }

    tasks.push({ ...task, amount, done });
  }
  return { phase, day, tasks };
}

/** Kan dit lid het protocol starten? Een reden als het niet kan, anders null. */
export function startBlocker(protocol: Protocol, ageYears: number | null): string | null {
  if (protocol.minAge && ageYears !== null && ageYears < protocol.minAge) {
    return `Vanaf ${protocol.minAge} jaar.`;
  }
  return null;
}

export type ProtocolMarker = { date: string; label: string; slug: string };

/** Markeringen voor de agenda: elke dag met een vaste taak, tussen from en to. */
export function calendarMarkers(runs: ProtocolRun[], from: string, to: string): ProtocolMarker[] {
  const markers: ProtocolMarker[] = [];
  for (const run of runs) {
    if (run.status !== "actief") continue;
    const protocol = protocolBySlug(run.protocolSlug);
    if (!protocol?.calendar) continue;
    let date = run.startDate > from ? run.startDate : from;
    const end = runEndDate(protocol, run) < to ? runEndDate(protocol, run) : to;
    while (date <= end) {
      const phase = phaseOn(protocol, run, date);
      if (phase && phase.tasks.some((task) => !task.once)) {
        markers.push({ date, label: protocol.shortLabel, slug: protocol.slug });
      }
      date = shiftDays(date, 1);
    }
  }
  return markers;
}

/**
 * Lopende trainingsprotocollen met een aanwijzing voor de AI-generator, binnen
 * het venster van het schema dat gemaakt wordt.
 */
export type ProtocolForAi = {
  slug: string;
  title: string;
  from: string;
  to: string;
  raceDate: string | null;
  phases: { title: string; from: string; to: string }[];
  instructions: string;
};

export function protocolsForAi(runs: ProtocolRun[], window: { from: string; to: string }): ProtocolForAi[] {
  const out: ProtocolForAi[] = [];
  for (const run of runs) {
    if (run.status !== "actief") continue;
    const protocol = protocolBySlug(run.protocolSlug);
    if (!protocol?.aiHint) continue;
    const end = runEndDate(protocol, run);
    if (end < window.from || run.startDate > window.to) continue;
    const anchor = anchorDate(protocol, run);
    out.push({
      slug: protocol.slug,
      title: protocol.title,
      from: run.startDate,
      to: end,
      raceDate: run.raceDate,
      phases: protocol.phases.map((phase) => ({
        title: phase.title,
        from: shiftDays(anchor, phase.fromDay),
        to: shiftDays(anchor, phase.toDay),
      })),
      instructions: protocol.aiHint,
    });
  }
  return out;
}
