"use client";

// Grafieken uit de intervals-activiteiten (zones, W′bal, duurvermogen) en de
// herstelwaarden.

import { useState } from "react";
import { PeriodChart } from "@/components/charts/period-chart";
import { Toggle } from "./chart-tiles";

const nl = (value: number, digits = 0) =>
  value.toLocaleString("nl-NL", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** De zonekleuren van de workoutblokken, met paars voor een zevende zone. */
const ZONE_COLORS = ["#7f7f7f", "#338cff", "#59bf59", "#ffcc3f", "#ff6639", "#ff330c", "#a03cc8"];

export type ZoneChartPoint = { label: string; title: string; hours: number[] };

export function ZonesChart({ points, zoneIds, ariaLabel }: { points: ZoneChartPoint[]; zoneIds: string[]; ariaLabel: string }) {
  const [mode, setMode] = useState<"uren" | "pct">("uren");
  const valueAt = (point: ZoneChartPoint, index: number) => {
    if (mode === "uren") return point.hours[index] ?? 0;
    const total = point.hours.reduce((sum, value) => sum + value, 0);
    return total > 0 ? Math.round(((point.hours[index] ?? 0) / total) * 1000) / 10 : 0;
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
        series={zoneIds.map((id, index) => ({
          key: id,
          label: id,
          color: ZONE_COLORS[Math.min(index, ZONE_COLORS.length - 1)],
          kind: "bar" as const,
          values: points.map((point) => valueAt(point, index)),
        }))}
        format={(value) => (mode === "pct" ? `${nl(value)}%` : nl(value, Number.isInteger(value) ? 0 : 1))}
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
      series={[
        { key: "above", label: "kJ boven FTP", color: "var(--chart-2)", kind: "bar", values: points.map((p) => p.joulesAboveFtpKj) },
        { key: "wbal", label: "Diepste W′bal", color: "var(--chart-1)", kind: "line", axis: "right", values: points.map((p) => p.maxWbalDepletionKj) },
      ]}
      format={(value) => nl(value)}
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
      series={[
        { key: "dec", label: "Decoupling", color: "var(--chart-1)", kind: "line", values: points.map((p) => p.decoupling) },
        { key: "ef", label: "EF", color: "var(--chart-2)", kind: "line", axis: "right", values: points.map((p) => p.efficiencyFactor) },
      ]}
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

const RECOVERY_METRICS = [
  { key: "restingHr", label: "Rust-HR", unit: "bpm", digits: 0 },
  { key: "hrv", label: "HRV", unit: "ms", digits: 0 },
  { key: "sleepHours", label: "Slaap", unit: "u", digits: 1 },
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
        series={[{ key: metric, label: def.label, color: "var(--chart-1)", kind: "line", values: points.map((p) => p[metric]) }]}
        format={(value) => `${nl(value, def.digits)} ${def.unit}`}
      />
    </div>
  );
}
