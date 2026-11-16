// Eén regel per week onder de maandkalender: wat er gereden is tegenover wat er
// gepland stond, en hoeveel de CTL in die week veranderde.
//
// Gereden telt zoals de weektabel op Belasting (rideLoadRows + weeklyLoad), zodat
// beide schermen hetzelfde getal tonen. Gepland is de duur van elke training die
// niet is overgeslagen, en de geschatte TSS van de ZWB-trainingen. Een training
// die het lid buiten ZWB om in intervals.icu zette telt alleen met zijn duur
// mee: daarvan is de belasting niet bekend.

import { ctlChangeFor, mondayOf, type WeeklyCtlPoint } from "@/lib/training/ride-metrics";

export type WeekStat = {
  /** Maandag van de week, als datumsleutel. */
  weekStart: string;
  doneMinutes: number;
  doneLoad: number;
  plannedMinutes: number;
  /** Null als er in die week niets met een bekende belasting gepland stond. */
  plannedLoad: number | null;
  ctlChange: number | null;
};

export type WeekStatRide = {
  start_date_local: string;
  moving_time_seconds: number | null;
  training_load: number | null;
};

export type WeekStatPlanned = {
  dateKey: string;
  minutes: number | null;
  /** Null voor een training waarvan de belasting niet bekend is. */
  load: number | null;
};

export function weekStats({
  rides,
  planned,
  ctlPoints = [],
  from,
}: {
  rides: WeekStatRide[];
  planned: WeekStatPlanned[];
  ctlPoints?: WeeklyCtlPoint[];
  /**
   * Eerste maandag waarvoor de ritten compleet zijn. Een eerdere week zou een
   * planning tonen tegenover nul gereden, alleen omdat de ritten niet zijn opgehaald.
   */
  from?: string;
}): Record<string, WeekStat> {
  const weeks = new Map<string, WeekStat>();
  const entry = (dateKey: string) => {
    const weekStart = mondayOf(dateKey);
    let week = weeks.get(weekStart);
    if (!week) {
      week = {
        weekStart,
        doneMinutes: 0,
        doneLoad: 0,
        plannedMinutes: 0,
        plannedLoad: null,
        ctlChange: null,
      };
      weeks.set(weekStart, week);
    }
    return week;
  };

  for (const ride of rides) {
    const week = entry(ride.start_date_local);
    week.doneMinutes += Number(ride.moving_time_seconds ?? 0) / 60;
    week.doneLoad += Number(ride.training_load ?? 0);
  }
  for (const item of planned) {
    const week = entry(item.dateKey);
    week.plannedMinutes += Number(item.minutes ?? 0);
    if (item.load != null && Number.isFinite(item.load)) {
      week.plannedLoad = (week.plannedLoad ?? 0) + item.load;
    }
  }

  const ctl = [...ctlPoints].sort((a, b) => a.date.localeCompare(b.date));
  const result: Record<string, WeekStat> = {};
  for (const week of weeks.values()) {
    if (from && week.weekStart < from) continue;
    result[week.weekStart] = {
      ...week,
      doneMinutes: Math.round(week.doneMinutes),
      doneLoad: Math.round(week.doneLoad),
      plannedMinutes: Math.round(week.plannedMinutes),
      plannedLoad: week.plannedLoad == null ? null : Math.round(week.plannedLoad),
      ctlChange: ctlChangeFor(week.weekStart, ctl),
    };
  }
  return result;
}

function hours(minutes: number) {
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function signed(value: number) {
  const text = Math.abs(value).toLocaleString("nl-NL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${value < 0 ? "−" : "+"}${text}`;
}

/**
 * De tekst van de weekregel, in een lange vorm en een korte voor een telefoon.
 * Een week die nog moet beginnen toont alleen de planning; een voorbije week
 * zonder planning alleen wat er gereden is. Null als er niets te melden valt.
 */
export function weekStatLabel(
  week: WeekStat | undefined,
  todayKey: string,
): { long: string; short: string } | null {
  if (!week) return null;
  const future = week.weekStart > todayKey;
  const hasPlan = week.plannedMinutes > 0 || week.plannedLoad != null;
  const hasDone = week.doneMinutes > 0 || week.doneLoad > 0;

  if (future) {
    if (!hasPlan) return null;
    const load = week.plannedLoad == null ? "" : ` · TSS ${week.plannedLoad}`;
    const shortLoad = week.plannedLoad == null ? "" : ` · ${week.plannedLoad}`;
    return {
      long: `Gepland ${hours(week.plannedMinutes)} u${load}`,
      short: `Gepland ${hours(week.plannedMinutes)} u${shortLoad}`,
    };
  }
  if (!hasPlan && !hasDone) return null;

  const ctl = week.ctlChange == null ? "" : ` · CTL ${signed(week.ctlChange)}`;
  if (!hasPlan) {
    return {
      long: `${hours(week.doneMinutes)} u · TSS ${week.doneLoad}${ctl}`,
      short: `${hours(week.doneMinutes)} u · ${week.doneLoad}`,
    };
  }
  const load =
    week.plannedLoad == null
      ? { long: ` · TSS ${week.doneLoad}`, short: ` · ${week.doneLoad}` }
      : {
          long: ` · TSS ${week.doneLoad} / ${week.plannedLoad}`,
          short: ` · ${week.doneLoad}/${week.plannedLoad}`,
        };
  return {
    long: `${hours(week.doneMinutes)} / ${hours(week.plannedMinutes)} u${load.long}${ctl}`,
    short: `${hours(week.doneMinutes)}/${hours(week.plannedMinutes)} u${load.short}`,
  };
}
