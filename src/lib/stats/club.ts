// Clubstatistieken (/stats): dezelfde periodes, grafieken en tegels als
// Stats → Ik, maar opgeteld over alle leden.
//
// De ritten van de hele club zijn te veel om bij elke weergave op te halen
// (database op het gratis plan, egress telt). Daarom per kalenderjaar één
// samenvatting, gecachet: per maand en per week per lid en discipline (voor
// actieve leden, disciplines, regio's en de ranglijst), en per dag het
// clubtotaal (voor exacte vensters en de vergelijking met vorig jaar tot
// dezelfde dag). Een afgesloten jaar verandert nauwelijks; de loader ververst
// het daarom maar één keer per dag.
//
// Puur: de aanroeper haalt de ritten en profielen op.

import {
  addDays,
  bucketEnd,
  bucketKey,
  bucketStart,
  mondayOf,
  WEEKS_IN_YEAR,
  yearEarlier,
  type Granularity,
} from "@/lib/stats/personal";
import { isSameRide, SAME_START_MS } from "@/lib/rides/same-ride";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

export type ClubRideRow = {
  id: number | string;
  profile_id: string;
  start_date: string;
  sport_type: string | null;
  distance_m: number | string | null;
  total_elevation_gain_m: number | string | null;
  moving_time_seconds: number | string | null;
};

type Volume = { km: number; hours: number; elevation: number; rides: number };

/** Een lid in een discipline in een maand ("2026-10") of week (maandag). */
export type ClubCell = Volume & { key: string; profileId: string; sport: string };
/** Het clubtotaal van één dag (Amsterdam). */
export type ClubDay = Volume & { day: string };

export type ClubData = { months: ClubCell[]; weeks: ClubCell[]; days: ClubDay[] };

export const EMPTY_CLUB_DATA: ClubData = { months: [], weeks: [], days: [] };

function amount(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function addVolume(target: Volume, source: Volume) {
  target.km += source.km;
  target.hours += source.hours;
  target.elevation += source.elevation;
  target.rides += source.rides;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

function rounded<T extends Volume>(row: T): T {
  return { ...row, km: round1(row.km), hours: Math.round(row.hours * 100) / 100, elevation: Math.round(row.elevation) };
}

/**
 * Ritten van een jaar naar de drie samenvattingen. Dezelfde rit van één lid uit
 * twee bronnen telt één keer (zie dedupeRideRows in personal.ts); de rijen komen
 * op starttijd binnen.
 */
export function summarizeClubRides(rows: ClubRideRow[]): ClubData {
  const months = new Map<string, ClubCell>();
  const weeks = new Map<string, ClubCell>();
  const days = new Map<string, ClubDay>();
  const recent = new Map<string, ClubRideRow[]>();
  for (const row of rows) {
    const start = new Date(row.start_date);
    if (!Number.isFinite(start.getTime()) || !row.profile_id) continue;
    const own = (recent.get(row.profile_id) ?? []).filter(
      (other) => start.getTime() - Date.parse(other.start_date) <= SAME_START_MS,
    );
    if (own.some((other) => isSameRide(other, row))) continue;
    recent.set(row.profile_id, [...own, row]);
    const day = amsterdamDayKey(start);
    const sport = row.sport_type ?? "Ride";
    const ride: Volume = {
      km: amount(row.distance_m) / 1000,
      hours: amount(row.moving_time_seconds) / 3600,
      elevation: amount(row.total_elevation_gain_m),
      rides: 1,
    };
    for (const [map, key] of [
      [months, day.slice(0, 7)],
      [weeks, mondayOf(day)],
    ] as const) {
      const id = `${key}|${row.profile_id}|${sport}`;
      const cell = map.get(id) ?? { key, profileId: row.profile_id, sport, km: 0, hours: 0, elevation: 0, rides: 0 };
      addVolume(cell, ride);
      map.set(id, cell);
    }
    const total = days.get(day) ?? { day, km: 0, hours: 0, elevation: 0, rides: 0 };
    addVolume(total, ride);
    days.set(day, total);
  }
  return {
    months: [...months.values()].map(rounded),
    weeks: [...weeks.values()].map(rounded),
    days: [...days.values()].map(rounded),
  };
}

/**
 * Jaren samenvoegen. Een week over de jaargrens (en een rit vlak voor
 * middernacht UTC op oudjaar) staat in beide jaren; die cellen tellen op.
 */
export function mergeClubData(parts: ClubData[]): ClubData {
  const merge = <T extends Volume>(rows: T[], id: (row: T) => string) => {
    const map = new Map<string, T>();
    for (const row of rows) {
      const existing = map.get(id(row));
      if (existing) addVolume(existing, row);
      else map.set(id(row), { ...row });
    }
    return [...map.values()];
  };
  return {
    months: merge(parts.flatMap((part) => part.months), (cell) => `${cell.key}|${cell.profileId}|${cell.sport}`),
    weeks: merge(parts.flatMap((part) => part.weeks), (cell) => `${cell.key}|${cell.profileId}|${cell.sport}`),
    days: merge(parts.flatMap((part) => part.days), (row) => row.day),
  };
}

/** De cellen die bij deze periodegrootte horen: weken per week, anders maanden. */
function cellsFor(data: ClubData, per: Granularity) {
  return per === "week" ? data.weeks : data.months;
}

/** De periode van een cel: een maand telt bij zijn jaar. */
function cellBucket(cell: ClubCell, per: Granularity) {
  return per === "jaar" ? cell.key.slice(0, 4) : cell.key;
}

export type ClubTotals = Volume & { members: number };

const EMPTY: ClubTotals = { km: 0, hours: 0, elevation: 0, rides: 0, members: 0 };

/**
 * Volume tussen twee dagen uit de dagtotalen, plus de leden uit de cellen. Het
 * venster begint op een periodegrens (windowFor), dus een cel valt er helemaal
 * in of helemaal buiten.
 */
export function clubTotals(data: ClubData, start: string, end: string, per: Granularity): ClubTotals {
  const totals = { ...EMPTY };
  for (const day of data.days) if (day.day >= start && day.day <= end) addVolume(totals, day);
  const members = new Set<string>();
  for (const cell of cellsFor(data, per)) {
    const first = per === "week" ? cell.key : `${cell.key}-01`;
    if (first >= start && first <= end) members.add(cell.profileId);
  }
  totals.members = members.size;
  return totals;
}

export type ClubPeriod = ClubTotals & { key: string };

/** Per periode het clubvolume en het aantal leden dat reed. */
export function clubSeries(data: ClubData, keys: string[], per: Granularity): ClubPeriod[] {
  const known = new Set(keys);
  const byKey = new Map(keys.map((key) => [key, { ...EMPTY, key, ids: new Set<string>() }]));
  for (const cell of cellsFor(data, per)) {
    const key = cellBucket(cell, per);
    if (!known.has(key)) continue;
    const entry = byKey.get(key)!;
    addVolume(entry, cell);
    entry.ids.add(cell.profileId);
  }
  return keys.map((key) => {
    const { ids, ...entry } = byKey.get(key)!;
    return { ...entry, members: ids.size };
  });
}

/**
 * Dezelfde periodes een jaar eerder. De lopende periode tot dezelfde dag, uit de
 * dagtotalen; leden zijn daar niet per dag bekend en blijven leeg.
 */
export function clubPreviousYear(
  data: ClubData,
  keys: string[],
  per: Granularity,
  today: string,
): Array<ClubTotals | null> {
  const previousKeys = keys.map((key) => bucketKey(yearEarlier(bucketStart(key, per), per), per));
  const series = clubSeries(data, previousKeys, per);
  return keys.map((key, index) => {
    if (bucketEnd(key, per) > today) {
      const start = yearEarlier(bucketStart(key, per), per);
      const totals = { ...EMPTY };
      for (const day of data.days) {
        if (day.day >= start && day.day <= yearEarlier(today, per)) addVolume(totals, day);
      }
      // Leden staan niet per dag in de samenvatting; de hele maand van vorig jaar
      // naast een halve maand nu zou altijd een daling tonen. Dus leeg.
      return totals.rides > 0 ? { ...totals, members: 0 } : null;
    }
    return series[index].rides > 0 ? series[index] : null;
  });
}

/** Cumulatieve club-km per week van het jaar, één lijn per jaar. */
export function clubYearLines(data: ClubData, years: string[], today: string) {
  return years.map((year) => {
    const perWeek = Array.from({ length: WEEKS_IN_YEAR }, () => 0);
    const startMs = Date.parse(`${year}-01-01T12:00:00Z`);
    for (const day of data.days) {
      if (!day.day.startsWith(year)) continue;
      const index = Math.min(WEEKS_IN_YEAR - 1, Math.floor((Date.parse(`${day.day}T12:00:00Z`) - startMs) / 86_400_000 / 7));
      perWeek[index] += day.km;
    }
    const todayIndex = today.startsWith(year)
      ? Math.floor((Date.parse(`${today}T12:00:00Z`) - startMs) / 86_400_000 / 7)
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

/** Cellen binnen een venster, of binnen één gekozen periode. */
export function cellsInScope(
  data: ClubData,
  per: Granularity,
  span: { start: string; end: string },
  period: string | null,
): ClubCell[] {
  return cellsFor(data, per).filter((cell) => {
    const bucket = cellBucket(cell, per);
    if (period) return bucket === period;
    const first = per === "week" ? cell.key : `${cell.key}-01`;
    return first >= span.start && first <= span.end;
  });
}

export type GroupTotals = ClubTotals & { id: string };

function groupBy(cells: ClubCell[], id: (cell: ClubCell) => string): GroupTotals[] {
  const map = new Map<string, GroupTotals & { ids: Set<string> }>();
  for (const cell of cells) {
    const key = id(cell);
    const entry = map.get(key) ?? { ...EMPTY, id: key, ids: new Set<string>() };
    addVolume(entry, cell);
    entry.ids.add(cell.profileId);
    map.set(key, entry);
  }
  return [...map.values()].map(({ ids, ...entry }) => ({ ...entry, members: ids.size }));
}

export function clubByDiscipline(cells: ClubCell[]) {
  return groupBy(cells, (cell) => cell.sport).sort((a, b) => b.hours - a.hours);
}

export const UNKNOWN_REGION = "Onbekend";

/** Per regio, meeste km eerst; leden zonder regio onderaan, ook als dat de grootste groep is. */
export function clubByRegion(cells: ClubCell[], regionOf: (profileId: string) => string | null) {
  return groupBy(cells, (cell) => (regionOf(cell.profileId) ?? "").trim() || UNKNOWN_REGION).sort(
    (a, b) => Number(a.id === UNKNOWN_REGION) - Number(b.id === UNKNOWN_REGION) || b.km - a.km,
  );
}

export function clubByRider(cells: ClubCell[]) {
  return groupBy(cells, (cell) => cell.profileId).sort((a, b) => b.km - a.km);
}

export type ClubRecord = { label: string; key: string; per: Granularity; value: number; unit: "km" | "leden" };

/** De beste week, maand en jaar van de club, en de maand met de meeste rijders. */
export function clubRecords(data: ClubData): ClubRecord[] {
  const best = (rows: ClubPeriod[], label: string, per: Granularity, pick: (row: ClubPeriod) => number, unit: ClubRecord["unit"]) => {
    let top: ClubPeriod | null = null;
    for (const row of rows) if (!top || pick(row) > pick(top)) top = row;
    return top && pick(top) > 0 ? [{ label, key: top.key, per, value: pick(top), unit }] : [];
  };
  const keysOf = (cells: ClubCell[], per: Granularity) => [...new Set(cells.map((cell) => cellBucket(cell, per)))];
  const weeks = clubSeries(data, keysOf(data.weeks, "week"), "week");
  const months = clubSeries(data, keysOf(data.months, "maand"), "maand");
  const years = clubSeries(data, keysOf(data.months, "jaar"), "jaar");
  return [
    ...best(weeks, "Beste week", "week", (row) => row.km, "km"),
    ...best(months, "Beste maand", "maand", (row) => row.km, "km"),
    ...best(years, "Beste jaar", "jaar", (row) => row.km, "km"),
    ...best(months, "Meeste rijders in een maand", "maand", (row) => row.members, "leden"),
  ];
}

/** De jaren die een venster plus de vergelijking met vorig jaar nodig heeft. */
export function yearsNeeded(start: string, today: string): string[] {
  const from = Number(addDays(start, -366).slice(0, 4));
  const to = Number(today.slice(0, 4));
  return Array.from({ length: to - from + 1 }, (_, index) => String(from + index));
}
