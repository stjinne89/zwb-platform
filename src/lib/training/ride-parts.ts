// Ritten die samen één training zijn (migratie 0306).
//
// Een training hangt aan één rit. Wie zijn training in stukken reed — een
// Zwift-workout, dan een video-rit, dan een group ride — kan de latere stukken
// bij de eerste rit zetten (`part_of_activity_id`). Elke plek die ritten voor het
// schema laadt, voegt ze hier eerst samen: de koppeling, de naleving, de
// momentopname en de lijst met ongeplande ritten zien daarna één rit, met het id
// van de hoofdrit. Zo hoeft verder niets te weten dat een rit uit stukken bestaat.
//
// Wat niet meegaat: de zonetijden en de uitvoering per blok komen uit de stream
// van één intervals-activiteit (zone-times-fill.ts), en blijven dus van de
// hoofdrit. De belastinggrafiek telt de ritten los, wat op hetzelfde uitkomt.

import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import {
  STRAVA_RIDE_COLUMNS,
  type RidePart,
  type StravaRideRow,
} from "@/lib/training/ride-metrics";

function record(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function positive(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * De Strava-velden van het geheel. Gemiddelden wegen naar rijtijd en vallen weg
 * zodra één stuk ze mist; een halve meting als gemiddelde van het geheel zou
 * meer beweren dan er gemeten is. Een vermogensmeter telt alleen als elk stuk er
 * een had, anders rekent het geheel met hartslag.
 *
 * Het genormaliseerd vermogen is zo gekozen dat de TSS van het geheel gelijk is
 * aan de som van de stukken (TSS groeit met rijtijd × NP²). Een NP over de
 * aaneengeplakte stream zou iets anders uitkomen, maar die stream hebben we niet.
 */
function combinedRaw(rides: StravaRideRow[], base: Record<string, unknown>) {
  const raws = rides.map((ride) => record(ride.raw));
  const seconds = rides.map(
    (ride, index) => positive(raws[index].moving_time) ?? positive(ride.moving_time_seconds) ?? 0,
  );
  const total = seconds.reduce((sum, value) => sum + value, 0);

  const allOf = (key: string) => {
    const values = raws.map((raw) => positive(raw[key]));
    return values.every((value) => value != null) ? (values as number[]) : null;
  };
  const weighted = (key: string) => {
    const values = allOf(key);
    if (!values || total <= 0) return null;
    return values.reduce((sum, value, index) => sum + value * seconds[index], 0) / total;
  };
  const summed = (key: string) => allOf(key)?.reduce((sum, value) => sum + value, 0) ?? null;
  const highest = (key: string) => {
    const values = raws.map((raw) => positive(raw[key])).filter((value) => value != null);
    return values.length > 0 ? Math.max(...(values as number[])) : null;
  };

  const powerMeter = raws.every((raw) => raw.device_watts === true);
  const np = powerMeter ? allOf("weighted_average_watts") : null;
  const normalized =
    np && total > 0
      ? Math.sqrt(np.reduce((sum, value, index) => sum + value * value * seconds[index], 0) / total)
      : null;

  return {
    ...base,
    moving_time: total,
    distance: raws.reduce((sum, raw) => sum + (positive(raw.distance) ?? 0), 0),
    device_watts: powerMeter,
    weighted_average_watts: normalized,
    average_watts: weighted("average_watts"),
    average_heartrate: weighted("average_heartrate"),
    average_cadence: weighted("average_cadence"),
    max_watts: highest("max_watts"),
    max_heartrate: highest("max_heartrate"),
    kilojoules: summed("kilojoules"),
    hr_load: summed("hr_load"),
  };
}

/**
 * De hoofdrit met zijn stukken erin opgeteld. Begintijd van het eerste stuk,
 * naam en id van de hoofdrit.
 */
export function combineRideParts<T extends StravaRideRow>(parent: T, parts: StravaRideRow[]): T {
  if (parts.length === 0) return parent;
  const all = [parent, ...parts].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const first = all[0];
  const base: Record<string, unknown> = { ...record(parent.raw), start_date: first.start_date };
  const firstLocal = record(first.raw).start_date_local;
  if (firstLocal !== undefined) base.start_date_local = firstLocal;
  const raw = combinedRaw(all, base);
  const distance = all.reduce((sum, ride) => sum + (positive(ride.distance_m) ?? 0), 0);

  return {
    ...parent,
    start_date: first.start_date,
    moving_time_seconds: raw.moving_time > 0 ? Math.round(raw.moving_time) : parent.moving_time_seconds,
    distance_m: distance > 0 ? distance : (parent.distance_m ?? null),
    raw,
    parts: parts
      .slice()
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .map(
        (part): RidePart => ({
          id: part.id,
          name: part.name,
          start_date: part.start_date,
          moving_time_seconds: part.moving_time_seconds,
        }),
      ),
  };
}

/**
 * Voegt de stukken in hun hoofdrit. `partOf` gaat van stuk naar hoofdrit. Een
 * stuk waarvan de hoofdrit niet in `rides` staat, blijft een losse rit: beter
 * dubbel zichtbaar dan stilletjes weg. De volgorde van `rides` blijft staan, en
 * dezelfde rit twee keer telt één keer.
 */
export function mergeRideParts<T extends StravaRideRow>(
  rides: T[],
  partOf: ReadonlyMap<string, string>,
): T[] {
  const byId = new Map<string, T>();
  for (const ride of rides) if (!byId.has(String(ride.id))) byId.set(String(ride.id), ride);

  const partsByParent = new Map<string, T[]>();
  for (const [id, ride] of byId) {
    const parentId = partOf.get(id);
    if (!parentId || parentId === id || !byId.has(parentId) || partOf.has(parentId)) continue;
    partsByParent.set(parentId, [...(partsByParent.get(parentId) ?? []), ride]);
  }
  if (partsByParent.size === 0) return [...byId.values()];

  const absorbed = new Set([...partsByParent.values()].flat().map((ride) => String(ride.id)));
  return [...byId.values()]
    .filter((ride) => !absorbed.has(String(ride.id)))
    .map((ride) => {
      const parts = partsByParent.get(String(ride.id));
      return parts ? combineRideParts(ride, parts) : ride;
    });
}

/**
 * Welke ritten van het lid bij een hoofdrit horen: stuk → hoofdrit. Leeg zonder
 * migratie 0306, zodat het schema dan gewoon werkt zoals voorheen.
 */
export async function loadRidePartLinks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  profileId: string,
): Promise<Map<string, string>> {
  const { data, error } = await client
    .from("strava_activities")
    .select("id, part_of_activity_id")
    .eq("profile_id", profileId)
    .not("part_of_activity_id", "is", null);
  if (error || !data?.length) return new Map();
  return new Map(
    (data as Array<{ id: number; part_of_activity_id: number | null }>)
      .filter((row) => row.part_of_activity_id != null)
      .map((row) => [String(row.id), String(row.part_of_activity_id)]),
  );
}

/**
 * Ritten zoals het schema ze hoort te zien: met de stukken in hun hoofdrit. Een
 * stuk dat buiten het venster van de aanroeper viel, wordt er nog bij gehaald.
 */
export async function withRideParts<T extends StravaRideRow>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  profileId: string,
  rides: T[],
): Promise<T[]> {
  if (rides.length === 0) return rides;
  const links = await loadRidePartLinks(client, profileId);
  if (links.size === 0) return rides;

  const present = new Set(rides.map((ride) => String(ride.id)));
  const missing = [...links]
    .filter(([id, parentId]) => present.has(parentId) && !present.has(id))
    .map(([id]) => Number(id));
  let extra: T[] = [];
  if (missing.length > 0) {
    const { data } = await client
      .from("strava_activities")
      .select(STRAVA_RIDE_COLUMNS)
      .eq("profile_id", profileId)
      .in("id", missing);
    extra = (data ?? []) as T[];
  }
  return mergeRideParts([...rides, ...extra], links);
}

/** Mag `part` bij `parent`? Alleen een andere rit van dezelfde dag. */
export function canJoinRide(
  part: Pick<StravaRideRow, "id" | "start_date">,
  parent: Pick<StravaRideRow, "id" | "start_date">,
): boolean {
  return (
    String(part.id) !== String(parent.id) &&
    amsterdamDayKey(new Date(part.start_date)) === amsterdamDayKey(new Date(parent.start_date))
  );
}

/**
 * Dezelfde rit kreeg een ander id (zie moveReplacedRidePairings): de stukken
 * gaan mee naar de nieuwe hoofdrit, en een vervangen stuk blijft een stuk.
 * Vóór het wissen van de oude rijen, anders zet de verwijzing zichzelf op leeg.
 */
export async function moveRidePartLinks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  profileId: string,
  moves: ReadonlyMap<string, string>,
): Promise<void> {
  if (moves.size === 0) return;
  const links = await loadRidePartLinks(client, profileId);
  if (links.size === 0) return;
  const parents = new Set(links.values());
  for (const [fromId, toId] of moves) {
    const parentId = links.get(fromId);
    if (parentId) {
      await client
        .from("strava_activities")
        .update({ part_of_activity_id: Number(moves.get(parentId) ?? parentId) })
        .eq("profile_id", profileId)
        .eq("id", Number(toId));
    }
    if (parents.has(fromId)) {
      await client
        .from("strava_activities")
        .update({ part_of_activity_id: Number(toId) })
        .eq("profile_id", profileId)
        .eq("part_of_activity_id", Number(fromId));
    }
  }
}
