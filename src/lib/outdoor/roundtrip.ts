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
 * 1,25 is een gekozen startwaarde, niet een gemeten. Hij is hier nooit tegen
 * echte routes gehouden -- de routeplanner is vanuit deze ontwikkelomgeving niet
 * bereikbaar. Geeft BRouter in de praktijk structureel te lange of te korte
 * rondjes, dan is dit de knop, en dan hoort hier het gemeten getal te staan in
 * plaats van dit getal.
 */
export const DETOUR_FACTOR = 1.25;

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
 * Met wind is de eerste de interessante: heen tegen de wind in, terug mee. Dat is
 * het advies dat elke wielrenner kent en dat geen enkele routeplanner geeft. De
 * andere twee draaien er ver genoeg vanaf om echt een ander rondje op te leveren
 * in plaats van drie varianten van dezelfde weg.
 *
 * Zonder wind (of zonder forecast) is er niets te sturen en zijn het gewoon drie
 * verschillende kanten op — dan zeggen we dat ook, in plaats van een windverhaal
 * te verzinnen bij windstilte.
 */
export type RouteVariant = {
  key: "tegenwind_heen" | "zijwind_links" | "zijwind_rechts" | "vrij";
  headingDeg: number;
  /** Korte Nederlandse reden; leeg als er niets te zeggen valt over de wind. */
  rationale: string;
};

/** Onder deze windsnelheid valt er niets te sturen; gelijk aan classifyWind(). */
export const CALM_WIND_KMH = 5;

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

  // Waar de wind vandaan komt is precies de richting waarin je moet vertrekken
  // om hem op de terugweg mee te hebben.
  const into = wind.directionFromDeg!;
  return [
    {
      key: "tegenwind_heen",
      headingDeg: into,
      rationale: "Heen tegen de wind in, terug met de wind mee",
    },
    { key: "zijwind_links", headingDeg: (into + 120) % 360, rationale: "Grotendeels zijwind" },
    { key: "zijwind_rechts", headingDeg: (into + 240) % 360, rationale: "Grotendeels zijwind" },
  ];
}
