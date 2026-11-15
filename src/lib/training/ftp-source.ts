import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntervalsAthlete } from "@/lib/intervals/client";
import { rideSportSettings } from "@/lib/intervals/client";

/**
 * Welke FTP leidend is: de nieuwste van de FTP-test en de ingestelde FTP in
 * intervals.icu, daarna de eFTP en het profiel.
 *
 * Tot november 2026 ging een test altijd voor. Maar wie na een test beter wordt
 * en de FTP in intervals.icu ophoogt, bleef dan op de oude testwaarde staan.
 * Andersom neemt intervals.icu een testuitslag niet vanzelf over: in productie
 * stond bij zeven van de elf leden met een test de Intervals-FTP daarna nog op
 * het oude getal. Daarom wint intervals.icu alleen als de FTP daar ná de test is
 * aangepast.
 *
 * De eFTP doet bewust niet mee: intervals.icu rekent hem bij elke rit opnieuw
 * uit, dus hij zou altijd de nieuwste zijn. Hij blijft terugval en signaal.
 */

/** Een rit zoals hij in `intervals_activities` staat. */
export type FtpRide = {
  date: string;
  type: string | null;
  /** De FTP waarmee intervals.icu deze rit rekende (`icu_ftp`). */
  ftpWatts: number | null;
};

/** Welke ritten met de ingestelde FTP zijn gerekend. */
export type IntervalsFtpRides = "all" | "outdoor" | "indoor";

export type IntervalsFtpSetting = {
  ftpWatts: number;
  /**
   * Ritten waarmee intervals.icu deze FTP gebruikt. Met een aparte binnen-FTP
   * rekenen Zwift-ritten met die waarde en zeggen ze niets over de buiten-FTP.
   */
  rides: IntervalsFtpRides;
  /** Ritsoorten van deze instelling; leeg betekent elke fietsrit. */
  types: string[];
};

export type FtpSource = "test" | "intervals" | "eftp" | "profile";

export type PickedFtp = {
  ftpWatts: number | null;
  source: FtpSource | null;
  /** Bij een test of een Intervals-FTP die erna is aangepast: de testdatum. */
  testedOn: string | null;
};

function positive(value: unknown) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * De ingestelde FTP in intervals.icu, met de ritten die ermee gerekend zijn.
 * Zelfde volgorde als `athletePhysique()`: buiten-FTP, dan binnen-FTP, dan de
 * FTP op het athlete-niveau.
 */
export function intervalsFtpSetting(athlete: IntervalsAthlete | null): IntervalsFtpSetting | null {
  const settings = rideSportSettings(athlete);
  const types = settings?.types ?? [];
  const ftp = positive(settings?.ftp);
  const indoor = positive(settings?.indoor_ftp);
  if (ftp) {
    return { ftpWatts: ftp, rides: indoor && indoor !== ftp ? "outdoor" : "all", types };
  }
  if (indoor) return { ftpWatts: indoor, rides: "indoor", types };
  const athleteFtp = positive(athlete?.ftp);
  return athleteFtp ? { ftpWatts: athleteFtp, rides: "all", types } : null;
}

function followsSetting(ride: FtpRide, setting: IntervalsFtpSetting) {
  const type = ride.type ?? "";
  const isRide = setting.types.length > 0 ? setting.types.includes(type) : /ride/i.test(type);
  if (!isRide) return false;
  const indoor = type === "VirtualRide";
  if (setting.rides === "outdoor") return !indoor;
  if (setting.rides === "indoor") return indoor;
  return true;
}

/**
 * Is de FTP in intervals.icu aangepast op of na `since`?
 *
 * intervals.icu bewaart bij elke rit de FTP waarmee hij rekende. Dat telt
 * alleen als een wijziging wanneer de ritten vanaf die dag de overgang laten
 * zien: eerst een rit met een ander getal, daarna een rit met de huidige
 * instelling. Een rit met alleen een afwijkend getal is geen bewijs. In
 * productie rekenden bij drie leden alle Zwift-ritten met een ander getal dan
 * de buiten-FTP (één keer 222 tegen 125), en zonder deze eis was het profiel
 * van zo'n lid op 125 gezet. Een wijziging na de laatste rit telt daardoor pas
 * vanaf de eerste rit met het nieuwe getal.
 */
export function intervalsFtpChangedSince(
  rides: FtpRide[],
  setting: IntervalsFtpSetting,
  since: string,
): boolean {
  const current = Math.round(setting.ftpWatts);
  const ftps = rides
    .filter((ride) => ride.date.slice(0, 10) >= since && followsSetting(ride, setting))
    .flatMap((ride) => {
      const ftp = positive(ride.ftpWatts);
      return ftp == null ? [] : [{ date: ride.date.slice(0, 10), ftp: Math.round(ftp) }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const firstOther = ftps.findIndex((ride) => ride.ftp !== current);
  return firstOther >= 0 && ftps.slice(firstOther + 1).some((ride) => ride.ftp === current);
}

export function pickFtp(input: {
  test: { ftpWatts: number; testedOn: string } | null;
  intervals: IntervalsFtpSetting | null;
  /** Ritten vanaf de testdatum; alleen nodig met een test én een Intervals-FTP. */
  rides: FtpRide[];
  eftpWatts: number | null;
  profileFtpWatts: number | null;
}): PickedFtp {
  const { test, intervals, rides } = input;
  const testFtp = test ? positive(test.ftpWatts) : null;
  if (test && testFtp) {
    const intervalsNewer =
      intervals != null && intervalsFtpChangedSince(rides, intervals, test.testedOn);
    return intervalsNewer
      ? { ftpWatts: intervals.ftpWatts, source: "intervals", testedOn: test.testedOn }
      : { ftpWatts: testFtp, source: "test", testedOn: test.testedOn };
  }
  if (intervals) return { ftpWatts: intervals.ftpWatts, source: "intervals", testedOn: null };
  const eftp = positive(input.eftpWatts);
  if (eftp) return { ftpWatts: eftp, source: "eftp", testedOn: null };
  const profile = positive(input.profileFtpWatts);
  if (profile) return { ftpWatts: profile, source: "profile", testedOn: null };
  return { ftpWatts: null, source: null, testedOn: null };
}

/** De ritten met een FTP vanaf een datum, voor `pickFtp()`. Een fout geeft een lege lijst. */
export async function loadFtpRidesSince(
  client: SupabaseClient,
  profileId: string,
  since: string,
): Promise<FtpRide[]> {
  try {
    const { data, error } = await client
      .from("intervals_activities")
      .select("start_date_local, type, ftp_watts")
      .eq("profile_id", profileId)
      .gte("start_date_local", since)
      .not("ftp_watts", "is", null);
    if (error || !data) return [];
    return (data as { start_date_local: string; type: string | null; ftp_watts: unknown }[]).map(
      (row) => ({
        date: String(row.start_date_local).slice(0, 10),
        type: row.type ?? null,
        ftpWatts: positive(row.ftp_watts),
      }),
    );
  } catch {
    return [];
  }
}
