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
//  3. FTP: CP ligt daar gemiddeld op, W′ krijgt een clubbrede aanname.
//
// Wetenschappelijke toets fase 5 (2026-10-16, docs/wetenschappelijke-toets.md):
// CP uit racedata klopt op een paar watt, W′ veel minder (Spragg 2023; Karsten
// 2013: fout ~27 %). De curve is dus een goede bron voor CP en een zwakke voor W′.
// Sinds 2026-11-25 komt W′ daarom eerst uit intervals.icu (`icu_rolling_w_prime`
// van de laatste rit), daarna uit profile_sport_settings, en pas dan uit de fit.
// De fit gaf bij 28 van 29 leden een lagere W′, in de mediaan 1,61 × zo laag,
// en in de ZRL-race van 24 november verbruikten renners die voluit reden meer dan
// de gefitte W′. Zie docs/pacingplan-race-analyse-2026-11-25.md.
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

/** Waar W′ vandaan komt; kan van de bron van CP verschillen. */
export type WPrimeSource = "intervals" | "fit" | "aanname";

export type CpModel = {
  cpWatts: number;
  wPrimeJoules: number;
  source: CpSource;
  /** Ontbreekt bij oudere aanroepen; dan geldt de bron van CP. */
  wPrimeSource?: WPrimeSource;
  weightKg: number;
  /** Geen gewicht bekend: `weightKg` is de clubbrede aanname, geen meting. */
  weightEstimated?: boolean;
};

/**
 * Het venster waarbinnen het tweeparametermodel geldt. Korter dan twee minuten
 * overschat W′ (daar domineert de sprint), langer dan twintig minuten onderschat
 * CP (daar begint de duurzaamheidsafname). In lijn met het advies van minstens
 * drie inspanningen tussen 2 en 15 minuten (Leo 2021); alleen korte punten, of
 * een 1-minuutpunt, overschatten CP (Maturana 2017; Nimmerichter 2020).
 */
export const FIT_MIN_SECONDS = 120;
export const FIT_MAX_SECONDS = 1200;
const MIN_FIT_POINTS = 3;

/** Grenzen waarbuiten een fit niet geloofwaardig is en we een bron lager pakken.
 * Een vuistregel, geen populatiegrens uit onderzoek. */
const MIN_W_PRIME_J = 5_000;
const MAX_W_PRIME_J = 50_000;

/** W′ als er alleen een FTP bekend is. Een vuistregel: getrainde renners zaten
 * in veldtests rond 18–20 kJ (Nimmerichter 2020), met grote spreiding. */
export const DEFAULT_W_PRIME_J = 20_000;
/**
 * CP uit FTP. Tot 2026-10-16 was dit 0,97, maar in studies die CP bepalen zoals
 * de app (maximale inspanningen van 2 tot 20 minuten) lag CP gemiddeld gelijk
 * aan of iets boven FTP: +7 W (Karsten 2021), +16 W (McGrath 2021), geen
 * verschil (Morgan 2018). Per renner kan het ±25 W schelen; één factor is een
 * ruwe schatting. Zie docs/wetenschappelijke-toets.md, 5A.
 */
export const CP_FTP_FRACTION = 1;

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
  /** `icu_rolling_w_prime` van de laatste rit in intervals_activities. */
  intervalsWPrimeJoules?: number | null;
  curvePoints?: CurvePoint[] | null;
  ftpWatts?: number | null;
  weightKg?: number | null;
};

/**
 * Levert altijd een bruikbaar model, met een `source` die de UI toont — een lid
 * hoort te zien of zijn plan op gemeten data of op een schatting rust.
 */
export function resolveCpWPrime(input: CpInput): CpModel {
  const knownWeight = finite(input.weightKg);
  const weight = { weightKg: knownWeight ?? FALLBACK_WEIGHT_KG, weightEstimated: knownWeight === null };
  const { weightKg } = weight;

  const storedCp = finite(input.storedCpWatts);
  const storedWPrime = finite(input.storedWPrimeJoules);
  if (storedCp && storedWPrime) {
    return {
      cpWatts: Math.round(storedCp),
      wPrimeJoules: Math.round(storedWPrime),
      source: "intervals",
      wPrimeSource: "intervals",
      ...weight,
    };
  }

  // Een W′ van intervals.icu, los of opgeslagen, gaat vóór de fit en de aanname.
  const measuredWPrime = plausibleWPrime(input.intervalsWPrimeJoules) ?? plausibleWPrime(storedWPrime);
  const wPrime = (fallback: number, fallbackSource: WPrimeSource) =>
    measuredWPrime
      ? { wPrimeJoules: Math.round(measuredWPrime), wPrimeSource: "intervals" as const }
      : { wPrimeJoules: Math.round(fallback), wPrimeSource: fallbackSource };

  const fitted = fitCpWPrime(input.curvePoints);
  if (fitted) {
    return { cpWatts: fitted.cpWatts, ...wPrime(fitted.wPrimeJoules, "fit"), source: "curve", ...weight };
  }

  const ftp = finite(input.ftpWatts);
  if (ftp) {
    return {
      cpWatts: Math.round(ftp * CP_FTP_FRACTION),
      ...wPrime(DEFAULT_W_PRIME_J, "aanname"),
      source: "ftp",
      ...weight,
    };
  }

  // Zonder ook maar een FTP: leid een clubbrede schatting af uit de constanten
  // van het rit-weer, zodat er niet twee "gemiddelde leden" in de app bestaan.
  const estimatedFtp = (FALLBACK_WKG / ENDURANCE_FTP_FRACTION) * weightKg;
  return {
    cpWatts: Math.round(estimatedFtp * CP_FTP_FRACTION),
    ...wPrime(DEFAULT_W_PRIME_J, "aanname"),
    source: "schatting",
    ...weight,
  };
}

/** Binnen de grenzen van de fit, anders liever een bron lager. */
function plausibleWPrime(value: unknown): number | null {
  const n = finite(value);
  return n !== null && n >= MIN_W_PRIME_J && n <= MAX_W_PRIME_J ? n : null;
}

export const CP_SOURCE_LABELS: Record<CpSource, string> = {
  intervals: "uit intervals.icu",
  curve: "uit je vermogenscurve",
  ftp: "uit je FTP",
  schatting: "schatting",
};
