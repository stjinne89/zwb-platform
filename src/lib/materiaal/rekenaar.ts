// De rekenaar "Wat levert het op?" van ZWBeter materiaal (2026-10-18).
//
// Rekent dezelfde route twee keer door met hetzelfde vermogen: met je huidige
// opzet en met de verandering die je overweegt. De kern is het buitenmodel van
// ZWB (estimateRide in src/lib/ride-estimate.ts); zo'n model is door drie groepen
// tegen metingen getoetst (zie het artikel "Waar je watt heen gaan"). Windstil,
// zoals het pacingplan. Alleen voor buiten: op Zwift bepaalt het spel de fysica.
//
// Puur en zonder netwerk, zodat de pagina het in de browser draait en een test
// het naast een handberekening kan leggen.

import {
  DEFAULT_CDA,
  DEFAULT_CRR,
  DEFAULT_EQUIPMENT_KG,
  DRIVETRAIN_EFF,
  estimateRide,
} from "@/lib/ride-estimate";

export type RekenSegment = { distanceM: number; gradient: number };
export type RekenRoute = { id: string; label: string; segments: RekenSegment[] };

const STUK_M = 500;

function stuk(km: number, gradient: number): RekenSegment[] {
  const n = Math.round((km * 1000) / STUK_M);
  return Array.from({ length: n }, () => ({ distanceM: STUK_M, gradient }));
}

export const VASTE_ROUTES: RekenRoute[] = [
  { id: "vlak", label: "Vlak, 40 km", segments: stuk(40, 0) },
  {
    id: "heuvels",
    label: "Heuvelachtig, 40 km",
    // Vijf keer 3 km op 4 %, 3 km op -4 % en 2 km vlak.
    segments: Array.from({ length: 5 }, () => [...stuk(3, 0.04), ...stuk(3, -0.04), ...stuk(2, 0)]).flat(),
  },
  { id: "klim", label: "Klim, 8 km op 6 %", segments: stuk(8, 0.06) },
];

/**
 * Luchtweerstand in een groep, als deel van alleen rijden. Een aanname: in een
 * rij achter elkaar is dat 50 tot 70 % (Blocken 2018, uit eerder onderzoek). We
 * nemen de bovenkant, omdat je in een groep ook op kop rijdt.
 */
export const GROEP_CDA_FACTOR = 0.7;

/** Houdingen met hun luchtweerstand als deel van handen op de remgrepen. */
export const HOUDINGEN = [
  { id: "remgrepen", label: "Op de remgrepen", factor: 1 },
  // Lim 2011: k 0,155 in de beugel tegen 0,175 op de remgrepen.
  { id: "beugel", label: "In de beugel", factor: 0.155 / 0.175 },
  // Barry 2015: 13,9 % minder dan de gewone houding op de remgrepen.
  { id: "onderarmen", label: "Onderarmen plat", factor: 1 - 0.139 },
] as const;
export type HoudingId = (typeof HOUDINGEN)[number]["id"];

/**
 * Helmen als deel van de luchtweerstand met een gewone helm. Artikel Helm: gaten
 * open of dicht scheelde op een pop 3,7 tot 4,1 %; we nemen het midden.
 */
export const HELMEN = [
  { id: "gaten", label: "Helm met gaten", factor: 1 },
  { id: "aero", label: "Aerohelm, dicht", factor: 1 - 0.039 },
] as const;
export type HelmId = (typeof HELMEN)[number]["id"];

/**
 * Fietsen als verschil in luchtweerstand (m²) met een gewone racefiets met
 * spaakwielen. Afgeleid uit Jeukendrup & Martin 2001: een aeroframe scheelde op
 * 40 km solo 1:17 tot 1:44, aerowielen 60 tot 82 s. Met ons model is dat bij
 * elk niveau van renner 0,019 en 0,015 m² minder. Het is een verschil en geen
 * factor, omdat de fiets niet kleiner wordt als jij lager gaat zitten. Gemeten
 * met een tijdritfiets; op de remgrepen ligt de winst eerder lager.
 */
export const FIETSEN = [
  { id: "race", label: "Racefiets", cdaVerschil: 0 },
  { id: "aerowielen", label: "Aerowielen", cdaVerschil: -0.015 },
  { id: "aero", label: "Aerofiets", cdaVerschil: -0.015 - 0.019 },
] as const;
export type FietsId = (typeof FIETSEN)[number]["id"];

/**
 * Rolweerstand. Lim 2011 mat op asfalt bij ongeveer 8 bar 4,2 N en bij 4 bar
 * 5,6 N; met renner en fiets van ongeveer 85 kg is dat een Crr van ~0,005 en
 * ~0,007. Op een ruw wegdek rekenen we bij elke spanning met 0,007 (Turner
 * 2024): bij welke spanning een band daar omslaat, is niet vastgesteld.
 */
export const SPANNINGEN = [
  { id: "hard", label: "Hard, ~8 bar", crr: 0.005 },
  { id: "zacht", label: "Zacht, ~4 bar", crr: 0.007 },
] as const;
export type SpanningId = (typeof SPANNINGEN)[number]["id"];

export const WEGDEKKEN = [
  { id: "glad", label: "Glad asfalt" },
  { id: "ruw", label: "Ruw wegdek" },
] as const;
export type WegdekId = (typeof WEGDEKKEN)[number]["id"];

export const RUW_CRR = 0.007;

export function rolweerstand(spanning: SpanningId, wegdek: WegdekId): number {
  if (wegdek === "ruw") return RUW_CRR;
  return SPANNINGEN.find((s) => s.id === spanning)?.crr ?? DEFAULT_CRR;
}

/** Rendement van de aandrijving. 97 % is de aanname van het ZWB-model. */
export const RENDEMENTEN = [0.96, DRIVETRAIN_EFF, 0.98] as const;

export type Opzet = {
  houding: HoudingId;
  helm: HelmId;
  fiets: FietsId;
  spanning: SpanningId;
  /** Extra luchtweerstand in procent, bijvoorbeeld van kleding: negatief is minder. */
  aeroPct: number;
  /** Fiets en uitrusting in kg. */
  uitrustingKg: number;
  rendement: number;
};

export const STANDAARD_OPZET: Opzet = {
  houding: "remgrepen",
  helm: "gaten",
  fiets: "race",
  spanning: "hard",
  aeroPct: 0,
  uitrustingKg: DEFAULT_EQUIPMENT_KG,
  rendement: DRIVETRAIN_EFF,
};

export type Rijder = {
  watts: number;
  gewichtKg: number;
  groep: boolean;
  /** Het wegdek hoort bij de route, niet bij je opzet: nu en straks zijn gelijk. */
  wegdek: WegdekId;
};

export function opzetCda(opzet: Opzet, groep: boolean): number {
  const houding = HOUDINGEN.find((h) => h.id === opzet.houding)?.factor ?? 1;
  const helm = HELMEN.find((h) => h.id === opzet.helm)?.factor ?? 1;
  const fiets = FIETSEN.find((f) => f.id === opzet.fiets)?.cdaVerschil ?? 0;
  return (DEFAULT_CDA * houding * helm + fiets) * (1 + opzet.aeroPct / 100) * (groep ? GROEP_CDA_FACTOR : 1);
}

/** Tijd in seconden voor deze route, met een vast vermogen over de hele rit. */
export function ritSeconden(route: RekenSegment[], rijder: Rijder, opzet: Opzet): number {
  return estimateRide({
    segments: route.map((s) => ({ ...s, watts: rijder.watts })),
    totalMassKg: rijder.gewichtKg + opzet.uitrustingKg,
    cda: opzetCda(opzet, rijder.groep),
    crr: rolweerstand(opzet.spanning, rijder.wegdek),
    drivetrainEff: opzet.rendement,
  }).totalSeconds;
}

/** Het vermogen waarmee je met deze opzet de route in `seconden` rijdt. */
export function wattsVoorTijd(route: RekenSegment[], seconden: number, rijder: Rijder, opzet: Opzet): number {
  let lo = 20;
  let hi = 2000;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (ritSeconden(route, { ...rijder, watts: mid }, opzet) > seconden) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export type Vergelijking = {
  nuSeconden: number;
  straksSeconden: number;
  /** Positief is sneller. */
  winstSeconden: number;
  /** Zoveel watt had je met je huidige opzet extra nodig voor dezelfde tijd. */
  wattWaarde: number;
};

export function vergelijkOpzet(input: {
  route: RekenSegment[];
  rijder: Rijder;
  nu: Opzet;
  straks: Opzet;
}): Vergelijking {
  const nuSeconden = ritSeconden(input.route, input.rijder, input.nu);
  const straksSeconden = ritSeconden(input.route, input.rijder, input.straks);
  const wattWaarde = wattsVoorTijd(input.route, straksSeconden, input.rijder, input.nu) - input.rijder.watts;
  return { nuSeconden, straksSeconden, winstSeconden: nuSeconden - straksSeconden, wattWaarde };
}

export type Onderdeel = "helm" | "houding" | "fiets" | "spanning";

/**
 * Wat elk onderdeel apart oplevert: nu, met alleen dat onderdeel van straks.
 * Samen hoeft dat niet precies op de totale winst uit te komen.
 */
export function winstPerOnderdeel(input: {
  route: RekenSegment[];
  rijder: Rijder;
  nu: Opzet;
  straks: Opzet;
}): Record<Onderdeel, number> {
  const nuSeconden = ritSeconden(input.route, input.rijder, input.nu);
  const los = (onderdeel: Onderdeel) =>
    input.nu[onderdeel] === input.straks[onderdeel]
      ? 0
      : nuSeconden - ritSeconden(input.route, input.rijder, { ...input.nu, [onderdeel]: input.straks[onderdeel] });
  return { helm: los("helm"), houding: los("houding"), fiets: los("fiets"), spanning: los("spanning") };
}
