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

const CELSIUS = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Waarden daarbuiten zijn een losse sensor of een rekenfout, geen kerntemperatuur. */
const PLAUSIBLE_MIN_C = 34;
const PLAUSIBLE_MAX_C = 43;

/**
 * Een gat tussen twee metingen telt tot zo lang mee. intervals.icu vult zelf
 * gaten tot 30 seconden op; CORE 2 meet op sommige toestellen elke 10 seconden.
 */
const MAX_GAP_S = 30;

export type CoreStream = { type: string; data: Array<number | null> };

export type CoreSummary = {
  maxC: number;
  minutesAbove: number;
  /** Minuten vanaf de start tot de eerste meting op of boven de drempel; null als die niet werd gehaald. */
  minutesToThreshold: number | null;
  /** Hoeveel procent van de rit de sensor een bruikbare meting gaf. */
  coveragePct: number;
};

/**
 * Een THb-stream geldt pas als kerntemperatuur als de mediaan hierboven ligt.
 * Echte hemoglobine (rond 12 tot 15 g/dl) valt er ver onder, en de
 * huidtemperatuur die CORE op een tweede kanaal kan sturen meestal ook.
 */
const THB_MIN_MEDIAN_C = 36;

const CORE_NAME = /(^|_)core_temperature$/i;
const THB_NAME = /^thb/i;

/** Kan in een stream met deze naam een kerntemperatuur zitten? */
export function mayHoldCoreTemperature(type: string): boolean {
  return CORE_NAME.test(type) || THB_NAME.test(type);
}

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
  const named = streams.find((stream) => CORE_NAME.test(stream.type));
  if (named) return named.data;

  let best: { data: Array<number | null>; median: number } | null = null;
  for (const stream of streams) {
    if (!THB_NAME.test(stream.type)) continue;
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
 * Hoogste kerntemperatuur, minuten op of boven de drempel, wanneer de drempel
 * voor het eerst werd gehaald en hoeveel van de rit de sensor mat. Elke meting
 * telt tot de volgende (hooguit MAX_GAP_S). Zonder tijdreeks rekenen we met één
 * meting per seconde, zoals intervals.icu de streams aanlevert. Null als er
 * geen bruikbare meting in zit.
 */
export function summarizeCoreTemperature(
  core: Array<number | null>,
  time: Array<number | null> | null,
  threshold = CORE_THRESHOLD_C,
): CoreSummary | null {
  const at = (i: number) => (time ? time[i] : i);
  const times = time ? time.filter((value): value is number => typeof value === "number") : null;
  const start = times ? (times[0] ?? 0) : 0;
  const span = times ? (times.length > 0 ? times[times.length - 1] - start : 0) : Math.max(core.length - 1, 0);

  let max: number | null = null;
  let secondsAbove = 0;
  let secondsCovered = 0;
  let firstAbove: number | null = null;
  for (let i = 0; i < core.length; i++) {
    const value = core[i];
    if (!plausible(value)) continue;
    if (max === null || value > max) max = value;
    const now = at(i);
    if (value >= threshold && firstAbove === null && typeof now === "number") firstAbove = now;
    if (i === core.length - 1) continue;
    const next = at(i + 1);
    if (typeof now !== "number" || typeof next !== "number" || next <= now) continue;
    const step = Math.min(next - now, MAX_GAP_S);
    secondsCovered += step;
    if (value >= threshold) secondsAbove += step;
  }
  if (max === null) return null;
  return {
    maxC: Math.round(max * 100) / 100,
    minutesAbove: Math.floor(secondsAbove / 60),
    minutesToThreshold: firstAbove === null ? null : Math.floor((firstAbove - start) / 60),
    coveragePct: span > 0 ? Math.min(100, Math.round((secondsCovered / span) * 100)) : 0,
  };
}

/** Wat de analyse van een hittesessie nodig heeft; oudere rijen missen de laatste drie. */
export type HeatSessionMetrics = {
  maxC: number;
  minutesAbove: number;
  rideMinutes: number | null;
  minutesToThreshold: number | null;
  coveragePct: number | null;
};

export type HeatVerdict = {
  /** Voldoet aan de eisen van de taak; dan vinkt de app af. */
  met: boolean;
  /** Waarom niet, één zin per eis die niet gehaald is. */
  reasons: string[];
  /** Eén aanwijzing voor de volgende keer. */
  tip: string | null;
  /** Wat opvalt, ook als de sessie voldoet (te heet). */
  notes: string[];
};

/** Een paar minuten korter dan voorgeschreven telt nog (uitrijden, een stop). Eigen keuze. */
export const RIDE_TOLERANCE_MIN = 5;
/** Daaronder mat de sensor te weinig om "te kort boven de drempel" te kunnen zeggen. */
export const MIN_COVERAGE_PCT = 60;
/** Vanaf hier een waarschuwing; ruim boven waar de studies naartoe werkten. */
export const CAUTION_C = 39.5;
/** Haal je de drempel later, dan ligt de oplossing in warmer beginnen. */
const LATE_THRESHOLD_MIN = 20;

/**
 * Toetst een rit aan de eisen van een hittesessie: lang genoeg gereden
 * (`rideMinutes`) en lang genoeg op of boven de drempel (`coreMinutes`).
 * Vaste regels, geen AI: de kerntemperatuur gaat niet naar OpenAI.
 */
export function analyzeHeatSession(
  task: Pick<ProtocolTask, "coreMinutes" | "rideMinutes">,
  session: HeatSessionMetrics,
): HeatVerdict {
  const reasons: string[] = [];
  const notes: string[] = [];
  let tip: string | null = null;
  const threshold = CELSIUS.format(CORE_THRESHOLD_C);

  if (task.rideMinutes && session.rideMinutes !== null && session.rideMinutes < task.rideMinutes - RIDE_TOLERANCE_MIN) {
    reasons.push(`Je reed ${session.rideMinutes} minuten; het protocol vraagt er ${task.rideMinutes}.`);
    tip = "Rijd de volle tijd; het opwarmen tot de drempel gaat van je sessie af.";
  }

  if (task.coreMinutes && session.minutesAbove < task.coreMinutes) {
    if (session.coveragePct !== null && session.coveragePct < MIN_COVERAGE_PCT) {
      reasons.push(
        `De sensor mat maar ${session.coveragePct}% van de rit, dus hoe lang je boven ${threshold} °C zat is niet zeker.`,
      );
      tip = "Controleer of de sensor goed vastzit en geladen is. Weet je dat het goed ging, vink de sessie dan zelf af.";
    } else if (session.maxC < CORE_THRESHOLD_C) {
      reasons.push(`Je kerntemperatuur kwam tot ${CELSIUS.format(session.maxC)} °C; de drempel is ${threshold} °C.`);
      tip ??= "Zet de ventilator uit en trek vanaf de start een extra laag of een regenjas aan.";
    } else {
      reasons.push(`Je zat ${session.minutesAbove} minuten op of boven ${threshold} °C; nodig is ${task.coreMinutes}.`);
      if (session.minutesToThreshold !== null && session.minutesToThreshold > LATE_THRESHOLD_MIN) {
        tip = `Je haalde ${threshold} °C pas na ${session.minutesToThreshold} minuten. Begin warmer: een extra laag vanaf de start, of het eerste kwartier iets harder.`;
      } else {
        tip ??= `Blijf langer doorrijden nadat je ${threshold} °C hebt gehaald.`;
      }
    }
  }

  if (session.maxC >= CAUTION_C) {
    notes.push(
      `Je kwam tot ${CELSIUS.format(session.maxC)} °C, ruim boven de ${threshold} °C waar de studies naartoe werkten. Let op duizeligheid, misselijkheid of hoofdpijn, en drink genoeg.`,
    );
  }

  return { met: Boolean(task.coreMinutes) && reasons.length === 0, reasons, tip, notes };
}

/** Heeft dit protocol hittesessies die een CORE-sensor kan bevestigen? */
export function protocolUsesCore(protocol: { phases: { tasks: Pick<ProtocolTask, "coreMinutes">[] }[] }): boolean {
  return protocol.phases.some((phase) => phase.tasks.some((task) => Boolean(task.coreMinutes)));
}

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
  /** Welke streams intervals.icu van de rit heeft, bv. ["time", "watts", "core_temperature"]. */
  stream_types?: unknown;
  /** Staat bij een rit die intervals.icu van Strava kreeg (isStravaStub). */
  _note?: unknown;
};

export type CoreCandidate = {
  run: ProtocolRun;
  protocol: Protocol;
  intervalsId: string;
  day: string;
  /** Op te vragen streams; leeg betekent alle (de lijst zei niet welke er zijn). */
  streamTypes: string[];
  /** Bewegingstijd in hele minuten, uit de lijst. */
  rideMinutes: number | null;
};

/**
 * Korter dan dit is geen hittesessie, ook niet om te tonen. Ritten tussen dit
 * en de drempel van de taak worden wel gemeten en getoond, maar niet afgevinkt.
 */
const MIN_RIDE_S = 5 * 60;

/** Zo ver kijkt de app terug naar ritten met kerntemperatuur. */
export const CORE_WINDOW_DAYS = 14;

/**
 * Welke ritten de moeite van het ophalen waard zijn: fietsritten van minstens
 * vijf minuten op een dag met een hittesessie, niet via Strava (die hebben bij
 * intervals.icu geen streams), met een stream waar een kerntemperatuur in kan
 * zitten en nog niet eerder bekeken. Zegt de lijst niet welke streams er zijn,
 * dan halen we alles op. Nieuwste eerst, zodat de rit van vandaag voorgaat als
 * het budget op is.
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
      if (!phaseOn(protocol, run, day)?.tasks.some((task) => task.coreMinutes)) continue;
      if ((activity.moving_time ?? 0) < MIN_RIDE_S) continue;
      let streamTypes: string[] = [];
      if (Array.isArray(activity.stream_types)) {
        const coreTypes = activity.stream_types.filter(
          (type): type is string => typeof type === "string" && mayHoldCoreTemperature(type),
        );
        if (coreTypes.length === 0) continue;
        streamTypes = ["time", ...coreTypes];
      }
      const rideMinutes = typeof activity.moving_time === "number" ? Math.floor(activity.moving_time / 60) : null;
      out.push({ run, protocol, intervalsId: String(activity.id), day, streamTypes, rideMinutes });
    }
  }
  return out.sort((a, b) => b.day.localeCompare(a.day));
}
