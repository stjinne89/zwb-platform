// Het register van tegels op /stats/ik, en de keuze van het lid daaruit.
//
// Ieder lid kiest zelf welke tegels zichtbaar zijn en in welke volgorde
// (wens eigenaar, 2026-10-16). De keuze staat in profile_stats_tiles (migratie
// 0241) als [{ id, visible }]. Wat daar staat is nooit de waarheid over welke
// tegels bestaan: normalizeLayout laat onbekende id's vallen en zet tegels die er
// later bij kwamen achteraan, met hun standaardzichtbaarheid.

export type TileSource = "strava" | "intervals";

/**
 * Wat een tegel laat zien, voor de uitleg achter de titel (hover of tik). Kort:
 * de volledige uitleg staat op /hulp, en waar een kennisbankartikel over het
 * onderwerp gaat, linkt de uitleg daarheen.
 */
export type TileInfo = {
  text: string;
  /** Slug van een artikel in de kennisbank trainen (/zwbeter-worden/kennis). */
  article?: string;
};

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
  /** Ingevuld door tileDef en clubTileDef, uit de uitleg hieronder. */
  info?: TileInfo;
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

/** De uitleg achter de titel van elke tegel op Ik. */
export const STATS_TILE_INFO: Record<TileId, TileInfo> = {
  totalen: {
    text: "Je kilometers, uren, hoogtemeters, ritten, kJ en TSS in het gekozen bereik. Het pijltje vergelijkt met dezelfde dagen een jaar eerder, als je toen minstens drie ritten had.",
  },
  volume: {
    text: "Per week, maand of jaar. Het streepje is dezelfde periode vorig jaar, de stippellijn je gemiddelde over de afgesloten periodes, en een gestreepte staaf loopt nog.",
  },
  vermogen: {
    text: "Je hoogste en je gemiddelde NP per periode, van ritten van minstens twintig minuten met een echte vermogensmeter. De stippellijn is je FTP van toen. Een rit boven 1,2 keer je FTP is een meetfout en telt niet mee.",
    article: "ftp-test",
  },
  fitheid: {
    text: "Fitheid (CTL) is je gemiddelde belasting over zes weken, vermoeidheid (ATL) over een week. Vorm is het verschil: onder nul ben je moe van de laatste dagen.",
    article: "opbouwen",
  },
  efficientie: {
    text: "Je NP gedeeld door je gemiddelde hartslag, alleen over rustige duurritten. Stijgt de lijn, dan trap je meer watt bij dezelfde hartslag.",
    article: "lange-ritten",
  },
  jaarvergelijking: {
    text: "Je kilometers opgeteld vanaf 1 januari, met een lijn per jaar. Zo zie je of je voor of achter ligt op vorig jaar.",
  },
  kalender: {
    text: "Elk vakje is een dag van het afgelopen jaar; hoe voller de kleur, hoe meer kilometers. Een reeks weken loopt door zolang je elke week minstens één keer reed.",
  },
  discipline: {
    text: "Je uren per soort rit: weg, Zwift, gravel en de rest, met kilometers en ritten eronder.",
  },
  records: {
    text: "Je beste rit per soort en je beste week, maand en jaar ooit, los van het gekozen bereik.",
  },
  badges: {
    text: "Hoeveel mijlpalen en weekbadges je hebt, met de nieuwste erbij. De hele kast staat op je profiel.",
  },
  piekvermogen: {
    text: "Je beste vermogen over 5 seconden, 1, 5 en 20 minuten per periode, uit intervals.icu. Een maand zonder harde inspanning op die duur ligt dus lager, ook als je niet minder fit was.",
    article: "intervallen",
  },
  "cp-wprime": {
    text: "CP is het vermogen dat je lang kunt volhouden, W′ je reserve daarboven. Per periode berekend uit je beste inspanningen tussen 2 en 20 minuten.",
    article: "intervallen",
  },
  "eftp-gewicht": {
    text: "eFTP is de schatting van je FTP die intervals.icu uit je ritten maakt, met je gewicht van toen ernaast.",
    article: "ftp-test",
  },
  "curve-per-jaar": {
    text: "Je beste vermogen op elke duur, per jaar over elkaar. Ligt een lijn hoger, dan was je dat jaar sterker op die duur.",
  },
  "zones-vermogen": {
    text: "Hoeveel tijd je per vermogenszone reed, in je eigen zones uit intervals.icu. Alleen ritten die rechtstreeks in intervals.icu staan tellen mee.",
    article: "zones",
  },
  "zones-hartslag": {
    text: "Hoeveel tijd je per hartslagzone reed, in je eigen zones uit intervals.icu. Alleen ritten die rechtstreeks in intervals.icu staan tellen mee.",
    article: "zones",
  },
  wbal: {
    text: "De staaf is je arbeid boven FTP in de periode, de lijn hoe diep je je anaerobe reserve (W′) in één rit leegtrok.",
  },
  duurvermogen: {
    text: "Decoupling is hoeveel je hartslag oploopt terwijl je vermogen gelijk blijft, over ritten van minstens anderhalf uur; lager is beter. EF is watt per hartslag.",
    article: "lange-ritten",
  },
  herstel: {
    text: "Je gemiddelde rusthartslag, HRV en slaap per periode. Vergelijk met je eigen gewone waarden: een hogere rusthartslag of lagere HRV wijst op vermoeidheid.",
    article: "herstel-meten",
  },
  ritten: {
    text: "Al je ritten in het gekozen bereik, nieuwste eerst. NP, IF en TSS staan er alleen bij een echte vermogensmeter.",
  },
};

/** De uitleg achter de titel van elke tegel op Club. */
export const CLUB_TILE_INFO: Record<ClubTileId, TileInfo> = {
  totalen: {
    text: "Opgeteld over de leden die in het bereik reden. Km per lid is het totaal gedeeld door de actieve leden: zo zie je of de club meer rijdt of vooral groeit.",
  },
  volume: {
    text: "Het volume van de club per week, maand of jaar. Leden is hoeveel leden in die periode reden. Het streepje is dezelfde periode vorig jaar.",
  },
  jaarvergelijking: {
    text: "De kilometers van de club opgeteld vanaf 1 januari, met een lijn per jaar.",
  },
  top: {
    text: "De ranglijst op kilometers, uren of hoogtemeters, over het bereik of de gekozen periode. Je eigen plek staat in goud.",
  },
  discipline: {
    text: "De uren van de club per soort rit: weg, Zwift, gravel en de rest.",
  },
  regio: {
    text: "Kilometers per regio, uit het profiel van de leden. Leden zonder regio staan onderaan bij Onbekend.",
  },
  records: {
    text: "De beste week, maand en jaar van de club, en de maand met de meeste rijders.",
  },
};

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
  return { ...STATS_TILES.find((tile) => tile.id === id)!, info: STATS_TILE_INFO[id] };
}

export function clubTileDef(id: ClubTileId): TileDef {
  return { ...CLUB_STATS_TILES.find((tile) => tile.id === id)!, info: CLUB_TILE_INFO[id] };
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
