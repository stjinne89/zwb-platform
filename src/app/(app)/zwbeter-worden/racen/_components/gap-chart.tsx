"use client";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { ResponsiveChart, useChartPointer } from "@/components/charts/responsive-chart";
import { linearScale, niceStep } from "@/lib/charts/scale";
import { signedSeconds } from "@/lib/zrl-analysis/format";

export type GapPoint = { name: string; ahead: number; climb: boolean };

/** Voorsprong op de tegenstander per tussenpunt; boven nul ligt de eigen ploeg voor. */
export function GapChart({ points, rival }: { points: GapPoint[]; rival: string }) {
  const all = [{ name: "Start", ahead: 0, climb: false }, ...points];
  const pointer = useChartPointer(all.length);
  const values = all.map((p) => p.ahead / 1000);
  const step = niceStep(Math.max(1, (Math.max(...values) - Math.min(...values)) / 4));
  const lo = Math.min(0, Math.floor(Math.min(...values) / step) * step);
  const hi = Math.max(step, Math.ceil(Math.max(...values) / step) * step);
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10);

  return (
    <ResponsiveChart
      ariaLabel={`Voorsprong op ${rival} bij elk tussenpunt: ${points.map((p) => `${p.name} ${signedSeconds(p.ahead)}`).join(", ")}.`}
      heightOptions={{ compact: 0.7, comfortable: 0.32, min: 200, max: 320 }}
      onPointerRatio={pointer.onPointerRatio}
    >
      {({ width, metrics, plotWidth, plotHeight }) => {
        const { left, top } = metrics.margin;
        const x = linearScale({ domain: [0, all.length - 1], range: [left, left + plotWidth] }).forward;
        const y = linearScale({ domain: [lo, hi], range: [top + plotHeight, top] }).forward;
        const path = all.map((p, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(p.ahead / 1000).toFixed(1)}`).join(" ");
        const active = pointer.index === null ? null : all[pointer.index];
        return (
          <g fontSize={metrics.axisFontSize}>
            {ticks.map((v) => (
              <g key={v}>
                <line x1={left} x2={left + plotWidth} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--muted-foreground)" : "var(--border)"} strokeWidth={1} />
                <text x={left - 8} y={y(v) + 4} textAnchor="end" fill="var(--muted-foreground)">
                  {(v > 0 ? "+" : v < 0 ? "−" : "") + String(Math.abs(v)).replace(".", ",")}
                </text>
              </g>
            ))}
            {all.map((p, i) => (
              <text key={p.name + i} x={x(i)} y={top + plotHeight + 20} textAnchor={i === 0 ? "start" : i === all.length - 1 ? "end" : "middle"} fill="var(--muted-foreground)">
                {metrics.density === "compact" && i > 0 && i < all.length - 1 ? "" : shortName(p.name)}
              </text>
            ))}
            <path d={`${path} L ${x(all.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`} fill="var(--chart-1)" fillOpacity={0.1} />
            <path d={path} fill="none" stroke="var(--chart-1)" strokeWidth={metrics.strokeWidth.primary} strokeLinejoin="round" strokeLinecap="round" />
            {all.slice(1).map((p, i) => (
              <circle key={p.name + i} cx={x(i + 1)} cy={y(p.ahead / 1000)} r={metrics.dotRadius + 1} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2} />
            ))}
            <text x={x(all.length - 1)} y={y(values[values.length - 1]) - 10} textAnchor="end" fontWeight={600} fill="var(--foreground)">
              {signedSeconds(all[all.length - 1].ahead)}
            </text>
            {active && pointer.index !== null && pointer.index > 0 && (
              <ChartTooltip
                x={x(pointer.index)}
                y={top}
                chartWidth={width}
                title={active.name}
                rows={[{ label: `t.o.v. ${rival}`, value: signedSeconds(active.ahead) }]}
              />
            )}
          </g>
        );
      }}
    </ResponsiveChart>
  );
}

function shortName(name: string) {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name;
}
