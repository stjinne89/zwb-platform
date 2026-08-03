"use client";

import { useMemo, useState } from "react";
import { ChartTooltip, type TooltipRow } from "@/components/charts/chart-tooltip";
import { ResponsiveChart } from "@/components/charts/responsive-chart";
import { formatDuration } from "@/lib/charts/format";
import { defsId } from "@/lib/charts/ids";
import { valueAt, median } from "@/lib/charts/interpolate";
import { areaPath, linePath } from "@/lib/charts/paths";
import { logScale, linearScale } from "@/lib/charts/scale";
import { MAX_SERIES, seriesColor } from "@/lib/charts/palette";
import { matchFatigueCurve } from "@/lib/teams/fatigue-curves";
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

/** Curve van maximaal vermogen ná een hoeveelheid arbeid (kJ) in de rit. */
export type FatigueCurve = {
  afterKj: number;
  points: PowerCurvePoint[];
};

export type ComparisonRider = {
  id: string;
  name: string;
  riderType: string | null;
  weightKg: number | null;
  points: PowerCurvePoint[];
  fatigueCurves?: FatigueCurve[];
  hasFullCurve?: boolean;
};

type Metric = "watts" | "wkg";

const X_TICKS = [5, 15, 30, 60, 120, 300, 600, 1200, 3600, 7200, 18000];
/** Op telefoonbreedte passen elf duurlabels niet; deze wel. */
const X_TICKS_COMPACT = [5, 60, 300, 1200, 3600, 18000];
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

function formatKj(afterKj: number) {
  return `${afterKj.toLocaleString("nl-NL")} kJ`;
}

/** Het lid in de gekozen stand; null als het daar geen curve voor heeft. */
function riderAtLevel(rider: ComparisonRider, afterKj: number): ComparisonRider | null {
  if (afterKj === 0) return rider;
  const match = matchFatigueCurve(rider.fatigueCurves, afterKj);
  return match ? { ...rider, points: match.points } : null;
}

export function PowerCurveChart({
  ownName,
  ownWeightKg,
  ownPoints,
  fatigueCurves = [],
  riders,
  idSuffix,
}: {
  ownName: string;
  ownWeightKg: number | null;
  ownPoints: PowerCurvePoint[];
  /** Vermoeide curves uit intervals.icu, oplopend op kJ. */
  fatigueCurves?: FatigueCurve[];
  riders: ComparisonRider[];
  /** Verplicht zodra dezelfde grafiek twee keer op één pagina staat. */
  idSuffix?: string;
}) {
  const [metric, setMetric] = useState<Metric>("watts");
  const [comparisonIds, setComparisonIds] = useState<string[]>([MEDIAN_ID]);
  const [hoverSeconds, setHoverSeconds] = useState<number | null>(null);
  const [levelIndex, setLevelIndex] = useState(0);
  const hasOwnWkg =
    ownWeightKg != null ||
    ownPoints.some((point) => {
      const value = Number(point.wattsPerKg);
      return Number.isFinite(value) && value > 0;
    });

  const levels = useMemo<FatigueCurve[]>(
    () => [{ afterKj: 0, points: ownPoints }, ...fatigueCurves],
    [fatigueCurves, ownPoints],
  );
  const level = levels[Math.min(levelIndex, levels.length - 1)];
  const afterKj = level.afterKj;

  const own = useMemo(
    () => metricPoints(level.points, ownWeightKg, metric),
    [level, metric, ownWeightKg],
  );
  const fresh = useMemo(
    () => (afterKj === 0 ? [] : metricPoints(ownPoints, ownWeightKg, metric)),
    [afterKj, metric, ownPoints, ownWeightKg],
  );

  // Vergelijken gebeurt in de gekozen stand: elk lid levert de curve die bij
  // dezelfde arbeid hoort, anders doet het lid in deze stand niet mee.
  const levelRiders = useMemo(
    () => riders.flatMap((rider) => {
      const matched = riderAtLevel(rider, afterKj);
      return matched ? [matched] : [];
    }),
    [afterKj, riders],
  );

  const series = useMemo(() => {
    return comparisonIds.flatMap((id, index) => {
      const color = seriesColor(index);
      const suffix = afterKj === 0 ? "" : ` na ${formatKj(afterKj)}`;
      if (id === MEDIAN_ID) {
        const points = medianCurveSeconds(levelRiders).flatMap((seconds) => {
          const values = levelRiders.flatMap((rider) => {
            const riderPoints = metricPoints(rider.points, rider.weightKg, metric);
            const value = valueAt(riderPoints, seconds);
            return value == null ? [] : [value];
          });
          const value = median(values);
          return value == null ? [] : [{ seconds, watts: value }];
        });
        return points.length
          ? [{ id, name: `ZWB-mediaan (${levelRiders.length})${suffix}`, points, color }]
          : [];
      }
      const rider = levelRiders.find((entry) => entry.id === id);
      if (!rider) return [];
      return [
        {
          id,
          name: `${rider.name}${suffix}`,
          points: metricPoints(rider.points, rider.weightKg, metric),
          color,
        },
      ];
    });
  }, [afterKj, comparisonIds, levelRiders, metric]);

  function toggleComparison(id: string) {
    setComparisonIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : current.length >= MAX_SERIES
          ? current
          : [...current, id],
    );
  }

  const allPoints = [...own, ...fresh, ...series.flatMap((entry) => entry.points)];
  const minSeconds = Math.max(1, Math.min(...allPoints.map((point) => point.seconds), 5));
  const maxSeconds = Math.max(...allPoints.map((point) => point.seconds), 1200);
  const maxValue = Math.max(...allPoints.map((point) => point.watts), metric === "watts" ? 300 : 3);
  const yMax = maxValue * 1.08;
  // De aanwijzer levert een fractie van het plotvlak; de log-as maakt daar
  // seconden van, los van de breedte waarop we uiteindelijk tekenen.
  const secondsFromRatio = (ratio: number) =>
    Math.exp(
      Math.log(minSeconds) + ratio * (Math.log(maxSeconds) - Math.log(minSeconds)),
    );
  const ownHover = hoverSeconds == null ? null : valueAt(own, hoverSeconds);
  const areaGradientId = defsId("power-area", idSuffix);
  const atLimit = comparisonIds.length >= MAX_SERIES;
  const ownLabel = afterKj === 0 ? ownName : `${ownName} na ${formatKj(afterKj)}`;

  const tooltipRows: TooltipRow[] = [
    { label: `${ownLabel}:`, value: formatValue(ownHover, metric), color: "var(--chart-1)" },
    ...(afterKj === 0
      ? []
      : [
          {
            label: `${ownName} vers:`,
            value: formatValue(
              hoverSeconds == null ? null : valueAt(fresh, hoverSeconds),
              metric,
            ),
            color: "var(--chart-1)",
          },
        ]),
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
              className={`min-h-9 rounded px-3 font-medium ${
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
            {[
              { id: MEDIAN_ID, label: "ZWB-mediaan", available: levelRiders.length > 0 },
              ...riders.map((rider) => ({
                id: rider.id,
                label: `${rider.name} - ${riderTypeLabel(rider.riderType)}`,
                available: levelRiders.some((entry) => entry.id === rider.id),
              })),
            ].map((option) => {
              const active = comparisonIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  disabled={!option.available || (!active && atLimit)}
                  onClick={() => toggleComparison(option.id)}
                  className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition ${
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
        <ResponsiveChart
          ariaLabel="Interactieve power-duration curve"
          onPointerRatio={(ratio) =>
            setHoverSeconds(ratio == null ? null : secondsFromRatio(ratio))
          }
          heightOptions={{ compact: 0.82, comfortable: 0.42, min: 220, max: 400 }}
        >
          {({ width, height, metrics, plotWidth, plotHeight }) => {
            const { margin, axisFontSize } = metrics;
            const x = logScale({
              domain: [minSeconds, maxSeconds],
              range: [margin.left, margin.left + plotWidth],
            });
            const y = linearScale({
              domain: [0, yMax],
              range: [margin.top + plotHeight, margin.top],
            });
            const steps = Math.max(2, metrics.yTickCount - 1);
            const yTicks = Array.from({ length: steps + 1 }, (_, i) => (yMax * i) / steps);
            const xTicks = metrics.density === "compact" ? X_TICKS_COMPACT : X_TICKS;
            const baseline = height - margin.bottom;
            const ownPath = linePath(
              own,
              (point) => x.forward(point.seconds),
              (point) => y.forward(point.watts),
            );
            const freshPath = linePath(
              fresh,
              (point) => x.forward(point.seconds),
              (point) => y.forward(point.watts),
            );
            const hoverX = hoverSeconds == null ? null : x.forward(hoverSeconds);

            return (
              <>
                <defs>
                  <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {yTicks.map((tick) => (
                  <g key={tick}>
                    <line
                      x1={margin.left}
                      x2={width - margin.right}
                      y1={y.forward(tick)}
                      y2={y.forward(tick)}
                      stroke="var(--border)"
                      strokeDasharray="4 5"
                    />
                    <text
                      x={margin.left - 6}
                      y={y.forward(tick) + axisFontSize / 3}
                      textAnchor="end"
                      fontSize={axisFontSize}
                      fill="var(--muted-foreground)"
                    >
                      {metric === "watts" ? Math.round(tick) : tick.toFixed(1)}
                    </text>
                  </g>
                ))}

                {xTicks
                  .filter((tick) => tick >= minSeconds && tick <= maxSeconds)
                  .map((tick, index, all) => (
                    <g key={tick}>
                      <line
                        x1={x.forward(tick)}
                        x2={x.forward(tick)}
                        y1={margin.top}
                        y2={baseline}
                        stroke="var(--border)"
                        strokeOpacity="0.5"
                      />
                      <text
                        x={x.forward(tick)}
                        y={height - Math.round(margin.bottom / 3)}
                        textAnchor={
                          index === 0 ? "start" : index === all.length - 1 ? "end" : "middle"
                        }
                        fontSize={axisFontSize}
                        fill="var(--muted-foreground)"
                      >
                        {formatDuration(tick)}
                      </text>
                    </g>
                  ))}

                {freshPath && (
                  <path
                    d={freshPath}
                    fill="none"
                    stroke="var(--chart-1)"
                    strokeOpacity="0.35"
                    strokeWidth={metrics.strokeWidth.secondary}
                    strokeDasharray="2 6"
                    strokeLinecap="round"
                  />
                )}
                {ownPath && (
                  <>
                    <path
                      d={areaPath(
                        ownPath,
                        x.forward(own[0].seconds),
                        x.forward(own[own.length - 1].seconds),
                        baseline,
                      )}
                      fill={`url(#${areaGradientId})`}
                    />
                    <path
                      d={ownPath}
                      fill="none"
                      stroke="var(--chart-1)"
                      strokeWidth={metrics.strokeWidth.primary + 1}
                      strokeLinecap="round"
                    />
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
                      strokeWidth={metrics.strokeWidth.primary}
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
                      y1={margin.top}
                      y2={baseline}
                      stroke="var(--foreground)"
                      strokeOpacity="0.55"
                    />
                    {ownHover != null && (
                      <circle
                        cx={hoverX}
                        cy={y.forward(ownHover)}
                        r={metrics.dotRadius + 2.5}
                        fill="var(--chart-1)"
                        stroke="var(--background)"
                        strokeWidth="3"
                      />
                    )}
                    {series.map((entry) => {
                      const value =
                        hoverSeconds == null ? null : valueAt(entry.points, hoverSeconds);
                      if (value == null) return null;
                      return (
                        <circle
                          key={`hover-${entry.id}`}
                          cx={hoverX}
                          cy={y.forward(value)}
                          r={metrics.dotRadius + 1.5}
                          fill={entry.color}
                          stroke="var(--background)"
                          strokeWidth="3"
                        />
                      );
                    })}
                    <ChartTooltip
                      x={hoverX}
                      y={margin.top + 4}
                      chartWidth={width}
                      title={formatDuration(hoverSeconds ?? 0)}
                      rows={tooltipRows}
                      width={230}
                    />
                  </g>
                )}
              </>
            );
          }}
        </ResponsiveChart>
      </div>

      {levels.length > 1 ? (
        <label className="block">
          <span className="flex items-center justify-between text-sm">
            <span className="font-medium">Na arbeid</span>
            <span className="tabular-nums text-muted-foreground">
              {afterKj === 0 ? "Vers" : formatKj(afterKj)}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={levels.length - 1}
            step={1}
            value={Math.min(levelIndex, levels.length - 1)}
            onChange={(event) => setLevelIndex(Number(event.target.value))}
            aria-label="Vermogen na arbeid"
            className="mt-1 w-full accent-primary"
          />
          {/* Op smal scherm botsen alle tussenstanden; daar volstaan de uitersten. */}
          <span className="flex justify-between text-xs text-muted-foreground">
            {levels.map((entry, index) => (
              <span
                key={entry.afterKj}
                className={
                  index === 0 || index === levels.length - 1 ? undefined : "hidden sm:inline"
                }
              >
                {entry.afterKj === 0 ? "Vers" : formatKj(entry.afterKj)}
              </span>
            ))}
          </span>
        </label>
      ) : null}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-1 w-8 rounded bg-[var(--chart-1)]" />
          {ownLabel}
        </span>
        {afterKj === 0 ? null : (
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-8 rounded bg-[var(--chart-1)] opacity-40" />
            {ownName} vers
          </span>
        )}
        {series.map((entry) => (
          <span key={`legend-${entry.id}`} className="inline-flex items-center gap-2">
            <span className="h-1 w-8 rounded" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
        ))}
      </div>
      <PowerBenchmarks
        metric={metric}
        ownPoints={own}
        freshPoints={fresh}
        afterKj={afterKj}
        riders={levelRiders}
      />
    </div>
  );
}

function PowerBenchmarks({
  metric,
  ownPoints,
  freshPoints,
  afterKj,
  riders,
}: {
  metric: Metric;
  ownPoints: PowerCurvePoint[];
  freshPoints: PowerCurvePoint[];
  afterKj: number;
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
        const freshValue = afterKj === 0 ? null : valueAt(freshPoints, seconds);
        const change =
          freshValue == null || freshValue === 0
            ? null
            : Math.round(((ownValue - freshValue) / freshValue) * 100);
        return [
          <div key={seconds} className="rounded-md border bg-card p-4">
            <p className="text-sm text-muted-foreground">{formatDuration(seconds)}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatValue(ownValue, metric)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {percentile == null
                ? "Geen ZWB-vergelijking"
                : `Hoger dan ${percentile}% van ${clubValues.length} profiel${
                    clubValues.length === 1 ? "" : "en"
                  }`}
            </p>
            {change == null ? null : (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {`${change > 0 ? "+" : ""}${change}% t.o.v. vers`}
              </p>
            )}
          </div>,
        ];
      })}
    </div>
  );
}
