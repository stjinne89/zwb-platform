// De namen die een lid van de club ziet: de clubnaam en hoe elke module heet
// (fase 3 van de generieke versie, docs/multi-club-ontwerp.md). Puur en zonder
// serverafhankelijkheden, zodat server components (via getClub().texts) en
// client components (via useClubTexts()) dezelfde vorm krijgen.

import { MODULES, type ModuleKey } from "@/lib/modules";

export type ClubTexts = {
  /** Volledige naam, bv. "ZWB Cycling". */
  name: string;
  /** Korte naam, bv. "ZWB". */
  shortName: string;
  /** Naam van elke module bij deze club; zonder eigen naam de neutrale. */
  modules: Record<ModuleKey, string>;
};

/** De neutrale namen uit het register. */
export function neutralModuleNames(): Record<ModuleKey, string> {
  return Object.fromEntries(MODULES.map((m) => [m.key, m.label])) as Record<ModuleKey, string>;
}

export function buildClubTexts(
  name: string,
  shortName: string,
  labelFor: (key: ModuleKey) => string,
): ClubTexts {
  return {
    name,
    shortName,
    modules: Object.fromEntries(MODULES.map((m) => [m.key, labelFor(m.key)])) as Record<
      ModuleKey,
      string
    >,
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
