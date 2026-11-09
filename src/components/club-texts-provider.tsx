"use client";

import { createContext, useContext } from "react";
import { buildClubWords, fillClubText, neutralModuleNames, type ClubTexts } from "@/lib/club-texts";
import { moduleForPath, type ModuleKey } from "@/lib/modules";

// De clubnaam en de modulenamen voor client components. De root layout zet de
// waarden uit getClub(); buiten die layout (tests) gelden de neutrale namen.

const NEUTRAL: ClubTexts = {
  name: "Club",
  shortName: "Club",
  memberNoun: "lid",
  memberNounPlural: "leden",
  contactEmail: null,
  modules: neutralModuleNames(),
  off: [],
  words: buildClubWords({ shortName: "Club" }),
};

const ClubTextsContext = createContext<ClubTexts>(NEUTRAL);

export function ClubTextsProvider({
  texts,
  children,
}: {
  texts: ClubTexts;
  children?: React.ReactNode;
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

/** De volledige clubnaam als tekst in JSX, bv. "ZWB Cycling". */
export function ClubName() {
  return <>{useClubTexts().name}</>;
}

/** De korte clubnaam als tekst in JSX, bv. "ZWB". */
export function ClubShortName() {
  return <>{useClubTexts().shortName}</>;
}

/** Hoe een lid heet als tekst in JSX, bv. "ZWB'er" of met `plural` "ZWB'ers". */
export function MemberNoun({ plural = false }: { plural?: boolean }) {
  const texts = useClubTexts();
  return <>{plural ? texts.memberNounPlural : texts.memberNoun}</>;
}

/** Een vaste tekst met clubwoorden ({kort}, {beker}, {m:sleutel}; zie fillClubText). */
export function ClubText({ text }: { text: string }) {
  return <>{fillClubText(text, useClubTexts())}</>;
}

/**
 * Het contactadres van de club als mail-link; zonder adres "het bestuur", zodat
 * de zin blijft kloppen.
 */
export function ClubContactLink({ className }: { className?: string }) {
  const { contactEmail } = useClubTexts();
  if (!contactEmail) return <>het bestuur</>;
  return (
    <a href={`mailto:${contactEmail}`} className={className}>
      {contactEmail}
    </a>
  );
}

/**
 * Toont de inhoud alleen als de module aan staat: gegeven als `module`, of als
 * de module van `href`. Voor de hulp, die over alle modules gaat.
 */
export function ModuleGate({
  module,
  href,
  children,
}: {
  module?: ModuleKey | null;
  href?: string;
  children: React.ReactNode;
}) {
  const { off } = useClubTexts();
  const key = module ?? (href ? moduleForPath(href) : null);
  if (key && off.includes(key)) return null;
  return <>{children}</>;
}
