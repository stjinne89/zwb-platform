// Het ZWBeter Worden-blok dat na een rit onderaan de Strava-beschrijving komt.
// Alles hier is puur: geen database, geen fetch. Dat maakt het testbaar en houdt
// de orchestrator (src/lib/strava/summary-writer.ts) klein.

import { intensityLabel } from "@/lib/training/workouts";
import { amsterdamDayKey, type FitnessTrend } from "@/lib/training/zwbeterworden";

export const ZWB_SUMMARY_HEADER = "📊 ZWBeter Worden";
export const ZWB_PROGRESS_HEADER = "📈 Progressie";

/** Regels die tot ons blok horen. Anker voor het opruimen van een oud blok. */
const ZWB_SUMMARY_LINE = new RegExp(
  `^(?:Gepland|Geplande duur|Gedetecteerd type|Workout score|CTL|Gereedscore|Fitness-status):|^${ZWB_PROGRESS_HEADER}$`,
);

/** Waarde-plaatshouder, zelfde conventie als JOIN. */
const EMPTY = "-";

export type ZwbSummaryInput = {
  plannedTitle: string | null;
  plannedIntensity: string | null;
  plannedMinutes: number | null;
  /** Geschatte TSS van het schema, uit estimateTrainingLoad(). */
  plannedLoad: number | null;
  /** Werkelijke TSS, uit intervals_activities.training_load. */
  actualLoad: number | null;
  detectedIntensity: string | null;
  ctl: number | null;
  /** ZwbAdvice.level, 1-5; 0 of null betekent "nog geen advies". */
  readinessLevel: number | null;
  readinessTitle: string | null;
  /** TrainingReadinessSummary.score, 0-100. */
  readinessScore: number | null;
  fitnessTrend: FitnessTrend;
};

/** Nederlands decimaalteken, consistent met de rest van de app. */
function dutchDecimal(value: number, digits = 1) {
  return value.toFixed(digits).replace(".", ",");
}

/**
 * Verschil tussen werkelijke en geplande belasting. Symmetrisch afgerond, zodat
 * -12,5% ook echt -13% wordt (Math.round rondt .5 richting +oneindig).
 */
export function workoutScoreLabel(
  actualLoad: number | null,
  plannedLoad: number | null,
): string {
  if (actualLoad == null || plannedLoad == null || plannedLoad <= 0) return EMPTY;
  const raw = ((actualLoad - plannedLoad) / plannedLoad) * 100;
  const pct = Math.sign(raw) * Math.round(Math.abs(raw));
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}% (${Math.round(actualLoad)} vs ${Math.round(plannedLoad)} TSS)`;
}

export function fitnessStatusLabel(trend: FitnessTrend): string {
  if (trend === "improving") return "Verbeterend";
  if (trend === "declining") return "Afnemend";
  if (trend === "stable") return "Stabiel";
  return EMPTY;
}

function plannedLabel(input: ZwbSummaryInput): string {
  if (input.plannedTitle?.trim()) return input.plannedTitle.trim();
  const label = intensityLabel(input.plannedIntensity);
  return label || EMPTY;
}

function readinessLabel(input: ZwbSummaryInput): string {
  const { readinessLevel, readinessScore, readinessTitle } = input;
  if (!readinessLevel || readinessScore == null) return EMPTY;
  const suffix = readinessTitle
    ? `niveau ${readinessLevel} – ${readinessTitle}`
    : `niveau ${readinessLevel}`;
  return `${readinessScore} (${suffix})`;
}

/**
 * Bouwt het blok. De twee kopregels staan er altijd, ook als alle waarden
 * ontbreken: ze zijn het anker waarmee we een oud blok terugvinden.
 */
export function buildZwbSummaryBlock(input: ZwbSummaryInput): string {
  const detected = intensityLabel(input.detectedIntensity);
  return [
    ZWB_SUMMARY_HEADER,
    `Gepland: ${plannedLabel(input)}`,
    `Geplande duur: ${input.plannedMinutes ? `${input.plannedMinutes} min` : EMPTY}`,
    `Gedetecteerd type: ${detected || EMPTY}`,
    `Workout score: ${workoutScoreLabel(input.actualLoad, input.plannedLoad)}`,
    ZWB_PROGRESS_HEADER,
    `CTL: ${input.ctl == null ? EMPTY : dutchDecimal(input.ctl)}`,
    `Gereedscore: ${readinessLabel(input)}`,
    `Fitness-status: ${fitnessStatusLabel(input.fitnessTrend)}`,
  ].join("\n");
}

/** FNV-1a als hex, om te zien of een blok is veranderd sinds de vorige write. */
export function summaryHash(block: string): string {
  let h = 2166136261;
  for (let i = 0; i < block.length; i++) {
    h ^= block.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/**
 * Haalt een eerder geschreven ZWB-blok uit de beschrijving.
 *
 * Eerst letterlijk op de opgeslagen tekst — dat is het normale pad en precies.
 * Lukt dat niet (bijvoorbeeld doordat Strava witruimte heeft genormaliseerd),
 * dan valt hij terug op de laatste kopregel, maar alléén als álle regels
 * daarna van ons zijn. Staat er vreemde tekst onder ons blok, dan raken we de
 * beschrijving niet aan: die tekst is van het lid.
 */
export function stripZwbSummary(
  description: string | null | undefined,
  previousBlock?: string | null,
): string {
  const text = (description ?? "").replace(/\r\n/g, "\n");
  if (!text.trim()) return "";

  if (previousBlock && text.includes(previousBlock)) {
    // Haal de scheidende lege regel mee weg, zodat er geen gat achterblijft als
    // het lid onder ons blok heeft geschreven.
    const withBlank = `\n\n${previousBlock}`;
    const next = text.includes(withBlank)
      ? text.replace(withBlank, "")
      : text.replace(previousBlock, "");
    return next.trimEnd();
  }

  const lines = text.split("\n");
  const headerIndex = lines.lastIndexOf(ZWB_SUMMARY_HEADER);
  if (headerIndex === -1) return text.trimEnd();

  const tail = lines.slice(headerIndex + 1);
  const ownsTail = tail.every(
    (line) => line.trim() === "" || ZWB_SUMMARY_LINE.test(line),
  );
  if (!ownsTail) return text.trimEnd();

  return lines.slice(0, headerIndex).join("\n").trimEnd();
}

/** Plakt het blok onderaan, met precies één lege regel ertussen. */
export function composeDescription(base: string, block: string): string {
  const trimmed = base.trimEnd();
  return trimmed ? `${trimmed}\n\n${block}` : block;
}

type PlannedWorkoutLike = {
  scheduled_at: string;
  duration_minutes: number | null;
  intensity: string;
};

/**
 * De geplande workout die bij een rit hoort: zelfde dag in Amsterdam-tijd.
 * Rustdagen doen niet mee. Bij meerdere workouts op één dag pakken we die met de
 * duur die het dichtst bij de rit ligt, en anders de vroegst geplande.
 */
export function pickPlannedWorkout<T extends PlannedWorkoutLike>(
  workouts: T[],
  activityStart: Date,
  activityMinutes: number | null,
): T | null {
  const dayKey = amsterdamDayKey(activityStart);
  const sameDay = workouts.filter(
    (w) =>
      w.intensity !== "rest" &&
      amsterdamDayKey(new Date(w.scheduled_at)) === dayKey,
  );
  if (sameDay.length === 0) return null;
  if (sameDay.length === 1 || activityMinutes == null) {
    return [...sameDay].sort((a, b) =>
      a.scheduled_at.localeCompare(b.scheduled_at),
    )[0];
  }

  const gap = (w: T) =>
    w.duration_minutes == null
      ? Number.POSITIVE_INFINITY
      : Math.abs(w.duration_minutes - activityMinutes);
  return [...sameDay].sort((a, b) => {
    const diff = gap(a) - gap(b);
    if (diff !== 0) return diff;
    return a.scheduled_at.localeCompare(b.scheduled_at);
  })[0];
}

// pickIntervalsActivity stond hier: die koppelde een Strava-rit aan de
// intervals.icu-activiteit om er de belasting uit te halen. Dat pad is vervallen
// — intervals geeft via de API niets terug voor Strava-activiteiten — en de
// belasting komt nu uit de Strava-payload zelf (lib/training/ride-metrics.ts).
