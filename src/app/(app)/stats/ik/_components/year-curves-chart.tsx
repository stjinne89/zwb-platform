"use client";

// De powercurve van elk jaar over elkaar, op een log-as voor de duur: zo zie je
// in één beeld of je sprint, je vijf minuten of je uur erop vooruit ging.

import { useState } from "react";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { ResponsiveChart } from "@/components/charts/responsive-chart";
import { formatDuration } from "@/lib/charts/format";
import { linePath } from "@/lib/charts/paths";
import { logScale, niceStep } from "@/lib/charts/scale";
import type { CompactPoint } from "@/lib/stats/curves";
import { Toggle } from "./chart-tiles";

/** Dit jaar in de hoofdkleur, vorig jaar in de tweede, de jaren daarvoor grijs. */
const COLORS = ["var(--st-main)", "var(--st-second)", "var(--st-soft)", "var(--st-soft)", "var(--st-soft)"];
const TICKS = [5, 30, 60, 300, 1200, 3600, 18000];
const TICKS_COMPACT = [5, 60, 1200, 18000];

export type YearCurve = { year: string; points: CompactPoint[] };

export function YearCurvesChart({ curves }: { curves: YearCurve[] }) {
  const [unit, setUnit] = useState<"w" | "wkg">("w");
  const [hover, setHover] = useState<number | null>(null);
  // Nieuwste jaar eerst, in de hoofdkleur.
  const ordered = [...curves].reverse();
  const hasWkg = curves.some((curve) => curve.points.some((point) => point.wattsPerKg != null));
  const valueOf = (point: CompactPoint) => (unit === "wkg" ? point.wattsPerKg : point.watts);
  const seconds = [...new Set(curves.flatMap((curve) => curve.points.map((point) => point.seconds)))].sort(
    (a, b) => a - b,
  );
  const values = ordered.flatMap((curve) => curve.points.map(valueOf)).filter((v): v is number => v != null);
  if (seconds.length < 2 || values.length === 0) return null;

  const step = niceStep((Math.max(...values) - Math.min(...values)) / 4);
  const min = Math.max(0, Math.floor(Math.min(...values) / step) * step);
  const max = Math.ceil(Math.max(...values) / step) * step;
  const format = (value: number) => (unit === "wkg" ? value.toLocaleString("nl-NL", { maximumFractionDigits: 1 }) : `${Math.round(value)} W`);

  return (
    <div className="space-y-3">
      {hasWkg && (
        <Toggle
          label="Eenheid"
          options={[
            { key: "w", label: "Watt" },
            { key: "wkg", label: "W/kg" },
          ]}
          value={unit}
          onChange={(value) => setUnit(value as "w" | "wkg")}
        />
      )}
      <ResponsiveChart
        ariaLabel="Powercurve per jaar"
        heightOptions={{ compact: 0.8, comfortable: 0.36, min: 220, max: 380 }}
        margin={(metrics) => ({ left: Math.max(metrics.margin.left, unit === "wkg" ? 36 : 54) })}
        onPointerRatio={(ratio) => setHover(ratio)}
      >
        {({ width, height, metrics, plotWidth, plotHeight }) => {
          const { margin, axisFontSize } = metrics;
          const x = logScale({ domain: [seconds[0], seconds.at(-1)!], range: [margin.left, margin.left + plotWidth] });
          const bottom = margin.top + plotHeight;
          const y = (value: number) => bottom - ((value - min) / (max - min || 1)) * plotHeight;
          const ticks: number[] = [];
          for (let tick = min; tick <= max + step / 2; tick += step) ticks.push(tick);
          const hoverSeconds =
            hover == null
              ? null
              : seconds.reduce((best, s) =>
                  Math.abs(x.forward(s) - (margin.left + hover * plotWidth)) <
                  Math.abs(x.forward(best) - (margin.left + hover * plotWidth))
                    ? s
                    : best,
                );
          return (
            <>
              {ticks.map((tick) => (
                <g key={tick}>
                  <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeDasharray="4 5" />
                  <text x={margin.left - 6} y={y(tick) + axisFontSize / 3} textAnchor="end" fontSize={axisFontSize} fill="var(--muted-foreground)">
                    {format(tick)}
                  </text>
                </g>
              ))}
              {(metrics.density === "compact" ? TICKS_COMPACT : TICKS)
                .filter((tick) => tick >= seconds[0] && tick <= seconds.at(-1)!)
                .map((tick) => (
                  <text
                    key={tick}
                    x={x.forward(tick)}
                    y={height - Math.round(margin.bottom / 3)}
                    textAnchor="middle"
                    fontSize={axisFontSize}
                    fill="var(--muted-foreground)"
                  >
                    {formatDuration(tick)}
                  </text>
                ))}
              {ordered.map((curve, index) => {
                const points = curve.points.filter((point) => valueOf(point) != null);
                return (
                  <path
                    key={curve.year}
                    d={linePath(points, (point) => x.forward(point.seconds), (point) => y(valueOf(point)!))}
                    fill="none"
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={index === 0 ? metrics.strokeWidth.primary : metrics.strokeWidth.secondary}
                    strokeOpacity={index === 0 ? 1 : 0.75}
                    strokeLinejoin="round"
                  />
                );
              })}
              {hoverSeconds != null && (
                <>
                  <line
                    x1={x.forward(hoverSeconds)}
                    x2={x.forward(hoverSeconds)}
                    y1={margin.top}
                    y2={bottom}
                    stroke="var(--foreground)"
                    strokeOpacity="0.4"
                  />
                  <ChartTooltip
                    x={x.forward(hoverSeconds)}
                    y={margin.top + 4}
                    chartWidth={width}
                    title={formatDuration(hoverSeconds)}
                    rows={ordered.map((curve, index) => {
                      const point = curve.points.find((p) => p.seconds === hoverSeconds);
                      const value = point ? valueOf(point) : null;
                      return {
                        label: curve.year,
                        value: value == null ? "-" : format(value),
                        color: COLORS[index % COLORS.length],
                      };
                    })}
                  />
                </>
              )}
            </>
          );
        }}
      </ResponsiveChart>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {ordered.map((curve, index) => (
          <span key={curve.year} className="inline-flex items-center gap-1.5">
            <span className="h-1 w-5 rounded" style={{ background: COLORS[index % COLORS.length] }} />
            {curve.year}
          </span>
        ))}
      </div>
    </div>
  );
}
