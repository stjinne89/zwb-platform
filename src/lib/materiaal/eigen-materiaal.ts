// Eigen materiaal in de rekenaar van ZWBeter materiaal (2026-11-27).
//
// Een lid vult zijn eigen helm, fiets, wielen of banden in. Die zijn niet
// getest, dus we schatten het verschil met de basis uit de geteste producten
// van dezelfde test, met een bereik. De rekenaar rekent met het midden en toont
// het bereik; in de tabel staat zo'n product als "schatting".
//
// Puur en zonder netwerk: de server-action valideert er de invoer mee en de
// browser rekent er de schatting mee uit. Uitleg voor leden staat op /hulp.

import {
  FIETS_PRODUCTEN,
  HELM_PRODUCTEN,
  WIEL_PRODUCTEN,
  bandVerschil,
  cdaUitWatt,
  type FietsUiterlijk,
  type FietsId,
  type HelmId,
  type HelmProfiel,
  type HelmUiterlijk,
  type WielUiterlijk,
} from "@/lib/materiaal/producttests";

export const EIGEN_ONDERDELEN = ["helm", "fiets", "wielen", "banden"] as const;
export type EigenOnderdeel = (typeof EIGEN_ONDERDELEN)[number];

/** Zo heet een eigen product in een opzet: `eigen:` plus het id uit de tabel. */
export type EigenRef = `eigen:${string}`;
export const isEigenRef = (id: string): id is EigenRef => id.startsWith("eigen:");

export const HELM_TYPES = ["gaten", "rond", "kort", "staart"] as const satisfies readonly HelmProfiel[];
export const HELM_TYPE_LABEL: Record<HelmProfiel, string> = {
  gaten: "Met gaten",
  rond: "Rond aero",
  kort: "Kort aero",
  staart: "Met staart",
};

export const FIETS_TYPES = ["gewoon", "aero"] as const;
export type FietsType = (typeof FIETS_TYPES)[number];
export const FIETS_TYPE_LABEL: Record<FietsType, string> = { gewoon: "Gewone racefiets", aero: "Aerofiets" };

export const BAND_SOORTEN = ["race", "allround", "training", "antilek"] as const;
export type BandSoort = (typeof BAND_SOORTEN)[number];
export const BAND_SOORT_LABEL: Record<BandSoort, string> = {
  race: "Race",
  allround: "Allround",
  training: "Training",
  antilek: "Anti-lek",
};

export type EigenInvoer =
  | { onderdeel: "helm"; lijktOp: HelmId | null; type: HelmProfiel }
  | { onderdeel: "fiets"; kg: number; lijktOp: FietsId | null; type: FietsType }
  | { onderdeel: "wielen"; velgVoor: number; velgAchter: number }
  | { onderdeel: "banden"; breedte: number; tubeless: boolean; soort: BandSoort; watt: number | null };

/** Een rij uit materiaal_eigen, met de invoer al gecontroleerd. */
export type EigenRij = { id: string; naam: string; invoer: EigenInvoer };

export type EigenProduct = {
  id: EigenRef;
  onderdeel: EigenOnderdeel;
  naam: string;
  /** Het midden van de schatting: CdA in m², of Crr bij banden. */
  verschil: number;
  /** Laag en hoog, in dezelfde eenheid. Gelijk aan het verschil bij een ingevulde testwaarde. */
  bereik: [number, number];
  /** Wat het lid invulde, voor de tabel. */
  gemeten: string;
  helm?: HelmUiterlijk;
  fiets?: FietsUiterlijk;
  wielen?: WielUiterlijk;
  /** Fietsgewicht in kg. */
  kg?: number;
};

export const NAAM_MAX = 60;
export const VELG_MIN_MM = 15;
export const VELG_MAX_MM = 100;
export const BAND_MIN_MM = 20;
export const BAND_MAX_MM = 40;
export const FIETS_MIN_KG = 5;
export const FIETS_MAX_KG = 20;
/** Kleding, schoenen en bidons bovenop de fiets, voor het veld "Fiets en uitrusting". */
export const UITRUSTING_ZONDER_FIETS_KG = 1.5;

// ---- Schattingen ---------------------------------------------------------

const mediaan = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const minMax = (xs: number[]): [number, number] => [Math.min(...xs), Math.max(...xs)];

const gemiddeld = ([a, b]: readonly [number, number]) => (a + b) / 2;

// Wielen. De wielentest mat 14 diepe wielsets tegen ondiepe velgen van 27 mm,
// en die liggen allemaal tussen 49,5 en 65 mm. Daarboven en daartussen laten
// de buren de schatting zien: het midden en de spreiding van de geteste
// wielen met een velghoogte binnen 6 mm (minstens drie). Onder de 48 mm is er
// geen meting; daar rekenen we in een rechte lijn tussen 0 bij 27 mm en de
// schatting bij 48 mm. Dieper dan 65 mm rekenen we als 65 mm.
const WIEL_ONDIEP_MM = 27;
const WIEL_GEMETEN_MM = 48;
const WIEL_DIEPST_MM = 65;
const WIEL_BUREN_MM = 6;
const WIEL_BUREN_MIN = 3;

const GETESTE_WIELEN = WIEL_PRODUCTEN.filter((w) => w.id !== "basis").map((w) => ({
  diepte: gemiddeld(w.uiterlijk.velg),
  verschil: w.verschil as number,
}));

function wielBuren(diepte: number): { verschil: number; bereik: [number, number] } {
  const opAfstand = [...GETESTE_WIELEN].sort((a, b) => Math.abs(a.diepte - diepte) - Math.abs(b.diepte - diepte));
  const binnen = opAfstand.filter((w) => Math.abs(w.diepte - diepte) <= WIEL_BUREN_MM);
  const buren = binnen.length >= WIEL_BUREN_MIN ? binnen : opAfstand.slice(0, WIEL_BUREN_MIN);
  const waarden = buren.map((w) => w.verschil);
  return { verschil: mediaan(waarden), bereik: minMax(waarden) };
}

export function schatWielen(velgVoor: number, velgAchter: number): { verschil: number; bereik: [number, number] } {
  const diepte = Math.min(WIEL_DIEPST_MM, (velgVoor + velgAchter) / 2);
  if (diepte <= WIEL_ONDIEP_MM) return { verschil: 0, bereik: [0, 0] };
  if (diepte >= WIEL_GEMETEN_MM) return wielBuren(diepte);
  const deel = (diepte - WIEL_ONDIEP_MM) / (WIEL_GEMETEN_MM - WIEL_ONDIEP_MM);
  const rand = wielBuren(WIEL_GEMETEN_MM);
  return { verschil: rand.verschil * deel, bereik: [rand.bereik[0] * deel, rand.bereik[1] * deel] };
}

function wielUiterlijk(velgVoor: number, velgAchter: number): WielUiterlijk {
  return {
    velg: [velgVoor, velgAchter],
    spaken: velgVoor >= 40 ? [21, 24] : [20, 24],
    spaak: velgVoor >= 40 ? "carbon" : "staal",
  };
}

// Helmen. "Lijkt op" neemt de geteste helm over, met de marge van de test
// (±0,74 W bij 40 km/h). Een type neemt het midden en de spreiding van de
// geteste helmen met dat silhouet; de basishelm telt mee bij "met gaten".
const HELM_MARGE = cdaUitWatt(0.74, 40);

export function schatHelm(invoer: { lijktOp: HelmId | null; type: HelmProfiel }): {
  verschil: number;
  bereik: [number, number];
  uiterlijk: HelmUiterlijk;
} {
  const voorbeeld = invoer.lijktOp ? HELM_PRODUCTEN.find((h) => h.id === invoer.lijktOp) : undefined;
  if (voorbeeld) {
    const v = voorbeeld.verschil as number;
    return { verschil: v, bereik: [v - HELM_MARGE, v + HELM_MARGE], uiterlijk: voorbeeld.uiterlijk };
  }
  const groep = HELM_PRODUCTEN.filter((h) => h.uiterlijk.profiel === invoer.type);
  const waarden = groep.map((h) => h.verschil as number);
  return {
    verschil: mediaan(waarden),
    bereik: minMax(waarden),
    uiterlijk: { profiel: invoer.type, gaten: Math.round(mediaan(groep.map((h) => h.uiterlijk.gaten))) },
  };
}

// Fietsen. De fietstest mat elke fiets met zijn eigen hoge velgen; een eigen
// fiets krijgt zijn wielen apart. Per geteste fiets halen we daarom de
// geschatte winst van zijn velgen eraf (met de wielenschatting hierboven), zodat
// alleen het frame overblijft. "Lijkt op" neemt dat frame over met de marge van
// de fietstest (±0,0047 m²). Een aerofiets neemt het midden en de spreiding van
// alle geteste frames; een gewone fiets is de basis, met dezelfde marge.
const FIETS_MARGE = 0.0047;

const frameVerschil = (f: (typeof FIETS_PRODUCTEN)[number]) =>
  (f.verschil as number) - schatWielen(f.uiterlijk.wielen.velg[0], f.uiterlijk.wielen.velg[1]).verschil;

const GETESTE_FRAMES = FIETS_PRODUCTEN.filter((f) => f.aero).map(frameVerschil);

const AERO_UITERLIJK: FietsUiterlijk = {
  aflopend: 0.7,
  staysLaag: true,
  buis: "aero",
  stuur: "integraal",
  wielen: WIEL_PRODUCTEN[0].uiterlijk,
};

const GEWOON_UITERLIJK: FietsUiterlijk = { ...FIETS_PRODUCTEN[0].uiterlijk, rem: undefined };

export function schatFiets(invoer: { lijktOp: FietsId | null; type: FietsType }): {
  verschil: number;
  bereik: [number, number];
  uiterlijk: FietsUiterlijk;
} {
  const voorbeeld = invoer.lijktOp ? FIETS_PRODUCTEN.find((f) => f.id === invoer.lijktOp && f.aero) : undefined;
  if (voorbeeld) {
    const v = frameVerschil(voorbeeld);
    return { verschil: v, bereik: [v - FIETS_MARGE, v + FIETS_MARGE], uiterlijk: voorbeeld.uiterlijk };
  }
  if (invoer.type === "aero") {
    return { verschil: mediaan(GETESTE_FRAMES), bereik: minMax(GETESTE_FRAMES), uiterlijk: AERO_UITERLIJK };
  }
  return { verschil: 0, bereik: [-FIETS_MARGE, FIETS_MARGE], uiterlijk: GEWOON_UITERLIJK };
}

// Banden. Het merk zegt weinig: bij één merk liep de rolweerstand in de test
// van 8,3 tot 22,0 W. Daarom het soort band, met de spreiding van de geteste
// banden van dat soort (watt per band op de testrol). De breedte maakte op de
// testrol vrijwel niets uit (de GP 5000 S TR in 28 en 30 mm: 9,7 en 10,0 W),
// dus die bewaren we alleen voor de naam. Waar een soort niet met binnenband
// of tubeless is getest, rekenen we met 2,5 W verschil: de GP 5000 met
// binnenband (12,1 W) tegen de tubeless GP 5000 S TR (9,7 W). Een ingevulde
// BRR-waarde gaat voor en geldt dan exact.
const BINNENBAND_EXTRA_W = 2.5;

/** Watt per band [laag, midden, hoog] per soort, tubeless en met binnenband. */
const BAND_WATT: Record<BandSoort, { tubeless: [number, number, number]; binnenband: [number, number, number] }> = {
  // Vittoria Corsa Pro Speed tot Vittoria Corsa Pro; met binnenband: GP 5000 in 25 en 30 mm.
  race: { tubeless: [6.7, 9.85, 11.1], binnenband: [12.1, 12.35, 12.6] },
  // GP 5000 All Season, Michelin Pro 5, S-Works Turbo, Grand Prix TR, Corsa N.EXT.
  allround: { tubeless: [12.2, 13.5, 14.1], binnenband: [12.2 + BINNENBAND_EXTRA_W, 13.5 + BINNENBAND_EXTRA_W, 14.1 + BINNENBAND_EXTRA_W] },
  // Alleen de Grand Prix 4 Season (binnenband, 17,6 W); de spreiding is die van
  // allround om het midden (1,3 W lager, 0,6 W hoger).
  training: { tubeless: [16.3 - BINNENBAND_EXTRA_W, 17.6 - BINNENBAND_EXTRA_W, 18.2 - BINNENBAND_EXTRA_W], binnenband: [16.3, 17.6, 18.2] },
  // RideArmor en Cinturato Velo tubeless; Gatorskin en Durano Plus met binnenband.
  antilek: { tubeless: [19.3, 20.15, 21.0], binnenband: [22.0, 22.45, 22.9] },
};

export function schatBanden(invoer: { tubeless: boolean; soort: BandSoort; watt: number | null }): {
  verschil: number;
  bereik: [number, number];
} {
  if (invoer.watt != null) {
    const v = bandVerschil(invoer.watt);
    return { verschil: v, bereik: [v, v] };
  }
  const [laag, midden, hoog] = BAND_WATT[invoer.soort][invoer.tubeless ? "tubeless" : "binnenband"];
  return { verschil: bandVerschil(midden), bereik: [bandVerschil(laag), bandVerschil(hoog)] };
}

const getal = (n: number, decimalen = 0) => n.toLocaleString("nl-NL", { maximumFractionDigits: decimalen });

export function schat(rij: EigenRij): EigenProduct {
  const basis = { id: `eigen:${rij.id}` as EigenRef, naam: rij.naam };
  const invoer = rij.invoer;
  switch (invoer.onderdeel) {
    case "helm": {
      const s = schatHelm(invoer);
      const voorbeeld = invoer.lijktOp ? HELM_PRODUCTEN.find((h) => h.id === invoer.lijktOp)?.naam : undefined;
      return { ...basis, onderdeel: "helm", ...s, helm: s.uiterlijk, gemeten: `Schatting, ${voorbeeld ? `lijkt op ${voorbeeld}` : HELM_TYPE_LABEL[invoer.type].toLowerCase()}` };
    }
    case "fiets": {
      const s = schatFiets(invoer);
      const voorbeeld = invoer.lijktOp ? FIETS_PRODUCTEN.find((f) => f.id === invoer.lijktOp)?.naam : undefined;
      return {
        ...basis,
        onderdeel: "fiets",
        ...s,
        fiets: s.uiterlijk,
        kg: invoer.kg,
        gemeten: `Schatting, ${voorbeeld ? `lijkt op ${voorbeeld}` : FIETS_TYPE_LABEL[invoer.type].toLowerCase()}, ${getal(invoer.kg, 1)} kg`,
      };
    }
    case "wielen": {
      const s = schatWielen(invoer.velgVoor, invoer.velgAchter);
      const velg = invoer.velgVoor === invoer.velgAchter ? `${getal(invoer.velgVoor)} mm` : `${getal(invoer.velgVoor)}/${getal(invoer.velgAchter)} mm`;
      return { ...basis, onderdeel: "wielen", ...s, wielen: wielUiterlijk(invoer.velgVoor, invoer.velgAchter), gemeten: `Schatting, ${velg}` };
    }
    case "banden": {
      const s = schatBanden(invoer);
      const type = invoer.tubeless ? "tubeless" : "binnenband";
      const gemeten =
        invoer.watt != null
          ? `${getal(invoer.watt, 1)} W, ${getal(invoer.breedte)} mm, ${type}`
          : `Schatting, ${BAND_SOORT_LABEL[invoer.soort].toLowerCase()}, ${getal(invoer.breedte)} mm, ${type}`;
      return { ...basis, onderdeel: "banden", ...s, gemeten };
    }
  }
}

// ---- Invoer controleren --------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function getalTussen(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null;
}

const HELM_IDS = new Set<string>(HELM_PRODUCTEN.map((h) => h.id).filter((id) => id !== "basis"));
const FIETS_IDS = new Set<string>(FIETS_PRODUCTEN.filter((f) => f.aero).map((f) => f.id));

export const isEigenOnderdeel = (v: unknown): v is EigenOnderdeel =>
  typeof v === "string" && (EIGEN_ONDERDELEN as readonly string[]).includes(v);

/**
 * Controleert de invoer van een eigen product, uit een formulier of uit de
 * tabel. Geeft null bij iets wat de rekenaar niet kan gebruiken.
 */
export function leesInvoer(onderdeel: unknown, raw: unknown): EigenInvoer | null {
  if (!isEigenOnderdeel(onderdeel) || !isObject(raw)) return null;
  switch (onderdeel) {
    case "helm": {
      const lijktOp = typeof raw.lijktOp === "string" && HELM_IDS.has(raw.lijktOp) ? (raw.lijktOp as HelmId) : null;
      const type = (HELM_TYPES as readonly string[]).includes(String(raw.type)) ? (raw.type as HelmProfiel) : null;
      if (!type) return null;
      return { onderdeel, lijktOp, type: lijktOp ? HELM_PRODUCTEN.find((h) => h.id === lijktOp)!.uiterlijk.profiel : type };
    }
    case "fiets": {
      const kg = getalTussen(raw.kg, FIETS_MIN_KG, FIETS_MAX_KG);
      const lijktOp = typeof raw.lijktOp === "string" && FIETS_IDS.has(raw.lijktOp) ? (raw.lijktOp as FietsId) : null;
      const type = (FIETS_TYPES as readonly string[]).includes(String(raw.type)) ? (raw.type as FietsType) : null;
      if (kg == null || !type) return null;
      return { onderdeel, kg, lijktOp, type: lijktOp ? "aero" : type };
    }
    case "wielen": {
      const velgVoor = getalTussen(raw.velgVoor, VELG_MIN_MM, VELG_MAX_MM);
      const velgAchter = getalTussen(raw.velgAchter, VELG_MIN_MM, VELG_MAX_MM);
      if (velgVoor == null || velgAchter == null) return null;
      return { onderdeel, velgVoor, velgAchter };
    }
    case "banden": {
      const breedte = getalTussen(raw.breedte, BAND_MIN_MM, BAND_MAX_MM);
      const soort = (BAND_SOORTEN as readonly string[]).includes(String(raw.soort)) ? (raw.soort as BandSoort) : null;
      const leeg = raw.watt == null || raw.watt === "";
      const watt = leeg ? null : getalTussen(raw.watt, 3, 40);
      if (breedte == null || !soort || typeof raw.tubeless !== "boolean" || (!leeg && watt == null)) return null;
      return { onderdeel, breedte, tubeless: raw.tubeless, soort, watt };
    }
  }
}

export function leesNaam(raw: unknown): string | null {
  const naam = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  return naam.length >= 1 && naam.length <= NAAM_MAX ? naam : null;
}

/** De invoer zonder het onderdeel, zoals hij in de kolom `invoer` staat. */
export function invoerVoorOpslag(invoer: EigenInvoer): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...invoer };
  delete rest.onderdeel;
  return rest;
}
