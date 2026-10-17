"use client";

import { ChartTooltip, type TooltipRow } from "@/components/charts/chart-tooltip";
import { ResponsiveChart, useChartPointer } from "@/components/charts/responsive-chart";
import { linearScale } from "@/lib/charts/scale";
import { raceClock } from "@/lib/zrl-analysis/format";

export type RideSeriesPoint = { t: number; watts: number; heartRate: number | null; wbal: number | null };
export type RideClimb = { name: string; from: number; to: number };

type Band = {
  key: "watts" | "heartRate" | "wbal";
  label: string;
  color: string;
  lo: number;
  hi: number;
  ticks: number[];
  unit: string;
  reference?: number;
};

/**
 * De eigen rit in drie banden op één tijdas: vermogen, hartslag en W′-balans.
 * Drie banden in plaats van twee assen: elke maat houdt zijn eigen schaal.
 */
export function RideChart({ series, climbs, ftp }: { series: RideSeriesPoint[]; climbs: RideClimb[]; ftp: number | null }) {
  const pointer = useChartPointer(series.length);
  const maxW = Math.ceil(Math.max(...series.map((p) => p.watts), ftp ?? 0) / 50) * 50 + 50;
  const hrs = series.flatMap((p) => (p.heartRate ? [p.heartRate] : []));
  const hasWbal = series.some((p) => p.wbal !== null);
  const bands: Band[] = [
    { key: "watts", label: "Vermogen", color: "var(--chart-1)", lo: 0, hi: maxW, ticks: [0, Math.round(maxW / 2 / 50) * 50, maxW], unit: " W", reference: ftp ?? undefined },
    ...(hrs.length
      ? [{ key: "heartRate" as const, label: "Hartslag", color: "var(--chart-2)", lo: Math.floor((Math.min(...hrs) - 5) / 10) * 10, hi: Math.ceil((Math.max(...hrs) + 2) / 10) * 10, ticks: [], unit: "" }]
      : []),
    ...(hasWbal ? [{ key: "wbal" as const, label: "W′-balans", color: "var(--chart-3)", lo: -10, hi: 100, ticks: [0, 50, 100], unit: "%" }] : []),
  ];
  for (const band of bands) if (band.ticks.length === 0) band.ticks = [band.lo, Math.round((band.lo + band.hi) / 2), band.hi];
  const end = series[series.length - 1]?.t ?? 1;

  return (
    <ResponsiveChart
      ariaLabel="Vermogen, hartslag en W′-balans over de race, met de klimmen gemarkeerd."
      height={bands.length * 150 + 40}
      onPointerRatio={pointer.onPointerRatio}
    >
      {({ width, metrics, plotWidth, plotHeight }) => {
        const { left, top } = metrics.margin;
        const x = linearScale({ domain: [0, end], range: [left, left + plotWidth] }).forward;
        const gap = 26;
        const bandH = (plotHeight - gap * (bands.length - 1)) / bands.length;
        const active = pointer.index === null ? null : series[pointer.index];
        const minuteStep = end > 2400 ? 10 : 5;
        const minutes: number[] = [];
        for (let m = 0; m * 60 <= end; m += metrics.density === "compact" ? minuteStep * 2 : minuteStep) minutes.push(m);
        return (
          <g fontSize={metrics.axisFontSize}>
            {bands.map((band, b) => {
              const y0 = top + b * (bandH + gap);
              const y = linearScale({ domain: [band.lo, band.hi], range: [y0 + bandH, y0] }).forward;
              const line = series
                .map((p, i) => {
                  const v = p[band.key];
                  return v === null ? null : `${i ? "L" : "M"} ${x(p.t).toFixed(1)} ${y(Math.max(band.lo, Math.min(band.hi, v))).toFixed(1)}`;
                })
                .filter(Boolean)
                .join(" ")
                .replace(/^L/, "M");
              return (
                <g key={band.key}>
                  {climbs.map((c) => (
                    <rect key={c.name + c.from} x={x(c.from)} y={y0} width={Math.max(1, x(c.to) - x(c.from))} height={bandH} fill="var(--muted)" opacity={0.7} />
                  ))}
                  {band.ticks.map((v) => (
                    <g key={v}>
                      <line x1={left} x2={left + plotWidth} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
                      <text x={left - 6} y={y(v) + 4} textAnchor="end" fill="var(--muted-foreground)">
                        {v}
                        {band.unit}
                      </text>
                    </g>
                  ))}
                  {band.reference !== undefined && (
                    <line x1={left} x2={left + plotWidth} y1={y(band.reference)} y2={y(band.reference)} stroke="var(--color-zwb-gold, var(--primary))" strokeWidth={1.25} />
                  )}
                  <text x={left} y={y0 - 6} fontWeight={600} fill="var(--foreground)">
                    {band.label}
                  </text>
                  <path d={line} fill="none" stroke={band.color} strokeWidth={metrics.strokeWidth.secondary} strokeLinejoin="round" />
                </g>
              );
            })}
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
                    ...(active.heartRate ? [{ label: "Hartslag", value: String(active.heartRate) }] : []),
                    ...(active.wbal !== null ? [{ label: "W′", value: `${active.wbal}%` }] : []),
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
