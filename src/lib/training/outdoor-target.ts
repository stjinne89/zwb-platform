// "Welk rondje hoort bij deze geplande training, en hoe goed is dit rondje?"
//
// Spiegelbeeld van zwift-match.ts. Daar staat het event vast en zoeken we of het
// bij de training past; hier staat de training vast en maken we een route die
// erbij past. Zelfde huisregels: puur, deterministisch, en een dimensie die we
// niet kennen verlaagt de dekking en niet de score.

import { haversineKm, routeCumulativeKm, gpxBearing, type GpxPoint } from "@/lib/gpx";
import { distanceForSeconds, rideSeconds } from "@/lib/training/ride-physics";
import { classifyWind } from "@/lib/weather";
import { INTENSITY_FTP_RANGE, type WorkoutIntensity } from "@/lib/training/workouts";

// --- Doel -----------------------------------------------------------------

export type Terrain = "vlak" | "golvend" | "klim";

/**
 * Hoogtemeters per kilometer per soort rondje.
 *
 * Nederlandse maat, want dat is waar deze leden rijden. Een rondje van 4 m/km is
 * hier al "golvend" (Utrechtse Heuvelrug, Brabantse Wal) en 10 m/km is Limburg.
 * Getallen uit een Alpenmodel zouden elke route als vlak bestempelen en het
 * terreinoordeel betekenisloos maken.
 */
export const ELEVATION_PER_KM: Record<Terrain, number> = {
  vlak: 1.5,
  golvend: 5,
  klim: 10,
};

/**
 * Welk terrein hoort bij een intensiteit? Dezelfde gedachte als prefersClimb()
 * in segment-suggestions.ts en het terreinoordeel in zwift-match.ts: lange, zware
 * blokken hebben een klim nodig om het vermogen kwijt te kunnen, rustig of
 * explosief werk juist niet.
 */
export function terrainForIntensity(intensity: WorkoutIntensity): Terrain {
  if (intensity === "threshold" || intensity === "tempo" || intensity === "vo2max") return "klim";
  if (intensity === "race" || intensity === "anaerobic") return "golvend";
  return "vlak";
}

export type RouteTarget = {
  distanceKm: number;
  elevationM: number;
  elevationPerKm: number;
  terrain: Terrain;
  /** Het vermogen waarop we de rit doorrekenen. */
  watts: number;
  minutes: number;
};

export type OutdoorAthlete = {
  ftpWatts: number | null;
  weightKg: number | null;
};

/**
 * Van een geplande training naar de maten van het rondje. Geeft `null` zonder
 * FTP of gewicht: dan is elke afstand een gok, en een gegokt rondje van 80 km
 * voor iemand die er 40 aankan is erger dan geen voorstel.
 */
export function routeTargetForSession(
  session: { durationMinutes: number; intensity: WorkoutIntensity },
  athlete: OutdoorAthlete,
): RouteTarget | null {
  if (!athlete.ftpWatts || !athlete.weightKg || session.durationMinutes <= 0) return null;

  const terrain = terrainForIntensity(session.intensity);
  const elevationPerKm = ELEVATION_PER_KM[terrain];

  // Over een hele buitenrit rijd je niet de hele tijd op je blokvermogen: er zit
  // uitrollen, verkeer en herstel tussen. Het midden van de band van de
  // intensiteit is daarvoor een redelijke benadering, net als in zwift-match.
  const range = INTENSITY_FTP_RANGE[session.intensity];
  const watts = (athlete.ftpWatts * (range[0] + range[1])) / 200;

  const distanceKm = distanceForSeconds(
    session.durationMinutes * 60,
    elevationPerKm,
    watts,
    athlete.weightKg,
    true,
  );
  if (distanceKm === null || distanceKm <= 0) return null;

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    elevationM: Math.round(distanceKm * elevationPerKm),
    elevationPerKm,
    terrain,
    watts: Math.round(watts),
    minutes: session.durationMinutes,
  };
}

// --- De route zelf --------------------------------------------------------

export type RouteSummary = {
  distanceKm: number;
  elevationM: number;
  elevationPerKm: number;
};

/** Afstand en hoogtemeters van een gereden lijn. */
export function summarizeRoute(points: GpxPoint[]): RouteSummary {
  let distance = 0;
  let elevation = 0;
  for (let i = 1; i < points.length; i += 1) {
    distance += haversineKm(points[i - 1], points[i]);
    const a = points[i - 1].ele;
    const b = points[i].ele;
    // Alleen stijgen telt, en alleen als beide punten een hoogte hebben --
    // anders telt een ontbrekend punt als een afdaling van zeeniveau.
    if (a !== undefined && b !== undefined && b > a) elevation += b - a;
  }
  return {
    distanceKm: Math.round(distance * 100) / 100,
    elevationM: Math.round(elevation),
    elevationPerKm: distance > 0 ? Math.round((elevation / distance) * 10) / 10 : 0,
  };
}

export type WindPayoff = {
  /** Aandeel meewind op het slotstuk (0-1). */
  tailwindFinish: number;
  /** Aandeel tegenwind op het slotstuk (0-1). */
  headwindFinish: number;
  note: string;
};

/**
 * Welk deel van de rit we als "slotstuk" rekenen. Het laatste been van de
 * driehoek is ongeveer een vijfde van het rondje; een kwart pakt dat been plus
 * het stuk ervoor, en dat is wat je als "bijna thuis" ervaart.
 */
const FINISH_SHARE = 0.25;

/**
 * Hoeveel je aan de windkeuze hebt — en dat is iets anders dan wat hier eerst
 * stond.
 *
 * De eerste versie mat "tegenwind heen, meewind terug" en strafte daarmee élk
 * rondje: een gesloten lus komt terug waar hij begon, dus over de hele rit is de
 * wind per definitie ongeveer in evenwicht. Alle drie de varianten kwamen op
 * "vooral zijwind" uit en verloren even veel punten. Een dimensie die niets
 * onderscheidt en iedereen straft meet niet de route maar de lusvorm.
 *
 * Wat een lus wél kan: het láátste stuk met de wind mee leggen. Dat is stuurbaar
 * (zie routeVariants), het is het stuk waar je moe bent, en het verschilt echt
 * per variant. Zijwind is hier neutraal en geen straf: als beter niet kan, hoort
 * er geen aftrek te staan.
 *
 * Eén windvector voor de hele route, uit de forecast op het vertrekpunt op het
 * tijdstip van de training. Over een rondje van vijftig kilometer draait de wind
 * niet wezenlijk; per punt ophalen zou een Open-Meteo-call per route kosten
 * zonder dat het oordeel verandert.
 */
export function windPayoff(
  points: GpxPoint[],
  windFromDeg: number | null,
  windSpeedKmh: number | null,
): WindPayoff | null {
  if (windFromDeg === null || windSpeedKmh === null || points.length < 4) return null;

  const cumulative = routeCumulativeKm(points);
  const total = cumulative[cumulative.length - 1];
  if (total <= 0) return null;
  const finishFrom = total * (1 - FINISH_SHARE);

  let tail = 0;
  let head = 0;
  let finishKm = 0;

  for (let i = 1; i < points.length; i += 1) {
    const legKm = cumulative[i] - cumulative[i - 1];
    if (legKm <= 0) continue;
    if (cumulative[i] <= finishFrom) continue;

    const bearing = gpxBearing(points[i - 1], points[i]);
    const { category } = classifyWind(windFromDeg, bearing, windSpeedKmh);
    // Stil telt niet mee: dan valt er niets te winnen en niets te verliezen.
    if (category === "stil") continue;

    finishKm += legKm;
    if (category === "meewind") tail += legKm;
    if (category === "tegenwind") head += legKm;
  }

  if (finishKm <= 0) return null;

  const tailwindFinish = tail / finishKm;
  const headwindFinish = head / finishKm;

  const note =
    tailwindFinish >= 0.4
      ? "Laatste kilometers met de wind mee"
      : headwindFinish >= 0.4
        ? "Tegenwind op de laatste kilometers"
        : "Zijwind op het laatste stuk";

  return { tailwindFinish, headwindFinish, note };
}

// --- Scoren ---------------------------------------------------------------

export type OutdoorDimension = "duur" | "terrein" | "wind";

export const OUTDOOR_WEIGHTS: Record<OutdoorDimension, number> = {
  duur: 55,
  terrein: 25,
  wind: 20,
};

/** Onder deze score is een rondje geen voorstel meer. Gelijk aan de Zwift-kant. */
export const OUTDOOR_FLOOR_PCT = 55;

export type OutdoorScore = {
  dimension: OutdoorDimension;
  scorePct: number;
  note: string;
};

export type OutdoorRouteJudgement = {
  scorePct: number;
  estimatedMinutes: number;
  summary: RouteSummary;
  /**
   * De deelscores, in de volgorde waarin ze gewogen zijn. Bewust geen vooraf
   * uitgerekende "sterkste" en "zwakste" zoals aan de Zwift-kant: daar is het
   * zwakste punt een waarschuwing, maar hier is 50 het midden en geen klacht --
   * zijwind hoort niet in het amber. De kaart kiest zelf welke regels hij toont.
   */
  scores: OutdoorScore[];
};

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreOutdoorRoute(
  points: GpxPoint[],
  target: RouteTarget,
  athlete: OutdoorAthlete,
  wind: { directionFromDeg: number | null; speedKmh: number | null },
): OutdoorRouteJudgement | null {
  const summary = summarizeRoute(points);
  if (summary.distanceKm <= 0) return null;

  const seconds = rideSeconds(
    summary.distanceKm,
    summary.elevationM,
    target.watts,
    athlete.weightKg,
    true,
  );
  if (seconds === null) return null;
  const estimatedMinutes = Math.round(seconds / 60);

  const scores: OutdoorScore[] = [];

  // Duur: zelfde curve als de Zwift-matcher, zodat "past qua duur" overal
  // hetzelfde betekent.
  const drift = Math.abs(estimatedMinutes - target.minutes) / target.minutes;
  const diff = estimatedMinutes - target.minutes;
  scores.push({
    dimension: "duur",
    scorePct: clampPct(100 - drift * 200),
    note:
      Math.abs(diff) < 5
        ? `${summary.distanceKm.toFixed(0)} km, ongeveer ${estimatedMinutes} min`
        : `${summary.distanceKm.toFixed(0)} km, ${estimatedMinutes} min — ${Math.abs(diff)} min ${diff > 0 ? "langer" : "korter"} dan gepland`,
  });

  // Terrein: hoe dicht de hoogtemeters per km bij het doel liggen. Absolute
  // marge en geen percentage, want bij een vlak doel van 1,5 m/km is elk
  // percentage meteen enorm.
  const terrainOff = Math.abs(summary.elevationPerKm - target.elevationPerKm);
  scores.push({
    dimension: "terrein",
    scorePct: clampPct(100 - (terrainOff / 6) * 100),
    note: `${summary.elevationM} hm (${summary.elevationPerKm} hm/km), ${target.terrain} gevraagd`,
  });

  // Wind: null bij windstilte of zonder forecast, en dan telt hij niet mee in
  // plaats van dat hij de score drukt.
  const payoff = windPayoff(points, wind.directionFromDeg, wind.speedKmh);
  if (payoff) {
    scores.push({
      dimension: "wind",
      // Zijwind is het midden, niet de bodem. Meewind op het slotstuk trekt naar
      // 100, tegenwind naar 0, en een rondje dat niet beter kán komt op 50 uit in
      // plaats van dat het wordt afgestraft voor het feit dat het een lus is.
      scorePct: clampPct(50 + 50 * (payoff.tailwindFinish - payoff.headwindFinish)),
      note: payoff.note,
    });
  }

  const totalWeight = scores.reduce((sum, score) => sum + OUTDOOR_WEIGHTS[score.dimension], 0);
  if (totalWeight <= 0) return null;
  const scorePct = clampPct(
    scores.reduce((sum, score) => sum + score.scorePct * OUTDOOR_WEIGHTS[score.dimension], 0) /
      totalWeight,
  );

  return { scorePct, estimatedMinutes, summary, scores };
}
