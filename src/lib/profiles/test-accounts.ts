import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Testaccounts (profiles.is_test, 0333) staan niet tussen de leden. RLS verbergt
// ze voor het gewone client; het admin-client ziet alles, dus clubtotalen en
// ranglijsten die met de service-rol rekenen, filteren met deze set.

/** Profiel-ID's van testaccounts. Faalt de vraag, dan een lege set. */
export async function loadTestProfileIds(client: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await client.from("profiles").select("id").eq("is_test", true);
  if (error) return new Set();
  return new Set(((data ?? []) as Array<{ id: string }>).map((row) => row.id));
}

/**
 * Voor het gewone client: houdt alleen rijen van profielen die de kijker mag
 * zien. RLS laat testaccounts van anderen weg; zonder deze stap komen hun
 * ritten of stenen naamloos ("Lid", "Onbekend") in een ranglijst.
 */
export async function onlyVisibleProfiles<T extends { profile_id: string | null }>(
  client: SupabaseClient,
  rows: T[],
): Promise<T[]> {
  const ids = [...new Set(rows.map((row) => row.profile_id).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return rows;
  const { data, error } = await client.from("profiles").select("id").in("id", ids);
  if (error) return rows;
  const visible = new Set(((data ?? []) as Array<{ id: string }>).map((row) => row.id));
  return rows.filter((row) => !row.profile_id || visible.has(row.profile_id));
}

/** Rijen zonder testaccounts. */
export function withoutTestProfiles<T extends { profile_id: string | null }>(rows: T[], testIds: Set<string>): T[] {
  if (testIds.size === 0) return rows;
  return rows.filter((row) => !row.profile_id || !testIds.has(row.profile_id));
}
