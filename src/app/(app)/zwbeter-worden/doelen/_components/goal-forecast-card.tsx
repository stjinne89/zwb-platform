// Doeltijd bij een doel: oordeel, benodigde CP, gevoeligheden, nadruk in het
// schema en het verloop van de prognose. Voor het lid en, alleen lezen, voor de
// trainer. De uitleg staat op /hulp#doeltijd, niet hier.

import type { GoalForecastRow } from "@/lib/training/goal-forecast";
import { CP_SOURCE_LABELS } from "@/lib/pacing/cp";
import { formatClock } from "@/lib/training/goal-target-time";
import { TargetAssessmentRows, VerdictBadge } from "@/components/target-assessment";
import { GoalTargetEdit } from "./goal-target-edit";

export function GoalForecastCard({
  goalId,
  targetSeconds,
  riding,
  routeLabel,
  forecasts,
  editable,
}: {
  goalId: string;
  targetSeconds: number;
  riding: string | null;
  routeLabel: string | null;
  /** Nieuwste eerst. */
  forecasts: GoalForecastRow[];
  editable: boolean;
}) {
  const latest = forecasts[0];
  const detail = latest?.detail ?? {};
  const history = [...forecasts].reverse().slice(-6);

  return (
    <div className="mt-3 space-y-2 rounded-md border bg-background p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">
          Doeltijd {formatClock(targetSeconds)}
          {latest ? ` · prognose ${formatClock(latest.predicted_seconds)}` : ""}
        </span>
        {latest ? <VerdictBadge verdict={latest.verdict} /> : null}
      </div>

      {latest ? (
        <dl className="grid gap-1 text-muted-foreground">
          <TargetAssessmentRows
            cpWatts={latest.cp_watts}
            requiredCpWatts={latest.required_cp_watts}
            requiredGainPct={detail.requiredGainPct}
            realisticGainPct={detail.realisticGainPct}
            secondsPerCpPct={detail.secondsPerCpPct}
            secondsPerKg={detail.secondsPerKg}
          />
          {detail.emphasis && detail.emphasis.length > 0 ? (
            <div>
              <dt className="inline text-foreground">Nadruk in je schema: </dt>
              <dd className="inline">{detail.emphasis.map((item) => item.label).join(" · ")}</dd>
            </div>
          ) : null}
          {history.length > 1 ? (
            <div>
              <dt className="inline text-foreground">Verloop: </dt>
              <dd className="inline tabular-nums">
                {history.map((row) => formatClock(row.predicted_seconds)).join(" → ")}
              </dd>
            </div>
          ) : null}
          <div className="text-xs">
            {[
              routeLabel,
              riding === "group" ? "in een groep" : "alleen",
              detail.cpSource ? `CP ${CP_SOURCE_LABELS[detail.cpSource]}` : null,
              detail.durabilityFadePct == null ? "zonder vermoeidheidsdata" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </dl>
      ) : (
        <p className="text-muted-foreground">Prognose volgt.</p>
      )}

      {editable ? (
        <GoalTargetEdit goalId={goalId} targetSeconds={targetSeconds} riding={riding} />
      ) : null}
    </div>
  );
}
