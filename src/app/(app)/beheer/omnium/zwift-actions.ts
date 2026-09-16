"use server";
import { revalidatePath } from "next/cache";
import { requireOmniumAccess } from "@/lib/omnium/access";
import { fetchZwiftEvent } from "@/lib/events/zwift-club";
import { leagueMapSchema, mapSubgroups, type LeagueMap } from "@/lib/omnium/zwift-mapping";
import { syncOmniumEntrants } from "@/lib/omnium/zwift-entrants";

export async function loadZwiftGroups(partId: string) {
  try {
    const { admin } = await requireOmniumAccess();
    const { data, error } = await admin
      .from("omnium_edition_events")
      .select("zwift_event_id, subgroup_leagues")
      .eq("id", partId)
      .single();
    if (error) throw new Error(error.message);
    if (!data.zwift_event_id) throw new Error("Vul eerst het Zwift-event-ID in.");
    return {
      ok: true as const,
      eventId: String(data.zwift_event_id),
      groups: mapSubgroups(
        await fetchZwiftEvent(data.zwift_event_id),
        leagueMapSchema.parse(data.subgroup_leagues),
      ),
    };
  } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Ophalen mislukt." }; }
}

export async function saveZwiftGroups(partId: string, eventId: string, mapping: LeagueMap) {
  try {
    const { admin } = await requireOmniumAccess();
    const parsed = leagueMapSchema.parse(mapping);
    const groups = mapSubgroups(await fetchZwiftEvent(eventId), parsed);
    if (groups.some((g) => !g.league)) throw new Error("Kies voor elke subgroep een league.");
    const { data, error } = await admin
      .from("omnium_edition_events")
      .update({
        subgroup_leagues: parsed,
        zwift_subgroup_ids: groups.map((group) => group.id),
      })
      .eq("id", partId)
      .eq("zwift_event_id", eventId)
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Event-ID gewijzigd; laad de subgroepen opnieuw.");
    return { ok: true as const };
  } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Opslaan mislukt." }; }
}

export async function syncEntrantsAction(editionId: string) {
  try {
    const { admin } = await requireOmniumAccess();
    const result = await syncOmniumEntrants(admin, editionId);
    revalidatePath("/omnium", "layout");
    revalidatePath(`/beheer/omnium/${editionId}`);
    return { ok: true as const, ...result };
  } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Ophalen mislukt." }; }
}
