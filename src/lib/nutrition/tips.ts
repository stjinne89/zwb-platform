// De voedingstip van vandaag.
//
// Regelgebaseerd, net als recommendSeries voor core en mobiliteit: uitlegbaar,
// toetsbaar en zonder AI die macro's of richtlijnen kan verzinnen. De eerste
// regel die past wint; de volgorde staat in nutritionTipForToday.
//
// Eén harde grens: geen enkele tip vraagt om minder te eten. Bij vermoeidheid is
// de boodschap juist "eet genoeg" (IOC REDs-consensus 2023). De test in
// tests/unit/nutrition-tips.test.ts bewaakt dat de teksten dat volhouden.

import { dayIndex } from "@/lib/training/zwbeterworden";
import {
  FUEL_DAY_LABELS,
  classifyFuelDay,
  isKeyDay,
  totalMinutes,
  type FuelDayType,
  type FuelSession,
} from "./day-type";
import {
  PRE_SLEEP_PROTEIN_G,
  dailyCarbs,
  dailyProtein,
  rideCarbsPerHour,
  recoveryCarbsPerHour,
  type MealMoment,
  type Range,
} from "./targets";

import type { FuelProfile } from "./labels";

export type { FuelProfile } from "./labels";

export type NutritionDayInput = {
  today: string;
  weightKg: number | null;
  plannedToday: FuelSession[];
  ridesToday: FuelSession[];
  plannedTomorrow: FuelSession[];
  readinessState?: "ready" | "caution" | "recovery" | "unknown" | null;
  wellnessState?: "fresh" | "normal" | "fatigued" | "unknown" | null;
};

export type NutritionDay = {
  dayType: FuelDayType;
  tomorrowType: FuelDayType;
  /** Null zonder gewicht: dan tonen we de g/kg-regel in plaats van grammen. */
  carbs: Range | null;
  protein: Range | null;
  /** Koolhydraten per uur voor een rit die vandaag nog komt. */
  rideCarbsPerHour: Range | null;
  /** Duur van de geplande (of anders gereden) rit vandaag, voor tijdens_rit. */
  rideMinutes: number | null;
};

export type NutritionTipKind =
  | "tijdens_rit"
  | "voor_rit"
  | "snel_herstel"
  | "morgen_zwaar"
  | "voor_slapen"
  | "na_rit"
  | "genoeg_eten"
  | "rustdag"
  | "basis";

export type NutritionTip = {
  kind: NutritionTipKind;
  title: string;
  body: string;
  articleSlug: string;
  mealMoment: MealMoment;
  fuelProfile: FuelProfile | null;
};

/** Ritten die om deze tijd of later beginnen, tellen als avondsessie. */
export const EVENING_START_HOUR = 17;

function rank(dayType: FuelDayType) {
  return ["rust", "licht", "matig", "zwaar", "lang", "wedstrijd"].indexOf(dayType);
}

export function nutritionDay(input: NutritionDayInput): NutritionDay {
  const planned = classifyFuelDay(input.plannedToday);
  const ridden = classifyFuelDay(input.ridesToday);
  const dayType = rank(ridden) > rank(planned) ? ridden : planned;
  const weight = input.weightKg && input.weightKg > 0 ? input.weightKg : null;

  const stillToRide = input.ridesToday.length === 0 ? totalMinutes(input.plannedToday) : 0;
  const rideMinutes = totalMinutes(input.plannedToday) || totalMinutes(input.ridesToday) || null;

  return {
    dayType,
    tomorrowType: classifyFuelDay(input.plannedTomorrow),
    carbs: weight ? dailyCarbs(dayType, weight) : null,
    protein: weight ? dailyProtein(weight) : null,
    rideCarbsPerHour: stillToRide > 0 ? rideCarbsPerHour(stillToRide) : null,
    rideMinutes,
  };
}

function pick(today: string, kind: string, variants: string[]): string {
  return variants[dayIndex(`${today}:${kind}`, variants.length)];
}

function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} minuten`;
  return m === 0 ? `${h} uur` : `${h}u${String(m).padStart(2, "0")}`;
}

function grams(range: Range): string {
  return range.min === range.max ? `${range.min} g` : `${range.min}–${range.max} g`;
}

export function nutritionTipForToday(input: NutritionDayInput): NutritionTip {
  const day = nutritionDay(input);
  const weight = input.weightKg && input.weightKg > 0 ? input.weightKg : null;
  const today = input.today;
  const rodeToday = input.ridesToday.length > 0;
  const plannedRides = input.plannedToday.filter(
    (session) => session.minutes > 0 && session.intensity !== "rest",
  );

  // 1. Er komt vandaag nog een rit van een uur of langer: eten onderweg.
  if (day.rideCarbsPerHour) {
    const minutes = totalMinutes(input.plannedToday);
    const perHour = grams(day.rideCarbsPerHour);
    return {
      kind: "tijdens_rit",
      title: "Eet onderweg",
      body: pick(today, "tijdens_rit", [
        `Voor je rit van ${hours(minutes)}: ${perHour} koolhydraten per uur. Begin al in het eerste uur, in kleine porties.`,
        `Vandaag ${hours(minutes)} op de fiets. Mik op ${perHour} koolhydraten per uur en wacht niet tot je honger krijgt.`,
      ]),
      articleSlug: "koolhydraten-tijdens-de-rit",
      mealMoment: "tijdens_rit",
      fuelProfile: "hoog_kh",
    };
  }

  // 2. Een korte maar zware sessie of race die nog moet komen: de maaltijd vooraf telt.
  if (!rodeToday && plannedRides.length > 0 && isKeyDay(day.dayType)) {
    return {
      kind: "voor_rit",
      title: "Start met volle tank",
      body: pick(today, "voor_rit", [
        "Kort en hard vandaag. Eet één tot drie uur vooraf koolhydraatrijk en licht verteerbaar.",
        "Een korte, zware sessie vraagt geen eten onderweg, wel een goede koolhydraatrijke maaltijd vooraf.",
      ]),
      articleSlug: "voor-de-rit",
      mealMoment: "voor_rit",
      fuelProfile: "hoog_kh",
    };
  }

  // 3. Al gereden en er staat vandaag nog een sessie: snel aanvullen.
  if (rodeToday && plannedRides.length > input.ridesToday.length) {
    const perHour = weight ? grams(recoveryCarbsPerHour(weight)) : "1,0–1,2 g per kg";
    return {
      kind: "snel_herstel",
      title: "Snel aanvullen",
      body: pick(today, "snel_herstel", [
        `Er komt vandaag nog een sessie. Neem de komende uren ${perHour} koolhydraten per uur, met wat eiwit erbij.`,
        `Tweede sessie op komst: vul direct aan met ${perHour} koolhydraten per uur, verdeeld over kleine porties.`,
      ]),
      articleSlug: "herstel",
      mealMoment: "na_rit",
      fuelProfile: "hoog_kh",
    };
  }

  // 4. Morgen een zware, lange of wedstrijddag: vanavond koolhydraatrijk eten.
  if (isKeyDay(day.tomorrowType)) {
    const label = FUEL_DAY_LABELS[day.tomorrowType].toLowerCase();
    return {
      kind: "morgen_zwaar",
      title: "Vanavond koolhydraatrijk",
      body: pick(today, "morgen_zwaar", [
        `Morgen is een ${label}. Eet vanavond een ruime koolhydraatrijke maaltijd, dan start je morgen met volle voorraden.`,
        `Voor je ${label} van morgen: maak het avondeten vandaag koolhydraatrijk, met pasta, rijst of aardappelen als basis.`,
      ]),
      articleSlug: "brandstof-volgens-training",
      mealMoment: "diner",
      fuelProfile: "hoog_kh",
    };
  }

  // 5. Een avondrit gereden: eiwit voor het slapen.
  if (input.ridesToday.some((ride) => (ride.startHour ?? -1) >= EVENING_START_HOUR)) {
    return {
      kind: "voor_slapen",
      title: "Eiwit voor het slapen",
      body: pick(today, "voor_slapen", [
        `Na je avondrit helpt ongeveer ${PRE_SLEEP_PROTEIN_G} g eiwit voor het slapen je spieren 's nachts herstellen. Kwark is een makkelijke bron.`,
        `Avondrit gedaan? Neem voor het slapen ongeveer ${PRE_SLEEP_PROTEIN_G} g eiwit, bijvoorbeeld een flinke bak kwark.`,
      ]),
      articleSlug: "eiwit",
      mealMoment: "voor_slapen",
      fuelProfile: "eiwitrijk",
    };
  }

  // 6. Vandaag een uur of langer gereden: een herstelmaaltijd.
  if (rodeToday && totalMinutes(input.ridesToday) >= 60) {
    const protein = weight ? `${Math.round(0.3 * weight)} g` : "0,3 g per kg";
    return {
      kind: "na_rit",
      title: "Herstel na je rit",
      body: pick(today, "na_rit", [
        `Maak je volgende maaltijd koolhydraatrijk en neem er ongeveer ${protein} eiwit bij.`,
        `Goed gereden. Vul aan met koolhydraten en ongeveer ${protein} eiwit bij je volgende maaltijd.`,
      ]),
      articleSlug: "herstel",
      mealMoment: "na_rit",
      fuelProfile: "gemengd",
    };
  }

  // 7. Tekenen van vermoeidheid: juist genoeg eten.
  if (input.readinessState === "recovery" || input.wellnessState === "fatigued") {
    return {
      kind: "genoeg_eten",
      title: "Eet genoeg",
      body: pick(today, "genoeg_eten", [
        "Je herstel staat onder druk. Sla geen maaltijden over: genoeg eten is nu deel van je herstel.",
        "Vermoeid? Zorg dat je vandaag ruim genoeg eet, met koolhydraten én eiwit bij elke maaltijd.",
      ]),
      articleSlug: "genoeg-eten-reds",
      mealMoment: "lunch",
      fuelProfile: "gemengd",
    };
  }

  // 8. Rustdag: eiwit verdelen.
  if (day.dayType === "rust") {
    const protein = day.protein ? grams(day.protein) : "1,6–1,8 g per kg";
    return {
      kind: "rustdag",
      title: "Rustdag, wel herstellen",
      body: pick(today, "rustdag", [
        `Ook op een rustdag bouw je op. Verdeel ${protein} eiwit over vier of vijf momenten.`,
        `Rustdag: verdeel ${protein} eiwit over de dag en eet ruim groente en fruit.`,
      ]),
      articleSlug: "eiwit",
      mealMoment: "lunch",
      fuelProfile: "eiwitrijk",
    };
  }

  // 9. Een gewone trainingsdag.
  const carbs = day.carbs ? grams(day.carbs) : null;
  return {
    kind: "basis",
    title: FUEL_DAY_LABELS[day.dayType],
    body: carbs
      ? pick(today, "basis", [
          `Vandaag passen ongeveer ${carbs} koolhydraten bij je training.`,
          `Richt vandaag op ongeveer ${carbs} koolhydraten, verdeeld over je maaltijden.`,
        ])
      : "Vul je gewicht in op je profiel, dan rekenen we je koolhydraten en eiwit uit.",
    articleSlug: "brandstof-volgens-training",
    mealMoment: "ontbijt",
    fuelProfile: "gemengd",
  };
}
