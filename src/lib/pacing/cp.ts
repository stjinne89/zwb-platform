// Critical Power en W′ voor het pacingplan.
//
// CP is het vermogen dat een renner in theorie onbeperkt volhoudt; W′ is de
// anaerobe reserve daarboven, in joules. Samen zijn ze wat een pacingplan tot
// meer maakt dan een schuifregelaar: boven CP loopt de reserve leeg, eronder
// vult hij bij. Een plan dat W′ vóór de finish leegtrekt is geen plan.
//
// Bron in volgorde van betrouwbaarheid:
//  1. profile_sport_settings.cp_watts / w_prime_joules — door intervals.icu zelf
//     gefit op de hele historie van het lid.
//  2. De vermogenscurve (rider_power_profiles.curve_points): het tweeparameter-
//     model P = W′/t + CP is lineair in 1/t, dus een gewone regressie volstaat.
//  3. FTP: CP ligt daar dicht bij, W′ krijgt een clubbrede aanname.
//  4. Niets: een clubbrede schatting, afgeleid van dezelfde constanten die het
//     rit-weer gebruikt, zodat er niet twee verschillende "gemiddelde leden"
//     rondlopen.
//
// Pure logica; de aanroeper leest de rijen uit de database.

import {
  ENDURANCE_FTP_FRACTION,
  FALLBACK_WEIGHT_KG,
  FALLBACK_WKG,
} from "@/lib/teams/power-profile";

export type CurvePoint = { seconds: number; watts: number };

export type CpSource = "intervals" | "curve" | "ftp" | "schatting";

export type CpModel = {
  cpWatts: number;
  wPrimeJoules: number;
  source: CpSource;
  weightKg: number;
};

/**
 * Het venster waarbinnen het tweeparametermodel geldt. Korter dan twee minuten
 * overschat W′ (daar domineert de sprint), langer dan twintig minuten onderschat
 * CP (daar begint de duurzaamheidsafname).
 */
export const FIT_MIN_SECONDS = 120;
export const FIT_MAX_SECONDS = 1200;
const MIN_FIT_POINTS = 3;

/** Grenzen waarbuiten een fit niet geloofwaardig is en we een bron lager pakken. */
const MIN_W_PRIME_J = 5_000;
const MAX_W_PRIME_J = 50_000;

/** W′ als er alleen een FTP bekend is. Middenmoot voor een getrainde amateur. */
export const DEFAULT_W_PRIME_J = 20_000;
/** CP ligt iets onder FTP: FTP is per definitie net niet vol te houden. */
export const CP_FTP_FRACTION = 0.97;

function finite(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Lineaire regressie van P op 1/t: P = W′·(1/t) + CP. De helling is W′, het
 * snijpunt CP. Geeft null als de punten te weinig spreiding hebben of als het
 * resultaat buiten de fysiologische grenzen valt — dan is een lagere bron beter
 * dan een mooi ogend maar verkeerd getal.
 */
export function fitCpWPrime(
  points: Array<CurvePoint> | null | undefined,
): { cpWatts: number; wPrimeJoules: number } | null {
  if (!Array.isArray(points)) return null;

  const usable = points
    .filter(
      (point) =>
        finite(point.seconds) !== null &&
        finite(point.watts) !== null &&
        point.seconds >= FIT_MIN_SECONDS &&
        point.seconds <= FIT_MAX_SECONDS,
    )
    .map((point) => ({ x: 1 / point.seconds, y: point.watts }));

  if (usable.length < MIN_FIT_POINTS) return null;

  const n = usable.length;
  const sumX = usable.reduce((sum, p) => sum + p.x, 0);
  const sumY = usable.reduce((sum, p) => sum + p.y, 0);
  const sumXY = usable.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = usable.reduce((sum, p) => sum + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;
  // Alle punten op dezelfde duur: geen helling te bepalen.
  if (Math.abs(denominator) < 1e-12) return null;

  const wPrimeJoules = (n * sumXY - sumX * sumY) / denominator;
  const cpWatts = (sumY - wPrimeJoules * sumX) / n;

  if (!Number.isFinite(cpWatts) || !Number.isFinite(wPrimeJoules)) return null;
  if (cpWatts <= 0) return null;
  if (wPrimeJoules < MIN_W_PRIME_J || wPrimeJoules > MAX_W_PRIME_J) return null;

  return {
    cpWatts: Math.round(cpWatts),
    wPrimeJoules: Math.round(wPrimeJoules),
  };
}

export type CpInput = {
  /** profile_sport_settings.cp_watts */
  storedCpWatts?: number | null;
  /** profile_sport_settings.w_prime_joules */
  storedWPrimeJoules?: number | null;
  curvePoints?: CurvePoint[] | null;
  ftpWatts?: number | null;
  weightKg?: number | null;
};

/**
 * Levert altijd een bruikbaar model, met een `source` die de UI toont — een lid
 * hoort te zien of zijn plan op gemeten data of op een schatting rust.
 */
export function resolveCpWPrime(input: CpInput): CpModel {
  const weightKg = finite(input.weightKg) ?? FALLBACK_WEIGHT_KG;

  const storedCp = finite(input.storedCpWatts);
  const storedWPrime = finite(input.storedWPrimeJoules);
  if (storedCp && storedWPrime) {
    return {
      cpWatts: Math.round(storedCp),
      wPrimeJoules: Math.round(storedWPrime),
      source: "intervals",
      weightKg,
    };
  }

  const fitted = fitCpWPrime(input.curvePoints);
  if (fitted) return { ...fitted, source: "curve", weightKg };

  const ftp = finite(input.ftpWatts);
  if (ftp) {
    return {
      cpWatts: Math.round(ftp * CP_FTP_FRACTION),
      // Een los opgeslagen W′ zonder CP is nog steeds beter dan de aanname.
      wPrimeJoules: Math.round(storedWPrime ?? DEFAULT_W_PRIME_J),
      source: "ftp",
      weightKg,
    };
  }

  // Zonder ook maar een FTP: leid een clubbrede schatting af uit de constanten
  // van het rit-weer, zodat er niet twee "gemiddelde leden" in de app bestaan.
  const estimatedFtp = (FALLBACK_WKG / ENDURANCE_FTP_FRACTION) * weightKg;
  return {
    cpWatts: Math.round(estimatedFtp * CP_FTP_FRACTION),
    wPrimeJoules: Math.round(storedWPrime ?? DEFAULT_W_PRIME_J),
    source: "schatting",
    weightKg,
  };
}

export const CP_SOURCE_LABELS: Record<CpSource, string> = {
  intervals: "uit intervals.icu",
  curve: "uit je vermogenscurve",
  ftp: "uit je FTP",
  schatting: "schatting",
};
