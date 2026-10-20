// Doeltijd bij een doel: oordeel, benodigde CP, gevoeligheden, nadruk in het
// schema en het verloop van de prognose. Voor het lid en, alleen lezen, voor de
// trainer. De uitleg staat op /hulp#doeltijd, niet hier.

import type { GoalForecastRow } from "@/lib/training/goal-forecast";
import { CP_SOURCE_LABELS } from "@/lib/pacing/cp";
import { formatClock, VERDICT_LABELS, type GoalVerdict } from "@/lib/training/goal-target-time";
import { GoalTargetEdit } from "./goal-target-edit";

const VERDICT_TONE: Record<GoalVerdict, string> = {
  haalbaar: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  met_groei: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  groei_nodig: "bg-secondary text-secondary-foreground",
  ambitieus: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  niet_realistisch: "bg-destructive/15 text-destructive",
  buiten_bereik: "bg-destructive/15 text-destructive",
};

/** "1:41" of "45 s": een tijdwinst, niet een kloktijd. */
function formatGain(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const pct = (value: number) => `${value.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`;

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
        {latest ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_TONE[latest.verdict]}`}
          >
            {VERDICT_LABELS[latest.verdict]}
          </span>
        ) : null}
      </div>

      {latest ? (
        <dl className="grid gap-1 text-muted-foreground">
          {latest.required_cp_watts ? (
            <div>
              <dt className="inline text-foreground">CP nodig: </dt>
              <dd className="inline">
                {latest.required_cp_watts} W
                {detail.requiredGainPct != null ? ` (+${pct(detail.requiredGainPct)})` : ""}, nu{" "}
                {latest.cp_watts} W
                {detail.realisticGainPct != null
                  ? ` · haalbare groei tot de datum ±${pct(detail.realisticGainPct)}`
                  : ""}
              </dd>
            </div>
          ) : null}
          {detail.secondsPerKg != null && detail.secondsPerCpPct != null ? (
            <div>
              <dt className="inline text-foreground">Per stap: </dt>
              <dd className="inline">
                1% CP scheelt {formatGain(detail.secondsPerCpPct)} · 1 kg scheelt{" "}
                {formatGain(detail.secondsPerKg)}
              </dd>
            </div>
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
