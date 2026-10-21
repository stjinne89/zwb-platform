// De ijkwaarden van de ZWBeter-berg: negen niveaus, en per graat de waarde die
// bij elk niveau hoort.
//
// De score is het niveau zelf (op het scherm in punten, 100 per niveau). Er is
// geen plafond: voorbij Aliens (9, de recordwaarden) loopt de schaal door. Op de
// berg zijn de niveaus virtuele ijkbergen; hun hoogte is alleen beeld.
//
// Puur en zonder database. De bron van elke rij staat in
// docs/zwbeter-berg-onderzoek.md. Geen studie koppelt vermogen aan niveaus van
// 1 tot 9; de ijkwaarden zijn inschattingen van ZWB op basis van de literatuur
// ("estimate") en staan zo ook op /hulp.

export type Level = {
  /** 1 tot en met 9. */
  n: number;
  name: string;
};

/** Van laag naar hoog. Wie de norm van een niveau haalt, staat op dat niveau. */
export const LEVELS: readonly Level[] = [
  { n: 1, name: "Starter" },
  { n: 2, name: "Recreant" },
  { n: 3, name: "Toerrijder" },
  { n: 4, name: "Gevorderde" },
  { n: 5, name: "Sterke amateur" },
  { n: 6, name: "Elite-amateur" },
  { n: 7, name: "Profpeloton" },
  { n: 8, name: "Wereldtop" },
  // De recordwaarden: wat er van de allerbeste renners bekend is (zie het onderzoek).
  { n: 9, name: "Aliens" },
];

export type Sex = "man" | "vrouw";

/**
 * Een schaal: de waarde die 0 oplevert, en per niveau (1 tot en met 9) de
 * waarde die erbij hoort. `lowerIsBetter` draait de richting om (durability:
 * minder verval is beter).
 */
export type Anchors = {
  zero: number;
  levels: readonly [number, number, number, number, number, number, number, number, number];
  lowerIsBetter?: boolean;
  /** Een inschatting van ZWB, niet rechtstreeks uit een bron. */
  estimate?: boolean;
};

export type PowerDuration = "s15" | "m1" | "m5" | "m20";

/**
 * Vermogen in W/kg per duur, voor mannen. Ingeschat aan de hand van de
 * gebruikelijke indeling per duur (ongetraind tot wereldklasse) en de normen van
 * profrenners (Valenzuela 2022; Mateo-March 2022, 2026; Spragg 2022, 2024).
 * Niveau 8 (Wereldtop) is het niveau van WorldTour-winnaars; niveau 9 (Aliens)
 * de hoogste gepubliceerde waarden: ongeveer 7 W/kg over 40 minuten (Pogacar,
 * Plateau de Beille 2024), 7,2 W/kg over 5 minuten in een rit (Pogacar, Tour
 * 2020), 17 tot 19 W/kg om een Tourspurt te winnen, 10,1 W/kg over een minuut
 * (Ronde 2022). Officiele records bestaan niet; profs publiceren hun gegevens
 * zelden, dus dit zijn gepubliceerde schattingen.
 */
const POWER_MAN = {
  s15: { zero: 4, levels: [7.5, 9, 10.5, 12, 13.5, 15, 16.5, 17.5, 19.5], estimate: true },
  m1: { zero: 3, levels: [5, 5.8, 6.6, 7.4, 8.2, 9, 9.8, 10.2, 11.2], estimate: true },
  m5: { zero: 1.2, levels: [2.4, 3.2, 4, 4.8, 5.5, 6.2, 6.7, 7.1, 7.6], estimate: true },
  m20: { zero: 1, levels: [1.9, 2.6, 3.3, 4, 4.6, 5.3, 5.8, 6.4, 7.1], estimate: true },
} as const satisfies Record<PowerDuration, Anchors>;

/**
 * Vrouwen: dezelfde niveaus bij een vast aandeel van de waarden voor mannen. Het
 * aandeel volgt de verhouding tussen de normen van vrouwelijke en mannelijke
 * profs (Mateo-March 2022 tegenover Valenzuela 2022) en is kleiner bij korte
 * duren. Een inschatting van ZWB.
 */
const FEMALE_SHARE: Record<PowerDuration, number> = { s15: 0.8, m1: 0.82, m5: 0.84, m20: 0.85 };

export function powerAnchors(duration: PowerDuration, sex: Sex | null): Anchors {
  const base = POWER_MAN[duration];
  if (sex !== "vrouw") return base;
  const share = FEMALE_SHARE[duration];
  const round = (value: number) => Math.round(value * share * 100) / 100;
  return {
    zero: round(base.zero),
    levels: base.levels.map(round) as unknown as Anchors["levels"],
    estimate: true,
  };
}

/**
 * Zwift Racing Score (0–1000). Zwift deelt in in E 0–200, D 200–400,
 * C 400–600, B 600–800 en A 800–1000. Scores boven 900 komen voor; 1000 is nog
 * door niemand gehaald en is daarom Aliens. De koppeling aan de niveaus is van
 * ZWB. Omdat de score bij 1000 ophoudt, komt deze graat nooit boven niveau 9.
 */
export const ZRS_ANCHORS: Anchors = {
  zero: 0,
  levels: [100, 250, 400, 550, 700, 800, 870, 920, 1000],
  estimate: true,
};

/**
 * Fitheid als CTL (trainingsbelasting over 42 dagen, TSS per dag). WorldTour-profs
 * zitten rond 140 tot 150 en na een grote ronde rond 170; 180 is het hoogste dat
 * genoemd wordt. De lagere niveaus zijn een inschatting van ZWB.
 */
export const CTL_ANCHORS: Anchors = {
  zero: 0,
  levels: [15, 30, 45, 65, 85, 105, 125, 150, 180],
  estimate: true,
};

/**
 * Durability als verval in procenten per 10 kJ/kg voorafgaand werk, op de beste
 * 20 (of 5) minuten. Afgeleid uit: WorldTour ongeveer 1,5 en ProTeam 2,2
 * (Mateo-March 2022, na 45 kJ/kg), succesvolle amateurs ongeveer 5 en minder
 * succesvolle ongeveer 9,6 (Barsumyan 2025, na 1000 kJ). Minder verval is beter.
 * Aliens (0,7) is een inschatting voor renners die na 50 kJ/kg nog hun beste
 * klimtijden rijden.
 */
export const DURABILITY_ANCHORS: Anchors = {
  zero: 18,
  levels: [12.5, 9.5, 7, 5, 3.6, 2.6, 1.8, 1.2, 0.7],
  lowerIsBetter: true,
  estimate: true,
};

/** Durability telt pas vanaf zoveel voorafgaand werk; daaronder zegt het verval weinig. */
export const DURABILITY_MIN_KJ_PER_KG = 10;

/**
 * Het gewicht van elke graat in de score. Een keuze van ZWB (eigenaar,
 * 2026-10-21), gegrond op de literatuur: het vermogensprofiel samen 50% als
 * sterkste voorspeller (Leo 2021; Valenzuela 2023), durability 20% als factor
 * naast FTP en VO2max (Barsumyan 2025; van Erp 2021), fitheid 15% (goede trend,
 * zwakke voorspeller; Marchal 2025) en racen 15% (het resultaat in de praktijk).
 * Ontbreekt een graat, dan gaan de gewichten van de rest samen weer naar 100%.
 */
export const RIDGE_WEIGHTS = {
  sprint: 0.125,
  anaeroob: 0.125,
  vo2max: 0.125,
  drempel: 0.125,
  durability: 0.2,
  fitheid: 0.15,
  racen: 0.15,
} as const;
