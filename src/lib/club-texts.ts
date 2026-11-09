// De namen die een lid van de club ziet: de clubnaam, hoe een lid heet en hoe
// elke module heet (fase 3 van de generieke versie, docs/multi-club-ontwerp.md).
// Puur en zonder serverafhankelijkheden, zodat server components (via
// getClub().texts) en client components (via useClubTexts()) dezelfde vorm
// krijgen.

import { MODULES, isModuleKey, type ModuleKey } from "@/lib/modules";

export type ClubTexts = {
  /** Volledige naam, bv. "ZWB Cycling". */
  name: string;
  /** Korte naam, bv. "ZWB". */
  shortName: string;
  /** Hoe een lid heet, bv. "ZWB'er"; zonder eigen woord "lid". */
  memberNoun: string;
  /** Meervoud, bv. "ZWB'ers"; zonder eigen woord "leden". */
  memberNounPlural: string;
  /** Het contactadres van de club (privacyverklaring), of null. */
  contactEmail: string | null;
  /** Naam van elke module bij deze club; zonder eigen naam de neutrale. */
  modules: Record<ModuleKey, string>;
  /** Modules die uit staan, om de hulp ervan te verbergen (ModuleGate). */
  off: ModuleKey[];
  /** Eigen woorden van de club (0316), als token `{sleutel}` te gebruiken. */
  words: ClubWords;
};

/**
 * Woorden die bij ZWB een woordspeling zijn. Zonder eigen woord een neutraal
 * woord, zodat de zin blijft kloppen.
 */
export type ClubWords = {
  /** De naam van de app, bv. "ZWBasis"; zonder eigen naam "<korte naam>-app". */
  app: string;
  /** De naam van het dagadvies, bv. "ZWBeterWorden"; anders "Dagadvies". */
  adviesnaam: string;
  /** Het dagadvies in een zin, bv. "ZWBeterWorden-advies"; anders "dagadvies". */
  advies: string;
  /** Het betaalmiddel van het voorspelspel, bv. "ZWBal"; anders "bal". */
  bal: string;
  /** Meervoud, bv. "ZWBallen"; anders "ballen". */
  ballen: string;
  /** Eén beker van de prijzenkast, bv. "ZWBeker"; anders "beker". */
  beker: string;
};

export const WORD_KEYS = ["app", "adviesnaam", "advies", "bal", "ballen", "beker"] as const satisfies readonly (keyof ClubWords)[];

/** De eigen woorden uit club_settings (0316), aangevuld met de neutrale. */
export function buildClubWords(club: {
  shortName: string;
  appName?: string | null;
  adviceName?: string | null;
  currencyNoun?: string | null;
  currencyNounPlural?: string | null;
  cupNoun?: string | null;
}): ClubWords {
  const advice = club.adviceName?.trim();
  return {
    app: club.appName?.trim() || `${club.shortName}-app`,
    adviesnaam: advice || "Dagadvies",
    advies: advice ? `${advice}-advies` : "dagadvies",
    bal: club.currencyNoun?.trim() || "bal",
    ballen: club.currencyNounPlural?.trim() || "ballen",
    beker: club.cupNoun?.trim() || "beker",
  };
}

/** De neutrale namen uit het register. */
export function neutralModuleNames(): Record<ModuleKey, string> {
  return Object.fromEntries(MODULES.map((m) => [m.key, m.label])) as Record<ModuleKey, string>;
}

export function buildClubTexts(
  club: {
    name: string;
    shortName: string;
    memberNoun?: string | null;
    memberNounPlural?: string | null;
    contactEmail?: string | null;
    appName?: string | null;
    adviceName?: string | null;
    currencyNoun?: string | null;
    currencyNounPlural?: string | null;
    cupNoun?: string | null;
  },
  labelFor: (key: ModuleKey) => string,
  off: Iterable<ModuleKey> = [],
): ClubTexts {
  return {
    name: club.name,
    shortName: club.shortName,
    memberNoun: club.memberNoun?.trim() || "lid",
    memberNounPlural: club.memberNounPlural?.trim() || "leden",
    contactEmail: club.contactEmail?.trim() || null,
    modules: Object.fromEntries(MODULES.map((m) => [m.key, labelFor(m.key)])) as Record<
      ModuleKey,
      string
    >,
    off: [...off],
    words: buildClubWords(club),
  };
}

/** De community van de club, bv. "ZWB Cycling Community" (de deelkaart). */
export function clubCommunity(texts: Pick<ClubTexts, "name">): string {
  return `${texts.name} Community`;
}

/** De omschrijving in de metadata en het manifest. */
export function clubDescription(texts: Pick<ClubTexts, "name">): string {
  return `Hub voor ${clubCommunity(texts)} — events, training, teams en chat.`;
}

/** Een token: een woord of `m:sleutel` tussen accolades. */
const CLUB_TOKEN = /\{([A-Za-z]+|m:[a-z_]+)\}/g;

/**
 * Vult de clubwoorden in een vaste tekst in, voor teksten die als data in de
 * code staan (de hulp). `{club}` is de volledige naam, `{kort}` de korte naam,
 * `{lid}` en `{leden}` hoe een lid heet, `{m:sleutel}` de naam van een module
 * en `{app}`, `{advies}`, `{adviesnaam}`, `{bal}`, `{ballen}` en `{beker}` de
 * eigen woorden (ClubWords). Met een hoofdletter (`{Beker}`) begint het woord
 * met een hoofdletter, voor het begin van een zin of een titel. Een onbekende
 * sleutel blijft staan, zodat een fout zichtbaar is.
 */
export function fillClubText(text: string, texts: ClubTexts): string {
  return text.replace(CLUB_TOKEN, (whole, key: string) => {
    const lower = key.charAt(0).toLowerCase() + key.slice(1);
    const value = clubWord(lower, texts);
    if (value == null) return whole;
    return lower === key ? value : capitalize(value);
  });
}

function clubWord(key: string, texts: ClubTexts): string | null {
  if (key === "club") return texts.name;
  if (key === "kort") return texts.shortName;
  if (key === "lid") return texts.memberNoun;
  if (key === "leden") return texts.memberNounPlural;
  if ((WORD_KEYS as readonly string[]).includes(key)) return texts.words[key as keyof ClubWords];
  if (key.startsWith("m:")) {
    const moduleKey = key.slice(2);
    return isModuleKey(moduleKey) ? texts.modules[moduleKey] : null;
  }
  return null;
}

/** De eerste letter als hoofdletter; "ZWBeker" blijft "ZWBeker". */
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
