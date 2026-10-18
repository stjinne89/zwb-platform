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
 * Rolweerstand. Lim 2011 mat op asfalt bij ongeveer 8 bar 4,2 N en bij 4 bar
 * 5,6 N; met renner en fiets van ongeveer 85 kg is dat een Crr van ~0,005 en
 * ~0,007. Die tweede waarde staat ook voor een ruw wegdek (Turner 2024).
 */
export const ROLWEERSTANDEN = [
  { crr: 0.005, label: "Hard, goed asfalt" },
  { crr: 0.007, label: "Zacht of ruw wegdek" },
] as const;

/** Rendement van de aandrijving. 97 % is de aanname van het ZWB-model. */
export const RENDEMENTEN = [0.96, DRIVETRAIN_EFF, 0.98] as const;

export type Opzet = {
  houding: HoudingId;
  /** Extra luchtweerstand in procent: negatief is minder (helm, kleding, wielen). */
  aeroPct: number;
  crr: number;
  /** Fiets en uitrusting in kg. */
  uitrustingKg: number;
  rendement: number;
};

export const STANDAARD_OPZET: Opzet = {
  houding: "remgrepen",
  aeroPct: 0,
  crr: DEFAULT_CRR,
  uitrustingKg: DEFAULT_EQUIPMENT_KG,
  rendement: DRIVETRAIN_EFF,
};

export type Rijder = {
  watts: number;
  gewichtKg: number;
  groep: boolean;
};

export function opzetCda(opzet: Opzet, groep: boolean): number {
  const houding = HOUDINGEN.find((h) => h.id === opzet.houding)?.factor ?? 1;
  return DEFAULT_CDA * houding * (1 + opzet.aeroPct / 100) * (groep ? GROEP_CDA_FACTOR : 1);
}

/** Tijd in seconden voor deze route, met een vast vermogen over de hele rit. */
export function ritSeconden(route: RekenSegment[], rijder: Rijder, opzet: Opzet): number {
  return estimateRide({
    segments: route.map((s) => ({ ...s, watts: rijder.watts })),
    totalMassKg: rijder.gewichtKg + opzet.uitrustingKg,
    cda: opzetCda(opzet, rijder.groep),
    crr: opzet.crr,
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
