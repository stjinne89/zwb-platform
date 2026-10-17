// De eigen regelmotor: een trainingsschema uit precies dezelfde invoer als de AI
// (TrainingAiInput) en in precies dezelfde vorm (GeneratedTrainingPlan), zonder
// taalmodel. Zo kan hij naast de AI draaien op elke opgeslagen generatie
// (prompt_summary bewaart de volledige invoer) en beoordeelt de meetlat beide
// schema's met dezelfde regels. Zie docs/eigen-regelmotor.md.
//
// Dit bestand is het contract tussen de onderdelen, die los van elkaar worden
// gebouwd:
//
//   catalog.ts       vorm + tijd + niveau → een uitgeschreven sessie
//   periodization.ts invoer + venster → per week soort, volume en sleutelsessies
//   compose.ts       weken + catalogus → workouts op dagen
//   daily.ts         lopend schema + signalen van vandaag → gewijzigde workouts
//   index.ts         kiest de modus en levert een GeneratedTrainingPlan
//
// Alles is puur en deterministisch: dezelfde invoer geeft altijd hetzelfde
// schema. Geen Date.now(), geen Math.random(); "vandaag" komt uit de invoer.

import type { GeneratedTrainingPlan, GeneratedWorkout, TrainingAiInput } from "@/lib/training/ai";
import type { WorkoutBlock, WorkoutIntensity } from "@/lib/training/workouts";

export type { GeneratedTrainingPlan, GeneratedWorkout, TrainingAiInput };

/** Nieuw blok, herziening van een lopend schema, of de aanpassing van vandaag. */
export type EngineMode = "plan" | "plan_update" | "daily";

/**
 * Een besluit van een regel, met de reden erbij. Wordt de tekst van summary en
 * cautions, en maakt in tests zichtbaar wélke regel iets deed.
 */
export type EngineReason = {
  /** Vaste code, bv. "volume.herstelweek" of "dag.te_moe". */
  rule: string;
  /** De dag, of de maandag van de week, waar het over gaat. */
  date?: string;
  /** Eén korte Nederlandse zin, zonder klachten of gezondheidsgegevens bij naam. */
  text: string;
  /** true: het lid of de trainer moet dit weten (cautions). false: alleen uitleg. */
  caution: boolean;
};

// ---------------------------------------------------------------------------
// Catalogus (catalog.ts)
// ---------------------------------------------------------------------------

/**
 * Sessievormen van de motor. Fijner dan TRAINING_FORMS: rustige en intensieve
 * duur zijn verschillende sessies (de prompt noemt ze apart), en de lange rit
 * en de openers vóór een race of test hebben hun eigen opbouw.
 */
export const SESSION_FORMS = [
  "herstel",
  "rustige_duur",
  "intensieve_duur",
  "lange_duur",
  "tempo",
  "sweetspot",
  "drempel",
  "vo2max",
  "anaeroob",
  "sprint",
  "openers",
] as const;
export type SessionForm = (typeof SESSION_FORMS)[number];

/** Vormen die als sleutelsessie tellen: hiertussen hoort herstel. */
export const KEY_SESSION_FORMS: ReadonlySet<SessionForm> = new Set([
  "sweetspot",
  "drempel",
  "vo2max",
  "anaeroob",
  "sprint",
]);

export type SessionRequest = {
  form: SessionForm;
  /** Gewenste duur in minuten; de catalogus komt zo dicht mogelijk in de buurt. */
  targetMinutes: number;
  /** Harde bovengrens (beschikbaarheid van die dag). Nooit overschrijden. */
  maxMinutes: number;
  ftpWatts: number | null;
  /**
   * 0 = begin van de opbouw, 1 = zwaarste week. Schaalt de kern: meer of langere
   * herhalingen, binnen de grenzen van de promptregels (drempel ≥ 15 min op
   * 90-95 %, boven 100 % alleen in blokken tot 8 min).
   */
  level: number;
  /** Deterministische variatie (bv. weeknummer): zelfde getal, zelfde sessie. */
  variant: number;
  /** Protocol lage cadans loopt: notitie bij vo2max-, anaerobe en sprintblokken. */
  lowCadence?: boolean;
};

export type CatalogSession = {
  form: SessionForm;
  /** Kort en herkenbaar, hooguit 30 tekens: "Sweet spot 2x20", "Rustige duur 90 min". */
  title: string;
  description: string;
  intensity: WorkoutIntensity;
  targetType: "power" | "rpe";
  blocks: WorkoutBlock[];
  /** Som van de blokken. */
  durationMinutes: number;
  methodLabel: "geen" | "veelbelovend" | "experimenteel";
};

/** null: de vorm past niet in maxMinutes (te kort voor een zinvolle kern). */
export type BuildSession = (request: SessionRequest) => CatalogSession | null;

// ---------------------------------------------------------------------------
// Periodisering (periodization.ts)
// ---------------------------------------------------------------------------

export const WEEK_KINDS = [
  /** Gewone opbouwweek; volume groeit ~10 % per week. */
  "opbouw",
  /** Laatste en zwaarste opbouwweek vóór een herstelweek: ≥ 85 % van het plafond. */
  "piek",
  /** 60-70 % van de week ervoor. */
  "herstel",
  /** Naar een A-mikpunt of een event met één piekmoment: 40-60 % minder volume. */
  "taper",
  /** Trainingskamp: 1,5-2x het normale volume, alleen binnen de kampperiode. */
  "kamp",
  /** Periode 'rust' (vakantie): geen training. */
  "rust",
  /** Periode 'rustig': ongeveer de helft, geen sleutelsessies. */
  "rustig",
  /** Eerste twee weken na een rustperiode van meer dan tien dagen. */
  "heropbouw",
] as const;
export type WeekKind = (typeof WEEK_KINDS)[number];

export type WeekPlan = {
  /** Maandag van de week, ook als het venster midweeks begint. */
  weekStart: string;
  /** Het deel van de week dat binnen het venster valt. */
  from: string;
  to: string;
  kind: WeekKind;
  /**
   * Beoogde trainingsminuten over [from, to], inclusief vaste afspraken
   * (fixedWorkouts) en zonder de optionele rit op een rustdag.
   */
  targetMinutes: number;
  /** Beschikbare minuten over [from, to] volgens availability; null = onbekend. */
  capacityMinutes: number | null;
  /** Aantal sleutelsessies (KEY_SESSION_FORMS) deze week, inclusief een race. */
  keySessions: number;
  /** 0-1, voor SessionRequest.level. */
  level: number;
  /** Doelduur van de lange rit deze week, of null als er geen hoort. */
  longRideMinutes: number | null;
  reasons: EngineReason[];
};

// ---------------------------------------------------------------------------
// Samenstellen (compose.ts) en dag-aanpassing (daily.ts)
// ---------------------------------------------------------------------------

export type PlanWindow = { from: string; to: string };

export type ComposeArgs = {
  input: TrainingAiInput;
  window: PlanWindow;
  weeks: WeekPlan[];
  buildSession: BuildSession;
};

export type EngineResult = {
  workouts: GeneratedWorkout[];
  reasons: EngineReason[];
};

/** Wat index.ts teruggeeft: het AI-formaat plus de redenen erachter. */
export type EnginePlan = GeneratedTrainingPlan & {
  mode: EngineMode;
  reasons: EngineReason[];
};
