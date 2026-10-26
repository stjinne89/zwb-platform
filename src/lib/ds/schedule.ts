// ZWB DS: welke renners vragen we nu bij Zwift op?
//
// Het budget is ~30 statussen per minuut voor alle races samen (migr. 0249). In een
// groot veld haalt dat niet iedereen: de eigen renners en wie bij hen rijdt gaan
// voor, de rest komt eens per minuut aan de beurt als er budget over is. Wie niet
// in de wereld was (404), vragen we pas na een minuut opnieuw.

/** ZWB DS is er vanaf een kwartier voor de start tot minstens twee uur erna (zoals "Live stand" op het dashboard). */
export const DS_LEAD_MS = 15 * 60 * 1000;
export const DS_AFTER_MS = 2 * 60 * 60 * 1000;
/**
 * Een lange rit duurt langer dan twee uur: 100 km op 40 km/u is al 2,5 uur, en
 * om 2 uur na de start verdween de knop terwijl het veld nog reed (2026-10-18).
 * Daarom tot de afstand op 25 km/u gereden is, plus een halfuur.
 */
const SLOW_KMH = 25;
const AFTER_FINISH_MS = 30 * 60 * 1000;

/** Hoe lang na de start ZWB DS er nog is, voor een event van deze afstand. */
export function dsAfterMs(distanceKm?: number | null): number {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km <= 0) return DS_AFTER_MS;
  return Math.max(DS_AFTER_MS, (km / SLOW_KMH) * 3600 * 1000 + AFTER_FINISH_MS);
}

/** Valt `now` in het venster rond deze start? */
export function inDsWindow(startAt: number, now: number = Date.now(), distanceKm?: number | null): boolean {
  return now >= startAt - DS_LEAD_MS && now <= startAt + dsAfterMs(distanceKm);
}

export const ZWB_MIN_AGE_MS = 10 * 1000;
export const NEAR_MIN_AGE_MS = 20 * 1000;
export const OTHER_MIN_AGE_MS = 60 * 1000;
export const ABSENT_MIN_AGE_MS = 60 * 1000;
/** Binnen zoveel meter van een ZWB'er telt een renner als "in de buurt". */
export const NEAR_M = 500;

export type DsCheck = {
  zwiftId: string;
  zwb: boolean;
  /** Laatst bekend binnen NEAR_M van een ZWB'er. */
  near?: boolean;
  /** Unix-ms van de laatste vraag aan Zwift; null als nooit. */
  checkedAt: number | null;
  /** De laatste vraag gaf "niet in de wereld". */
  absent: boolean;
};

/**
 * Strikte voorrang, oudste eerst binnen elke trede: eerst de ZWB'ers, dan wie bij
 * hen in de buurt rijdt, dan wie nog nooit gemeten is, dan de rest van het veld.
 * Met alleen een kleine voorsprong voor ZWB'ers bleef in een groep van 154 renners
 * de eigen renner 27 minuten ongemeten (2026-10-18): wie nog langer wachtte, won
 * het steeds.
 */
export function ridersToCheck(rows: DsCheck[], now: number, max: number): string[] {
  if (max <= 0) return [];
  return rows
    .flatMap((row) => {
      const tier = row.zwb ? 0 : row.near ? 1 : row.checkedAt === null ? 2 : 3;
      if (row.checkedAt === null) return [{ id: row.zwiftId, tier, age: Infinity }];
      const age = now - row.checkedAt;
      const minAge = row.absent
        ? ABSENT_MIN_AGE_MS
        : row.zwb
          ? ZWB_MIN_AGE_MS
          : row.near
            ? NEAR_MIN_AGE_MS
            : OTHER_MIN_AGE_MS;
      if (age < minAge) return [];
      return [{ id: row.zwiftId, tier, age }];
    })
    .sort((a, b) => a.tier - b.tier || b.age - a.age)
    .slice(0, max)
    .map((row) => row.id);
}
