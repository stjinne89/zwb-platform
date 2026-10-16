"use client";

// Eén grafiek voor reeksen per periode (week, maand, jaar of dag): staven,
// lijnen en trappen op dezelfde x-as. De tegels op /stats/ik tekenen er
// allemaal mee, zodat ze er hetzelfde uitzien.
//
// De grafiek praat: boven het vlak staat een groot leescijfer voor de periode
// waar je naar kijkt. Zonder aanwijzer is dat de laatste periode; schuif je met
// muis of vinger over de grafiek, dan loopt het cijfer mee en licht die periode
// op. Daarom geen zwevende tooltip: het cijfer bovenaan is de tooltip, en het
// staat nooit onder je duim.
//
// Staven en lijnen staan op het midden van hun vak, zodat een lijn over staven
// precies boven de staaf loopt. Meerdere staafreeksen worden gestapeld.

import { useId, useState, type ReactNode } from "react";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { ResponsiveChart } from "@/components/charts/responsive-chart";
import { tickIndices, type ChartMetrics } from "@/lib/charts/responsive";
import { lineSegments } from "@/lib/charts/paths";
import { niceStep } from "@/lib/charts/scale";
import { cn } from "@/lib/utils";

export type PeriodSeries = {
  key: string;
  label: string;
  color: string;
  kind: "bar" | "line" | "step";
  values: Array<number | null>;
  /** Een reeks met een andere eenheid krijgt de rechteras. */
  axis?: "left" | "right";
  /** Lijn gestreept tekenen, bv. voor een referentie. */
  dashed?: boolean;
  /** Bijzaak: dunner en doorschijnend, zodat de hoofdlijn leesbaar blijft. */
  muted?: boolean;
  /** Vlak onder de lijn, in de kleur van de lijn. */
  area?: boolean;
  /** Het hoogste punt krijgt een stip met zijn waarde. */
  peak?: boolean;
};

/** Leescijfer boven de grafiek. */
export type PeriodReadout = {
  /** De reeks waarvan het grote cijfer komt. */
  series: string;
  /** In plaats van de reeks een eigen waarde, bv. het totaal van een stapel. */
  value?: (index: number) => number | null;
  /** Wat er onder het cijfer staat, naast de naam van de periode. */
  note?: (index: number) => ReactNode;
};

type Axis = { min: number; max: number; step: number; ticks: number[] };

function axisFor(values: number[], { zero, count }: { zero: boolean; count: number }): Axis {
  if (values.length === 0) return { min: 0, max: 1, step: 1, ticks: [0, 1] };
  let low = Math.min(...values);
  let high = Math.max(...values);
  if (zero) {
    low = Math.min(0, low);
    high = Math.max(0, high);
  } else {
    const pad = (high - low) * 0.12 || Math.abs(high) * 0.1 || 1;
    low -= pad;
    high += pad;
  }
  const step = niceStep((high - low) / Math.max(1, count));
  const min = Math.floor(low / step) * step;
  const max = Math.max(min + step, Math.ceil(high / step) * step);
  const ticks: number[] = [];
  for (let tick = min; tick <= max + step / 2; tick += step) ticks.push(Math.round(tick * 1000) / 1000);
  return { min, max, step, ticks };
}

/** Breedte van de langste aslabel, ruw geschat (cijfers zijn ~0,6 em breed). */
function labelWidth(labels: string[], fontSize: number) {
  return Math.max(0, ...labels.map((label) => label.length)) * fontSize * 0.62;
}

function lastIndexWithValue(values: Array<number | null>) {
  for (let index = values.length - 1; index >= 0; index -= 1) if (values[index] != null) return index;
  return null;
}

export function PeriodChart({
  ariaLabel,
  labels,
  titles,
  series,
  format,
  formatRight,
  zeroBased = true,
  heightOptions = { compact: 0.72, comfortable: 0.34, min: 210, max: 360 },
  legend = true,
  readout,
  openEnd = false,
  reference,
  ghost,
}: {
  ariaLabel: string;
  /** Kort label per punt, voor de x-as. */
  labels: string[];
  /** Volledige naam per punt, voor het leescijfer. */
  titles?: string[];
  series: PeriodSeries[];
  format: (value: number) => string;
  formatRight?: (value: number) => string;
  /** Lijnen zonder nul onderaan zoomen in op het verloop (bv. vermogen). */
  zeroBased?: boolean;
  heightOptions?: { compact?: number; comfortable?: number; min?: number; max?: number };
  legend?: boolean;
  /** Groot cijfer bovenaan dat de aanwijzer volgt; zonder dit een tooltip. */
  readout?: PeriodReadout;
  /** De laatste periode loopt nog: die staaf krijgt de schuine banen. */
  openEnd?: boolean;
  /** Een stippellijn met label, bv. het gemiddelde. */
  reference?: { value: number; label: string } | null;
  /** Een tweede waarde per periode als streepje over de staaf, bv. vorig jaar. */
  ghost?: { label: string; values: Array<number | null> } | null;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const hatchId = `hatch-${useId().replace(/:/g, "")}`;
  const count = labels.length;
  const hasRight = series.some((item) => item.axis === "right");
  const bars = series.filter((item) => item.kind === "bar");
  const lines = series.filter((item) => item.kind !== "bar");
  const readoutSeries = readout ? series.find((item) => item.key === readout.series) : undefined;
  const readoutAt = (index: number) =>
    readout?.value ? readout.value(index) : (readoutSeries?.values[index] ?? null);
  const restIndex = readoutSeries ? lastIndexWithValue(labels.map((_, index) => readoutAt(index))) : null;
  const active = hover ?? restIndex;

  // Gestapelde staven: de as moet tot de hoogste stapel reiken.
  const stackTotals = labels.map((_, index) =>
    bars.reduce((sum, item) => sum + Math.max(0, item.values[index] ?? 0), 0),
  );
  const leftValues = [
    ...(bars.length ? stackTotals : []),
    ...lines
      .filter((item) => item.axis !== "right")
      .flatMap((item) => item.values.filter((value): value is number => value != null)),
    ...(ghost?.values.filter((value): value is number => value != null) ?? []),
    ...(reference ? [reference.value] : []),
  ];
  const rightValues = series
    .filter((item) => item.axis === "right")
    .flatMap((item) => item.values.filter((value): value is number => value != null));
  const zeroLeft = zeroBased || bars.length > 0;
  const fmtFor = (item: PeriodSeries) => (item.axis === "right" ? (formatRight ?? format) : format);

  const readoutValue = readoutSeries && active != null ? readoutAt(active) : null;

  return (
    <div>
      {readout && readoutSeries && (
        <div className="st-readout mb-2 min-h-[4.5rem]" aria-live="polite">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="st-num">{readoutValue == null ? "–" : fmtFor(readoutSeries)(readoutValue)}</span>
            {active != null && (
              <span className="text-sm text-muted-foreground">{titles?.[active] ?? labels[active]}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {active != null && readout.note?.(active)}
            {active != null &&
              series
                .filter((item) => item.key !== readoutSeries.key && item.kind !== "bar")
                .map((item) => {
                  const value = item.values[active];
                  return (
                    <span key={item.key} className="inline-flex items-center gap-1.5 tabular-nums">
                      <span className="h-0.5 w-3 rounded-full" style={{ background: item.color }} />
                      {item.label} {value == null ? "–" : fmtFor(item)(value)}
                    </span>
                  );
                })}
            {active != null && ghost && ghost.values[active] != null && (
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <span className="h-0.5 w-3 rounded-full bg-[var(--st-soft)]" />
                {ghost.label} {format(ghost.values[active]!)}
              </span>
            )}
          </div>
        </div>
      )}
      <ResponsiveChart
        ariaLabel={ariaLabel}
        heightOptions={heightOptions}
        margin={(metrics: ChartMetrics) => {
          // De marges volgen de langste aslabel; "10.000" of "300 W" past anders
          // niet in de vaste marge van een smalle grafiek.
          const leftTicks = axisFor(leftValues, { zero: zeroLeft, count: metrics.yTickCount }).ticks.map(format);
          const rightTicks = hasRight
            ? axisFor(rightValues, { zero: zeroBased, count: metrics.yTickCount }).ticks.map(formatRight ?? format)
            : [];
          return {
            top: 14,
            left: Math.max(30, Math.ceil(labelWidth(leftTicks, metrics.axisFontSize)) + 10),
            right: hasRight ? Math.ceil(labelWidth(rightTicks, metrics.axisFontSize)) + 10 : 8,
          };
        }}
        onPointerRatio={(ratio) =>
          setHover(ratio == null || count === 0 ? null : Math.min(count - 1, Math.floor(ratio * count)))
        }
      >
        {({ width, height, metrics, plotWidth, plotHeight }) => {
          const { margin, axisFontSize } = metrics;
          const left = axisFor(leftValues, { zero: zeroLeft, count: metrics.yTickCount });
          const right = axisFor(rightValues, { zero: zeroBased, count: metrics.yTickCount });
          const top = margin.top;
          const bottom = margin.top + plotHeight;
          const band = count > 0 ? plotWidth / count : plotWidth;
          const xFor = (index: number) => margin.left + band * (index + 0.5);
          const yLeft = (value: number) => bottom - ((value - left.min) / (left.max - left.min)) * plotHeight;
          const yRight = (value: number) =>
            bottom - ((value - right.min) / (right.max - right.min)) * plotHeight;
          const barWidth = Math.max(1.5, Math.min(44, band * (band > 14 ? 0.7 : 0.82)));
          const ticks = tickIndices(count, metrics.xTickCount + (metrics.density === "compact" ? 0 : 2));
          const baseY = yLeft(Math.max(left.min, Math.min(0, left.max)));

          return (
            <>
              <defs>
                {/* De schuine banen van het tenue: een periode die nog loopt. */}
                <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
                  <rect width="6" height="6" fill="var(--st-hi)" opacity="0.28" />
                  <rect width="3" height="6" fill="var(--st-hi)" />
                </pattern>
                {lines
                  .filter((item) => item.area)
                  .map((item) => (
                    <linearGradient key={item.key} id={`${hatchId}-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={item.color} stopOpacity="0.32" />
                      <stop offset="100%" stopColor={item.color} stopOpacity="0" />
                    </linearGradient>
                  ))}
              </defs>

              {left.ticks.map((tick) => (
                <g key={`l-${tick}`}>
                  <line
                    x1={margin.left}
                    x2={width - margin.right}
                    y1={yLeft(tick)}
                    y2={yLeft(tick)}
                    stroke="var(--border)"
                    strokeOpacity={tick === 0 ? 1 : 0.6}
                    strokeDasharray={tick === 0 ? undefined : "2 6"}
                  />
                  <text
                    x={margin.left - 6}
                    y={yLeft(tick) + axisFontSize / 3}
                    textAnchor="end"
                    fontSize={axisFontSize}
                    fill="var(--muted-foreground)"
                    className="tabular-nums"
                  >
                    {format(tick)}
                  </text>
                </g>
              ))}
              {hasRight &&
                right.ticks.map((tick) => (
                  <text
                    key={`r-${tick}`}
                    x={width - margin.right + 6}
                    y={yRight(tick) + axisFontSize / 3}
                    textAnchor="start"
                    fontSize={axisFontSize}
                    fill="var(--muted-foreground)"
                    className="tabular-nums"
                  >
                    {(formatRight ?? format)(tick)}
                  </text>
                ))}

              {ticks.map((index) => (
                <text
                  key={`x-${index}`}
                  x={xFor(index)}
                  y={height - Math.round(margin.bottom / 3)}
                  textAnchor={count > 1 && index === 0 ? "start" : count > 1 && index === count - 1 ? "end" : "middle"}
                  fontSize={axisFontSize}
                  fill={index === active ? "var(--foreground)" : "var(--muted-foreground)"}
                >
                  {labels[index]}
                </text>
              ))}

              {active != null && (
                <rect
                  x={xFor(active) - band / 2}
                  y={top}
                  width={band}
                  height={plotHeight}
                  fill="var(--foreground)"
                  opacity="0.045"
                />
              )}

              {/* Staven: de periode waar je naar kijkt in goud, de rest in de hoofdkleur. */}
              {labels.map((_, index) => {
                let base = Math.max(0, left.min);
                const stacked = bars.length > 1;
                const isActive = index === active;
                const isOpen = openEnd && index === count - 1;
                return bars.map((item) => {
                  const value = Math.max(0, item.values[index] ?? 0);
                  if (value === 0) return null;
                  const y0 = yLeft(base);
                  base += value;
                  const y1 = yLeft(base);
                  const fill = isOpen
                    ? `url(#${hatchId})`
                    : !stacked && isActive && readout
                      ? "var(--st-hi)"
                      : item.color;
                  return (
                    <rect
                      key={`${item.key}-${index}`}
                      x={xFor(index) - barWidth / 2}
                      y={y1}
                      width={barWidth}
                      height={Math.max(0.5, y0 - y1)}
                      fill={fill}
                      opacity={stacked && active != null && !isActive ? 0.55 : 1}
                    />
                  );
                });
              })}

              {/* Vorig jaar: een streepje over elke staaf. */}
              {ghost?.values.map((value, index) =>
                value == null || value <= 0 ? null : (
                  <line
                    key={`ghost-${index}`}
                    x1={xFor(index) - barWidth / 2 - 2}
                    x2={xFor(index) + barWidth / 2 + 2}
                    y1={yLeft(value)}
                    y2={yLeft(value)}
                    stroke="var(--st-soft)"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                ),
              )}

              {reference && (
                <g>
                  <line
                    x1={margin.left}
                    x2={width - margin.right}
                    y1={yLeft(reference.value)}
                    y2={yLeft(reference.value)}
                    stroke="var(--foreground)"
                    strokeOpacity="0.55"
                    strokeDasharray="6 5"
                  />
                  <text
                    x={width - margin.right - 2}
                    y={yLeft(reference.value) - 5}
                    textAnchor="end"
                    fontSize={axisFontSize}
                    fontWeight={600}
                    fill="var(--foreground)"
                    stroke="var(--background)"
                    strokeWidth={3}
                    paintOrder="stroke"
                    className="tabular-nums"
                  >
                    {reference.label}
                  </text>
                </g>
              )}

              {lines.map((item) => {
                const y = item.axis === "right" ? yRight : yLeft;
                const paths =
                  item.kind === "step"
                    ? stepSegments(item.values, xFor, y, band)
                    : lineSegments(item.values, (value) => value, xFor, y);
                const lone = item.values.flatMap((value, index) =>
                  value != null && item.values[index - 1] == null && item.values[index + 1] == null ? [index] : [],
                );
                const last = lastIndexWithValue(item.values);
                const strong = !item.muted && !item.dashed;
                return (
                  <g key={item.key}>
                    {item.area &&
                      item.kind === "line" &&
                      paths.map((d, index) => {
                        const xs = [...d.matchAll(/[ML] ([\d.]+)/g)].map((match) => Number(match[1]));
                        if (xs.length < 2) return null;
                        return (
                          <path
                            key={`area-${index}`}
                            d={`${d} L ${xs.at(-1)} ${baseY.toFixed(1)} L ${xs[0]} ${baseY.toFixed(1)} Z`}
                            fill={`url(#${hatchId}-${item.key})`}
                          />
                        );
                      })}
                    {paths.map((d, index) => (
                      <path
                        key={index}
                        d={d}
                        fill="none"
                        stroke={item.color}
                        strokeOpacity={item.muted ? 0.5 : 1}
                        strokeWidth={item.muted ? 1.2 : strong ? metrics.strokeWidth.primary : metrics.strokeWidth.secondary}
                        strokeDasharray={item.dashed ? "6 5" : undefined}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                    {item.kind === "line" &&
                      lone.map((index) => (
                        <circle key={`dot-${index}`} cx={xFor(index)} cy={y(item.values[index]!)} r={metrics.dotRadius} fill={item.color} />
                      ))}
                    {strong && item.kind === "line" && last != null && last !== active && (
                      <circle cx={xFor(last)} cy={y(item.values[last]!)} r={metrics.dotRadius} fill={item.color} />
                    )}
                    {strong && active != null && item.values[active] != null && (
                      <circle
                        cx={xFor(active)}
                        cy={y(item.values[active]!)}
                        r={metrics.dotRadius + 1.5}
                        fill={readout && item.key === readout.series ? "var(--st-hi)" : item.color}
                        stroke="var(--background)"
                        strokeWidth={2}
                      />
                    )}
                    {item.peak && <PeakMark item={item} xFor={xFor} y={y} format={fmtFor(item)} fontSize={axisFontSize} top={top} />}
                  </g>
                );
              })}

              {!readout && active != null && hover != null && (
                <ChartTooltip
                  x={xFor(active)}
                  y={top + 4}
                  chartWidth={width}
                  title={titles?.[active] ?? labels[active]}
                  rows={series.map((item) => {
                    const value = item.values[active];
                    return { label: item.label, value: value == null ? "-" : fmtFor(item)(value), color: item.color };
                  })}
                />
              )}
            </>
          );
        }}
      </ResponsiveChart>
      {legend && (series.length > 1 || ghost) && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {series.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5">
              <span
                className={cn(item.kind === "bar" ? "size-3" : "h-1 w-5 rounded-full", item.muted && "opacity-60")}
                style={{ background: item.color }}
              />
              {item.label}
            </span>
          ))}
          {ghost && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-5 rounded-full bg-[var(--st-soft)]" />
              {ghost.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Het hoogste punt van een reeks: een gouden stip met de waarde erboven. */
function PeakMark({
  item,
  xFor,
  y,
  format,
  fontSize,
  top,
}: {
  item: PeriodSeries;
  xFor: (index: number) => number;
  y: (value: number) => number;
  format: (value: number) => string;
  fontSize: number;
  top: number;
}) {
  let best: number | null = null;
  item.values.forEach((value, index) => {
    if (value != null && (best == null || value > item.values[best]!)) best = index;
  });
  if (best == null) return null;
  const value = item.values[best]!;
  const cx = xFor(best);
  const cy = y(value);
  const above = cy - 10 > top + fontSize;
  return (
    <g pointerEvents="none">
      <circle cx={cx} cy={cy} r={5} fill="none" stroke="var(--st-hi)" strokeWidth={2} />
      <text
        x={cx}
        y={above ? cy - 10 : cy + fontSize + 8}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight={600}
        fill="var(--foreground)"
        stroke="var(--background)"
        strokeWidth={3}
        paintOrder="stroke"
        className="tabular-nums"
      >
        {format(value)}
      </text>
    </g>
  );
}

/** Trap: horizontaal over het hele vak, verticaal op de grens. */
function stepSegments(
  values: Array<number | null>,
  xFor: (index: number) => number,
  yFor: (value: number) => number,
  band: number,
) {
  const segments: string[] = [];
  let current = "";
  values.forEach((value, index) => {
    if (value == null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    const x0 = xFor(index) - band / 2;
    const x1 = xFor(index) + band / 2;
    const y = yFor(value).toFixed(1);
    current += current ? `L ${x0.toFixed(1)} ${y} ` : `M ${x0.toFixed(1)} ${y} `;
    current += `L ${x1.toFixed(1)} ${y} `;
  });
  if (current) segments.push(current);
  return segments;
}
