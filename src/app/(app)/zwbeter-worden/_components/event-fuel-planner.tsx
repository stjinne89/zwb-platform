"use client";

import { useDeferredValue, useId, useMemo, useState, type ReactNode } from "react";
import { FUEL_PRESETS, FUEL_PRESET_LABELS, type FuelPreset } from "@/lib/nutrition/event-fuel";
import {
  PLANNER_LIMITS,
  maxPlannerMinutes,
  plannerPlanInput,
  plannerResult,
  presetIntensity,
  type EventFuelPlanner as Planner,
  type PlannerChoice,
} from "@/lib/nutrition/event-planner";
import { formatRideMinute, ridePlan, type RidePlan } from "@/lib/nutrition/ride-plan";
import { cn } from "@/lib/utils";
import { bidonGroupClass, bidonOptionClass } from "./bidon-options";

// De knop, de schuifjes en "Reken met" boven Klaarzetten bij een event (stap 2
// van docs/eventvoeding-plan.md). Alles rekent in de browser opnieuw
// (event-planner.ts); de keuzes gelden alleen voor deze weergave. Uitleg staat
// op /hulp#voeding, niet hier.

const decimal = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const liters = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

function sameChoice(a: PlannerChoice, b: PlannerChoice): boolean {
  return (
    a.preset === b.preset &&
    a.intensityFactor === b.intensityFactor &&
    a.minutes === b.minutes &&
    a.fluidMlPerHour === b.fluidMlPerHour &&
    a.perHourG === b.perHourG
  );
}

function Slider({
  label,
  value,
  shown,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  shown: ReactNode;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 sm:grid-cols-[7rem_minmax(0,1fr)_7rem]">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-11 w-full accent-[var(--color-zwb-teal)]"
      />
      <span className="col-start-2 text-sm tabular-nums sm:col-start-auto sm:text-right">{shown}</span>
    </div>
  );
}

export function useEventFuelPlan(planner: Planner) {
  const [choice, setChoice] = useState<PlannerChoice>(planner.defaults);
  const deferred = useDeferredValue(choice);
  const result = useMemo(() => plannerResult(planner, deferred), [planner, deferred]);
  const plan = useMemo<RidePlan | null>(() => ridePlan(plannerPlanInput(planner, deferred)), [planner, deferred]);
  return { choice, setChoice, result, plan };
}

export function EventFuelControls({
  planner,
  choice,
  setChoice,
  result,
}: {
  planner: Planner;
  choice: PlannerChoice;
  setChoice: (update: (current: PlannerChoice) => PlannerChoice) => void;
  result: ReturnType<typeof plannerResult>;
}) {
  const presetLabel = useId();
  const perHourId = useId();
  // Wat er in het veld staat terwijl je typt; leeg mag even, bij verlaten weer het getal.
  const [draft, setDraft] = useState<string | null>(null);
  const choosePreset = (preset: FuelPreset) =>
    setChoice((current) => ({ ...current, preset, intensityFactor: presetIntensity(planner, preset), perHourG: null }));
  const { balance } = result;
  return (
    <div className="space-y-3 border-b pb-3">
      <div role="group" aria-labelledby={presetLabel} className={bidonGroupClass}>
        <span id={presetLabel} className="sr-only">
          Zwaarte
        </span>
        {FUEL_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={choice.preset === preset}
            onClick={() => choosePreset(preset)}
            className={bidonOptionClass(choice.preset === preset)}
          >
            {FUEL_PRESET_LABELS[preset]}
          </button>
        ))}
      </div>
      <div className="space-y-1">
        <Slider
          label="Intensiteit"
          value={choice.intensityFactor}
          min={PLANNER_LIMITS.intensityFactor.min}
          max={PLANNER_LIMITS.intensityFactor.max}
          step={PLANNER_LIMITS.intensityFactor.step}
          onChange={(intensityFactor) => setChoice((current) => ({ ...current, intensityFactor }))}
          shown={
            <>
              IF {decimal.format(choice.intensityFactor)}
              {result.watts != null ? ` · ${result.watts} W` : ""}
            </>
          }
        />
        <Slider
          label="Duur"
          value={choice.minutes}
          min={PLANNER_LIMITS.minutes.min}
          max={maxPlannerMinutes(planner.expectedMinutes)}
          step={PLANNER_LIMITS.minutes.step}
          onChange={(minutes) => setChoice((current) => ({ ...current, minutes }))}
          shown={formatRideMinute(choice.minutes)}
        />
        <Slider
          label="Vocht per uur"
          value={choice.fluidMlPerHour ?? result.adviceFluidMl}
          min={PLANNER_LIMITS.fluidMlPerHour.min}
          max={PLANNER_LIMITS.fluidMlPerHour.max}
          step={PLANNER_LIMITS.fluidMlPerHour.step}
          onChange={(fluidMlPerHour) => setChoice((current) => ({ ...current, fluidMlPerHour }))}
          shown={`${liters.format((choice.fluidMlPerHour ?? result.adviceFluidMl) / 1000)} l`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <label htmlFor={perHourId} className="w-28 text-sm text-muted-foreground">
          Reken met
        </label>
        <span className="flex items-center gap-1.5">
          <input
            id={perHourId}
            type="number"
            inputMode="numeric"
            min={PLANNER_LIMITS.perHourG.min}
            max={PLANNER_LIMITS.perHourG.max}
            step={PLANNER_LIMITS.perHourG.step}
            value={draft ?? String(choice.perHourG ?? result.adviceG)}
            onBlur={() => setDraft(null)}
            onChange={(event) => {
              const raw = event.target.value;
              setDraft(raw);
              const value = Number(raw);
              if (raw === "" || !Number.isFinite(value)) return;
              const clamped = Math.min(PLANNER_LIMITS.perHourG.max, Math.max(PLANNER_LIMITS.perHourG.min, Math.round(value)));
              setChoice((current) => ({ ...current, perHourG: clamped }));
            }}
            className={cn(
              "h-11 w-20 rounded-md border bg-background px-2 text-right text-sm tabular-nums",
              result.aboveCap && "border-amber-500 text-amber-700 dark:text-amber-400",
            )}
          />
          <span className="text-sm">g per uur</span>
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">
          Advies {result.adviceG} · grens {result.capG}
          {result.capBy === "tas" ? " (wat je meeneemt)" : ""}
        </span>
      </div>
      {balance ? (
        <p className="text-sm tabular-nums text-muted-foreground">
          Verbruik {balance.burnG} g · eten {balance.intakeG} g · uit voorraad {balance.fromStoreG} g
          {balance.reserveAtMinute != null ? (
            <span className="text-amber-700 dark:text-amber-400">
              {" "}
              · reserve na {formatRideMinute(balance.reserveAtMinute)}
            </span>
          ) : null}
        </p>
      ) : null}
      {!sameChoice(choice, planner.defaults) ? (
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            setChoice(() => planner.defaults);
          }}
          className="inline-flex min-h-11 items-center text-sm text-primary hover:underline"
        >
          Terug naar het advies
        </button>
      ) : null}
    </div>
  );
}
