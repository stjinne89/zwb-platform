"use client";

// Eén grafiek voor reeksen per periode (week, maand, jaar of dag): staven,
// lijnen en trappen op dezelfde x-as, met hover en tik voor een tooltip. De
// tegels op /stats/ik tekenen er allemaal mee, zodat ze er hetzelfde uitzien.
//
// Staven en lijnen staan op het midden van hun vak, zodat een lijn over staven
// precies boven de staaf loopt. Meerdere staafreeksen worden gestapeld.

import { useState } from "react";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { ResponsiveChart } from "@/components/charts/responsive-chart";
import { tickIndices, type ChartMetrics } from "@/lib/charts/responsive";
import { lineSegments } from "@/lib/charts/paths";
import { niceStep } from "@/lib/charts/scale";

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
    const pad = (high - low) * 0.1 || Math.abs(high) * 0.1 || 1;
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

export function PeriodChart({
  ariaLabel,
  labels,
  titles,
  series,
  format,
  formatRight,
  zeroBased = true,
  heightOptions = { compact: 0.75, comfortable: 0.36, min: 200, max: 360 },
  legend = true,
}: {
  ariaLabel: string;
  /** Kort label per punt, voor de x-as. */
  labels: string[];
  /** Volledige naam per punt, voor de tooltip. */
  titles?: string[];
  series: PeriodSeries[];
  format: (value: number) => string;
  formatRight?: (value: number) => string;
  /** Lijnen zonder nul onderaan zoomen in op het verloop (bv. vermogen). */
  zeroBased?: boolean;
  heightOptions?: { compact?: number; comfortable?: number; min?: number; max?: number };
  legend?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const count = labels.length;
  const hasRight = series.some((item) => item.axis === "right");
  const bars = series.filter((item) => item.kind === "bar");

  // Gestapelde staven: de as moet tot de hoogste stapel reiken.
  const stackTotals = labels.map((_, index) =>
    bars.reduce((sum, item) => sum + Math.max(0, item.values[index] ?? 0), 0),
  );
  const leftValues = [
    ...(bars.length ? stackTotals : []),
    ...series
      .filter((item) => item.kind !== "bar" && item.axis !== "right")
      .flatMap((item) => item.values.filter((value): value is number => value != null)),
  ];
  const rightValues = series
    .filter((item) => item.axis === "right")
    .flatMap((item) => item.values.filter((value): value is number => value != null));

  return (
    <div>
      <ResponsiveChart
        ariaLabel={ariaLabel}
        heightOptions={heightOptions}
        margin={(metrics: ChartMetrics) => {
          // De marges volgen de langste aslabel; "10.000" of "300 W" past anders
          // niet in de vaste marge van een smalle grafiek.
          const zero = zeroBased || bars.length > 0;
          const leftTicks = axisFor(leftValues, { zero, count: metrics.yTickCount }).ticks.map(format);
          const rightTicks = hasRight
            ? axisFor(rightValues, { zero: zeroBased, count: metrics.yTickCount }).ticks.map(formatRight ?? format)
            : [];
          return {
            left: Math.max(metrics.margin.left, Math.ceil(labelWidth(leftTicks, metrics.axisFontSize)) + 12),
            ...(hasRight
              ? { right: Math.max(metrics.margin.right, Math.ceil(labelWidth(rightTicks, metrics.axisFontSize)) + 12) }
              : {}),
          };
        }}
        onPointerRatio={(ratio) =>
          setHover(ratio == null || count === 0 ? null : Math.min(count - 1, Math.floor(ratio * count)))
        }
      >
        {({ width, height, metrics, plotWidth, plotHeight }) => {
          const { margin, axisFontSize } = metrics;
          const left = axisFor(leftValues, { zero: zeroBased || bars.length > 0, count: metrics.yTickCount });
          const right = axisFor(rightValues, { zero: zeroBased, count: metrics.yTickCount });
          const top = margin.top;
          const bottom = margin.top + plotHeight;
          const band = count > 0 ? plotWidth / count : plotWidth;
          const xFor = (index: number) => margin.left + band * (index + 0.5);
          const yLeft = (value: number) => bottom - ((value - left.min) / (left.max - left.min)) * plotHeight;
          const yRight = (value: number) =>
            bottom - ((value - right.min) / (right.max - right.min)) * plotHeight;
          const barWidth = Math.max(1, Math.min(48, band * 0.72));
          const ticks = tickIndices(count, metrics.xTickCount + (metrics.density === "compact" ? 0 : 2));

          return (
            <>
              {left.ticks.map((tick) => (
                <g key={`l-${tick}`}>
                  <line
                    x1={margin.left}
                    x2={width - margin.right}
                    y1={yLeft(tick)}
                    y2={yLeft(tick)}
                    stroke="var(--border)"
                    strokeDasharray={tick === 0 ? undefined : "4 5"}
                  />
                  <text
                    x={margin.left - 6}
                    y={yLeft(tick) + axisFontSize / 3}
                    textAnchor="end"
                    fontSize={axisFontSize}
                    fill="var(--muted-foreground)"
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
                  fill="var(--muted-foreground)"
                >
                  {labels[index]}
                </text>
              ))}

              {hover != null && (
                <rect
                  x={xFor(hover) - band / 2}
                  y={top}
                  width={band}
                  height={plotHeight}
                  fill="var(--foreground)"
                  opacity="0.05"
                />
              )}

              {labels.map((_, index) => {
                let base = 0;
                return bars.map((item) => {
                  const value = Math.max(0, item.values[index] ?? 0);
                  if (value === 0) return null;
                  const y0 = yLeft(base);
                  base += value;
                  const y1 = yLeft(base);
                  return (
                    <rect
                      key={`${item.key}-${index}`}
                      x={xFor(index) - barWidth / 2}
                      y={y1}
                      width={barWidth}
                      height={Math.max(0.5, y0 - y1)}
                      rx={bars.length > 1 ? 0 : 2}
                      fill={item.color}
                      opacity={hover == null || hover === index ? 0.9 : 0.55}
                    />
                  );
                });
              })}

              {series
                .filter((item) => item.kind !== "bar")
                .map((item) => {
                  const y = item.axis === "right" ? yRight : yLeft;
                  const paths =
                    item.kind === "step"
                      ? stepSegments(item.values, xFor, y, band)
                      : lineSegments(item.values, (value) => value, xFor, y);
                  const lone = item.values.flatMap((value, index) =>
                    value != null && item.values[index - 1] == null && item.values[index + 1] == null
                      ? [index]
                      : [],
                  );
                  return (
                    <g key={item.key}>
                      {paths.map((d, index) => (
                        <path
                          key={index}
                          d={d}
                          fill="none"
                          stroke={item.color}
                          strokeOpacity={item.muted ? 0.5 : 1}
                          strokeWidth={item.muted ? 1.2 : metrics.strokeWidth.secondary}
                          strokeDasharray={item.dashed ? "6 5" : undefined}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                      {item.kind === "line" &&
                        lone.map((index) => (
                          <circle
                            key={`dot-${index}`}
                            cx={xFor(index)}
                            cy={y(item.values[index]!)}
                            r={metrics.dotRadius}
                            fill={item.color}
                          />
                        ))}
                    </g>
                  );
                })}

              {hover != null && (
                <ChartTooltip
                  x={xFor(hover)}
                  y={top + 4}
                  chartWidth={width}
                  title={titles?.[hover] ?? labels[hover]}
                  rows={series.map((item) => {
                    const value = item.values[hover];
                    const fmt = item.axis === "right" ? (formatRight ?? format) : format;
                    return { label: item.label, value: value == null ? "-" : fmt(value), color: item.color };
                  })}
                />
              )}
            </>
          );
        }}
      </ResponsiveChart>
      {legend && series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {series.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5">
              <span
                className={item.kind === "bar" ? "size-3 rounded-sm" : "h-1 w-5 rounded"}
                style={{ background: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
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
