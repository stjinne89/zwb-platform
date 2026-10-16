// Cijfers per periode uit intervals.icu-activiteiten, voor /stats/ik: tijd per
// vermogens- en hartslagzone, hoe diep je W′ leegtrok, arbeid boven FTP, en
// duurvermogen (decoupling en efficiency factor).
//
// Deze velden rekent intervals uit de meting zelf, dus alleen voor ritten die
// rechtstreeks in intervals staan (Garmin, Wahoo, Zwift). Een rit die via Strava
// binnenkwam is daar een stub zonder deze velden; die telt hier niet mee. De
// tegels tonen daarom hoeveel ritten meetellen.
//
// We bewaren niets per rit: de loader rekent bij het ophalen alles om naar
// totalen per periode, en alleen die gaan de cache in.
//
// Puur, zodat de vorm van de intervals-velden in een test vastligt.

export type ActivitySummary = {
  day: string;
  movingSeconds: number;
  /** Seconden per vermogenszone (Z1, Z2, …), zonder sweetspot: die overlapt Z3/Z4. */
  powerZones: Array<{ id: string; seconds: number }>;
  hrZones: number[];
  /** Diepste W′bal-uitputting in de rit, in kJ. */
  wbalDepletionKj: number | null;
  joulesAboveFtpKj: number | null;
  /** Ontkoppeling vermogen en hartslag in procenten. */
  decoupling: number | null;
  efficiencyFactor: number | null;
  polarization: number | null;
};

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function positive(value: unknown): number | null {
  const n = num(value);
  return n != null && n > 0 ? n : null;
}

/**
 * `icu_zone_times` komt als [{ id: "Z1", secs: 1200 }, …, { id: "SS", … }].
 * Een kale lijst getallen kan ook (zoals `icu_hr_zone_times`); dan nummeren we
 * zelf.
 */
export function parseZoneTimes(value: unknown): Array<{ id: string; seconds: number }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (typeof item === "number" || typeof item === "string") {
      const seconds = num(item);
      return seconds != null && seconds >= 0 ? [{ id: `Z${index + 1}`, seconds }] : [];
    }
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" && row.id ? row.id : `Z${index + 1}`;
    const seconds = num(row.secs ?? row.seconds ?? row.time);
    if (seconds == null || seconds < 0 || id.toUpperCase() === "SS") return [];
    return [{ id, seconds }];
  });
}

/** Null voor een rit zonder meting (een Strava-stub) of een andere sport. */
export function summarizeIntervalsActivity(raw: unknown): ActivitySummary | null {
  if (!raw || typeof raw !== "object") return null;
  const activity = raw as Record<string, unknown>;
  if (!/ride|cycling|bike/i.test(String(activity.type ?? ""))) return null;
  const day = String(activity.start_date_local ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;

  const powerZones = parseZoneTimes(activity.icu_zone_times);
  const hrZones = parseZoneTimes(activity.icu_hr_zone_times).map((zone) => zone.seconds);
  const wbal = positive(activity.icu_max_wbal_depletion);
  const aboveFtp = positive(activity.icu_joules_above_ftp);
  const summary: ActivitySummary = {
    day,
    movingSeconds: positive(activity.moving_time) ?? 0,
    powerZones,
    hrZones,
    wbalDepletionKj: wbal != null ? Math.round(wbal / 100) / 10 : null,
    joulesAboveFtpKj: aboveFtp != null ? Math.round(aboveFtp / 100) / 10 : null,
    decoupling: num(activity.decoupling),
    efficiencyFactor: positive(activity.icu_efficiency_factor),
    polarization: num(activity.polarization_index),
  };
  const measured =
    powerZones.length > 0 ||
    hrZones.length > 0 ||
    summary.wbalDepletionKj != null ||
    summary.efficiencyFactor != null;
  return measured ? summary : null;
}

/** Decoupling zegt pas iets over een lange, rustige rit. */
export const DECOUPLING_MIN_SECONDS = 90 * 60;

export type ActivityPeriod = {
  key: string;
  /** Ritten met meting in deze periode. */
  rides: number;
  /** Uren per vermogenszone, in de volgorde van `powerZoneIds`. */
  powerZoneHours: number[];
  hrZoneHours: number[];
  polarization: number | null;
  maxWbalDepletionKj: number | null;
  joulesAboveFtpKj: number;
  decoupling: number | null;
  efficiencyFactor: number | null;
};

export type ActivityStats = {
  powerZoneIds: string[];
  hrZoneCount: number;
  periods: ActivityPeriod[];
  /** Ritten met meting in het hele venster. */
  rides: number;
};

function zoneOrder(a: string, b: string) {
  const na = Number(a.replace(/\D/g, ""));
  const nb = Number(b.replace(/\D/g, ""));
  return na - nb || a.localeCompare(b);
}

const hours = (seconds: number) => Math.round((seconds / 3600) * 10) / 10;

export function aggregateActivities(
  summaries: ActivitySummary[],
  keys: string[],
  keyOf: (day: string) => string,
): ActivityStats {
  const zoneIds = [...new Set(summaries.flatMap((s) => s.powerZones.map((zone) => zone.id)))].sort(zoneOrder);
  const hrZoneCount = Math.max(0, ...summaries.map((s) => s.hrZones.length));
  const known = new Set(keys);
  const byKey = new Map(
    keys.map((key) => [
      key,
      {
        rides: 0,
        power: zoneIds.map(() => 0),
        hr: Array.from({ length: hrZoneCount }, () => 0),
        polarization: [] as number[],
        wbal: null as number | null,
        aboveFtp: 0,
        decoupling: [] as Array<[number, number]>,
        ef: [] as Array<[number, number]>,
      },
    ]),
  );
  let rides = 0;
  for (const summary of summaries) {
    const key = keyOf(summary.day);
    if (!known.has(key)) continue;
    const entry = byKey.get(key)!;
    entry.rides += 1;
    rides += 1;
    for (const zone of summary.powerZones) entry.power[zoneIds.indexOf(zone.id)] += zone.seconds;
    summary.hrZones.forEach((seconds, index) => (entry.hr[index] += seconds));
    if (summary.polarization != null) entry.polarization.push(summary.polarization);
    if (summary.wbalDepletionKj != null) entry.wbal = Math.max(entry.wbal ?? 0, summary.wbalDepletionKj);
    entry.aboveFtp += summary.joulesAboveFtpKj ?? 0;
    if (summary.decoupling != null && summary.movingSeconds >= DECOUPLING_MIN_SECONDS) {
      entry.decoupling.push([summary.decoupling, summary.movingSeconds]);
    }
    if (summary.efficiencyFactor != null) entry.ef.push([summary.efficiencyFactor, summary.movingSeconds || 1]);
  }
  const weighted = (pairs: Array<[number, number]>, digits: number) => {
    const weight = pairs.reduce((sum, [, w]) => sum + w, 0);
    if (!weight) return null;
    const factor = 10 ** digits;
    return Math.round((pairs.reduce((sum, [v, w]) => sum + v * w, 0) / weight) * factor) / factor;
  };
  return {
    powerZoneIds: zoneIds,
    hrZoneCount,
    rides,
    periods: keys.map((key) => {
      const entry = byKey.get(key)!;
      return {
        key,
        rides: entry.rides,
        powerZoneHours: entry.power.map(hours),
        hrZoneHours: entry.hr.map(hours),
        polarization: entry.polarization.length
          ? Math.round((entry.polarization.reduce((a, b) => a + b, 0) / entry.polarization.length) * 100) / 100
          : null,
        maxWbalDepletionKj: entry.wbal,
        joulesAboveFtpKj: Math.round(entry.aboveFtp),
        decoupling: weighted(entry.decoupling, 1),
        efficiencyFactor: weighted(entry.ef, 2),
      };
    }),
  };
}

export type RecoveryPoint = {
  key: string;
  restingHr: number | null;
  hrv: number | null;
  sleepHours: number | null;
};

/** Gemiddelde rust-HR, HRV en slaap per periode, over de dagen met een meting. */
export function recoverySeries(
  keys: string[],
  wellness: Array<{ id: string; restingHR?: number | null; hrv?: number | null; sleepSecs?: number | null }>,
  keyOf: (day: string) => string,
): RecoveryPoint[] {
  const sums = new Map(keys.map((key) => [key, { hr: [0, 0], hrv: [0, 0], sleep: [0, 0] }]));
  const add = (pair: number[], value: number | null | undefined, min: number, max: number) => {
    const n = Number(value);
    if (value == null || !Number.isFinite(n) || n < min || n > max) return;
    pair[0] += n;
    pair[1] += 1;
  };
  for (const row of wellness) {
    const entry = sums.get(keyOf(row.id));
    if (!entry) continue;
    add(entry.hr, row.restingHR, 25, 120);
    add(entry.hrv, row.hrv, 5, 300);
    add(entry.sleep, row.sleepSecs, 3600, 16 * 3600);
  }
  const mean = ([sum, count]: number[], digits: number) =>
    count ? Math.round((sum / count) * 10 ** digits) / 10 ** digits : null;
  return keys.map((key) => {
    const entry = sums.get(key)!;
    const sleep = mean(entry.sleep, 0);
    return {
      key,
      restingHr: mean(entry.hr, 1),
      hrv: mean(entry.hrv, 1),
      sleepHours: sleep != null ? Math.round((sleep / 3600) * 10) / 10 : null,
    };
  });
}
