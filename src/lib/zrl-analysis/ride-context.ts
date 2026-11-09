// Wat er rond de eigen rit bekend is, naast het bestand per seconde: de
// berekeningen van intervals.icu op de rit (FTP na de rit, decoupling,
// hartslagherstel, koolhydraten), vorm en wellness op de dag, de training die
// de race verving, en de groepjes aan de finish. Puur: geen I/O.

import { rideCarbsPerHour } from "@/lib/nutrition/targets";
import type { RideAnalysis } from "@/lib/zrl-analysis/ride";
import { finishGroups, type FinishGroup } from "@/lib/zrl-analysis/ride-story";
import type { IntervalsWellness } from "@/lib/intervals/client";

export type RideContext = {
  ftp: {
    profile: number | null;
    /** De FTP waarmee intervals.icu deze rit rekende. */
    used: number | null;
    /** De FTP die intervals.icu na deze rit schat, en hoeveel die steeg. */
    after: number | null;
    delta: number | null;
  };
  heart: {
    /** Decoupling van intervals.icu, in %. */
    decoupling: number | null;
    /** Hartslagherstel na de zwaarste inspanning. */
    recovery: { start: number; end: number; drop: number } | null;
    lthr: number | null;
  };
  form: {
    ctl: number | null;
    atl: number | null;
    tsb: number | null;
    hrv: number | null;
    restingHr: number | null;
    sleepHours: number | null;
    readiness: number | null;
    /** Gemiddelde van de vier weken ervoor, om mee te vergelijken. */
    usualHrv: number | null;
    usualRestingHr: number | null;
  } | null;
  planned: { name: string; compliance: number | null; plannedLoad: number | null; load: number | null } | null;
  fuel: {
    kjRace: number;
    kjRide: number | null;
    carbsUsed: number | null;
    minutes: number;
    /** Advies onderweg voor een rit van deze duur (ZWBeter voeden); null onder een uur. */
    perHour: { min: number; max: number } | null;
  };
  /**
   * De groepjes aan de finish: de kopgroep, de eigen groep en de dichtstbijzijnde
   * groep van minstens drie renners ervoor (een losse renner ertussen telt niet).
   */
  finish: { groups: FinishGroup[]; lead: FinishGroup; own: FinishGroup; ahead: FinishGroup | null; aheadCount: number } | null;
};

const num = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
};

const avg = (values: Array<number | null | undefined>) => {
  const list = values.filter((v): v is number => typeof v === "number" && v > 0);
  return list.length >= 5 ? Math.round(list.reduce((s, v) => s + v, 0) / list.length) : null;
};

/** Een groep voor je telt vanaf zoveel renners. */
const AHEAD_MIN_SIZE = 3;

export function rideContext(input: {
  /** De ruwe activiteit uit intervals.icu (de lijst geeft alle berekende velden mee). */
  activity: Record<string, unknown>;
  ride: RideAnalysis;
  profileFtp: number | null;
  /** Wellness, met de dag van de race als `raceDay` (YYYY-MM-DD). */
  wellness: IntervalsWellness[];
  raceDay: string;
  planned: { name?: string | null; icu_training_load?: number | null } | null;
  finishSeconds: number;
  results: Array<{ profileId: number; rank: number; durationMs: number | null }>;
  ownId: number;
}): RideContext {
  const a = input.activity;
  const used = num(a.icu_ftp);
  const after = num(a.icu_rolling_ftp) ?? num(a.icu_pm_ftp);
  const delta = num(a.icu_rolling_ftp_delta);
  const hrr = a.icu_hrr as { start_bpm?: unknown; end_bpm?: unknown; hrr?: unknown } | null | undefined;
  const recovery =
    hrr && num(hrr.start_bpm) && num(hrr.end_bpm)
      ? { start: num(hrr.start_bpm) as number, end: num(hrr.end_bpm) as number, drop: num(hrr.hrr) ?? (num(hrr.start_bpm) as number) - (num(hrr.end_bpm) as number) }
      : null;

  const day = input.wellness.find((w) => w.id === input.raceDay) ?? null;
  const earlier = input.wellness.filter((w) => w.id < input.raceDay);
  const ctl = num(a.icu_ctl) ?? num(day?.ctl);
  const atl = num(a.icu_atl) ?? num(day?.atl);
  const form =
    ctl !== null || day
      ? {
          ctl: ctl === null ? null : Math.round(ctl),
          atl: atl === null ? null : Math.round(atl),
          tsb: ctl !== null && atl !== null ? Math.round(ctl - atl) : null,
          hrv: num(day?.hrv),
          restingHr: num(day?.restingHR),
          sleepHours: num(day?.sleepSecs) ? Math.round(((day?.sleepSecs as number) / 3600) * 10) / 10 : null,
          readiness: num(day?.readiness),
          usualHrv: avg(earlier.map((w) => w.hrv)),
          usualRestingHr: avg(earlier.map((w) => w.restingHR)),
        }
      : null;

  const plannedName = input.planned?.name?.trim();
  const planned = plannedName
    ? {
        name: plannedName,
        compliance: num(a.compliance) === null ? null : Math.round(num(a.compliance) as number),
        plannedLoad: num(input.planned?.icu_training_load),
        load: num(a.icu_training_load),
      }
    : null;

  const minutes = Math.round(input.finishSeconds / 60);
  const joules = num(a.icu_joules) ?? num(a.joules);
  const fuel = {
    kjRace: input.ride.kilojoules,
    kjRide: joules === null ? null : Math.round(joules / 1000),
    carbsUsed: num(a.carbs_used),
    minutes,
    perHour: rideCarbsPerHour(minutes),
  };

  const groups = finishGroups(input.results, input.ownId);
  const ownIndex = groups.findIndex((g) => g.own);
  const finish =
    ownIndex >= 0
      ? {
          groups,
          lead: groups[0],
          own: groups[ownIndex],
          ahead: [...groups.slice(0, ownIndex)].reverse().find((g) => g.size >= AHEAD_MIN_SIZE) ?? null,
          aheadCount: groups.slice(0, ownIndex).reduce((s, g) => s + g.size, 0),
        }
      : null;

  return {
    ftp: { profile: input.profileFtp, used, after, delta: delta === 0 ? null : delta },
    heart: { decoupling: num(a.decoupling) === null ? null : Math.round((num(a.decoupling) as number) * 10) / 10, recovery, lthr: num(a.lthr) },
    form,
    planned,
    fuel,
    finish,
  };
}

// ---------------------------------------------------------------------------
// Klimmen tegenover eerdere keren (0321): dezelfde route, begin binnen 300 m en
// ongeveer evenveel hoogtemeters.

export type ClimbEffortRow = {
  zwift_event_id: number | string;
  climb_index: number;
  route_id: number | string | null;
  raced_at: string;
  start_km: number | string;
  gain_m: number;
  seconds: number;
  avg_watts: number;
  wkg: number | string | null;
};

export type ClimbHistory = {
  /** Naam van het stuk in deze race, bv. "Klim 2". */
  name: string;
  times: number;
  last: { racedAt: string; seconds: number; wkg: number | null; avgWatts: number } | null;
  best: { racedAt: string; seconds: number; wkg: number | null; avgWatts: number } | null;
};

const SAME_START_KM = 0.3;
const SAME_GAIN_SHARE = 0.25;

export function climbHistory(
  climbs: Array<{ name: string; startKm: number | null; gain: number | null }>,
  rows: ClimbEffortRow[],
  zwiftEventId: string,
  racedAt: string,
): ClimbHistory[] {
  return climbs.flatMap((climb) => {
    if (climb.startKm === null || climb.gain === null || climb.gain <= 0) return [];
    const gain = climb.gain;
    const startKm = climb.startKm;
    const same = rows
      .filter((r) => String(r.zwift_event_id) !== zwiftEventId && r.raced_at < racedAt)
      .filter((r) => Math.abs(Number(r.start_km) - startKm) <= SAME_START_KM && Math.abs(r.gain_m - gain) <= gain * SAME_GAIN_SHARE)
      .map((r) => ({ racedAt: r.raced_at, seconds: r.seconds, wkg: r.wkg === null ? null : Number(r.wkg), avgWatts: r.avg_watts }));
    if (same.length === 0) return [];
    const last = [...same].sort((a, b) => b.racedAt.localeCompare(a.racedAt))[0];
    const best = [...same].sort((a, b) => a.seconds - b.seconds)[0];
    return [{ name: climb.name, times: same.length, last, best }];
  });
}
