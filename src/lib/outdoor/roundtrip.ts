// Van een vertrekpunt naar een rondje van ongeveer de gevraagde lengte.
//
// Een routeplanner die rondritten kent (GraphHopper `algorithm=round_trip`) is
// er wel, maar die vraagt een sleutel en dus een hostingbesluit. BRouter is
// gratis, sleutelloos en MIT, maar kent alleen "route langs deze punten". Het
// verschil overbruggen we hier: zet zelf een paar keerpunten in een lus om het
// vertrekpunt en laat de planner er een fietsroute doorheen leggen.
//
// De vorm is een driehoek en geen cirkel. Een cirkel met veel punten dwingt de
// planner langs een pad dat waarschijnlijk niet bestaat en levert onnodige
// omwegen; drie ruime keerpunten laten hem zelf de fietsbare wegen kiezen.
//
// Alles hier is pure meetkunde, dus zonder netwerk te testen.

export type LatLon = { lat: number; lon: number };

const EARTH_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Wegen lopen niet rechtdoor. De werkelijke route langs drie keerpunten is
 * langer dan de omtrek van de driehoek eromheen; deze factor corrigeert daarvoor
 * bij het bepalen van de straal.
 *
 * 1,25 was een gok en bleek te hoog: de eerste echte rondjes kwamen ~15% korter
 * uit dan gevraagd, want BRouter volgde de driehoek strakker dan aangenomen. Een
 * lagere factor maakt de driehoek groter en dus de route langer.
 *
 * 1,12 is nu de startwaarde, maar het echte antwoord staat hieronder: de
 * omwegfactor verschilt per omgeving (in de stad loopt een route veel meer om dan
 * op het platteland), dus één constante kan nooit overal kloppen. Daarom meet de
 * generatie hem na afloop na en corrigeert hij zichzelf met
 * correctedDetourFactor().
 */
export const DETOUR_FACTOR = 1.12;

/**
 * De omwegfactor bijstellen op wat de planner werkelijk teruggaf.
 *
 * De driehoek wordt gemaakt op `gevraagd / factor`, en de planner maakt daar een
 * route van die `werkelijk` lang is. De verhouding tussen die twee ís de echte
 * omwegfactor van dit gebied, dus die geven we terug. Eén meting is genoeg om
 * dichter te komen; hij hoeft niet perfect te zijn, alleen beter.
 *
 * Begrensd, want een kapotte meting mag geen rondje van 300 km opleveren: één
 * correctieronde mag de driehoek hooguit halveren of verdubbelen.
 */
export const MIN_DETOUR_FACTOR = 0.7;
export const MAX_DETOUR_FACTOR = 2.5;

export function correctedDetourFactor(
  current: number,
  targetKm: number,
  actualKm: number,
): number | null {
  if (!(current > 0) || !(targetKm > 0) || !(actualKm > 0)) return null;
  const corrected = current * (actualKm / targetKm);
  if (!Number.isFinite(corrected)) return null;
  return Math.min(MAX_DETOUR_FACTOR, Math.max(MIN_DETOUR_FACTOR, corrected));
}

/** Het punt op `distanceKm` in richting `bearingDeg` vanaf `from`. */
export function destinationPoint(from: LatLon, bearingDeg: number, distanceKm: number): LatLon {
  const angular = distanceKm / EARTH_KM;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(from.lat);
  const lon1 = toRad(from.lon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: Number(toDeg(lat2).toFixed(6)),
    // Terug naar -180..180, zodat een rondje over de datumgrens geen lengtegraad
    // van 190 oplevert waar een routeplanner niets mee kan.
    lon: Number((((toDeg(lon2) + 540) % 360) - 180).toFixed(6)),
  };
}

/**
 * De keerpunten van een rondje: start, drie punten op een driehoek, en terug
 * naar start. `headingDeg` draait de driehoek, zodat je kunt sturen welke kant je
 * eerst op rijdt — daar hangt het windvoordeel aan.
 *
 * De straal volgt uit de lengte van het pad dat de planner werkelijk aflegt, en
 * dat is niet de omtrek van de driehoek: je rijdt vanaf het middelpunt naar het
 * eerste keerpunt, dan twee zijden, en vanaf het laatste keerpunt terug naar het
 * middelpunt. Dat is 2·R (de twee radiale stukken) plus 2·R·√3 (twee zijden van
 * een gelijkzijdige driehoek met straal R), dus R = lengte / (2 + 2·√3).
 *
 * De gevraagde afstand delen we eerst door de omwegfactor, omdat de echte route
 * langs die punten langer wordt dan de rechte lijnen ertussen.
 */
export function roundTripWaypoints(
  start: LatLon,
  distanceKm: number,
  headingDeg: number,
  options: { detourFactor?: number } = {},
): LatLon[] {
  const detour = options.detourFactor ?? DETOUR_FACTOR;
  const pathKm = Math.max(1, distanceKm / detour);
  const radius = pathKm / (2 + 2 * Math.sqrt(3));

  const corners = [0, 120, 240].map((offset) =>
    destinationPoint(start, (headingDeg + offset) % 360, radius),
  );

  return [start, ...corners, start];
}

/**
 * De drie richtingen waarin we een rondje voorstellen.
 *
 * **Dit werkte eerst niet, en het was geen afstelfout maar een denkfout.** De
 * eerste versie vertrok tegen de wind in, met de belofte "terug met de wind mee".
 * Op de echte meetkunde nagerekend klopt dat niet: bij een kop van 270° zijn de
 * vier benen 270° tegenwind, 60° meewind, 180° zijwind en 330° zijwind — het
 * laatste been thuis is zijwind. En dat is niet met een andere oriëntatie op te
 * lossen: een *gesloten lus* moet terugkomen waar hij begon, dus over de hele rit
 * krijg je altijd grofweg een derde tegen, een derde mee en een derde zij. Het
 * klassieke advies "heen tegen de wind, terug mee" gaat over een heen-en-weerrit,
 * niet over een rondje.
 *
 * Wat wél stuurbaar is: welk been je áls laatste rijdt. Dat is het stuk waar je
 * moe bent, en het is precies waar meewind het meest waard is. Het laatste been
 * ligt op `kop + 60°` (het terugkeerstuk van het derde keerpunt naar het
 * middelpunt), dus voor meewind thuis zetten we de kop op
 * `windrichting + 180 − 60`.
 */
export type RouteVariant = {
  key: "meewind_thuis" | "zijwind_thuis" | "vrij";
  headingDeg: number;
  /** Korte Nederlandse reden; leeg als er niets te zeggen valt over de wind. */
  rationale: string;
};

/** Onder deze windsnelheid valt er niets te sturen; gelijk aan classifyWind(). */
export const CALM_WIND_KMH = 5;

/**
 * De koers van het laatste been ten opzichte van de kop van de driehoek. Volgt
 * uit de vorm: vanaf het derde keerpunt (kop + 240°) terug naar het middelpunt is
 * kop + 240 + 180 = kop + 60. Empirisch bevestigd in de test.
 */
export const RETURN_LEG_OFFSET_DEG = 60;

export function routeVariants(wind: {
  directionFromDeg: number | null;
  speedKmh: number | null;
}): RouteVariant[] {
  const calm =
    wind.directionFromDeg === null ||
    wind.speedKmh === null ||
    wind.speedKmh < CALM_WIND_KMH;

  if (calm) {
    return [0, 120, 240].map((headingDeg, index) => ({
      key: "vrij" as const,
      headingDeg,
      rationale: index === 0 ? "Weinig wind, dus vrij te kiezen" : "",
    }));
  }

  // Meewind op het laatste been: koers van dat been moet windrichting + 180 zijn.
  const downwindFinish =
    (wind.directionFromDeg! + 180 - RETURN_LEG_OFFSET_DEG + 360) % 360;

  // De andere twee zijn dezelfde driehoek, 120° gedraaid. Hun laatste been komt
  // daarmee op zijwind uit — een echt ander rondje, en eerlijk benoemd.
  return [
    {
      key: "meewind_thuis",
      headingDeg: downwindFinish,
      rationale: "Laatste stuk met de wind mee",
    },
    {
      key: "zijwind_thuis",
      headingDeg: (downwindFinish + 120) % 360,
      rationale: "Zijwind op het laatste stuk",
    },
    {
      key: "zijwind_thuis",
      headingDeg: (downwindFinish + 240) % 360,
      rationale: "Zijwind op het laatste stuk",
    },
  ];
}
