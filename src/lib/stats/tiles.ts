// Het register van tegels op /stats/ik, en de keuze van het lid daaruit.
//
// Ieder lid kiest zelf welke tegels zichtbaar zijn en in welke volgorde
// (wens eigenaar, 2026-10-16). De keuze staat in profile_stats_tiles (migratie
// 0241) als [{ id, visible }]. Wat daar staat is nooit de waarheid over welke
// tegels bestaan: normalizeLayout laat onbekende id's vallen en zet tegels die er
// later bij kwamen achteraan, met hun standaardzichtbaarheid.

export type TileSource = "strava" | "intervals";

export type TileDef = {
  id: string;
  title: string;
  /** "intervals": alleen met een intervals.icu-koppeling. */
  source: TileSource;
  /** "full" neemt de hele breedte, "half" de helft vanaf lg. */
  width: "full" | "half";
  defaultVisible: boolean;
  /** Hersteldata (rust-HR, HRV, slaap): alleen met de aparte opt-in. */
  needsWellnessOptIn?: boolean;
};

export const STATS_TILES = [
  { id: "totalen", title: "Totalen", source: "strava", width: "full", defaultVisible: true },
  { id: "volume", title: "Volume", source: "strava", width: "full", defaultVisible: true },
  { id: "vermogen", title: "Vermogen", source: "strava", width: "half", defaultVisible: true },
  { id: "fitheid", title: "Fitheid", source: "strava", width: "half", defaultVisible: true },
  { id: "efficientie", title: "Watt per hartslag", source: "strava", width: "half", defaultVisible: false },
  { id: "jaarvergelijking", title: "Jaar op jaar", source: "strava", width: "half", defaultVisible: false },
  { id: "kalender", title: "Kalender", source: "strava", width: "full", defaultVisible: false },
  { id: "discipline", title: "Disciplines", source: "strava", width: "half", defaultVisible: false },
  { id: "records", title: "Records", source: "strava", width: "half", defaultVisible: true },
  { id: "badges", title: "Badges", source: "strava", width: "half", defaultVisible: true },
  { id: "piekvermogen", title: "Piekvermogen", source: "intervals", width: "full", defaultVisible: true },
  { id: "cp-wprime", title: "CP en W′", source: "intervals", width: "half", defaultVisible: true },
  { id: "eftp-gewicht", title: "eFTP en gewicht", source: "intervals", width: "half", defaultVisible: false },
  { id: "curve-per-jaar", title: "Powercurve per jaar", source: "intervals", width: "full", defaultVisible: false },
  { id: "zones-vermogen", title: "Tijd per vermogenszone", source: "intervals", width: "full", defaultVisible: true },
  { id: "zones-hartslag", title: "Tijd per hartslagzone", source: "intervals", width: "half", defaultVisible: false },
  { id: "wbal", title: "W′bal en boven FTP", source: "intervals", width: "half", defaultVisible: false },
  { id: "duurvermogen", title: "Duurvermogen", source: "intervals", width: "half", defaultVisible: false },
  { id: "herstel", title: "Herstel", source: "intervals", width: "half", defaultVisible: false, needsWellnessOptIn: true },
  { id: "ritten", title: "Ritten", source: "strava", width: "full", defaultVisible: true },
] as const satisfies readonly TileDef[];

export type TileId = (typeof STATS_TILES)[number]["id"];

/**
 * De tegels op /stats (Club). Dezelfde opbouw als Ik, maar opgeteld over alle
 * leden; alles komt uit strava_activities, dus geen intervals-tegels.
 */
export const CLUB_STATS_TILES = [
  { id: "totalen", title: "Totalen", source: "strava", width: "full", defaultVisible: true },
  { id: "volume", title: "Volume", source: "strava", width: "full", defaultVisible: true },
  { id: "jaarvergelijking", title: "Jaar op jaar", source: "strava", width: "half", defaultVisible: true },
  { id: "top", title: "Top riders", source: "strava", width: "half", defaultVisible: true },
  { id: "discipline", title: "Disciplines", source: "strava", width: "half", defaultVisible: true },
  { id: "regio", title: "Regio's", source: "strava", width: "half", defaultVisible: true },
  { id: "records", title: "Clubrecords", source: "strava", width: "half", defaultVisible: false },
] as const satisfies readonly TileDef[];

export type ClubTileId = (typeof CLUB_STATS_TILES)[number]["id"];

export type StatsPage = "ik" | "club";

export const TILES_BY_PAGE: Record<StatsPage, readonly TileDef[]> = {
  ik: STATS_TILES,
  club: CLUB_STATS_TILES,
};

export type TileLayoutItem<Id extends string = TileId> = { id: Id; visible: boolean };
export type TileLayout<Id extends string = TileId> = TileLayoutItem<Id>[];

const TILE_IDS = new Set<string>(STATS_TILES.map((tile) => tile.id));

export function isTileId(value: unknown): value is TileId {
  return typeof value === "string" && TILE_IDS.has(value);
}

export function tileDef(id: TileId): TileDef {
  return STATS_TILES.find((tile) => tile.id === id)!;
}

export function clubTileDef(id: ClubTileId): TileDef {
  return CLUB_STATS_TILES.find((tile) => tile.id === id)!;
}

export function defaultLayout<Id extends string = TileId>(tiles: readonly TileDef[] = STATS_TILES): TileLayout<Id> {
  return tiles.map((tile) => ({ id: tile.id as Id, visible: tile.defaultVisible }));
}

/**
 * Maakt van een opgeslagen keuze een volledige lijst: geldige id's in de
 * gekozen volgorde (dubbele weg), daarna elke tegel die nog ontbrak.
 */
export function normalizeLayout<Id extends string = TileId>(
  saved: unknown,
  tiles: readonly TileDef[] = STATS_TILES,
): TileLayout<Id> {
  const known = new Map(tiles.map((tile) => [tile.id, tile]));
  const seen = new Set<string>();
  const layout: TileLayout<Id> = [];
  if (Array.isArray(saved)) {
    for (const item of saved) {
      if (!item || typeof item !== "object") continue;
      const { id, visible } = item as { id?: unknown; visible?: unknown };
      if (typeof id !== "string" || !known.has(id) || seen.has(id)) continue;
      seen.add(id);
      layout.push({ id: id as Id, visible: visible === true });
    }
  }
  for (const tile of tiles) {
    if (!seen.has(tile.id)) layout.push({ id: tile.id as Id, visible: tile.defaultVisible });
  }
  return layout;
}

/**
 * Wat een lid mag opslaan: een lijst met alleen bekende id's, elk één keer, en
 * niet meer dan er tegels zijn. Anders null; de server-action slaat dan niets op.
 */
export function parseLayoutInput<Id extends string = TileId>(
  input: unknown,
  tiles: readonly TileDef[] = STATS_TILES,
): TileLayout<Id> | null {
  if (!Array.isArray(input) || input.length > tiles.length) return null;
  const known = new Set(tiles.map((tile) => tile.id));
  const seen = new Set<string>();
  const layout: TileLayout<Id> = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return null;
    const { id, visible } = item as { id?: unknown; visible?: unknown };
    if (typeof id !== "string" || !known.has(id) || seen.has(id) || typeof visible !== "boolean") {
      return null;
    }
    seen.add(id);
    layout.push({ id: id as Id, visible });
  }
  return layout;
}
