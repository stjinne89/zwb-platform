// Doeltijd bij een doel: oordeel, benodigde CP, gevoeligheden, wat de tijd van
// je ZWBriljant-steen vraagt, nadruk in het schema en het verloop van de prognose.
// De klassen van de steen alleen voor het lid zelf: anderen zien de steen alleen
// als het lid hem deelt. Voor het lid en, alleen lezen, voor de
// trainer. De uitleg staat op /hulp#doeltijd, niet hier.

import type { GoalForecastRow } from "@/lib/training/goal-forecast";
import { CP_SOURCE_LABELS } from "@/lib/pacing/cp";
import { levelOf } from "@/lib/briljant/norms";
import { points } from "@/lib/briljant/score";
import type { Requirement } from "@/lib/training/goal-requirements";
import { formatClock } from "@/lib/training/goal-target-time";
import { TargetAssessmentRows, VerdictBadge } from "@/components/target-assessment";
import { GoalTargetEdit } from "./goal-target-edit";

/** "Platina 486" met de kleur van de klasse ervoor. */
function SteenLevel({ level }: { level: number }) {
  const klasse = levelOf(level);
  return (
    <span className="whitespace-nowrap">
      <span
        aria-hidden
        className="mr-1 inline-block size-2 rounded-full align-middle"
        style={{ backgroundColor: klasse.color }}
      />
      {klasse.name} {points(level)}
    </span>
  );
}

function RequirementRow({ label, requirement }: { label: string; requirement?: Requirement }) {
  if (requirement?.required == null) return null;
  return (
    <div>
      <dt className="inline text-foreground">{label} nodig: </dt>
      <dd className="inline tabular-nums">
        <SteenLevel level={requirement.required} />
        {requirement.current != null ? (
          <>
            {" · jij "}
            <SteenLevel level={requirement.current} />
          </>
        ) : null}
      </dd>
    </div>
  );
}

export function GoalForecastCard({
  goalId,
  targetSeconds,
  riding,
  routeLabel,
  forecasts,
  editable,
  showRequirements = false,
}: {
  goalId: string;
  targetSeconds: number;
  riding: string | null;
  routeLabel: string | null;
  /** Nieuwste eerst. */
  forecasts: GoalForecastRow[];
  editable: boolean;
  /** De klassen die de doeltijd van de steen vraagt; alleen voor het lid zelf. */
  showRequirements?: boolean;
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
          {showRequirements ? (
            <>
              <RequirementRow label="Drempel" requirement={detail.requirements?.drempel} />
              <RequirementRow label="Fitheid" requirement={detail.requirements?.fitheid} />
            </>
          ) : null}
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
