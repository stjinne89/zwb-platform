"use client";

import { useMemo, useState } from "react";
import { Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrainingLoadPoint = {
  date: string;
  load: number | null;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
};

type RangeKey = "42d" | "90d" | "6m" | "1y" | "2y";

const RANGES: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: "42d", label: "42 dagen", days: 42 },
  { key: "90d", label: "90 dagen", days: 90 },
  { key: "6m", label: "6 maanden", days: 183 },
  { key: "1y", label: "1 jaar", days: 365 },
  { key: "2y", label: "2 jaar", days: 730 },
];

const WIDTH = 980;
const HEIGHT = 420;
const MARGIN = { top: 24, right: 26, bottom: 42, left: 58 };
const TOP = { y: 24, h: 235 };
const FORM = { y: 286, h: 116 };
const DAY_MS = 24 * 60 * 60 * 1000;

function finite(value: number | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatMetric(value: number | null, digits = 1) {
  if (value == null) return "-";
  return value.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

function dateMs(value: string) {
  const ms = new Date(`${value}T12:00:00`).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function positiveMax(values: Array<number | null>, fallback: number) {
  const max = Math.max(...values.flatMap((value) => (value != null && value > 0 ? [value] : [])), fallback);
  return Math.ceil(max / 10) * 10;
}

function absMax(values: Array<number | null>, fallback: number) {
  const max = Math.max(...values.flatMap((value) => (value != null ? [Math.abs(value)] : [])), fallback);
  return Math.ceil(max / 5) * 5;
}

function lineSegments<T>(
  points: T[],
  valueFor: (point: T) => number | null,
  xFor: (index: number) => number,
  yFor: (value: number) => number,
) {
  const segments: string[] = [];
  let current = "";

  points.forEach((point, index) => {
    const value = valueFor(point);
    if (value == null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    const command = current ? "L" : "M";
    current += `${command} ${xFor(index).toFixed(1)} ${yFor(value).toFixed(1)} `;
  });

  if (current) segments.push(current);
  return segments;
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
}: {
  points: TrainingLoadPoint[];
  ctl: number | null | undefined;
  tsb: number | null | undefined;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<RangeKey>("90d");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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

  const hasChart = visible.length >= 2;
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const xFor = (index: number) =>
    MARGIN.left + (visible.length <= 1 ? 0 : (index / (visible.length - 1)) * plotWidth);

  const topMax = positiveMax(
    visible.flatMap((point) => [point.load, point.ctl, point.atl]),
    100,
  );
  const yTop = (value: number) => TOP.y + TOP.h - (value / topMax) * TOP.h;
  const tsbMax = absMax(visible.map((point) => point.tsb), 30);
  const yForm = (value: number) => FORM.y + FORM.h / 2 - (value / tsbMax) * (FORM.h / 2);
  const hoverPoint = hoverIndex == null ? null : visible[hoverIndex] ?? null;
  const dateTicks = visible.length
    ? [0, Math.floor((visible.length - 1) / 2), visible.length - 1].filter(
        (value, index, all) => all.indexOf(value) === index,
      )
    : [];
  const loadBarWidth = Math.max(1, Math.min(5, plotWidth / Math.max(visible.length, 1) - 1));

  return (
    <>
      {open && (
        <div className="order-first rounded-lg border bg-card p-4 sm:col-span-2 lg:col-span-5">
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
                    "rounded px-2.5 py-1.5 font-medium transition",
                    range === item.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {hasChart ? (
            <div className="mt-4 overflow-hidden rounded-md border bg-background p-2 sm:p-4">
              <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                role="img"
                aria-label="Grafiek met trainingsbelasting, CTL, ATL en Form"
                className="h-auto w-full touch-none"
                onPointerLeave={() => setHoverIndex(null)}
                onPointerMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const chartX = ((event.clientX - rect.left) / rect.width) * WIDTH;
                  const ratio = Math.max(0, Math.min(1, (chartX - MARGIN.left) / plotWidth));
                  setHoverIndex(Math.round(ratio * (visible.length - 1)));
                }}
              >
                <defs>
                  <linearGradient id="training-load-top" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                <rect
                  x={MARGIN.left}
                  y={TOP.y}
                  width={plotWidth}
                  height={TOP.h}
                  fill="url(#training-load-top)"
                />
                <rect
                  x={MARGIN.left}
                  y={FORM.y}
                  width={plotWidth}
                  height={FORM.h / 2}
                  fill="var(--accent)"
                  opacity="0.08"
                />
                <rect
                  x={MARGIN.left}
                  y={FORM.y + FORM.h / 2}
                  width={plotWidth}
                  height={FORM.h / 2}
                  fill="var(--destructive)"
                  opacity="0.08"
                />

                {[0, topMax / 2, topMax].map((tick) => (
                  <g key={`top-${tick}`}>
                    <line
                      x1={MARGIN.left}
                      x2={WIDTH - MARGIN.right}
                      y1={yTop(tick)}
                      y2={yTop(tick)}
                      stroke="var(--border)"
                      strokeDasharray="4 5"
                    />
                    <text
                      x={MARGIN.left - 10}
                      y={yTop(tick) + 4}
                      textAnchor="end"
                      fontSize="12"
                      fill="var(--muted-foreground)"
                    >
                      {Math.round(tick)}
                    </text>
                  </g>
                ))}

                {[-tsbMax, 0, tsbMax].map((tick) => (
                  <g key={`form-${tick}`}>
                    <line
                      x1={MARGIN.left}
                      x2={WIDTH - MARGIN.right}
                      y1={yForm(tick)}
                      y2={yForm(tick)}
                      stroke="var(--border)"
                      strokeDasharray={tick === 0 ? undefined : "4 5"}
                    />
                    <text
                      x={MARGIN.left - 10}
                      y={yForm(tick) + 4}
                      textAnchor="end"
                      fontSize="12"
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
                      y1={TOP.y}
                      y2={FORM.y + FORM.h}
                      stroke="var(--border)"
                      strokeOpacity="0.55"
                    />
                    <text
                      x={xFor(index)}
                      y={HEIGHT - 16}
                      textAnchor="middle"
                      fontSize="12"
                      fill="var(--muted-foreground)"
                    >
                      {formatDate(visible[index].date)}
                    </text>
                  </g>
                ))}

                <text x="8" y={TOP.y + 18} fontSize="12" fill="var(--muted-foreground)">
                  Load
                </text>
                <text x="8" y={FORM.y + 18} fontSize="12" fill="var(--muted-foreground)">
                  Form
                </text>

                {visible.map((point, index) => {
                  if (point.load == null) return null;
                  const y = yTop(point.load);
                  return (
                    <rect
                      key={`load-${point.date}`}
                      x={xFor(index) - loadBarWidth / 2}
                      y={y}
                      width={loadBarWidth}
                      height={TOP.y + TOP.h - y}
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
                    strokeWidth="3"
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
                    strokeWidth="2.2"
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
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {hoverPoint && hoverIndex != null && (
                  <g>
                    <line
                      x1={xFor(hoverIndex)}
                      x2={xFor(hoverIndex)}
                      y1={TOP.y}
                      y2={FORM.y + FORM.h}
                      stroke="var(--foreground)"
                      strokeOpacity="0.5"
                    />
                    <g
                      transform={`translate(${
                        xFor(hoverIndex) > WIDTH - 250 ? xFor(hoverIndex) - 226 : xFor(hoverIndex) + 12
                      }, ${TOP.y + 8})`}
                    >
                      <rect width="214" height="106" rx="8" fill="var(--popover)" stroke="var(--border)" />
                      <text x="12" y="21" fontSize="12" fontWeight="600" fill="var(--popover-foreground)">
                        {formatDate(hoverPoint.date)}
                      </text>
                      <text x="12" y="43" fontSize="12" fill="var(--chart-3)">
                        Load {formatMetric(hoverPoint.load, 0)}
                      </text>
                      <text x="12" y="62" fontSize="12" fill="var(--chart-1)">
                        CTL {formatMetric(hoverPoint.ctl)}
                      </text>
                      <text x="12" y="81" fontSize="12" fill="var(--chart-2)">
                        ATL {formatMetric(hoverPoint.atl)}
                      </text>
                      <text x="12" y="100" fontSize="12" fill="var(--chart-3)">
                        Form {formatMetric(hoverPoint.tsb)}
                      </text>
                    </g>
                  </g>
                )}
              </svg>
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
