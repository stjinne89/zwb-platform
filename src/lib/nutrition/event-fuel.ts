// Het model achter het advies voor eten en drinken bij een event: verbruik bij
// het verwachte vermogen, de balans met de glycogeenvoorraad, de opnamegrens
// van darm en tas, en een vochtschatting zonder zweettest. Stap 1 van
// docs/eventvoeding-plan.md; nog nergens in beeld (dat is stap 2).
//
// Puur en regelgebaseerd. Elke constante hieronder is een aanname met een bron
// of een keuze van ZWB; zie §3 en §6 van docs/voeding-wielrennen.md.

import { fluidPerHour, type FluidTarget } from "./sweat";
import { GUT_HIGH_G_PER_HOUR, rideTargetPerHour, type GutTraining } from "./targets";

/**
 * Bruto-efficiëntie op de fiets: het deel van de energie dat als vermogen op
 * de trappers komt. 18–25% bij getrainde renners (Ettema & Lorås 2009); ZWB
 * rekent met het midden.
 */
export const GROSS_EFFICIENCY = 0.22;
const KJ_PER_KCAL = 4.184;
const KCAL_PER_G_CARB = 4;
/** Verdampingswarmte van zweet bij huidtemperatuur, kJ per gram. */
const LATENT_HEAT_KJ_PER_G = 2.43;

/**
 * Aandeel koolhydraten in de energie, naar IF (vermogen gedeeld door FTP of
 * CP). Vertaling van ZWB uit Romijn et al. 1993 en van Loon et al. 2001: het
 * aandeel stijgt met de intensiteit en vet levert boven ~75% Wmax steeds
 * minder. Tussen de punten lineair, daarbuiten vlak.
 */
const CARB_SHARE_BY_IF: readonly (readonly [number, number])[] = [
  [0.55, 0.45],
  [0.65, 0.58],
  [0.75, 0.7],
  [0.85, 0.82],
  [0.95, 0.92],
];

export function carbShare(intensityFactor: number): number {
  const points = CARB_SHARE_BY_IF;
  if (!Number.isFinite(intensityFactor) || intensityFactor <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    if (intensityFactor <= x1) {
      const [x0, y0] = points[i - 1];
      return y0 + ((intensityFactor - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

export type EnergyPerHour = {
  /** Werk op de trappers, kJ per uur. */
  workKj: number;
  /** Totale energie, kcal per uur. Nooit in beeld (REDs, targets.ts). */
  energyKcal: number;
  /** Warmte die je kwijt moet, kJ per uur. */
  heatKj: number;
};

export function energyPerHour(watts: number): EnergyPerHour {
  const workKj = Math.max(0, watts) * 3.6;
  const energyKj = workKj / GROSS_EFFICIENCY;
  return { workKj, energyKcal: energyKj / KJ_PER_KCAL, heatKj: energyKj - workKj };
}

/** Koolhydraten die je verbrandt, gram per uur. */
export function carbBurnPerHour(watts: number, intensityFactor: number): number {
  return (energyPerHour(watts).energyKcal * carbShare(intensityFactor)) / KCAL_PER_G_CARB;
}

/**
 * Glycogeen dat bij het fietsen te gebruiken is, gram per kg lichaamsgewicht:
 * de beenspieren en de lever, niet de hele spiermassa. Vertaling van ZWB uit
 * Areta & Hopkins 2018 (spierglycogeen in rust naar koolhydraatinname) en Burke
 * et al. 2011 (stapelen). Laden is 36–48 uur 8–12 g/kg (§2 voeding-wielrennen.md).
 */
export const GLYCOGEN_G_PER_KG = { normal: 6, loaded: 8 } as const;
/**
 * Zoveel van de voorraad mag het plan opmaken; de rest is de reserve voor de
 * finale. Keuze van ZWB (besluit 4 van docs/eventvoeding-plan.md).
 */
export const GLYCOGEN_USABLE_SHARE = 0.6;

export function usableGlycogen(weightKg: number, loaded = false): number {
  const perKg = loaded ? GLYCOGEN_G_PER_KG.loaded : GLYCOGEN_G_PER_KG.normal;
  return Math.max(0, weightKg) * perKg * GLYCOGEN_USABLE_SHARE;
}

/**
 * De soort koolhydraten in een recept voor onderweg. Open Food Facts en NEVO
 * geven geen fructose, dus het lid kiest de soort (besluit 5); tot dat
 * gebouwd is (stap 3) kent het ritplan geen soort.
 */
export const CARB_MIXES = ["glucose", "2:1", "1:0.8", "eten", "onbekend"] as const;
export type CarbMix = (typeof CARB_MIXES)[number];

/**
 * Opname per uur per soort. Alleen glucose (maltodextrine, dextrose, zetmeel):
 * ~60, de verzadiging van één transporter (Jeukendrup 2014). 2:1
 * glucose:fructose ~90; 1:0,8 en 1:1 tot ~120 (Podlogar & Wallis 2022). Gewoon
 * eten (banaan, koek, broodje) is een praktische grens van ZWB, geen
 * opnamegrens: kauwen, vezels en volume. Onbekend telt voorzichtig als glucose
 * (besluit 6): veel gels zijn alleen maltodextrine.
 */
export const CARB_MIX_CAP_G_PER_HOUR: Record<CarbMix, number> = {
  glucose: 60,
  "2:1": 90,
  "1:0.8": GUT_HIGH_G_PER_HOUR,
  eten: 60,
  onbekend: 60,
};

/**
 * De grens van wat je meeneemt: het gemiddelde van de soorten, gewogen naar
 * gram koolhydraten. Null zonder koolhydraten in de tas. Het gewogen
 * gemiddelde is een vertaling van ZWB.
 */
export function bagCap(items: readonly { carbsG: number; mix: CarbMix }[]): number | null {
  const carbs = items.filter((item) => item.carbsG > 0);
  const total = carbs.reduce((sum, item) => sum + item.carbsG, 0);
  if (total <= 0) return null;
  return Math.round(carbs.reduce((sum, item) => sum + item.carbsG * CARB_MIX_CAP_G_PER_HOUR[item.mix], 0) / total);
}

/** Zonder darmtraining of keuze voor 120: de bovenkant van de band (targets.ts). */
export const GUT_DEFAULT_CAP_G_PER_HOUR = 90;
const GUT_HIGH_MIN_MINUTES = 150;

/**
 * De grens van de darm: het weekgetal tijdens de darmtraining, 120 voor wie de
 * darmtraining afrondde en dat koos (vanaf 2,5 uur, zoals `rideBand`), anders 90.
 */
export function gutCap(minutes: number, gut?: GutTraining | null): number {
  if (gut?.weekGrams != null && minutes >= gut.minMinutes) return gut.weekGrams;
  if (gut?.high && minutes >= GUT_HIGH_MIN_MINUTES) return GUT_HIGH_G_PER_HOUR;
  return GUT_DEFAULT_CAP_G_PER_HOUR;
}

export type IntakeCap = { capG: number; limitedBy: "darm" | "tas" };

/** Het laagste van darm en tas. */
export function intakeCap(minutes: number, gut?: GutTraining | null, bag?: number | null): IntakeCap {
  const fromGut = gutCap(minutes, gut);
  return bag != null && bag < fromGut ? { capG: bag, limitedBy: "tas" } : { capG: fromGut, limitedBy: "darm" };
}

export type FuelBalance = {
  /** Verbrand over de hele rit, gram. */
  burnG: number;
  /** Gegeten over de hele rit, gram. */
  intakeG: number;
  /** Uit de voorraad, gram; nooit onder nul. */
  fromStoreG: number;
  /** Te gebruiken voorraad, gram (usableGlycogen). */
  usableG: number;
  /** De minuut waarop de voorraad op de reserve komt; null als dat na de finish is. */
  reserveAtMinute: number | null;
};

export function fuelBalance(input: {
  minutes: number;
  watts: number;
  intensityFactor: number;
  weightKg: number;
  intakePerHourG: number;
  loaded?: boolean;
}): FuelBalance {
  const hours = Math.max(0, input.minutes) / 60;
  const burnPerHour = carbBurnPerHour(input.watts, input.intensityFactor);
  const intakePerHour = Math.max(0, input.intakePerHourG);
  const usableG = usableGlycogen(input.weightKg, input.loaded);
  const netPerHour = burnPerHour - intakePerHour;
  const reserveMinute = netPerHour > 0 ? (usableG / netPerHour) * 60 : Number.POSITIVE_INFINITY;
  return {
    burnG: Math.round(burnPerHour * hours),
    intakeG: Math.round(intakePerHour * hours),
    fromStoreG: Math.round(Math.max(0, netPerHour * hours)),
    usableG: Math.round(usableG),
    reserveAtMinute: reserveMinute < input.minutes ? Math.round(reserveMinute) : null,
  };
}

/** Wat je per uur moet eten om de voorraad niet voorbij de reserve te gebruiken. */
export function neededPerHour(input: {
  minutes: number;
  watts: number;
  intensityFactor: number;
  weightKg: number;
  loaded?: boolean;
}): number {
  if (input.minutes <= 0) return 0;
  const hours = input.minutes / 60;
  const burn = carbBurnPerHour(input.watts, input.intensityFactor) * hours;
  return Math.max(0, (burn - usableGlycogen(input.weightKg, input.loaded)) / hours);
}

/** Naar boven op 5 g: afronden naar beneden zou de balans net niet laten sluiten. */
function ceil5(value: number): number {
  return Math.ceil(value / 5 - 1e-9) * 5;
}

export type FuelAdviceInput = {
  minutes: number;
  /** Verwacht gemiddeld vermogen. */
  watts: number;
  /** Verwachte IF (vermogen / FTP of CP). */
  intensityFactor: number;
  weightKg: number;
  /** Zwaarte als WorkoutIntensity, voor de ondergrens (rideTargetPerHour). */
  intensity?: string | null;
  gut?: GutTraining | null;
  /** De grens van wat je meeneemt (bagCap); null of weggelaten: alleen de darm. */
  bag?: number | null;
  loaded?: boolean;
};

export type FuelAdvice = {
  /** Het advies, gram per uur, op 5 g. */
  perHourG: number;
  /** Het doel zoals ZWB het zonder verbruik gaf (rideTargetPerHour); 0 onder een uur. */
  floorG: number;
  /** Wat de balans vraagt, gram per uur. */
  neededG: number;
  cap: IntakeCap;
  balance: FuelBalance;
  /** De balans sluit: de voorraad komt niet voor de finish op de reserve. */
  closes: boolean;
  /** Het advies na laden; gelijk aan perHourG als `loaded` al aan stond. */
  loadedPerHourG: number;
  /** Laden maakt het verschil: zonder sluit het niet en met wel, of het advies wordt lager. */
  loadingHelps: boolean;
};

function advicePerHour(input: FuelAdviceInput, floorG: number, cap: IntakeCap, loaded: boolean): number {
  const { minutes, gut } = input;
  if (gut?.weekGrams != null && minutes >= gut.minMinutes) return gut.weekGrams;
  return Math.min(cap.capG, Math.max(floorG, ceil5(neededPerHour({ ...input, loaded }))));
}

/**
 * Het advies per uur: het hoogste van het oude doel en wat de balans vraagt,
 * begrensd op de opnamegrens. Zo komt het nooit lager uit dan het doel zonder
 * verbruik (besluit 2). Tijdens de darmtraining blijft het weekgetal de
 * opdracht, ook als de balans meer of minder vraagt.
 */
export function fuelAdvice(input: FuelAdviceInput): FuelAdvice {
  const loaded = Boolean(input.loaded);
  const floorG = rideTargetPerHour(input.minutes, input.intensity ?? null, input.gut ?? null) ?? 0;
  const cap = intakeCap(input.minutes, input.gut, input.bag);
  const perHourG = advicePerHour(input, floorG, cap, loaded);
  const balance = fuelBalance({ ...input, loaded, intakePerHourG: perHourG });
  const closes = balance.reserveAtMinute == null;
  const loadedPerHourG = loaded ? perHourG : advicePerHour(input, floorG, cap, true);
  const loadedCloses =
    fuelBalance({ ...input, loaded: true, intakePerHourG: loadedPerHourG }).reserveAtMinute == null;
  return {
    perHourG,
    floorG,
    neededG: Math.round(neededPerHour({ ...input, loaded })),
    cap,
    balance,
    closes,
    loadedPerHourG,
    loadingHelps: !loaded && ((!closes && loadedCloses) || loadedPerHourG < perHourG),
  };
}

/** Rond 15 °C buiten als er geen verwachting is: een gewone rit in voor- of najaar. */
export const DEFAULT_OUTDOOR_C = 15;

/**
 * Het deel van de warmte dat via zweet weg moet. Binnen alles: weinig
 * rijwind (§6 voeding-wielrennen.md). Buiten neemt rijwind een deel mee, minder
 * naarmate het warmer is. Keuze van ZWB, te ijken met zweettests.
 */
const OUTDOOR_SWEAT_SHARE_BY_C: readonly (readonly [number, number])[] = [
  [10, 0.4],
  [20, 0.6],
  [30, 0.9],
  [35, 1],
];

export function sweatShare(setting: "binnen" | "buiten", temperatureC?: number | null): number {
  if (setting === "binnen") return 1;
  const t = temperatureC == null || !Number.isFinite(temperatureC) ? DEFAULT_OUTDOOR_C : temperatureC;
  const points = OUTDOOR_SWEAT_SHARE_BY_C;
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    if (t <= x1) {
      const [x0, y0] = points[i - 1];
      return y0 + ((t - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

/** Geschat zweetverlies, ml per uur, op 50 ml: warmte / verdampingswarmte × het deel via zweet. */
export function estimatedSweatPerHour(
  watts: number,
  setting: "binnen" | "buiten",
  temperatureC?: number | null,
): number {
  const ml = (energyPerHour(watts).heatKj / LATENT_HEAT_KJ_PER_G) * sweatShare(setting, temperatureC);
  return Math.round(ml / 50) * 50;
}

/**
 * Het vochtdoel: uit de eigen zweettest als die er is, anders uit de schatting.
 * Daarna dezelfde regel als met een test (fluidPerHour): onder 2% verlies,
 * niet meer dan je zweet.
 */
export function eventFluid(input: {
  minutes: number;
  watts: number;
  setting: "binnen" | "buiten";
  temperatureC?: number | null;
  weightKg: number | null;
  sweatTestMlPerHour?: number | null;
}): FluidTarget & { estimated: boolean; sweatMlPerHour: number } {
  const tested = input.sweatTestMlPerHour != null && input.sweatTestMlPerHour > 0;
  const sweatMlPerHour = tested
    ? input.sweatTestMlPerHour!
    : estimatedSweatPerHour(input.watts, input.setting, input.temperatureC);
  return { ...fluidPerHour(sweatMlPerHour, input.weightKg, input.minutes), estimated: !tested, sweatMlPerHour };
}

/** Eventtypes die binnen gereden worden (Zwift en MyWhoosh). */
const INDOOR_EVENT_TYPES = new Set(["zrl", "ladder", "flamme_rouge", "src", "zwift"]);

export function eventSetting(eventType: string): "binnen" | "buiten" {
  return INDOOR_EVENT_TYPES.has(eventType) ? "binnen" : "buiten";
}
