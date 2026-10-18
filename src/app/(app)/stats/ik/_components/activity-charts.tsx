"use client";

// Grafieken uit de intervals-activiteiten (zones, W′bal, duurvermogen) en de
// herstelwaarden.

import { useState } from "react";
import { PeriodChart } from "@/components/charts/period-chart";
import { MAIN, SECOND, Toggle, nl } from "./chart-tiles";

/** De zonekleuren van de workoutblokken, met paars voor een zevende zone. */
const ZONE_COLORS = ["#7f7f7f", "#338cff", "#59bf59", "#ffcc3f", "#ff6639", "#ff330c", "#a03cc8"];

export type ZoneChartPoint = { label: string; title: string; hours: number[] };

export function ZonesChart({ points, zoneIds, ariaLabel }: { points: ZoneChartPoint[]; zoneIds: string[]; ariaLabel: string }) {
  const [mode, setMode] = useState<"uren" | "pct">("uren");
  const total = (point: ZoneChartPoint) => point.hours.reduce((sum, value) => sum + value, 0);
  const valueAt = (point: ZoneChartPoint, index: number) => {
    if (mode === "uren") return point.hours[index] ?? 0;
    const sum = total(point);
    return sum > 0 ? Math.round(((point.hours[index] ?? 0) / sum) * 1000) / 10 : 0;
  };
  // Het deel boven de drempel: alles vanaf de vierde zone.
  const hardShare = (point: ZoneChartPoint) => {
    const sum = total(point);
    return sum > 0 ? Math.round((point.hours.slice(3).reduce((a, b) => a + b, 0) / sum) * 100) : null;
  };
  return (
    <div className="space-y-3">
      <Toggle
        label="Weergave"
        options={[
          { key: "uren", label: "Uren" },
          { key: "pct", label: "%" },
        ]}
        value={mode}
        onChange={(value) => setMode(value as "uren" | "pct")}
      />
      <PeriodChart
        ariaLabel={ariaLabel}
        labels={points.map((point) => point.label)}
        titles={points.map((point) => point.title)}
        readout={{
          series: zoneIds[0] ?? "",
          value: (index) => (total(points[index]) > 0 ? Math.round(total(points[index]) * 10) / 10 : null),
          // Het grote cijfer is altijd de totale tijd, ook als de as in % staat.
          format: (value) => `${nl(value, Number.isInteger(value) ? 0 : 1)} u`,
          note: (index) => {
            const share = hardShare(points[index]);
            return share == null ? null : <span className="tabular-nums">{share}% vanaf {zoneIds[3] ?? "Z4"}</span>;
          },
        }}
        series={zoneIds.map((id, index) => ({
          key: id,
          label: id,
          color: ZONE_COLORS[Math.min(index, ZONE_COLORS.length - 1)],
          kind: "bar" as const,
          values: points.map((point) => valueAt(point, index)),
        }))}
        format={(value) => (mode === "pct" ? `${nl(value)}%` : `${nl(value, Number.isInteger(value) ? 0 : 1)} u`)}
      />
    </div>
  );
}

export type WbalChartPoint = { label: string; title: string; maxWbalDepletionKj: number | null; joulesAboveFtpKj: number };

export function WbalChart({ points }: { points: WbalChartPoint[] }) {
  return (
    <PeriodChart
      ariaLabel="W′bal-uitputting en arbeid boven FTP per periode"
      labels={points.map((point) => point.label)}
      titles={points.map((point) => point.title)}
      readout={{ series: "wbal", note: () => <span>diepste W′bal in één rit</span> }}
      series={[
        { key: "above", label: "Boven FTP", color: SECOND, kind: "bar", values: points.map((p) => p.joulesAboveFtpKj) },
        { key: "wbal", label: "Diepste W′bal", color: MAIN, kind: "line", axis: "right", peak: true, values: points.map((p) => p.maxWbalDepletionKj) },
      ]}
      format={(value) => `${nl(value)} kJ`}
      formatRight={(value) => `${nl(value, 1)} kJ`}
    />
  );
}

export type EnduranceChartPoint = { label: string; title: string; decoupling: number | null; efficiencyFactor: number | null };

export function EnduranceChart({ points }: { points: EnduranceChartPoint[] }) {
  return (
    <PeriodChart
      ariaLabel="Decoupling en efficiency factor per periode"
      labels={points.map((point) => point.label)}
      titles={points.map((point) => point.title)}
      zeroBased={false}
      readout={{ series: "dec", note: () => <span>decoupling, lager is beter</span> }}
      series={[
        { key: "dec", label: "Decoupling", color: MAIN, kind: "line", area: true, values: points.map((p) => p.decoupling) },
        { key: "ef", label: "EF", color: SECOND, kind: "line", axis: "right", muted: true, values: points.map((p) => p.efficiencyFactor) },
      ]}
      minSpan={6}
      minSpanRight={0.3}
      format={(value) => `${nl(value, 1)}%`}
      formatRight={(value) => nl(value, 2)}
    />
  );
}

export type RecoveryChartPoint = {
  label: string;
  title: string;
  restingHr: number | null;
  hrv: number | null;
  sleepHours: number | null;
};

// minSpan: een verschil van twee slagen of een half uur slaap mag niet de hele
// hoogte van de grafiek vullen.
const RECOVERY_METRICS = [
  { key: "restingHr", label: "Rust-HR", unit: "bpm", digits: 0, minSpan: 10 },
  { key: "hrv", label: "HRV", unit: "ms", digits: 0, minSpan: 20 },
  { key: "sleepHours", label: "Slaap", unit: "u", digits: 1, minSpan: 2 },
] as const;

type RecoveryMetric = (typeof RECOVERY_METRICS)[number]["key"];

export function RecoveryChart({ points }: { points: RecoveryChartPoint[] }) {
  const available = RECOVERY_METRICS.filter((metric) => points.some((point) => point[metric.key] != null));
  const [metric, setMetric] = useState<RecoveryMetric>(available[0]?.key ?? "restingHr");
  const def = RECOVERY_METRICS.find((item) => item.key === metric)!;
  return (
    <div className="space-y-3">
      {available.length > 1 && <Toggle label="Meting" options={available} value={metric} onChange={setMetric} />}
      <PeriodChart
        ariaLabel={`${def.label} per periode`}
        labels={points.map((point) => point.label)}
        titles={points.map((point) => point.title)}
        zeroBased={false}
        readout={{ series: metric }}
        series={[
          {
            key: metric,
            label: def.label,
            color: MAIN,
            kind: "line",
            area: true,
            // Hele slagen en milliseconden, zoals het cijfer erboven; dan ook een as
            // in hele getallen.
            values: points.map((p) => (p[metric] == null ? null : def.digits === 0 ? Math.round(p[metric]) : p[metric])),
          },
        ]}
        format={(value) => `${nl(value, def.digits)} ${def.unit}`}
        minSpan={def.minSpan}
      />
    </div>
  );
}
