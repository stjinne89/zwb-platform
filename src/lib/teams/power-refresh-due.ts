// Welke powerprofielen nu opnieuw bij intervals.icu opgehaald moeten worden. Puur.
//
// Een rit van een lid dat via Strava in intervals.icu binnenkomt, staat niet altijd
// in `strava_activities`: de API van intervals.icu geeft van zo'n rit alleen een
// leeg stompje. Daarom naast "er is een nieuwe rit" ook een vaste dagelijkse beurt.

import { powerProfileStale, type SyncRide } from "@/lib/briljant/snapshot";

/** Ouder dan dit komt een profiel ook zonder bekende nieuwe rit aan de beurt. */
export const POWER_DAILY_MS = 20 * 60 * 60 * 1000;
/** Na een fout (429, ingetrokken sleutel) zo lang wachten op de volgende poging. */
export const POWER_RETRY_MS = 3 * 60 * 60 * 1000;

export type PowerRefreshRow = {
  profileId: string;
  syncedAt: string | null;
  syncStatus: string | null;
  rides: SyncRide[];
};

/** Lager is eerder; null is niet aan de beurt. */
function priority(row: PowerRefreshRow, now: number): number | null {
  const synced = row.syncedAt ? Date.parse(row.syncedAt) : NaN;
  if (!Number.isFinite(synced)) return 0;
  // `synced_at` schuift ook bij een fout op, dus alleen de wachttijd telt hier.
  if (row.syncStatus === "error") return now - synced > POWER_RETRY_MS ? 2 : null;
  if (powerProfileStale(row.syncedAt, row.rides, now)) return 1;
  return now - synced > POWER_DAILY_MS ? 3 : null;
}

/** Profiel-id's die aan de beurt zijn: nooit opgehaald, nieuwe rit, fout, dagelijks. */
export function powerProfilesDue(rows: PowerRefreshRow[], now = Date.now()): string[] {
  return rows
    .flatMap((row) => {
      const rank = priority(row, now);
      return rank == null ? [] : [{ id: row.profileId, rank, synced: row.syncedAt ? Date.parse(row.syncedAt) : 0 }];
    })
    .sort((a, b) => a.rank - b.rank || a.synced - b.synced)
    .map((row) => row.id);
}
