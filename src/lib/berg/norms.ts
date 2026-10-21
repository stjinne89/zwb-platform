// De ijkwaarden van de ZWBeter-berg: bergketens als niveaus, en per richting de
// waarde die bij de top van elke keten hoort.
//
// Puur en zonder database. De bron van elke rij staat in
// docs/zwbeter-berg-onderzoek.md. Waar geen bron een getal geeft, is het een
// inschatting van ZWB; dat staat er dan bij ("ZWB-inschatting") en op /hulp.

export type RangeId =
  | "heuvelland"
  | "ardennen"
  | "vogezen"
  | "pyreneeen"
  | "alpen"
  | "kaukasus"
  | "andes"
  | "himalaya";

export type MountainRange = {
  id: RangeId;
  /** De keten, zoals hij op het scherm staat. */
  name: string;
  /** De hoogste top van de keten: het ijkpunt. */
  peak: string;
  /** Hoogte van die top in meters. */
  meters: number;
};

/** Van laag naar hoog. Wie de top van een keten passeert, staat in de volgende. */
export const RANGES: readonly MountainRange[] = [
  { id: "heuvelland", name: "Heuvelland", peak: "Vaalserberg", meters: 322 },
  { id: "ardennen", name: "Ardennen", peak: "Signal de Botrange", meters: 694 },
  { id: "vogezen", name: "Vogezen", peak: "Grand Ballon", meters: 1424 },
  { id: "pyreneeen", name: "Pyreneeën", peak: "Aneto", meters: 3404 },
  { id: "alpen", name: "Alpen", peak: "Mont Blanc", meters: 4806 },
  { id: "kaukasus", name: "Kaukasus", peak: "Elbrus", meters: 5642 },
  { id: "andes", name: "Andes", peak: "Aconcagua", meters: 6961 },
  { id: "himalaya", name: "Himalaya", peak: "Mount Everest", meters: 8849 },
];

export type Sex = "man" | "vrouw";

/**
 * Een meterschaal: de waarde die 0 m oplevert, en per keten (in de volgorde van
 * RANGES) de waarde die bij zijn top hoort. `lowerIsBetter` draait de richting
 * om (durability: minder verval is hoger).
 */
export type Anchors = {
  zero: number;
  peaks: readonly [number, number, number, number, number, number, number, number];
  lowerIsBetter?: boolean;
  /** Een inschatting van ZWB, niet rechtstreeks uit een bron. */
  estimate?: boolean;
};

/**
 * Vermogen in W/kg per duur, voor mannen. Ingeschat aan de hand van de
 * gebruikelijke indeling per duur (ongetraind tot wereldklasse) en de normen van
 * profrenners (Valenzuela 2022; Mateo-March 2022, 2026; Spragg 2022, 2024).
 * Himalaya is het niveau van de beste renners ter wereld op die duur.
 */
const POWER_MAN = {
  s15: { zero: 4, peaks: [7.5, 9, 10.5, 12, 13.5, 15, 16.5, 19], estimate: true },
  m1: { zero: 3, peaks: [5, 5.8, 6.6, 7.4, 8.2, 9, 9.8, 11], estimate: true },
  m5: { zero: 1.2, peaks: [2.4, 3.2, 4, 4.8, 5.5, 6.2, 6.7, 7.5], estimate: true },
  m20: { zero: 1, peaks: [1.9, 2.6, 3.3, 4, 4.6, 5.3, 5.8, 6.5], estimate: true },
} as const satisfies Record<PowerDuration, Anchors>;

/**
 * Vrouwen: dezelfde ketens bij een vast aandeel van de waarden voor mannen. Het
 * aandeel volgt de verhouding tussen de normen van vrouwelijke en mannelijke
 * profs (Mateo-March 2022 tegenover Valenzuela 2022) en is kleiner bij korte
 * duren. Een inschatting van ZWB.
 */
const FEMALE_SHARE: Record<PowerDuration, number> = { s15: 0.8, m1: 0.82, m5: 0.84, m20: 0.85 };

export type PowerDuration = "s15" | "m1" | "m5" | "m20";

export function powerAnchors(duration: PowerDuration, sex: Sex | null): Anchors {
  const base = POWER_MAN[duration];
  if (sex !== "vrouw") return base;
  const share = FEMALE_SHARE[duration];
  const round = (value: number) => Math.round(value * share * 100) / 100;
  return {
    zero: round(base.zero),
    peaks: base.peaks.map(round) as unknown as Anchors["peaks"],
    estimate: true,
  };
}

/**
 * Zwift Racing Score (0–1000). Zwift deelt in in E 0–200, D 200–400,
 * C 400–600, B 600–800 en A 800–1000; de top van de schaal staat op
 * Himalaya-hoogte. De koppeling van categorie aan keten is van ZWB. Omdat de
 * score bij 1000 ophoudt, komt deze richting nooit boven de Everest.
 */
export const ZRS_ANCHORS: Anchors = {
  zero: 0,
  peaks: [100, 250, 400, 550, 700, 800, 900, 1000],
  estimate: true,
};

/**
 * Fitheid als CTL (trainingsbelasting over 42 dagen). Profs zitten rond 120 tot
 * 160; de lagere ketens zijn een inschatting van ZWB.
 */
export const CTL_ANCHORS: Anchors = {
  zero: 0,
  peaks: [15, 30, 45, 65, 85, 105, 125, 150],
  estimate: true,
};

/**
 * Durability als verval in procenten per 10 kJ/kg voorafgaand werk, op de beste
 * 20 (of 5) minuten. Afgeleid uit: WorldTour ongeveer 1,5 en ProTeam 2,2
 * (Mateo-March 2022, na 45 kJ/kg), succesvolle amateurs ongeveer 5 en minder
 * succesvolle ongeveer 9,6 (Barsumyan 2025, na 1000 kJ). Minder verval is beter.
 */
export const DURABILITY_ANCHORS: Anchors = {
  zero: 18,
  peaks: [12.5, 9.5, 7, 5, 3.6, 2.6, 1.8, 1.2],
  lowerIsBetter: true,
  estimate: true,
};

/** Durability telt pas vanaf zoveel voorafgaand werk; daaronder zegt het verval weinig. */
export const DURABILITY_MIN_KJ_PER_KG = 10;
