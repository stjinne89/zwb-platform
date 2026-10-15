// Kerntemperatuur van een CORE-sensor tijdens een hittesessie. De sensor zet
// zijn meting in het FIT-bestand van de fietscomputer; intervals.icu maakt daar
// de stream `core_temperature` van. Hier alleen de rekenregels, los van de
// database en intervals.icu, zodat het te testen is. Ophalen en bewaren:
// core-fill.ts.

import { isCyclingSportType } from "@/lib/strava/sports";
import { shiftDays } from "@/lib/training/season";
import { phaseOn, protocolBySlug, runEndDate } from "./index";
import type { Protocol, ProtocolRun, ProtocolTask } from "./types";

/**
 * De kerntemperatuur waar renners in de hittepakstudies naartoe werkten
 * (ongeveer 38,5 °C; zie docs/protocollen-onderzoek.md, sectie CORE). Het
 * aantal minuten per taak (`coreMinutes`) is een eigen keuze.
 */
export const CORE_THRESHOLD_C = 38.5;

/** Waarden daarbuiten zijn een losse sensor of een rekenfout, geen kerntemperatuur. */
const PLAUSIBLE_MIN_C = 34;
const PLAUSIBLE_MAX_C = 43;

/**
 * Een gat tussen twee metingen telt tot zo lang mee. intervals.icu vult zelf
 * gaten tot 30 seconden op; CORE 2 meet op sommige toestellen elke 10 seconden.
 */
const MAX_GAP_S = 30;

export type CoreStream = { type: string; data: Array<number | null> };

export type CoreSummary = { maxC: number; minutesAbove: number };

/**
 * Een THb-stream geldt pas als kerntemperatuur als de mediaan hierboven ligt.
 * Echte hemoglobine (rond 12 tot 15 g/dl) valt er ver onder, en de
 * huidtemperatuur die CORE op een tweede kanaal kan sturen meestal ook.
 */
const THB_MIN_MEDIAN_C = 36;

/**
 * De kerntemperatuur uit de streams van een rit. intervals.icu noemt hem
 * `core_temperature`; een dataveld uit Connect IQ kan met een voorvoegsel
 * binnenkomen (zoals `0_95_heat_strain_index` bij de HSI).
 *
 * Oudere Wahoo's (ELEMNT, BOLT en ROAM van vóór de BOLT 3) koppelen de sensor
 * als spierzuurstofsensor; de kerntemperatuur staat dan in graden in het
 * THb-veld. Zonder `core_temperature` nemen we de THb-stream met de hoogste
 * mediaan, als die in het bereik van een kerntemperatuur ligt.
 */
export function coreTemperatureStream(streams: CoreStream[]): Array<number | null> | null {
  const exact = streams.find((stream) => stream.type === "core_temperature");
  if (exact) return exact.data;
  const named = streams.find((stream) => /(^|_)core_temperature$/i.test(stream.type));
  if (named) return named.data;

  let best: { data: Array<number | null>; median: number } | null = null;
  for (const stream of streams) {
    if (!/^thb/i.test(stream.type)) continue;
    const median = plausibleMedian(stream.data);
    if (median !== null && median >= THB_MIN_MEDIAN_C && (!best || median > best.median)) {
      best = { data: stream.data, median };
    }
  }
  return best?.data ?? null;
}

function plausible(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= PLAUSIBLE_MIN_C && value <= PLAUSIBLE_MAX_C;
}

/**
 * Mediaan van alle gemeten waarden, of null als minder dan de helft daarvan
 * een mogelijke kerntemperatuur is (dan is het een echte hemoglobinemeting).
 */
function plausibleMedian(data: Array<number | null>): number | null {
  const measured = data.filter((value): value is number => typeof value === "number" && value > 0);
  const values = measured.filter(plausible).sort((a, b) => a - b);
  if (values.length === 0 || values.length * 2 < measured.length) return null;
  return values[Math.floor(values.length / 2)];
}

/**
 * Hoogste kerntemperatuur en minuten op of boven de drempel. Elke meting telt
 * tot de volgende (hooguit MAX_GAP_S). Zonder tijdreeks rekenen we met één
 * meting per seconde, zoals intervals.icu de streams aanlevert. Null als er
 * geen bruikbare meting in zit.
 */
export function summarizeCoreTemperature(
  core: Array<number | null>,
  time: Array<number | null> | null,
  threshold = CORE_THRESHOLD_C,
): CoreSummary | null {
  let max: number | null = null;
  let secondsAbove = 0;
  for (let i = 0; i < core.length; i++) {
    const value = core[i];
    if (!plausible(value)) continue;
    if (max === null || value > max) max = value;
    if (value < threshold || i === core.length - 1) continue;
    const now = time ? time[i] : i;
    const next = time ? time[i + 1] : i + 1;
    if (typeof now !== "number" || typeof next !== "number") continue;
    const step = next - now;
    if (step > 0) secondsAbove += Math.min(step, MAX_GAP_S);
  }
  if (max === null) return null;
  return { maxC: Math.round(max * 100) / 100, minutesAbove: Math.floor(secondsAbove / 60) };
}

/** Telt deze rit als de hittesessie van de taak? */
export function meetsCoreTarget(task: Pick<ProtocolTask, "coreMinutes">, summary: CoreSummary | null): boolean {
  return Boolean(task.coreMinutes && summary && summary.minutesAbove >= task.coreMinutes);
}

/** Heeft dit protocol hittesessies die een CORE-sensor kan bevestigen? */
export function protocolUsesCore(protocol: { phases: { tasks: Pick<ProtocolTask, "coreMinutes">[] }[] }): boolean {
  return protocol.phases.some((phase) => phase.tasks.some((task) => Boolean(task.coreMinutes)));
}

const CELSIUS = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "38,7 °C · 42 min boven 38,5 °C" */
export function formatCoreSession(session: { maxC: number; minutesAbove: number }): string {
  return `${CELSIUS.format(session.maxC)} °C · ${session.minutesAbove} min boven ${CELSIUS.format(CORE_THRESHOLD_C)} °C`;
}

/** Een rit uit intervals.icu, zoals de lijst hem geeft. */
export type CoreActivity = {
  id: string;
  start_date_local?: string;
  type?: string;
  source?: string | null;
  moving_time?: number;
  /** Staat bij een rit die intervals.icu van Strava kreeg (isStravaStub). */
  _note?: unknown;
};

export type CoreCandidate = { run: ProtocolRun; protocol: Protocol; intervalsId: string; day: string };

/** Zo ver kijkt de app terug naar ritten met kerntemperatuur. */
export const CORE_WINDOW_DAYS = 14;

/**
 * Welke ritten de moeite van het ophalen waard zijn: fietsritten op een dag met
 * een hittesessie, lang genoeg om de drempel te halen, niet via Strava (die
 * hebben bij intervals.icu geen streams) en nog niet eerder bekeken. Nieuwste
 * eerst, zodat de rit van vandaag voorgaat als het budget op is.
 */
export function coreCandidates(
  runs: ProtocolRun[],
  activities: CoreActivity[],
  seen: Set<string>,
  today: string,
): CoreCandidate[] {
  const out: CoreCandidate[] = [];
  const oldest = shiftDays(today, -CORE_WINDOW_DAYS);
  for (const run of runs) {
    const protocol = protocolBySlug(run.protocolSlug);
    if (run.status !== "actief" || !protocol || !protocolUsesCore(protocol)) continue;
    const end = runEndDate(protocol, run) < today ? runEndDate(protocol, run) : today;
    for (const activity of activities) {
      const day = String(activity.start_date_local ?? "").slice(0, 10);
      if (!activity.id || !day || day < run.startDate || day < oldest || day > end) continue;
      if (seen.has(`${run.id}|${activity.id}`)) continue;
      if (!isCyclingSportType(activity.type) || activity._note) continue;
      if (String(activity.source ?? "").toUpperCase() === "STRAVA") continue;
      const minutes = phaseOn(protocol, run, day)?.tasks.flatMap((task) => (task.coreMinutes ? [task.coreMinutes] : []));
      if (!minutes?.length) continue;
      if ((activity.moving_time ?? 0) < Math.min(...minutes) * 60) continue;
      out.push({ run, protocol, intervalsId: String(activity.id), day });
    }
  }
  return out.sort((a, b) => b.day.localeCompare(a.day));
}
