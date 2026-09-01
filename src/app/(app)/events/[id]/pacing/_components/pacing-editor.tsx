"use client";

// Het hart van de pacingpagina: hoogteprofiel met de accenten erop, de
// W'-balanslijn eronder, en per stuk een schuifregelaar.
//
// De herberekening draait clientside. `estimatePlan` is pure logica die net zo
// goed in de browser werkt als op de server, dus elke slider-beweging levert
// meteen een nieuwe verwachte tijd en een nieuwe W'-lijn. Zonder dat zou het lid
// bij elk accent moeten opslaan om te zien wat het doet — en dan legt niemand
// accenten.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ResponsiveChart } from "@/components/charts/responsive-chart";
import { linearScale } from "@/lib/charts/scale";
import { linePath } from "@/lib/charts/paths";
import { evaluatePlan, type PlanSegment } from "@/lib/pacing/plan";
import type { CpModel } from "@/lib/pacing/cp";
import { segmentEndKms, type PacingRoute } from "@/lib/pacing/route-profile";
import { savePacingPlan } from "../_actions";

const EFFORT_LABELS: Record<string, string> = {
  rustig: "Rustig",
  duur: "Duur",
  tempo: "Tempo",
  drempel: "Drempel",
  vol: "Vol",
};

/** Hoogteverloop uit de gradiënten; buiten de component omdat de React-compiler
 *  geen accumulator in een useMemo toestaat. */
function cumulativeElevation(segments: PacingRoute["segments"]): number[] {
  const out: number[] = [];
  let current = 0;
  for (const segment of segments) {
    current += segment.gradient * segment.distanceM;
    out.push(current);
  }
  return out;
}

function hhmm(seconds: number) {
  const total = Math.round(seconds / 60);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours > 0 ? `${hours}u ${String(minutes).padStart(2, "0")}m` : `${minutes} min`;
}

export function PacingEditor({
  eventId,
  route,
  model,
  initialSegments,
  initialNotes,
}: {
  eventId: string;
  route: PacingRoute;
  model: CpModel;
  initialSegments: PlanSegment[];
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [segments, setSegments] = useState(initialSegments);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = useMemo(
    () =>
      segments.some(
        (segment, index) => segment.targetWkg !== initialSegments[index]?.targetWkg,
      ) || notes !== (initialNotes ?? ""),
    [segments, notes, initialSegments, initialNotes],
  );

  // Elke slider-beweging rekent het hele plan opnieuw door. Dat is goedkoop: het
  // model werkt op honderd-meter-segmenten en doet niets met I/O.
  const evaluation = useMemo(
    () => evaluatePlan(segments, route, model),
    [segments, route, model],
  );

  const endKms = useMemo(() => segmentEndKms(route.segments), [route.segments]);

  const elevation = useMemo(() => cumulativeElevation(route.segments), [route.segments]);

  const cpWkg = model.cpWatts / model.weightKg;

  function setTarget(index: number, value: number) {
    setSaved(false);
    setSegments((current) =>
      current.map((segment, i) =>
        i === index ? { ...segment, targetWkg: value } : segment,
      ),
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await savePacingPlan(
        eventId,
        segments.map((segment, index) => ({
          index,
          targetWkg: segment.targetWkg,
        })),
        notes.trim() || null,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function reset() {
    setSegments(initialSegments);
    setNotes(initialNotes ?? "");
    setSaved(false);
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Verwachte tijd" value={hhmm(evaluation.totalSeconds)} />
        <Metric
          label="Gemiddeld"
          value={`${evaluation.avgWkg.toFixed(2)} w/kg`}
          sub={`${evaluation.avgWatts} W`}
        />
        <Metric
          label="Reserve gebruikt"
          value={`${Math.round(evaluation.deepestDrawPct)}%`}
          sub={`${Math.round(evaluation.wPrime.totalKj)} kJ werk`}
        />
        <Metric
          label="Haalbaar"
          value={evaluation.feasible ? "Ja" : "Nee"}
          sub={
            evaluation.feasible
              ? undefined
              : `leeg rond km ${evaluation.wPrime.depletedAtKm?.toFixed(1)}`
          }
          alarm={!evaluation.feasible}
        />
      </section>

      <section className="rounded-lg border bg-card p-4">
        <ProfileChart
          endKms={endKms}
          elevation={elevation}
          balance={evaluation.wPrime.balanceBySegment}
          wPrimeJoules={model.wPrimeJoules}
          accents={route.accents.map((accent) => ({
            name: accent.name,
            startKm: accent.startKm,
            endKm: accent.endKm,
          }))}
          totalKm={route.totalKm}
        />
      </section>

      <section className="rounded-lg border bg-card">
        <ul className="divide-y">
          {segments.map((segment, index) => {
            const accent = evaluation.accents.find(
              (item) => route.accents[item.accentIndex]?.id === segment.accentId,
            );
            return (
              <li key={`${segment.startKm}-${index}`} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{segment.label}</p>
                    <p className="text-sm text-muted-foreground">
                      km {segment.startKm.toFixed(1)}–{segment.endKm.toFixed(1)}
                      {accent && accent.durationS > 0
                        ? ` · ${hhmm(accent.durationS)} · doorkomst ${hhmm(accent.arrivalSeconds)}`
                        : ""}
                    </p>
                  </div>
                  <p className="tabular-nums">
                    <span className="text-lg font-semibold">
                      {segment.targetWkg.toFixed(2)}
                    </span>{" "}
                    <span className="text-sm text-muted-foreground">
                      w/kg · {Math.round(segment.targetWkg * model.weightKg)} W ·{" "}
                      {EFFORT_LABELS[segment.effort] ?? segment.effort}
                    </span>
                  </p>
                </div>

                <input
                  type="range"
                  min={Math.round(cpWkg * 0.3 * 100) / 100}
                  max={Math.round(cpWkg * 1.6 * 100) / 100}
                  step={0.05}
                  value={segment.targetWkg}
                  onChange={(event) => setTarget(index, Number(event.target.value))}
                  className="mt-3 w-full accent-[var(--color-zwb-teal)]"
                  aria-label={`Doelvermogen voor ${segment.label}`}
                />

                {segment.rationale && (
                  <p className="mt-1 text-sm text-muted-foreground">{segment.rationale}</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <label className="mb-1 block text-sm font-medium" htmlFor="pacing-notes">
          Eigen aantekeningen
        </label>
        <textarea
          id="pacing-notes"
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            setSaved(false);
          }}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={save} disabled={pending || !dirty}>
          {pending ? "Opslaan..." : "Opslaan"}
        </Button>
        {dirty && (
          <Button type="button" variant="ghost" onClick={reset} disabled={pending}>
            Terug naar het voorstel
          </Button>
        )}
        {saved && !dirty && (
          <span className="text-sm text-muted-foreground">Opgeslagen.</span>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  alarm,
}: {
  label: string;
  value: string;
  sub?: string;
  alarm?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${alarm ? "text-destructive" : ""}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/**
 * Hoogteprofiel met de accenten als banden, en daaronder de W'-balans als
 * percentage. Twee schalen in één tekening omdat het juist om de samenhang gaat:
 * de reserve zakt waar het profiel omhoog gaat.
 */
function ProfileChart({
  endKms,
  elevation,
  balance,
  wPrimeJoules,
  accents,
  totalKm,
}: {
  endKms: number[];
  elevation: number[];
  balance: number[];
  wPrimeJoules: number;
  accents: Array<{ name: string; startKm: number; endKm: number }>;
  totalKm: number;
}) {
  const minEle = Math.min(...elevation, 0);
  const maxEle = Math.max(...elevation, minEle + 10);

  return (
    <ResponsiveChart ariaLabel="Hoogteprofiel met W'-balans" height={260}>
      {({ metrics, plotWidth, plotHeight }) => {
        const x = linearScale({ domain: [0, totalKm], range: [0, plotWidth] });
        // Bovenste twee derde: hoogte. Onderste derde: reserve.
        const profileHeight = plotHeight * 0.62;
        const balanceTop = profileHeight + 16;
        const balanceHeight = plotHeight - balanceTop;

        const yEle = linearScale({
          domain: [minEle, maxEle],
          range: [profileHeight, 0],
        });
        const yBal = linearScale({
          domain: [0, wPrimeJoules],
          range: [balanceTop + balanceHeight, balanceTop],
        });

        const profile = linePath(
          elevation,
          (_, index) => x.forward(endKms[index] ?? 0),
          (value) => yEle.forward(value),
        );
        const area = `${profile} L ${x.forward(totalKm).toFixed(1)} ${profileHeight.toFixed(1)} L 0 ${profileHeight.toFixed(1)} Z`;

        const balanceLine = linePath(
          balance,
          (_, index) => x.forward(endKms[index] ?? 0),
          (value) => yBal.forward(value),
        );

        return (
          <g transform={`translate(${metrics.margin.left}, ${metrics.margin.top})`}>
            {accents.map((accent) => (
              <rect
                key={`${accent.name}-${accent.startKm}`}
                x={x.forward(accent.startKm)}
                y={0}
                width={Math.max(1, x.forward(accent.endKm) - x.forward(accent.startKm))}
                height={profileHeight}
                fill="var(--chart-4)"
                opacity={0.16}
              />
            ))}

            <path d={area} fill="var(--chart-2)" opacity={0.22} />
            <path d={profile} fill="none" stroke="var(--chart-2)" strokeWidth={1.5} />

            <line
              x1={0}
              x2={plotWidth}
              y1={yBal.forward(0)}
              y2={yBal.forward(0)}
              stroke="currentColor"
              opacity={0.2}
            />
            <path
              d={balanceLine}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth={1.75}
            />
            <text
              x={0}
              y={balanceTop - 4}
              fontSize={11}
              fill="currentColor"
              opacity={0.6}
            >
              Anaerobe reserve
            </text>
          </g>
        );
      }}
    </ResponsiveChart>
  );
}
