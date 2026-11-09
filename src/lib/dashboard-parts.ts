// De onderdelen van het dashboard die een lid op het profiel kan verbergen
// (wens eigenaar, 2026-11-09): wie niet met ZWBeter traint, hoeft de
// trainingstegels niet te zien. De keuze staat in
// profile_stats_tiles.dashboard_hidden (migratie 0318) als lijst van verborgen
// sleutels; standaard staat alles aan, dus een nieuw onderdeel verschijnt
// vanzelf. De volgorde ligt vast.
//
// Niet te verbergen: de Zwift-ID- en gewichtmelding, en het blok met je ritten
// en de Strava-sync (daar staan de knoppen en de import, en /hulp linkt erheen).

import type { ModuleKey } from "@/lib/modules";

export type DashboardPartKey =
  | "training"
  | "core"
  | "weekoverzicht"
  | "fitheid"
  | "briljant"
  | "mijn_events"
  | "overige_events"
  | "bekers"
  | "club_tegels"
  | "onderhoud"
  | "standen"
  | "nieuws"
  | "badges"
  | "clubstats"
  | "polls";

export type DashboardPartGroup = "Training" | "Fitheid" | "Events" | "Club";

export type DashboardPart = {
  key: DashboardPartKey;
  group: DashboardPartGroup;
  /** Vaste naam, of de clubnaam van een module (zoals ZWBriljant). */
  label: string | { module: ModuleKey };
  /** Alleen aanbieden als de club minstens een van deze modules aan heeft;
   * leeg is altijd. */
  modules: ModuleKey[];
};

export const DASHBOARD_PARTS: readonly DashboardPart[] = [
  { key: "training", group: "Training", label: "Trainingen en advies", modules: ["training"] },
  { key: "core", group: "Training", label: "Core", modules: ["training"] },
  { key: "weekoverzicht", group: "Training", label: "Weekoverzicht", modules: ["weekoverzicht"] },
  { key: "fitheid", group: "Fitheid", label: "Fitness, vorm en herstel", modules: ["training"] },
  { key: "briljant", group: "Fitheid", label: { module: "rennersniveau" }, modules: ["rennersniveau"] },
  { key: "mijn_events", group: "Events", label: "Mijn events", modules: [] },
  { key: "overige_events", group: "Events", label: "Overige events", modules: [] },
  { key: "bekers", group: "Club", label: { module: "bekers" }, modules: ["bekers"] },
  { key: "club_tegels", group: "Club", label: "Q&A en Instagram", modules: [] },
  { key: "onderhoud", group: "Club", label: "Onderhoud fietsen", modules: ["garage"] },
  { key: "standen", group: "Club", label: "FRR- en SRC-standen", modules: ["teams", "src"] },
  { key: "nieuws", group: "Club", label: "Nieuws en mededelingen", modules: ["media"] },
  { key: "badges", group: "Club", label: "Badges", modules: ["bekers"] },
  { key: "clubstats", group: "Club", label: "Clubstats", modules: ["stats"] },
  { key: "polls", group: "Club", label: "Polls en ledenvoordeel", modules: ["polls", "sponsors"] },
];

const KEYS = new Set<string>(DASHBOARD_PARTS.map((part) => part.key));

export function isDashboardPartKey(value: unknown): value is DashboardPartKey {
  return typeof value === "string" && KEYS.has(value);
}

/** De verborgen onderdelen uit wat er opgeslagen staat; onbekende sleutels
 * (een onderdeel dat er niet meer is) vallen weg. */
export function parseDashboardHidden(value: unknown): Set<DashboardPartKey> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter(isDashboardPartKey));
}

/** De onderdelen die deze club aanbiedt. */
export function offeredDashboardParts(
  isEnabled: (key: ModuleKey) => boolean,
): DashboardPart[] {
  return DASHBOARD_PARTS.filter(
    (part) => part.modules.length === 0 || part.modules.some((key) => isEnabled(key)),
  );
}
