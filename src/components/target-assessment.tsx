// Hoe ver een lid van een doeltijd af zit: oordeel, benodigde CP en wat 1 % CP
// of 1 kg scheelt. Gedeeld door de doelkaart in ZWBeter en de pacingcalculator
// van een event, zodat beide hetzelfde zeggen op dezelfde manier.

import { VERDICT_LABELS, type GoalVerdict } from "@/lib/training/goal-target-time";

const VERDICT_TONE: Record<GoalVerdict, string> = {
  haalbaar: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  met_groei: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  groei_nodig: "bg-secondary text-secondary-foreground",
  ambitieus: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  niet_realistisch: "bg-destructive/15 text-destructive",
  buiten_bereik: "bg-destructive/15 text-destructive",
};

export function VerdictBadge({ verdict }: { verdict: GoalVerdict }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_TONE[verdict]}`}>
      {VERDICT_LABELS[verdict]}
    </span>
  );
}

/** "1:41" of "45 s": een tijdwinst, niet een kloktijd. */
export function formatGain(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const pct = (value: number) => `${value.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`;

/** De regels onder het oordeel; als `<div>`s, te gebruiken binnen een `<dl>`. */
export function TargetAssessmentRows({
  cpWatts,
  requiredCpWatts,
  requiredGainPct,
  realisticGainPct,
  secondsPerCpPct,
  secondsPerKg,
  untilLabel = "tot de datum",
}: {
  cpWatts: number;
  requiredCpWatts: number | null;
  requiredGainPct: number | null | undefined;
  realisticGainPct: number | null | undefined;
  secondsPerCpPct: number | null | undefined;
  secondsPerKg: number | null | undefined;
  untilLabel?: string;
}) {
  return (
    <>
      {requiredCpWatts ? (
        <div>
          <dt className="inline text-foreground">CP nodig: </dt>
          <dd className="inline">
            {requiredCpWatts} W
            {requiredGainPct != null ? ` (+${pct(requiredGainPct)})` : ""}, nu {cpWatts} W
            {realisticGainPct != null ? ` · haalbare groei ${untilLabel} ±${pct(realisticGainPct)}` : ""}
          </dd>
        </div>
      ) : null}
      {secondsPerKg != null && secondsPerCpPct != null ? (
        <div>
          <dt className="inline text-foreground">Per stap: </dt>
          <dd className="inline">
            1% CP scheelt {formatGain(secondsPerCpPct)} · 1 kg scheelt {formatGain(secondsPerKg)}
          </dd>
        </div>
      ) : null}
    </>
  );
}
