// Het aanpasbare plan bij een event: de knop Duur, Tempo, Race, de schuifjes
// voor intensiteit, duur en vocht, en "Reken met". Stap 2 van
// docs/eventvoeding-plan.md. Puur en zonder serverimports, zodat de browser bij
// elk schuifje opnieuw rekent; de server levert de planner (eventFuelPlanner).

import {
  AVG_SHARE_OF_NP,
  PRESET_IF,
  bagCap,
  carbMixOf,
  eventFluid,
  gutCap,
  fuelAdvice,
  fuelBalance,
  intakeCap,
  presetFloor,
  presetFor,
  type FuelAdvice,
  type FuelBalance,
  type FuelPreset,
} from "./event-fuel";
import { ridePlanForHolders, type RidePlan, type RidePlanInput } from "./ride-plan";
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

export type PlannerResult = {
  watts: number | null;
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
  return {
    watts: watts == null ? null : Math.round(watts),
    advice,
    adviceG,
    capG: cap.capG,
    capBy: cap.limitedBy,
    perHourG,
    aboveCap: perHourG > cap.capG,
    adviceFluidMl,
    fluidMlPerHour,
    balance:
      watts != null
        ? fuelBalance({ minutes, watts, intensityFactor: choice.intensityFactor, weightKg, intakePerHourG: perHourG })
        : null,
  };
}

/** De invoer voor ridePlan bij deze keuzes. */
export function plannerPlanInput(planner: EventFuelPlanner, choice: PlannerChoice): RidePlanInput {
  const result = plannerResult(planner, choice);
  return {
    ...planner.input,
    minutes: choice.minutes,
    perHourG: result.perHourG,
    fluidMlPerHour: result.fluidMlPerHour,
  };
}

/** De planner zoals de server hem opbouwt: de standaardkeuzes volgen het event. */
export function eventFuelPlanner(input: {
  input: EventFuelPlanner["input"];
  minutes: number;
  intensity: string | null;
  setting: "binnen" | "buiten";
  raceIf: number;
  pacing: EventFuelPlanner["pacing"];
  ftpWatts: number | null;
  temperatureC?: number | null;
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
    defaults: {
      preset: defaultPreset,
      intensityFactor: presetIntensity(base, defaultPreset),
      minutes: input.minutes,
      fluidMlPerHour: null,
      perHourG: null,
    },
  };
}
