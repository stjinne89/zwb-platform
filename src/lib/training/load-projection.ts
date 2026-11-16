// Waar CTL, ATL en Form uitkomen als het lid het geplande schema rijdt.
//
// Vertrekpunt is de stand van vandaag uit intervals.icu. Daarna telt per dag de
// geschatte TSS van de geplande trainingen; een dag zonder training telt als 0,
// zodat de CTL op een rustdag zakt. Dezelfde rekenregel als de afgeleide load in
// de grafiek (één dag weegt 1/42 voor CTL en 1/7 voor ATL).
//
// Een training van vandaag die nog open staat, zit nog niet in de stand van
// vandaag: die telt als extra belasting op vandaag. Een training uit het verleden
// telt niet mee; die zit al in de stand.

import { shiftDays } from "@/lib/training/season";

export const CTL_DAYS = 42;
export const ATL_DAYS = 7;
/** Zo ver kijkt de grafiek op Belasting vooruit. */
export const PROJECTION_DAYS = 42;

export type ProjectedLoadPoint = {
  date: string;
  /** Geplande TSS van die dag. */
  load: number;
  ctl: number;
  atl: number;
  tsb: number;
};

export type PlannedLoad = { date: string; load: number };

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

/**
 * De verwachte stand per dag, vanaf vandaag tot en met `until`. Het eerste punt
 * is vandaag, met de trainingen die vandaag nog open staan erbij. Null zonder
 * stand van vandaag.
 */
export function projectLoad({
  today,
  ctl,
  atl,
  planned,
  until,
}: {
  today: string;
  ctl: number | null | undefined;
  atl: number | null | undefined;
  /** Geplande belasting; alleen vandaag en later telt. */
  planned: PlannedLoad[];
  until: string;
}): ProjectedLoadPoint[] | null {
  if (ctl == null || !Number.isFinite(ctl) || atl == null || !Number.isFinite(atl)) return null;
  if (until < today) return null;

  const byDate = new Map<string, number>();
  for (const item of planned) {
    if (item.date < today || item.date > until) continue;
    const load = Number(item.load);
    if (!Number.isFinite(load) || load <= 0) continue;
    byDate.set(item.date, (byDate.get(item.date) ?? 0) + load);
  }

  let currentCtl = Number(ctl);
  let currentAtl = Number(atl);
  const points: ProjectedLoadPoint[] = [];
  for (let date = today; date <= until; date = shiftDays(date, 1)) {
    const load = byDate.get(date) ?? 0;
    if (date === today) {
      // De stand van vandaag bevat de ritten van vandaag al; een open training
      // komt daar bovenop.
      currentCtl += load / CTL_DAYS;
      currentAtl += load / ATL_DAYS;
    } else {
      currentCtl += (load - currentCtl) / CTL_DAYS;
      currentAtl += (load - currentAtl) / ATL_DAYS;
    }
    points.push({
      date,
      load: Math.round(load),
      ctl: round1(currentCtl),
      atl: round1(currentAtl),
      tsb: round1(currentCtl - currentAtl),
    });
  }
  return points;
}
