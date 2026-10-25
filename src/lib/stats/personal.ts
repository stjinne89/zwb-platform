// Eigen statistieken (/stats/ik): ritten per week, maand of jaar, vermogen door
// de tijd, records en fitheid.
//
// Alles komt uit strava_activities. Per rit staan daar alleen samenvattingen:
// gemiddeld en genormaliseerd vermogen, max-vermogen, kJ en hartslag. Geen
// streams en geen best efforts (die gooit de ingest weg), dus "vermogen door de
// tijd" is hier de NP van ritten met een echte meter. Piekvermogen per duur kan
// alleen via intervals.icu.
//
// Puur: geen React en geen Supabase, zodat de periodegrenzen in een test
// vastliggen.

import { isSameRide, SAME_START_MS } from "@/lib/rides/same-ride";
import type { FtpAt } from "@/lib/training/ftp-history";
import type { HrBasis } from "@/lib/training/hr-load";
import type { TrainingLoadPoint } from "@/lib/training/load-points";
import { rideMetricsFromStrava } from "@/lib/training/ride-metrics";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

export type Granularity = "week" | "maand" | "jaar";
export type RangeKey = "12m" | "2j" | "5j" | "alles";

export const GRANULARITIES: Array<{ key: Granularity; label: string }> = [
  { key: "week", label: "Week" },
  { key: "maand", label: "Maand" },
  { key: "jaar", label: "Jaar" },
];

export const RANGES: Array<{ key: RangeKey; label: string; months: number | null }> = [
  { key: "12m", label: "12 mnd", months: 12 },
  { key: "2j", label: "2 jaar", months: 24 },
  { key: "5j", label: "5 jaar", months: 60 },
  { key: "alles", label: "Alles", months: null },
];

export function parseGranularity(value: unknown): Granularity {
  return value === "week" || value === "jaar" ? value : "maand";
}

export function parseRange(value: unknown): RangeKey {
  return value === "2j" || value === "5j" || value === "alles" ? value : "12m";
}

/** Rijen zoals /stats/ik ze uit strava_activities leest (losse JSON-paden, geen polyline). */
export type PersonalRideRow = {
  id: number;
  name: string | null;
  sport_type: string | null;
  start_date: string;
  distance_m: number | string | null;
  total_elevation_gain_m: number | string | null;
  moving_time_seconds: number | string | null;
  average_watts?: unknown;
  weighted_average_watts?: unknown;
  device_watts?: unknown;
  max_watts?: unknown;
  kilojoules?: unknown;
  average_heartrate?: unknown;
  max_heartrate?: unknown;
  hr_load?: unknown;
};

export const PERSONAL_RIDE_COLUMNS = [
  "id",
  "name",
  "sport_type",
  "start_date",
  "distance_m",
  "total_elevation_gain_m",
  "moving_time_seconds",
  "average_watts:raw->average_watts",
  "weighted_average_watts:raw->weighted_average_watts",
  "device_watts:raw->device_watts",
  "max_watts:raw->max_watts",
  "kilojoules:raw->kilojoules",
  "average_heartrate:raw->average_heartrate",
  "max_heartrate:raw->max_heartrate",
  "hr_load:raw->hr_load",
].join(", ");

export type PersonalRide = {
  id: number;
  name: string | null;
  sportType: string | null;
  /** Kalenderdag in Amsterdam-tijd. */
  day: string;
  distanceKm: number;
  movingSeconds: number;
  elevationM: number;
  averageWatts: number | null;
  /** Alleen bij een echte vermogensmeter; Strava's schatting telt niet. */
  normalizedWatts: number | null;
  maxWatts: number | null;
  kilojoules: number | null;
  averageHr: number | null;
  maxHr: number | null;
  hasPowerMeter: boolean;
  tss: number | null;
  intensityFactor: number | null;
};

function amount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function hasPower(row: PersonalRideRow) {
  return row.device_watts === true && amount(row.average_watts) > 0;
}

/**
 * Dezelfde rit twee keer: een intervals-kopie (negatief id) naast de Strava-rit,
 * of een trainerbestand naast Zwift. De ingest houdt dat meestal tegen, maar niet
 * als een lid van bron wisselde; dan telde september 2026 ruim 300 km dubbel.
 * Zelfde start binnen twee minuten en afstand binnen 5% (isSameRide); de rit met
 * vermogen blijft, anders de eerste. Verwacht rijen op starttijd gesorteerd.
 */
export function dedupeRideRows<T extends PersonalRideRow>(rows: T[]): T[] {
  const kept: T[] = [];
  for (const row of rows) {
    const start = Date.parse(row.start_date);
    let twin = -1;
    for (let index = kept.length - 1; index >= 0; index -= 1) {
      if (start - Date.parse(kept[index].start_date) > SAME_START_MS) break;
      if (isSameRide(kept[index], row)) {
        twin = index;
        break;
      }
    }
    if (twin < 0) kept.push(row);
    else if (hasPower(row) && !hasPower(kept[twin])) kept[twin] = row;
  }
  return kept;
}

/** Leest de rijen in, met TSS en IF op de FTP die op de ritdag gold. */
export function personalRidesFromRows(
  rows: PersonalRideRow[],
  ftp: number | null | FtpAt,
  hr: HrBasis | null = null,
): PersonalRide[] {
  return rows.flatMap((row) => {
    const start = new Date(row.start_date);
    if (!Number.isFinite(start.getTime())) return [];
    const movingSeconds = amount(row.moving_time_seconds);
    const metrics = rideMetricsFromStrava(
      {
        start_date: row.start_date,
        average_watts: row.average_watts,
        weighted_average_watts: row.weighted_average_watts,
        device_watts: row.device_watts,
        max_watts: row.max_watts,
        kilojoules: row.kilojoules,
        average_heartrate: row.average_heartrate,
        max_heartrate: row.max_heartrate,
        hr_load: row.hr_load,
      },
      movingSeconds || null,
      ftp,
      hr,
    );
    return [
      {
        id: Number(row.id),
        name: row.name,
        sportType: row.sport_type,
        day: amsterdamDayKey(start),
        distanceKm: amount(row.distance_m) / 1000,
        movingSeconds,
        elevationM: amount(row.total_elevation_gain_m),
        averageWatts: metrics.averageWatts,
        normalizedWatts: metrics.normalizedWatts,
        maxWatts: metrics.maxWatts,
        kilojoules: metrics.kilojoules,
        averageHr: metrics.averageHr,
        maxHr: metrics.maxHr,
        hasPowerMeter: metrics.hasPowerMeter,
        tss: metrics.tss,
        intensityFactor: metrics.intensityFactor,
      },
    ];
  });
}

// ── Datums ────────────────────────────────────────────────────────────────

function parseDay(day: string) {
  return new Date(`${day}T12:00:00Z`);
}

function dayKeyOf(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, days: number) {
  const date = parseDay(day);
  date.setUTCDate(date.getUTCDate() + days);
  return dayKeyOf(date);
}

function addMonths(day: string, months: number) {
  const date = parseDay(day);
  const target = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(target, lastDay));
  return dayKeyOf(date);
}

export function mondayOf(day: string) {
  const date = parseDay(day);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return dayKeyOf(date);
}

/** Week: de maandag ("2026-10-12"). Maand: "2026-10". Jaar: "2026". */
export function bucketKey(day: string, per: Granularity) {
  if (per === "week") return mondayOf(day);
  if (per === "maand") return day.slice(0, 7);
  return day.slice(0, 4);
}

/** Eerste dag van een periode. */
export function bucketStart(key: string, per: Granularity) {
  if (per === "week") return key;
  if (per === "maand") return `${key}-01`;
  return `${key}-01-01`;
}

/** Laatste dag van een periode. */
export function bucketEnd(key: string, per: Granularity) {
  if (per === "week") return addDays(key, 6);
  if (per === "maand") return addDays(addMonths(`${key}-01`, 1), -1);
  return `${key}-12-31`;
}

function nextBucket(key: string, per: Granularity) {
  return bucketKey(addDays(bucketEnd(key, per), 1), per);
}

/** Alle periodes van start tot en met end, ook de lege. */
export function bucketsBetween(startDay: string, endDay: string, per: Granularity): string[] {
  if (startDay > endDay) return [];
  const keys: string[] = [];
  const last = bucketKey(endDay, per);
  for (let key = bucketKey(startDay, per); key <= last; key = nextBucket(key, per)) {
    keys.push(key);
    if (keys.length > 2000) break;
  }
  return keys;
}

const MONTHS_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/**
 * Kort label voor een as: "12 okt", "okt '26" of "2026". Een week krijgt het
 * jaar erbij als de reeks over een jaargrens loopt, anders staat "20 okt" er
 * twee keer.
 */
export function bucketLabel(key: string, per: Granularity, withYear = false) {
  if (per === "jaar") return key;
  if (per === "maand") {
    const [year, month] = key.split("-");
    return `${MONTHS_SHORT[Number(month) - 1]} '${year.slice(2)}`;
  }
  const date = parseDay(key);
  const label = `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}`;
  return withYear ? `${label} '${key.slice(2, 4)}` : label;
}

/** Label voor een tooltip: "week van 12 okt 2026", "oktober 2026" of "2026". */
export function bucketTitle(key: string, per: Granularity) {
  if (per === "jaar") return key;
  if (per === "maand") {
    return new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric", timeZone: "UTC" }).format(
      parseDay(`${key}-01`),
    );
  }
  const date = parseDay(key);
  return `week van ${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Het venster: het bereik terug vanaf vandaag, uitgelijnd op het begin van een
 * periode zodat de eerste staaf een hele week of maand is. 12 maanden per maand
 * zijn dus twaalf staven, deze maand meegeteld. Per jaar telt het jaar waarin het
 * bereik begint mee, anders is "12 mnd" één staaf. "Alles" begint bij de eerste
 * rit.
 */
export function windowFor(
  range: RangeKey,
  per: Granularity,
  today: string,
  firstRideDay: string | null,
): { start: string; end: string } {
  const months = RANGES.find((item) => item.key === range)?.months ?? null;
  if (months == null) {
    return { start: bucketStart(bucketKey(firstRideDay ?? today, per), per), end: today };
  }
  const back = addMonths(today, -months);
  const key = per === "jaar" ? bucketKey(addDays(back, 1), per) : nextBucket(bucketKey(back, per), per);
  return { start: bucketStart(key, per), end: today };
}

// ── Totalen ───────────────────────────────────────────────────────────────

export type Totals = {
  rides: number;
  km: number;
  hours: number;
  elevation: number;
  kilojoules: number;
  tss: number;
};

export const EMPTY_TOTALS: Totals = { rides: 0, km: 0, hours: 0, elevation: 0, kilojoules: 0, tss: 0 };


function addRide(totals: Totals, ride: PersonalRide) {
  totals.rides += 1;
  totals.km += ride.distanceKm;
  totals.hours += ride.movingSeconds / 3600;
  totals.elevation += ride.elevationM;
  totals.kilojoules += ride.kilojoules ?? 0;
  totals.tss += ride.tss ?? 0;
}

export function totalsBetween(rides: PersonalRide[], start: string, end: string): Totals {
  const totals = { ...EMPTY_TOTALS };
  for (const ride of rides) {
    if (ride.day >= start && ride.day <= end) addRide(totals, ride);
  }
  return totals;
}

/**
 * Dezelfde dag een jaar eerder. Per week 52 weken terug, zodat een week op
 * maandag blijft beginnen; anders twaalf maanden.
 */
export function yearEarlier(day: string, per: Granularity) {
  return per === "week" ? addDays(day, -364) : addMonths(day, -12);
}

/** Hetzelfde venster een jaar eerder, voor de vergelijking. */
export function previousYearWindow(start: string, end: string) {
  return { start: addMonths(start, -12), end: addMonths(end, -12) };
}

export type PeriodTotals = Totals & { key: string };

export function aggregate(rides: PersonalRide[], keys: string[], per: Granularity): PeriodTotals[] {
  const byKey = new Map(keys.map((key) => [key, { key, ...EMPTY_TOTALS }]));
  for (const ride of rides) {
    const entry = byKey.get(bucketKey(ride.day, per));
    if (entry) addRide(entry, ride);
  }
  return keys.map((key) => byKey.get(key)!);
}

// ── Vermogen ──────────────────────────────────────────────────────────────

/** Korter dan dit zegt de NP weinig over wat je kunt volhouden. */
export const POWER_MIN_SECONDS = 20 * 60;

/**
 * Boven deze IF is een rit van twintig minuten of langer een meetfout (een
 * trainer die verkeerd gekalibreerd was), geen prestatie: een uur op 1,05 is al
 * wereldtop. Zo'n rit stond als "Hoogste NP" bovenaan (382 W bij een FTP rond 280).
 */
export const MAX_PLAUSIBLE_IF = 1.2;

function countsForPower(ride: PersonalRide) {
  return (
    ride.hasPowerMeter &&
    ride.normalizedWatts != null &&
    ride.movingSeconds >= POWER_MIN_SECONDS &&
    (ride.intensityFactor == null || ride.intensityFactor <= MAX_PLAUSIBLE_IF)
  );
}

export type PowerPoint = {
  key: string;
  /** Hoogste NP van een rit in deze periode. */
  bestNp: number | null;
  /** NP gemiddeld over de ritten, gewogen naar rijtijd. */
  averageNp: number | null;
  /** FTP op de laatste dag van de periode. */
  ftp: number | null;
  rides: number;
};

export function powerTrend(
  rides: PersonalRide[],
  keys: string[],
  per: Granularity,
  ftpAt: FtpAt | null,
  today: string,
): PowerPoint[] {
  const byKey = new Map(
    keys.map((key) => [key, { best: 0, weighted: 0, seconds: 0, rides: 0 }]),
  );
  for (const ride of rides) {
    if (!countsForPower(ride)) continue;
    const entry = byKey.get(bucketKey(ride.day, per));
    if (!entry) continue;
    const np = ride.normalizedWatts!;
    entry.best = Math.max(entry.best, np);
    entry.weighted += np * ride.movingSeconds;
    entry.seconds += ride.movingSeconds;
    entry.rides += 1;
  }
  return keys.map((key) => {
    const entry = byKey.get(key)!;
    const end = bucketEnd(key, per);
    return {
      key,
      bestNp: entry.rides ? Math.round(entry.best) : null,
      averageNp: entry.seconds ? Math.round(entry.weighted / entry.seconds) : null,
      ftp: ftpAt ? ftpAt(end > today ? today : end) : null,
      rides: entry.rides,
    };
  });
}

export type EfficiencyPoint = { key: string; factor: number | null; rides: number };

/**
 * Duurritten: tot deze IF. Een race of intervaltraining heeft bij hetzelfde
 * hart een andere verhouding; die ritten mengen maakt van de lijn een maat voor
 * hoeveel je racete, niet voor je aerobe vorm. Zonder FTP (geen IF) telt de rit.
 */
export const EFFICIENCY_MAX_IF = 0.85;

/** Minder ritten in een periode is toeval; dan geen punt. */
export const EFFICIENCY_MIN_RIDES = 2;

/**
 * Efficiency factor: NP gedeeld door de gemiddelde hartslag, gewogen naar
 * rijtijd, over duurritten. Stijgt hij, dan trap je meer watt per slag.
 */
export function efficiencyTrend(rides: PersonalRide[], keys: string[], per: Granularity): EfficiencyPoint[] {
  const byKey = new Map(keys.map((key) => [key, { power: 0, heart: 0, rides: 0 }]));
  for (const ride of rides) {
    if (!countsForPower(ride) || ride.averageHr == null) continue;
    if (ride.intensityFactor != null && ride.intensityFactor > EFFICIENCY_MAX_IF) continue;
    const entry = byKey.get(bucketKey(ride.day, per));
    if (!entry) continue;
    entry.power += ride.normalizedWatts! * ride.movingSeconds;
    entry.heart += ride.averageHr * ride.movingSeconds;
    entry.rides += 1;
  }
  return keys.map((key) => {
    const entry = byKey.get(key)!;
    return {
      key,
      factor:
        entry.heart > 0 && entry.rides >= EFFICIENCY_MIN_RIDES
          ? Math.round((entry.power / entry.heart) * 100) / 100
          : null,
      rides: entry.rides,
    };
  });
}

// ── Fitheid ───────────────────────────────────────────────────────────────

/**
 * CTL en ATL uit de eigen TSS, voor wie geen intervals.icu heeft. Dezelfde
 * formule als intervals (exponentieel gemiddelde over 42 en 7 dagen), vanaf de
 * eerste rit. Ritten zonder meter hebben geen TSS en tellen dus niet mee.
 */
export function fitnessFromTss(
  rides: PersonalRide[],
  start: string,
  end: string,
): TrainingLoadPoint[] {
  const daily = new Map<string, number>();
  let first: string | null = null;
  for (const ride of rides) {
    if (ride.tss == null) continue;
    daily.set(ride.day, (daily.get(ride.day) ?? 0) + ride.tss);
    if (first == null || ride.day < first) first = ride.day;
  }
  if (first == null) return [];

  const points: TrainingLoadPoint[] = [];
  let ctl = 0;
  let atl = 0;
  for (let day = first; day <= end; day = addDays(day, 1)) {
    const load = daily.get(day) ?? 0;
    ctl += (load - ctl) / 42;
    atl += (load - atl) / 7;
    if (day >= start) {
      const roundedCtl = Math.round(ctl * 10) / 10;
      const roundedAtl = Math.round(atl * 10) / 10;
      points.push({
        date: day,
        load,
        ctl: roundedCtl,
        atl: roundedAtl,
        tsb: Math.round((roundedCtl - roundedAtl) * 10) / 10,
      });
    }
  }
  return points;
}

// ── Jaarvergelijking ──────────────────────────────────────────────────────

export type YearLine = {
  year: string;
  /** Cumulatieve km per week van het jaar (index 0 = eind week 1); null na vandaag. */
  weeks: Array<number | null>;
  total: number;
};

export const WEEKS_IN_YEAR = 53;

/** Cumulatieve km per jaar, gelijk opgelijnd op de dag van het jaar. */
export function yearCumulative(rides: PersonalRide[], years: string[], today: string): YearLine[] {
  return years.map((year) => {
    const perWeek = Array.from({ length: WEEKS_IN_YEAR }, () => 0);
    for (const ride of rides) {
      if (!ride.day.startsWith(year)) continue;
      const dayOfYear = Math.round(
        (parseDay(ride.day).getTime() - parseDay(`${year}-01-01`).getTime()) / 86_400_000,
      );
      perWeek[Math.min(WEEKS_IN_YEAR - 1, Math.floor(dayOfYear / 7))] += ride.distanceKm;
    }
    const todayIndex =
      today.startsWith(year)
        ? Math.floor(
            (parseDay(today).getTime() - parseDay(`${year}-01-01`).getTime()) / 86_400_000 / 7,
          )
        : year > today.slice(0, 4)
          ? -1
          : WEEKS_IN_YEAR - 1;
    let running = 0;
    const weeks = perWeek.map((km, index) => {
      running += km;
      return index <= todayIndex ? Math.round(running) : null;
    });
    return { year, weeks, total: Math.round(running) };
  });
}

// ── Kalender en reeksen ───────────────────────────────────────────────────

export type CalendarDay = { day: string; km: number; rides: number };

/** 53 weken tot en met vandaag, beginnend op een maandag. */
export function calendarDays(rides: PersonalRide[], today: string): CalendarDay[] {
  const start = addDays(mondayOf(today), -52 * 7);
  const byDay = new Map<string, CalendarDay>();
  for (const ride of rides) {
    if (ride.day < start || ride.day > today) continue;
    const entry = byDay.get(ride.day) ?? { day: ride.day, km: 0, rides: 0 };
    entry.km += ride.distanceKm;
    entry.rides += 1;
    byDay.set(ride.day, entry);
  }
  const days: CalendarDay[] = [];
  for (let day = start; day <= today; day = addDays(day, 1)) {
    days.push(byDay.get(day) ?? { day, km: 0, rides: 0 });
  }
  return days;
}

export type Streaks = {
  /** Weken op rij met minstens één rit, tot en met deze (of vorige) week. */
  currentWeeks: number;
  longestWeeks: number;
  /** Dagen op rij met een rit. */
  longestDays: number;
};

export function streaks(rides: PersonalRide[], today: string): Streaks {
  const weeks = new Set(rides.map((ride) => mondayOf(ride.day)));
  const days = [...new Set(rides.map((ride) => ride.day))].sort();

  let longestWeeks = 0;
  for (const week of weeks) {
    if (weeks.has(addDays(week, -7))) continue;
    let length = 0;
    for (let cursor = week; weeks.has(cursor); cursor = addDays(cursor, 7)) length += 1;
    longestWeeks = Math.max(longestWeeks, length);
  }

  // Een reeks loopt nog zolang deze week of vorige week een rit had: op maandag
  // ochtend is hij nog niet verbroken.
  let currentWeeks = 0;
  let cursor = mondayOf(today);
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  while (weeks.has(cursor)) {
    currentWeeks += 1;
    cursor = addDays(cursor, -7);
  }

  let longestDays = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of days) {
    run = previous != null && addDays(previous, 1) === day ? run + 1 : 1;
    longestDays = Math.max(longestDays, run);
    previous = day;
  }

  return { currentWeeks, longestWeeks, longestDays };
}

// ── Records ───────────────────────────────────────────────────────────────

export type RideRecord = { label: string; value: number; ride: PersonalRide };
export type PeriodRecord = { label: string; key: string; per: Granularity; km: number };

function maxBy(rides: PersonalRide[], value: (ride: PersonalRide) => number | null) {
  let best: PersonalRide | null = null;
  let bestValue = 0;
  for (const ride of rides) {
    const v = value(ride);
    if (v != null && v > bestValue) {
      best = ride;
      bestValue = v;
    }
  }
  return best ? { ride: best, value: bestValue } : null;
}

export function rideRecords(rides: PersonalRide[]): RideRecord[] {
  const candidates: Array<[string, (ride: PersonalRide) => number | null]> = [
    ["Langste rit (km)", (ride) => ride.distanceKm],
    ["Langste rit (tijd)", (ride) => ride.movingSeconds],
    ["Meeste hoogtemeters", (ride) => ride.elevationM],
    ["Hoogste NP (20 min+)", (ride) => (countsForPower(ride) ? ride.normalizedWatts : null)],
    ["Hoogste TSS", (ride) => ride.tss],
    ["Meeste kJ", (ride) => ride.kilojoules],
  ];
  return candidates.flatMap(([label, value]) => {
    const best = maxBy(rides, value);
    return best ? [{ label, value: best.value, ride: best.ride }] : [];
  });
}

export function periodRecords(rides: PersonalRide[]): PeriodRecord[] {
  const pers: Array<[string, Granularity]> = [
    ["Beste week", "week"],
    ["Beste maand", "maand"],
    ["Beste jaar", "jaar"],
  ];
  return pers.flatMap(([label, per]) => {
    const km = new Map<string, number>();
    for (const ride of rides) {
      const key = bucketKey(ride.day, per);
      km.set(key, (km.get(key) ?? 0) + ride.distanceKm);
    }
    let best: PeriodRecord | null = null;
    for (const [key, value] of km) {
      if (!best || value > best.km) best = { label, key, per, km: value };
    }
    return best && best.km > 0 ? [best] : [];
  });
}

// ── Disciplines ───────────────────────────────────────────────────────────

export type DisciplineTotals = Totals & { sportType: string };

export function byDiscipline(rides: PersonalRide[]): DisciplineTotals[] {
  const map = new Map<string, DisciplineTotals>();
  for (const ride of rides) {
    const sportType = ride.sportType ?? "Ride";
    const entry = map.get(sportType) ?? { sportType, ...EMPTY_TOTALS };
    addRide(entry, ride);
    map.set(sportType, entry);
  }
  return [...map.values()].sort((a, b) => b.hours - a.hours);
}
