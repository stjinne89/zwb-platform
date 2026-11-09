"use client";

import { useId } from "react";
import { ChartTooltip, type TooltipRow } from "@/components/charts/chart-tooltip";
import { ResponsiveChart, useChartPointer } from "@/components/charts/responsive-chart";
import { linearScale } from "@/lib/charts/scale";
import type { ChartMetrics } from "@/lib/charts/responsive";
import { raceClock } from "@/lib/zrl-analysis/format";

export type RideSeriesPoint = { t: number; watts: number; heartRate: number | null; wbal: number | null; altitude?: number | null };
export type RideClimb = { name: string; from: number; to: number };

/** W′-balans op de rechteras, van iets onder leeg tot vol. */
const WBAL_LO = -10;
const WBAL_HI = 100;
const POWER_H = 240;
const HEART_H = 150;
const GAP = 26;

const withWbalAxis = (metrics: ChartMetrics) => ({ right: metrics.density === "compact" ? 34 : 44 });

function path(points: Array<[number, number] | null>) {
  let d = "";
  let pen = false;
  for (const p of points) {
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)} `;
    pen = true;
  }
  return d.trim();
}

/**
 * De eigen rit op één tijdas, in twee banden. Boven het vermogen met de
 * W′-balans op een eigen as rechts, zodat je ziet welk vermogen je W′ leegtrekt;
 * erachter het hoogteprofiel, zonder as: alleen de vorm en de spanne tellen.
 * Onder de hartslag, met zijn eigen schaal.
 */
export function RideChart({ series, climbs, ftp }: { series: RideSeriesPoint[]; climbs: RideClimb[]; ftp: number | null }) {
  const pointer = useChartPointer(series.length);
  const clipId = `wbal-empty-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const maxW = Math.ceil(Math.max(...series.map((p) => p.watts), ftp ?? 0) / 50) * 50 + 50;
  const wattTicks = [0, Math.round(maxW / 2 / 50) * 50, maxW];
  const hrs = series.flatMap((p) => (p.heartRate ? [p.heartRate] : []));
  const hrLo = hrs.length ? Math.floor((Math.min(...hrs) - 5) / 10) * 10 : 0;
  const hrHi = hrs.length ? Math.ceil((Math.max(...hrs) + 2) / 10) * 10 : 1;
  const hrTicks = [hrLo, Math.round((hrLo + hrHi) / 2), hrHi];
  const hasWbal = series.some((p) => p.wbal !== null);
  const end = series[series.length - 1]?.t ?? 1;
  const alts = series.flatMap((p) => (p.altitude == null ? [] : [p.altitude]));
  const altLo = alts.length ? Math.min(...alts) : 0;
  const altHi = alts.length ? Math.max(...alts) : 0;
  const hasAltitude = alts.length > 10 && altHi - altLo >= 5;

  return (
    <ResponsiveChart
      ariaLabel="Vermogen met de W′-balans en het hoogteprofiel, en daaronder de hartslag, over de race, met de klimmen gemarkeerd."
      height={POWER_H + (hrs.length ? GAP + HEART_H : 0) + 40}
      margin={hasWbal ? withWbalAxis : undefined}
      onPointerRatio={pointer.onPointerRatio}
    >
      {({ width, metrics, plotWidth, plotHeight }) => {
        const { left, top } = metrics.margin;
        const right = left + plotWidth;
        const x = linearScale({ domain: [0, end], range: [left, right] }).forward;
        const powerH = hrs.length ? ((plotHeight - GAP) * POWER_H) / (POWER_H + HEART_H) : plotHeight;
        const heartY0 = top + powerH + GAP;
        const heartH = plotHeight - powerH - GAP;
        const yW = linearScale({ domain: [0, maxW], range: [top + powerH, top] }).forward;
        const yB = linearScale({ domain: [WBAL_LO, WBAL_HI], range: [top + powerH, top] }).forward;
        const yH = linearScale({ domain: [hrLo, hrHi], range: [heartY0 + heartH, heartY0] }).forward;
        const active = pointer.index === null ? null : series[pointer.index];
        const minuteStep = end > 2400 ? 10 : 5;
        const minutes: number[] = [];
        for (let m = 0; m * 60 <= end; m += metrics.density === "compact" ? minuteStep * 2 : minuteStep) minutes.push(m);

        const powerLine = path(series.map((p) => [x(p.t), yW(Math.min(maxW, p.watts))]));
        const wbalLine = path(series.map((p) => (p.wbal === null ? null : [x(p.t), yB(Math.max(WBAL_LO, Math.min(WBAL_HI, p.wbal)))])));
        const heartLine = path(series.map((p) => (p.heartRate ? [x(p.t), yH(Math.max(hrLo, Math.min(hrHi, p.heartRate)))] : null)));
        // Het hoogteprofiel vult de onderste 60% van de vermogensband.
        const altY = (a: number) => top + powerH - ((a - altLo) / (altHi - altLo)) * powerH * 0.6;
        const altPoints = series.filter((p) => p.altitude != null);
        const altTop = path(altPoints.map((p) => [x(p.t), altY(p.altitude as number)]));
        const altArea = hasAltitude
          ? `M ${x(altPoints[0].t).toFixed(1)} ${(top + powerH).toFixed(1)} ${altTop.replace(/^M/, "L")} L ${x(altPoints[altPoints.length - 1].t).toFixed(1)} ${(top + powerH).toFixed(1)} Z`
          : null;
        const climbRects = (y0: number, h: number) =>
          climbs.map((c) => <rect key={c.name + c.from} x={x(c.from)} y={y0} width={Math.max(1, x(c.to) - x(c.from))} height={h} fill="var(--muted)" opacity={0.7} />);

        return (
          <g fontSize={metrics.axisFontSize}>
            <defs>
              <clipPath id={clipId}>
                <rect x={left} y={yB(0)} width={plotWidth} height={Math.max(0, top + powerH - yB(0))} />
              </clipPath>
            </defs>

            {/* Vermogen, W′ en hoogte */}
            {climbRects(top, powerH)}
            {altArea && (
              <>
                <path d={altArea} fill="var(--chart-terrain)" opacity={0.3} />
                <path d={altTop} fill="none" stroke="var(--chart-terrain)" strokeWidth={1.25} opacity={0.85} />
                <text x={left + 4} y={top + powerH - 6} fill="var(--muted-foreground)">
                  {Math.round(altLo)}–{Math.round(altHi)} m
                </text>
              </>
            )}
            {wattTicks.map((v) => (
              <g key={v}>
                <line x1={left} x2={right} y1={yW(v)} y2={yW(v)} stroke="var(--border)" strokeWidth={1} />
                <text x={left - 6} y={yW(v) + 4} textAnchor="end" fill="var(--muted-foreground)">
                  {v} W
                </text>
              </g>
            ))}
            {ftp !== null && <line x1={left} x2={right} y1={yW(ftp)} y2={yW(ftp)} stroke="var(--color-zwb-gold, var(--primary))" strokeWidth={1.25} />}
            <text x={left} y={top - 6} fontWeight={600} fill="var(--foreground)">
              Vermogen
            </text>
            {hasWbal && (
              <>
                {[0, 50, 100].map((v) => (
                  <text key={v} x={right + 6} y={yB(v) + 4} fill="var(--chart-3)">
                    {v}%
                  </text>
                ))}
                <text x={right} y={top - 6} textAnchor="end" fontWeight={600} fill="var(--chart-3)">
                  W′-balans
                </text>
                <path d={wbalLine} fill="none" stroke="var(--chart-3)" strokeWidth={metrics.strokeWidth.secondary} strokeLinejoin="round" />
                <path d={wbalLine} fill="none" stroke="var(--destructive)" strokeWidth={metrics.strokeWidth.secondary} strokeLinejoin="round" clipPath={`url(#${clipId})`} />
              </>
            )}
            <path d={powerLine} fill="none" stroke="var(--chart-1)" strokeWidth={metrics.strokeWidth.secondary} strokeLinejoin="round" />

            {/* Hartslag */}
            {hrs.length > 0 && (
              <g>
                {climbRects(heartY0, heartH)}
                {hrTicks.map((v) => (
                  <g key={v}>
                    <line x1={left} x2={right} y1={yH(v)} y2={yH(v)} stroke="var(--border)" strokeWidth={1} />
                    <text x={left - 6} y={yH(v) + 4} textAnchor="end" fill="var(--muted-foreground)">
                      {v}
                    </text>
                  </g>
                ))}
                <text x={left} y={heartY0 - 6} fontWeight={600} fill="var(--foreground)">
                  Hartslag
                </text>
                <path d={heartLine} fill="none" stroke="var(--chart-2)" strokeWidth={metrics.strokeWidth.secondary} strokeLinejoin="round" />
              </g>
            )}

            {minutes.map((m) => (
              <text key={m} x={x(m * 60)} y={top + plotHeight + 20} textAnchor="middle" fill="var(--muted-foreground)">
                {m} min
              </text>
            ))}
            {active && (
              <>
                <line x1={x(active.t)} x2={x(active.t)} y1={top} y2={top + plotHeight} stroke="var(--foreground)" strokeOpacity={0.35} />
                <ChartTooltip
                  x={x(active.t)}
                  y={top}
                  chartWidth={width}
                  title={raceClock(active.t)}
                  rows={[
                    { label: "Vermogen", value: `${active.watts} W` },
                    ...(active.wbal !== null ? [{ label: "W′", value: `${active.wbal}%` }] : []),
                    ...(active.altitude != null && hasAltitude ? [{ label: "Hoogte", value: `${Math.round(active.altitude)} m` }] : []),
                    ...(active.heartRate ? [{ label: "Hartslag", value: String(active.heartRate) }] : []),
                  ] satisfies TooltipRow[]}
                />
              </>
            )}
          </g>
        );
      }}
    </ResponsiveChart>
  );
}
