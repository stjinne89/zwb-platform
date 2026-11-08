// Ritten die het lid zelf als dubbele opname heeft weggehaald (migratie 0310).
//
// De rit is weg uit strava_activities, maar Strava en intervals.icu kennen hem
// nog. Elk schrijfpad haalt deze id's eruit vóór de upsert; anders zet de
// volgende sync hem terug.

/** Wat dismissedRideIds van een Supabase-client nodig heeft. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any };

/**
 * De weggehaalde id's van dit lid, beperkt tot `ids` als die er zijn. Faalt de
 * lezing (bijvoorbeeld zolang 0310 niet is toegepast), dan een lege set: de sync
 * mag daar niet op stuklopen.
 */
export async function dismissedRideIds(
  db: Db,
  profileId: string,
  ids?: ReadonlyArray<number | string>,
): Promise<Set<string>> {
  if (ids && ids.length === 0) return new Set();
  try {
    let query = db
      .from("strava_activity_dismissals")
      .select("activity_id")
      .eq("profile_id", profileId);
    if (ids) query = query.in("activity_id", ids.map(Number));
    const { data, error } = await query;
    if (error || !Array.isArray(data)) return new Set();
    return new Set(data.map((row: { activity_id: number | string }) => String(row.activity_id)));
  } catch {
    return new Set();
  }
}

/** De rijen zonder de weggehaalde ritten. */
export function withoutDismissed<T extends { id: number | string }>(
  rows: T[],
  dismissed: ReadonlySet<string>,
): T[] {
  return dismissed.size === 0 ? rows : rows.filter((row) => !dismissed.has(String(row.id)));
}

/** Leest en filtert in één keer; voor de schrijfpaden. */
export async function dropDismissedRides<T extends { id: number | string }>(
  db: Db,
  profileId: string,
  rows: T[],
): Promise<T[]> {
  if (rows.length === 0) return rows;
  const dismissed = await dismissedRideIds(
    db,
    profileId,
    rows.map((row) => row.id),
  );
  return withoutDismissed(rows, dismissed);
}
