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
import {
  detectIntensityFromLoad,
  INTENSITY_COLORS,
  intensityLabel,
  ZWIFT_ZONES,
  type WorkoutBlock,
} from "@/lib/training/workouts";
import { plannedZoneSeconds } from "@/lib/training/zone-times";
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

/** TSS en IF leunen op genormaliseerd vermogen; zonder meter blijven ze leeg. */
function powerNote(metrics: WorkoutMetricsSnapshot) {
  if (metrics.hasPowerMeter || metrics.movingMinutes == null) return null;
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

/**
 * Gemeten minuten per Zwift-zone, met de geplande minuten ernaast als de opbouw
 * bekend is. De balk is relatief aan de langste zone, gemeten of gepland.
 */
function ZoneTimesPanel({
  metrics,
  blocks,
  ftpWatts,
}: {
  metrics: WorkoutMetricsSnapshot;
  blocks?: WorkoutBlock[];
  ftpWatts?: number | null;
}) {
  const zoneTimes = metrics.zoneTimes;
  if (!zoneTimes) return null;
  if (zoneTimes.source === "none") {
    return <p className="text-xs text-muted-foreground">Geen zonedata</p>;
  }
  const planned = blocks?.length
    ? plannedZoneSeconds(blocks, ftpWatts ?? zoneTimes.ftpWatts)
    : null;
  const max = Math.max(1, ...zoneTimes.seconds, ...(planned ?? []));
  const minutes = (seconds: number) => Math.round(seconds / 60);

  return (
    <div className="space-y-1.5" aria-label="Tijd per zone">
      {ZWIFT_ZONES.map((zone, index) => {
        const ridden = zoneTimes.seconds[index] ?? 0;
        const plan = planned?.[index] ?? 0;
        if (ridden < 30 && plan < 30) return null;
        return (
          <div key={zone.zone} className="flex items-center gap-2 text-xs">
            <span className="w-6 shrink-0 font-medium tabular-nums">Z{zone.zone}</span>
            <div className="relative h-3 flex-1 overflow-hidden rounded bg-muted">
              {planned ? (
                <span
                  className="absolute inset-y-0 left-0 border-r-2 border-foreground/40"
                  style={{ width: `${(plan / max) * 100}%` }}
                />
              ) : null}
              <span
                className="absolute inset-y-0 left-0 rounded"
                style={{ width: `${(ridden / max) * 100}%`, backgroundColor: zone.color }}
              />
            </div>
            <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
              {minutes(ridden)} min{planned ? ` / ${minutes(plan)}` : ""}
            </span>
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
}: {
  metrics: WorkoutMetricsSnapshot;
  description?: string | null;
  /** De geplande opbouw, voor de geplande minuten per zone. */
  blocks?: WorkoutBlock[];
  ftpWatts?: number | null;
}) {
  const note = powerNote(metrics);
  return (
    <div className="space-y-3">
      <WorkoutVerdictPills metrics={metrics} />
      <ZoneTimesPanel metrics={metrics} blocks={blocks} ftpWatts={ftpWatts} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetricStat label="TSS" value={nl(metrics.tss)} />
        <MetricStat
          label="Duur"
          value={metrics.movingMinutes == null ? "-" : `${metrics.movingMinutes} min`}
        />
        <MetricStat label="IF" value={nl(metrics.intensityFactor, 2)} />
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
                <PowerText text={metrics.targetSummary} weightKg={metrics.weightKg} />
              ) : (
                "-"
              )
            }
          />
          <DetailRow
            label="Gepland"
            value={
              [
                metrics.plannedMinutes ? `${metrics.plannedMinutes} min` : null,
                metrics.plannedLoad ? `${metrics.plannedLoad} TSS` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "-"
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
