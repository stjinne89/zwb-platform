"use client";

import { useMemo, useState } from "react";
import { POWER_DURATIONS, riderTypeLabel } from "@/lib/teams/power-profile";

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

function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const minutes = seconds / 60;
    return Number.isInteger(minutes) ? `${minutes}m` : `${minutes.toFixed(1)}m`;
  }
  const hours = seconds / 3600;
  return Number.isInteger(hours) ? `${hours}u` : `${hours.toFixed(1)}u`;
}

function valueAt(points: PowerCurvePoint[], seconds: number) {
  if (points.length === 0) return null;
  if (seconds < points[0].seconds || seconds > points[points.length - 1].seconds) return null;
  if (seconds === points[0].seconds) return points[0].watts;
  if (seconds === points[points.length - 1].seconds) return points[points.length - 1].watts;

  let low = 1;
  let high = points.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].seconds < seconds) low = middle + 1;
    else high = middle;
  }
  const right = points[low];
  const left = points[low - 1];
  const span = Math.log(right.seconds) - Math.log(left.seconds);
  const ratio = span === 0 ? 0 : (Math.log(seconds) - Math.log(left.seconds)) / span;
  return left.watts + (right.watts - left.watts) * ratio;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

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

function linePath(
  points: PowerCurvePoint[],
  xFor: (seconds: number) => number,
  yFor: (value: number) => number,
) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(point.seconds).toFixed(1)} ${yFor(point.watts).toFixed(1)}`)
    .join(" ");
}

export function PowerCurveChart({
  ownName,
  ownWeightKg,
  ownPoints,
  riders,
}: {
  ownName: string;
  ownWeightKg: number | null;
  ownPoints: PowerCurvePoint[];
  riders: ComparisonRider[];
}) {
  const [metric, setMetric] = useState<Metric>("watts");
  const [comparisonId, setComparisonId] = useState("median");
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
  const comparison = useMemo(() => {
    if (comparisonId === "none") return null;
    if (comparisonId === "median") {
      const points = medianCurveSeconds(riders).flatMap((seconds) => {
        const values = riders.flatMap((rider) => {
          const riderPoints = metricPoints(rider.points, rider.weightKg, metric);
          const value = valueAt(riderPoints, seconds);
          return value == null ? [] : [value];
        });
        const value = median(values);
        return value == null ? [] : [{ seconds, watts: value }];
      });
      return { name: `ZWB-mediaan (${riders.length})`, points };
    }
    const rider = riders.find((entry) => entry.id === comparisonId);
    if (!rider) return null;
    return {
      name: rider.name,
      points: metricPoints(rider.points, rider.weightKg, metric),
    };
  }, [comparisonId, metric, riders]);

  const allPoints = [...own, ...(comparison?.points ?? [])];
  const minSeconds = Math.max(1, Math.min(...allPoints.map((point) => point.seconds), 5));
  const maxSeconds = Math.max(...allPoints.map((point) => point.seconds), 1200);
  const maxValue = Math.max(...allPoints.map((point) => point.watts), metric === "watts" ? 300 : 3);
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const xFor = (seconds: number) =>
    MARGIN.left +
    ((Math.log(seconds) - Math.log(minSeconds)) /
      (Math.log(maxSeconds) - Math.log(minSeconds))) *
      plotWidth;
  const yFor = (value: number) =>
    MARGIN.top + plotHeight - (value / (maxValue * 1.08)) * plotHeight;
  const yTicks = Array.from({ length: 5 }, (_, index) => (maxValue * 1.08 * index) / 4);
  const ownPath = linePath(own, xFor, yFor);
  const comparisonPath = comparison ? linePath(comparison.points, xFor, yFor) : "";
  const hoverX = hoverSeconds == null ? null : xFor(hoverSeconds);
  const ownHover = hoverSeconds == null ? null : valueAt(own, hoverSeconds);
  const comparisonHover =
    hoverSeconds == null || !comparison ? null : valueAt(comparison.points, hoverSeconds);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
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
        <label className="text-sm">
          Vergelijk met
          <select
            value={comparisonId}
            onChange={(event) => setComparisonId(event.target.value)}
            className="ml-2 rounded-md border bg-background px-3 py-2"
          >
            <option value="median">ZWB-mediaan</option>
            <option value="none">Geen vergelijking</option>
            {riders.map((rider) => (
              <option key={rider.id} value={rider.id}>
                {rider.name} - {riderTypeLabel(rider.riderType)}
              </option>
            ))}
          </select>
        </label>
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
            const ratio = (clamped - MARGIN.left) / plotWidth;
            setHoverSeconds(Math.exp(Math.log(minSeconds) + ratio * (Math.log(maxSeconds) - Math.log(minSeconds))));
          }}
        >
          <defs>
            <linearGradient id="power-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke="var(--border)"
                strokeDasharray="4 5"
              />
              <text
                x={MARGIN.left - 10}
                y={yFor(tick) + 4}
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
                x1={xFor(tick)}
                x2={xFor(tick)}
                y1={MARGIN.top}
                y2={HEIGHT - MARGIN.bottom}
                stroke="var(--border)"
                strokeOpacity="0.5"
              />
              <text
                x={xFor(tick)}
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
                d={`${ownPath} L ${xFor(own[own.length - 1].seconds).toFixed(1)} ${(HEIGHT - MARGIN.bottom).toFixed(1)} L ${xFor(own[0].seconds).toFixed(1)} ${(HEIGHT - MARGIN.bottom).toFixed(1)} Z`}
                fill="url(#power-area)"
              />
              <path d={ownPath} fill="none" stroke="var(--chart-1)" strokeWidth="4" strokeLinecap="round" />
            </>
          )}
          {comparisonPath && (
            <path
              d={comparisonPath}
              fill="none"
              stroke="var(--chart-3)"
              strokeWidth="3"
              strokeDasharray="9 7"
              strokeLinecap="round"
            />
          )}

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
                <circle cx={hoverX} cy={yFor(ownHover)} r="6" fill="var(--chart-1)" stroke="var(--background)" strokeWidth="3" />
              )}
              {comparisonHover != null && (
                <circle cx={hoverX} cy={yFor(comparisonHover)} r="5" fill="var(--chart-3)" stroke="var(--background)" strokeWidth="3" />
              )}
              <g transform={`translate(${hoverX > WIDTH - 245 ? hoverX - 218 : hoverX + 12}, ${MARGIN.top + 8})`}>
                <rect width="206" height={comparison ? 78 : 58} rx="8" fill="var(--popover)" stroke="var(--border)" />
                <text x="12" y="20" fontSize="12" fontWeight="600" fill="var(--popover-foreground)">
                  {formatDuration(hoverSeconds ?? 0)}
                </text>
                <text x="12" y="41" fontSize="12" fill="var(--chart-1)">
                  {ownName}: {ownHover == null ? "-" : metric === "watts" ? `${Math.round(ownHover)} W` : `${ownHover.toFixed(2)} W/kg`}
                </text>
                {comparison && (
                  <text x="12" y="62" fontSize="12" fill="var(--chart-3)">
                    {comparison.name}: {comparisonHover == null ? "-" : metric === "watts" ? `${Math.round(comparisonHover)} W` : `${comparisonHover.toFixed(2)} W/kg`}
                  </text>
                )}
              </g>
            </g>
          )}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-1 w-8 rounded bg-[var(--chart-1)]" />
          {ownName}
        </span>
        {comparison && (
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-8 rounded bg-[var(--chart-3)]" />
            {comparison.name}
          </span>
        )}
      </div>
      <PowerBenchmarks
        metric={metric}
        ownPoints={own}
        riders={riders}
      />
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
      {POWER_DURATIONS.map((duration) => {
        const ownValue = valueAt(ownPoints, duration.seconds);
        const clubValues = riders.flatMap((rider) => {
          const points = metricPoints(rider.points, rider.weightKg, metric);
          const value = valueAt(points, duration.seconds);
          return value == null ? [] : [value];
        });
        const below = ownValue == null ? 0 : clubValues.filter((value) => value <= ownValue).length;
        const percentile =
          ownValue == null || clubValues.length === 0
            ? null
            : Math.round((below / clubValues.length) * 100);
        return (
          <div key={duration.key} className="rounded-md border bg-card p-4">
            <p className="text-sm text-muted-foreground">{duration.key}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {ownValue == null
                ? "-"
                : metric === "watts"
                  ? `${Math.round(ownValue)} W`
                  : `${ownValue.toFixed(2)} W/kg`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {percentile == null ? "Geen ZWB-vergelijking" : `Hoger dan ${percentile}% van ${clubValues.length} profielen`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
