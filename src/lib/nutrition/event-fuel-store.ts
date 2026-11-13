// De bewaarde keuzes per lid per event (0329, stap 4 van
// docs/eventvoeding-plan.md) lezen. Zolang de migratie niet is toegepast, is de
// tabel er niet: dan geen bewaarde keuzes, en rekent alles zoals voorheen.

import type { SupabaseClient } from "@supabase/supabase-js";
import { savedRideFuel, type EventFuelRow, type SavedRideFuel } from "./event-planner";

export const EVENT_FUEL_COLUMNS =
  "profile_id, event_id, preset, intensity_factor, minutes, fluid_ml_per_hour, per_hour_g, plan_g_per_hour, plan_fluid_ml_per_hour";

export type StoredEventFuel = EventFuelRow & { profile_id: string; event_id: string };

export function eventFuelKey(profileId: string, eventId: string): string {
  return `${profileId}:${eventId}`;
}

/** De rijen voor deze leden en events; leeg als de tabel er (nog) niet is of het lezen mislukt. */
export async function loadEventFuelRows(
  supabase: SupabaseClient,
  profileIds: readonly string[],
  eventIds: readonly string[],
): Promise<Map<string, StoredEventFuel>> {
  const rows = new Map<string, StoredEventFuel>();
  if (profileIds.length === 0 || eventIds.length === 0) return rows;
  const { data, error } = await supabase
    .from("nutrition_event_fuel")
    .select(EVENT_FUEL_COLUMNS)
    .in("profile_id", [...new Set(profileIds)])
    .in("event_id", [...new Set(eventIds)]);
  if (error || !data) return rows;
  for (const row of data as StoredEventFuel[]) {
    rows.set(eventFuelKey(row.profile_id, row.event_id), { ...row, intensity_factor: Number(row.intensity_factor) });
  }
  return rows;
}

/** Hetzelfde, maar alleen wat ridePlan buiten de eventpagina nodig heeft. */
export async function loadSavedRideFuel(
  supabase: SupabaseClient,
  profileIds: readonly string[],
  eventIds: readonly string[],
): Promise<Map<string, SavedRideFuel>> {
  const rows = await loadEventFuelRows(supabase, profileIds, eventIds);
  const saved = new Map<string, SavedRideFuel>();
  for (const [key, row] of rows) {
    const fuel = savedRideFuel(row);
    if (fuel) saved.set(key, fuel);
  }
  return saved;
}
