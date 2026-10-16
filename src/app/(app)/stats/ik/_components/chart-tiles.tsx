"use client";

// De grafiektegels van /stats/ik. Client-side omdat de grafiek meet en hovert;
// de pagina geeft alleen kant-en-klare reeksen mee.

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PeriodChart } from "@/components/charts/period-chart";
import type { TrainingLoadPoint } from "@/lib/training/load-points";

const nl = (value: number, digits = 0) =>
  value.toLocaleString("nl-NL", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export type VolumePoint = {
  label: string;
  title: string;
  km: number;
  hours: number;
  elevation: number;
  tss: number;
  kilojoules: number;
  rides: number;
};

const VOLUME_METRICS = [
  { key: "km", label: "Km", unit: "km", digits: 0 },
  { key: "hours", label: "Uren", unit: "u", digits: 1 },
  { key: "elevation", label: "Hm", unit: "m", digits: 0 },
  { key: "tss", label: "TSS", unit: "", digits: 0 },
  { key: "kilojoules", label: "kJ", unit: "kJ", digits: 0 },
  { key: "rides", label: "Ritten", unit: "", digits: 0 },
] as const;

type VolumeMetric = (typeof VOLUME_METRICS)[number]["key"];

export function Toggle<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<{ key: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-md border bg-background p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={value === option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            "min-h-8 rounded px-2.5 text-xs font-medium transition",
            value === option.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function VolumeChart({ points }: { points: VolumePoint[] }) {
  const [metric, setMetric] = useState<VolumeMetric>("km");
  const def = VOLUME_METRICS.find((item) => item.key === metric)!;
  return (
    <div className="space-y-3">
      <Toggle label="Grootheid" options={VOLUME_METRICS} value={metric} onChange={setMetric} />
      <PeriodChart
        ariaLabel={`${def.label} per periode`}
        labels={points.map((point) => point.label)}
        titles={points.map((point) => point.title)}
        series={[
          {
            key: metric,
            label: def.unit ? `${def.label} (${def.unit})` : def.label,
            color: "var(--chart-1)",
            kind: "bar",
            values: points.map((point) => point[metric]),
          },
        ]}
        format={(value) => (def.digits ? nl(value, Number.isInteger(value) ? 0 : def.digits) : nl(value))}
      />
    </div>
  );
}

export type PowerChartPoint = {
  label: string;
  title: string;
  bestNp: number | null;
  averageNp: number | null;
  ftp: number | null;
};

export function PowerChart({ points }: { points: PowerChartPoint[] }) {
  return (
    <PeriodChart
      ariaLabel="Vermogen per periode"
      labels={points.map((point) => point.label)}
      titles={points.map((point) => point.title)}
      zeroBased={false}
      series={[
        { key: "best", label: "Beste NP", color: "var(--chart-1)", kind: "line", values: points.map((p) => p.bestNp) },
        { key: "avg", label: "Gemiddelde NP", color: "var(--chart-2)", kind: "line", values: points.map((p) => p.averageNp) },
        { key: "ftp", label: "FTP", color: "var(--muted-foreground)", kind: "step", dashed: true, values: points.map((p) => p.ftp) },
      ]}
      format={(value) => `${nl(value)} W`}
    />
  );
}

export type EfficiencyChartPoint = { label: string; title: string; factor: number | null };

export function EfficiencyChart({ points }: { points: EfficiencyChartPoint[] }) {
  return (
    <PeriodChart
      ariaLabel="Watt per hartslag per periode"
      labels={points.map((point) => point.label)}
      titles={points.map((point) => point.title)}
      zeroBased={false}
      series={[
        { key: "ef", label: "W per slag", color: "var(--chart-1)", kind: "line", values: points.map((p) => p.factor) },
      ]}
      format={(value) => nl(value, 2)}
    />
  );
}

const MONTHS_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function dayLabel(day: string, withYear: boolean) {
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTHS_SHORT[month - 1]}${withYear ? ` ${year}` : ""}`;
}

/** Fitheid per dag; langer dan een jaar wordt per week getekend (elke zondag). */
export function FitnessChart({ points }: { points: TrainingLoadPoint[] }) {
  const thinned =
    points.length > 400 ? points.filter((_, index) => (points.length - 1 - index) % 7 === 0) : points;
  const multiYear = thinned.length > 0 && thinned[0].date.slice(0, 4) !== thinned.at(-1)!.date.slice(0, 4);
  return (
    <PeriodChart
      ariaLabel="Fitheid, vermoeidheid en vorm"
      labels={thinned.map((point) =>
        multiYear ? `${MONTHS_SHORT[Number(point.date.slice(5, 7)) - 1]} '${point.date.slice(2, 4)}` : dayLabel(point.date, false),
      )}
      titles={thinned.map((point) => dayLabel(point.date, true))}
      series={[
        { key: "ctl", label: "Fitheid (CTL)", color: "var(--chart-1)", kind: "line", values: thinned.map((p) => p.ctl) },
        { key: "atl", label: "Vermoeidheid (ATL)", color: "var(--chart-2)", kind: "line", muted: true, values: thinned.map((p) => p.atl) },
        { key: "tsb", label: "Vorm", color: "var(--chart-3)", kind: "line", muted: true, values: thinned.map((p) => p.tsb) },
      ]}
      format={(value) => nl(value)}
    />
  );
}

export type YearLineData = { year: string; weeks: Array<number | null>; total: number };

const YEAR_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function YearChart({ lines }: { lines: YearLineData[] }) {
  const weeks = lines[0]?.weeks.length ?? 0;
  // Nieuwste jaar eerst in de kleur van de eigen reeks.
  const ordered = [...lines].reverse();
  return (
    <PeriodChart
      ariaLabel="Cumulatieve kilometers per jaar"
      labels={Array.from({ length: weeks }, (_, index) => {
        const month = Math.min(11, Math.floor((index * 7) / 30.5));
        return MONTHS_SHORT[month];
      })}
      titles={Array.from({ length: weeks }, (_, index) => `week ${index + 1}`)}
      series={ordered.map((line, index) => ({
        key: line.year,
        label: line.year,
        color: YEAR_COLORS[index % YEAR_COLORS.length],
        kind: "line" as const,
        values: line.weeks,
      }))}
      format={(value) => `${nl(value)}`}
    />
  );
}
