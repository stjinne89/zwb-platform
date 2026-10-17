// Ingang van de regelmotor: dezelfde invoer als de AI, hetzelfde formaat terug.
// Kiest de modus zoals de prompts dat doen: currentPlan zonder planUpdate is een
// dag-aanpassing, planUpdate een bijwerking, anders een nieuw blok.

import { buildSession } from "@/lib/training/engine/catalog";
import { composePlan, planText } from "@/lib/training/engine/compose";
import { adaptDay } from "@/lib/training/engine/daily";
import { planWeeks } from "@/lib/training/engine/periodization";
import { recoverySignals } from "@/lib/training/engine/signals";
import type { EngineMode, EnginePlan, EngineReason, PlanWindow, TrainingAiInput } from "@/lib/training/engine/types";

export type { EngineMode, EnginePlan, EngineReason };

/** Privé: klachten en cyclus horen nooit in cautions, ook niet via een regel. */
const PRIVATE_WORDS = /klacht|cyclus|menstru|blessure|ziek|pijn/i;

export function engineMode(input: TrainingAiInput): EngineMode {
  if (input.planUpdate) return "plan_update";
  if (input.currentPlan) return "daily";
  return "plan";
}

/**
 * Het venster van een nieuw blok of een bijwerking. Oude invoer zonder
 * planWindow heeft het venster alleen in het antwoord van de AI; de aanroeper
 * geeft dat dan mee als `fallback`.
 */
function planWindowOf(input: TrainingAiInput, fallback?: PlanWindow): PlanWindow | null {
  if (input.planUpdate) return { from: input.planUpdate.fromDate, to: input.planUpdate.toDate };
  if (input.planWindow) return { from: input.planWindow.from, to: input.planWindow.to };
  return fallback ?? null;
}

function cautionsOf(reasons: EngineReason[]): string[] {
  const out: string[] = [];
  for (const reason of reasons) {
    if (reason.caution && !PRIVATE_WORDS.test(reason.text) && !out.includes(reason.text)) out.push(reason.text);
  }
  return out;
}

/**
 * Invoer van vóór september 2026 mist de afgeleide velden van recentLoad
 * (days, hoursPerWeek, ridesPerWeek, ...). Die zijn uit de totalen te halen;
 * nieuwe invoer heeft ze altijd.
 */
function withRecentLoadDefaults(input: TrainingAiInput): TrainingAiInput {
  const load = input.recentLoad;
  if (Number.isFinite(load?.ridesPerWeek) && Number.isFinite(load?.hoursPerWeek)) return input;
  const days = Number(load?.days) || 28;
  const weeks = days / 7;
  const hours = Number(load?.hours) || 0;
  const activities = Number(load?.activities) || 0;
  const avg = activities > 0 ? Math.round((hours * 60) / activities) : 60;
  return {
    ...input,
    recentLoad: {
      ...load,
      days,
      hoursPerWeek: Math.round((hours / weeks) * 10) / 10,
      ridesPerWeek: Math.round((activities / weeks) * 10) / 10,
      avgDurationMinutes: Number(load?.avgDurationMinutes) || avg,
      longestRideMinutes: Number(load?.longestRideMinutes) || avg,
    },
  };
}

export function generateEnginePlan(rawInput: TrainingAiInput, fallback?: PlanWindow): EnginePlan {
  const input = withRecentLoadDefaults(rawInput);
  const mode = engineMode(input);

  if (mode === "daily") {
    const plan = input.currentPlan!;
    const result = adaptDay(input, buildSession);
    const changed = result.workouts.length;
    return {
      mode,
      title: plan.title,
      summary: changed
        ? `${changed === 1 ? "Eén training" : `${changed} trainingen`} aangepast op je signalen van vandaag.`
        : "Geen aanpassing nodig: het schema blijft zoals het is.",
      startDate: plan.fromDate,
      endDate: plan.toDate,
      workouts: result.workouts,
      cautions: cautionsOf(result.reasons),
      reasons: result.reasons,
    };
  }

  const window = planWindowOf(input, fallback);
  if (!window) throw new Error("Geen planperiode: planWindow en planUpdate ontbreken.");
  const weeks = planWeeks(input, window);
  const result = composePlan({ input, window, weeks, buildSession });
  // De periodisering neemt de herstelsignalen niet over; hier komen ze één keer bij.
  const signalReasons = recoverySignals(input).reasons;
  const text = planText(input, weeks, [...signalReasons, ...result.reasons]);
  return {
    mode,
    title: text.title,
    summary: text.summary,
    startDate: window.from,
    endDate: window.to,
    workouts: result.workouts,
    cautions: text.cautions,
    reasons: [...signalReasons, ...weeks.flatMap((week) => week.reasons), ...result.reasons],
  };
}
