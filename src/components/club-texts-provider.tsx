"use client";

import { createContext, useContext } from "react";
import { neutralModuleNames, type ClubTexts } from "@/lib/club-texts";
import type { ModuleKey } from "@/lib/modules";

// De clubnaam en de modulenamen voor client components. De root layout zet de
// waarden uit getClub(); buiten die layout (tests) gelden de neutrale namen.

const NEUTRAL: ClubTexts = { name: "Club", shortName: "Club", modules: neutralModuleNames() };

const ClubTextsContext = createContext<ClubTexts>(NEUTRAL);

export function ClubTextsProvider({
  texts,
  children,
}: {
  texts: ClubTexts;
  children: React.ReactNode;
}) {
  return <ClubTextsContext.Provider value={texts}>{children}</ClubTextsContext.Provider>;
}

export function useClubTexts(): ClubTexts {
  return useContext(ClubTextsContext);
}

/** De naam van deze module bij de club. */
export function useModuleName(key: ModuleKey): string {
  return useContext(ClubTextsContext).modules[key];
}

/** De naam van een module als tekst in JSX; werkt ook binnen server components. */
export function ModuleName({ module }: { module: ModuleKey }) {
  return <>{useModuleName(module)}</>;
}
