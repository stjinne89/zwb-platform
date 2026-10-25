// Het ZWBeter-blok dat na een rit onderaan de Strava-beschrijving komt.
// Alles hier is puur: geen database, geen fetch. Dat maakt het testbaar en houdt
// de orchestrator (src/lib/strava/summary-writer.ts) klein.
//
// Tot 2026-10-25 volgde het blok regel voor regel de opbouw van JOIN (labels met
// een dubbele punt, "-" voor een lege waarde, alleen CTL als voortgang). Nu korte
// regels met een emoji ervoor, de ZWBriljant-steen als voortgang en een tip.
// Regels zonder gegevens vallen weg.

import { intensityLabel } from "@/lib/training/workouts";
import { amsterdamDayKey, type FitnessTrend } from "@/lib/training/zwbeterworden";
import { rideTip } from "@/lib/training/strava-summary-tips";
import type { StoredSnapshot } from "@/lib/briljant/compare";
import type { Sex } from "@/lib/briljant/norms";
import { points, positionFor } from "@/lib/briljant/score";
import { winsFromLevels } from "@/lib/briljant/view";
import { mondayKey, shiftDay } from "@/lib/briljant/snapshot";

/**
 * Strava kent geen opmaak; vet kan alleen met de vette letters uit Unicode
 * (Mathematical Sans-Serif Bold). Alleen A-Z, a-z en 0-9; de rest blijft staan.
 */
export function unicodeBold(text: string): string {
  return Array.from(text, (char) => {
    const code = char.codePointAt(0)!;
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d5d4 + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d5ee + code - 97);
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ec + code - 48);
    return char;
  }).join("");
}

export const ZWB_SUMMARY_HEADER = unicodeBold("ZWBeter workout-samenvatting");

/** De kopregel van vóór 2026-10-25. Blijft herkend, zodat oude blokken netjes wijken. */
const LEGACY_SUMMARY_HEADER = "📊 ZWBeter Worden";

/**
 * Regels die tot ons blok horen: de voorvoegsels van nu en de labels van het
 * oude blok. Anker voor het opruimen van een oud blok.
 */
const ZWB_SUMMARY_LINE = new RegExp(
  "^(?:💎 |🎯 |⚡ |🔋 |📈 |💬 )" +
    "|^(?:Gepland|Geplande duur|Gedetecteerd type|Workout score|CTL|Gereedscore|Fitness-status):" +
    "|^📈 Progressie$",
  "u",
);

/** De steen voor in het blok, uit de laatste ZWBriljant-snapshot. */
export type BriljantSummary = {
  /** Score in punten, zoals op het scherm (427). */
  points: number;
  /** Klasse bij die score (Platina). */
  level: string;
  /** Volgende klasse; null in Diamant. */
  nextLevel: string | null;
  /** Punten tot de volgende klasse; 0 in Diamant. */
  toNext: number;
  /** Verschil in punten met vier weken eerder; null zonder historie. */
  delta4w: number | null;
  /**
   * Het onderdeel waar 5% beter de meeste punten oplevert (zoals "Waar win je het
   * meest" op de steen). Tot 2026-10-25 stond hier het laagste facet, maar dat
   * weegt soms maar 5%.
   */
  growFacet: string | null;
};

export type ZwbSummaryInput = {
  /** Strava-id van de rit; kiest de variant van de tip. */
  activityId: number;
  plannedTitle: string | null;
  plannedIntensity: string | null;
  plannedMinutes: number | null;
  /** Geschatte TSS van het schema, uit estimateTrainingLoad(). */
  plannedLoad: number | null;
  /** Werkelijke TSS, uit de Strava-rit (lib/training/ride-metrics.ts). */
  actualLoad: number | null;
  detectedIntensity: string | null;
  /** Alleen nog als terugval wanneer er geen steen is. */
  ctl: number | null;
  /** Null zonder steen, of als het lid zijn steen niet deelt. */
  briljant: BriljantSummary | null;
  /** ZwbAdvice.level, 1-5; 0 of null betekent "nog geen advies". */
  readinessLevel: number | null;
  readinessTitle: string | null;
  /** TrainingReadinessSummary.score, 0-100. */
  readinessScore: number | null;
  fitnessTrend: FitnessTrend;
};

/** Ouder dan zoveel dagen telt een snapshot niet meer als "je steen van nu". */
const BRILJANT_MAX_AGE_DAYS = 35;

/**
 * De steen uit de bewaarde weeksnapshots (oud of nieuw, maakt niet uit). De
 * wekelijkse job houdt ze bij; zo kost de steen in het blok geen extra calls naar
 * intervals.icu of Zwift. Null zonder recente snapshot met score.
 */
export function briljantSummaryFrom(
  snapshots: Array<StoredSnapshot & { durability?: "test" | "ritten" }>,
  today: string,
  sex: Sex | null = null,
): BriljantSummary | null {
  const scored = snapshots
    .filter((snapshot) => snapshot.score != null)
    .sort((a, b) => a.week.localeCompare(b.week));
  const latest = scored.at(-1);
  if (!latest || latest.score == null) return null;
  if (latest.week < shiftDay(mondayKey(today), -BRILJANT_MAX_AGE_DAYS)) return null;

  const position = positionFor(latest.score);
  const before = scored.find((snapshot) => snapshot.week === shiftDay(latest.week, -28));
  const grow = winsFromLevels(latest.facets, latest.consistency, sex, latest.durability)[0] ?? null;
  return {
    points: points(latest.score),
    level: position.reached.name,
    nextLevel: position.next?.name ?? null,
    toNext: position.toNext,
    delta4w: before?.score == null ? null : points(latest.score) - points(before.score),
    growFacet: grow?.label ?? null,
  };
}

/** Nederlands decimaalteken, consistent met de rest van de app. */
function dutchDecimal(value: number, digits = 1) {
  return value.toFixed(digits).replace(".", ",");
}

/**
 * Verschil tussen werkelijke en geplande belasting in hele procenten.
 * Symmetrisch afgerond, zodat -12,5% ook echt -13% wordt (Math.round rondt .5
 * richting +oneindig).
 */
export function loadDeltaPct(
  actualLoad: number | null,
  plannedLoad: number | null,
): number | null {
  if (actualLoad == null || plannedLoad == null || plannedLoad <= 0) return null;
  const raw = ((actualLoad - plannedLoad) / plannedLoad) * 100;
  // `|| 0` maakt van -0 een gewone 0.
  return Math.sign(raw) * Math.round(Math.abs(raw)) || 0;
}

export function fitnessTrendLabel(trend: FitnessTrend): string | null {
  if (trend === "improving") return "fitheid stijgt";
  if (trend === "declining") return "fitheid zakt";
  if (trend === "stable") return "fitheid blijft gelijk";
  return null;
}

function progressLine(input: ZwbSummaryInput): string | null {
  const stone = input.briljant;
  if (stone) {
    const head = `💎 ZWBriljant ${stone.level} · ${stone.points.toLocaleString("nl-NL")} punten`;
    if (stone.nextLevel) return `${head}, nog ${stone.toNext} tot ${stone.nextLevel}`;
    if (stone.delta4w != null && stone.delta4w !== 0) {
      const sign = stone.delta4w > 0 ? "+" : "-";
      return `${head}, ${sign}${Math.abs(stone.delta4w)} in 4 weken`;
    }
    return head;
  }
  return input.ctl == null ? null : `📈 CTL ${dutchDecimal(input.ctl)}`;
}

function planLine(input: ZwbSummaryInput): string {
  const detected = intensityLabel(input.detectedIntensity).toLowerCase();
  const ridden = detected ? ` → gereden als ${detected}` : "";
  const planned =
    input.plannedTitle?.trim() || intensityLabel(input.plannedIntensity);
  if (!planned) return `🎯 Vrije rit${ridden}`;
  const minutes = input.plannedMinutes ? ` (${input.plannedMinutes} min)` : "";
  return `🎯 ${planned}${minutes}${ridden}`;
}

function loadLine(input: ZwbSummaryInput): string | null {
  if (input.actualLoad == null) return null;
  const tss = `⚡ ${Math.round(input.actualLoad)} TSS`;
  const pct = loadDeltaPct(input.actualLoad, input.plannedLoad);
  if (pct == null) return tss;
  if (pct === 0) return `${tss}, precies volgens plan`;
  return `${tss}, ${Math.abs(pct)}% ${pct > 0 ? "boven" : "onder"} plan`;
}

function readinessLine(input: ZwbSummaryInput): string | null {
  const { readinessLevel, readinessScore, readinessTitle } = input;
  const parts: string[] = [];
  if (readinessLevel && readinessScore != null) {
    parts.push(
      readinessTitle
        ? `Gereedscore ${readinessScore}, ${readinessTitle.toLowerCase()}`
        : `Gereedscore ${readinessScore}`,
    );
  }
  const trend = fitnessTrendLabel(input.fitnessTrend);
  if (trend) parts.push(parts.length ? trend : trend.charAt(0).toUpperCase() + trend.slice(1));
  return parts.length ? `🔋 ${parts.join(" · ")}` : null;
}

/**
 * Bouwt het blok. De kopregel, de regel met het plan en de tip staan er altijd;
 * de kopregel is het anker waarmee we een oud blok terugvinden. De andere regels
 * vallen weg als de gegevens ontbreken.
 */
export function buildZwbSummaryBlock(input: ZwbSummaryInput): string {
  const hasPlan = Boolean(
    input.plannedTitle?.trim() || intensityLabel(input.plannedIntensity),
  );
  const tip = rideTip({
    activityId: input.activityId,
    hasPlan,
    plannedIntensity: input.plannedIntensity,
    detectedIntensity: input.detectedIntensity,
    loadPct: loadDeltaPct(input.actualLoad, input.plannedLoad),
    readinessLevel: input.readinessLevel,
    fitnessTrend: input.fitnessTrend,
    nextLevel: input.briljant?.nextLevel ?? null,
    toNext: input.briljant?.toNext ?? null,
    growFacet: input.briljant?.growFacet ?? null,
  });
  return [
    ZWB_SUMMARY_HEADER,
    progressLine(input),
    planLine(input),
    loadLine(input),
    readinessLine(input),
    `💬 ${tip}`,
  ]
    .filter((line): line is string => line != null)
    .join("\n");
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
 * dan valt hij terug op de laatste kopregel (de huidige of die van het oude
 * blok), maar alléén als álle regels
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
  const headerIndex = Math.max(
    lines.lastIndexOf(ZWB_SUMMARY_HEADER),
    lines.lastIndexOf(LEGACY_SUMMARY_HEADER),
  );
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
