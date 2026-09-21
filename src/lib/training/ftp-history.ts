// Welke FTP gold op de dag van een rit (migratie 0175).
//
// Zonder historie rekende elke rit met de huidige FTP, zodat een nieuwe
// testuitslag de belasting van het hele verleden meeschaalde. De historie wordt
// door een trigger op profiles gevuld; hier zoeken we alleen op.

import type { SupabaseClient } from "@supabase/supabase-js";

export type FtpHistoryEntry = { effectiveFrom: string; ftpWatts: number };

/** FTP op een dag (YYYY-MM-DD). Zie ftpOnDate. */
export type FtpAt = (dateKey: string | null) => number | null;

/**
 * De laatste FTP met `effectiveFrom` op of vóór de dag. Vóór de eerste regel geldt
 * de eerste bekende FTP (beter dan niets, en gelijk aan het oude gedrag). Zonder
 * historie of zonder datum: de fallback, normaal de huidige profiel-FTP.
 */
export function ftpOnDate(
  entries: FtpHistoryEntry[],
  dateKey: string | null,
  fallback: number | null,
): number | null {
  if (entries.length === 0 || !dateKey) return fallback;
  let found: FtpHistoryEntry | null = null;
  for (const entry of entries) {
    if (entry.effectiveFrom <= dateKey) found = entry;
    else break;
  }
  return (found ?? entries[0]).ftpWatts;
}

export function ftpResolver(entries: FtpHistoryEntry[], fallback: number | null): FtpAt {
  const sorted = [...entries].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return (dateKey) => ftpOnDate(sorted, dateKey, fallback);
}

/**
 * Laadt de historie van een lid. Een fout (bijvoorbeeld 0175 nog niet toegepast)
 * geeft een lege lijst, zodat alles terugvalt op de huidige FTP zoals voorheen.
 */
export async function loadFtpHistory(
  client: SupabaseClient,
  profileId: string,
): Promise<FtpHistoryEntry[]> {
  let data: unknown[] | null = null;
  try {
    const result = await client
      .from("profile_ftp_history")
      .select("effective_from, ftp_watts")
      .eq("profile_id", profileId)
      .order("effective_from");
    if (result.error) return [];
    data = result.data;
  } catch {
    return [];
  }
  if (!data) return [];
  return (data as { effective_from: string; ftp_watts: number | string }[])
    .map((row) => ({ effectiveFrom: row.effective_from, ftpWatts: Number(row.ftp_watts) }))
    .filter((row) => Number.isFinite(row.ftpWatts) && row.ftpWatts > 0);
}

/** Huidige FTP plus historie, in één keer klaar voor rideMetricsFromStrava. */
export async function loadFtpAt(
  client: SupabaseClient,
  profileId: string,
  currentFtp: number | null,
): Promise<FtpAt> {
  return ftpResolver(await loadFtpHistory(client, profileId), currentFtp);
}
