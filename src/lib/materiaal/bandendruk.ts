// De bandendruk op Vandaag (2026-11-21).
//
// Basis: de 15 %-inzakking van Frank Berto (Bicycle Quarterly). Een band staat
// goed als hij onder het gewicht op dat wiel 15 % van zijn hoogte inzakt. De
// regressie hieronder is een fit op Berto's lijnen (lading per wiel in pond,
// bandbreedte in mm, druk in psi), overgenomen uit het R-pakket btpress; zie
// docs/bandendruk.md voor de bron en waar die minder zeker is.
//
// De correcties voor wegdek, tubeless en nat zijn aannames van ZWB, geen
// meting. Ze staan als constante hier, zodat een test en het document ze
// kunnen noemen.
//
// Puur en zonder netwerk: de kaart op Vandaag rekent in de browser.

export const BAND_TYPES = ["binnenband", "tubeless", "tube"] as const;
export type BandType = (typeof BAND_TYPES)[number];

export const WEGDEKKEN = ["asfalt", "ruw", "klinkers", "onverhard"] as const;
export type Wegdek = (typeof WEGDEKKEN)[number];

export const WEGDEK_LABEL: Record<Wegdek, string> = {
  asfalt: "Goed asfalt",
  ruw: "Slecht asfalt",
  klinkers: "Klinkers",
  onverhard: "Onverhard",
};

export const BAND_TYPE_LABEL: Record<BandType, string> = {
  binnenband: "Binnenband",
  tubeless: "Tubeless",
  tube: "Tube",
};

/** Breedtes waarbuiten we niet rekenen; Berto mat tussen ongeveer 20 en 37 mm. */
export const MIN_BREEDTE_MM = 18;
export const MAX_BREEDTE_MM = 70;

/** Deel van het systeemgewicht op het voorwiel, zittend op een racefiets. */
export const VOOR_AANDEEL = 0.45;

/** ETRTO: hookless racevelgen niet boven 5 bar. */
export const HOOKLESS_MAX_BAR = 5;

/** Nooit lager dan dit; daaronder rolt een band van de velg of slaat hij door. */
export const MIN_BAR = 1;

/** Aanname ZWB: een ruwere ondergrond rolt sneller met wat minder druk. */
export const WEGDEK_FACTOR: Record<Wegdek, number> = {
  asfalt: 1,
  ruw: 0.93,
  klinkers: 0.88,
  onverhard: 0.85,
};

/** Aanname ZWB: zonder binnenband geen snakebite, dus iets lager. */
export const BAND_TYPE_FACTOR: Record<BandType, number> = {
  binnenband: 1,
  tubeless: 0.95,
  tube: 1,
};

/** Aanname ZWB: op nat wegdek iets meer grip. */
export const NAT_FACTOR = 0.95;

const KG_PER_POND = 0.45359237;
export const PSI_PER_BAR = 14.5037738;

/** Berto 15 %: druk in psi voor een lading op één wiel. */
export function bertoPsi(ladingKg: number, breedteMm: number): number {
  const pond = ladingKg / KG_PER_POND;
  return (153.6 * pond) / Math.pow(breedteMm, 1.5785) - 7.1685;
}

export type BandSetup = {
  voorBreedteMm: number;
  achterBreedteMm: number;
  /** Gemeten breedte op de velg; gaat voor de breedte op de band. */
  voorGemetenMm: number | null;
  achterGemetenMm: number | null;
  bandType: BandType;
  hookless: boolean;
  fietsKg: number;
  /** Laagste maximum van band en velg, als het lid dat invult. */
  maxBar: number | null;
};

export type BandendrukInput = {
  renKg: number;
  setup: BandSetup;
  wegdek: Wegdek;
  nat: boolean;
};

export type WielDruk = { bar: number; psi: number; begrensd: boolean };
export type Bandendruk = { voor: WielDruk; achter: WielDruk };

function breedte(gemeten: number | null, opBand: number): number {
  const mm = gemeten && gemeten > 0 ? gemeten : opBand;
  return Math.min(MAX_BREEDTE_MM, Math.max(MIN_BREEDTE_MM, mm));
}

function wiel(ladingKg: number, breedteMm: number, factor: number, plafond: number): WielDruk {
  const bar = (bertoPsi(ladingKg, breedteMm) / PSI_PER_BAR) * factor;
  const begrensd = bar > plafond;
  const afgerond = Math.round(Math.max(MIN_BAR, Math.min(plafond, bar)) * 10) / 10;
  return { bar: afgerond, psi: Math.round(afgerond * PSI_PER_BAR), begrensd };
}

export function bandendruk({ renKg, setup, wegdek, nat }: BandendrukInput): Bandendruk {
  const systeemKg = renKg + setup.fietsKg;
  const factor = WEGDEK_FACTOR[wegdek] * BAND_TYPE_FACTOR[setup.bandType] * (nat ? NAT_FACTOR : 1);
  const plafonds = [setup.hookless ? HOOKLESS_MAX_BAR : Infinity, setup.maxBar ?? Infinity];
  const plafond = Math.min(...plafonds);
  return {
    voor: wiel(systeemKg * VOOR_AANDEEL, breedte(setup.voorGemetenMm, setup.voorBreedteMm), factor, plafond),
    achter: wiel(
      systeemKg * (1 - VOOR_AANDEEL),
      breedte(setup.achterGemetenMm, setup.achterBreedteMm),
      factor,
      plafond,
    ),
  };
}

/** Het wegdek dat bij een fietstype voor de hand ligt. */
export function standaardWegdek(discipline: string | null): Wegdek {
  if (discipline === "gravel" || discipline === "mtb") return "onverhard";
  if (discipline === "stad") return "ruw";
  return "asfalt";
}

/** Startwaarden in het formulier, tot het lid de eigen fiets invult. */
export function standaardSetup(discipline: string | null): BandSetup {
  const [mm, kg] =
    discipline === "gravel" ? [40, 9.5] : discipline === "mtb" ? [58, 12] : discipline === "stad" ? [32, 14] : [28, 8.5];
  return {
    voorBreedteMm: mm,
    achterBreedteMm: mm,
    voorGemetenMm: null,
    achterGemetenMm: null,
    bandType: discipline === "gravel" || discipline === "mtb" ? "tubeless" : "binnenband",
    hookless: false,
    fietsKg: kg,
    maxBar: null,
  };
}

export function isBandType(value: unknown): value is BandType {
  return typeof value === "string" && (BAND_TYPES as readonly string[]).includes(value);
}

export function isWegdek(value: unknown): value is Wegdek {
  return typeof value === "string" && (WEGDEKKEN as readonly string[]).includes(value);
}

export function formatBar(bar: number): string {
  return bar.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Een rij uit bike_tire_setups (numerics komen als tekst terug). */
export type TireSetupRow = {
  bike_id: string;
  front_width_mm: number | string;
  rear_width_mm: number | string;
  front_measured_mm: number | string | null;
  rear_measured_mm: number | string | null;
  tire_type: string;
  hookless: boolean;
  bike_kg: number | string;
  max_bar: number | string | null;
};

export const TIRE_SETUP_COLUMNS =
  "bike_id, front_width_mm, rear_width_mm, front_measured_mm, rear_measured_mm, tire_type, hookless, bike_kg, max_bar";

function num(v: number | string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function setupFromRow(row: TireSetupRow): BandSetup {
  return {
    voorBreedteMm: num(row.front_width_mm) ?? 28,
    achterBreedteMm: num(row.rear_width_mm) ?? 28,
    voorGemetenMm: num(row.front_measured_mm),
    achterGemetenMm: num(row.rear_measured_mm),
    bandType: isBandType(row.tire_type) ? row.tire_type : "binnenband",
    hookless: Boolean(row.hookless),
    fietsKg: num(row.bike_kg) ?? 8.5,
    maxBar: num(row.max_bar),
  };
}
