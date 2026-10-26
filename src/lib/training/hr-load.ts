// TSS uit hartslag, voor ritten zonder vermogensmeter.
//
// intervals.icu noemt dit HRSS: de TRIMP van de rit (Banister) gedeeld door de
// TRIMP van een uur op je drempelhartslag, maal 100. Een uur op LTHR levert dus
// net als bij vermogen precies 100. intervals rekent per seconde over de
// hartslagstream; wij hebben van een Strava-rit alleen de gemiddelde hartslag.
//
// Getoetst op 2.441 ritten in productie waarvan intervals de HRSS gaf
// (2026-10-25, gemiddeld 77): met de eigen rust-HR zit de TRIMP op gemiddelde
// hartslag mediaan 4% onder die van intervals, gemiddeld 5,0 TSS ernaast,
// r = 0,99; met de vaste rust-HR 6,4 TSS. De vrouwenfactor 1,67 halveert de afwijking bij vrouwen. Een
// eenvoudiger formule, uur × (HR/LTHR)² × 100, zat er gemiddeld 46% boven en
// is daarom niet gekozen.

import type { SupabaseClient } from "@supabase/supabase-js";

export type HrBasis = {
  lthr: number;
  maxHr: number;
  restingHr: number;
  /** Weegfactor in de TRIMP: 1,92 voor mannen, 1,67 voor vrouwen (Banister). */
  sexFactor: number;
};

/** Rust-HR zonder eigen metingen; 50 gaf in de toets de kleinste afwijking van een vaste waarde. */
export const DEFAULT_RESTING_HR = 50;

const MALE_FACTOR = 1.92;
const FEMALE_FACTOR = 1.67;

function trimpPerMinute(heartRate: number, basis: HrBasis) {
  const reserve = (heartRate - basis.restingHr) / (basis.maxHr - basis.restingHr);
  return reserve * 0.64 * Math.exp(basis.sexFactor * reserve);
}

/**
 * HRSS uit duur en gemiddelde hartslag. Null zonder bruikbare basis, of als de
 * gemiddelde hartslag niet boven de rust-HR uitkomt (dan klopt de meting niet).
 */
export function heartRateStressScore(
  movingSeconds: number | null,
  averageHr: number | null,
  basis: HrBasis | null,
): number | null {
  if (!movingSeconds || movingSeconds <= 0 || !averageHr || !basis) return null;
  const { lthr, maxHr, restingHr } = basis;
  if (!(restingHr < lthr && lthr < maxHr) || averageHr <= restingHr) return null;
  const ride = (movingSeconds / 60) * trimpPerMinute(Math.min(averageHr, maxHr), basis);
  const thresholdHour = 60 * trimpPerMinute(lthr, basis);
  return Math.round((ride / thresholdHour) * 100);
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Stelt de basis samen. LTHR en max-HR komen uit de intervals-instellingen
 * (profile_sport_settings); zonder die twee is er geen basis. Rust-HR is de
 * mediaan van de recente wellness-metingen (opt-in hersteldata), anders
 * DEFAULT_RESTING_HR. Met de eigen rust-HR zit de schatting gemiddeld 5,0 TSS
 * naast intervals, met de vaste 6,4.
 */
export function hrBasisFrom(input: {
  lthr: unknown;
  maxHr: unknown;
  restingHrs?: unknown[];
  sex?: string | null;
}): HrBasis | null {
  const lthr = Number(input.lthr);
  const maxHr = Number(input.maxHr);
  if (!Number.isFinite(lthr) || !Number.isFinite(maxHr) || lthr <= DEFAULT_RESTING_HR || lthr >= maxHr) {
    return null;
  }
  // Een rust-HR buiten 30–90 is een meetfout (intervals had er een van 140).
  const resting = median(
    (input.restingHrs ?? []).map(Number).filter((hr) => Number.isFinite(hr) && hr >= 30 && hr <= 90),
  );
  return {
    lthr,
    maxHr,
    restingHr: resting ?? DEFAULT_RESTING_HR,
    sexFactor: input.sex === "vrouw" ? FEMALE_FACTOR : MALE_FACTOR,
  };
}

/** Hoe ver terug de rust-HR meetelt. */
const RESTING_HR_DAYS = 60;

/**
 * Laadt de basis van een lid. Elke fout geeft null: dan blijft de TSS van een
 * rit zonder meter leeg, zoals voorheen. profile_wellness heeft alleen rijen
 * zolang het lid de hersteldata-opt-in aan heeft; uitzetten wist ze.
 */
export async function loadHrBasis(
  client: SupabaseClient,
  profileId: string,
): Promise<HrBasis | null> {
  try {
    const since = new Date(Date.now() - RESTING_HR_DAYS * 86400_000).toISOString().slice(0, 10);
    const [settings, profile, wellness] = await Promise.all([
      client
        .from("profile_sport_settings")
        .select("lthr, max_hr")
        .eq("profile_id", profileId)
        .maybeSingle(),
      client.from("profiles").select("sex").eq("id", profileId).maybeSingle(),
      client
        .from("profile_wellness")
        .select("resting_hr")
        .eq("profile_id", profileId)
        .gte("date", since)
        .not("resting_hr", "is", null),
    ]);
    if (settings.error || !settings.data) return null;
    return hrBasisFrom({
      lthr: settings.data.lthr,
      maxHr: settings.data.max_hr,
      restingHrs: (wellness.data ?? []).map((row: { resting_hr: unknown }) => row.resting_hr),
      sex: (profile.data?.sex as string | null | undefined) ?? null,
    });
  } catch {
    return null;
  }
}
