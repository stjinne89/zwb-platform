// Het aanpasbare plan bij een event: de knop Duur, Tempo, Race, de schuifjes
// voor intensiteit, duur en vocht, en "Reken met". Stap 2 van
// docs/eventvoeding-plan.md. Puur en zonder serverimports, zodat de browser bij
// elk schuifje opnieuw rekent; de server levert de planner (eventFuelPlanner).

import {
  AVG_SHARE_OF_NP,
  DEFAULT_OUTDOOR_C,
  FUEL_PRESETS,
  PRESET_IF,
  bagCap,
  carbMixOf,
  eventFluid,
  estimatedSweatPerHour,
  gutCap,
  needsSalt,
  fuelAdvice,
  fuelBalance,
  intakeCap,
  presetFloor,
  presetFor,
  type FuelAdvice,
  type FuelBalance,
  type FuelPreset,
} from "./event-fuel";
import { ridePlanForHolders, type RideAccent, type RidePlan, type RidePlanInput } from "./ride-plan";
import type { Recipe } from "./recipes";
import { DEFAULT_BIDON_ML, fluidMl, fluidPerHour } from "./sweat";
import { REFERENCE_RIDER } from "./targets";

/** De keuzes in het scherm. Null bij vocht en Reken met: het advies volgen. */
export type PlannerChoice = {
  preset: FuelPreset;
  intensityFactor: number;
  minutes: number;
  fluidMlPerHour: number | null;
  perHourG: number | null;
};

export type EventFuelPlanner = {
  /** Alles voor ridePlan behalve het doel en het vocht. */
  input: Omit<RidePlanInput, "perHourG" | "fluidMlPerHour" | "holders">;
  /** De verwachte duur: pacingplan, eigen training of schatting (eventRide). */
  expectedMinutes: number;
  defaultPreset: FuelPreset;
  /** Uit het eigen pacingplan; gemiddeld vermogen en IF tegen CP. */
  pacing: { watts: number; intensityFactor: number } | null;
  ftpWatts: number | null;
  /** De IF die het racemodel van het event verwacht (events.ts). */
  raceIf: number;
  setting: "binnen" | "buiten";
  temperatureC: number | null;
  /** Klimmen en sprints uit het pacingplan, op de verwachte duur; leeg zonder plan. */
  accents: RideAccent[];
  defaults: PlannerChoice;
};

/** Grenzen van de schuifjes en het veld. Reken met tot 150: besluit 3. */
export const PLANNER_LIMITS = {
  intensityFactor: { min: 0.5, max: 1.05, step: 0.01 },
  minutes: { min: 20, step: 5 },
  fluidMlPerHour: { min: 0, max: 2000, step: 50 },
  perHourG: { min: 0, max: 150, step: 5 },
} as const;

/** Het duurschuifje loopt tot twee keer de verwachte duur, minstens 4 en hoogstens 12 uur. */
export function maxPlannerMinutes(expectedMinutes: number): number {
  return Math.min(720, Math.max(240, Math.ceil((expectedMinutes * 2) / 30) * 30));
}

/** De IF bij een stand van de knop: het pacingplan als dat bij de zwaarte van het event hoort. */
export function presetIntensity(planner: Pick<EventFuelPlanner, "pacing" | "raceIf" | "defaultPreset">, preset: FuelPreset): number {
  if (planner.pacing && preset === planner.defaultPreset) return round2(planner.pacing.intensityFactor);
  return preset === "race" ? round2(planner.raceIf) : PRESET_IF[preset];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round50(value: number): number {
  return Math.round(value / 50) * 50;
}

/**
 * Het gemiddelde vermogen bij een IF. Met een pacingplan: de verhouding daaruit
 * (zijn IF is tegen CP, het vermogen al een gemiddelde). Anders IF × FTP, en dat
 * is NP: daarom het deel AVG_SHARE_OF_NP. Null zonder pacingplan en FTP.
 */
export function plannerWatts(
  planner: Pick<EventFuelPlanner, "pacing" | "ftpWatts">,
  preset: FuelPreset,
  intensityFactor: number,
): number | null {
  if (planner.pacing) return (planner.pacing.watts / planner.pacing.intensityFactor) * intensityFactor;
  if (planner.ftpWatts) return planner.ftpWatts * intensityFactor * AVG_SHARE_OF_NP[preset];
  return null;
}

/**
 * Het vermogen dat bij de IF hoort, zoals de renner het kent: IF × FTP, met een
 * pacingplan IF × CP. Voor het scherm; het verbruik rekent met het gemiddelde
 * (plannerWatts), dat bij een wisselende rit lager ligt.
 */
export function plannerTargetWatts(
  planner: Pick<EventFuelPlanner, "pacing" | "ftpWatts">,
  intensityFactor: number,
): number | null {
  if (planner.pacing) return (planner.pacing.watts / planner.pacing.intensityFactor) * intensityFactor;
  if (planner.ftpWatts) return planner.ftpWatts * intensityFactor;
  return null;
}

export type PlannerResult = {
  /** Gemiddeld vermogen, waar het verbruik mee rekent. */
  watts: number | null;
  /** IF × FTP of IF × CP: wat in beeld staat (plannerTargetWatts). */
  targetWatts: number | null;
  /** Null zonder vermogen: dan geldt alleen de ondergrens van de knop, binnen de opnamegrens. */
  advice: FuelAdvice | null;
  adviceG: number;
  capG: number;
  /** Wat de grens zet: je darm of wat je meeneemt (de soort koolhydraten, 0328). */
  capBy: "darm" | "tas";
  /** Waar het plan mee rekent: Reken met, anders het advies. */
  perHourG: number;
  aboveCap: boolean;
  adviceFluidMl: number;
  fluidMlPerHour: number;
  /** Zout in elke bidon: veel zweetverlies of warm (besluit 9). */
  salt: boolean;
  /** De temperatuur waarmee het vocht buiten rekent; null binnen. */
  temperatureC: number | null;
  /** De balans bij het getal waarmee het plan rekent; null zonder vermogen. */
  balance: FuelBalance | null;
};

/**
 * De grens van de tas: wat het plan bij dit doel meeneemt, gewogen naar gram
 * koolhydraten per soort (bagCap). Null zonder koolhydraten in het plan, en
 * zolang 0328 er niet is (de recepten hebben dan geen carb_mix): anders zou
 * elk clubrecept als onbekend op 60 uitkomen.
 */
export function planBagCap(plan: RidePlan | null, recipes: readonly Recipe[]): number | null {
  if (!plan) return null;
  if (recipes.some((recipe) => recipe.carb_mix === undefined)) return null;
  const bySlug = new Map(recipes.map((recipe) => [recipe.slug, recipe]));
  const items = [...plan.bidons, ...(plan.solid ? [plan.solid] : [])].flatMap((item) =>
    item.recipe && item.carbsG > 0
      ? [{ carbsG: item.carbsG * item.count, mix: carbMixOf(bySlug.get(item.recipe.slug) ?? {}) }]
      : [],
  );
  return bagCap(items);
}

/**
 * De tasgrens bij deze keuzes. Wat er meegaat, hangt af van het doel (eerst
 * bidons, dan vast eten), dus eerst het plan op de grens van de darm, en ligt
 * de tas lager, nog eens op die lagere grens.
 */
function bagCapFor(planner: EventFuelPlanner, minutes: number, fluidMlPerHour: number): number | null {
  const { input } = planner;
  const recipes = [input.lead, ...input.ranked].filter((recipe): recipe is Recipe => recipe != null);
  const at = (perHourG: number) =>
    planBagCap(ridePlanForHolders({ ...input, minutes, perHourG, fluidMlPerHour }), recipes);
  const fromGut = gutCap(minutes, input.gut ?? null);
  const first = at(fromGut);
  if (first == null || first >= fromGut) return first;
  return at(first) ?? first;
}

export function plannerResult(planner: EventFuelPlanner, choice: PlannerChoice): PlannerResult {
  const { input } = planner;
  const minutes = choice.minutes;
  const weightKg = input.weightKg ?? REFERENCE_RIDER.weightKg;
  const watts = plannerWatts(planner, choice.preset, choice.intensityFactor);
  const targetWatts = plannerTargetWatts(planner, choice.intensityFactor);
  const floorG = presetFloor(choice.preset, minutes);

  const fluid =
    watts != null
      ? eventFluid({
          minutes,
          watts,
          setting: planner.setting,
          temperatureC: planner.temperatureC,
          weightKg: input.weightKg ?? null,
          sweatTestMlPerHour: input.sweatMlPerHour ?? null,
        })
      : input.sweatMlPerHour
        ? fluidPerHour(input.sweatMlPerHour, input.weightKg ?? null, minutes)
        : null;
  const adviceFluidMl = fluid && minutes > 0 ? round50((fluidMl(fluid, minutes) * 60) / minutes) : DEFAULT_BIDON_ML;
  const fluidMlPerHour = choice.fluidMlPerHour ?? adviceFluidMl;

  const bag = bagCapFor(planner, minutes, fluidMlPerHour);
  const advice =
    watts != null
      ? fuelAdvice({
          minutes,
          watts,
          intensityFactor: choice.intensityFactor,
          weightKg,
          floorG,
          gut: input.gut ?? null,
          bag,
        })
      : null;
  const cap = advice?.cap ?? intakeCap(minutes, input.gut ?? null, bag);
  const training = input.gut?.weekGrams != null && minutes >= input.gut.minMinutes;
  const adviceG = advice?.perHourG ?? (training ? input.gut!.weekGrams! : Math.min(cap.capG, floorG));

  const perHourG = choice.perHourG ?? adviceG;
  const sweatMlPerHour =
    input.sweatMlPerHour ?? (watts != null ? estimatedSweatPerHour(watts, planner.setting, planner.temperatureC) : null);
  return {
    watts: watts == null ? null : Math.round(watts),
    targetWatts: targetWatts == null ? null : Math.round(targetWatts),
    advice,
    adviceG,
    capG: cap.capG,
    capBy: cap.limitedBy,
    perHourG,
    aboveCap: perHourG > cap.capG,
    adviceFluidMl,
    fluidMlPerHour,
    salt: needsSalt({ sweatMlPerHour, minutes, setting: planner.setting, temperatureC: planner.temperatureC }),
    temperatureC: planner.setting === "buiten" ? (planner.temperatureC ?? DEFAULT_OUTDOOR_C) : null,
    balance:
      watts != null
        ? fuelBalance({ minutes, watts, intensityFactor: choice.intensityFactor, weightKg, intakePerHourG: perHourG })
        : null,
  };
}

/** De invoer voor ridePlan bij deze keuzes. */
export function plannerPlanInput(planner: EventFuelPlanner, choice: PlannerChoice): RidePlanInput {
  const result = plannerResult(planner, choice);
  // Rijd je langer of korter dan het pacingplan, dan schuiven de accenten mee.
  const scale = planner.expectedMinutes > 0 ? choice.minutes / planner.expectedMinutes : 1;
  return {
    ...planner.input,
    minutes: choice.minutes,
    perHourG: result.perHourG,
    fluidMlPerHour: result.fluidMlPerHour,
    intensityFactor: choice.intensityFactor,
    accents: planner.accents.map((accent) => ({
      ...accent,
      startMin: accent.startMin * scale,
      endMin: accent.endMin * scale,
    })),
  };
}

/** De planner zoals de server hem opbouwt: de standaardkeuzes volgen het event. */
export function eventFuelPlanner(input: {
  input: EventFuelPlanner["input"];
  /** De verwachte duur. */
  minutes: number;
  /** De duur waar het plan standaard mee rekent: de verwachte duur met marge (event-duration.ts). */
  planMinutes?: number;
  intensity: string | null;
  setting: "binnen" | "buiten";
  raceIf: number;
  pacing: EventFuelPlanner["pacing"];
  ftpWatts: number | null;
  temperatureC?: number | null;
  accents?: RideAccent[];
}): EventFuelPlanner {
  const defaultPreset = presetFor(input.intensity);
  const base = { pacing: input.pacing, raceIf: input.raceIf, defaultPreset };
  return {
    input: input.input,
    expectedMinutes: input.minutes,
    defaultPreset,
    pacing: input.pacing,
    ftpWatts: input.ftpWatts,
    raceIf: input.raceIf,
    setting: input.setting,
    temperatureC: input.temperatureC ?? null,
    accents: input.accents ?? [],
    defaults: {
      preset: defaultPreset,
      intensityFactor: presetIntensity(base, defaultPreset),
      minutes: Math.min(maxPlannerMinutes(input.minutes), input.planMinutes ?? input.minutes),
      fluidMlPerHour: null,
      perHourG: null,
    },
  };
}

export function sameChoice(a: PlannerChoice, b: PlannerChoice): boolean {
  return (
    a.preset === b.preset &&
    a.intensityFactor === b.intensityFactor &&
    a.minutes === b.minutes &&
    a.fluidMlPerHour === b.fluidMlPerHour &&
    a.perHourG === b.perHourG
  );
}

/**
 * Een bewaarde keuze per lid per event (0329, besluit 7). Naast de keuzes zelf
 * het getal en het vocht waarmee het plan rekende: de herinnering en
 * Boodschappen hebben de planner niet en nemen die over.
 */
export type EventFuelRow = {
  preset: FuelPreset;
  intensity_factor: number;
  minutes: number;
  fluid_ml_per_hour: number | null;
  per_hour_g: number | null;
  plan_g_per_hour: number;
  plan_fluid_ml_per_hour: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stepped(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Een keuze binnen de grenzen van de schuifjes, of null als er niets bruikbaars
 * in staat. Voor wat de browser stuurt en voor wat er bewaard is.
 */
export function plannerChoiceFrom(
  planner: Pick<EventFuelPlanner, "expectedMinutes">,
  raw: {
    preset?: unknown;
    intensityFactor?: unknown;
    minutes?: unknown;
    fluidMlPerHour?: unknown;
    perHourG?: unknown;
  },
): PlannerChoice | null {
  const presets: readonly unknown[] = FUEL_PRESETS;
  if (!presets.includes(raw.preset)) return null;
  const intensityFactor = Number(raw.intensityFactor);
  const minutes = Number(raw.minutes);
  if (!Number.isFinite(intensityFactor) || !Number.isFinite(minutes)) return null;
  const optional = (value: unknown, limit: { min: number; max: number; step: number }) => {
    if (value == null || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? clamp(stepped(number, limit.step), limit.min, limit.max) : null;
  };
  const { intensityFactor: ifLimit, minutes: minuteLimit } = PLANNER_LIMITS;
  return {
    preset: raw.preset as FuelPreset,
    intensityFactor: round2(clamp(intensityFactor, ifLimit.min, ifLimit.max)),
    minutes: clamp(stepped(minutes, minuteLimit.step), minuteLimit.min, maxPlannerMinutes(planner.expectedMinutes)),
    fluidMlPerHour: optional(raw.fluidMlPerHour, PLANNER_LIMITS.fluidMlPerHour),
    // Reken met neemt elk heel getal aan, niet alleen stappen van 5.
    perHourG: optional(raw.perHourG, { ...PLANNER_LIMITS.perHourG, step: 1 }),
  };
}

export function choiceFromRow(planner: Pick<EventFuelPlanner, "expectedMinutes">, row: EventFuelRow): PlannerChoice | null {
  return plannerChoiceFrom(planner, {
    preset: row.preset,
    intensityFactor: row.intensity_factor,
    minutes: row.minutes,
    fluidMlPerHour: row.fluid_ml_per_hour,
    perHourG: row.per_hour_g,
  });
}

export function eventFuelRow(planner: EventFuelPlanner, choice: PlannerChoice): EventFuelRow {
  const result = plannerResult(planner, choice);
  return {
    preset: choice.preset,
    intensity_factor: choice.intensityFactor,
    minutes: choice.minutes,
    fluid_ml_per_hour: choice.fluidMlPerHour,
    per_hour_g: choice.perHourG,
    plan_g_per_hour: clamp(Math.round(result.perHourG), PLANNER_LIMITS.perHourG.min, PLANNER_LIMITS.perHourG.max),
    plan_fluid_ml_per_hour: clamp(
      Math.round(result.fluidMlPerHour),
      PLANNER_LIMITS.fluidMlPerHour.min,
      PLANNER_LIMITS.fluidMlPerHour.max,
    ),
  };
}

/** Wat een bewaarde keuze aan ridePlan meegeeft, buiten de eventpagina. */
export type SavedRideFuel = { minutes: number; perHourG: number; fluidMlPerHour: number };

export function savedRideFuel(row: Pick<EventFuelRow, "minutes" | "plan_g_per_hour" | "plan_fluid_ml_per_hour">): SavedRideFuel | null {
  const minutes = Number(row.minutes);
  const perHourG = Number(row.plan_g_per_hour);
  const fluidMlPerHour = Number(row.plan_fluid_ml_per_hour);
  if (![minutes, perHourG, fluidMlPerHour].every(Number.isFinite) || minutes <= 0) return null;
  return { minutes, perHourG, fluidMlPerHour };
}
