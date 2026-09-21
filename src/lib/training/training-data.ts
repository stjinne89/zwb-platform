// Wat het lid werkelijk reed: de trainingsdata waar de coach vragen over moet
// kunnen beantwoorden.
//
// De coachchat begon als uitleg bij het schema. Daardoor kende de coach wél de
// invoer waarop het schema is gemaakt, maar niet wat er sindsdien gereden is —
// en op de vraag "kun je bij mijn trainingsdata" was het antwoord terecht nee.
// Dit bestand vult dat gat met dezelfde cijfers die het lid op de
// Belasting- en Vermogen-pagina ziet, zodat coach en pagina hetzelfde zeggen.
//
// Bijna alles komt uit opgeslagen rijen: Strava-ritten (met TSS en IF die we
// zelf uitrekenen, want intervals.icu geeft voor via Strava binnengekomen
// ritten niets terug — zie ride-metrics.ts), de FTP-tests en het
// gesynchroniseerde vermogensprofiel. Eén ding staat nergens in onze database:
// CTL/ATL/TSB. Dat komt live uit intervals.icu, met een krappe tijdslimiet en
// zonder dat een mislukking het antwoord tegenhoudt.

import type { createAdminClient } from "@/lib/supabase/admin";
import { fetchIntervalsWellness, type IntervalsWellness } from "@/lib/intervals/client";
import { toTrainingLoadPoints } from "@/lib/training/load-points";
import {
  rideLoadRows,
  rideMetricsFromStrava,
  summarizeRecentRides,
  weeklyLoad,
  STRAVA_RIDE_COLUMNS,
  type StravaRideRow,
  type WeeklyCtlPoint,
} from "@/lib/training/ride-metrics";
import { CYCLING_SPORTS } from "@/lib/strava/sports";
import { ftpResolver, loadFtpHistory, type FtpHistoryEntry } from "@/lib/training/ftp-history";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

type Admin = ReturnType<typeof createAdminClient>;

/** Hoe ver terug de ritten worden gelezen; genoeg voor twaalf hele weken. */
export const RIDE_WINDOW_DAYS = 90;
/** Plafond op het aantal gelezen ritten. Ruim boven een normale 90 dagen. */
export const RIDE_QUERY_LIMIT = 250;
/** Hoeveel ritten er als losse rit in de context komen. */
export const RECENT_RIDES = 12;
/** Venster voor het volumebeeld; gelijk aan dat van de schema-generatie. */
export const VOLUME_DAYS = 28;
/** Hoeveel weken belasting de coach meekrijgt. */
export const LOAD_WEEKS = 12;
/** Hoeveel FTP-tests er meegaan. */
export const FTP_TESTS = 3;
/** Wellness-venster voor de vorm; lang genoeg voor CTL-groei per week. */
export const FORM_DAYS = 90;
/**
 * Hoe lang de chat op intervals.icu wacht. De POST die dit aanroept moet ruim
 * binnen de functietimeout blijven, en een trage koppeling mag nooit het
 * coach-antwoord kosten: na dit budget gaat het gesprek door zonder vorm.
 */
export const FORM_BUDGET_MS = 4_000;

export type CoachRide = {
  datum: string;
  titel: string | null;
  soort: string | null;
  minuten: number | null;
  km: number | null;
  hoogtemeters: number | null;
  /** TSS; leeg zonder echte vermogensmeter. */
  belasting: number | null;
  /** IF; leeg zonder echte vermogensmeter. */
  intensiteit: number | null;
  normVermogen: number | null;
  gemVermogen: number | null;
  gemHartslag: number | null;
  maxHartslag: number | null;
  vermogensmeter: boolean;
};

export type CoachWeek = {
  /** Maandag van de week. */
  week: string;
  belasting: number;
  uren: number;
  km: number;
  /** CTL-groei over die week; leeg zonder intervals.icu. */
  ctlVerschil: number | null;
};

export type CoachVolume = {
  dagen: number;
  ritten: number;
  uren: number;
  km: number;
  hoogtemeters: number;
  urenPerWeek: number;
  rittenPerWeek: number;
  gemDuurMinuten: number;
  langsteRitMinuten: number;
};

export type CoachPower = {
  ftpWatts: number | null;
  gewichtKg: number | null;
  ftpPerKg: number | null;
  tests: Array<{
    datum: string;
    soort: string;
    resultaatWatts: number | null;
    ftpWatts: number | null;
  }>;
  /** Het gesynchroniseerde vermogensprofiel; leeg zonder sync. */
  curve: {
    periode: string | null;
    gesyncedOp: string | null;
    type: string | null;
    watt15s: number | null;
    watt1m: number | null;
    watt5m: number | null;
    watt20m: number | null;
    wkg15s: number | null;
    wkg1m: number | null;
    wkg5m: number | null;
    wkg20m: number | null;
  } | null;
};

export type CoachForm = {
  gemetenOp: string | null;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  eftp: number | null;
  rampRate: number | null;
};

export type CoachTrainingData = {
  bron: {
    /** Wanneer de laatst gelezen rit bij ons binnenkwam. */
    laatsteRitSync: string | null;
    /** De dag van de nieuwste rit die we kennen. */
    laatsteRit: string | null;
    ritvensterDagen: number;
    /** Waar de vorm vandaan komt; leeg als er geen vorm is. */
    vormBron: "intervals.icu" | null;
  };
  volume: CoachVolume | null;
  weken: CoachWeek[];
  ritten: CoachRide[];
  vermogen: CoachPower | null;
  vorm: CoachForm | null;
};

export type CoachRideRow = StravaRideRow & {
  sport_type?: string | null;
  total_elevation_gain_m?: number | string | null;
  synced_at?: string | null;
};

export type FtpTestRow = {
  tested_on: string;
  test_type: string;
  result_watts: number | string | null;
  ftp_watts: number | string | null;
};

export type PowerProfileRow = {
  period: string | null;
  synced_at: string | null;
  rider_type: string | null;
  watts_15s: number | null;
  watts_1m: number | null;
  watts_5m: number | null;
  watts_20m: number | null;
  wkg_15s: number | string | null;
  wkg_1m: number | string | null;
  wkg_5m: number | string | null;
  wkg_20m: number | string | null;
};

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value: number | null, decimals = 0): number | null {
  if (value == null) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function dayKeyOf(iso: string): string {
  return amsterdamDayKey(new Date(iso));
}

/**
 * De vorm uit een reeks wellness-records. Los van de fetch, zodat de rekenregel
 * te testen is zonder intervals.icu.
 */
export function formFrom(rows: IntervalsWellness[]): {
  form: CoachForm;
  ctlPoints: WeeklyCtlPoint[];
} | null {
  const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const latest = sorted[sorted.length - 1];
  if (!latest) return null;

  const ctl = num(latest.ctl);
  const atl = num(latest.atl);
  return {
    form: {
      gemetenOp: latest.id,
      ctl: round(ctl, 1),
      atl: round(atl, 1),
      tsb: ctl != null && atl != null ? round(ctl - atl, 1) : null,
      // Laatste gevulde eFTP: intervals schrijft die alleen op dagen met een
      // schatting, dus de nieuwste rij is vaak leeg.
      eftp: num([...sorted].reverse().find((row) => row.eftp)?.eftp ?? null),
      rampRate: round(num(latest.ramp_rate), 1),
    },
    ctlPoints: toTrainingLoadPoints(sorted).map((point) => ({
      date: point.date,
      ctl: point.ctl,
    })),
  };
}

/**
 * Wacht hoogstens `ms` op `work`. Loopt het budget af, dan `null`; het
 * onderliggende verzoek mag daarna nog aankomen, maar niemand wacht erop.
 */
export async function withBudget<T>(work: Promise<T>, ms: number): Promise<T | null> {
  // Alvast een handler, zodat een late afwijzing geen unhandled rejection wordt.
  const guarded = work.catch(() => null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([guarded, budget]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function powerFrom(input: {
  ftpWatts: number | null;
  weightKg: number | null;
  ftpTests: FtpTestRow[];
  powerProfile: PowerProfileRow | null;
}): CoachPower | null {
  const tests = input.ftpTests.map((test) => ({
    datum: String(test.tested_on).slice(0, 10),
    soort: test.test_type,
    resultaatWatts: num(test.result_watts),
    ftpWatts: num(test.ftp_watts),
  }));
  const profile = input.powerProfile;
  const curve = profile
    ? {
        periode: profile.period ?? null,
        gesyncedOp: profile.synced_at ?? null,
        type: profile.rider_type ?? null,
        watt15s: num(profile.watts_15s),
        watt1m: num(profile.watts_1m),
        watt5m: num(profile.watts_5m),
        watt20m: num(profile.watts_20m),
        wkg15s: num(profile.wkg_15s),
        wkg1m: num(profile.wkg_1m),
        wkg5m: num(profile.wkg_5m),
        wkg20m: num(profile.wkg_20m),
      }
    : null;

  const hasCurve = curve && Object.values(curve).some((value) => typeof value === "number");
  if (input.ftpWatts == null && input.weightKg == null && tests.length === 0 && !hasCurve) {
    return null;
  }

  return {
    ftpWatts: input.ftpWatts,
    gewichtKg: round(input.weightKg, 1),
    ftpPerKg:
      input.ftpWatts != null && input.weightKg != null && input.weightKg > 0
        ? round(input.ftpWatts / input.weightKg, 2)
        : null,
    tests,
    curve: hasCurve ? curve : null,
  };
}

/**
 * Pure kern: van opgeslagen rijen naar de trainingsdata die naar het model gaat.
 * `now` is een parameter zodat de test niet van de klok afhangt.
 */
export function trainingDataFrom(input: {
  rides: CoachRideRow[];
  ftpWatts: number | null;
  /** FTP per periode (0175); leeg = elke rit met ftpWatts. */
  ftpHistory?: FtpHistoryEntry[];
  weightKg: number | null;
  ftpTests: FtpTestRow[];
  powerProfile: PowerProfileRow | null;
  form: { form: CoachForm; ctlPoints: WeeklyCtlPoint[] } | null;
  now?: number;
}): CoachTrainingData {
  const now = input.now ?? Date.now();
  const rides = [...input.rides].sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));
  const ftpAt = ftpResolver(input.ftpHistory ?? [], input.ftpWatts);
  const loadRows = rideLoadRows(rides, ftpAt);

  const volumeSince = amsterdamDayKey(new Date(now - VOLUME_DAYS * 86_400_000));
  const inVolumeWindow = rides.filter((ride) => dayKeyOf(ride.start_date) >= volumeSince);
  const shape = summarizeRecentRides(inVolumeWindow, VOLUME_DAYS);

  const weken = weeklyLoad(loadRows, LOAD_WEEKS, input.form?.ctlPoints ?? []).map((week) => ({
    week: week.weekStart,
    belasting: week.load,
    uren: round(week.seconds / 3600, 1) ?? 0,
    km: week.kilometers,
    ctlVerschil: week.ctlChange,
  }));

  const ritten: CoachRide[] = rides.slice(0, RECENT_RIDES).map((ride) => {
    const metrics = rideMetricsFromStrava(ride.raw, ride.moving_time_seconds, ftpAt);
    const meters = num(ride.distance_m);
    return {
      datum: dayKeyOf(ride.start_date),
      titel: ride.name,
      soort: ride.sport_type ?? null,
      minuten: metrics.movingMinutes,
      km: meters == null ? null : round(meters / 1000, 1),
      hoogtemeters: round(num(ride.total_elevation_gain_m)),
      belasting: metrics.tss,
      intensiteit: metrics.intensityFactor,
      normVermogen: metrics.normalizedWatts,
      gemVermogen: metrics.averageWatts,
      gemHartslag: round(metrics.averageHr),
      maxHartslag: round(metrics.maxHr),
      vermogensmeter: metrics.hasPowerMeter,
    };
  });

  const laatsteRitSync =
    rides
      .map((ride) => ride.synced_at ?? null)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  return {
    bron: {
      laatsteRitSync,
      laatsteRit: rides[0] ? dayKeyOf(rides[0].start_date) : null,
      ritvensterDagen: RIDE_WINDOW_DAYS,
      vormBron: input.form ? "intervals.icu" : null,
    },
    volume:
      inVolumeWindow.length > 0
        ? {
            dagen: VOLUME_DAYS,
            ritten: shape.activities,
            uren: round(shape.hours, 1) ?? 0,
            km: round(shape.distanceKm) ?? 0,
            hoogtemeters: round(shape.elevationM) ?? 0,
            urenPerWeek: shape.hoursPerWeek,
            rittenPerWeek: shape.ridesPerWeek,
            gemDuurMinuten: shape.avgDurationMinutes,
            langsteRitMinuten: shape.longestRideMinutes,
          }
        : null,
    weken,
    ritten,
    vermogen: powerFrom(input),
    vorm: input.form?.form ?? null,
  };
}

/** De actuele vorm uit intervals.icu, binnen het tijdbudget en best-effort. */
export async function fetchCoachForm(
  connection: { api_key?: string | null; athlete_id?: string | null } | null,
  budgetMs = FORM_BUDGET_MS,
): Promise<{ form: CoachForm; ctlPoints: WeeklyCtlPoint[] } | null> {
  if (!connection?.api_key || !connection?.athlete_id) return null;
  const rows = await withBudget(
    fetchIntervalsWellness(connection.api_key, connection.athlete_id, FORM_DAYS),
    budgetMs,
  );
  if (!rows || rows.length === 0) return null;
  return formFrom(rows);
}

export async function buildCoachTrainingData(
  admin: Admin,
  profileId: string,
  connection: { api_key?: string | null; athlete_id?: string | null } | null,
): Promise<CoachTrainingData> {
  const since = new Date(Date.now() - RIDE_WINDOW_DAYS * 86_400_000).toISOString();

  const [{ data: rideRows }, { data: profileRow }, { data: ftpTestRows }, { data: powerRow }, form, ftpHistory] =
    await Promise.all([
      admin
        .from("strava_activities")
        // Alleen fietsen: een hardloopblok hoort niet in het fietsvolume, net
        // zomin als in de weekbelasting waar de planner op stuurt.
        .select(`${STRAVA_RIDE_COLUMNS}, total_elevation_gain_m, sport_type, synced_at`)
        .eq("profile_id", profileId)
        .in("sport_type", CYCLING_SPORTS)
        .gte("start_date", since)
        .order("start_date", { ascending: false })
        .limit(RIDE_QUERY_LIMIT),
      admin.from("profiles").select("ftp_watts, weight_kg").eq("id", profileId).maybeSingle(),
      admin
        .from("training_ftp_tests")
        .select("tested_on, test_type, result_watts, ftp_watts")
        .eq("profile_id", profileId)
        .order("tested_on", { ascending: false })
        .limit(FTP_TESTS),
      admin
        .from("rider_power_profiles")
        .select(
          "period, synced_at, rider_type, watts_15s, watts_1m, watts_5m, watts_20m, wkg_15s, wkg_1m, wkg_5m, wkg_20m",
        )
        .eq("profile_id", profileId)
        .maybeSingle(),
      fetchCoachForm(connection).catch(() => null),
      loadFtpHistory(admin, profileId),
    ]);

  const profile = profileRow as { ftp_watts: number | null; weight_kg: number | string | null } | null;

  return trainingDataFrom({
    rides: (rideRows ?? []) as CoachRideRow[],
    ftpWatts: num(profile?.ftp_watts),
    ftpHistory,
    weightKg: num(profile?.weight_kg),
    ftpTests: (ftpTestRows ?? []) as FtpTestRow[],
    powerProfile: (powerRow ?? null) as PowerProfileRow | null,
    form,
  });
}
