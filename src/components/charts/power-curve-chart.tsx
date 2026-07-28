"use client";

import { useMemo, useState } from "react";
import { ChartTooltip, type TooltipRow } from "@/components/charts/chart-tooltip";
import { formatDuration } from "@/lib/charts/format";
import { defsId } from "@/lib/charts/ids";
import { valueAt, median } from "@/lib/charts/interpolate";
import { areaPath, linePath } from "@/lib/charts/paths";
import { logScale, linearScale } from "@/lib/charts/scale";
import { MAX_SERIES, seriesColor } from "@/lib/charts/palette";
import { riderTypeLabel } from "@/lib/teams/power-profile";

export type PowerCurvePoint = {
  seconds: number;
  watts: number;
  wattsPerKg?: number | null;
  activityId?: string | null;
  activityDate?: string | null;
  weightKg?: number | null;
  wkgActivityId?: string | null;
  wkgActivityDate?: string | null;
  wkgWeightKg?: number | null;
};

export type ComparisonRider = {
  id: string;
  name: string;
  riderType: string | null;
  weightKg: number | null;
  points: PowerCurvePoint[];
  hasFullCurve?: boolean;
};

type Metric = "watts" | "wkg";

const WIDTH = 920;
const HEIGHT = 390;
const MARGIN = { top: 24, right: 24, bottom: 48, left: 58 };
const X_TICKS = [5, 15, 30, 60, 120, 300, 600, 1200, 3600, 7200, 18000];
// Records per duur; alleen duren die de eigen curve dekt worden getoond.
const BENCHMARK_SECONDS = [
  1, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600, 5400, 7200, 10800, 14400, 18000,
];
const MEDIAN_ID = "median";

function medianCurveSeconds(riders: ComparisonRider[], limit = 260) {
  const seconds = Array.from(
    new Set(riders.flatMap((rider) => rider.points.map((point) => point.seconds))),
  ).sort((a, b) => a - b);
  if (seconds.length <= limit) return seconds;
  return Array.from(
    new Set(
      Array.from({ length: limit }, (_, index) => {
        const position = Math.round((index / (limit - 1)) * (seconds.length - 1));
        return seconds[position];
      }),
    ),
  );
}

function metricPoints(points: PowerCurvePoint[], weightKg: number | null, metric: Metric) {
  if (metric === "watts") return points;
  return points.flatMap((point) => {
    const historicalWkg = Number(point.wattsPerKg);
    const value =
      Number.isFinite(historicalWkg) && historicalWkg > 0
        ? historicalWkg
        : weightKg
          ? point.watts / weightKg
          : null;
    return value == null ? [] : [{ ...point, watts: value }];
  });
}

function formatValue(value: number | null, metric: Metric) {
  if (value == null) return "-";
  return metric === "watts" ? `${Math.round(value)} W` : `${value.toFixed(2)} W/kg`;
}

export function PowerCurveChart({
  ownName,
  ownWeightKg,
  ownPoints,
  riders,
  idSuffix,
}: {
  ownName: string;
  ownWeightKg: number | null;
  ownPoints: PowerCurvePoint[];
  riders: ComparisonRider[];
  /** Verplicht zodra dezelfde grafiek twee keer op één pagina staat. */
  idSuffix?: string;
}) {
  const [metric, setMetric] = useState<Metric>("watts");
  const [comparisonIds, setComparisonIds] = useState<string[]>([MEDIAN_ID]);
  const [hoverSeconds, setHoverSeconds] = useState<number | null>(null);
  const hasOwnWkg =
    ownWeightKg != null ||
    ownPoints.some((point) => {
      const value = Number(point.wattsPerKg);
      return Number.isFinite(value) && value > 0;
    });

  const own = useMemo(
    () => metricPoints(ownPoints, ownWeightKg, metric),
    [metric, ownPoints, ownWeightKg],
  );

  const series = useMemo(() => {
    return comparisonIds.flatMap((id, index) => {
      const color = seriesColor(index);
      if (id === MEDIAN_ID) {
        const points = medianCurveSeconds(riders).flatMap((seconds) => {
          const values = riders.flatMap((rider) => {
            const riderPoints = metricPoints(rider.points, rider.weightKg, metric);
            const value = valueAt(riderPoints, seconds);
            return value == null ? [] : [value];
          });
          const value = median(values);
          return value == null ? [] : [{ seconds, watts: value }];
        });
        return points.length
          ? [{ id, name: `ZWB-mediaan (${riders.length})`, points, color }]
          : [];
      }
      const rider = riders.find((entry) => entry.id === id);
      if (!rider) return [];
      return [
        {
          id,
          name: rider.name,
          points: metricPoints(rider.points, rider.weightKg, metric),
          color,
        },
      ];
    });
  }, [comparisonIds, metric, riders]);

  function toggleComparison(id: string) {
    setComparisonIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : current.length >= MAX_SERIES
          ? current
          : [...current, id],
    );
  }

  const allPoints = [...own, ...series.flatMap((entry) => entry.points)];
  const minSeconds = Math.max(1, Math.min(...allPoints.map((point) => point.seconds), 5));
  const maxSeconds = Math.max(...allPoints.map((point) => point.seconds), 1200);
  const maxValue = Math.max(...allPoints.map((point) => point.watts), metric === "watts" ? 300 : 3);
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = logScale({
    domain: [minSeconds, maxSeconds],
    range: [MARGIN.left, MARGIN.left + plotWidth],
  });
  const y = linearScale({
    domain: [0, maxValue * 1.08],
    range: [MARGIN.top + plotHeight, MARGIN.top],
  });
  const yTicks = Array.from({ length: 5 }, (_, index) => (maxValue * 1.08 * index) / 4);
  const ownPath = linePath(own, (point) => x.forward(point.seconds), (point) => y.forward(point.watts));
  const hoverX = hoverSeconds == null ? null : x.forward(hoverSeconds);
  const ownHover = hoverSeconds == null ? null : valueAt(own, hoverSeconds);
  const areaGradientId = defsId("power-area", idSuffix);
  const atLimit = comparisonIds.length >= MAX_SERIES;

  const tooltipRows: TooltipRow[] = [
    { label: `${ownName}:`, value: formatValue(ownHover, metric), color: "var(--chart-1)" },
    ...series.map((entry) => ({
      label: `${entry.name}:`,
      value: formatValue(hoverSeconds == null ? null : valueAt(entry.points, hoverSeconds), metric),
      color: entry.color,
    })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex rounded-md border bg-background p-1 text-sm">
          {(["watts", "wkg"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMetric(value)}
              disabled={value === "wkg" && !hasOwnWkg}
              className={`rounded px-3 py-1.5 font-medium ${
                metric === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {value === "watts" ? "Watt" : "W/kg"}
            </button>
          ))}
        </div>
        <div className="min-w-0 flex-1 sm:max-w-xl">
          <p className="mb-1.5 text-sm">Vergelijk met (max. {MAX_SERIES})</p>
          <div className="flex flex-wrap gap-1.5">
            {[{ id: MEDIAN_ID, label: "ZWB-mediaan" }, ...riders.map((rider) => ({
              id: rider.id,
              label: `${rider.name} - ${riderTypeLabel(rider.riderType)}`,
            }))].map((option) => {
              const active = comparisonIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  disabled={!active && atLimit}
                  onClick={() => toggleComparison(option.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-background p-2 sm:p-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Interactieve power-duration curve"
          className="h-auto w-full touch-none"
          onPointerLeave={() => setHoverSeconds(null)}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const chartX = ((event.clientX - rect.left) / rect.width) * WIDTH;
            const clamped = Math.max(MARGIN.left, Math.min(WIDTH - MARGIN.right, chartX));
            setHoverSeconds(x.invert(clamped));
          }}
        >
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={y.forward(tick)}
                y2={y.forward(tick)}
                stroke="var(--border)"
                strokeDasharray="4 5"
              />
              <text
                x={MARGIN.left - 10}
                y={y.forward(tick) + 4}
                textAnchor="end"
                fontSize="12"
                fill="var(--muted-foreground)"
              >
                {metric === "watts" ? Math.round(tick) : tick.toFixed(1)}
              </text>
            </g>
          ))}

          {X_TICKS.filter((tick) => tick >= minSeconds && tick <= maxSeconds).map((tick) => (
            <g key={tick}>
              <line
                x1={x.forward(tick)}
                x2={x.forward(tick)}
                y1={MARGIN.top}
                y2={HEIGHT - MARGIN.bottom}
                stroke="var(--border)"
                strokeOpacity="0.5"
              />
              <text
                x={x.forward(tick)}
                y={HEIGHT - 18}
                textAnchor="middle"
                fontSize="12"
                fill="var(--muted-foreground)"
              >
                {formatDuration(tick)}
              </text>
            </g>
          ))}

          {ownPath && (
            <>
              <path
                d={areaPath(
                  ownPath,
                  x.forward(own[0].seconds),
                  x.forward(own[own.length - 1].seconds),
                  HEIGHT - MARGIN.bottom,
                )}
                fill={`url(#${areaGradientId})`}
              />
              <path d={ownPath} fill="none" stroke="var(--chart-1)" strokeWidth="4" strokeLinecap="round" />
            </>
          )}
          {series.map((entry) => {
            const path = linePath(
              entry.points,
              (point) => x.forward(point.seconds),
              (point) => y.forward(point.watts),
            );
            if (!path) return null;
            return (
              <path
                key={entry.id}
                d={path}
                fill="none"
                stroke={entry.color}
                strokeWidth="3"
                strokeDasharray="9 7"
                strokeLinecap="round"
              />
            );
          })}

          {hoverX != null && (
            <g>
              <line
                x1={hoverX}
                x2={hoverX}
                y1={MARGIN.top}
                y2={HEIGHT - MARGIN.bottom}
                stroke="var(--foreground)"
                strokeOpacity="0.55"
              />
              {ownHover != null && (
                <circle
                  cx={hoverX}
                  cy={y.forward(ownHover)}
                  r="6"
                  fill="var(--chart-1)"
                  stroke="var(--background)"
                  strokeWidth="3"
                />
              )}
              {series.map((entry) => {
                const value = hoverSeconds == null ? null : valueAt(entry.points, hoverSeconds);
                if (value == null) return null;
                return (
                  <circle
                    key={`hover-${entry.id}`}
                    cx={hoverX}
                    cy={y.forward(value)}
                    r="5"
                    fill={entry.color}
                    stroke="var(--background)"
                    strokeWidth="3"
                  />
                );
              })}
              <ChartTooltip
                x={hoverX}
                y={MARGIN.top + 8}
                chartWidth={WIDTH}
                title={formatDuration(hoverSeconds ?? 0)}
                rows={tooltipRows}
                width={230}
              />
            </g>
          )}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-1 w-8 rounded bg-[var(--chart-1)]" />
          {ownName}
        </span>
        {series.map((entry) => (
          <span key={`legend-${entry.id}`} className="inline-flex items-center gap-2">
            <span className="h-1 w-8 rounded" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
        ))}
      </div>
      <PowerBenchmarks metric={metric} ownPoints={own} riders={riders} />
    </div>
  );
}

function PowerBenchmarks({
  metric,
  ownPoints,
  riders,
}: {
  metric: Metric;
  ownPoints: PowerCurvePoint[];
  riders: ComparisonRider[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {BENCHMARK_SECONDS.flatMap((seconds) => {
        const ownValue = valueAt(ownPoints, seconds);
        if (ownValue == null) return [];
        const clubValues = riders.flatMap((rider) => {
          const points = metricPoints(rider.points, rider.weightKg, metric);
          const value = valueAt(points, seconds);
          return value == null ? [] : [value];
        });
        const below = clubValues.filter((value) => value <= ownValue).length;
        const percentile =
          clubValues.length === 0 ? null : Math.round((below / clubValues.length) * 100);
        return [
          <div key={seconds} className="rounded-md border bg-card p-4">
            <p className="text-sm text-muted-foreground">{formatDuration(seconds)}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatValue(ownValue, metric)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {percentile == null
                ? "Geen ZWB-vergelijking"
                : `Hoger dan ${percentile}% van ${clubValues.length} profielen`}
            </p>
          </div>,
        ];
      })}
    </div>
  );
}
