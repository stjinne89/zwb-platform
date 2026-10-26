// Blinde vergelijking AI tegen regelmotor (trainerstab "Vergelijken").
//
// Per opgeslagen AI-generatie twee schema's naast elkaar: dat van de AI
// (response_json) en dat van de motor, opnieuw uitgerekend op dezelfde invoer
// (prompt_summary). Welke kant van wie is, ligt vast per generatie-id: elke keer
// dezelfde, maar over alle generaties heen willekeurig verdeeld. De trainer ziet
// het pas nadat het oordeel is opgeslagen; tot dan gaat er geen herkomst naar de
// browser.

import type { GeneratedTrainingPlan, GeneratedWorkout, TrainingAiInput } from "@/lib/training/ai";
import { engineMode, generateEnginePlan, type EngineMode } from "@/lib/training/engine";

/**
 * Alleen generaties van Claude, vanaf de overstap op 2026-10-26. Tot die dag
 * stond hier 2026-09-17 (alle meetlatregels in de prompt), maar de GPT-antwoorden
 * van daarvoor zijn gemaakt zonder de 90-minutenregel en de indoorregel van
 * 2026-10-26, die de motor wel volgt: wie die paren beoordeelt, vergelijkt oude
 * met nieuwe regels in plaats van AI met motor. Oordelen op oudere generaties
 * blijven bewaard maar tellen niet mee.
 */
export const COMPARISON_SINCE = "2026-10-26";
export const COMPARISON_MODEL_PREFIX = "claude";

/** Hoort deze generatie bij de vergelijking? Zelfde grens als de query op de pagina. */
export function isComparableGeneration(row: { model?: string | null; created_at?: string | null } | null | undefined) {
  return Boolean(
    row?.model?.startsWith(COMPARISON_MODEL_PREFIX) && row.created_at && row.created_at >= COMPARISON_SINCE,
  );
}

export const REASON_MAX = 280;

export type Side = "a" | "b";
export type Choice = Side | "gelijk";
export type Winner = "ai" | "engine" | "gelijk";

/** FNV-1a, 32 bits: klein, zonder afhankelijkheden, en goed genoeg gemengd voor uuid's. */
function fnv1a(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Of de motor als A of als B verschijnt. Vast per generatie-id. */
export function engineSide(generationId: string): Side {
  return fnv1a(generationId) % 2 === 0 ? "a" : "b";
}

export function assignSides<T>(generationId: string, ai: T, engine: T): { a: T; b: T; engineSide: Side } {
  const side = engineSide(generationId);
  return side === "a" ? { a: engine, b: ai, engineSide: side } : { a: ai, b: engine, engineSide: side };
}

/** Een keuze voor A, B of gelijk, terugvertaald naar wie er won. */
export function winnerOf(choice: Choice, side: Side): Winner {
  if (choice === "gelijk") return "gelijk";
  return choice === side ? "engine" : "ai";
}

export function parseChoice(value: unknown): Choice | null {
  return value === "a" || value === "b" || value === "gelijk" ? value : null;
}

export type Tally = { total: number; engine: number; ai: number; gelijk: number };

export function tallyVerdicts(rows: Array<{ winner: string }>): Tally {
  const tally: Tally = { total: 0, engine: 0, ai: 0, gelijk: 0 };
  for (const row of rows) {
    if (row.winner !== "engine" && row.winner !== "ai" && row.winner !== "gelijk") continue;
    tally.total += 1;
    tally[row.winner] += 1;
  }
  return tally;
}

/**
 * Wat er van een schema getoond wordt: alleen de workouts. Titel, samenvatting en
 * aandachtspunten van de motor zijn sjabloonzinnen die hem meteen verraden, en
 * zijn redenen noemen regelcodes; die blijven daarom aan beide kanten weg.
 */
export type ComparedWorkout = Pick<
  GeneratedWorkout,
  "date" | "title" | "description" | "durationMinutes" | "intensity" | "structure"
>;

export function comparedWorkouts(plan: Pick<GeneratedTrainingPlan, "workouts">): ComparedWorkout[] {
  const workouts = Array.isArray(plan.workouts) ? plan.workouts : [];
  return workouts
    .filter((workout) => typeof workout?.date === "string")
    .map((workout) => ({
      date: workout.date,
      title: String(workout.title ?? ""),
      description: String(workout.description ?? ""),
      durationMinutes: Number(workout.durationMinutes) || 0,
      intensity: workout.intensity,
      structure: Array.isArray(workout.structure) ? workout.structure : [],
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export type ComparisonPair = {
  mode: EngineMode;
  input: TrainingAiInput;
  ai: ComparedWorkout[];
  engine: ComparedWorkout[];
};

/**
 * Leest een opgeslagen generatie en rekent de motor erop uit. null als de rij
 * niet te vergelijken is: geen volledige invoer (oude rijen hebben daar een korte
 * samenvatting), geen schema van de AI, of de motor faalt.
 */
export function comparisonPair(promptSummary: string | null, responseJson: unknown): ComparisonPair | null {
  let input: TrainingAiInput;
  try {
    input = JSON.parse(promptSummary ?? "") as TrainingAiInput;
  } catch {
    return null;
  }
  const ai = responseJson as Partial<GeneratedTrainingPlan> | null;
  if (!input?.goal || !ai || !Array.isArray(ai.workouts)) return null;
  try {
    const fallback =
      typeof ai.startDate === "string" && typeof ai.endDate === "string"
        ? { from: ai.startDate, to: ai.endDate }
        : undefined;
    const engine = generateEnginePlan(input, fallback);
    return {
      mode: engineMode(input),
      input,
      ai: comparedWorkouts({ workouts: ai.workouts }),
      engine: comparedWorkouts(engine),
    };
  } catch {
    return null;
  }
}

/** Soort generatie, zoals de lijst hem noemt. */
export function comparisonKindLabel(kind: string | null, parentPlanId: string | null) {
  if (kind === "daily") return "Dagelijkse aanpassing";
  if (kind === "day") return "Dag-aanpassing";
  if (kind === "plan_update") return "Bijwerking";
  return parentPlanId ? "Bijwerking" : "Nieuw schema";
}

export type ComparisonDay = {
  date: string;
  a: ComparedWorkout[];
  b: ComparedWorkout[];
  /** Wat er die dag gepland stond vóór de aanpassing (alleen bij dagaanpassingen). */
  was: Array<{ title: string; durationMinutes: number; intensity: string }>;
};

export type ComparisonWeek = { weekStart: string; aMinutes: number; bMinutes: number; days: ComparisonDay[] };

/** Maandag van de week van een datum (YYYY-MM-DD), in kalenderdagen zonder tijdzone. */
export function mondayOf(date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  const offset = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - offset);
  return day.toISOString().slice(0, 10);
}

/**
 * Beide schema's op dezelfde dagen naast elkaar, per week met het totaal aan
 * minuten. Een dag staat erin zodra één van beide kanten er iets plant.
 */
export function comparisonWeeks(
  a: ComparedWorkout[],
  b: ComparedWorkout[],
  was: Array<{ date: string; title: string; durationMinutes: number; intensity: string }> = [],
): ComparisonWeek[] {
  const days = new Map<string, ComparisonDay>();
  const dayOf = (date: string) => {
    let row = days.get(date);
    if (!row) {
      row = { date, a: [], b: [], was: [] };
      days.set(date, row);
    }
    return row;
  };
  for (const workout of a) dayOf(workout.date).a.push(workout);
  for (const workout of b) dayOf(workout.date).b.push(workout);
  for (const workout of was) days.get(workout.date)?.was.push(workout);

  const weeks = new Map<string, ComparisonWeek>();
  for (const day of [...days.values()].sort((left, right) => left.date.localeCompare(right.date))) {
    const weekStart = mondayOf(day.date);
    let week = weeks.get(weekStart);
    if (!week) {
      week = { weekStart, aMinutes: 0, bMinutes: 0, days: [] };
      weeks.set(weekStart, week);
    }
    week.days.push(day);
    week.aMinutes += day.a.reduce((sum, workout) => sum + workout.durationMinutes, 0);
    week.bMinutes += day.b.reduce((sum, workout) => sum + workout.durationMinutes, 0);
  }
  return [...weeks.values()];
}
