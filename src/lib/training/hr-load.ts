// TSS uit hartslag, voor ritten zonder vermogensmeter.
//
// intervals.icu noemt dit HRSS: de TRIMP van de rit (Banister) gedeeld door de
// TRIMP van een uur op je drempelhartslag, maal 100. Een uur op LTHR levert dus
// net als bij vermogen precies 100. intervals rekent per seconde over de
// hartslagstream; wij hebben van een Strava-rit alleen de gemiddelde hartslag.
//
// Getoetst op 2.441 ritten in productie waarvan intervals de HRSS gaf
// (2026-10-25, gemiddeld 77): zoals hier gerekend zit de TRIMP op gemiddelde
// hartslag mediaan 6% onder die van intervals, gemiddeld 6,4 TSS ernaast,
// r = 0,99. De vrouwenfactor 1,67 halveert de afwijking bij vrouwen. Een
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

/** Rust-HR in de TRIMP; 50 gaf in de toets de kleinste afwijking van een vaste waarde. */
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

/**
 * Stelt de basis samen. LTHR en max-HR komen uit de intervals-instellingen
 * (profile_sport_settings); zonder die twee is er geen basis.
 *
 * Rust-HR is bewust vast. De eigen rust-HR uit de wellness-data maakt de
 * schatting nauwkeuriger (gemiddeld 5,0 in plaats van 6,4 TSS ernaast), maar
 * is opt-in hersteldata die volgens de privacyverklaring alleen voor het lid
 * is, terwijl de TSS ook naar de trainer, de AI-coach en het Strava-blok gaat.
 */
export function hrBasisFrom(input: { lthr: unknown; maxHr: unknown; sex?: string | null }): HrBasis | null {
  const lthr = Number(input.lthr);
  const maxHr = Number(input.maxHr);
  if (!Number.isFinite(lthr) || !Number.isFinite(maxHr) || lthr <= DEFAULT_RESTING_HR || lthr >= maxHr) {
    return null;
  }
  return {
    lthr,
    maxHr,
    restingHr: DEFAULT_RESTING_HR,
    sexFactor: input.sex === "vrouw" ? FEMALE_FACTOR : MALE_FACTOR,
  };
}

/**
 * Laadt de basis van een lid. Elke fout geeft null: dan blijft de TSS van een
 * rit zonder meter leeg, zoals voorheen.
 */
export async function loadHrBasis(
  client: SupabaseClient,
  profileId: string,
): Promise<HrBasis | null> {
  try {
    const [settings, profile] = await Promise.all([
      client
        .from("profile_sport_settings")
        .select("lthr, max_hr")
        .eq("profile_id", profileId)
        .maybeSingle(),
      client.from("profiles").select("sex").eq("id", profileId).maybeSingle(),
    ]);
    if (settings.error || !settings.data) return null;
    return hrBasisFrom({
      lthr: settings.data.lthr,
      maxHr: settings.data.max_hr,
      sex: (profile.data?.sex as string | null | undefined) ?? null,
    });
  } catch {
    return null;
  }
}
