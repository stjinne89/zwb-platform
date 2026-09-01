// Eén routebegrip voor het pacingplan, ongeacht waar de route vandaan komt.
//
// Een buitenrit heeft een .gpx en gaat door de bestaande `sampleRoute`; een
// Zwift-event heeft geen .gpx maar wel een hoogteprofiel uit de routebibliotheek,
// dat over lead-in plus ronden uitgerold moet worden. Beide monden hier uit in
// dezelfde `PacingRoute`: een segmentraster met gradiënt plus de accenten waar
// een plan iets op kan leggen.
//
// Waarom de Zwift-tak niet door route-sample.ts loopt: `sampleRoute` heeft
// lat/lon nodig (het levert ook de weerpunten) en smooth zelf de hoogte. Een
// Zwift-profiel is al gesmoothd bij het ophalen (80 m in zwift-route-streams.ts),
// dus dat nog eens door dezelfde molen halen zou het profiel platslaan. Het enige
// wat gedeeld moet zijn is de segmentresolutie, en die staat hieronder.

import type { Climb } from "@/lib/gpx-climbs";
import type { SampledRoute } from "@/lib/route-sample";
import type { RouteAccent } from "@/lib/events/zwift-route";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";

/** Zelfde resolutie als het tempo-model in route-sample.ts. */
export const PACING_SEGMENT_M = 100;

export type PacingAccentKind = "climb" | "sprint";

/** Een genoemd stuk route waar het lid een accent op kan leggen. */
export type PacingAccent = {
  /** Stabiel binnen één route, ook over ronden heen: "epic-kom-2". */
  id: string;
  name: string;
  kind: PacingAccentKind;
  /** Absolute km binnen het hele event, dus inclusief lead-in en ronden. */
  startKm: number;
  endKm: number;
  /** rise/run over het accent, uit het profiel gerekend. */
  avgGradient: number;
  /** Welke ronde dit accent hoort bij; null voor een .gpx-route. */
  lap: number | null;
};

export type PacingSegment = {
  distanceM: number;
  /** rise/run, positief = klimmen. */
  gradient: number;
  /** Index in `accents`, of null voor het stuk daartussen. */
  accentIndex: number | null;
};

export type PacingRoute = {
  source: "gpx" | "zwift";
  totalKm: number;
  hasElevation: boolean;
  segments: PacingSegment[];
  accents: PacingAccent[];
  /**
   * De lead-in van een Zwift-route is als constante gradiënt benaderd:
   * zwift-data geeft er wel afstand en hoogtemeters voor, maar geen profiel.
   */
  leadInApproximated: boolean;
};

/** Cumulatieve km aan het einde van elk segment — nodig voor doorkomsttijden. */
export function segmentEndKms(segments: PacingSegment[]): number[] {
  const out: number[] = [];
  let cum = 0;
  for (const segment of segments) {
    cum += segment.distanceM / 1000;
    out.push(cum);
  }
  return out;
}

function accentIndexForKm(accents: PacingAccent[], km: number): number | null {
  for (let i = 0; i < accents.length; i++) {
    if (km >= accents[i].startKm && km <= accents[i].endKm) return i;
  }
  return null;
}

/**
 * Zet een hoogteprofiel om in segmenten met gradiënt. `profile` staat op een
 * vast raster; segmenten worden daaruit samengesteld tot PACING_SEGMENT_M.
 */
export function segmentsFromProfile(
  profile: RouteProfile,
  accents: PacingAccent[],
  segmentM = PACING_SEGMENT_M,
): PacingSegment[] {
  const { distanceM, altitudeM } = profile;
  if (distanceM.length < 2) return [];

  const totalM = distanceM[distanceM.length - 1];
  const segments: PacingSegment[] = [];

  let i = 0;
  for (let startM = 0; startM < totalM; startM += segmentM) {
    const endM = Math.min(startM + segmentM, totalM);
    const distance = endM - startM;
    if (distance <= 0) continue;

    while (i < distanceM.length - 2 && distanceM[i + 1] <= startM) i++;
    const startEle = interpolate(distanceM, altitudeM, startM, i);
    const endEle = interpolate(distanceM, altitudeM, endM, i);

    segments.push({
      distanceM: distance,
      gradient: (endEle - startEle) / distance,
      accentIndex: accentIndexForKm(accents, (startM + endM) / 2 / 1000),
    });
  }

  return segments;
}

function interpolate(
  grid: number[],
  values: number[],
  at: number,
  hint: number,
): number {
  let j = hint;
  while (j < grid.length - 2 && grid[j + 1] < at) j++;
  const d0 = grid[j];
  const d1 = grid[j + 1] ?? d0;
  const span = d1 - d0;
  const t = span > 0 ? (at - d0) / span : 0;
  const v0 = values[j];
  const v1 = values[j + 1] ?? v0;
  return v0 + (v1 - v0) * t;
}

/**
 * Rolt een routeprofiel van één ronde uit over lead-in plus `laps` ronden.
 * De hoogte wordt per ronde doorgeschoven zodat de reeks aansluit; alleen de
 * gradiënt telt voor het tempo, niet de absolute hoogte.
 */
export function expandLaps(
  lap: RouteProfile,
  options: { leadInKm: number; leadInElevationM: number; laps: number },
): RouteProfile {
  const { distanceM, altitudeM } = lap;
  if (distanceM.length < 2) return lap;

  const stepM = distanceM[1] - distanceM[0];
  const laps = Math.max(1, Math.round(options.laps));
  const leadInM = Math.max(0, options.leadInKm * 1000);

  const outDistance: number[] = [];
  const outAltitude: number[] = [];

  // Lead-in: constante gradiënt naar de starthoogte van de ronde toe.
  let cursorM = 0;
  if (leadInM >= stepM) {
    const startEle = altitudeM[0] - options.leadInElevationM;
    for (let d = 0; d < leadInM; d += stepM) {
      outDistance.push(d);
      outAltitude.push(startEle + (d / leadInM) * options.leadInElevationM);
    }
    cursorM = Math.ceil(leadInM / stepM) * stepM;
  }

  for (let lapIndex = 0; lapIndex < laps; lapIndex++) {
    // Elke volgende ronde begint waar de vorige eindigde. Het startpunt van een
    // ronde valt dan samen met het sluitpunt van de vorige, dus dat slaan we
    // over — niet het sluitpunt zelf, want dan verdwijnt het laatste stukje
    // klim van elke ronde. Bij tien ronden telt dat op.
    const isFirst = lapIndex === 0;
    const offset = isFirst
      ? 0
      : outAltitude[outAltitude.length - 1] - altitudeM[0];

    for (let k = isFirst ? 0 : 1; k < distanceM.length; k++) {
      outDistance.push(cursorM + distanceM[k]);
      outAltitude.push(altitudeM[k] + offset);
    }
    cursorM += distanceM[distanceM.length - 1];
  }

  return { distanceM: outDistance, altitudeM: outAltitude };
}

/**
 * Zet de accenten van één ronde (km binnen de ronde) om naar absolute km over
 * lead-in en alle ronden. De gradiënt komt uit het uitgerolde profiel, want
 * zwift-data geeft alleen een afgerond gemiddelde per segment.
 */
export function expandAccents(
  routeAccents: RouteAccent[],
  profile: RouteProfile,
  options: { leadInKm: number; lapKm: number; laps: number },
): PacingAccent[] {
  const laps = Math.max(1, Math.round(options.laps));
  const out: PacingAccent[] = [];

  for (let lap = 1; lap <= laps; lap++) {
    const offsetKm = options.leadInKm + (lap - 1) * options.lapKm;
    for (const accent of routeAccents) {
      const startKm = offsetKm + accent.startKm;
      const endKm = offsetKm + accent.endKm;
      out.push({
        id: laps > 1 ? `${accent.slug}-${lap}` : accent.slug,
        name: accent.name,
        kind: accent.kind,
        startKm,
        endKm,
        avgGradient: gradientBetween(profile, startKm, endKm),
        lap: laps > 1 ? lap : null,
      });
    }
  }

  return out.sort((a, b) => a.startKm - b.startKm);
}

function gradientBetween(
  profile: RouteProfile,
  startKm: number,
  endKm: number,
): number {
  const distance = (endKm - startKm) * 1000;
  if (distance <= 0) return 0;
  const start = interpolate(profile.distanceM, profile.altitudeM, startKm * 1000, 0);
  const end = interpolate(profile.distanceM, profile.altitudeM, endKm * 1000, 0);
  return (end - start) / distance;
}

/**
 * Klimmen die zwift-data niet bij naam kent, uit het profiel zelf.
 *
 * `segmentsOnRoute` levert alleen de officiële KOM's en sprints. Een route met
 * rollend terrein en geen enkel genoemd segment zou daardoor één lang stuk
 * worden, en dan valt er niets te doseren. Deze detectie vult dat aan; klimmen
 * die al een naam hebben blijven ongemoeid.
 */
const DETECT_MIN_GAIN_M = 15;
const DETECT_MIN_GRADIENT = 0.025;
const DETECT_MIN_LENGTH_M = 300;
/** Een korte onderbreking breekt een klim niet op. */
const DETECT_MERGE_GAP_M = 400;

export function detectProfileAccents(
  profile: RouteProfile,
  existing: PacingAccent[],
): PacingAccent[] {
  const { distanceM, altitudeM } = profile;
  if (distanceM.length < 3) return [];

  const runs: Array<{ startM: number; endM: number; gainM: number }> = [];
  let startIndex: number | null = null;

  for (let i = 1; i < altitudeM.length; i++) {
    const rising = altitudeM[i] > altitudeM[i - 1];
    if (rising && startIndex === null) startIndex = i - 1;
    if (!rising && startIndex !== null) {
      runs.push({
        startM: distanceM[startIndex],
        endM: distanceM[i - 1],
        gainM: altitudeM[i - 1] - altitudeM[startIndex],
      });
      startIndex = null;
    }
  }
  if (startIndex !== null) {
    const last = altitudeM.length - 1;
    runs.push({
      startM: distanceM[startIndex],
      endM: distanceM[last],
      gainM: altitudeM[last] - altitudeM[startIndex],
    });
  }

  // Stukjes die dicht op elkaar liggen horen bij dezelfde klim.
  const merged: typeof runs = [];
  for (const run of runs) {
    const previous = merged[merged.length - 1];
    if (previous && run.startM - previous.endM <= DETECT_MERGE_GAP_M) {
      previous.endM = run.endM;
      previous.gainM += run.gainM;
      continue;
    }
    merged.push({ ...run });
  }

  const out: PacingAccent[] = [];
  for (const run of merged) {
    const lengthM = run.endM - run.startM;
    if (lengthM < DETECT_MIN_LENGTH_M) continue;
    if (run.gainM < DETECT_MIN_GAIN_M) continue;
    const gradient = run.gainM / lengthM;
    if (gradient < DETECT_MIN_GRADIENT) continue;

    const startKm = run.startM / 1000;
    const endKm = run.endM / 1000;
    // Overlapt met een klim die al een naam heeft: die wint.
    if (existing.some((accent) => accent.startKm < endKm && accent.endKm > startKm)) {
      continue;
    }

    out.push({
      id: `klim-${out.length + 1}`,
      name: `Klim km ${startKm.toFixed(1)}`,
      kind: "climb",
      startKm,
      endKm,
      avgGradient: gradient,
      lap: null,
    });
  }
  return out;
}

/** Een Zwift-event: routeprofiel uit de bibliotheek, uitgerold over de ronden. */
export function pacingRouteFromZwift(input: {
  profile: RouteProfile;
  accents: RouteAccent[];
  leadInKm: number;
  leadInElevationM: number;
  lapKm: number;
  laps: number;
}): PacingRoute {
  const expanded = expandLaps(input.profile, {
    leadInKm: input.leadInKm,
    leadInElevationM: input.leadInElevationM,
    laps: input.laps,
  });
  const named = expandAccents(input.accents, expanded, {
    leadInKm: input.leadInKm,
    lapKm: input.lapKm,
    laps: input.laps,
  });
  const accents = [...named, ...detectProfileAccents(expanded, named)].sort(
    (a, b) => a.startKm - b.startKm,
  );

  return {
    source: "zwift",
    totalKm: (expanded.distanceM[expanded.distanceM.length - 1] ?? 0) / 1000,
    hasElevation: true,
    segments: segmentsFromProfile(expanded, accents),
    accents,
    leadInApproximated: input.leadInKm > 0,
  };
}

/**
 * Een .gpx-route: hergebruikt het bestaande `sampleRoute` (en daarmee dezelfde
 * segmenten die het rit-weer gebruikt), met de gedetecteerde of handmatig
 * overschreven klimmen als accenten.
 */
export function pacingRouteFromGpx(
  sampled: SampledRoute,
  climbs: Climb[],
): PacingRoute {
  const accents: PacingAccent[] = climbs.map((climb, index) => ({
    id: climb.colSlug ?? `klim-${index + 1}`,
    name: climb.name ?? `Klim ${index + 1}`,
    kind: "climb",
    startKm: climb.startKm,
    endKm: climb.endKm,
    avgGradient: climb.avgGradient,
    lap: null,
  }));

  return {
    source: "gpx",
    totalKm: sampled.totalKm,
    hasElevation: sampled.hasElevation,
    segments: sampled.segments.map((segment) => ({
      distanceM: segment.distanceM,
      gradient: segment.gradient,
      accentIndex: segment.climbIndex,
    })),
    accents,
    leadInApproximated: false,
  };
}
