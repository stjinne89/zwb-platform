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
import { evaluatePlan, NEUTRAL_SPEED_KMH, type PlanSegment } from "@/lib/pacing/plan";
import { effortFor } from "@/lib/pacing/baseline";
import type { DurabilityModel } from "@/lib/pacing/durability";
import {
  applyMerge,
  applySplit,
  canMergeWithNext,
  MAX_EDIT_PIECES,
  splitBounds,
} from "@/lib/pacing/edit";
import { ZONE_COLOR } from "../../_components/zone";
import type { CpModel } from "@/lib/pacing/cp";
import { segmentEndKms, type PacingRoute } from "@/lib/pacing/route-profile";
import {
  POWERUP_LABELS,
  type PowerupId,
  type RidePhysics,
  type RidePosition,
} from "@/lib/pacing/zwift-setup";
import { SURFACE_LABELS } from "@/lib/zwift/surfaces/crr";
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
  durability,
  ride,
}: {
  eventId: string;
  route: PacingRoute;
  model: CpModel;
  initialSegments: PlanSegment[];
  initialNotes: string | null;
  /** Hetzelfde duurvermogensmodel als op de server, zodat de tijden gelijk zijn. */
  durability?: DurabilityModel | null;
  /** Zwift: fiets, format, slipstream en powerups; zie zwift-setup.ts. */
  ride?: RidePhysics | null;
}) {
  const router = useRouter();
  const [segments, setSegments] = useState(initialSegments);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [splitting, setSplitting] = useState<number | null>(null);
  const [splitKm, setSplitKm] = useState("");

  // Vergelijkt de hele indeling: na knippen kloppen de indexen niet meer.
  const dirty = useMemo(() => {
    const shape = (list: PlanSegment[]) =>
      JSON.stringify(
        list.map((s) => [s.startKm, s.endKm, s.targetWkg, s.label, s.position ?? "", s.powerup ?? ""]),
      );
    return shape(segments) !== shape(initialSegments) || notes !== (initialNotes ?? "");
  }, [segments, notes, initialSegments, initialNotes]);

  // Elke slider-beweging rekent het hele plan opnieuw door. Dat is goedkoop: het
  // model werkt op honderd-meter-segmenten en doet niets met I/O.
  const evaluation = useMemo(
    () => evaluatePlan(segments, route, model, { durability: durability ?? null, ride: ride ?? null }),
    [segments, route, model, durability, ride],
  );
  const powerups = ride?.powerups ?? [];

  function setPosition(index: number, position: RidePosition) {
    setSaved(false);
    setSegments((current) =>
      current.map((segment, i) => (i === index ? { ...segment, position } : segment)),
    );
  }

  function setPowerup(index: number, powerup: PowerupId | null) {
    setSaved(false);
    setSegments((current) =>
      current.map((segment, i) => (i === index ? { ...segment, powerup } : segment)),
    );
  }

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

  function split(index: number) {
    const km = Number(splitKm.replace(",", "."));
    if (!Number.isFinite(km)) return;
    setSaved(false);
    setSegments((current) => applySplit(current, index, km));
    setSplitting(null);
  }

  function merge(index: number) {
    setSaved(false);
    setSplitting(null);
    setSegments((current) => applyMerge(current, index));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await savePacingPlan(
        eventId,
        segments.map((segment) => ({
          startKm: segment.startKm,
          endKm: segment.endKm,
          targetWkg: segment.targetWkg,
          label: segment.label,
          kind: segment.kind ?? null,
          position: segment.position ?? null,
          powerup: segment.powerup ?? null,
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
    setSplitting(null);
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
              : evaluation.wPrime.depletedAtKm !== null
                ? `leeg rond km ${evaluation.wPrime.depletedAtKm.toFixed(1)}`
                : `te weinig over voor de sprint, km ${evaluation.reserveShortAtKm?.toFixed(1)}`
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
          zones={route.neutralZones ?? []}
          surfaces={route.surfaceSections ?? []}
          totalKm={route.totalKm}
        />
        {route.surfaceSections && route.surfaceSections.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {[...new Set(route.surfaceSections.map((section) => SURFACE_LABELS[section.surface]))].join(
              " · ",
            )}
            {": "}
            {(
              route.surfaceSections.reduce((sum, section) => sum + section.endKm - section.startKm, 0)
            ).toFixed(1)}{" "}
            km
          </p>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <ul className="divide-y">
          {segments.map((segment, index) => {
            const accent = evaluation.accents.find(
              (item) => route.accents[item.accentIndex]?.id === segment.accentId,
            );
            const bounds = splitBounds(segment);
            const mergeable = canMergeWithNext(segments, index);
            if (segment.kind === "neutral") {
              return (
                <li key={`${segment.startKm}-${index}`} className="p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{segment.label}</p>
                      <p className="text-sm text-muted-foreground">
                        km {segment.startKm.toFixed(1)}–{segment.endKm.toFixed(1)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Geneutraliseerd · ca. {NEUTRAL_SPEED_KMH} km/u
                    </p>
                  </div>
                </li>
              );
            }
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
                    {segment.kind === "descent" && segment.targetWkg === 0 ? (
                      <span className="text-sm text-muted-foreground">Uitrollen · </span>
                    ) : null}
                    <span className="text-lg font-semibold">
                      {segment.targetWkg.toFixed(2)}
                    </span>{" "}
                    <span className="text-sm text-muted-foreground">
                      w/kg · {Math.round(segment.targetWkg * model.weightKg)} W ·{" "}
                      {EFFORT_LABELS[effortFor(segment.targetWkg, cpWkg)]}
                    </span>
                  </p>
                </div>

                <input
                  type="range"
                  min={segment.kind === "descent" ? 0 : Math.round(cpWkg * 0.3 * 100) / 100}
                  max={sliderMax(segment, model)}
                  step={0.05}
                  value={segment.targetWkg}
                  onChange={(event) => setTarget(index, Number(event.target.value))}
                  className="mt-3 w-full accent-[var(--color-zwb-teal)]"
                  aria-label={`Doelvermogen voor ${segment.label}`}
                />

                {segment.rationale && (
                  <p className="mt-1 text-sm text-muted-foreground">{segment.rationale}</p>
                )}

                {ride && (ride.format === "race" || powerups.length > 0) ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    {ride.format === "race" && (
                      <div className="inline-flex rounded-md border" role="group" aria-label={`Positie op ${segment.label}`}>
                        {(["bunch", "alone"] as const).map((value) => {
                          const active = (segment.position ?? "bunch") === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setPosition(index, value)}
                              className={`h-8 px-3 first:rounded-l-md last:rounded-r-md ${active ? "bg-muted font-medium" : "text-muted-foreground"}`}
                            >
                              {value === "bunch" ? "In de groep" : "Alleen"}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {powerups.length > 0 && (
                      <select
                        value={segment.powerup ?? ""}
                        onChange={(event) =>
                          setPowerup(index, (event.target.value || null) as PowerupId | null)
                        }
                        aria-label={`Powerup op ${segment.label}`}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">Geen powerup</option>
                        {powerups.map((id) => (
                          <option key={id} value={id}>
                            {POWERUP_LABELS[id]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : null}

                {bounds || mergeable ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    {bounds && segments.length < MAX_EDIT_PIECES ? (
                      splitting === index ? (
                        <>
                          <label className="sr-only" htmlFor={`split-${index}`}>
                            Knippen op km
                          </label>
                          <input
                            id={`split-${index}`}
                            type="number"
                            inputMode="decimal"
                            min={bounds.minKm}
                            max={bounds.maxKm}
                            step={0.1}
                            value={splitKm}
                            onChange={(event) => setSplitKm(event.target.value)}
                            className="h-9 w-24 rounded-md border border-input bg-background px-2 tabular-nums"
                          />
                          <Button type="button" size="sm" onClick={() => split(index)}>
                            Knip
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSplitting(null)}
                          >
                            Annuleren
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSplitting(index);
                            setSplitKm(
                              (Math.round(((segment.startKm + segment.endKm) / 2) * 10) / 10).toFixed(1),
                            );
                          }}
                        >
                          Knippen
                        </Button>
                      )
                    ) : null}
                    {mergeable && splitting !== index ? (
                      <Button type="button" size="sm" variant="ghost" onClick={() => merge(index)}>
                        Samenvoegen met volgende
                      </Button>
                    ) : null}
                  </div>
                ) : null}
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

/**
 * Bovengrens van de schuif. Een sprint of start gaat ver boven CP; de grens is
 * daar wat het CP/W′-model voor die duur toelaat, niet 1,6×CP.
 */
function sliderMax(segment: PlanSegment, model: CpModel): number {
  const seconds = segment.kind === "sprint" ? 15 : segment.kind === "start" ? 45 : null;
  const watts = seconds
    ? model.cpWatts + model.wPrimeJoules / seconds
    : model.cpWatts * 1.6;
  return Math.round((watts / model.weightKg) * 100) / 100;
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
  zones,
  surfaces,
  totalKm,
}: {
  endKms: number[];
  elevation: number[];
  balance: number[];
  wPrimeJoules: number;
  accents: Array<{ name: string; startKm: number; endKm: number }>;
  zones: Array<{ startKm: number; endKm: number }>;
  /** Stukken zonder asfalt (Zwift), als band onder het profiel. */
  surfaces: Array<{ startKm: number; endKm: number }>;
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

            {zones.map((zone) => (
              <rect
                key={`zone-${zone.startKm}`}
                x={x.forward(zone.startKm)}
                y={0}
                width={Math.max(1, x.forward(zone.endKm) - x.forward(zone.startKm))}
                height={profileHeight}
                fill={ZONE_COLOR}
                opacity={0.14}
              />
            ))}

            <path d={area} fill="var(--chart-2)" opacity={0.22} />
            <path d={profile} fill="none" stroke="var(--chart-2)" strokeWidth={1.5} />

            {surfaces.map((section) => (
              <rect
                key={`surface-${section.startKm}`}
                x={x.forward(section.startKm)}
                y={profileHeight - 4}
                width={Math.max(1, x.forward(section.endKm) - x.forward(section.startKm))}
                height={4}
                fill="var(--chart-5)"
              >
                <title>
                  km {section.startKm.toFixed(1)}–{section.endKm.toFixed(1)}
                </title>
              </rect>
            ))}

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
