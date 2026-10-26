// Literatuurtoets voor trainingsschema's: legt een schema langs drie maatstaven
// uit onderzoek, naast de meetlat (schema-check.ts), die de regels van de prompt
// toetst. Zie docs/regelmotor-literatuurtoets.md voor de bronnen en de uitkomst.
//
//   1. Intensiteitsverdeling (TID): gepolariseerd en piramidaal werken even goed
//      (Rosenblat 2025); een verdeling met meer tijd rond de drempel dan rustig
//      heeft minder steun (Esteve-Lanao 2007, Seiler 2010).
//   2. Taper: twee weken, volume 41-60 % omlaag, intensiteit en frequentie gelijk
//      (Bosquet 2007, Wang 2023).
//   3. Onderbreking: na meer dan tien dagen zonder training begint het verlies
//      (Mujika & Padilla 2000, 2001; de tiendagenregel uit de wetenschappelijke toets).
//      Apart daarvan, zonder bron: of het schema eerder ophoudt dan zijn periode.
//
// Puur en deterministisch. Een schema dat binnen deze grenzen valt, is daarmee
// niet bewezen beter: de literatuur geeft bandbreedtes, geen optimum per lid.

import type { GeneratedWorkout, TrainingAiInput } from "@/lib/training/ai";
import { normalizeWorkoutBlocks, type WorkoutIntensity } from "@/lib/training/workouts";

/** Seilers drie zones, benaderd via de intensity van een blok (%FTP, niet gemeten drempels). */
export type SeilerZone = 1 | 2 | 3;

const ZONE_OF: Partial<Record<WorkoutIntensity, SeilerZone>> = {
  recovery: 1,
  endurance: 1,
  tempo: 2,
  threshold: 2,
  vo2max: 3,
  anaerobic: 3,
  // race en rest tellen niet mee: een race is geen geplande verdeling, rust geen training.
};

export type ZoneMinutes = { z1: number; z2: number; z3: number };

export function zoneMinutes(workouts: Pick<GeneratedWorkout, "intensity" | "durationMinutes" | "structure">[]): ZoneMinutes {
  const out: ZoneMinutes = { z1: 0, z2: 0, z3: 0 };
  for (const workout of workouts) {
    const blocks = normalizeWorkoutBlocks(workout.structure, workout.intensity as WorkoutIntensity);
    const parts = blocks.length
      ? blocks.map((block) => ({ intensity: block.intensity, minutes: block.durationMinutes }))
      : [{ intensity: workout.intensity as WorkoutIntensity, minutes: Number(workout.durationMinutes) || 0 }];
    for (const part of parts) {
      const zone = ZONE_OF[part.intensity];
      if (zone) out[`z${zone}`] += part.minutes;
    }
  }
  return out;
}

export type TidKind = "gepolariseerd" | "piramidaal" | "drempel" | "hoog" | "basis" | "overig" | "leeg";

/** Gesteund door de literatuur, minder gesteund, of afhankelijk van de fase. */
export type TidSupport = "gesteund" | "minder" | "fase";

export const TID_SUPPORT: Record<TidKind, TidSupport> = {
  gepolariseerd: "gesteund",
  piramidaal: "gesteund",
  drempel: "minder",
  hoog: "minder",
  basis: "fase",
  overig: "fase",
  leeg: "fase",
};

/**
 * Polarisatie-index van Treff 2019: log10(Z1/Z2 · Z3 · 100) met aandelen 0-1;
 * boven 2,00 is gepolariseerd. Zonder Z3 is er geen index. Zonder Z2 maar met Z3
 * zou hij oneindig zijn; dat telt hier als gepolariseerd (eigen keuze).
 */
export function polarizationIndex(zones: ZoneMinutes): number | null {
  const total = zones.z1 + zones.z2 + zones.z3;
  if (total <= 0 || zones.z3 <= 0) return null;
  if (zones.z2 <= 0) return Number.POSITIVE_INFINITY;
  return Math.log10((zones.z1 / zones.z2) * (zones.z3 / total) * 100);
}

/**
 * Soort verdeling. Volgorde van de toetsen: leeg, basis (minder dan 5 % boven
 * zone 1), hoog (zone 3 minstens zone 1), drempel (zone 2 minstens zone 1),
 * gepolariseerd (index > 2), piramidaal (Z1 > Z2 > Z3), anders overig.
 */
export function tidKind(zones: ZoneMinutes): TidKind {
  const total = zones.z1 + zones.z2 + zones.z3;
  if (total <= 0) return "leeg";
  if ((zones.z2 + zones.z3) / total < 0.05) return "basis";
  if (zones.z3 >= zones.z1) return "hoog";
  if (zones.z2 >= zones.z1) return "drempel";
  const index = polarizationIndex(zones);
  if (index != null && index > 2) return "gepolariseerd";
  if (zones.z1 > zones.z2 && zones.z2 > zones.z3) return "piramidaal";
  return "overig";
}

// ---------------------------------------------------------------------------
// Datums
// ---------------------------------------------------------------------------

function shiftDays(date: string, days: number) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Taper
// ---------------------------------------------------------------------------

export const TAPER_DAYS = 14;
const PRE_TAPER_DAYS = 21;
const PEAK_GOAL_TYPES = new Set(["outdoor_event", "gran_fondo"]);

/** De piekmomenten waar een taper bij hoort: zelfde ankers als de meetlat. */
export function taperAnchors(input: TrainingAiInput): string[] {
  const anchors = [
    ...(PEAK_GOAL_TYPES.has(input.goal?.type) && input.goal?.targetDate && !input.planWindow?.goalBeyond
      ? [input.goal.targetDate]
      : []),
    ...(input.seasonPlan?.targets ?? []).filter((target) => target.priority === "a").map((target) => target.date),
  ];
  return [...new Set(anchors)].sort();
}

export type TaperResult = {
  anchor: string;
  /** Volumedaling per week in de taper tegen de drie weken ervoor, 0-1. */
  reduction: number;
  volumeOk: boolean;
  /** Er zit nog werk in zone 2 of 3 in de taper, als dat er ervoor ook was. */
  intensityKept: boolean;
  /** Trainingen per week in de taper minstens 80 % van ervoor (eigen grens). */
  frequencyKept: boolean;
};

type Dated = Pick<GeneratedWorkout, "date" | "intensity" | "durationMinutes" | "structure">;

function weekly(workouts: Dated[], from: string, to: string, days: number) {
  const inside = workouts.filter((workout) => workout.date >= from && workout.date <= to);
  const minutes = inside.reduce((sum, workout) => sum + (Number(workout.durationMinutes) || 0), 0);
  const zones = zoneMinutes(inside);
  return {
    minutes: (minutes / days) * 7,
    sessions: (inside.filter((workout) => (Number(workout.durationMinutes) || 0) > 0).length / days) * 7,
    hard: zones.z2 + zones.z3 > 0,
  };
}

/**
 * Toetst de taper naar het eerste piekmoment waarvoor de taper én de drie weken
 * ervoor helemaal binnen de periode van het schema vallen. null als er zo geen is.
 */
export function checkTaper(input: TrainingAiInput, workouts: Dated[], window: { from: string; to: string }): TaperResult | null {
  for (const anchor of taperAnchors(input)) {
    const taperFrom = shiftDays(anchor, -TAPER_DAYS);
    const preFrom = shiftDays(taperFrom, -PRE_TAPER_DAYS);
    if (preFrom < window.from || anchor > window.to) continue;
    const pre = weekly(workouts, preFrom, shiftDays(taperFrom, -1), PRE_TAPER_DAYS);
    if (pre.minutes <= 0) continue;
    const taper = weekly(workouts, taperFrom, shiftDays(anchor, -1), TAPER_DAYS);
    const reduction = 1 - taper.minutes / pre.minutes;
    return {
      anchor,
      reduction,
      volumeOk: reduction >= 0.41 && reduction <= 0.6,
      intensityKept: !pre.hard || taper.hard,
      frequencyKept: taper.sessions >= pre.sessions * 0.8,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Onderbreking
// ---------------------------------------------------------------------------

export const MAX_GAP_DAYS = 10;

function trainedDays(input: TrainingAiInput, workouts: Dated[]) {
  return new Set(
    [...workouts, ...(input.fixedWorkouts ?? [])]
      .filter((workout) => (Number(workout.durationMinutes) || 0) > 0)
      .map((workout) => workout.date),
  );
}

/**
 * De langste reeks dagen zonder training, van het begin van de periode tot de
 * laatste training. Rustperiodes uit het jaarplan tellen niet als gat. Wat na de
 * laatste training komt, is geen onderbreking maar een schema dat eerder stopt:
 * dat meet `trailingDays`.
 */
export function longestGap(input: TrainingAiInput, workouts: Dated[], window: { from: string; to: string }): number {
  const trained = trainedDays(input, workouts);
  const last = [...trained].filter((date) => date >= window.from && date <= window.to).sort().at(-1);
  if (!last) return 0;
  const rest = (input.seasonPlan?.periods ?? []).filter((period) => period.kind === "rust");
  const excused = (date: string) => rest.some((period) => date >= period.from && date <= period.to);
  let longest = 0;
  let run = 0;
  for (let index = 0; index <= daysBetween(window.from, last); index++) {
    const date = shiftDays(window.from, index);
    if (trained.has(date) || excused(date)) {
      run = 0;
      continue;
    }
    run += 1;
    longest = Math.max(longest, run);
  }
  return longest;
}

/** Dagen tussen de laatste training en het einde van de periode; de hele periode als er niets staat. */
export function trailingDays(input: TrainingAiInput, workouts: Dated[], window: { from: string; to: string }): number {
  const last = [...trainedDays(input, workouts)].filter((date) => date >= window.from && date <= window.to).sort().at(-1);
  return last ? daysBetween(last, window.to) : daysBetween(window.from, window.to) + 1;
}

// ---------------------------------------------------------------------------
// Samen
// ---------------------------------------------------------------------------

export type LiteratureResult = {
  zones: ZoneMinutes;
  tid: TidKind;
  taper: TaperResult | null;
  longestGap: number;
  gapTooLong: boolean;
  /** Geen literatuurregel: het schema houdt meer dan tien dagen vóór het einde op. */
  trailingDays: number;
  endsEarly: boolean;
};

export function checkLiterature(
  input: TrainingAiInput,
  workouts: Dated[],
  window: { from: string; to: string },
): LiteratureResult {
  const inWindow = workouts.filter((workout) => workout.date >= window.from && workout.date <= window.to);
  const zones = zoneMinutes(inWindow);
  const gap = longestGap(input, inWindow, window);
  const tail = trailingDays(input, inWindow, window);
  return {
    zones,
    tid: tidKind(zones),
    taper: checkTaper(input, inWindow, window),
    longestGap: gap,
    gapTooLong: gap > MAX_GAP_DAYS,
    trailingDays: tail,
    endsEarly: tail > MAX_GAP_DAYS,
  };
}
