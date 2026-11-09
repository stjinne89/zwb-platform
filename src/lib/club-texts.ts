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
};

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

/**
 * Vult de clubwoorden in een vaste tekst in, voor teksten die als data in de
 * code staan (de hulp). `{club}` is de volledige naam, `{kort}` de korte naam,
 * `{lid}` en `{leden}` hoe een lid heet, en `{m:sleutel}` de naam van een
 * module. Een onbekende sleutel blijft staan, zodat een fout zichtbaar is.
 */
export function fillClubText(text: string, texts: ClubTexts): string {
  return text.replace(/\{(club|kort|lid|leden|m:[a-z_]+)\}/g, (whole, key: string) => {
    if (key === "club") return texts.name;
    if (key === "kort") return texts.shortName;
    if (key === "lid") return texts.memberNoun;
    if (key === "leden") return texts.memberNounPlural;
    const moduleKey = key.slice(2);
    return isModuleKey(moduleKey) ? texts.modules[moduleKey] : whole;
  });
}
