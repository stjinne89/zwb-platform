"use client";

import { useMemo, useState } from "react";
import { Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { ResponsiveChart, useChartPointer } from "@/components/charts/responsive-chart";
import { formatChartDate, formatMetric } from "@/lib/charts/format";
import { formatTickDate, tickIndices } from "@/lib/charts/responsive";
import { defsId } from "@/lib/charts/ids";
import { lineSegments } from "@/lib/charts/paths";
import { absMax, positiveMax } from "@/lib/charts/scale";
import type { TrainingLoadPoint } from "@/lib/training/load-points";

export type { TrainingLoadPoint };

type RangeKey = "42d" | "90d" | "6m" | "1y" | "2y";

const RANGES: Array<{ key: RangeKey; label: string; short: string; days: number }> = [
  { key: "42d", label: "42 dagen", short: "42d", days: 42 },
  { key: "90d", label: "90 dagen", short: "90d", days: 90 },
  { key: "6m", label: "6 maanden", short: "6m", days: 183 },
  { key: "1y", label: "1 jaar", short: "1j", days: 365 },
  { key: "2y", label: "2 jaar", short: "2j", days: 730 },
];

const DAY_MS = 24 * 60 * 60 * 1000;
/** Verticale ruimte tussen het load-vlak en het form-vlak. */
const PANEL_GAP = 14;

function finite(value: number | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function dateMs(value: string) {
  const ms = new Date(`${value}T12:00:00`).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function enrichPoints(points: TrainingLoadPoint[]) {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((point, index) => {
    const previous = sorted[index - 1];
    const ctl = finite(point.ctl);
    const atl = finite(point.atl);
    const derivedLoad =
      finite(point.load) ??
      (ctl != null && previous?.ctl != null
        ? Math.max(0, previous.ctl + (ctl - previous.ctl) * 42)
        : null);
    return {
      ...point,
      load: derivedLoad,
      ctl,
      atl,
      tsb: finite(point.tsb) ?? (ctl != null && atl != null ? ctl - atl : null),
    };
  });
}

/** Gelijkmatige y-ticks van 0 tot max. */
function axisTicks(max: number, count: number) {
  const steps = Math.max(2, count - 1);
  return Array.from({ length: steps + 1 }, (_, i) => (max / steps) * i);
}

function MetricButton({
  icon: Icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={active}
      onClick={onClick}
      className={cn(
        "rounded-md border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-ring",
        active && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <Icon className="size-5 text-primary" />
      </div>
    </button>
  );
}

export function TrainingLoadMetrics({
  points,
  ctl,
  tsb,
  today,
  panelClassName = "order-first rounded-lg border bg-card p-4 sm:col-span-2 lg:col-span-5",
  idSuffix,
}: {
  points: TrainingLoadPoint[];
  ctl: number | null | undefined;
  tsb: number | null | undefined;
  today: string;
  /** Past het paneel in een ander raster, geef dan eigen span-klassen mee. */
  panelClassName?: string;
  /** Verplicht zodra dezelfde grafiek twee keer op één pagina staat. */
  idSuffix?: string;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<RangeKey>("90d");

  const series = useMemo(() => enrichPoints(points), [points]);
  const selectedRange = RANGES.find((item) => item.key === range) ?? RANGES[1];
  const todayMs = dateMs(today);
  const visible = useMemo(() => {
    const fallbackEnd = Math.max(...series.map((point) => dateMs(point.date)), 0);
    const end = todayMs || fallbackEnd;
    const start = end - (selectedRange.days - 1) * DAY_MS;
    return series.filter((point) => {
      const ms = dateMs(point.date);
      return ms >= start && ms <= end;
    });
  }, [selectedRange.days, series, todayMs]);

  const { index: hoverIndex, onPointerRatio } = useChartPointer(visible.length);
  const hasChart = visible.length >= 2;
  const hoverPoint = hoverIndex == null ? null : visible[hoverIndex] ?? null;

  const topMax = positiveMax(
    visible.flatMap((point) => [point.load, point.ctl, point.atl]),
    100,
  );
  const tsbMax = absMax(
    visible.map((point) => point.tsb),
    30,
  );
  const topGradientId = defsId("training-load-top", idSuffix);

  return (
    <>
      {open && (
        <div className={panelClassName}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Load en Form</h3>
              <p className="text-sm text-muted-foreground">
                CTL is je fitness over langere tijd; ATL is je recente vermoeidheid. Form is CTL min ATL.
              </p>
            </div>
            <div className="flex rounded-md border bg-background p-1 text-sm">
              {RANGES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setRange(item.key)}
                  className={cn(
                    "min-h-9 rounded px-2.5 font-medium transition",
                    range === item.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="sm:hidden">{item.short}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {hasChart ? (
            <div className="mt-4 overflow-hidden rounded-md border bg-background p-2 sm:p-4">
              <ResponsiveChart
                ariaLabel="Grafiek met trainingsbelasting, CTL, ATL en Form"
                onPointerRatio={onPointerRatio}
                heightOptions={{ compact: 0.9, comfortable: 0.42, min: 240, max: 420 }}
              >
                {({ width, height, metrics, plotWidth, plotHeight }) => {
                  const { margin, axisFontSize } = metrics;
                  const topH = Math.round((plotHeight - PANEL_GAP) * 0.64);
                  const formH = plotHeight - PANEL_GAP - topH;
                  const topY = margin.top;
                  const formY = topY + topH + PANEL_GAP;

                  const xFor = (index: number) =>
                    margin.left +
                    (visible.length <= 1 ? 0 : (index / (visible.length - 1)) * plotWidth);
                  const yTop = (value: number) => topY + topH - (value / topMax) * topH;
                  const yForm = (value: number) =>
                    formY + formH / 2 - (value / tsbMax) * (formH / 2);

                  const loadBarWidth = Math.max(
                    1,
                    Math.min(6, plotWidth / Math.max(visible.length, 1) - 1),
                  );
                  const dateTicks = tickIndices(visible.length, metrics.xTickCount);

                  return (
                    <>
                      <defs>
                        <linearGradient id={topGradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.16" />
                          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      <rect
                        x={margin.left}
                        y={topY}
                        width={plotWidth}
                        height={topH}
                        fill={`url(#${topGradientId})`}
                      />
                      <rect
                        x={margin.left}
                        y={formY}
                        width={plotWidth}
                        height={formH / 2}
                        fill="var(--accent)"
                        opacity="0.08"
                      />
                      <rect
                        x={margin.left}
                        y={formY + formH / 2}
                        width={plotWidth}
                        height={formH / 2}
                        fill="var(--destructive)"
                        opacity="0.08"
                      />

                      {axisTicks(topMax, metrics.yTickCount).map((tick) => (
                        <g key={`top-${tick}`}>
                          <line
                            x1={margin.left}
                            x2={width - margin.right}
                            y1={yTop(tick)}
                            y2={yTop(tick)}
                            stroke="var(--border)"
                            strokeDasharray="4 5"
                          />
                          <text
                            x={margin.left - 6}
                            y={yTop(tick) + axisFontSize / 3}
                            textAnchor="end"
                            fontSize={axisFontSize}
                            fill="var(--muted-foreground)"
                          >
                            {Math.round(tick)}
                          </text>
                        </g>
                      ))}

                      {[-tsbMax, 0, tsbMax].map((tick) => (
                        <g key={`form-${tick}`}>
                          <line
                            x1={margin.left}
                            x2={width - margin.right}
                            y1={yForm(tick)}
                            y2={yForm(tick)}
                            stroke="var(--border)"
                            strokeDasharray={tick === 0 ? undefined : "4 5"}
                          />
                          <text
                            x={margin.left - 6}
                            y={yForm(tick) + axisFontSize / 3}
                            textAnchor="end"
                            fontSize={axisFontSize}
                            fill="var(--muted-foreground)"
                          >
                            {tick > 0 ? `+${tick}` : tick}
                          </text>
                        </g>
                      ))}

                      {dateTicks.map((index) => (
                        <g key={`date-${index}`}>
                          <line
                            x1={xFor(index)}
                            x2={xFor(index)}
                            y1={topY}
                            y2={formY + formH}
                            stroke="var(--border)"
                            strokeOpacity="0.55"
                          />
                          <text
                            x={xFor(index)}
                            y={height - Math.round(margin.bottom / 3)}
                            textAnchor={
                              index === 0
                                ? "start"
                                : index === visible.length - 1
                                  ? "end"
                                  : "middle"
                            }
                            fontSize={axisFontSize}
                            fill="var(--muted-foreground)"
                          >
                            {formatTickDate(visible[index].date, metrics.density)}
                          </text>
                        </g>
                      ))}

                      {metrics.density === "comfortable" && (
                        <>
                          <text
                            x={margin.left + 4}
                            y={topY + axisFontSize}
                            fontSize={axisFontSize}
                            fill="var(--muted-foreground)"
                          >
                            Load
                          </text>
                          <text
                            x={margin.left + 4}
                            y={formY + axisFontSize}
                            fontSize={axisFontSize}
                            fill="var(--muted-foreground)"
                          >
                            Form
                          </text>
                        </>
                      )}

                      {visible.map((point, index) => {
                        if (point.load == null) return null;
                        const y = yTop(point.load);
                        return (
                          <rect
                            key={`load-${point.date}`}
                            x={xFor(index) - loadBarWidth / 2}
                            y={y}
                            width={loadBarWidth}
                            height={Math.max(0, topY + topH - y)}
                            rx="1"
                            fill="var(--chart-3)"
                            opacity="0.42"
                          />
                        );
                      })}

                      {lineSegments(visible, (point) => point.ctl, xFor, yTop).map((path, index) => (
                        <path
                          key={`ctl-${index}`}
                          d={path}
                          fill="none"
                          stroke="var(--chart-1)"
                          strokeWidth={metrics.strokeWidth.primary}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                      {lineSegments(visible, (point) => point.atl, xFor, yTop).map((path, index) => (
                        <path
                          key={`atl-${index}`}
                          d={path}
                          fill="none"
                          stroke="var(--chart-2)"
                          strokeWidth={metrics.strokeWidth.secondary}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeOpacity="0.9"
                        />
                      ))}
                      {lineSegments(visible, (point) => point.tsb, xFor, yForm).map((path, index) => (
                        <path
                          key={`tsb-${index}`}
                          d={path}
                          fill="none"
                          stroke="var(--chart-3)"
                          strokeWidth={metrics.strokeWidth.secondary}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}

                      {hoverPoint && hoverIndex != null && (
                        <g>
                          <line
                            x1={xFor(hoverIndex)}
                            x2={xFor(hoverIndex)}
                            y1={topY}
                            y2={formY + formH}
                            stroke="var(--foreground)"
                            strokeOpacity="0.5"
                          />
                          <ChartTooltip
                            x={xFor(hoverIndex)}
                            y={topY + 4}
                            chartWidth={width}
                            title={formatChartDate(hoverPoint.date)}
                            rows={[
                              { label: "Load", value: formatMetric(hoverPoint.load, 0), color: "var(--chart-3)" },
                              { label: "CTL", value: formatMetric(hoverPoint.ctl), color: "var(--chart-1)" },
                              { label: "ATL", value: formatMetric(hoverPoint.atl), color: "var(--chart-2)" },
                              { label: "Form", value: formatMetric(hoverPoint.tsb), color: "var(--chart-3)" },
                            ]}
                          />
                        </g>
                      )}
                    </>
                  );
                }}
              </ResponsiveChart>
            </div>
          ) : (
            <div className="mt-4 rounded-md border bg-background p-4 text-sm text-muted-foreground">
              Nog niet genoeg Intervals-data voor deze grafiek.
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-7 rounded bg-[var(--chart-1)]" />
              CTL (fitness)
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-7 rounded bg-[var(--chart-2)]" />
              ATL (vermoeidheid)
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[var(--chart-3)] opacity-60" />
              Load
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-7 rounded bg-[var(--chart-3)]" />
              Form
            </span>
          </div>
        </div>
      )}

      <MetricButton
        icon={TrendingUp}
        label="Fitness (CTL)"
        value={formatMetric(finite(ctl))}
        active={open}
        onClick={() => setOpen((value) => !value)}
      />
      <MetricButton
        icon={Activity}
        label="Form"
        value={formatMetric(finite(tsb))}
        active={open}
        onClick={() => setOpen((value) => !value)}
      />
    </>
  );
}
