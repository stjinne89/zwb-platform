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
import {
  BAND_PRODUCTEN,
  FIETS_PRODUCTEN,
  HELM_PRODUCTEN,
  SOK_PRODUCTEN,
  WIEL_PRODUCTEN,
  type BandId,
  type FietsId,
  type HelmId,
  type SokId,
  type WielId,
} from "@/lib/materiaal/producttests";

export type { BandId, FietsId, HelmId, SokId, WielId };

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

// Helm, fiets, wielen, banden en sokken komen uit onafhankelijke tests; zie
// producttests.ts. Elk product is een verschil met de basis uit dezelfde test.
export {
  BAND_PRODUCTEN,
  FIETS_PRODUCTEN,
  HELM_PRODUCTEN,
  SOK_PRODUCTEN,
  WIEL_PRODUCTEN,
} from "@/lib/materiaal/producttests";

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

export function rolweerstand(spanning: SpanningId, wegdek: WegdekId, band: BandId = "basis"): number {
  const basis = wegdek === "ruw" ? RUW_CRR : (SPANNINGEN.find((s) => s.id === spanning)?.crr ?? DEFAULT_CRR);
  return basis + (BAND_PRODUCTEN.find((b) => b.id === band)?.verschil ?? 0);
}

/** Rendement van de aandrijving. 97 % is de aanname van het ZWB-model. */
export const RENDEMENTEN = [0.96, DRIVETRAIN_EFF, 0.98] as const;

export type Opzet = {
  houding: HoudingId;
  helm: HelmId;
  fiets: FietsId;
  wielen: WielId;
  banden: BandId;
  spanning: SpanningId;
  sokken: SokId;
  /** Extra luchtweerstand in procent, bijvoorbeeld van kleding: negatief is minder. */
  aeroPct: number;
  /** Fiets en uitrusting in kg. */
  uitrustingKg: number;
  rendement: number;
};

export const STANDAARD_OPZET: Opzet = {
  houding: "remgrepen",
  helm: "basis",
  fiets: "basis",
  wielen: "basis",
  banden: "basis",
  spanning: "hard",
  sokken: "basis",
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
  return (DEFAULT_CDA * houding + materiaalCda(opzet)) * (1 + opzet.aeroPct / 100) * (groep ? GROEP_CDA_FACTOR : 1);
}

/** Wielen van een geteste fiets? De fietstest mat ze al mee met hun eigen hoge velgen. */
export function wielenBijFiets(opzet: Pick<Opzet, "fiets">): boolean {
  return FIETS_PRODUCTEN.find((f) => f.id === opzet.fiets)?.aero ?? false;
}

/** Verschil in luchtweerstand (m²) van helm, fiets, wielen en sokken met de basis. */
export function materiaalCda(opzet: Opzet): number {
  const helm = HELM_PRODUCTEN.find((h) => h.id === opzet.helm)?.verschil ?? 0;
  const fiets = FIETS_PRODUCTEN.find((f) => f.id === opzet.fiets)?.verschil ?? 0;
  const wielen = wielenBijFiets(opzet) ? 0 : (WIEL_PRODUCTEN.find((w) => w.id === opzet.wielen)?.verschil ?? 0);
  const sokken = SOK_PRODUCTEN.find((s) => s.id === opzet.sokken)?.verschil ?? 0;
  return helm + fiets + wielen + sokken;
}

/** Tijd in seconden voor deze route, met een vast vermogen over de hele rit. */
export function ritSeconden(route: RekenSegment[], rijder: Rijder, opzet: Opzet): number {
  return estimateRide({
    segments: route.map((s) => ({ ...s, watts: rijder.watts })),
    totalMassKg: rijder.gewichtKg + opzet.uitrustingKg,
    cda: opzetCda(opzet, rijder.groep),
    crr: rolweerstand(opzet.spanning, rijder.wegdek, opzet.banden),
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

export type Onderdeel = "helm" | "houding" | "fiets" | "wielen" | "banden" | "kleding";

/** Welke velden van een opzet bij een onderdeel horen. */
export const ONDERDEEL_VELDEN: Record<Onderdeel, (keyof Opzet)[]> = {
  helm: ["helm"],
  houding: ["houding"],
  fiets: ["fiets", "uitrustingKg", "rendement"],
  wielen: ["wielen"],
  banden: ["banden", "spanning"],
  kleding: ["sokken", "aeroPct"],
};

function metVelden(opzet: Opzet, van: Opzet, velden: (keyof Opzet)[]): Opzet {
  const uit = { ...opzet } as Record<keyof Opzet, unknown>;
  for (const veld of velden) uit[veld] = van[veld];
  return uit as Opzet;
}

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
  const uit = {} as Record<Onderdeel, number>;
  for (const onderdeel of Object.keys(ONDERDEEL_VELDEN) as Onderdeel[]) {
    const velden = ONDERDEEL_VELDEN[onderdeel];
    const gelijk = velden.every((veld) => input.nu[veld] === input.straks[veld]);
    uit[onderdeel] = gelijk ? 0 : nuSeconden - ritSeconden(input.route, input.rijder, metVelden(input.nu, input.straks, velden));
  }
  return uit;
}

/**
 * Wat elk product oplevert tegen de basis uit zijn test, op deze route en met de
 * rest van deze opzet. Voor de tabellen met producten.
 */
export function winstPerProduct<K extends "helm" | "fiets" | "wielen" | "banden" | "sokken">(input: {
  route: RekenSegment[];
  rijder: Rijder;
  opzet: Opzet;
  veld: K;
  ids: readonly Opzet[K][];
}): Map<Opzet[K], Vergelijking> {
  const basis = { ...input.opzet, [input.veld]: "basis" } as Opzet;
  const uit = new Map<Opzet[K], Vergelijking>();
  for (const id of input.ids) {
    uit.set(id, vergelijkOpzet({ route: input.route, rijder: input.rijder, nu: basis, straks: { ...input.opzet, [input.veld]: id } }));
  }
  return uit;
}
