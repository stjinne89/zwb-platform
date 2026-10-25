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
  return pct == null ? null : `${pct}%`;
}

function rpeLabel(rpe: ComplianceBreakdown["rpe"]["expected"]) {
  if (!rpe) return "-";
  return rpe.low === rpe.high ? `${rpe.low}` : `${rpe.low}-${rpe.high}`;
}

/** Duur, TSS en IF delen één schaal tot 150% van gepland, zodat de planstreep overal op dezelfde plek staat. */
const PCT_SCALE = 150;

/**
 * Eén vlakke balk: teal is gereden tot het plan, goud wat erboven kwam, de
 * streep is het plan. Zonder plan alleen het teal.
 */
function PlanMeter({
  label,
  value,
  pct,
  actual,
  planned,
  max,
}: {
  label: ReactNode;
  /** "63 / 70 min", rechts boven de balk. */
  value: string;
  pct?: string | null;
  actual: number | null;
  planned: number | null;
  max: number;
}) {
  const share = (amount: number) => (Math.min(Math.max(amount, 0), max) / max) * 100;
  const ridden = actual ?? 0;
  const within = planned == null ? ridden : Math.min(ridden, planned);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {value}
          {pct != null ? <span className="ml-2 inline-block w-10 text-right font-medium">{pct}</span> : null}
        </span>
      </div>
      <div className="relative h-2.5 bg-foreground/10">
        <span className="absolute inset-y-0 left-0 bg-zwb-meter" style={{ width: `${share(within)}%` }} />
        {planned != null && ridden > planned ? (
          <span
            className="absolute inset-y-0 bg-zwb-meter-over"
            style={{ left: `${share(planned)}%`, width: `${share(ridden) - share(planned)}%` }}
          />
        ) : null}
        {planned != null && planned > 0 ? (
          <span
            aria-hidden
            className="absolute -inset-y-1 w-0.5 -translate-x-1/2 bg-foreground"
            style={{ left: `${share(planned)}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Wat de kleuren en de streep betekenen; één keer, boven de balken. */
function MeterLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-3 bg-zwb-meter" />
        Gereden
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-3 bg-zwb-meter-over" />
        Boven plan
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-3.5 w-0.5 bg-foreground" />
        Gepland
      </span>
    </div>
  );
}

type Comparison = ComplianceBreakdown["duration"];

/** Op de procentschaal: het plan is 100, gereden is het percentage. */
function onPctScale(comparison: Comparison) {
  if (comparison.pct != null) return { actual: comparison.pct, planned: 100 };
  return { actual: null, planned: comparison.planned != null ? 100 : null };
}

/** "63 / 70 min", of alleen het gereden deel als er niets gepland was. */
function pair(actual: string, planned: string | null) {
  return planned == null ? actual : `${actual} / ${planned}`;
}

/** Gepland tegenover gereden per onderdeel; het TSS-percentage is dat van de pil. */
function ComplianceMeters({ breakdown }: { breakdown: ComplianceBreakdown }) {
  const { duration, load, intensity, rpe } = breakdown;
  return (
    <div className="space-y-2.5" aria-label="Naleving">
      <PlanMeter
        label="Duur"
        value={pair(
          duration.actual == null ? "-" : `${duration.actual}`,
          duration.planned == null ? null : `${duration.planned} min`,
        )}
        pct={pctLabel(duration.pct)}
        {...onPctScale(duration)}
        max={PCT_SCALE}
      />
      <PlanMeter
        label="TSS"
        value={pair(nl(load.actual), load.planned == null ? null : nl(load.planned))}
        pct={pctLabel(load.pct)}
        {...onPctScale(load)}
        max={PCT_SCALE}
      />
      <PlanMeter
        label="IF"
        value={pair(nl(intensity.actual, 2), intensity.planned == null ? null : nl(intensity.planned, 2))}
        pct={pctLabel(intensity.pct)}
        {...onPctScale(intensity)}
        max={PCT_SCALE}
      />
      {rpe.expected || rpe.actual != null ? (
        <PlanMeter
          label="RPE"
          value={pair(rpe.actual == null ? "-" : `${rpe.actual}`, rpe.expected ? rpeLabel(rpe.expected) : null)}
          pct=""
          actual={rpe.actual}
          planned={rpe.expected?.high ?? null}
          max={10}
        />
      ) : null}
    </div>
  );
}

/**
 * Gereden minuten per Zwift-zone tegenover de geplande, op één schaal in
 * minuten voor alle zones. Het vierkantje in de zonekleur koppelt de rij aan
 * de blokken van het schema.
 */
function ZoneMeters({
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
  const minutes = (seconds: number) => Math.round(seconds / 60);
  // Wat ruimte voorbij de langste zone, zodat de planstreep niet tegen de rand valt.
  const longest = Math.max(1, ...rows.map((row) => minutes(Math.max(row.riddenSeconds, row.plannedSeconds))));
  const max = Math.ceil(longest * 1.15);

  return (
    <div className="space-y-2.5 border-t pt-3" aria-label="Tijd per zone">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">Zones</span>
        {zones?.match != null ? (
          <span className="tabular-nums text-muted-foreground">
            Verdeling <span className="font-medium text-foreground">{zones.match}%</span>
          </span>
        ) : null}
      </div>
      {rows.map((row) => (
        <PlanMeter
          key={row.zone}
          label={
            <>
              <span aria-hidden className="size-2.5" style={{ backgroundColor: ZWIFT_ZONES[row.zone - 1].color }} />
              Z{row.zone}
            </>
          }
          value={
            zones
              ? `${minutes(row.riddenSeconds)} / ${minutes(row.plannedSeconds)} min`
              : `${minutes(row.riddenSeconds)} min`
          }
          pct={zones ? (pctLabel(row.pct) ?? "") : null}
          actual={minutes(row.riddenSeconds)}
          planned={zones ? minutes(row.plannedSeconds) : null}
          max={max}
        />
      ))}
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
      <div className="space-y-3 bg-foreground/[0.04] p-3">
        <MeterLegend />
        <ComplianceMeters breakdown={breakdown} />
        <ZoneMeters metrics={metrics} zones={breakdown.zones} />
      </div>

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
