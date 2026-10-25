// De cijfers van een afgeronde training, in één weergave. Het lid ziet dit in
// het bevestigscherm, de trainer in de beoordelingsrij — bewust hetzelfde
// component, zodat ze het over precies dezelfde weergave hebben.
//
// Geen hooks en geen server-only code, zodat zowel het client-dialoogvenster als
// de server-gerenderde trainerrij dit kan gebruiken.

import type { ReactNode } from "react";
import { Power, PowerText } from "@/components/power-unit";
import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
import { COMPLIANCE_LABELS, COMPLIANCE_PILLS } from "@/lib/training/compliance";
import { complianceBreakdown, type ComplianceBreakdown } from "@/lib/training/compliance-breakdown";
import {
  detectIntensityFromLoad,
  INTENSITY_COLORS,
  intensityLabel,
  ZWIFT_ZONES,
  type WorkoutBlock,
} from "@/lib/training/workouts";
import { ZWB_LEVEL_META } from "@/lib/training/zwbeterworden";

const PILL = "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium";

function nl(value: number | null | undefined, digits = 0) {
  if (value == null) return "-";
  return value.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * De zone waarin feitelijk is gereden, afgeleid uit TSS per uur. Bewust niet in
 * de snapshot opgeslagen: het volgt deterministisch uit tss + movingMinutes, dus
 * zo werkt het ook voor rapportages van vóór deze weergave.
 */
export function detectedZone(metrics: WorkoutMetricsSnapshot) {
  return detectIntensityFromLoad(metrics.tss, metrics.movingMinutes);
}

export function complianceLabel(metrics: WorkoutMetricsSnapshot) {
  const verdict = COMPLIANCE_LABELS[metrics.verdict];
  if (metrics.loadPct == null) return verdict;
  return `${verdict} · ${metrics.loadPct}% van gepland`;
}

/** "26 · niveau 2 – RICHT OP HERSTEL", zodat de score zichzelf duidt. */
function readinessLabel(metrics: WorkoutMetricsSnapshot) {
  if (metrics.readinessScore == null) return "-";
  if (!metrics.readinessLevel) return `${metrics.readinessScore}`;
  const suffix = metrics.readinessTitle
    ? `niveau ${metrics.readinessLevel} – ${metrics.readinessTitle}`
    : `niveau ${metrics.readinessLevel}`;
  return `${metrics.readinessScore} · ${suffix}`;
}

/** Kleuren volgen de gereedscore-schaal; 0 of onbekend blijft neutraal. */
function readinessPill(level: number | null) {
  if (level && level >= 1 && level <= 5) {
    return ZWB_LEVEL_META[level as 1 | 2 | 3 | 4 | 5].pill;
  }
  return "bg-muted text-muted-foreground";
}

function ctlLabel(metrics: WorkoutMetricsSnapshot) {
  const { ctlBefore, ctlAfter } = metrics;
  if (ctlBefore == null && ctlAfter == null) return "-";
  if (ctlBefore == null || ctlAfter == null) return nl(ctlAfter ?? ctlBefore, 1);
  const delta = ctlAfter - ctlBefore;
  const sign = delta > 0 ? "+" : "";
  return `${nl(ctlBefore, 1)} → ${nl(ctlAfter, 1)} (${sign}${nl(delta, 1)})`;
}

/** Zonder meter komt de TSS uit hartslag; pas zonder allebei blijven TSS en IF leeg. */
function powerNote(metrics: WorkoutMetricsSnapshot) {
  if (metrics.hasPowerMeter || metrics.tss != null || metrics.movingMinutes == null) return null;
  return "Zonder vermogensmeter zijn TSS en IF niet te bepalen.";
}

/** Eén cijfer in het rooster; ook gebruikt voor de cijfers van een losse rit. */
export function MetricStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md bg-muted/50 p-3 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm tabular-nums">{value}</span>
    </div>
  );
}

/** Naleving en de gereden zone, als gekleurde pillen. */
export function WorkoutVerdictPills({
  metrics,
  className = "",
}: {
  metrics: WorkoutMetricsSnapshot;
  className?: string;
}) {
  const zone = detectedZone(metrics);
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className={`${PILL} ${COMPLIANCE_PILLS[metrics.verdict]}`}>
        {complianceLabel(metrics)}
      </span>
      {zone ? (
        <span className={`${PILL} border`}>
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: INTENSITY_COLORS[zone] }}
          />
          Gereden in {intensityLabel(zone).toLowerCase()}
        </span>
      ) : null}
    </div>
  );
}

function pctLabel(pct: number | null) {
  return pct == null ? "" : `${pct}%`;
}

function rpeLabel(rpe: ComplianceBreakdown["rpe"]["expected"]) {
  if (!rpe) return "-";
  return rpe.low === rpe.high ? `${rpe.low}` : `${rpe.low}-${rpe.high}`;
}

/** Gepland tegenover gereden per onderdeel; het TSS-percentage is dat van de pil. */
function ComplianceTable({ breakdown }: { breakdown: ComplianceBreakdown }) {
  const { duration, load, intensity, rpe } = breakdown;
  const minutes = (value: number | null) => (value == null ? "-" : `${value} min`);
  const rows: Array<{ label: string; planned: string; actual: string; pct: string }> = [
    { label: "Duur", planned: minutes(duration.planned), actual: minutes(duration.actual), pct: pctLabel(duration.pct) },
    { label: "TSS", planned: nl(load.planned), actual: nl(load.actual), pct: pctLabel(load.pct) },
    { label: "IF", planned: nl(intensity.planned, 2), actual: nl(intensity.actual, 2), pct: pctLabel(intensity.pct) },
  ];
  if (rpe.expected || rpe.actual != null) {
    rows.push({ label: "RPE", planned: rpeLabel(rpe.expected), actual: nl(rpe.actual), pct: "" });
  }
  return (
    <table className="w-full text-sm tabular-nums" aria-label="Naleving">
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th className="pb-1 text-left font-normal" />
          <th className="pb-1 text-right font-normal">Gepland</th>
          <th className="pb-1 text-right font-normal">Gereden</th>
          <th className="w-14 pb-1 text-right font-normal" />
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((row) => (
          <tr key={row.label}>
            <td className="py-1.5 text-xs text-muted-foreground">{row.label}</td>
            <td className="py-1.5 text-right">{row.planned}</td>
            <td className="py-1.5 text-right">{row.actual}</td>
            <td className="py-1.5 text-right font-medium">{row.pct}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Gemeten minuten per Zwift-zone, met de geplande minuten en het percentage
 * ernaast als de opbouw bekend is. De balk is relatief aan de langste zone,
 * gemeten of gepland.
 */
function ZoneTimesPanel({
  metrics,
  zones,
}: {
  metrics: WorkoutMetricsSnapshot;
  zones: ComplianceBreakdown["zones"];
}) {
  const zoneTimes = metrics.zoneTimes;
  if (!zoneTimes) return null;
  if (zoneTimes.source === "none") {
    return <p className="text-xs text-muted-foreground">Geen zonedata</p>;
  }
  // Zonder geplande opbouw alleen de gemeten kant.
  const rows =
    zones?.rows ??
    ZWIFT_ZONES.flatMap((zone, index) => {
      const riddenSeconds = zoneTimes.seconds[index] ?? 0;
      return riddenSeconds < 30 ? [] : [{ zone: zone.zone, riddenSeconds, plannedSeconds: 0, pct: null }];
    });
  const max = Math.max(1, ...rows.map((row) => Math.max(row.riddenSeconds, row.plannedSeconds)));
  const minutes = (seconds: number) => Math.round(seconds / 60);

  return (
    <div className="space-y-1.5" aria-label="Tijd per zone">
      {zones?.match != null ? (
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>Zones</span>
          <span className="tabular-nums">
            Verdeling <span className="font-medium text-foreground">{zones.match}%</span>
          </span>
        </div>
      ) : null}
      {rows.map((row) => {
        const zone = ZWIFT_ZONES[row.zone - 1];
        return (
          <div key={row.zone} className="flex items-center gap-2 text-xs">
            <span className="w-6 shrink-0 font-medium tabular-nums">Z{row.zone}</span>
            <div className="relative h-3 flex-1 overflow-hidden rounded bg-muted">
              {zones ? (
                <span
                  className="absolute inset-y-0 left-0 border-r-2 border-foreground/40"
                  style={{ width: `${(row.plannedSeconds / max) * 100}%` }}
                />
              ) : null}
              <span
                className="absolute inset-y-0 left-0 rounded"
                style={{ width: `${(row.riddenSeconds / max) * 100}%`, backgroundColor: zone.color }}
              />
            </div>
            <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
              {minutes(row.riddenSeconds)} min{zones ? ` / ${minutes(row.plannedSeconds)}` : ""}
            </span>
            {zones ? (
              <span className="w-10 shrink-0 text-right font-medium tabular-nums">{pctLabel(row.pct)}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function WorkoutMetricsPanel({
  metrics,
  description,
  blocks,
  ftpWatts,
  rpe,
}: {
  metrics: WorkoutMetricsSnapshot;
  description?: string | null;
  /** De geplande opbouw, voor de geplande minuten per zone en de verwachte RPE. */
  blocks?: WorkoutBlock[];
  ftpWatts?: number | null;
  /** De RPE die het lid invulde. */
  rpe?: number | null;
}) {
  const note = powerNote(metrics);
  const breakdown = complianceBreakdown({ metrics, blocks, ftpWatts, rpe });
  return (
    <div className="space-y-3">
      <WorkoutVerdictPills metrics={metrics} />
      <ComplianceTable breakdown={breakdown} />
      <ZoneTimesPanel metrics={metrics} zones={breakdown.zones} />

      <div className="grid grid-cols-3 gap-2">
        <MetricStat
          label="Gem. HR"
          value={metrics.averageHr == null ? "-" : `${nl(metrics.averageHr)} bpm`}
        />
        <MetricStat
          label="Gem. vermogen"
          value={<Power watts={metrics.averageWatts} weightKg={metrics.weightKg} />}
        />
        <MetricStat
          label="NP"
          value={<Power watts={metrics.normalizedWatts} weightKg={metrics.weightKg} />}
        />
      </div>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}

      <details className="rounded-md border bg-background/60 p-3">
        <summary className="cursor-pointer text-sm font-medium">Meer details</summary>
        <div className="mt-2 divide-y">
          {description ? <DetailRow label="Doel" value={description} /> : null}
          <DetailRow
            label="Target"
            value={
              metrics.targetSummary ? (
                <PowerText text={metrics.targetSummary} weightKg={metrics.weightKg} ftpWatts={ftpWatts} />
              ) : (
                "-"
              )
            }
          />
          <DetailRow
            label="Gem. cadans"
            value={metrics.averageCadence == null ? "-" : `${nl(metrics.averageCadence)} rpm`}
          />
          <DetailRow
            label="Max. HR"
            value={metrics.maxHr == null ? "-" : `${nl(metrics.maxHr)} bpm`}
          />
          <DetailRow label="CTL" value={ctlLabel(metrics)} />
          <DetailRow
            label="Gereedscore"
            value={
              metrics.readinessScore == null ? (
                "-"
              ) : (
                <span className={`${PILL} ${readinessPill(metrics.readinessLevel)}`}>
                  {readinessLabel(metrics)}
                </span>
              )
            }
          />
        </div>
      </details>
    </div>
  );
}
