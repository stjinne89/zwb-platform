// Zwift-routeprofielen uit Strava-segmentstreams.
//
// Een Zwift-route heeft in `zwift-data` een `stravaSegmentId`: het segment dat
// precies één ronde van die route beslaat. Strava geeft daarvan
// distance/altitude/latlng-streams terug in Watopia/Teanu-coördinaten — dezelfde
// virtuele ruimte die `src/lib/cols/watopia.ts` al gebruikt om cols te
// kalibreren. Daarmee kennen we het hoogteprofiel én de vorm van een Zwift-route
// zonder dat een lid een .gpx hoeft te uploaden.
//
// Bewust gesplitst: alles onder "pure logica" draait zonder netwerk en ligt vast
// in tests/unit/zwift-route-streams.test.ts; alleen `fetchSegmentStreams` praat
// met Strava.

export type SegmentStreams = {
  /** Cumulatieve afstand in meter, oplopend. */
  distance: number[];
  /** Hoogte in meter, zelfde lengte als `distance`. */
  altitude: number[];
  /** [lat, lon] per punt; kan ontbreken. */
  latlng: Array<[number, number]> | null;
};

export type RouteProfile = {
  /** Cumulatieve afstand in meter op een vast raster. */
  distanceM: number[];
  /** Gesmoothde hoogte in meter, zelfde lengte. */
  altitudeM: number[];
};

export type RouteShape = {
  lat: number[];
  lon: number[];
};

/**
 * Rasterafstand van het opgeslagen hoogteprofiel. Fijner dan het 100 m-model van
 * route-sample.ts, zodat het uitrollen over meerdere ronden niets weggooit.
 */
export const PROFILE_STEP_M = 25;
/** De vorm is alleen tekenwerk; grover raster houdt de jsonb klein. */
export const SHAPE_STEP_M = 100;
/**
 * Smoothing-venster voor de hoogte.
 *
 * Stond aanvankelijk op 80 m, overgenomen uit route-sample.ts. Dat venster is
 * gemaakt voor **gps-data van echte ritten**, waar de hoogte alle kanten op
 * springt. Zwift-hoogte komt uit een game-engine: daar zit geen gps-ruis in,
 * alleen wat kwantisatie in hoe Strava de stream bewaart.
 *
 * De meting die dat uitwees, op Southern Coast Cruise: ruwe som 148 hm,
 * zwift-data 136 hm, ons profiel op 80 m smoothing 121 hm. De ruwe som ligt dus
 * bóven zwift-data — er valt nauwelijks ruis weg te halen — terwijl ons venster
 * er 27 hm af haalde. Dat is geen ruis maar terrein, en op rollende routes liep
 * dat op tot 35 %.
 *
 * 25 m is één rasterpunt aan weerszijden: genoeg om kwantisatiegeruis te
 * dempen, te weinig om een helling glad te strijken. Voor .gpx-routes blijft
 * route-sample.ts op 80 m staan; daar is het venster wél terecht.
 */
export const SMOOTH_WINDOW_M = 25;

// --- Pure logica ---------------------------------------------------------

/** Lineaire interpolatie van `values` op een vast afstandsraster. */
function resampleOn(
  distance: number[],
  values: number[],
  stepM: number,
): { grid: number[]; sampled: number[] } {
  const grid: number[] = [];
  const sampled: number[] = [];
  const totalM = distance[distance.length - 1] ?? 0;
  let j = 0;
  for (let d = 0; d <= totalM; d += stepM) {
    while (j < distance.length - 2 && distance[j + 1] < d) j++;
    const d0 = distance[j];
    const d1 = distance[j + 1] ?? d0;
    const span = d1 - d0;
    const t = span > 0 ? (d - d0) / span : 0;
    const v0 = values[j];
    const v1 = values[j + 1] ?? v0;
    grid.push(d);
    sampled.push(v0 + (v1 - v0) * t);
  }
  return { grid, sampled };
}

/** Voortschrijdend gemiddelde over `windowM` aan weerszijden. */
export function smoothSeries(values: number[], stepM: number, windowM: number): number[] {
  const win = Math.max(1, Math.round(windowM / stepM));
  return values.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - win); k <= Math.min(values.length - 1, i + win); k++) {
      sum += values[k];
      n++;
    }
    return sum / n;
  });
}

/**
 * Zet ruwe streams om in het profiel dat we bewaren: vast raster + smoothing.
 * Zonder smoothing telt de ruis in de stream als hoogtemeters mee.
 */
export function profileFromStreams(
  streams: Pick<SegmentStreams, "distance" | "altitude">,
  stepM = PROFILE_STEP_M,
): RouteProfile | null {
  const { distance, altitude } = streams;
  if (distance.length < 2 || altitude.length < 2) return null;
  const n = Math.min(distance.length, altitude.length);
  const { grid, sampled } = resampleOn(distance.slice(0, n), altitude.slice(0, n), stepM);
  if (grid.length < 2) return null;
  return { distanceM: grid, altitudeM: smoothSeries(sampled, stepM, SMOOTH_WINDOW_M) };
}

/** De routevorm op een grover raster, voor de SVG-plattegrond. */
export function shapeFromStreams(
  streams: SegmentStreams,
  stepM = SHAPE_STEP_M,
): RouteShape | null {
  const { distance, latlng } = streams;
  if (!latlng || latlng.length < 2 || distance.length < 2) return null;
  const n = Math.min(distance.length, latlng.length);
  const d = distance.slice(0, n);
  const lat = resampleOn(d, latlng.slice(0, n).map((p) => p[0]), stepM).sampled;
  const lon = resampleOn(d, latlng.slice(0, n).map((p) => p[1]), stepM).sampled;
  if (lat.length < 2) return null;
  return { lat, lon };
}

/** Som van de positieve hoogteverschillen. */
export function elevationGainM(altitude: number[]): number {
  let gain = 0;
  for (let i = 1; i < altitude.length; i++) {
    const delta = altitude[i] - altitude[i - 1];
    if (delta > 0) gain += delta;
  }
  return gain;
}

export type ProfileCheck = {
  slug: string;
  segmentId: number;
  streamKm: number;
  expectedKm: number;
  kmDeltaPct: number;
  streamElevationM: number;
  expectedElevationM: number;
  elevationDeltaPct: number;
  points: number;
  hasShape: boolean;
  /**
   * Twee heel verschillende problemen, dus twee vlaggen.
   *
   * Afstand fout = het Strava-segment dekt niet dezelfde route. Dan is het
   * profiel onbruikbaar: een pacingplan zou over het verkeerde parcours gaan.
   *
   * Hoogte fout = meestal een meetconventie, geen fout. zwift-data neemt de
   * hoogtemeters over van ZwiftInsider, die de ruwe optelsom rapporteert; wij
   * smoothen eerst, en tellen zo geen ruis als klimwerk mee. Onze waarde is voor
   * pacing juister, niet slechter.
   */
  distanceOk: boolean;
  elevationOk: boolean;
  verdict: "ok" | "hoogte-wijkt-af" | "afstand-wijkt-af";
};

/**
 * Afstand mag 10 % afwijken, hoogtemeters 20 % — die zijn gevoeliger voor
 * smoothing en voor hoe Zwift zelf afrondt.
 *
 * Op een vlakke route is dat percentage onbruikbaar: Tempus Fugit heeft 26 hm
 * over 17 km, dus zeven meter verschil is meteen 26 %. Daarom telt een verschil
 * onder ELEVATION_TOLERANCE_M sowieso niet als afwijking. Dat de stream
 * structureel iets lager uitkomt is verwacht — smoothing hoort ruis niet als
 * hoogtewinst mee te tellen.
 */
export const KM_TOLERANCE_PCT = 10;
export const ELEVATION_TOLERANCE_PCT = 20;
export const ELEVATION_TOLERANCE_M = 15;

function deltaPct(actual: number, expected: number): number {
  if (!expected) return actual ? 100 : 0;
  return ((actual - expected) / expected) * 100;
}

/**
 * Vergelijkt een afgeleid profiel met wat zwift-data over de route zegt. Dit is
 * de toets van de spike: klopt het profiel niet met de bekende afstand en
 * hoogtemeters, dan is de stream onbruikbaar als routebron.
 */
export function checkProfile(input: {
  slug: string;
  segmentId: number;
  expectedKm: number;
  expectedElevationM: number;
  profile: RouteProfile;
  shape: RouteShape | null;
}): ProfileCheck {
  const { profile } = input;
  const streamKm = (profile.distanceM[profile.distanceM.length - 1] ?? 0) / 1000;
  const streamElevationM = elevationGainM(profile.altitudeM);
  const kmDeltaPct = deltaPct(streamKm, input.expectedKm);
  const elevationDeltaPct = deltaPct(streamElevationM, input.expectedElevationM);
  const distanceOk = Math.abs(kmDeltaPct) <= KM_TOLERANCE_PCT;
  const elevationOk =
    Math.abs(elevationDeltaPct) <= ELEVATION_TOLERANCE_PCT ||
    Math.abs(streamElevationM - input.expectedElevationM) <= ELEVATION_TOLERANCE_M;
  return {
    slug: input.slug,
    segmentId: input.segmentId,
    streamKm,
    expectedKm: input.expectedKm,
    kmDeltaPct,
    streamElevationM,
    expectedElevationM: input.expectedElevationM,
    elevationDeltaPct,
    points: profile.distanceM.length,
    hasShape: Boolean(input.shape),
    distanceOk,
    elevationOk,
    verdict: !distanceOk
      ? "afstand-wijkt-af"
      : elevationOk
        ? "ok"
        : "hoogte-wijkt-af",
  };
}

/** Vorm van de Strava-streamsrespons met `key_by_type=true`. */
export function parseStreamsResponse(body: unknown): SegmentStreams | null {
  const record = body as Record<string, { data?: unknown } | undefined> | null;
  if (!record) return null;
  const distance = record.distance?.data;
  const altitude = record.altitude?.data;
  if (!Array.isArray(distance) || !Array.isArray(altitude)) return null;
  const latlng = record.latlng?.data;
  return {
    distance: distance.map(Number),
    altitude: altitude.map(Number),
    latlng: Array.isArray(latlng)
      ? (latlng as unknown[])
          .filter((p): p is [number, number] => Array.isArray(p) && p.length === 2)
          .map((p) => [Number(p[0]), Number(p[1])] as [number, number])
      : null,
  };
}

// --- Netwerk -------------------------------------------------------------

export type StreamsResult =
  | { ok: true; streams: SegmentStreams }
  | { ok: false; rateLimited: true }
  | { ok: false; rateLimited: false; error: string };

/**
 * Haalt de streams van één Strava-segment op. 429 komt apart terug zodat de
 * aanroeper kan stoppen en een volgende ronde verder gaat — zelfde ritme als
 * calibrateWatopiaCols.
 */
export async function fetchSegmentStreams(
  segmentId: number,
  accessToken: string,
): Promise<StreamsResult> {
  try {
    const res = await fetch(
      `https://www.strava.com/api/v3/segments/${segmentId}/streams?keys=distance,altitude,latlng&key_by_type=true`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (res.status === 429) return { ok: false, rateLimited: true };
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        rateLimited: false,
        error: `Strava ${res.status}: ${text.slice(0, 160)}`,
      };
    }
    const streams = parseStreamsResponse(await res.json());
    if (!streams) {
      return {
        ok: false,
        rateLimited: false,
        error: "Geen distance/altitude in de respons.",
      };
    }
    return { ok: true, streams };
  } catch (err) {
    return {
      ok: false,
      rateLimited: false,
      error: err instanceof Error ? err.message : "Streams ophalen faalde.",
    };
  }
}
