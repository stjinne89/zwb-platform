// Belasting en herstel van de gekozen renner: de CTL/Form-grafiek met
// kerncijfers, de hersteltrend uit intervals.icu en het ZWBeterWorden-advies.

import { Activity, Mountain, ShieldCheck, TrendingUp } from "lucide-react";
import type { TrainingLoadPoint } from "@/lib/training/load-points";
import type { TrainingReadinessSummary, WellnessSummary } from "@/lib/training/wellness";
import { zwbeterWordenAdvice } from "@/lib/training/zwbeterworden";
import { TrainingLoadMetrics } from "../../_components/training-load-chart";
import { formatNumber, formatWellnessDate } from "../../_components/format";
import {
  MetricCard,
  RecoveryStat,
  recoveryPillClass,
  recoveryStateLabel,
} from "../../_components/ui";

export function AthleteLoadPanel({
  loadPoints,
  ctl,
  tsb,
  eftp,
  ctlProjection,
  readiness,
  recovery,
  zrlDivision,
  todayKey,
  fetchError,
}: {
  loadPoints: TrainingLoadPoint[];
  ctl: number | null;
  tsb: number | null;
  eftp: number | null;
  ctlProjection: number | null;
  readiness: TrainingReadinessSummary;
  recovery: { optedIn: boolean; summary: WellnessSummary | null };
  zrlDivision?: string | null;
  todayKey: string;
  fetchError: string | null;
}) {
  const advice = zwbeterWordenAdvice(readiness, zrlDivision);

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <TrendingUp className="size-4 text-primary" />
        Belasting
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <TrainingLoadMetrics
          points={loadPoints}
          ctl={ctl}
          tsb={tsb}
          today={todayKey}
          idSuffix="coach"
        />
        <MetricCard icon={Mountain} label="eFTP" value={formatNumber(eftp ?? undefined, 0)} />
        <MetricCard
          icon={ShieldCheck}
          label="Trainingsruimte"
          value={readiness.score != null ? `${readiness.score}` : "-"}
          hint={advice.title}
        />
        <MetricCard
          icon={TrendingUp}
          label="CTL doel"
          value={formatNumber(ctlProjection ?? undefined, 1)}
        />
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="size-4 text-primary" />
            Hersteltrend
          </h3>
          {recovery.summary ? (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${recoveryPillClass(
                recovery.summary.state,
              )}`}
            >
              {recoveryStateLabel(recovery.summary.state)}
            </span>
          ) : null}
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="rounded-md bg-muted/40 p-3">
            {!recovery.optedIn ? (
              <p className="text-sm text-muted-foreground">Hersteldata niet gedeeld.</p>
            ) : !recovery.summary ? (
              <p className="text-sm text-muted-foreground">
                Nog geen hersteldata gevonden in intervals.icu.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <RecoveryStat
                    label="Readiness"
                    value={
                      recovery.summary.readiness != null ? `${recovery.summary.readiness}` : "-"
                    }
                    hint={
                      recovery.summary.readinessSource === "afgeleid"
                        ? "berekend door ZWB"
                        : undefined
                    }
                  />
                  <RecoveryStat
                    label="Laatste"
                    value={formatWellnessDate(recovery.summary.latestDate)}
                  />
                  <RecoveryStat
                    label="HRV 7d"
                    value={recovery.summary.hrv != null ? `${recovery.summary.hrv}` : "-"}
                  />
                  <RecoveryStat
                    label="Rust-HR 7d"
                    value={
                      recovery.summary.restingHr != null ? `${recovery.summary.restingHr}` : "-"
                    }
                  />
                  <RecoveryStat
                    label="Slaap 7d"
                    value={
                      recovery.summary.sleepHours != null ? `${recovery.summary.sleepHours}u` : "-"
                    }
                  />
                  <RecoveryStat label="Dagen" value={`${recovery.summary.days}`} />
                </div>
                <p className="text-xs text-muted-foreground">{recovery.summary.note}</p>
              </div>
            )}
          </div>

          <div className={`rounded-md p-3 ${advice.block}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">ZWBeterWorden</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${advice.pill}`}>
                {advice.level > 0 ? `Niveau ${advice.level}/5` : "—"}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold">{advice.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{advice.description}</p>
          </div>
        </div>
      </div>

      {fetchError ? (
        <p className="mt-3 text-xs text-muted-foreground">Intervals: {fetchError}</p>
      ) : null}
    </section>
  );
}
