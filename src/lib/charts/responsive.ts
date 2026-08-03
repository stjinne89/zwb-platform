/**
 * Maatvoering voor grafieken die op hun wérkelijke breedte tekenen.
 *
 * De oude grafieken hadden een vaste viewBox (bv. 980 breed) die met
 * `w-full` naar de containerbreedte werd geschaald. Op een telefoon betekende
 * dat een schaalfactor van ~0,35: een `fontSize="12"` kwam als ~4px op het
 * scherm. Door de viewBox gelijk te houden aan de containerbreedte is één
 * SVG-eenheid weer één CSS-pixel, en klopt de typografie op elk formaat.
 *
 * Smal scherm lost je dus niet op met kleinere letters maar met mínder
 * datapunten: minder ticks, kortere labels, krappere marges.
 */

export type ChartDensity = "compact" | "comfortable";

export type ChartMargin = { top: number; right: number; bottom: number; left: number };

export type ChartMetrics = {
  density: ChartDensity;
  /** Astekst in px — 1:1 met wat de gebruiker ziet. */
  axisFontSize: number;
  /** Reekslabels binnen het grafiekvlak. */
  labelFontSize: number;
  margin: ChartMargin;
  xTickCount: number;
  yTickCount: number;
  strokeWidth: { primary: number; secondary: number };
  dotRadius: number;
  /** Raakvlak voor tap-doelen binnen de grafiek. */
  hitRadius: number;
};

/** Onder deze breedte tekenen we in compacte dichtheid. */
export const CHART_COMPACT_MAX_WIDTH = 560;

/** Ondergrens voor leesbare datatekst op mobiel. */
export const MIN_DATA_FONT_SIZE = 12;

export function chartDensity(width: number): ChartDensity {
  return width < CHART_COMPACT_MAX_WIDTH ? "compact" : "comfortable";
}

export function chartMetrics(width: number): ChartMetrics {
  const density = chartDensity(width);
  if (density === "compact") {
    return {
      density,
      axisFontSize: MIN_DATA_FONT_SIZE,
      labelFontSize: MIN_DATA_FONT_SIZE,
      margin: { top: 18, right: 12, bottom: 30, left: 36 },
      xTickCount: 3,
      yTickCount: 3,
      strokeWidth: { primary: 2.4, secondary: 1.8 },
      dotRadius: 3,
      hitRadius: 22,
    };
  }
  return {
    density,
    axisFontSize: 13,
    labelFontSize: 13,
    margin: { top: 24, right: 24, bottom: 40, left: 54 },
    xTickCount: 6,
    yTickCount: 5,
    strokeWidth: { primary: 3, secondary: 2.2 },
    dotRadius: 3.5,
    hitRadius: 16,
  };
}

/**
 * Hoogte van een grafiek bij een gegeven breedte. Op mobiel mag een grafiek
 * relatief hoger zijn dan op desktop — anders wordt hij een streepje.
 */
export function chartHeight(
  width: number,
  { compact = 0.78, comfortable = 0.42, min = 180, max = 460 } = {},
) {
  const ratio = chartDensity(width) === "compact" ? compact : comfortable;
  return Math.round(Math.max(min, Math.min(max, width * ratio)));
}

/**
 * Kies gelijkmatig verdeelde indices uit een reeks, zodat een smalle grafiek
 * minder ticks krijgt in plaats van kleinere labels. Eerste en laatste punt
 * doen altijd mee.
 */
export function tickIndices(length: number, count: number): number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];
  const wanted = Math.max(2, Math.min(count, length));
  const step = (length - 1) / (wanted - 1);
  const indices = Array.from({ length: wanted }, (_, i) => Math.round(i * step));
  return indices.filter((value, index) => indices.indexOf(value) === index);
}

/**
 * Positie van de aanwijzer als fractie (0-1) van het plotvlak. Werkt voor muis
 * én touch omdat we op pointer-events zitten.
 */
export function pointerRatio(
  event: { clientX: number; currentTarget: Element },
  width: number,
  margin: ChartMargin,
) {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.width === 0) return 0;
  const x = ((event.clientX - rect.left) / rect.width) * width;
  const plotWidth = width - margin.left - margin.right;
  if (plotWidth <= 0) return 0;
  return Math.max(0, Math.min(1, (x - margin.left) / plotWidth));
}

/** Index in een reeks die hoort bij een pointer-fractie. */
export function pointerIndex(ratio: number, length: number) {
  if (length <= 0) return null;
  return Math.max(0, Math.min(length - 1, Math.round(ratio * (length - 1))));
}

/** "2026-08-03" -> "3 aug" (comfortable) of "3/8" (compact). */
export function formatTickDate(dateKey: string, density: ChartDensity) {
  const date = new Date(`${dateKey}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return dateKey;
  if (density === "compact") {
    return `${date.getDate()}/${date.getMonth() + 1}`;
  }
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}
