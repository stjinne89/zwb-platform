"use client";

// De grafiektegels van /stats/ik. Client-side omdat de grafiek meet en de
// aanwijzer volgt; de pagina geeft alleen kant-en-klare reeksen mee.
//
// Kleuren komen uit .st-page (globals.css): de hoofdkleur voor je eigen reeks,
// goud voor de periode waar je naar kijkt en je beste punt, grijs voor de
// vergelijking.

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PeriodChart } from "@/components/charts/period-chart";
import type { TrainingLoadPoint } from "@/lib/training/load-points";

export const MAIN = "var(--st-main)";
export const SECOND = "var(--st-second)";
export const SOFT = "var(--st-soft)";

export const nl = (value: number, digits = 0) =>
  value.toLocaleString("nl-NL", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** "▲ 12% t.o.v. vorig jaar", of niets als er vorig jaar niets was. */
export function Delta({ now, before, label = "t.o.v. vorig jaar" }: { now: number | null; before: number | null; label?: string }) {
  if (now == null || before == null || before <= 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return (
    <span className={cn("tabular-nums", pct >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}% {label}
    </span>
  );
}

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
            "min-h-9 rounded px-3 text-sm font-medium transition",
            value === option.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const VOLUME_METRICS = [
  { key: "km", label: "Km", unit: "km", digits: 0 },
  { key: "hours", label: "Uren", unit: "u", digits: 1 },
  { key: "elevation", label: "Hm", unit: "m", digits: 0 },
  { key: "tss", label: "TSS", unit: "", digits: 0 },
  { key: "kilojoules", label: "kJ", unit: "kJ", digits: 0 },
  { key: "rides", label: "Ritten", unit: "", digits: 0 },
  { key: "members", label: "Leden", unit: "", digits: 0 },
] as const;

export type VolumeMetric = (typeof VOLUME_METRICS)[number]["key"];
type VolumeValues = Partial<Record<VolumeMetric, number>>;

export type VolumePoint = VolumeValues & {
  label: string;
  title: string;
  /** Dezelfde periode een jaar eerder. */
  previous: VolumeValues | null;
};

const PERSONAL_METRICS: VolumeMetric[] = ["km", "hours", "elevation", "tss", "kilojoules", "rides"];

export function VolumeChart({
  points,
  openEnd,
  metrics = PERSONAL_METRICS,
  selectedIndex = null,
}: {
  points: VolumePoint[];
  openEnd: boolean;
  /** Welke grootheden de schakelaar biedt; de eerste is de standaard. */
  metrics?: VolumeMetric[];
  selectedIndex?: number | null;
}) {
  const options = VOLUME_METRICS.filter((item) => metrics.includes(item.key));
  const [metric, setMetric] = useState<VolumeMetric>(metrics[0] ?? "km");
  const def = VOLUME_METRICS.find((item) => item.key === metric)!;
  const values = points.map((point) => point[metric] ?? 0);
  // Het gemiddelde over afgesloten periodes; de lopende periode zou het drukken.
  const closed = (openEnd ? values.slice(0, -1) : values).filter((value) => value > 0);
  const average = closed.length > 1 ? closed.reduce((a, b) => a + b, 0) / closed.length : null;
  const digitsFor = (value: number) => (def.digits && !Number.isInteger(value) ? def.digits : 0);
  const fmt = (value: number) => (def.unit ? `${nl(value, digitsFor(value))} ${def.unit}` : nl(value, digitsFor(value)));
  const hasPrevious = points.some((point) => (point.previous?.[metric] ?? 0) > 0);
  return (
    <div className="space-y-3">
      <Toggle label="Grootheid" options={options} value={metric} onChange={setMetric} />
      <PeriodChart
        ariaLabel={`${def.label} per periode`}
        labels={points.map((point) => point.label)}
        titles={points.map((point, index) => `${point.title}${openEnd && index === points.length - 1 ? " · loopt nog" : ""}`)}
        series={[{ key: metric, label: def.label, color: MAIN, kind: "bar", values }]}
        format={(value) => nl(value, digitsFor(value))}
        readout={{
          series: metric,
          note: (index) => <Delta now={points[index][metric] ?? null} before={points[index].previous?.[metric] ?? null} />,
        }}
        openEnd={openEnd}
        selectedIndex={selectedIndex}
        reference={average != null ? { value: average, label: `gem. ${fmt(average)}` } : null}
        ghost={hasPrevious ? { label: "Vorig jaar", values: points.map((point) => point.previous?.[metric] ?? null) } : null}
        heightOptions={{ compact: 0.78, comfortable: 0.32, min: 230, max: 380 }}
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
  rides: number;
};

export function PowerChart({ points }: { points: PowerChartPoint[] }) {
  return (
    <PeriodChart
      ariaLabel="Vermogen per periode"
      labels={points.map((point) => point.label)}
      titles={points.map((point) => point.title)}
      zeroBased={false}
      readout={{
        series: "best",
        note: (index) => (points[index].rides ? <span>{points[index].rides} ritten met meter</span> : null),
      }}
      series={[
        { key: "best", label: "Beste NP", color: MAIN, kind: "line", area: true, peak: true, values: points.map((p) => p.bestNp) },
        { key: "avg", label: "Gem. NP", color: SECOND, kind: "line", muted: true, values: points.map((p) => p.averageNp) },
        { key: "ftp", label: "FTP", color: SOFT, kind: "step", dashed: true, values: points.map((p) => p.ftp) },
      ]}
      format={(value) => `${nl(value)} W`}
    />
  );
}

export type EfficiencyChartPoint = { label: string; title: string; factor: number | null; rides: number };

export function EfficiencyChart({ points }: { points: EfficiencyChartPoint[] }) {
  return (
    <PeriodChart
      ariaLabel="Watt per hartslag per periode"
      labels={points.map((point) => point.label)}
      titles={points.map((point) => point.title)}
      zeroBased={false}
      readout={{
        series: "ef",
        note: (index) => (points[index].rides ? <span>W per slag · {points[index].rides} ritten</span> : null),
      }}
      series={[
        { key: "ef", label: "W per slag", color: MAIN, kind: "line", area: true, peak: true, values: points.map((p) => p.factor) },
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
      readout={{ series: "ctl" }}
      series={[
        { key: "ctl", label: "Fitheid", color: MAIN, kind: "line", area: true, peak: true, values: thinned.map((p) => p.ctl) },
        { key: "atl", label: "Vermoeidheid", color: SECOND, kind: "line", muted: true, values: thinned.map((p) => p.atl) },
        { key: "tsb", label: "Vorm", color: "var(--st-hi)", kind: "line", muted: true, values: thinned.map((p) => p.tsb) },
      ]}
      format={(value) => nl(value)}
    />
  );
}

export type YearLineData = { year: string; weeks: Array<number | null>; total: number };

export function YearChart({ lines }: { lines: YearLineData[] }) {
  const weeks = lines[0]?.weeks.length ?? 0;
  // Dit jaar in de hoofdkleur met een vlak, vorig jaar in de tweede kleur, de
  // jaren daarvoor grijs.
  const ordered = [...lines].reverse();
  const current = ordered[0];
  const previous = ordered[1];
  return (
    <PeriodChart
      ariaLabel="Cumulatieve kilometers per jaar"
      labels={Array.from({ length: weeks }, (_, index) => MONTHS_SHORT[Math.min(11, Math.floor((index * 7) / 30.5))])}
      titles={Array.from({ length: weeks }, (_, index) => `${current.year}, week ${index + 1}`)}
      readout={{
        series: current.year,
        note: (index) => {
          const now = current.weeks[index];
          const then = previous?.weeks[index];
          if (now == null || then == null || !previous) return null;
          const diff = now - then;
          return (
            <span className={cn("tabular-nums", diff >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
              {diff >= 0 ? "▲" : "▼"} {nl(Math.abs(diff))} km {diff >= 0 ? "voor op" : "achter op"} {previous.year}
            </span>
          );
        },
      }}
      series={ordered.map((line, index) => ({
        key: line.year,
        label: line.year,
        color: index === 0 ? MAIN : index === 1 ? SECOND : SOFT,
        kind: "line" as const,
        area: index === 0,
        muted: index > 1,
        values: line.weeks,
      }))}
      format={(value) => `${nl(value)} km`}
    />
  );
}

// ── Intervals-tegels ──────────────────────────────────────────────────────

const PEAK_LABELS = ["5 s", "1 min", "5 min", "20 min"] as const;

export type PeakChartPoint = {
  label: string;
  title: string;
  watts: Array<number | null>;
  wattsPerKg: Array<number | null>;
};

type PowerUnitChoice = "w" | "wkg";

const UNIT_OPTIONS = [
  { key: "w", label: "Watt" },
  { key: "wkg", label: "W/kg" },
] as const;

/** Beste vermogen per duur per periode; één duur tegelijk, anders drukt de sprint alles plat. */
export function PeakChart({ points }: { points: PeakChartPoint[] }) {
  const [duration, setDuration] = useState("3");
  const [unit, setUnit] = useState<PowerUnitChoice>("w");
  const index = Number(duration);
  const hasWkg = points.some((point) => point.wattsPerKg.some((value) => value != null));
  const values = points.map((point) => (unit === "wkg" ? point.wattsPerKg[index] : point.watts[index]));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Toggle
          label="Duur"
          options={PEAK_LABELS.map((label, i) => ({ key: String(i), label }))}
          value={duration}
          onChange={setDuration}
        />
        {hasWkg && <Toggle label="Eenheid" options={UNIT_OPTIONS} value={unit} onChange={setUnit} />}
      </div>
      <PeriodChart
        ariaLabel={`Beste ${PEAK_LABELS[index]} per periode`}
        labels={points.map((point) => point.label)}
        titles={points.map((point) => point.title)}
        zeroBased={false}
        readout={{ series: "peak", note: () => <span>beste {PEAK_LABELS[index]}</span> }}
        series={[{ key: "peak", label: `Beste ${PEAK_LABELS[index]}`, color: MAIN, kind: "line", area: true, peak: true, values }]}
        format={(value) => (unit === "wkg" ? `${nl(value, 1)} W/kg` : `${nl(value)} W`)}
      />
    </div>
  );
}

export type CpChartPoint = { label: string; title: string; cpWatts: number | null; wPrimeKj: number | null };

export function CpChart({ points }: { points: CpChartPoint[] }) {
  return (
    <PeriodChart
      ariaLabel="CP en W′ per periode"
      labels={points.map((point) => point.label)}
      titles={points.map((point) => point.title)}
      zeroBased={false}
      readout={{ series: "cp", note: () => <span>kritisch vermogen</span> }}
      series={[
        { key: "cp", label: "CP", color: MAIN, kind: "line", area: true, peak: true, values: points.map((p) => p.cpWatts) },
        { key: "wp", label: "W′", color: SECOND, kind: "line", axis: "right", values: points.map((p) => p.wPrimeKj) },
      ]}
      format={(value) => `${nl(value)} W`}
      formatRight={(value) => `${nl(value, 1)} kJ`}
    />
  );
}

export type EftpChartPoint = { label: string; title: string; eftp: number | null; weightKg: number | null; wkg: number | null };

export function EftpChart({ points }: { points: EftpChartPoint[] }) {
  const [unit, setUnit] = useState<PowerUnitChoice>("w");
  const hasWkg = points.some((point) => point.wkg != null);
  return (
    <div className="space-y-3">
      {hasWkg && <Toggle label="Eenheid" options={UNIT_OPTIONS} value={unit} onChange={setUnit} />}
      <PeriodChart
        ariaLabel="eFTP en gewicht per periode"
        labels={points.map((point) => point.label)}
        titles={points.map((point) => point.title)}
        zeroBased={false}
        readout={{ series: "eftp", note: () => <span>eFTP</span> }}
        series={[
          {
            key: "eftp",
            label: unit === "wkg" ? "eFTP (W/kg)" : "eFTP",
            color: MAIN,
            kind: "line",
            area: true,
            peak: true,
            values: points.map((p) => (unit === "wkg" ? p.wkg : p.eftp)),
          },
          { key: "kg", label: "Gewicht", color: SECOND, kind: "line", axis: "right", values: points.map((p) => p.weightKg) },
        ]}
        format={(value) => (unit === "wkg" ? `${nl(value, 2)} W/kg` : `${nl(value)} W`)}
        formatRight={(value) => `${nl(value, 1)} kg`}
      />
    </div>
  );
}
