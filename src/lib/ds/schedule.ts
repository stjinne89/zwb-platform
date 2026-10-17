// ZWB DS: welke renners vragen we nu bij Zwift op?
//
// Het budget is ~30 statussen per minuut voor alle races samen (migr. 0249). Onze
// eigen renners gaan voor, wie het langst niet gemeten is daarna, en wie niet in
// de wereld was (404) vragen we pas na een minuut opnieuw.

/** ZWB DS is er vanaf een kwartier voor de start tot twee uur erna (zoals "Live stand" op het dashboard). */
export const DS_LEAD_MS = 15 * 60 * 1000;
export const DS_AFTER_MS = 2 * 60 * 60 * 1000;

/** Valt `now` in het venster rond deze start? */
export function inDsWindow(startAt: number, now: number = Date.now()): boolean {
  return now >= startAt - DS_LEAD_MS && now <= startAt + DS_AFTER_MS;
}

export const ZWB_MIN_AGE_MS = 10 * 1000;
export const OTHER_MIN_AGE_MS = 20 * 1000;
export const ABSENT_MIN_AGE_MS = 60 * 1000;
/** Een eigen renner telt bij het kiezen alsof zijn status zoveel ouder is. */
const ZWB_HEAD_START_MS = 30 * 1000;

export type DsCheck = {
  zwiftId: string;
  zwb: boolean;
  /** Unix-ms van de laatste vraag aan Zwift; null als nooit. */
  checkedAt: number | null;
  /** De laatste vraag gaf "niet in de wereld". */
  absent: boolean;
};

export function ridersToCheck(rows: DsCheck[], now: number, max: number): string[] {
  if (max <= 0) return [];
  return rows
    .flatMap((row) => {
      if (row.checkedAt === null) return [{ id: row.zwiftId, score: Infinity }];
      const age = now - row.checkedAt;
      const minAge = row.absent ? ABSENT_MIN_AGE_MS : row.zwb ? ZWB_MIN_AGE_MS : OTHER_MIN_AGE_MS;
      if (age < minAge) return [];
      return [{ id: row.zwiftId, score: age + (row.zwb && !row.absent ? ZWB_HEAD_START_MS : 0) }];
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((row) => row.id);
}
