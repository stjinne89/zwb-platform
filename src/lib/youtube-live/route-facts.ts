// Puur, voor de tests: wat de thumbnail en de overlay over het parcours van een
// gestreamde race tonen (2026-11-20), en hoe groot de titel op de thumbnail mag.

export type ProfilePoint = { km: number; m: number };

export type StreamRoute = {
  routeName: string | null;
  laps: number | null;
  /** Hele race, met de aanloop. */
  distanceKm: number | null;
  /** Hoogtemeters van de hele race, met de aanloop. */
  elevationM: number | null;
  /** Het hoogteprofiel over de rondes, hooguit PROFILE_POINTS punten; null zonder profiel. */
  profile: ProfilePoint[] | null;
};

const PROFILE_POINTS = 120;
/** Meer rondes tekenen maakt het profiel een zaag; daarboven alleen de cijfers. */
const MAX_PROFILE_LAPS = 6;

export function streamRouteFacts(input: {
  laps: number | null;
  eventDistanceKm: number | null;
  eventElevationM: number | null;
  zwiftEventDistanceM: number | null;
  route: { name: string; distanceKm: number; elevationM: number; leadInKm: number; leadInElevationM: number } | null;
  library: {
    name: string | null;
    distanceM: number | null;
    elevationM: number | null;
    profile: { distanceM: number[]; altitudeM: number[] } | null;
  } | null;
}): StreamRoute {
  const laps = input.laps && input.laps > 0 ? Math.round(input.laps) : null;
  const n = laps ?? 1;
  const { route, library } = input;
  const routeName = route?.name ?? library?.name ?? null;

  let distanceKm = input.eventDistanceKm;
  if (!distanceKm && route) distanceKm = route.leadInKm + route.distanceKm * n;
  if (!distanceKm && library?.distanceM) distanceKm = (library.distanceM * n) / 1000;
  if (!distanceKm && input.zwiftEventDistanceM) distanceKm = input.zwiftEventDistanceM / 1000;

  let elevationM = input.eventElevationM;
  if (!elevationM && route) elevationM = route.leadInElevationM + route.elevationM * n;
  if (!elevationM && library?.elevationM) elevationM = library.elevationM * n;

  return {
    routeName,
    laps,
    distanceKm: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
    elevationM: elevationM ? Math.round(elevationM) : null,
    profile: library?.profile && n <= MAX_PROFILE_LAPS ? repeatProfile(library.profile, n) : null,
  };
}

/** Eén ronde uit de routebibliotheek, `laps` keer achter elkaar, uitgedund. */
export function repeatProfile(
  profile: { distanceM: number[]; altitudeM: number[] },
  laps: number,
): ProfilePoint[] | null {
  const { distanceM, altitudeM } = profile;
  const size = Math.min(distanceM.length, altitudeM.length);
  if (size < 2) return null;
  const lapKm = distanceM[size - 1] / 1000;
  if (!(lapKm > 0)) return null;
  const all: ProfilePoint[] = [];
  for (let lap = 0; lap < laps; lap += 1) {
    for (let i = lap === 0 ? 0 : 1; i < size; i += 1) {
      all.push({ km: lap * lapKm + distanceM[i] / 1000, m: altitudeM[i] });
    }
  }
  if (all.length <= PROFILE_POINTS) return all;
  const step = (all.length - 1) / (PROFILE_POINTS - 1);
  return Array.from({ length: PROFILE_POINTS }, (_, i) => all[Math.round(i * step)]);
}

/**
 * Het profiel als gevuld vlak voor een SVG van `width` bij `height`. Het
 * laagste punt staat niet op de bodem: een vlakke route blijft een vlak, geen
 * hoge berg. Hoogte op schaal met minstens 60 m bereik.
 */
export function profileAreaPath(points: ProfilePoint[], width: number, height: number): string {
  const kmMax = points[points.length - 1].km || 1;
  const low = Math.min(...points.map((p) => p.m));
  const high = Math.max(...points.map((p) => p.m));
  const range = Math.max(high - low, 60);
  const base = height * 0.18;
  const y = (m: number) => height - base - ((m - low) / range) * (height - base);
  const coords = points.map((p) => `${((p.km / kmMax) * width).toFixed(1)},${y(p.m).toFixed(1)}`);
  return `M0,${height} L${coords.join(" L")} L${width},${height} Z`;
}

/** Ongeveer de breedte van een letter, als deel van de lettergrootte, per clubletter. */
const CHAR_WIDTH: Record<string, number> = { barlow: 0.47, archivo: 0.56, inter: 0.56, schibsted: 0.55 };

/**
 * Hoe groot de titel op de thumbnail kan. Eerst één regel, van 96 tot 64px;
 * past hij niet, dan twee regels op 80, 72 of 64px. Geschat uit het aantal
 * tekens, want Satori meet niet vooraf.
 */
export function fitTitle(
  text: string,
  maxWidth: number,
  font: string,
): { size: number; lines: 1 | 2 } {
  const per = CHAR_WIDTH[font] ?? 0.55;
  const width = (size: number) => text.length * per * size;
  for (let size = 96; size >= 64; size -= 4) {
    if (width(size) <= maxWidth) return { size, lines: 1 };
  }
  for (const size of [80, 72, 64]) {
    if (width(size) <= maxWidth * 1.9) return { size, lines: 2 };
  }
  return { size: 60, lines: 2 };
}
