// Wat een lid zelf verborgen heeft (wens eigenaar, 2026-11-17; migratie 0336).
//
// Leden raakten overweldigd door alle onderdelen. Op het profiel vinkt een lid
// uit wat het niet gebruikt: een module, of een onderdeel van ZWBeter Worden.
// Dat verdwijnt dan uit het menu, de tegels van Club, de tabbalk van ZWBeter en
// het dashboard. Verbergen, geen slot: een directe link (WhatsApp, een melding)
// blijft werken. Afsluiten is er per ledengroep (lib/module-access.ts).
//
// Opslag: profile_stats_tiles.module_hidden, een lijst van verborgen sleutels.
// Standaard staat alles aan, dus een nieuw onderdeel verschijnt vanzelf.
// Onbekende sleutels vallen weg.

import { isModuleKey, moduleForPath, type ModuleKey } from "@/lib/modules";

/**
 * De modules die een lid kan verbergen, in de volgorde van het profiel. Niet:
 * sponsors (de club houdt die zichtbaar), race-pacing en live race (die hebben
 * geen eigen plek in het menu; ze hangen aan een event).
 */
export const HIDEABLE_MODULES: readonly ModuleKey[] = [
  "training",
  "weekoverzicht",
  "rennersniveau",
  "samen_fietsen",
  "teams",
  "stats",
  "bekers",
  "segmenten",
  "blokkenjacht",
  "managerspel",
  "omnium",
  "src",
  "voorspelspel",
  "bibliotheek",
  "clubverhaal",
  "whatsapp",
  "polls",
  "media",
  "ritverslagen",
  "garage",
];

/**
 * De onderdelen van ZWBeter Worden die een lid kan verbergen. Vandaag en Schema
 * blijven: dat is ZWBeter zelf. De trainerspagina hangt aan een recht.
 */
export const HIDEABLE_ZWBETER_TABS: readonly string[] = [
  "/zwbeter-worden/jaarplan",
  "/zwbeter-worden/belasting",
  "/zwbeter-worden/vermogen",
  "/zwbeter-worden/doelen",
  "/zwbeter-worden/uitgangspunten",
  "/zwbeter-worden/logboek",
  "/zwbeter-worden/protocollen",
  "/zwbeter-worden/kennis",
  "/zwbeter-worden/coach",
  "/zwbeter-worden/racen",
  "/zwbeter-worden/voeding",
  "/zwbeter-worden/core",
  "/zwbeter-worden/materiaal",
];

const MODULE_SET = new Set<string>(HIDEABLE_MODULES);
const TAB_SET = new Set<string>(HIDEABLE_ZWBETER_TABS);

export type MemberHidden = {
  modules: ReadonlySet<ModuleKey>;
  tabs: ReadonlySet<string>;
};

export function isHideableKey(value: unknown): value is string {
  return typeof value === "string" && (MODULE_SET.has(value) || TAB_SET.has(value));
}

/** Wat het lid verborgen heeft, uit wat er opgeslagen staat. */
export function parseMemberHidden(value: unknown): MemberHidden {
  const modules = new Set<ModuleKey>();
  const tabs = new Set<string>();
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!isHideableKey(item)) continue;
      if (isModuleKey(item)) modules.add(item);
      else tabs.add(item);
    }
  }
  return { modules, tabs };
}

/** Het ZWBeter-onderdeel waar dit pad onder valt, als het lid dat kan verbergen. */
function tabForPath(pathname: string): string | null {
  for (const tab of HIDEABLE_ZWBETER_TABS) {
    if (pathname === tab || pathname.startsWith(`${tab}/`)) return tab;
  }
  return null;
}

/** Heeft het lid dit pad verborgen, als module of als ZWBeter-onderdeel? */
export function hiddenByMember(pathname: string, hidden: MemberHidden): boolean {
  const key = moduleForPath(pathname);
  if (key !== null && hidden.modules.has(key)) return true;
  const tab = tabForPath(pathname);
  return tab !== null && hidden.tabs.has(tab);
}
