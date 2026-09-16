import { createAdminClient } from "@/lib/supabase/admin";
import { fetchEntrants, fetchZwiftEvent } from "@/lib/events/zwift-club";
import { leagueMapSchema, mapSubgroups } from "./zwift-mapping";
import { nameKeyOf } from "./import";

type Admin = ReturnType<typeof createAdminClient>;

export async function syncOmniumEntrants(admin: Admin, editionId: string) {
  const { data: parts, error } = await admin.from("omnium_edition_events")
    .select("id, title, zwift_event_id, subgroup_leagues, starts_at")
    .eq("edition_id", editionId).neq("discipline", "recon").order("order_index");
  if (error) throw new Error(error.message);
  let synced = 0;
  const failures: string[] = [];
  for (const part of parts ?? []) {
    if (!part.zwift_event_id) continue;
    try {
      const groups = mapSubgroups(
        await fetchZwiftEvent(String(part.zwift_event_id)),
        leagueMapSchema.parse(part.subgroup_leagues ?? {}),
      );
      if (groups.some((g) => !g.league)) throw new Error("Bevestig eerst de league per Zwift-subgroep.");
      const rows = [];
      for (const group of groups) {
        for (const entrant of await fetchEntrants([group.id], { strict: true })) {
          rows.push({ zwift_id: entrant.zwiftId, name_key: nameKeyOf(entrant.name), display_name: entrant.name, league: group.league, subgroup_label: group.label });
        }
      }
      if (new Set(rows.map((r) => r.zwift_id)).size !== rows.length) throw new Error("Een renner staat in meerdere subgroepen.");
      const { error: saveError } = await admin.rpc("omnium_replace_entrants", {
        p_event_id: part.id,
        p_zwift_event_id: part.zwift_event_id,
        p_league_map: part.subgroup_leagues ?? {},
        p_rows: rows,
      });
      if (saveError) throw new Error(saveError.message);
      synced += rows.length;
    } catch (e) { failures.push(`${part.title}: ${e instanceof Error ? e.message : "Ophalen mislukt."}`); }
  }
  return { synced, failures };
}

export async function syncUpcomingOmniumEntrants(admin: Admin) {
  // Dagelijkse job pakt alleen de komende week, zodat de scan begrensd blijft.
  const now = new Date();
  const { data, error } = await admin.from("omnium_editions").select("id")
    .not("published_at", "is", null).gte("starts_at", now.toISOString())
    .lte("starts_at", new Date(now.getTime() + 7 * 86400_000).toISOString()).limit(10);
  if (error) throw new Error(error.message);
  const results = [];
  for (const e of data ?? []) results.push(await syncOmniumEntrants(admin, e.id));
  return { synced: results.reduce((n, r) => n + r.synced, 0), failures: results.flatMap((r) => r.failures) };
}
