// ZWBlokken in de Zwift-werelden: welke wereld, welke blokken?
//
// Zwift legt zijn werelden op vaste coördinaten: Watopia, Makuri Islands, France
// en Crit City op verzonnen plekken in de Stille Oceaan, London, New York, Paris
// en de rest op de echte stad. Een VirtualRide-routelijn ligt dus gewoon op de
// kaart, en het blokraster uit grid.ts werkt er ongewijzigd op — alleen fijner,
// en in een eigen tabel (zie migratie 0165).
//
// Alleen Zwift. Rouvy en FulGaz rijden over echte video-routes (Paris, de Gavia),
// MyWhoosh heeft eigen werelden; die zouden hier verkeerd of nergens landen.

import { worlds } from "zwift-data";
import type { GpxPoint } from "@/lib/gpx";
import { haversineKm } from "@/lib/gpx";
import { blockCentre, blocksForPolyline, parseBlockKey } from "./grid";

/**
 * ~600 m. Op zoom 14 is Watopia 36 blokken en Crit City er één: in een paar
 * weken vol. De routelijn van Strava heeft gemiddeld elke 60 m een punt, dus
 * fijner dan dit kan, maar dan snijdt de lijn bochten af en kleuren buurblokken.
 */
export const ZWIFT_BLOCK_ZOOM = 16;

/** Marge rond de wereldgrenzen uit zwift-data, in graden (~2 km). */
const BOUNDS_MARGIN = 0.02;

/**
 * Langer dan dit tussen twee punten is altijd een sprong: een event dat naar
 * een andere wereld springt. In productie waren er 9 sprongen boven de 10 km, en
 * die waren allemaal van dit soort.
 */
const MAX_SEGMENT_KM = 10;

/**
 * Binnen een wereld springt Zwift ook: naar een startvak, een portal of het
 * begin van een event. Zulke stappen van 2 tot 9 km trokken een rechte lijn over
 * de kaart, en de supercover-DDA kleurde elk blok eronder alsof je die weg had
 * gereden (gemeten 2026-11-25: in Watopia ~30 blokken bij één lid). Een stap
 * telt daarom als sprong zodra hij langer is dan JUMP_FACTOR keer de gewone
 * puntafstand van die rit, met JUMP_MIN_KM als ondergrens. De gewone afstand is
 * de mediaan: die verschuift niet door de sprongen zelf. Strava dunt de lijn
 * van een lange rit uit (de Rapha 500: één punt per ~2 km), en daar blijft de
 * grens zo vanzelf ruim.
 *
 * De ondergrens hangt af van de lijn. In Strava's samenvattingslijn kan ook een
 * echte, rechte weg één lange stap zijn, dus daar 1,5 km. De volledige lijn
 * heeft een punt per ~20 m (mediaan over 1.144 ritten, 2026-11-25); daar is
 * 300 m al een sprong. Met 1,5 km bleef een sprong van 600 m dwars door London
 * staan. Gemeten over alle Zwift-ritten verdween met 300 m geen enkel blok waar
 * een bekende route doorheen loopt.
 */
const JUMP_MIN_KM = 1.5;
const JUMP_MIN_KM_FULL = 0.3;
const JUMP_FACTOR = 4;

/**
 * Climb Portals tellen nergens mee (besluit eigenaar, 2026-11-25): ook niet als
 * Zwift de klim binnen de kaart van een wereld legt, want daar tekent de minimap
 * geen weg. Drie vangnetten, omdat geen van drieën alles vangt:
 *
 * - de portal zelf. Elke portalklim in een wereld begint op dezelfde plek: in
 *   France alle 54 portalritten van de club binnen een paar honderd meter van
 *   PORTALS.france, in Watopia van PORTALS.watopia. Een stuk rit (tussen twee
 *   sprongen) dat daar begint, is de klim;
 * - de kaartrand. In Watopia loopt een portalklim vanaf de portal de kaart uit.
 *   Een stuk rit dat ergens buiten de kaart komt, telt helemaal niet, ook het
 *   deel binnen de kaart: buiten de kaart ligt geen weg;
 * - de naam. "Climb Portal: Col des Aravis" en "… on Pla d'Adet in Watopia"
 *   noemen de klim. Niet "Climb Portal - Volcano" of "- Mont Saint-Michel": dat
 *   zijn gewone wegen naar de portal (routes in zwift-data).
 *
 * Wat de club tot 2026-11-25 aan portalklimmen reed, staat in PORTAL_CLIMBS.
 * Komt er een nieuwe klim bij, dan vangen de portal en de kaartrand hem meestal
 * al; de naamlijst is het derde net.
 */
const PORTALS: Record<string, { lat: number; lon: number }> = {
  france: { lat: -21.731, lon: 166.154 },
  watopia: { lat: -11.64, lon: 166.944 },
};
const PORTAL_RADIUS_KM = 0.5;

/**
 * Losse uitzonderingen, met de hand (besluit eigenaar, 2026-11-25), na een
 * kaartcontrole van alle twaalf werelden.
 *
 * Ritten die niet meetellen: Harmens race "Velos Monument Races (C)" van
 * 09-10-2026 in Crit City, via intervals.icu. De hele ronde ligt ~250 m
 * oostelijk van het echte rondje; geen enkele andere clubrit doet dat. Een
 * regel die zo'n rit vangt (ver van elke bekende route), vangt ook de nieuwe
 * wegen in het noordwesten van Watopia, die `zwift_routes` nog niet kent.
 */
const EXCLUDED_RIDES = new Set<number>([-1000195547777]);

/**
 * Blokken zonder weg die na alle regels hierboven nog overbleven: hooguit twee
 * leden en geen bekende route erdoor. In Watopia rond de portal aan de
 * noordrand, één samenvattingssprong in een ZRL-TTT, een hernoemde rit op
 * Trebiac en één aan de rand van het nieuwe noordwesten. In de andere werelden
 * (2026-11-25, besluit eigenaar: "allemaal net kleine routefouten"): een
 * grove routelijn die net de hoek van een blok naast de weg afsnijdt.
 *
 * Daarna (2026-11-25, besluit eigenaar) ook de startvakken: blokken naast de
 * route waar een rit begint. Of je er een krijgt, hangt af van een paar meter in
 * je plek in het vak; het vak zelf is geen weg. Ze tellen voor niemand. Plus zes
 * blokken van meer leden zonder bekende route en zonder weg op de kaart, en in
 * Innsbruck het gras naast het keerpunt bij het meer boven op de KOM, waar ook
 * de routevorm de hoek afsnijdt.
 */
const NO_ROAD_BLOCKS: Record<string, Set<string>> = {
  watopia: new Set([
    "63151/34901", "63156/34899", "63156/34900", "63156/34901",
    "63157/34900", "63158/34900", "63158/34904", "63166/34902",
    "63161/34900", // startvak
    "63156/34914", "63158/34910", "63169/34901",
  ]),
  france: new Set(["63014/36819", "63015/36818" /* startvak */]),
  innsbruck: new Set(["34841/22979", "34843/22977", "34844/22976", "34845/22989", "34847/22993"]),
  london: new Set(["32744/21791", "32752/21795", "32754/21790" /* startvak */, "32739/21794"]),
  "makuri-islands": new Set(["62958/34747" /* startvak */, "62957/34741"]),
  "new-york": new Set(["19298/24631", "19301/24623", "19300/24633", "19300/24634" /* startvak */]),
  paris: new Set(["33189/22541", "33189/22542", "33185/22540"]),
  scotland: new Set(["31817/20521"]),
  yorkshire: new Set(["32486/21045" /* startvak */]),
};
const PORTAL_CLIMBS = [
  "Alto de Patios", "Bealach na Ba", "Cheddar Gorge", "Cipressa", "Col d'Aspin",
  "Col de la Croix Saint-Robert", "Col de la Madeleine", "Col de Peyresourde",
  "Col de Sarenne", "Col des Aravis", "Col du Galibier", "Col du Platzerwasel",
  "Col du Rosier", "Col du Télégraphe", "Col du Tourmalet", "Coll d'Ordino",
  "Côte de la Redoute", "Côte de Pike", "Côte de Trebiac", "Côte des Forche",
  "Crow Road", "Gotthard Pass", "Hardknott Pass", "Hautacam", "Isola 2000",
  "Koppenberg", "La Super Planche des Belles Filles", "Montée du Chinaillon",
  "Mt Fuji", "Mur de Huy", "Mûr de Bretagne", "Old La Honda", "Old Willunga Hill",
  "Oude Kwaremont", "Paterberg", "Pla d'Adet", "Poggio", "Puy de Dôme",
];

export type ZwiftWorld = {
  slug: string;
  name: string;
  /** [zuid, west, noord, oost], zonder marge. */
  bbox: [number, number, number, number];
  /**
   * Zwifts eigen minimap, precies op `bbox` (soms gedraaid, zie
   * `imageRotation`). Het beeld is van Zwift en wordt
   * rechtstreeks van hun CDN geladen, niet gekopieerd (besluit eigenaar,
   * 2026-09-15). Alleen een https-adres van cdn.zwift.com wordt doorgegeven.
   */
  imageUrl: string | null;
  /**
   * Hoeveel graden de minimap tegen de klok in moet draaien om noord boven te
   * krijgen. Zie IMAGE_ROTATION.
   */
  imageRotation: 0 | 90;
};

const ZWIFT_CDN = /^https:\/\/cdn\.zwift\.com\//;

/**
 * Werelden waarvan Zwift de minimap een kwartslag gedraaid tekent: noord ligt
 * rechts. De grenzen uit zwift-data kloppen wel; alleen het beeld ligt gedraaid.
 * Vastgesteld op 2026-11-25 door de routevormen uit zwift_routes over de minimap
 * te leggen: gedraaid vallen ze op de getekende wegen, ongedraaid lagen routes
 * en blokken in Makuri in zee. De andere acht werelden passen ongedraaid.
 */
const IMAGE_ROTATION: Record<string, 90> = {
  "makuri-islands": 90,
  france: 90,
  scotland: 90,
};

export const ZWIFT_WORLDS: ZwiftWorld[] = worlds.map((world) => {
  const [[lat1, lon1], [lat2, lon2]] = world.bounds as [[number, number], [number, number]];
  const imageUrl = (world as { imageUrl?: string }).imageUrl;
  return {
    slug: world.slug,
    name: world.name,
    imageUrl: imageUrl && ZWIFT_CDN.test(imageUrl) ? imageUrl : null,
    imageRotation: IMAGE_ROTATION[world.slug] ?? 0,
    bbox: [
      Math.min(lat1, lat2),
      Math.min(lon1, lon2),
      Math.max(lat1, lat2),
      Math.max(lon1, lon2),
    ],
  };
});

const BY_SLUG = new Map(ZWIFT_WORLDS.map((w) => [w.slug, w]));
export const zwiftWorldBySlug = (slug: string) => BY_SLUG.get(slug);

/** Regiocode voor de titels, zodat die niet botst met landen of provincies. */
export const zwiftRegionCode = (slug: string) => `zwift:${slug}`;

/**
 * Komt deze rit van Zwift? Strikter dan looksVirtual (sports.ts): die vangt ook
 * Rouvy en MyWhoosh, en die horen hier juist niet.
 */
export function isZwiftRide(meta: {
  name?: string | null;
  deviceName?: string | null;
  externalId?: string | null;
}): boolean {
  return /zwift/i.test([meta.deviceName, meta.externalId, meta.name].filter(Boolean).join(" "));
}

/** De wereld waarin dit punt ligt, met een kleine marge rond de grenzen. */
export function zwiftWorldAt(lat: number, lon: number): ZwiftWorld | null {
  for (const world of ZWIFT_WORLDS) {
    const [south, west, north, east] = world.bbox;
    if (
      lat >= south - BOUNDS_MARGIN &&
      lat <= north + BOUNDS_MARGIN &&
      lon >= west - BOUNDS_MARGIN &&
      lon <= east + BOUNDS_MARGIN
    ) {
      return world;
    }
  }
  return null;
}

/**
 * Ligt het middelpunt van dit blok binnen de wereld? Puur.
 *
 * Zonder marge. De grenzen uit zwift-data zijn die van Zwifts eigen minimap, en
 * buiten die kaart ligt geen weg. Wat er in productie wel buiten lag (Watopia 79
 * blokken, France 162) waren Climb Portals: Zwift tekent zo'n klim direct naast
 * de wereld, als een sliert vanaf de portal de kaart uit. Tot oktober 2026 stond
 * hier een marge van ~15 km, in de veronderstelling dat dat nieuwe wegen waren en
 * de portals veel verder weg lagen.
 */
export function blockInWorld(world: ZwiftWorld, key: string): boolean {
  const { x, y } = parseBlockKey(key);
  const [lon, lat] = blockCentre(x, y, ZWIFT_BLOCK_ZOOM);
  const [south, west, north, east] = world.bbox;
  return lat >= south && lat <= north && lon >= west && lon <= east;
}

/**
 * Het bereik van blokken (x en y, inclusief) waarvan het middelpunt binnen de
 * wereld ligt: hetzelfde als `blockInWorld`, maar als vier getallen. Voor de
 * migratie die oude portalblokken opruimt.
 */
export function worldBlockRange(world: ZwiftWorld): { minX: number; maxX: number; minY: number; maxY: number } {
  const [south, west, north, east] = world.bbox;
  const n = 2 ** ZWIFT_BLOCK_ZOOM;
  // Het middelpunt van blok x ligt op lengte (x + 0,5) / n; y loopt van noord
  // naar zuid over de Mercator-breedte.
  const mercatorY = (lat: number) =>
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n;
  return {
    minX: Math.ceil(((west + 180) / 360) * n - 0.5),
    maxX: Math.floor(((east + 180) / 360) * n - 0.5),
    minY: Math.ceil(mercatorY(north) - 0.5),
    maxY: Math.floor(mercatorY(south) - 0.5),
  };
}

/**
 * Vanaf welke stap (km) deze routelijn springt: JUMP_FACTOR keer de mediane
 * puntafstand, minstens JUMP_MIN_KM en hooguit MAX_SEGMENT_KM. Puur, voor de test.
 */
export function jumpThresholdKm(points: GpxPoint[], minKm = JUMP_MIN_KM): number {
  const steps: number[] = [];
  for (let i = 1; i < points.length; i++) steps.push(haversineKm(points[i - 1], points[i]));
  if (steps.length === 0) return MAX_SEGMENT_KM;
  steps.sort((a, b) => a - b);
  const mid = Math.floor(steps.length / 2);
  const median = steps.length % 2 ? steps[mid] : (steps[mid - 1] + steps[mid]) / 2;
  return Math.min(MAX_SEGMENT_KM, Math.max(minKm, JUMP_FACTOR * median));
}

/** Kleine letters, zonder accenten en leestekens: "Côte d’Aspin" → "cote d aspin". */
function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const PORTAL_NAME = new RegExp(
  `(\\bclimb portal (?!(volcano|mont saint michel)\\b)|\\b(${PORTAL_CLIMBS.map(normaliseName).join("|")}) in\\b|\\bon (${PORTAL_CLIMBS.map(normaliseName).join("|")})\\b)`,
);

/** Noemt deze ritnaam een Climb Portal-klim? Puur, voor de test. */
export function isPortalClimbName(name: string | null | undefined): boolean {
  return Boolean(name) && PORTAL_NAME.test(normaliseName(name!));
}

/** Begint dit stuk rit bij de portal van de wereld? Puur, voor de test. */
export function startsAtPortal(world: ZwiftWorld, run: GpxPoint[]): boolean {
  const portal = PORTALS[world.slug];
  return Boolean(portal && run.length > 0 && haversineKm(run[0], portal as GpxPoint) < PORTAL_RADIUS_KM);
}

/** Komt dit stuk rit ergens buiten de kaart van de wereld? Puur, voor de test. */
export function leavesWorld(world: ZwiftWorld, run: GpxPoint[]): boolean {
  const [south, west, north, east] = world.bbox;
  return run.some((p) => p.lat < south || p.lat > north || p.lon < west || p.lon > east);
}

/**
 * Knipt de route bij elke sprong (zie jumpThresholdKm). Puur, voor de test.
 */
export function splitOnJumps(points: GpxPoint[], maxKm = jumpThresholdKm(points)): GpxPoint[][] {
  const runs: GpxPoint[][] = [];
  let run: GpxPoint[] = [];
  for (const point of points) {
    const previous = run[run.length - 1];
    if (previous && haversineKm(previous, point) > maxKm) {
      runs.push(run);
      run = [];
    }
    run.push(point);
  }
  if (run.length > 0) runs.push(run);
  return runs;
}

/**
 * Wereld en blokken van één rit, of null als het geen herkenbare Zwift-rit is.
 * De wereld volgt het startpunt: een rit wisselt in Zwift nooit van wereld.
 *
 * `points` is Strava's samenvattingslijn; `fullPoints` de volledige lijn, als
 * Strava die gaf. Die is veel dichter en snijdt geen bochten af, dus die gaat
 * voor (de Rapha 500 van één lid: 220 punten in de samenvatting voor 347 km, en
 * de rechte lijnen ertussen staken het water tussen de eilanden over).
 *
 * Vangnetten, want een routelijn blijft niet altijd op de weg:
 * - Zwift springt: binnen de wereld naar een startvak of portal, een enkel event
 *   zelfs naar een andere wereld. De lijn ertussen kleurde anders blokken die je
 *   nooit reed, tot duizenden over de oceaan. Vandaar `splitOnJumps`;
 * - Climb Portals tellen niet, ook niet binnen de kaart: zie PORTALS;
 * - wat toch buiten de kaart valt, valt af via `blockInWorld`.
 *
 * Een portalklim levert wel de wereld op (voor de kilometers per wereld), maar
 * geen blokken.
 */
export function zwiftBlocksForRide(ride: {
  points: GpxPoint[];
  fullPoints?: GpxPoint[] | null;
  /** strava_activities.id, voor EXCLUDED_RIDES. */
  id?: number | null;
  name?: string | null;
  deviceName?: string | null;
  externalId?: string | null;
}): { world: ZwiftWorld; blocks: Set<string> } | null {
  if (ride.points.length < 2 || !isZwiftRide(ride)) return null;
  const world = zwiftWorldAt(ride.points[0].lat, ride.points[0].lon);
  if (!world) return null;
  const blocks = new Set<string>();
  if (isPortalClimbName(ride.name)) return { world, blocks };
  if (ride.id != null && EXCLUDED_RIDES.has(Number(ride.id))) return { world, blocks };
  const noRoad = NO_ROAD_BLOCKS[world.slug];
  const full = ride.fullPoints && ride.fullPoints.length >= 2 ? ride.fullPoints : null;
  const points = full ?? ride.points;
  const maxKm = jumpThresholdKm(points, full ? JUMP_MIN_KM_FULL : JUMP_MIN_KM);
  for (const run of splitOnJumps(points, maxKm)) {
    if (startsAtPortal(world, run) || leavesWorld(world, run)) continue;
    for (const key of blocksForPolyline(run, ZWIFT_BLOCK_ZOOM)) {
      if (blockInWorld(world, key) && !noRoad?.has(key)) blocks.add(key);
    }
  }
  return { world, blocks };
}
